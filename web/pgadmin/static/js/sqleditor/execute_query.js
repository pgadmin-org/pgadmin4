//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import gettext from '../gettext';
import $ from 'jquery';
import url_for from '../url_for';
import axios from 'axios';
import * as httpErrorHandler from './query_tool_http_error_handler';
import * as queryTxnStatus from 'sources/sqleditor/query_txn_status_constants';

class LoadingScreen {
  constructor(sqlEditor) {
    this.sqlEditor = sqlEditor;
  }

  setMessage(message) {
    this.sqlEditor.trigger(
      'pgadmin-sqleditor:loading-icon:message',
      gettext(message)
    );
  }

  show(withMessage) {
    this.sqlEditor.trigger(
      'pgadmin-sqleditor:loading-icon:show',
      withMessage
    );
  }

  hide() {
    this.sqlEditor.trigger('pgadmin-sqleditor:loading-icon:hide');
  }
}

class ExecuteQuery {
  constructor(sqlEditor, userManagement) {
    this.sqlServerObject = sqlEditor;
    this.loadingScreen = new LoadingScreen(sqlEditor);
    this.userManagement = userManagement;
  }

  delayedPoll() {
    const self = this;
    setTimeout(
      () => {
        self.poll();
      }, self.sqlServerObject.POLL_FALLBACK_TIME());
  }

  execute(sqlStatement, explainPlan, connect) {
    // If it is an empty query, do nothing.
    if (sqlStatement.length <= 0) return;

    const self = this;
    self.explainPlan = explainPlan;

    const sqlStatementWithAnalyze = ExecuteQuery.prepareAnalyzeSql(sqlStatement, explainPlan);

    self.initializeExecutionOnSqlEditor(sqlStatementWithAnalyze);
    axios.post(
      this.generateURLReconnectionFlag(connect),
      JSON.stringify(sqlStatementWithAnalyze),
      {headers: {'Content-Type': 'application/json'}})
      .then(function (result) {
        let httpMessageData = result.data;
        self.removeGridViewMarker();

        self.updateSqlEditorLastTransactionStatus(httpMessageData.data.transaction_status);

        if (ExecuteQuery.isSqlCorrect(httpMessageData)) {
          self.loadingScreen.setMessage('Waiting for the query to complete...');

          self.updateSqlEditorStateWithInformationFromServer(httpMessageData.data);

          // If status is True then poll the result.
          self.delayedPoll();
        } else {
          self.loadingScreen.hide();
          self.enableSQLEditorButtons();
          // Enable/Disable commit and rollback button.
          if (result.data.data.transaction_status == queryTxnStatus.TRANSACTION_STATUS_INTRANS
            || result.data.data.transaction_status == queryTxnStatus.TRANSACTION_STATUS_INERROR) {
            self.enableTransactionButtons();
          } else {
            self.disableTransactionButtons();
          }
          self.sqlServerObject.update_msg_history(false, httpMessageData.data.result);
          if ('notifies' in httpMessageData.data)
            self.sqlServerObject.update_notifications(httpMessageData.data.notifies);

          // Highlight the error in the sql panel
          self.sqlServerObject._highlight_error(httpMessageData.data.result);
        }
      }).catch(function (error) {
        self.onExecuteHTTPError(error);
      }
      );
  }

  generateURLReconnectionFlag(shouldReconnect) {
    let url = url_for('sqleditor.query_tool_start', {
      'trans_id': this.sqlServerObject.transId,
    });

    if (shouldReconnect) {
      url += '?connect=1';
    }
    return url;
  }

