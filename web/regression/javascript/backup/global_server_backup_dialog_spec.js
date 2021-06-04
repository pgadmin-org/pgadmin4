/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {BackupDialog} from '../../../pgadmin/tools/backup/static/js/backup_dialog';
import {TreeFake} from '../tree/tree_fake';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';

const context = describe;

describe('GlobalServerBackupDialog', () => {
  let backupDialog;
  let pgBrowser;
  let jquerySpy;
  let alertifySpy;
  let backupModelSpy;

  let rootNode;
  let serverTreeNode, serverTreeNodeWrongPath;
  let ppasServerTreeNode, ppasServerTreeNodeWrongPath;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: jasmine.createSpyObj('Node[server]', ['getTreeNodeHierarchy']),
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
    jquerySpy = jasmine.createSpy('jquerySpy');
    backupModelSpy = jasmine.createSpy('backupModelSpy');

    rootNode = pgBrowser.treeMenu.addNewNode('level1', {}, undefined, []);
    serverTreeNode = pgBrowser.treeMenu.addNewNode('level1.1', {
      _type: 'server',
      _id: 10,
      server_type: 'pg',
      version: 100000,
    }, undefined, ['level1']);
    serverTreeNodeWrongPath = pgBrowser.treeMenu.addNewNode('level1.2', {
      _type: 'server',
      _id: 11,
      server_type: 'pg',
      version: 90600,
    }, undefined, ['level1']);
    ppasServerTreeNode = pgBrowser.treeMenu.addNewNode('level1.3', {
      _type: 'server',
      server_type: 'ppas',
      version: 130000,
    }, undefined, ['level1']);
    ppasServerTreeNodeWrongPath = pgBrowser.treeMenu.addNewNode('level1.4', {
      _type: 'server',
      server_type: 'ppas',
      version: 90600,
    }, undefined, ['level1']);
    pgBrowser.treeMenu.addNewNode('level3', {}, undefined, ['level1', 'level1.2', 'level1.3', 'level1.4']);
    pgBrowser.treeMenu.addNewNode('level3.1', undefined, undefined, ['level1', 'level1.2', 'level3']);
  });

  describe('#draw', () => {
    let networkMock;
    beforeEach(() => {
      networkMock = new MockAdapter(axios);
      alertifySpy = jasmine.createSpyObj('alertify', ['alert', 'dialog']);
      alertifySpy['BackupDialog_globals'] = jasmine.createSpy('BackupDialog_globals');
      alertifySpy['BackupDialog_server'] = jasmine.createSpy('BackupDialog_server');
      backupDialog = new BackupDialog(
        pgBrowser,
        jquerySpy,
        alertifySpy,
        backupModelSpy
      );

      pgBrowser.get_preference = jasmine.createSpy('get_preferences');
    });

    afterEach(() => {
      networkMock.restore();
    });

    context('there are no ancestors of the type server', () => {
      it('does not create a dialog', () => {
        pgBrowser.treeMenu.selectNode([{id: 'level1'}]);
        backupDialog.draw(null, null, null);
        expect(alertifySpy['BackupDialog_globals']).not.toHaveBeenCalled();
        expect(alertifySpy['BackupDialog_server']).not.toHaveBeenCalled();
      });

      it('display an alert with a Backup Error', () => {
        backupDialog.draw(null, [rootNode], null);
        expect(alertifySpy.alert).toHaveBeenCalledWith(
          'Backup Error',
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
            backupDialog.draw(null, [serverTreeNode], null);
            expect(alertifySpy.alert).toHaveBeenCalledWith(
              'Preferences Error',
              'Failed to load preference pg_bin_dir of module paths'
            );
          });
        });

        context('server is a EPAS server', () => {
          it('display an alert with "Preferences Error"', () => {
            backupDialog.draw(null, [ppasServerTreeNode], null);
            expect(alertifySpy.alert).toHaveBeenCalledWith(
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
              backupDialog.draw(null, [serverTreeNodeWrongPath], null);
              expect(alertifySpy.alert).toHaveBeenCalledWith(
                'Configuration required',
                'Please configure the PostgreSQL Binary Path in the Preferences dialog.'
              );
            });
          });
        });

        context('binary folder is configured', () => {
          let globalResizeToSpy;
          let serverResizeToSpy;
          beforeEach(() => {
            globalResizeToSpy = jasmine.createSpyObj('globals', ['resizeTo']);
            alertifySpy['BackupDialog_globals'].and
              .returnValue(globalResizeToSpy);
            serverResizeToSpy = jasmine.createSpyObj('server', ['resizeTo']);
            alertifySpy['BackupDialog_server'].and
              .returnValue(serverResizeToSpy);
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"PostgreSQL 9.6\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"PostgreSQL 10\",\"binaryPath\":\"/Library/PostgreSQL/10/bin\",\"isDefault\":true,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"PostgreSQL 11\",\"binaryPath\":\"/Library/PostgreSQL/11/bin\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"PostgreSQL 12\",\"binaryPath\":\"/Library/PostgreSQL/12/bin\",\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"PostgreSQL 13\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
            spyOn(backupDialog, 'url_for_utility_exists').and.returnValue('/backup/utility_exists/10/servers');
            networkMock.onGet('/backup/utility_exists/10/servers').reply(200, {'success': 1});
          });

          context('dialog for global backup ', () => {
            it('displays the dialog when binary path is for correct server version', (done) => {
              backupDialog.draw(null, [serverTreeNode], {globals: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_globals']).toHaveBeenCalledWith(true);
                expect(globalResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });

          context('dialog for server backup', () => {
            it('displays the dialog when binary path is for correct server version', (done) => {
              backupDialog.draw(null, [serverTreeNode], {server: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_server']).toHaveBeenCalledWith(true);
                expect(serverResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });

          context('dialog for global backup ', () => {
            it('displays the dialog when default binary path is specified', (done) => {
              backupDialog.draw(null, [serverTreeNodeWrongPath], {globals: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_globals']).toHaveBeenCalledWith(true);
                expect(globalResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });

          context('dialog for server backup', () => {
            it('displays the dialog when default binary path is specified', (done) => {
              backupDialog.draw(null, [serverTreeNodeWrongPath], {server: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_server']).toHaveBeenCalledWith(true);
                expect(serverResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });
        });
      });
      context('preference can be found for EPAS Server', () => {
        context('binary folder is not configured', () => {
          beforeEach(() => {
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"EDB Advanced Server 9.6\",\"binaryPath\":\"\",\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"EDB Advanced Server 10\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"EDB Advanced Server 11\",\"binaryPath\":\"/Library/EPAS/11/bin/\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"EDB Advanced Server 12\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"EDB Advanced Server 13\",\"binaryPath\":\"/Library/EPAS/13/bin/\",\"isDefault\":false,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
          });

          context('server is a EPAS server', () => {
            it('display an alert with "Configuration required"', () => {
              backupDialog.draw(null, [ppasServerTreeNodeWrongPath], null);
              expect(alertifySpy.alert).toHaveBeenCalledWith(
                'Configuration required',
                'Please configure the EDB Advanced Server Binary Path in the Preferences dialog.'
              );
            });
          });
        });

        context('binary folder is configured', () => {
          let globalResizeToSpy;
          let serverResizeToSpy;
          beforeEach(() => {
            globalResizeToSpy = jasmine.createSpyObj('globals', ['resizeTo']);
            alertifySpy['BackupDialog_globals'].and
              .returnValue(globalResizeToSpy);
            serverResizeToSpy = jasmine.createSpyObj('server', ['resizeTo']);
            alertifySpy['BackupDialog_server'].and
              .returnValue(serverResizeToSpy);
            pgBrowser.get_preference.and.returnValue({value: '[{\"serverType\":\"EDB Advanced Server 9.6\",\"binaryPath\":\"\",\"isDefault\":false,\"version\":\"90600\",\"next_major_version\":\"100000\"},{\"serverType\":\"EDB Advanced Server 10\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"100000\",\"next_major_version\":\"110000\"},{\"serverType\":\"EDB Advanced Server 11\",\"binaryPath\":\"/Library/EPAS/11/bin/\",\"isDefault\":false,\"version\":\"110000\",\"next_major_version\":\"120000\"},{\"serverType\":\"EDB Advanced Server 12\",\"binaryPath\":null,\"isDefault\":false,\"version\":\"120000\",\"next_major_version\":\"130000\"},{\"serverType\":\"EDB Advanced Server 13\",\"binaryPath\":\"/Library/EPAS/13/bin/\",\"isDefault\":true,\"version\":\"130000\",\"next_major_version\":\"140000\"}]'});
            spyOn(backupDialog, 'url_for_utility_exists').and.returnValue('/backup/utility_exists/10/servers');
            networkMock.onGet('/backup/utility_exists/10/servers').reply(200, {'success': 1});
          });

          context('dialog for global backup ', () => {
            it('displays the dialog when binary path is for correct server version', (done) => {
              backupDialog.draw(null, [ppasServerTreeNode], {globals: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_globals']).toHaveBeenCalledWith(true);
                expect(globalResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });

          context('dialog for server backup', () => {
            it('displays the dialog when binary path is for correct server version', (done) => {
              backupDialog.draw(null, [ppasServerTreeNode], {server: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_server']).toHaveBeenCalledWith(true);
                expect(serverResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });

          context('dialog for global backup ', () => {
            it('displays the dialog when default binary path is specified', (done) => {
              backupDialog.draw(null, [ppasServerTreeNodeWrongPath], {globals: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_globals']).toHaveBeenCalledWith(true);
                expect(globalResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });

          context('dialog for server backup', () => {
            it('displays the dialog when default binary path is specified', (done) => {
              backupDialog.draw(null, [ppasServerTreeNodeWrongPath], {server: true}, pgBrowser.stdW.md, pgBrowser.stdH.md);
              setTimeout(() => {
                expect(alertifySpy['BackupDialog_server']).toHaveBeenCalledWith(true);
                expect(serverResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
                done();
              }, 0);
            });
          });
        });
      });
    });
  });
});
