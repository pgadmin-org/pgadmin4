/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {TreeFake} from '../tree/tree_fake';
import {BackupDialogWrapper} from '../../../pgadmin/tools/backup/static/js/backup_dialog_wrapper';
import axios from 'axios/index';
import MockAdapter from 'axios-mock-adapter';
import {FakeModel} from '../fake_model';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';

let context = describe;

describe('BackupDialogWrapper', () => {
  let jquerySpy;
  let pgBrowser;
  let alertifySpy;
  let dialogModelKlassSpy;
  let backform;
  let generatedBackupModel;
  let backupDialogWrapper;
  let noDataNode;
  let serverTreeNode;
  let databaseTreeNode;
  let viewSchema;
  let backupJQueryContainerSpy;
  let backupNodeChildNodeSpy;
  let backupNode;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: {
          hasId: true,
          getTreeNodeHierarchy: jasmine.createSpy('getTreeNodeHierarchy'),
        },
        database: {
          hasId: true,
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
    databaseTreeNode = new TreeNode('database-tree-node', {
      _type: 'database',
      _label: 'some-database-label',
    }, [{id: 'database-tree-node'}]);
    pgBrowser.treeMenu.addChild(serverTreeNode, databaseTreeNode);

    jquerySpy = jasmine.createSpy('jquerySpy');
    backupNode = {
      __internal: {
        buttons: [{}, {}, {}, {
          element: {
            disabled: false,
          },
        }],
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

    backupJQueryContainerSpy = jasmine.createSpyObj('backupJQueryContainer', ['get', 'attr']);
    backupJQueryContainerSpy.get.and.returnValue(backupJQueryContainerSpy);

    generatedBackupModel = {};
    dialogModelKlassSpy = jasmine.createSpy('dialogModelKlass');
    dialogModelKlassSpy.and.returnValue(generatedBackupModel);

    viewSchema = {};
    backform = jasmine.createSpyObj('backform', ['generateViewSchema', 'Dialog']);
    backform.generateViewSchema.and.returnValue(viewSchema);

    backupNodeChildNodeSpy = jasmine.createSpyObj('something', ['addClass']);
    jquerySpy.and.callFake((selector) => {
      if (selector === '<div class=\'backup_dialog\'></div>') {
        return backupJQueryContainerSpy;
      } else if (selector === backupNode.elements.body.childNodes[0]) {
        return backupNodeChildNodeSpy;
      } else {
        return jasmine.createSpyObj('obj', ['appendTo']);
      }
    });
    alertifySpy = jasmine.createSpyObj('alertify', ['alert', 'dialog']);

  });

  describe('#prepare', () => {
    beforeEach(() => {
      backupDialogWrapper = new BackupDialogWrapper(
        '<div class=\'backup_dialog\'></div>',
        'backupDialogTitle',
        'backup',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );
      backupDialogWrapper = Object.assign(backupDialogWrapper, backupNode);
    });

    context('no tree element is selected', () => {
      it('does not create a backform dialog', () => {
        backupDialogWrapper.prepare();
        expect(backform.Dialog).not.toHaveBeenCalled();
      });

      it('disables the button "submit button" until a filename is selected', () => {
        backupDialogWrapper.prepare();
        expect(backupDialogWrapper.__internal.buttons[3].element.disabled).toBe(true);
      });
    });

    context('selected tree node has no data', () => {
      beforeEach(() => {
        pgBrowser.treeMenu.selectNode(noDataNode.domNode);
      });

      it('does not create a backform dialog', () => {
        backupDialogWrapper.prepare();
        expect(backform.Dialog).not.toHaveBeenCalled();
      });

      it('disables the button "submit button" until a filename is selected', () => {
        backupDialogWrapper.prepare();
        expect(backupDialogWrapper.__internal.buttons[3].element.disabled).toBe(true);
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
        backupDialogWrapper.prepare();
        expect(backform.Dialog).toHaveBeenCalledWith({
          el: backupJQueryContainerSpy,
          model: generatedBackupModel,
          schema: viewSchema,
        });

        expect(dialogSpy.render).toHaveBeenCalled();
      });


      it('add alertify classes to restore node childnode', () => {
        backupDialogWrapper.prepare();
        expect(backupNodeChildNodeSpy.addClass)
          .toHaveBeenCalledWith('alertify_tools_dialog_properties obj_properties');
      });

      it('disables the button submit button until a filename is selected', () => {
        backupDialogWrapper.prepare();
        expect(backupNode.__internal.buttons[3].element.disabled).toBe(true);
      });

      it('generates a new backup model', () => {
        backupDialogWrapper.prepare();
        expect(dialogModelKlassSpy).toHaveBeenCalledWith(
          {type: 'backup'},
          {node_info: treeHierarchyInformation}
        );
      });

      it('add the new dialog to the backup node HTML', () => {
        backupDialogWrapper.prepare();
        expect(backupNode.elements.content.appendChild).toHaveBeenCalledWith(backupJQueryContainerSpy);
      });
    });
  });

  describe('onButtonClicked', () => {
    let networkMock;
    beforeEach(() => {
      networkMock = new MockAdapter(axios);
      backupDialogWrapper = new BackupDialogWrapper(
        '<div class=\'backup_dialog\'></div>',
        'backupDialogTitle',
        'backup',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );

      backupDialogWrapper = Object.assign(backupDialogWrapper, backupNode);
    });

    afterEach(() => {
      networkMock.restore();
    });

    context('dialog help button was pressed', () => {
      let networkCalled;
      beforeEach(() => {
        networkCalled = false;
        networkMock.onAny(/.*/).reply(() => {
          networkCalled = true;
          return [200, {}];
        });
        pgBrowser.treeMenu.selectNode(serverTreeNode.domNode);
        pgBrowser.showHelp = jasmine.createSpy('showHelp');

        const event = {
          button: {
            element: {
              name: 'dialog_help',
              getAttribute: (attributeName) => {
                if (attributeName === 'url') {
                  return 'http://someurl';
                }
              },
            },
          },
        };
        backupDialogWrapper.callback(event);
      });

      it('displays help for dialog', () => {
        expect(pgBrowser.showHelp).toHaveBeenCalledWith(
          'dialog_help',
          'http://someurl',
          pgBrowser.Nodes['server'],
          serverTreeNode.getHtmlIdentifier()
        );
      });

      it('does not start the backup', () => {
        expect(networkCalled).toBe(false);
      });
    });

    context('object help button was pressed', () => {
      let networkCalled;
      beforeEach(() => {
        networkCalled = false;
        networkMock.onAny(/.*/).reply(() => {
          networkCalled = true;
          return [200, {}];
        });
        pgBrowser.treeMenu.selectNode(serverTreeNode.domNode);
        pgBrowser.showHelp = jasmine.createSpy('showHelp');

        const event = {
          button: {
            element: {
              name: 'object_help',
              getAttribute: (attributeName) => {
                if (attributeName === 'url') {
                  return 'http://someurl';
                }
              },
            },
          },
        };
        backupDialogWrapper.callback(event);
      });

      it('displays help for dialog', () => {
        expect(pgBrowser.showHelp).toHaveBeenCalledWith(
          'object_help',
          'http://someurl',
          pgBrowser.Nodes['server'],
          serverTreeNode.getHtmlIdentifier()
        );
      });

      it('does not start the backup', () => {
        expect(networkCalled).toBe(false);
      });
    });

    context('backup button was pressed', () => {
      context('no tree node is selected', () => {
        it('does not start the backup', () => {
          let networkCalled = false;
          networkMock.onAny(/.*/).reply(() => {
            networkCalled = true;
            return [200, {}];
          });

          let event = {
            button: {
              'data-btn-name': 'backup',
              element: {
                getAttribute: () => {
                  return 'http://someurl';
                },
              },
            },
          };

          backupDialogWrapper.callback(event);
          expect(networkCalled).toBe(false);
        });
      });

      context('tree node has no data', () => {
        it('does not start the backup', () => {
          pgBrowser.treeMenu.selectNode(noDataNode.domNode);

          let networkCalled = false;
          networkMock.onAny(/.*/).reply(() => {
            networkCalled = true;
            return [200, {}];
          });

          let event = {
            button: {
              'data-btn-name': 'backup',
              element: {
                getAttribute: () => {
                  return 'http://someurl';
                },
              },
            },
          };

          backupDialogWrapper.callback(event);
          expect(networkCalled).toBe(false);
        });
      });

      context('tree node has data', () => {
        context('when dialog type is global', () => {
          let event;
          beforeEach(() => {
            pgBrowser.treeMenu.selectNode(serverTreeNode.domNode);

            backupDialogWrapper.view = {
              model: new FakeModel(),
            };

            event = {
              button: {
                'data-btn-name': 'backup',
                element: {
                  getAttribute: () => {
                    return 'http://someurl';
                  },
                },
              },
            };
          });

          context('when the backup job is created successfully', () => {
            let dataSentToServer;
            beforeEach(() => {
              pgBrowser.Events = jasmine.createSpyObj('Events', ['trigger']);
              alertifySpy.success = jasmine.createSpy('success');
              networkMock.onPost('/backup/job/10').reply((request) => {
                dataSentToServer = request.data;
                return [200, {'success': 1}];
              });

            });

            it('creates a success alert box', (done) => {
              backupDialogWrapper.callback(event);
              setTimeout(() => {
                expect(alertifySpy.success).toHaveBeenCalledWith(
                  'Backup job created.',
                  5
                );
                done();
              }, 0);
            });

            it('trigger an event to background process', (done) => {
              backupDialogWrapper.callback(event);

              setTimeout(() => {
                expect(pgBrowser.Events.trigger).toHaveBeenCalledWith(
                  'pgadmin-bgprocess:created',
                  backupDialogWrapper
                );
                done();
              }, 0);
            });

            it('send the correct paramenters to the backend', (done) => {
              backupDialogWrapper.callback(event);
              setTimeout(() => {
                expect(JSON.parse(dataSentToServer)).toEqual(
                  {}
                );
                done();
              }, 0);
            });
          });

          context('when creating backup job fails', () => {
            it('creates an alert box', (done) => {
              alertifySpy.alert = jasmine.createSpy('alert');
              networkMock.onPost('/backup/job/10').reply(() => {
                return [400, {
                  errormsg: 'some-error-message',
                }];
              });

              backupDialogWrapper.callback(event);
              setTimeout( () => {
                expect(alertifySpy.alert).toHaveBeenCalledWith(
                  'Backup job failed.',
                  'some-error-message'
                );
                done();
              }, 0);

            });
          });
        });

        context('when dialog type is object', () => {
          let event;
          beforeEach(() => {
            backupDialogWrapper = new BackupDialogWrapper(
              '<div class=\'backup_dialog\'></div>',
              'backupDialogTitle',
              'backup_objects',
              jquerySpy,
              pgBrowser,
              alertifySpy,
              dialogModelKlassSpy,
              backform
            );

            pgBrowser.treeMenu.selectNode(databaseTreeNode.domNode);

            backupDialogWrapper.view = {
              model: new FakeModel(),
            };

            event = {
              button: {
                'data-btn-name': 'backup',
                element: {
                  getAttribute: () => {
                    return 'http://someurl';
                  },
                },
              },
            };
          });

          context('when the backup job is created successfully', () => {
            let dataSentToServer;
            beforeEach(() => {
              pgBrowser.Events = jasmine.createSpyObj('Events', ['trigger']);
              alertifySpy.success = jasmine.createSpy('success');

              networkMock.onPost('/backup/job/10/object').reply((request) => {
                dataSentToServer = request.data;
                return [200, {'success': 1}];
              });
            });

            it('creates a success alert box', (done) => {
              backupDialogWrapper.callback(event);
              setTimeout(() => {
                expect(alertifySpy.success).toHaveBeenCalledWith(
                  'Backup job created.',
                  5
                );
                done();
              }, 0);
            });

            it('trigger an event to background process', (done) => {
              backupDialogWrapper.callback(event);

              setTimeout(() => {
                expect(pgBrowser.Events.trigger).toHaveBeenCalledWith(
                  'pgadmin-bgprocess:created',
                  backupDialogWrapper
                );
                done();
              }, 0);
            });

            it('send the correct parameters to the backend', (done) => {
              backupDialogWrapper.callback(event);
              setTimeout(() => {
                expect(JSON.parse(dataSentToServer)).toEqual(
                  {database: 'some-database-label'}
                );
                done();
              }, 0);
            });
          });

          context('when creating backup job fails', () => {
            it('creates an alert box', (done) => {
              alertifySpy.alert = jasmine.createSpy('alert');
              networkMock.onPost('/backup/job/10/object').reply(() => {
                return [400, {
                  errormsg: 'some-error-message',
                }];
              });

              backupDialogWrapper.callback(event);
              setTimeout(() => {
                expect(alertifySpy.alert).toHaveBeenCalledWith(
                  'Backup job failed.',
                  'some-error-message'
                );
                done();
              }, 0);
            });
          });
        });
      });
    });
  });

  xdescribe('#setExtraParameters', () => {
    let selectedTreeNode;
    let treeInfo;
    let model;

    context('when dialog type is global', () => {
      beforeEach(() => {
        backupDialogWrapper = new BackupDialogWrapper(
          '<div class=\'backup_dialog\'></div>',
          'backupDialogTitle',
          'backup',
          jquerySpy,
          pgBrowser,
          alertifySpy,
          dialogModelKlassSpy,
          backform
        );

        treeInfo = {};
        model = new FakeModel();
        backupDialogWrapper.view = {
          model: model,
        };
      });


      it('sets nothing on the view model', () => {
        backupDialogWrapper.setExtraParameters(selectedTreeNode, treeInfo);
        expect(model.toJSON()).toEqual({});
      });
    });

    context('when dialog type is object', () => {
      beforeEach(() => {
        backupDialogWrapper = new BackupDialogWrapper(
          '<div class=\'backup_dialog\'></div>',
          'backupDialogTitle',
          'backup_objects',
          jquerySpy,
          pgBrowser,
          alertifySpy,
          dialogModelKlassSpy,
          backform
        );

        treeInfo = {
          database: {
            _label: 'some-database-label',
          },
          schema: {
            _label: 'some-treeinfo-label',
          },
        };

        model = new FakeModel();
        selectedTreeNode = new TreeNode('some-selected-node',
          {_type: 'some-type', _label: 'some-selected-label'},
          []);
        backupDialogWrapper.view = {
          model: model,
        };
      });

      it('sets the database label on the model', () => {
        backupDialogWrapper.setExtraParameters(selectedTreeNode, treeInfo);
        expect(model.toJSON()).toEqual({
          'database': 'some-database-label',
        });
      });

      context('when the selected is a schema type', () => {
        beforeEach(() => {
          selectedTreeNode = new TreeNode('some-selected-node',
            {_type: 'schema', _label: 'some-schema-label'},
            []);
        });

        it('sets the schema label on the model', () => {
          backupDialogWrapper.setExtraParameters(selectedTreeNode, treeInfo);
          expect(model.toJSON()).toEqual({
            'database': 'some-database-label',
            'schemas': ['some-schema-label'],
          });
        });
      });

      context('when the selected is a table type', () => {
        beforeEach(() => {
          selectedTreeNode = new TreeNode('some-selected-node',
            {_type: 'table', _label: 'some-table-label'},
            []);
        });

        it('sets the schema label on the model', () => {
          backupDialogWrapper.setExtraParameters(selectedTreeNode, treeInfo);
          expect(model.toJSON()).toEqual({
            'database': 'some-database-label',
            'tables': [['some-treeinfo-label', 'some-table-label']],
          });
        });
      });

      context('when the model has no ratio value', () => {
        beforeEach(() => {
          model.set('ratio', '');
        });

        it('sets clears the ratio value', () => {
          backupDialogWrapper.setExtraParameters(selectedTreeNode, treeInfo);
          expect(model.get('ratio')).toBeUndefined();
        });
      });

      context('when the model has a valid ratio value', () => {
        beforeEach(() => {
          model.set('ratio', '0.25');
        });

        it('sets clears the ratio value', () => {
          backupDialogWrapper.setExtraParameters(selectedTreeNode, treeInfo);
          expect(model.get('ratio')).toEqual('0.25');
        });
      });
    });
  });
});
