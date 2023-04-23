/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
window.jQuery = window.$ = $;

import 'wcdocker';
import '../helper/enzyme.helper';

import React from 'react';
import { createMount } from '@material-ui/core/test-utils';
import jasmineEnzyme from 'jasmine-enzyme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

import { messages } from '../fake_messages';
import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import Debugger from '../../../pgadmin/tools/debugger/static/js/DebuggerModule';
import { TreeFake } from '../tree/tree_fake';
import MockDebuggerComponent from './MockDebuggerComponent';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import { Stack } from '../../../pgadmin/tools/debugger/static/js/components/Stack';


describe('Debugger Stack', () => {
  let mount;
  let funcArgs;
  let debuggerInstance;
  let mountDOM;
  let tree;
  let params;
  let networkMock;
  let pref;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
    networkMock.restore();
  });

  afterEach(() => {
    networkMock.restore();
  });


  beforeEach(() => {
    jasmineEnzyme();
    // Element for mount wcDocker panel
    mountDOM = $('<div class="dockerContainer">');
    $(document.body).append(mountDOM);

    $(document.body).append($('<div id="debugger-main-container">'));

    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
    funcArgs = new FunctionArguments();
    debuggerInstance = new Debugger(pgAdmin, pgAdmin.Browser);
    pref = [
      {
        'id': 115,
        'cid': 13,
        'name': 'btn_step_into',
        'label': 'Accesskey (Step into)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 73,
            'char': 'i'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 116,
        'cid': 13,
        'name': 'btn_step_over',
        'label': 'Accesskey (Step over)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 79,
            'char': 'o'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      },
      {
        'id': 113,
        'cid': 13,
        'name': 'btn_start',
        'label': 'Accesskey (Continue/Start)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 67,
            'char': 'c'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 114,
        'cid': 13,
        'name': 'btn_stop',
        'label': 'Accesskey (Stop)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 83,
            'char': 's'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 117,
        'cid': 13,
        'name': 'btn_toggle_breakpoint',
        'label': 'Accesskey (Toggle breakpoint)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 84,
            'char': 't'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }, {
        'id': 118,
        'cid': 13,
        'name': 'btn_clear_breakpoints',
        'label': 'Accesskey (Clear all breakpoints)',
        'type': 'keyboardshortcut',
        'help_str': null,
        'control_props': {},
        'min_val': null,
        'max_val': null,
        'options': null,
        'select': null,
        'value': {
          'key': {
            'key_code': 88,
            'char': 'x'
          }
        },
        'fields': [
          {
            'name': 'key',
            'type': 'keyCode',
            'label': 'Key'
          }
        ],
        'disabled': false,
        'dependents': null,
        'mid': 83,
        'module': 'debugger',
      }

    ];

    pgAdmin.Browser.preferences_cache = pref;
    // eslint-disable-next-line
    let docker = new wcDocker(
      '.dockerContainer', {
        allowContextMenu: false,
        allowCollapse: false,
        loadingClass: 'pg-sp-icon',
      });

    tree = new TreeFake();
    pgAdmin.Browser.tree = tree;
    pgAdmin.Browser.docker = docker;

    params = {
      transId: 1234,
      directDebugger: debuggerInstance,
      funcArgsInstance: funcArgs
    };
    networkMock = new MockAdapter(axios);
  });

  it('Statck Init', () => {
    networkMock.onGet(url_for('debugger.select_frame', { 'trans_id': params.transId, 'frame_id': 3 })).reply(200, {'success':0,'errormsg':'','info':'','result':null,'data':{'status':true,'result':[{'func':3138947,'targetname':'_test()','linenumber':10,'src':'\nDECLARE\n    v_deptno          NUMERIC;\n    v_empno           NUMERIC;\n    v_ename           VARCHAR;\n    v_rows            INTEGER;\n    r_emp_query       EMP_QUERY_TYPE;\nBEGIN\n    v_deptno := 30;\n    v_empno := 0;\n    v_ename := \'Martin\';\n    r_emp_query := emp_query(v_deptno, v_empno, v_ename);\n    RAISE INFO \'Department : %\', v_deptno;\n    RAISE INFO \'Employee No: %\', (r_emp_query).empno;\n    RAISE INFO \'Name       : %\', (r_emp_query).ename;\n    RAISE INFO \'Job        : %\', (r_emp_query).job;\n    RAISE INFO \'Hire Date  : %\', (r_emp_query).hiredate;\n    RAISE INFO \'Salary     : %\', (r_emp_query).sal;\n    RETURN \'1\';\nEXCEPTION\n    WHEN OTHERS THEN\n        RAISE INFO \'The following is SQLERRM : %\', SQLERRM;\n        RAISE INFO \'The following is SQLSTATE: %\', SQLSTATE;\n        RETURN \'1\';\nEND;\n','args':''}]}});
    mount(
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

