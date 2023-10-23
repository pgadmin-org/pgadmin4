/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';
import { act, render } from '@testing-library/react';

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';


import DebuggerComponent from '../../../pgadmin/tools/debugger/static/js/components/DebuggerComponent';
import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import Debugger from '../../../pgadmin/tools/debugger/static/js/DebuggerModule';
import Theme from '../../../pgadmin/static/js/Theme';


describe('Debugger Component', () => {

  let funcArgs;
  let debuggerInstance;
  let nodeInfo;
  let params;
  let networkMock;

  beforeEach(() => {
    const div = document.createElement('div');
    div.id = 'debugger-main-container';
    document.body.appendChild(div);

    funcArgs = new FunctionArguments();
    debuggerInstance = new Debugger(pgAdmin, pgAdmin.Browser);
    nodeInfo = { parent: {} };

    params = {
      transId: 1234,
      directDebugger: debuggerInstance,
      funcArgsInstance: funcArgs
    };
    networkMock = new MockAdapter(axios);
  });

  it('DebuggerInit Indirect', async () => {
    params.directDebugger.debug_type = 1;
    networkMock.onPost(url_for('debugger.start_listener', {'trans_id': params.transId})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':2}});
    networkMock.onGet(url_for('debugger.messages', {'trans_id': params.transId})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':'Success','result':'10'}});
    networkMock.onGet(url_for('debugger.execute_query', {'trans_id': params.transId, 'query_type': 'get_stack_info'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':'Success','result':[{'level':0,'targetname':'_test()','func':3138947,'linenumber':9,'args':''}]}});
    networkMock.onGet(url_for('debugger.poll_result', {'trans_id': params.transId})).reply(200, {'success':0,'errormsg':'','info':'','result':null,'data':{'status':'Success','result':[{'pldbg_wait_for_target':28298}]}});
    await act(async () => {
      render(
        <Theme>
          <DebuggerComponent
            pgAdmin={pgAdmin}
            panel={document.getElementById('debugger-main-container')}
            selectedNodeInfo={nodeInfo}
            layout={''}
            params={params}
          />
        </Theme>
      );
    });
  });
});

