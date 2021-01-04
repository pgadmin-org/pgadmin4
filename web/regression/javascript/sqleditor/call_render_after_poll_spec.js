/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {callRenderAfterPoll} from '../../../pgadmin/static/js/sqleditor/call_render_after_poll';
import moment from 'moment';

describe('#callRenderAfterPoll', () => {
  let sqlEditorSpy, queryResult, alertify;
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
      query_start_time: new Date(),
    };
    alertify = jasmine.createSpyObj('alertify', ['success']);
  });

  afterEach(function () {
    jasmine.clock().uninstall();
  });

  describe('it is not a query tool', () => {
    beforeEach(() => {
      sqlEditorSpy.is_query_tool = false;
    });

    describe('query was successful and have results', () => {
      beforeEach(() => {
        queryResult = {
          rows_affected: 10,
          has_more_rows: false,
          colinfo: {},
        };
      });

      it('renders the the editor', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy._render).toHaveBeenCalledWith(queryResult);
      });

      it('inform sqleditor that the query stopped running', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.setIsQueryRunning).toHaveBeenCalledWith(false);
      });

      it('hides the loading icon', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });
    });

    describe('query was successful but had no result to display', () => {
      beforeEach(() => {
        queryResult = {
          rows_affected: 10,
          has_more_rows: false,
          colinfo: undefined,
          result: 'Some result',
        };
      });

      it('saves execution information in the history', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.update_msg_history).toHaveBeenCalledWith(
          true,
          'Some result\n\nQuery returned successfully in 0 msec.',
          false
        );
      });

      it('resets the changed data store', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.reset_data_store).toHaveBeenCalled();
      });

      it('inform sqleditor that the query stopped running', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.setIsQueryRunning).toHaveBeenCalledWith(false);
      });

      it('hides the loading icon', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });

      describe('notifications are enabled', () => {
        it('display notification', () => {
          sqlEditorSpy.info_notifier_timeout = 10;
          callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

          expect(alertify.success).toHaveBeenCalledWith(
            'Query returned successfully in 0 msec.',
            10
          );
        });
      });

      it('disables the save results button', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.enable_disable_download_btn).toHaveBeenCalledWith(true);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });
    });
  });

  describe('it is a query tool', () => {
    beforeEach(() => {
      sqlEditorSpy.is_query_tool = true;
    });

    describe('query was successful and have results', () => {
      beforeEach(() => {
        queryResult = {
          rows_affected: 10,
          has_more_rows: false,
          colinfo: {},
        };
      });

      it('renders the the editor', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy._render).toHaveBeenCalledWith(queryResult);
      });

      it('inform sqleditor that the query stopped running', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.setIsQueryRunning).toHaveBeenCalledWith(false);
      });

      it('hides the loading icon', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });

      it('enables sqleditor tools buttons', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.disable_tool_buttons).toHaveBeenCalledWith(false);
      });
    });

    describe('query was successful but had no result to display', () => {
      beforeEach(() => {
        queryResult = {
          rows_affected: 10,
          has_more_rows: false,
          colinfo: undefined,
          result: 'Some result',
        };
      });

      it('saves execution information in the history', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.update_msg_history).toHaveBeenCalledWith(
          true,
          'Some result\n\nQuery returned successfully in 0 msec.',
          false
        );
      });

      it('resets the changed data store', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.reset_data_store).toHaveBeenCalled();
      });

      it('inform sqleditor that the query stopped running', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.setIsQueryRunning).toHaveBeenCalledWith(false);
      });

      it('hides the loading icon', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });

      it('enables sqleditor tools buttons', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.disable_tool_buttons).toHaveBeenCalledWith(false);
      });

      describe('notifications are enabled', () => {
        it('display notification', () => {
          sqlEditorSpy.info_notifier_timeout = 10;
          callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

          expect(alertify.success).toHaveBeenCalledWith(
            'Query returned successfully in 0 msec.',
            10
          );
        });
      });

      it('disables the save results button', () => {
        callRenderAfterPoll(sqlEditorSpy, alertify, queryResult);

        expect(sqlEditorSpy.enable_disable_download_btn).toHaveBeenCalledWith(true);

        expect(sqlEditorSpy.trigger).toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
      });
    });
  });
});
