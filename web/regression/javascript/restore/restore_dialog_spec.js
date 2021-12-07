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
import Notify from '../../../pgadmin/static/js/helpers/Notifier';

const context = describe;

describe('RestoreDialog', () => {
  let restoreDialog;
  let pgBrowser;
  let jquerySpy;
  let alertifySpy;
  let restoreModelSpy;

  beforeEach(() => {
    pgBrowser = {
      tree: new TreeFake(),
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
    spyOn(Notify, 'alert');

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
                server_type: 'pg',
                version: 100000,
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
              id: 'serverTreeNodeWrongPath',
              data: {
                _id: 12,
                _type: 'server',
                label: 'some-tree-label',
                server_type: 'pg',
                version: 90600,
              },
            },
            {
              id: 'ppasServer',
              data: {
                _id: 13,
                _type: 'server',
                label: 'some-tree-label',
                server_type: 'ppas',
                version: 130000,
              },
            },
            {
              id: 'ppasServerTreeNodeWrongPath',
              data: {
                _id: 14,
                _type: 'server',
                label: 'some-tree-label',
                server_type: 'ppas',
                version: 90600,
              },
            },
          ],
        },
      ],
    };

    pgBrowser.tree = TreeFake.build(hierarchy, pgBrowser);
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
        pgBrowser.tree.selectNode([{id: 'root'}]);
        restoreDialog.draw(null, null, null);
        expect(alertifySpy['pg_restore']).not.toHaveBeenCalled();
      });

      it('display an alert with a Restore Error', () => {
        restoreDialog.draw(null, [{id: 'root'}], null);
        expect(Notify.alert).toHaveBeenCalledWith(
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

        context('server is a PostgreSQL server', () => {
          it('display an alert with "Preferences Error"', () => {
            restoreDialog.draw(null, [{id: 'serverTreeNode'}], null);
            expect(Notify.alert).toHaveBeenCalledWith(
              'Preferences Error',
              'Failed to load preference pg_bin_dir of module paths'
            );
          });
        });

        context('server is a EPAS server', () => {
          it('display an alert with "Preferences Error"', () => {
            restoreDialog.draw(null, [{id: 'ppasServer'}], null);
            expect(Notify.alert).toHaveBeenCalledWith(
              'Preferences Error',
              'Failed to load preference ppas_bin_dir of module paths'
            );
          });
        });
      });

      context('preference can be found for PostgreSQL Server', () => {
        context('binary folder is not configured', () => {
          beforeEach(() => {
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"PostgreSQL 9.6\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"PostgreSQL 10\",\"binaryPath\":\"/Library/PostgreSQL/10/bin\",\"isDefault\":false,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"PostgreSQL 11\",\"binaryPath\":\"/Library/PostgreSQL/11/bin\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"PostgreSQL 12\",\"binaryPath\":\"/Library/PostgreSQL/12/bin\",\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"PostgreSQL 13\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
          });

          context('server is a PostgreSQL server', () => {
            it('display an alert with "Configuration required"', () => {
              restoreDialog.draw(null, [{id: 'serverTreeNodeWrongPath'}], null);
              expect(Notify.alert).toHaveBeenCalledWith(
                'Configuration required',
                'Please configure the PostgreSQL Binary Path in the Preferences dialog.'
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
            pgBrowser.Nodes.server.label = 'some-server-label';
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"PostgreSQL 9.6\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"PostgreSQL 10\",\"binaryPath\":\"/Library/PostgreSQL/10/bin\",\"isDefault\":true,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"PostgreSQL 11\",\"binaryPath\":\"/Library/PostgreSQL/11/bin\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"PostgreSQL 12\",\"binaryPath\":\"/Library/PostgreSQL/12/bin\",\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"PostgreSQL 13\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
            spyOn(restoreDialog, 'url_for_utility_exists').and.returnValue('/restore/utility_exists/10/objects');
            networkMock.onGet('/restore/utility_exists/10/objects').reply(200, {'success': 1});
          });

          it('displays the dialog when binary path is for correct server version', (done) => {
            restoreDialog.draw(null, [{id: 'serverTreeNode'}], pgBrowser.stdW.md, pgBrowser.stdH.md);
            setTimeout(() => {
              expect(alertifySpy['pg_restore']).toHaveBeenCalledWith(
                'Restore (some-server-label: some-tree-label)',
                [{id: 'serverTreeNode'}],
                {
                  _id: 10,
                  _type: 'server',
                  label: 'some-tree-label',
                  server_type: 'pg',
                  version: 100000,
                },
                pgBrowser.Nodes.server
              );
              expect(spy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
              done();
            }, 0);
          });

          it('displays the dialog when default binary path is specified', (done) => {
            restoreDialog.draw(null, [{id: 'serverTreeNodeWrongPath'}], pgBrowser.stdW.md, pgBrowser.stdH.md);
            setTimeout(() => {
              expect(alertifySpy['pg_restore']).toHaveBeenCalledWith(
                'Restore (some-server-label: some-tree-label)',
                [{id: 'serverTreeNodeWrongPath'}],
                {
                  _id: 12,
                  _type: 'server',
                  label: 'some-tree-label',
                  server_type: 'pg',
                  version: 90600,
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

      context('preference can be found for EPAS server', () => {
        context('binary folder is not configured', () => {
          beforeEach(() => {
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"EDB Advanced Server 9.6\",\"binaryPath\":\"\",\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"EDB Advanced Server 10\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"EDB Advanced Server 11\",\"binaryPath\":\"/Library/EPAS/11/bin/\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"EDB Advanced Server 12\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"EDB Advanced Server 13\",\"binaryPath\":\"/Library/EPAS/13/bin/\",\"isDefault\":false,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
          });

          context('server is a EPAS server', () => {
            it('display an alert with "Configuration required"', () => {
              restoreDialog.draw(null, [{id: 'ppasServerTreeNodeWrongPath'}], null);
              expect(Notify.alert).toHaveBeenCalledWith(
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
            pgBrowser.Nodes.server.label = 'some-server-label';
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"EDB Advanced Server 9.6\",\"binaryPath\":\"\",\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"EDB Advanced Server 10\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"EDB Advanced Server 11\",\"binaryPath\":\"/Library/EPAS/11/bin/\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"EDB Advanced Server 12\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"EDB Advanced Server 13\",\"binaryPath\":\"/Library/EPAS/13/bin/\",\"isDefault\":true,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
            spyOn(restoreDialog, 'url_for_utility_exists').and.returnValue('/restore/utility_exists/10/objects');
            networkMock.onGet('/restore/utility_exists/10/objects').reply(200, {'success': 1});
          });

          it('displays the dialog when binary path is for correct server version', (done) => {
            restoreDialog.draw(null, [{id: 'ppasServer'}], pgBrowser.stdW.md, pgBrowser.stdH.md);
            setTimeout(() => {
              expect(alertifySpy['pg_restore']).toHaveBeenCalledWith(
                'Restore (some-server-label: some-tree-label)',
                [{id: 'ppasServer'}],
                {
                  _id: 13,
                  _type: 'server',
                  label: 'some-tree-label',
                  server_type: 'ppas',
                  version: 130000,
                },
                pgBrowser.Nodes.server
              );
              expect(spy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
              done();
            }, 0);
          });

          it('displays the dialog when default binary path is specified', (done) => {
            restoreDialog.draw(null, [{id: 'ppasServerTreeNodeWrongPath'}], pgBrowser.stdW.md, pgBrowser.stdH.md);
            setTimeout(() => {
              expect(alertifySpy['pg_restore']).toHaveBeenCalledWith(
                'Restore (some-server-label: some-tree-label)',
                [{id: 'ppasServerTreeNodeWrongPath'}],
                {
                  _id: 14,
                  _type: 'server',
                  label: 'some-tree-label',
                  server_type: 'ppas',
                  version: 90600,
                },
                pgBrowser.Nodes.server
              );
              expect(spy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
              done();
            }, 0);
          });
        });
      });
    });
  });
});
