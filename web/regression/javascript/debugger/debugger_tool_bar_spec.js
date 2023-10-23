/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';

import FunctionArguments from '../../../pgadmin/tools/debugger/static/js/debugger_ui';
import Debugger from '../../../pgadmin/tools/debugger/static/js/DebuggerModule';
import MockDebuggerComponent from './MockDebuggerComponent';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import { ToolBar } from '../../../pgadmin/tools/debugger/static/js/components/ToolBar';
import usePreferences from '../../../pgadmin/preferences/static/js/store';


describe('Debugger Toolbar', () => {

  let funcArgs;
  let debuggerInstance;
  let params;
  let networkMock;
  let pref;


  afterEach(() => {
    networkMock.restore();
  });

  beforeEach(() => {


    const div = document.createElement('div');
    div.id = 'debugger-main-container';
    document.body.appendChild(div);


    funcArgs = new FunctionArguments();
    debuggerInstance = new Debugger(pgAdmin, pgAdmin.Browser);
    jest.spyOn(usePreferences.getState(), 'getPreferencesForModule').mockReturnValue({
      breadcrumbs_enable: true,
      breadcrumbs_show_comment: true,
    });
    pref = {
      debugger: {
        btn_step_into: {
          'key': {
            'key_code': 73,
            'char': 'i'
          }
        },
        btn_step_over: {
          'key': {
            'key_code': 79,
            'char': 'o'
          }
        },
        btn_start: {
          'key': {
            'key_code': 67,
            'char': 'c'
          }
        },
        btn_stop: {
          'key': {
            'key_code': 83,
            'char': 's'
          }
        },
        btn_toggle_breakpoint: {
          'key': {
            'key_code': 84,
            'char': 't'
          }
        },
        btn_clear_breakpoints: {
          'key': {
            'key_code': 88,
            'char': 'x'
          }
        },
      }
    };

    params = {
      transId: 1234,
      directDebugger: debuggerInstance,
      funcArgsInstance: funcArgs
    };
    networkMock = new MockAdapter(axios);
  });

  it('Toolbar clearbreakpoints', async () => {
    networkMock.onGet(url_for('debugger.clear_all_breakpoint', { 'trans_id': params.transId })).reply(200, { 'success': 1, 'errormsg': '', 'info': '', 'result': null, 'data': { 'status': true, 'result': 2 } });
    let ctrl = render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    const user = userEvent.setup();
    await user.click(ctrl.container.querySelector('[data-test="clear-breakpoint"]'));
  });

  it('Toolbar Stop Debugger', async () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'abort_target'})).reply(200, {'success':1,'errormsg':'','info':'Debugging aborted successfully.','result':null,'data':{'status':'Success','result':{'columns':[{'name':'pldbg_abort_target','type_code':16,'display_size':null,'internal_size':1,'precision':null,'scale':null,'null_ok':null,'table_oid':null,'table_column':null,'display_name':'pldbg_abort_target'}],'rows':[{'pldbg_abort_target':true}]}}});
    render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
  });


  it('Toolbar Toggle Breakpoint', async () => {
    networkMock.onGet(url_for('debugger.set_breakpoint', { 'trans_id': params.transId, 'line_no': '1', 'set_type': 1})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':[{'pldbg_set_breakpoint':true}]}});
    render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
  });


  it('Toolbar StepIn', async () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'step_into'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':1}});
    render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
  });

  it('Toolbar StepOver', async () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'step_over'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':1}});
    render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
  });

  it('Toolbar Continue', async () => {
    networkMock.onGet(url_for('debugger.execute_query', { 'trans_id': params.transId, 'query_type': 'continue'})).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':{'status':true,'result':2}});
    render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
  });

  it('Toolbar Help', async () => {
    networkMock.onGet(url_for('help.static', {'filename': 'debugger.html'})).reply(200, {});
    window.open = jest.fn();
    let ctrl = render(
      <MockDebuggerComponent value={{
        docker: '',
        api: networkMock,
        modal: {},
        params: params,
        preferences: pref,
      }}
      eventsvalue={new EventBus()}>
        <ToolBar></ToolBar>
      </MockDebuggerComponent>
    );
    const user = userEvent.setup();
    await user.click(ctrl.container.querySelector('[data-test="debugger-help"]'));
    window.open.mockClear();
  });
});

