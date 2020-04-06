/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import SearchObjectsDialog from 'tools/search_objects/static/js/search_objects_dialog';
import {TreeFake} from '../tree/tree_fake';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';

const context = describe;

describe('SearchObjectsDialog', () => {
  let soDialog;
  let pgBrowser;
  let jquerySpy;
  let alertifySpy;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: {
          hasId: true,
          label: 'server',
          getTreeNodeHierarchy: jasmine.createSpy('server.getTreeNodeHierarchy'),
        },
        database: {
          hasId: true,
          label: 'database',
          getTreeNodeHierarchy: jasmine.createSpy('db.getTreeNodeHierarchy'),
        },
        schema: {
          hasId: true,
          label: 'schema',
          getTreeNodeHierarchy: jasmine.createSpy('db.getTreeNodeHierarchy'),
        },
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
                user: {name: 'username'},
                label: 'theserver',
              },
              children: [
                {
                  id: 'some_database',
                  data: {
                    _type: 'database',
                    _id: 11,
                    label: 'thedatabase',
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
      alertifySpy['search_objects'] = jasmine.createSpy('search_objects');
      soDialog = new SearchObjectsDialog(
        pgBrowser,
        jquerySpy,
        alertifySpy,
        null
      );

      pgBrowser.get_preference = jasmine.createSpy('get_preferences');
    });

    afterEach(() => {
      networkMock.restore();
    });

    context('there are no ancestors of the type database', () => {
      it('does not create a dialog', () => {
        pgBrowser.treeMenu.selectNode([{id: 'serverTreeNode'}]);
        soDialog.draw(null, null, null);
        expect(alertifySpy['search_objects']).not.toHaveBeenCalled();
      });

      it('display an alert with a Backup Error', () => {
        soDialog.draw(null, [{id: 'serverTreeNode'}], null);
        expect(alertifySpy.alert).toHaveBeenCalledWith(
          'Search Objects Error',
          'Please select a database or its child node from the browser.'
        );
      });
    });

    context('there is an ancestor of the type database', () => {
      let soDialogResizeToSpy;
      beforeEach(() => {
        soDialogResizeToSpy = jasmine.createSpyObj('soDialogResizeToSpy', ['resizeTo']);
        alertifySpy['search_objects'].and
          .returnValue(soDialogResizeToSpy);
      });

      it('displays the dialog when database node selected', (done) => {
        soDialog.draw(null, [{id: 'some_database'}], null, pgBrowser.stdW.md, pgBrowser.stdH.md);
        setTimeout(() => {
          expect(alertifySpy['search_objects']).toHaveBeenCalledWith('Search Objects - thedatabase/username@theserver');
          expect(soDialogResizeToSpy.resizeTo).toHaveBeenCalledWith(pgBrowser.stdW.md, pgBrowser.stdH.md);
          done();
        }, 0);
      });
    });
  });
});
