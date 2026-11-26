/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import pgAdmin from 'sources/pgadmin';
import Theme from '../../../pgadmin/static/js/Theme';
import { TreeNode } from '../../../pgadmin/static/js/tree/tree_nodes';
import SearchObjects from '../../../pgadmin/tools/search_objects/static/js/SearchObjects';
import { TreeFake } from '../tree/tree_fake';
import usePreferences from '../../../pgadmin/preferences/static/js/store';

const nodeData = {server: {'_id' : 10}, database: {'_id': 123}};

describe('SearchObjects', ()=>{
  let networkMock;

  beforeAll(()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onGet('/search_objects/types/10/123').reply(200, {data: [{cast: 'Casts', function: 'Functions'}]});
    networkMock.onGet('/search_objects/search/10/123').reply(200, {data: [
      {
        'name': 'plpgsql',
        'type': 'extension',
        'type_label': 'Extensions',
        'path': ':extension.13315:/plpgsql',
        'show_node': true,
        'other_info': null,
        'catalog_level': 'N'
      },
      {
        'name': 'plpgsql_call_handler',
        'type': 'function',
        'type_label': 'Functions',
        'path': ':schema.11:/PostgreSQL Catalog (pg_catalog)/:function.13316:/plpgsql_call_handler',
        'show_node': true,
        'other_info': '',
        'catalog_level': 'D'
      },
      {
        'name': 'plpgsql_inline_handler',
        'type': 'function',
        'type_label': 'Functions',
        'path': ':schema.11:/PostgreSQL Catalog (pg_catalog)/:function.13317:/plpgsql_inline_handler',
        'show_node': true,
        'other_info': 'internal',
        'catalog_level': 'D'
      },
      {
        'name': 'plpgsql_validator',
        'type': 'function',
        'type_label': 'Functions',
        'path': ':schema.11:/PostgreSQL Catalog (pg_catalog)/:function.13318:/plpgsql_validator',
        'show_node': true,
        'other_info': 'oid',
        'catalog_level': 'D'
      },
      {
        'name': 'plpgsql',
        'type': 'language',
        'type_label': 'Languages',
        'path': ':language.13319:/plpgsql',
        'show_node': true,
        'other_info': null,
        'catalog_level': 'N'
      }
    ]});

    pgAdmin.Browser.tree = new TreeFake(pgAdmin.Browser);
  });

  afterAll(() => {
    networkMock.restore();
  });

  beforeEach(()=>{
    let serverTreeNode = pgAdmin.Browser.tree.addNewNode('level2.1', {
        _type: 'server',
        _id: 10,
        label: 'some-tree-label',
      }, [{id: 'level2.1'}]),
      databaseTreeNode = new TreeNode('database-tree-node', {
        _type: 'database',
        _id: 123,
        _label: 'some-database-label',
      }, [{id: 'database-tree-node'}]);
    pgAdmin.Browser.tree.addChild(serverTreeNode, databaseTreeNode);
  });

  describe('SearchObjects', ()=>{
    let ctrl;
    let ctrlMount = async ()=>{
      await act(async ()=>{
        ctrl = await render(
          <Theme>
            <SearchObjects nodeData={nodeData}/>
          </Theme>
        );
      });
      return render();
    };
    const user = userEvent.setup();

    it('search', async ()=>{
      await ctrlMount();
      await user.type(ctrl.container.querySelector('input'), 'plp');
      await user.click(ctrl.container.querySelector('button[data-test="search"]'), 'plp');
      expect(ctrl.container.querySelectorAll('[data-test="react-data-grid"]').length).toBe(1);
    });

    describe('default object type preference', ()=>{
      /* Its own servers and databases, so the types replies can differ */
      beforeAll(()=>{
        networkMock.onGet('/search_objects/types/11/124').reply(200, {data: {cast: 'Casts', function: 'Functions'}});
        networkMock.onGet('/search_objects/search/11/124').reply(200, {data: []});
        /* A server whose types never arrive */
        networkMock.onGet('/search_objects/types/12/125').reply(()=>new Promise(()=>{/* never settles */}));
        networkMock.onGet('/search_objects/search/12/125').reply(200, {data: []});
      });

      let prefSpy;

      afterEach(()=>{
        prefSpy?.mockRestore();
      });

      const searchWithPref = async (defaultType, sid=11, did=124)=>{
        prefSpy = jest.spyOn(usePreferences.getState(), 'getPreferencesForModule').mockReturnValue(
          defaultType ? {default_object_type: defaultType} : {}
        );
        networkMock.resetHistory();
        await act(async ()=>{
          ctrl = render(
            <Theme>
              <SearchObjects nodeData={{server: {'_id': sid}, database: {'_id': did}}}/>
            </Theme>
          );
        });
        await user.type(ctrl.container.querySelector('input'), 'plp{Enter}');
        /* The footer loses its full stop once the search has returned */
        await ctrl.findByText('0 matches found');
        return networkMock.history.get.find((r)=>r.url == `/search_objects/search/${sid}/${did}`).params.type;
      };

      it.each([
        ['is not set', undefined, 'all'],
        ['is supported by the server', 'function', 'function'],
        ['is not supported by the server', 'synonym', 'all'],
      ])('searches the right type when the preference %s', async (_desc, pref, expected)=>{
        expect(await searchWithPref(pref)).toBe(expected);
      });

      it('searches all types until the server has confirmed the type', async ()=>{
        expect(await searchWithPref('function', 12, 125)).toBe('all');
      });
    });

    it('search_on_enter', async ()=>{
      await ctrlMount();
      await user.type(ctrl.container.querySelector('input'), 'plp{Enter}');
      expect(ctrl.container.querySelectorAll('[data-test="react-data-grid"]').length).toBe(1);
    });
  });
});
