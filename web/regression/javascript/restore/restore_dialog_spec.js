/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {TreeFake} from '../tree/tree_fake';
import {RestoreDialog} from '../../../pgadmin/tools/restore/static/js/restore_dialog';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';

const context = describe;

describe('RestoreDialog', () => {
  let restoreDialog;
  let pgBrowser;
  let jquerySpy;
  let alertifySpy;
  let restoreModelSpy;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: jasmine.createSpyObj('Node[server]', ['getTreeNodeHierarchy']),
        database: jasmine.createSpyObj('Node[database]', ['getTreeNodeHierarchy']),
      },
      stdW: {
        sm: 500,
        md: 700,
        lg: 900,
        default: 500,
      },
      stdH: {
        sm: 200,
        md: 400,
        lg: 550,
        default: 550,
      },
    };
    pgBrowser.Nodes.server.hasId = true;
    pgBrowser.Nodes.database.hasId = true;
    jquerySpy = jasmine.createSpy('jquerySpy');
    restoreModelSpy = jasmine.createSpy('restoreModelSpy');

    const hierarchy = {
      children: [
        {
          id: 'root',
          children: [
            {
              id: 'serverTreeNode',
              data: {
                _id: 10,
                _type: 'server',
                label: 'some-tree-label',
              },
              children: [
                {
                  id: 'some_database',
                  data: {
                    _type: 'database',
                    _id: 11,
                    label: 'some_database',
                    _label: 'some_database_label',
                  },
                }, {
                  id: 'database_with_equal_in_name',
                  data: {
                    _type: 'database',
                    label: 'some_database',
                    _label: '=some_database_label',
                  },
                },
              ],
            },
            {
              id: 'ppasServer',
              data: {
                _type: 'server',
                server_type: 'ppas',
                children: [
                  {id: 'someNodeUnderneathPPASServer'},
                ],
              },
            },
          ],
        },
      ],
    };

    pgBrowser.treeMenu = TreeFake.build(hierarchy);
  });

  describe('#draw', () => {
    let networkMock;
    beforeEach(() => {
      networkMock = new MockAdapter(axios);
      alertifySpy = jasmine.createSpyObj('alertify', ['alert', 'dialog']);
      alertifySpy['pg_restore'] = jasmine.createSpy('pg_restore');
      restoreDialog = new RestoreDialog(
        pgBrowser,
        jquerySpy,
        alertifySpy,
        restoreModelSpy
      );

      pgBrowser.get_preference = jasmine.createSpy('get_preferences');
    });

    afterEach(() => {
      networkMock.restore();
    });

    context('there are no ancestors of the type server', () => {
      it('does not create a dialog', () => {
        pgBrowser.treeMenu.selectNode([{id: 'root'}]);
        restoreDialog.draw(null, null, null);
        expect(alertifySpy['pg_restore']).not.toHaveBeenCalled();
      });

      it('display an alert with a Restore Error', () => {
        restoreDialog.draw(null, [{id: 'root'}], null);
        expect(alertifySpy.alert).toHaveBeenCalledWith(
          'Restore Error',
          'Please select server or child node from the browser tree.'
        );
      });
    });

    context('there is an ancestor of the type server', () => {
      context('no preference can be found', () => {
        beforeEach(() => {
          pgBrowser.get_preference.and.returnValue(undefined);
        });

        context('server is a ppas server', () => {
          it('display an alert with "Restore Error"', () => {
            restoreDialog.draw(null, [{id: 'serverTreeNode'}], null);
            expect(alertifySpy.alert).toHaveBeenCalledWith(
              'Restore Error',
              'Failed to load preference pg_bin_dir of module paths'
            );
          });
        });

        context('server is not a ppas server', () => {
          it('display an alert with "Restore Error"', () => {
            restoreDialog.draw(null, [{id: 'ppasServer'}], null);
            expect(alertifySpy.alert).toHaveBeenCalledWith(
              'Restore Error',
              'Failed to load preference ppas_bin_dir of module paths'
            );
          });
        });
      });

      context('preference can be found', () => {
        context('binary folder is not configured', () => {
          beforeEach(() => {
            pgBrowser.get_preference.and.returnValue({});
          });

          context('server is a ppas server', () => {
            it('display an alert with "Configuration required"', () => {
              restoreDialog.draw(null, [{id: 'serverTreeNode'}], null);
              expect(alertifySpy.alert).toHaveBeenCalledWith(
                'Configuration required',
                'Please configure the PostgreSQL Binary Path in the Preferences dialog.'
              );
            });
          });

          context('server is not a ppas server', () => {
            it('display an alert with "Configuration required"', () => {
              restoreDialog.draw(null, [{id: 'ppasServer'}], null);
              expect(alertifySpy.alert).toHaveBeenCalledWith(
                'Configuration required',
                'Please configure the EDB Advanced Server Binary Path in the Preferences dialog.'
              );
            });
          });
        });

        context('binary folder is configured', () => {
          let spy;
          beforeEach(() => {
            spy = jasmine.createSpyObj('globals', ['resizeTo']);
            alertifySpy['pg_restore'].and
              .returnValue(spy);
            pgBrowser.get_preference.and.returnValue({value: '/some/path'});
            pgBrowser.Nodes.server.label = 'some-server-label';
            spyOn(restoreDialog, 'url_for_utility_exists').and.returnValue('/restore/utility_exists/10/objects');
            networkMock.onGet('/restore/utility_exists/10/objects').reply(200, {'success': 1});
          });

          it('displays the dialog', (done) => {
            restoreDialog.draw(null, [{id: 'serverTreeNode'}], pgBrowser.stdW.md, pgBrowser.stdH.md);
            setTimeout(() => {
              expect(alertifySpy['pg_restore']).toHaveBeenCalledWith(
                'Restore (some-server-label: some-tree-label)',
                [{id: 'serverTreeNode'}],
                {
                  _id: 10,
                  _type: 'server',
                  label: 'some-tree-label',
                },
                pgBrowser.Nodes.server
              );
              expect(spy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
              done();
            }, 0);
          });

          context('database label contain "="', () => {
            it('should create alert dialog with restore error', (done) => {
              restoreDialog.draw(null, [{id: 'database_with_equal_in_name'}], null);
              setTimeout(() => {
                expect(alertifySpy.alert).toHaveBeenCalledWith('Restore Error',
                  'Databases with = symbols in the name cannot be backed up or restored using this utility.');
                done();
              }, 0);
            });
          });
        });
      });
    });
  });
});
