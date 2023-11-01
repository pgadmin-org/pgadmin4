/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import url_for from 'sources/url_for';
import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import { withBrowser } from '../genericFunctions';
import DebuggerArgumentComponent from '../../../pgadmin/tools/debugger/static/js/components/DebuggerArgumentComponent';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import pgAdmin from 'sources/pgadmin';
import { TreeFake } from '../tree/tree_fake';

describe('Debugger Component', () => {
  let funcArgs;
  let networkMock;
  const MockDebuggerArgumentComponent = withBrowser(DebuggerArgumentComponent);

  beforeEach(() => {
    const div = document.createElement('div');
    div.id = 'debugger-main-container';
    document.body.appendChild(div);

    jest.mock('../../../pgadmin/tools/debugger/static/js/components/DebuggerArgumentComponent', ()=>MockDebuggerArgumentComponent);

    funcArgs = new FunctionArguments();
    networkMock = new MockAdapter(axios);
    pgAdmin.Browser.tree = new TreeFake(pgAdmin.Browser);
  });

  it('Debugger Args', async () => {
    networkMock.onGet(url_for('debugger.init', {'function': 1, 'schema': 1, 'database': 1, 'server': 1})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'debug_info':[{'name':'_test2','prosrc':'begin\nselect \'1\';\nend','lanname':'plpgsql','proretset':false,'prorettype':1043,'rettype':'varchar','proargtypenames':'date','proargtypes':'1082','proargnames':'test_date','proargmodes':null,'pkg':0,'pkgname':'','pkgconsoid':0,'schema':2200,'schemaname':'public','isfunc':true,'signature':'test_date date','proargdefaults':null,'pronargdefaults':0,'require_input':true}],'trans_id':'7165'}});

    let debugInfo = {
      'name': '_test2',
      'prosrc': 'begin\nselect \'1\';\nend',
      'lanname': 'plpgsql',
      'proretset': false,
      'prorettype': 1043,
      'rettype': 'varchar',
      'proargtypenames': 'date',
      'proargtypes': '1082',
      'proargnames': 'test_date',
      'proargmodes': null,
      'pkg': 0,
      'pkgname': '',
      'pkgconsoid': 0,
      'schema': 2200,
      'schemaname': 'public',
      'isfunc': true,
      'signature': 'test_date date',
      'proargdefaults': null,
      'pronargdefaults': 0,
      'require_input': true,
    };
    funcArgs.show(debugInfo, 0, false, '123');
  });
});