  poll() {
    const self = this;
    axios.get(
      url_for('sqleditor.poll', {
        'trans_id': self.sqlServerObject.transId,
      })
    ).then(
      (httpMessage) => {
        self.updateSqlEditorLastTransactionStatus(httpMessage.data.data.transaction_status);

        // Enable/Disable commit and rollback button.
        if (httpMessage.data.data.transaction_status == queryTxnStatus.TRANSACTION_STATUS_INTRANS
          || httpMessage.data.data.transaction_status == queryTxnStatus.TRANSACTION_STATUS_INERROR) {
          self.enableTransactionButtons();
        } else {
          self.disableTransactionButtons();
        }

        if (ExecuteQuery.isQueryFinished(httpMessage)) {
          if (this.sqlServerObject.close_on_idle_transaction &&
              httpMessage.data.data.transaction_status == queryTxnStatus.TRANSACTION_STATUS_IDLE)
            this.sqlServerObject.check_needed_confirmations_before_closing_panel();

          self.loadingScreen.setMessage('Loading data from the database server and rendering...');

          self.sqlServerObject.call_render_after_poll(httpMessage.data.data);
          if ('notifies' in httpMessage.data.data)
            self.sqlServerObject.update_notifications(httpMessage.data.data.notifies);
        } else if (ExecuteQuery.isQueryStillRunning(httpMessage)) {
          // If status is Busy then poll the result by recursive call to the poll function
          this.delayedPoll();
          self.sqlServerObject.setIsQueryRunning(true);
          if (httpMessage.data.data.result) {
            self.sqlServerObject.update_msg_history(httpMessage.data.data.status, httpMessage.data.data.result, false);
          }
        } else if (ExecuteQuery.isConnectionToServerLostWhilePolling(httpMessage)) {
          self.loadingScreen.hide();
          // Enable/Disable query tool button only if is_query_tool is true.
          if (self.sqlServerObject.is_query_tool) {
            self.enableSQLEditorButtons();
          }
          self.sqlServerObject.update_msg_history(false, httpMessage.data.data.result, true);
        } else if (ExecuteQuery.isQueryCancelled(httpMessage)) {
          self.loadingScreen.hide();
          self.sqlServerObject.update_msg_history(false, 'Execution Cancelled!', true);
        }
      }
    ).catch(
      error => {
        // Enable/Disable query tool button only if is_query_tool is true.
        self.sqlServerObject.resetQueryHistoryObject(self.sqlServerObject);

        self.loadingScreen.hide();
        self.sqlServerObject.setIsQueryRunning(false);
        if (self.sqlServerObject.is_query_tool) {
          self.enableSQLEditorButtons();
        }

        if(error.response) {
          if(ExecuteQuery.wasConnectionLostToPythonServer(error.response)) {
            self.handleConnectionToServerLost();
            return;
          }
          const errorData = error.response.data;

          if (self.userManagement.isPgaLoginRequired(errorData)) {
            return self.userManagement.pgaLogin();
          }

          let msg = ExecuteQuery.extractErrorMessage(errorData);

          self.sqlServerObject.update_msg_history(false, msg);
          // Highlight the error in the sql panel
          self.sqlServerObject._highlight_error(msg);
        } else if(error.request) {
          self.handleConnectionToServerLost();
          return;
        } else {
          console.error(error);
        }
      });
  }

  initializeExecutionOnSqlEditor(sqlStatement) {
    this.loadingScreen.show(gettext('Running query...'));

    $('#btn-flash').prop('disabled', true);
    $('#btn-download').prop('disabled', true);

    this.sqlServerObject.query_start_time = new Date();
    if (typeof sqlStatement === 'object') {
      this.sqlServerObject.query = sqlStatement['sql'];
    } else {
      this.sqlServerObject.query = sqlStatement;
    }

    this.sqlServerObject.rows_affected = 0;
    this.sqlServerObject._init_polling_flags();
    this.disableSQLEditorButtons();
    this.disableTransactionButtons();
  }

  static prepareAnalyzeSql(sqlStatement, analyzeSql) {
    let sqlStatementWithAnalyze = {
      sql: sqlStatement,
      explain_plan: analyzeSql,
    };
    return sqlStatementWithAnalyze;
  }

