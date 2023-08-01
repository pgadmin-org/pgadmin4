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
import axios from 'axios';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

import { messages } from '../fake_messages';
import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import Debugger from '../../../pgadmin/tools/debugger/static/js/DebuggerModule';
import { TreeFake } from '../tree/tree_fake';
import MockDebuggerComponent from './MockDebuggerComponent';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import { ToolBar } from '../../../pgadmin/tools/debugger/static/js/components/ToolBar';


describe('Debugger Toolbar', () => {
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

  it('Toolbar clearbreakpoints', () => {
    networkMock.onGet(url_for('debugger.clear_all_breakpoint', { 'trans_id': params.transId })).reply(200, { 'success': 1, 'errormsg': '', 'info': '', 'result': null, 'data': { 'status': true, 'result': 2 } });
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="clear-breakpoint"]').props().onClick();
  });

  it('Toolbar Stop Debugger', () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'abort_target'})).reply(200, {'success':1,'errormsg':'','info':'Debugging aborted successfully.','result':null,'data':{'status':'Success','result':{'columns':[{'name':'pldbg_abort_target','type_code':16,'display_size':null,'internal_size':1,'precision':null,'scale':null,'null_ok':null,'table_oid':null,'table_column':null,'display_name':'pldbg_abort_target'}],'rows':[{'pldbg_abort_target':true}]}}});
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="stop-debugger"]').props().onClick();
  });


  it('Toolbar Toggle Breakpoint', () => {
    networkMock.onGet(url_for('debugger.set_breakpoint', { 'trans_id': params.transId, 'line_no': '1', 'set_type': 1})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':[{'pldbg_set_breakpoint':true}]}});
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="toggle-breakpoint"]').props().onClick();
  });


  it('Toolbar StepIn', () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'step_into'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':1}});
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="step-in"]').props().onClick();
  });

  it('Toolbar StepOver', () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'step_over'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':1}});
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="step-over"]').props().onClick();
  });

  it('Toolbar Contiue', () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'continue'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':2}});
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="debugger-contiue"]').props().onClick();
  });

  it('Toolbar Help', () => {
    networkMock.onGet(url_for('help.static', {'filename': 'debugger.html'})).reply(200, {});
    let ctrl = mount(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pgAdmin.Browser.preferences_cache,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    ctrl.find('PgIconButton[data-test="debugger-help"]').props().onClick();
  });
});

