/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {BackupDialog} from '../../../pgadmin/tools/backup/static/js/backup_dialog';
import {TreeFake} from '../tree/tree_fake';

const context = describe;

describe('GlobalServerBackupDialog', () => {
  let backupDialog;
  let pgBrowser;
  let jquerySpy;
  let alertifySpy;
  let backupModelSpy;


  let rootNode;
  let serverTreeNode;
  let ppasServerTreeNode;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: jasmine.createSpyObj('Node[server]', ['getTreeNodeHierarchy']),
      },
    };
    pgBrowser.Nodes.server.hasId = true;
    jquerySpy = jasmine.createSpy('jquerySpy');
    backupModelSpy = jasmine.createSpy('backupModelSpy');

    rootNode = pgBrowser.treeMenu.addNewNode('level1', {}, undefined, []);
    serverTreeNode = pgBrowser.treeMenu.addNewNode('level1.1', {
      _type: 'server',
      _id: 10,
    }, undefined, ['level1']);
    ppasServerTreeNode = pgBrowser.treeMenu.addNewNode('level1.2', {
      _type: 'server',
      server_type: 'ppas',
    }, undefined, ['level1']);
    pgBrowser.treeMenu.addNewNode('level3', {}, undefined, ['level1', 'level1.2']);
    pgBrowser.treeMenu.addNewNode('level3.1', undefined, undefined, ['level1', 'level1.2', 'level3']);
  });

  describe('#draw', () => {
    beforeEach(() => {
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

        context('server is a ppas server', () => {
          it('display an alert with "Backup Error"', () => {
            backupDialog.draw(null, [serverTreeNode], null);
            expect(alertifySpy.alert).toHaveBeenCalledWith(
              'Backup Error',
              'Failed to load preference pg_bin_dir of module paths'
            );
          });
        });

        context('server is not a ppas server', () => {
          it('display an alert with "Backup Error"', () => {
            backupDialog.draw(null, [ppasServerTreeNode], null);
            expect(alertifySpy.alert).toHaveBeenCalledWith(
              'Backup Error',
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
              backupDialog.draw(null, [serverTreeNode], null);
              expect(alertifySpy.alert).toHaveBeenCalledWith(
                'Configuration required',
                'Please configure the PostgreSQL Binary Path in the Preferences dialog.'
              );
            });
          });

          context('server is not a ppas server', () => {
            it('display an alert with "Configuration required"', () => {
              backupDialog.draw(null, [ppasServerTreeNode], null);
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
            pgBrowser.get_preference.and.returnValue({value: '/some/path'});
          });

          context('dialog for global backup', () => {
            it('displays the dialog', () => {
              backupDialog.draw(null, [serverTreeNode], {globals: true});
              expect(alertifySpy['BackupDialog_globals']).toHaveBeenCalledWith(true);
              expect(globalResizeToSpy.resizeTo).toHaveBeenCalledWith('60%', '50%');
            });
          });

          context('dialog for server backup', () => {
            it('displays the dialog', () => {
              backupDialog.draw(null, [serverTreeNode], {server: true});
              expect(alertifySpy['BackupDialog_server']).toHaveBeenCalledWith(true);
              expect(serverResizeToSpy.resizeTo).toHaveBeenCalledWith('60%', '50%');
            });
          });
        });
      });
    });
  });
});
