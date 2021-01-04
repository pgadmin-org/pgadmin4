/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {TreeFake} from '../tree/tree_fake';
import {RestoreDialogWrapper} from '../../../pgadmin/tools/restore/static/js/restore_dialog_wrapper';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';
import {FakeModel} from '../fake_model';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';

let context = describe;

describe('RestoreDialogWrapper', () => {
  let jquerySpy;
  let pgBrowser;
  let alertifySpy;
  let dialogModelKlassSpy;
  let backform;
  let generatedRestoreModel;
  let restoreDialogWrapper;
  let noDataNode;
  let serverTreeNode;
  let viewSchema;
  let restoreJQueryContainerSpy;
  let restoreNodeChildNodeSpy;
  let restoreNode;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: {
          hasId: true,
          getTreeNodeHierarchy: jasmine.createSpy('getTreeNodeHierarchy'),
        },
      },
      keyboardNavigation: jasmine.createSpyObj('keyboardNavigation', ['getDialogTabNavigator']),
    };

    noDataNode = pgBrowser.treeMenu.addNewNode('level1.1', undefined, [{id: 'level1'}]);
    serverTreeNode = pgBrowser.treeMenu.addNewNode('level2.1', {
      _type: 'server',
      _id: 10,
      label: 'some-tree-label',
    }, [{id: 'level2.1'}]);
    jquerySpy = jasmine.createSpy('jquerySpy');
    dialogModelKlassSpy = jasmine.createSpy('dialogModelKlass');
    generatedRestoreModel = {};
    viewSchema = {};
    backform = jasmine.createSpyObj('backform', ['generateViewSchema', 'Dialog']);
    backform.generateViewSchema.and.returnValue(viewSchema);
    dialogModelKlassSpy.and.returnValue(generatedRestoreModel);
    restoreJQueryContainerSpy = jasmine.createSpyObj('restoreJQueryContainer', ['get', 'attr']);
    restoreJQueryContainerSpy.get.and.returnValue(restoreJQueryContainerSpy);

    restoreNode = {
      __internal: {
        buttons: [
          {}, {}, {},
          {
            element: {
              disabled: false,
            },
          },
        ],
      },
      elements: {
        body: {
          childNodes: [
            {},
          ],
        },
        content: jasmine.createSpyObj('content', ['appendChild', 'attr']),
      },
    };


    restoreNodeChildNodeSpy = jasmine.createSpyObj('something', ['addClass']);

    jquerySpy.and.callFake((selector) => {
      if (selector === '<div class=\'restore_dialog\'></div>') {
        return restoreJQueryContainerSpy;
      } else if (selector === restoreNode.elements.body.childNodes[0]) {
        return restoreNodeChildNodeSpy;
      } else {
        return jasmine.createSpyObj('obj', ['appendTo']);
      }
    });
  });

  describe('#prepare', () => {

    beforeEach(() => {
      alertifySpy = jasmine.createSpyObj('alertify', ['alert', 'dialog']);
      restoreDialogWrapper = new RestoreDialogWrapper(
        '<div class=\'restore_dialog\'></div>',
        'restoreDialogTitle',
        'restore',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );
      restoreDialogWrapper = Object.assign(restoreDialogWrapper, restoreNode);
    });
    context('no tree element is selected', () => {
      it('does not create a backform dialog', () => {
        restoreDialogWrapper.prepare();
        expect(backform.Dialog).not.toHaveBeenCalled();
      });

      it('disables the button "submit button" until a filename is selected', () => {
        restoreDialogWrapper.prepare();
        expect(restoreDialogWrapper.__internal.buttons[3].element.disabled).toEqual(true);
      });
    });

    context('selected tree node has no data', () => {
      beforeEach(() => {
        pgBrowser.treeMenu.selectNode(noDataNode.domNode);
      });

      it('does not create a backform dialog', () => {
        restoreDialogWrapper.prepare();
        expect(backform.Dialog).not.toHaveBeenCalled();
      });

      it('disables the button "submit button" until a filename is selected', () => {
        restoreDialogWrapper.prepare();
        expect(restoreDialogWrapper.__internal.buttons[3].element.disabled).toEqual(true);
      });
    });

    context('tree element is selected', () => {
      let treeHierarchyInformation;
      let dialogSpy;
      beforeEach(() => {
        treeHierarchyInformation = {
          server: {
            _type: 'server',
            _id: 10,
            priority: 0,
            label: 'some-tree-label',
          },
        };
        pgBrowser.treeMenu.selectNode(serverTreeNode.domNode);
        pgBrowser.Nodes['server'].getTreeNodeHierarchy.and
          .returnValue(treeHierarchyInformation);
        dialogSpy = jasmine.createSpyObj('newView', ['render']);
        dialogSpy.$el = jasmine.createSpyObj('$el', ['find', 'attr']);
        dialogSpy.model = jasmine.createSpyObj('model', ['on']);
        dialogSpy.$el.find.and.returnValue([]);

        backform.Dialog.and.returnValue(dialogSpy);
      });

      it('creates a backform dialog and displays it', () => {
        restoreDialogWrapper.prepare();
        expect(backform.Dialog).toHaveBeenCalledWith({
          el: restoreJQueryContainerSpy,
          model: generatedRestoreModel,
          schema: viewSchema,
        });

        expect(dialogSpy.render).toHaveBeenCalled();
      });

      it('add alertify classes to restore node childnode', () => {
        restoreDialogWrapper.prepare();
        expect(restoreNodeChildNodeSpy.addClass)
          .toHaveBeenCalledWith('alertify_tools_dialog_properties obj_properties');
      });

      it('disables the button submit button until a filename is selected', () => {
        restoreDialogWrapper.prepare();
        expect(restoreNode.__internal.buttons[3].element.disabled).toEqual(true);
      });

      it('generates a new restore model', () => {
        restoreDialogWrapper.prepare();
        expect(dialogModelKlassSpy).toHaveBeenCalledWith(
          {node_data: pgBrowser.Nodes['server']},
          {node_info: treeHierarchyInformation}
        );
      });

      it('add the new dialog to the restore node HTML', () => {
        restoreDialogWrapper.prepare();
        expect(restoreNode.elements.content.appendChild).toHaveBeenCalledWith(restoreJQueryContainerSpy);
      });
    });
  });

  describe('onButtonClicked', () => {
    let networkMock;

    beforeEach(() => {
      pgBrowser.showHelp = jasmine.createSpy('showHelp');
      networkMock = new MockAdapter(axios);
      alertifySpy = jasmine.createSpyObj('alertify', ['success', 'alert']);
      restoreDialogWrapper = new RestoreDialogWrapper(
        '<div class=\'restore_dialog\'></div>',
        'restoreDialogTitle',
        'restore',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );
      restoreDialogWrapper = Object.assign(restoreDialogWrapper, restoreNode);

    });

    afterEach(function () {
      networkMock.restore();
    });

    context('dialog help button was pressed', () => {
      let networkCalled;
      beforeEach(() => {
        networkCalled = false;
        pgBrowser.treeMenu.selectNode(serverTreeNode.domNode);
        networkMock.onAny(/.+/).reply(() => {
          networkCalled = true;
          return [200, {}];
        });

        const event = {
          button: {
            element: {
              name: 'dialog_help',
              getAttribute: (attributeName) => {
                if (attributeName === 'url') {
                  return 'http://someurl';
                } else if (attributeName === 'label') {
                  return 'some label';
                }
              },
            },
          },
        };
        restoreDialogWrapper.callback(event);
      });

      it('displays help for dialog', () => {
        expect(pgBrowser.showHelp).toHaveBeenCalledWith(
          'dialog_help',
          'http://someurl',
          pgBrowser.Nodes['server'],
          serverTreeNode.getHtmlIdentifier()
        );
      });

      it('does not start the restore', () => {
        expect(networkCalled).toEqual(false);
      });
    });

    context('object help button was pressed', () => {
      let networkCalled;
      beforeEach(() => {
        networkCalled = false;
        pgBrowser.treeMenu.selectNode(serverTreeNode.domNode);
        networkMock.onAny(/.+/).reply(() => {
          networkCalled = true;
          return [200, {}];
        });

        const event = {
          button: {
            element: {
              name: 'object_help',
              getAttribute: (attributeName) => {
                if (attributeName === 'url') {
                  return 'http://someurl';
                } else if (attributeName === 'label') {
                  return 'some label';
                }
              },
            },
          },
        };
        restoreDialogWrapper.callback(event);
      });

      it('displays help for dialog', () => {
        expect(pgBrowser.showHelp).toHaveBeenCalledWith(
          'object_help',
          'http://someurl',
          pgBrowser.Nodes['server'],
          serverTreeNode.getHtmlIdentifier()
        );
      });

      it('does not start the restore', () => {
        expect(networkCalled).toEqual(false);
      });
    });

    context('restore button was pressed', () => {
      let networkCalled;
      let event;

      context('no tree node is selected', () => {
        beforeEach(() => {
          networkCalled = false;
          networkMock.onAny(/.+/).reply(() => {
            networkCalled = true;
            return [200, {}];
          });
          event = {
            button: {
              'data-btn-name': 'restore',
              element: {
                getAttribute: () => {
                  return 'http://someurl';
                },
              },
            },
          };
        });

        it('does not start the restore', () => {
          restoreDialogWrapper.callback(event);
          expect(networkCalled).toEqual(false);
        });
      });

      context('tree node selected has no data', () => {
        beforeEach(() => {
          networkCalled = false;
          networkMock.onAny(/.+/).reply(() => {
            networkCalled = true;
            return [200, {}];
          });
          event = {
            button: {
              'data-btn-name': 'restore',
              element: {
                getAttribute: () => {
                  return 'http://someurl';
                },
              },
            },
          };
          pgBrowser.treeMenu.selectNode(noDataNode.domNode);
        });

        it('does not start the restore', () => {
          restoreDialogWrapper.callback(event);
          expect(networkCalled).toEqual(false);
        });
      });

      context('tree node select has data', () => {

        let databaseTreeNode;

        beforeEach(() => {
          databaseTreeNode = pgBrowser.treeMenu.addNewNode('level3.1', {
            _type: 'database',
            _id: 10,
            _label: 'some-database-label',
          }, [{id: 'level3.1'}]);
          pgBrowser.treeMenu.addChild(serverTreeNode, databaseTreeNode);
          pgBrowser.Nodes.database = {
            hasId: true,
            _label: 'some-database-label',
          };
          let fakeModel = new FakeModel();
          fakeModel.set('some-key', 'some-value');
          restoreDialogWrapper.view = {
            model: fakeModel,
          };
          pgBrowser.treeMenu.selectNode(databaseTreeNode.domNode);
          pgBrowser.Events = jasmine.createSpyObj('pgBrowserEventsSpy', ['trigger']);
          event = {
            button: {
              'data-btn-name': 'restore',
              element: {
                getAttribute: () => {
                  return 'http://someurl';
                },
              },
            },
          };
        });
        context('restore job created successfully', () => {
          let dataSentToServer;
          beforeEach(() => {
            networkMock.onPost('/restore/job/10').reply((request) => {
              dataSentToServer = request.data;
              return [200, {'success': 1}];
            });
          });

          it('create an success alert box', (done) => {
            restoreDialogWrapper.callback(event);
            setTimeout(() => {
              expect(alertifySpy.success).toHaveBeenCalledWith(
                'Restore job created.',
                5
              );
              done();
            }, 0);
          });

          it('trigger background process', (done) => {
            restoreDialogWrapper.callback(event);
            setTimeout(() => {
              expect(pgBrowser.Events.trigger).toHaveBeenCalledWith(
                'pgadmin-bgprocess:created',
                restoreDialogWrapper
              );
              done();
            }, 0);
          });

          it('send correct data to server', (done) => {
            restoreDialogWrapper.callback(event);
            setTimeout(() => {
              expect(JSON.parse(dataSentToServer)).toEqual({
                'some-key': 'some-value',
                'database': 'some-database-label',
              });
              done();
            }, 0);
          });
        });

        context('error creating restore job', () => {
          beforeEach(() => {
            networkMock.onPost('/restore/job/10').reply(() => {
              return [400, {}];
            });
          });

          it('creates an alert box', (done) => {
            restoreDialogWrapper.callback(event);
            setTimeout(() => {
              expect(alertifySpy.alert).toHaveBeenCalledWith(
                'Restore job failed.',
                undefined
              );
              done();
            }, 0);
          });
        });
      });
    });
  });

  describe('setExtraParameters', () => {
    let selectedNode;
    let treeInfo;
    let model;

    beforeEach(() => {
      restoreDialogWrapper = new RestoreDialogWrapper(
        '<div class=\'restore_dialog\'></div>',
        'restoreDialogTitle',
        'restore',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );

      model = new FakeModel();
      restoreDialogWrapper.view = {
        model: model,
      };
    });

    context('when it is a custom model', () => {
      beforeEach(() => {
        model.set('custom', true);
        treeInfo = {
          'database': {
            '_label': 'some-database-label',
          },
        };
      });

      it('only sets the database', () => {
        restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
        expect(model.toJSON()).toEqual({
          'custom': true,
          'database': 'some-database-label',
        });
      });
    });

    context('when it is not a custom model', () => {
      beforeEach(() => {
        model.set('custom', false);
        treeInfo = {
          'database': {
            '_label': 'some-database-label',
          },
          'schema': {
            '_label': 'some-schema-label',
          },
        };
      });

      context('when selected node is a schema', () => {
        it('sets schemas on the model', () => {
          selectedNode = new TreeNode('schema', {_type: 'schema', _label: 'some-schema-label'}, '');
          restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
          expect(model.toJSON()).toEqual({
            custom: false,
            database: 'some-database-label',
            schemas: ['some-schema-label'],
          });
        });
      });

      context('when selected node is a table', () => {
        it('sets schemas and table on the model', () => {
          selectedNode = new TreeNode('table', {_type: 'table', _label: 'some-table-label'}, '');
          restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
          expect(model.toJSON()).toEqual({
            custom: false,
            database: 'some-database-label',
            schemas: ['some-schema-label'],
            tables: ['some-table-label'],
          });
        });
      });

      context('when selected node is a function', () => {
        it('sets schemas and function on the model', () => {
          selectedNode = new TreeNode('function', {_type: 'function', _label: 'some-function-label'}, '');
          restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
          expect(model.toJSON()).toEqual({
            custom: false,
            database: 'some-database-label',
            schemas: ['some-schema-label'],
            functions: ['some-function-label'],
          });
        });
      });

      context('when selected node is an index', () => {
        it('sets schemas and index on the model', () => {
          selectedNode = new TreeNode('index', {_type: 'index', _label: 'some-index-label'}, '');
          restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
          expect(model.toJSON()).toEqual({
            custom: false,
            database: 'some-database-label',
            schemas: ['some-schema-label'],
            indexes: ['some-index-label'],
          });
        });
      });

      context('when selected node is a trigger', () => {
        it('sets schemas and trigger on the model', () => {
          selectedNode = new TreeNode('trigger', {_type: 'trigger', _label: 'some-trigger-label'}, '');
          restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
          expect(model.toJSON()).toEqual({
            custom: false,
            database: 'some-database-label',
            schemas: ['some-schema-label'],
            triggers: ['some-trigger-label'],
          });
        });
      });

      context('when selected node is a trigger_func', () => {
        it('sets schemas and trigger_func on the model', () => {
          selectedNode = new TreeNode('trigger_func', {_type: 'trigger_func', _label: 'some-trigger_func-label'}, '');
          restoreDialogWrapper.setExtraParameters(selectedNode, treeInfo);
          expect(model.toJSON()).toEqual({
            custom: false,
            database: 'some-database-label',
            schemas: ['some-schema-label'],
            trigger_funcs: ['some-trigger_func-label'],
          });
        });
      });
    });
  });
});
