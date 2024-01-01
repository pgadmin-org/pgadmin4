/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////



import React from 'react';
import { render } from '@testing-library/react';

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import Debugger from '../../../pgadmin/tools/debugger/static/js/DebuggerModule';
import MockDebuggerComponent from './MockDebuggerComponent';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import { Stack } from '../../../pgadmin/tools/debugger/static/js/components/Stack';


describe('Debugger Stack', () => {

  let funcArgs;
  let debuggerInstance;
  let params;
  let networkMock;

  afterEach(() => {
    networkMock.restore();
  });


  beforeEach(() => {
    const div = document.createElement('div');
    div.id = 'debugger-main-container';
    document.body.appendChild(div);

    funcArgs = new FunctionArguments();
    debuggerInstance = new Debugger(pgAdmin, pgAdmin.Browser);

    params = {
      transId: 1234,
      directDebugger: debuggerInstance,
      funcArgsInstance: funcArgs
    };
    networkMock = new MockAdapter(axios);
  });

  it('Statck Init', () => {
    networkMock.onGet(url_for('debugger.select_frame', { 'trans_id': params.transId, 'frame_id': 3 })).reply(200, {'success':0,'errormsg':'','info':'','result':null,'data':{'status':true,'result':[{'func':3138947,'targetname':'_test()','linenumber':10,'src':'\nDECLARE\n    v_deptno          NUMERIC;\n    v_empno           NUMERIC;\n    v_ename           VARCHAR;\n    v_rows            INTEGER;\n    r_emp_query       EMP_QUERY_TYPE;\nBEGIN\n    v_deptno := 30;\n    v_empno := 0;\n    v_ename := \'Martin\';\n    r_emp_query := emp_query(v_deptno, v_empno, v_ename);\n    RAISE INFO \'Department : %\', v_deptno;\n    RAISE INFO \'Employee No: %\', (r_emp_query).empno;\n    RAISE INFO \'Name       : %\', (r_emp_query).ename;\n    RAISE INFO \'Job        : %\', (r_emp_query).job;\n    RAISE INFO \'Hire Date  : %\', (r_emp_query).hiredate;\n    RAISE INFO \'Salary     : %\', (r_emp_query).sal;\n    RETURN \'1\';\nEXCEPTION\n    WHEN OTHERS THEN\n        RAISE INFO \'The following is SQLERRM : %\', SQLERRM;\n        RAISE INFO \'The following is SQLSTATE: %\', SQLSTATE;\n        RETURN \'1\';\nEND;\n','args':''}]}});
    render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <Stack></Stack>
      </MockDebuggerComponent>
    );
  });
});

