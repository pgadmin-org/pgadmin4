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
import 'bootstrap';
import 'wcdocker';
import '../helper/enzyme.helper';

import React from 'react';
import { createMount } from '@material-ui/core/test-utils';
import jasmineEnzyme from 'jasmine-enzyme';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

import { messages } from '../fake_messages';
import DebuggerComponent from '../../../pgadmin/tools/debugger/static/js/components/DebuggerComponent';
import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import Debugger from '../../../pgadmin/tools/debugger/static/js/DebuggerModule';
import {TreeFake} from '../tree/tree_fake';
import Theme from '../../../pgadmin/static/js/Theme';


describe('Debugger Component', () => {
  let mount;
  let funcArgs;
  let debuggerInstance;
  let nodeInfo;
  let mountDOM;
  let tree;
  let params;
  let networkMock;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
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
    nodeInfo = { parent: {} };
    pgAdmin.Browser.preferences_cache = [
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

  it('DebuggerInit Indirect', () => {
    params.directDebugger.debug_type = 1;
    networkMock.onPost(url_for('debugger.start_listener', {'trans_id': params.transId})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':2}});
    networkMock.onGet(url_for('debugger.messages', {'trans_id': params.transId})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':'Success','result':'10'}});
    networkMock.onGet(url_for('debugger.execute_query', {'trans_id': params.transId, 'query_type': 'get_stack_info'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':'Success','result':[{'level':0,'targetname':'_test()','func':3138947,'linenumber':9,'args':''}]}});
    networkMock.onGet(url_for('debugger.poll_result', {'trans_id': params.transId})).reply(200, {'success':0,'errormsg':'','info':'','result':null,'data':{'status':'Success','result':[{'pldbg_wait_for_target':28298}]}});
    let ctrl = mount(
      <Theme>
        <DebuggerComponent
          pgAdmin={pgAdmin}
          panel={document.getElementById('debugger-main-container')}
          selectedNodeInfo={nodeInfo}
          layout={''}
          params={params}
        >
        </DebuggerComponent>
      </Theme>
    );

    ctrl.find('PgIconButton[data-test="debugger-contiue"]').props().onClick();
  });
});