  onExecuteHTTPError(httpMessage) {
    this.loadingScreen.hide();
    this.enableSQLEditorButtons();

    if (ExecuteQuery.wasConnectionLostToPythonServer(httpMessage.response)) {
      this.handleConnectionToServerLost();
      return;
    }

    if (this.userManagement.isPgaLoginRequired(httpMessage.response)) {
      this.sqlServerObject.saveState('check_data_changes_to_execute_query', [this.explainPlan]);
      this.userManagement.pgaLogin();
    }

    if (httpErrorHandler.httpResponseRequiresNewTransaction(httpMessage.response)) {
      this.sqlServerObject.saveState('check_data_changes_to_execute_query', [this.explainPlan]);
      this.sqlServerObject.initTransaction();
    }

    if (this.wasDatabaseConnectionLost(httpMessage)) {
      this.sqlServerObject.saveState('check_data_changes_to_execute_query', [this.explainPlan]);
      this.sqlServerObject.handle_connection_lost(false, httpMessage);
    }

    if(this.isCryptKeyMissing(httpMessage)) {
      this.sqlServerObject.saveState('check_data_changes_to_execute_query', [this.explainPlan]);
      this.sqlServerObject.handle_cryptkey_missing();
      return;
    }

    let msg = httpMessage.response.data.errormsg;
    this.sqlServerObject.update_msg_history(false, msg);
  }

  wasDatabaseConnectionLost(httpMessage) {
    return httpMessage.response.status === 503 &&
      httpMessage.response.data.info !== undefined &&
      httpMessage.response.data.info === 'CONNECTION_LOST';
  }

  isCryptKeyMissing(httpMessage) {
    return httpMessage.response.status === 503 &&
      httpMessage.response.data.info !== undefined &&
      httpMessage.response.data.info === 'CRYPTKEY_MISSING';
  }

  removeGridViewMarker() {
    if (this.sqlServerObject.gridView.marker) {
      this.sqlServerObject.gridView.marker.clear();
      delete this.sqlServerObject.gridView.marker;
      this.sqlServerObject.gridView.marker = null;

      // Remove already existing marker
      this.sqlServerObject.gridView.query_tool_obj.removeLineClass(this.sqlServerObject.marked_line_no, 'wrap', 'CodeMirror-activeline-background');
    }
  }

  enableSQLEditorButtons() {
    this.sqlServerObject.disable_tool_buttons(false);
  }

  disableSQLEditorButtons() {
    this.sqlServerObject.disable_tool_buttons(true);
  }

  enableTransactionButtons() {
    this.sqlServerObject.disable_transaction_buttons(false);
  }

  disableTransactionButtons() {
    this.sqlServerObject.special_sql = undefined;
    this.sqlServerObject.disable_transaction_buttons(true);
  }

  static wasConnectionLostToPythonServer(httpResponse) {
    return _.isUndefined(httpResponse) || _.isUndefined(httpResponse.data);
  }

  handleConnectionToServerLost() {
    this.sqlServerObject.update_msg_history(false,
      gettext('Not connected to the server or the connection to the server has been closed.')
    );
  }

  updateSqlEditorStateWithInformationFromServer(messageData) {
    this.sqlServerObject.can_edit = messageData.can_edit;
    this.sqlServerObject.can_filter = messageData.can_filter;
    this.sqlServerObject.info_notifier_timeout = messageData.info_notifier_timeout;
  }

  updateSqlEditorLastTransactionStatus(transactionStatus) {
    this.sqlServerObject.last_transaction_status = transactionStatus;
  }

  static isSqlCorrect(httpMessageData) {
    return httpMessageData.data.status;
  }

  static extractErrorMessage(httpMessage) {
    let msg = httpMessage.errormsg;
    if (httpMessage.responseJSON !== undefined &&
      httpMessage.responseJSON.errormsg !== undefined)
      msg = httpMessage.responseJSON.errormsg;

    return msg;
  }

  static isQueryFinished(httpMessage) {
    return httpMessage.data.data.status === 'Success';
  }

  static isQueryStillRunning(httpMessage) {
    return httpMessage.data.data.status === 'Busy';
  }

  static isQueryCancelled(httpMessage) {
    return httpMessage.data.data.status === 'Cancel';
  }

  static isConnectionToServerLostWhilePolling(httpMessage) {
    return httpMessage.data.data.status === 'NotConnected';
  }
}

module.exports = {
  ExecuteQuery: ExecuteQuery,
};
