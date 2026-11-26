/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import pgAdmin from 'sources/pgadmin';
import Theme from '../../../pgadmin/static/js/Theme';
import { TreeNode } from '../../../pgadmin/static/js/tree/tree_nodes';
import SearchObjects from '../../../pgadmin/tools/search_objects/static/js/SearchObjects';
import { TreeFake } from '../tree/tree_fake';

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
      },
      {
        'name': 'plp, "odd"\nname',
        'type': 'extension',
        'type_label': 'Extensions',
        'path': ':extension.13320:/plp, "odd"\nname',
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

    it('search_on_enter', async ()=>{
      await ctrlMount();
      await user.type(ctrl.container.querySelector('input'), 'plp{Enter}');
      expect(ctrl.container.querySelectorAll('[data-test="react-data-grid"]').length).toBe(1);
    });

    it('copy_results_as_csv', async ()=>{
      /* Just enough node types for the result paths to be translated */
      const origNodes = pgAdmin.Browser.Nodes;
      pgAdmin.Browser.Nodes = {
        'coll-database': {type: 'coll-database', label: 'Databases'},
        'coll-extension': {type: 'coll-extension', label: 'Extensions'},
        'coll-function': {type: 'coll-function', label: 'Functions'},
        'coll-language': {type: 'coll-language', label: 'Languages'},
        'catalog': {type: 'catalog'},
      };
      try {
        /* userEvent.setup() installs its own clipboard stub on navigator */
        const writeText = jest.spyOn(navigator.clipboard, 'writeText');
        await ctrlMount();
        const copyBtn = ()=>ctrl.container.querySelector('button[data-test="copy-results"]');
        expect(copyBtn()).toBeDisabled();
        await user.type(ctrl.container.querySelector('input'), 'plp{Enter}');
        await waitFor(()=>expect(copyBtn()).toBeEnabled());
        await user.click(copyBtn());
        expect(writeText).toHaveBeenCalledWith([
          '"Object name","Type","Object path"',
          '"plpgsql","Extensions","Extensions/plpgsql"',
          '"plpgsql_call_handler","Functions","PostgreSQL Catalog (pg_catalog)/Functions/plpgsql_call_handler"',
          '"plpgsql_inline_handler(internal)","Functions","PostgreSQL Catalog (pg_catalog)/Functions/plpgsql_inline_handler"',
          '"plpgsql_validator(oid)","Functions","PostgreSQL Catalog (pg_catalog)/Functions/plpgsql_validator"',
          '"plpgsql","Languages","Languages/plpgsql"',
          '"plp, ""odd""\nname","Extensions","Extensions/plp, ""odd""\nname"',
        ].join('\n'));
      } finally {
        pgAdmin.Browser.Nodes = origNodes;
      }
    });
  });
});
