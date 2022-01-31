/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {callRenderAfterPoll} from '../../../pgadmin/static/js/sqleditor/call_render_after_poll';
import moment from 'moment';

describe('#callRenderAfterPoll', () => {
  let sqlEditorSpy, queryResult, Notify;
  beforeEach(() => {
    let today = moment('2018-01-01 10:12:31').toDate();
    jasmine.clock().install();
    jasmine.clock().mockDate(today);
    sqlEditorSpy = {
      _render: jasmine.createSpy('SQLEditor._render'),
      setIsQueryRunning: jasmine.createSpy('SQLEditor.setIsQueryRunning'),
      trigger: jasmine.createSpy('SQLEditor.trigger'),
      update_msg_history: jasmine.createSpy('SQLEditor.update_msg_history'),
      disable_tool_buttons: jasmine.createSpy('SQLEditor.disable_tool_buttons'),
      disable_transaction_buttons: jasmine.createSpy('SQLEditor.disable_transaction_buttons'),
      reset_data_store: jasmine.createSpy('SQLEditor.reset_data_store'),
      enable_disable_download_btn: jasmine.createSpy('SQLEditor.enable_disable_download_btn'),
      check_db_name_change: jasmine.createSpy('SQLEditor.check_db_name_change'),
      query_start_time: new Date(),
    };
    Notify = jasmine.createSpyObj('Notify', ['success']);
  });

  afterEach(function () {
    jasmine.clock().uninstall();
  });

  let expectAction = (expectObj, callWithValue=null)=> {
    callRenderAfterPoll(sqlEditorSpy, Notify, queryResult);
    if (callWithValue !== null) {
      expect(expectObj).toHaveBeenCalledWith(callWithValue);
    } else {
      expect(expectObj).toHaveBeenCalledWith();
    }
  };

  let queryResult1 = ()=>{
    queryResult = {
      rows_affected: 10,
      has_more_rows: false,
      colinfo: {},
    };
  };

  let queryResult2 = ()=>{
    queryResult = {
      rows_affected: 10,
      has_more_rows: false,
      colinfo: undefined,
      result: 'Some result',
    };
  };

  let displayNotificationAction = ()=> {
    sqlEditorSpy.info_notifier_timeout = 10;
    callRenderAfterPoll(sqlEditorSpy, Notify, queryResult);

    expect(Notify.success).toHaveBeenCalledWith(
      'Query returned successfully in 0 msec.',
      10
    );
  };

  let saveAction = ()=> {
    callRenderAfterPoll(sqlEditorSpy, Notify, queryResult);

    expect(sqlEditorSpy.update_msg_history).toHaveBeenCalledWith(
      true,
      'Some result\n\nQuery returned successfully in 0 msec.',
      false
    );
  };

  describe('it is not a query tool', () => {
    beforeEach(() => {
      sqlEditorSpy.is_query_tool = false;
    });

    describe('query was successful and have results', () => {
      beforeEach(queryResult1);

      it('renders the editor', () => {
        expectAction(sqlEditorSpy._render, queryResult);
      });

      it('inform sqleditor that the query stopped running', () => {
        expectAction(sqlEditorSpy.setIsQueryRunning, false);
      });

      it('hides the loading icon', () => {
        expectAction(sqlEditorSpy.trigger, 'pgadmin-sqleditor:loading-icon:hide');
      });
    });

    describe('query was successful but had no result to display', () => {
      beforeEach(queryResult2);

      it('saves execution information in the history', () => {
        saveAction();
      });

      it('resets the changed data store', () => {
        expectAction(sqlEditorSpy.reset_data_store);
      });

      it('inform sqleditor that the query stopped running', () => {
        expectAction(sqlEditorSpy.setIsQueryRunning, false);
      });

      it('hides the loading icon', () => {
        expectAction(sqlEditorSpy.trigger, 'pgadmin-sqleditor:loading-icon:hide');
      });

      describe('notifications are enabled', () => {
        it('display notification', displayNotificationAction);
      });

      it('disables the save results button', () => {
        expectAction(sqlEditorSpy.enable_disable_download_btn, true);
        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });
    });
  });

  describe('it is a query tool', () => {
    beforeEach(() => {
      sqlEditorSpy.is_query_tool = true;
    });

    describe('query was successful and have results', () => {
      beforeEach(queryResult1);

      it('renders the editor', () => {
        expectAction(sqlEditorSpy._render, queryResult);
      });

      it('inform sqleditor that the query stopped running', () => {
        expectAction(sqlEditorSpy.setIsQueryRunning, false);
      });

      it('hides the loading icon', () => {
        expectAction(sqlEditorSpy.trigger, 'pgadmin-sqleditor:loading-icon:hide');
      });

      it('enables sqleditor tools buttons', () => {
        expectAction(sqlEditorSpy.disable_tool_buttons, false);
      });
    });

    describe('query was successful but had no result to display', () => {
      beforeEach(queryResult2);

      it('saves execution information in the history', () => {
        saveAction();
      });

      it('resets the changed data store', () => {
        expectAction(sqlEditorSpy.reset_data_store);
      });

      it('inform sqleditor that the query stopped running', () => {
        expectAction(sqlEditorSpy.setIsQueryRunning, false);
      });

      it('hides the loading icon', () => {
        expectAction(sqlEditorSpy.trigger, 'pgadmin-sqleditor:loading-icon:hide');
      });

      it('enables sqleditor tools buttons', () => {
        expectAction(sqlEditorSpy.disable_tool_buttons, false);
      });

      describe('notifications are enabled', () => {
        it('display notification', displayNotificationAction);
      });

      it('disables the save results button', () => {
        expectAction(sqlEditorSpy.enable_disable_download_btn, true);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });

      it('check whether database has been moved/renamed', () => {
        callRenderAfterPoll(sqlEditorSpy, Notify, queryResult);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:check_synchronous_db_name_change', queryResult);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });
    });
  });
});
