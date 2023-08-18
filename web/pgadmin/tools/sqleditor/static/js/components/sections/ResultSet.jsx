/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import React, { useContext, useEffect, useRef, useState }  from 'react';
import QueryToolDataGrid, { GRID_ROW_SELECT_KEY } from '../QueryToolDataGrid';
import {CONNECTION_STATUS, PANELS, QUERY_TOOL_EVENTS} from '../QueryToolConstants';
import url_for from 'sources/url_for';
import getApiInstance, { parseApiError } from '../../../../../../static/js/api_instance';
import { QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import gettext from 'sources/gettext';
import Loader from 'sources/components/Loader';
import { Box } from '@material-ui/core';
import { ResultSetToolbar } from './ResultSetToolbar';
import { LayoutHelper } from '../../../../../../static/js/helpers/Layout';
import { GeometryViewer } from './GeometryViewer';
import Explain from '../../../../../../static/js/Explain';
import Notifier from '../../../../../../static/js/helpers/Notifier';
import { QuerySources } from './QueryHistory';
import { getBrowser } from '../../../../../../static/js/utils';
import CopyData from '../QueryToolDataGrid/CopyData';
import moment from 'moment';
import ConfirmSaveContent from '../../../../../../static/js/Dialogs/ConfirmSaveContent';
import { makeStyles } from '@material-ui/styles';
import EmptyPanelMessage from '../../../../../../static/js/components/EmptyPanelMessage';
import { GraphVisualiser } from './GraphVisualiser';

export class ResultSetUtils {
  constructor(api, transId, isQueryTool=true) {
    this.api = api;
    this.transId = transId;
    this.startTime = new Date();
    this.clientPK = null;
    this.isQueryTool = isQueryTool;
    this.clientPKLastIndex = 0;
    this.historyQuerySource = null;
  }

  static generateURLReconnectionFlag(baseUrl, transId, shouldReconnect) {
    let url = url_for(baseUrl, {
      'trans_id': transId,
    });

    if (shouldReconnect) {
      url += '?connect=1';
    }
    return url;
  }

  static prepareAnalyzeSql(sqlStatement, analyzeSql) {
    return {
      sql: sqlStatement,
      explain_plan: analyzeSql,
    };
  }

  static wasConnectionLostToPythonServer(httpResponse) {
    return _.isUndefined(httpResponse) || _.isUndefined(httpResponse.data);
  }

  static wasDatabaseConnectionLost(httpMessage) {
    return httpMessage.response.status === 503 &&
      httpMessage.response.data.info !== undefined &&
      httpMessage.response.data.info === 'CONNECTION_LOST';
  }

  static isCryptKeyMissing(httpMessage) {
    return httpMessage.response.status === 503 &&
      httpMessage.response.data.info !== undefined &&
      httpMessage.response.data.info === 'CRYPTKEY_MISSING';
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

  setStartTime(start) {
    this.startTime = start;
  }

  setEndTime(end) {
    this.endTime = end;
  }

  queryRunTime() {
    let total_ms = moment(this.endTime).diff(this.startTime);
    let result = '';
    let secs, mins, hrs;

    /* Extract seconds from millisecs */
    secs = parseInt(total_ms/1000);
    total_ms = total_ms%1000;

    /* Extract mins from seconds */
    mins = parseInt(secs/60);
    secs = secs%60;

    /* Extract hrs from mins */
    hrs = parseInt(mins/60);
    mins = mins%60;

    result = (hrs>0 ? hrs + ' ' + gettext('hr') + ' ': '')
            + (mins>0 ? mins + ' ' + gettext('min') + ' ': '')
            + (hrs<=0 && secs>0 ? secs + ' ' + gettext('secs') + ' ': '')
            + (hrs<=0 && mins<=0 ? total_ms + ' ' + gettext('msec') + ' ':'');
    return result.trim();
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  setQtPref(pref) {
    this.qtPref = pref;
  }

  setStartData(data) {
    this.startData = data;
  }

  resetClientPKIndex() {
    this.clientPKLastIndex = 0;
  }

  setClientPK(clientPK) {
    this.clientPK = clientPK || GRID_ROW_SELECT_KEY;
  }

  hasResultsToDisplay(res) {
    return res.colinfo != null;
  }

  isAtBottom({ currentTarget }) {
    return currentTarget.scrollTop + 10 >= currentTarget.scrollHeight - currentTarget.clientHeight;
  }

  postExecutionApi(query, explainObject, isQueryTool=true, reconnect=false) {
    if(isQueryTool) {
      return this.api.post(
        ResultSetUtils.generateURLReconnectionFlag('sqleditor.query_tool_start', this.transId, reconnect),
        JSON.stringify({
          sql: query,
          explain_plan: explainObject,
        })
      );
    } else {
      return this.api.get(
        ResultSetUtils.generateURLReconnectionFlag('sqleditor.view_data_start', this.transId, reconnect)
      );
    }
  }

  async startExecution(query, explainObject, onIncorrectSQL, flags={
    isQueryTool: true, external: false, reconnect: false,
  }) {
    let startTime = new Date();
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, '');
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.TASK_START, gettext('Waiting for the query to complete...'), startTime);
    this.setStartTime(startTime);
    this.query = query;
    this.historyQuerySource = flags.isQueryTool ? QuerySources.EXECUTE : QuerySources.VIEW_DATA;
    if(explainObject) {
      if(explainObject.analyze) {
        this.historyQuerySource = QuerySources.EXPLAIN_ANALYZE;
      } else {
        this.historyQuerySource = QuerySources.EXPLAIN;
      }
    } else if(query == 'COMMIT;') {
      this.historyQuerySource = QuerySources.COMMIT;
    } else if(query == 'ROLLBACK;') {
      this.historyQuerySource = QuerySources.ROLLBACK;
    }
    try {
      let {data: httpMessageData} = await this.postExecutionApi(query, explainObject, flags.isQueryTool, flags.reconnect);
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, httpMessageData.data.transaction_status);

      if (ResultSetUtils.isSqlCorrect(httpMessageData)) {
        this.setStartData(httpMessageData.data);
        if(!flags.isQueryTool) {
          this.query = httpMessageData.data.sql;
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_FILTER_INFO, httpMessageData.data.can_filter, httpMessageData.data.filter_applied);
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_LIMIT_VALUE, httpMessageData.data.limit);
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, httpMessageData.data.sql, false);
        }
        if(httpMessageData.data.notifies) {
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.PUSH_NOTICE, httpMessageData.data.notifies);
        }
        return true;
      } else {
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, httpMessageData.data.result);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.MESSAGES);
        onIncorrectSQL();
        this.resetClientPKIndex();
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.PUSH_HISTORY, {
          status: false,
          start_time: this.startTime,
          query: this.query,
          row_affected: null,
          total_time: null,
          message: httpMessageData.data.result,
          query_source: this.historyQuerySource,
          is_pgadmin_query: false,
        });
        if(!flags.external) {
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.HIGHLIGHT_ERROR, httpMessageData.data.result);
        }
      }
    } catch(e) {
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR,
        e,
        {
          connectionLostCallback: ()=>{
            this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, query, explainObject, flags.external, true);
          },
          checkTransaction: true,
        }
      );
    }
    return false;
  }

  poll() {
    let delay = 1;
    let seconds = parseInt((Date.now() - this.startTime.getTime()) / 1000);
    // calculate & return fall back polling timeout
    if (seconds >= 10 && seconds < 30) {
      delay = 500;
    } else if (seconds >= 30 && seconds < 60) {
      delay = 1000;
    } else if (seconds >= 60 && seconds < 90) {
      delay = 2000;
    } else if (seconds >= 90) {
      delay = 5000;
    } else {
      delay = 1;
    }

    return new Promise((resolve)=>{
      setTimeout(() => {
        resolve(this.api.get(
          url_for('sqleditor.poll', {
            'trans_id': this.transId,
          })
        ));
      }, delay);
    });
  }

  handlePollError(error, explainObject, flags) {
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.MESSAGES);
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, CONNECTION_STATUS.TRANSACTION_STATUS_INERROR);
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.PUSH_HISTORY, {
      status: false,
      start_time: this.startTime,
      query: this.query,
      row_affected: null,
      total_time: this.queryRunTime(),
      message: parseApiError(error, false),
      query_source: this.historyQuerySource,
      is_pgadmin_query: false,
    });
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, error, {
      connectionLostCallback: ()=>{
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, this.query, explainObject, flags.external, true);
      },
      checkTransaction: true,
    });
  }

  async pollForResult(onResultsAvailable, onExplain, onPollError, explainObject, flags) {
    try {
      let httpMessage = await this.poll();
      let msg = '';
      if(httpMessage.data.data.notifies) {
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.PUSH_NOTICE, httpMessage.data.data.notifies);
      }

      if (ResultSetUtils.isQueryFinished(httpMessage)) {
        this.setEndTime(new Date());
        msg = this.queryFinished(httpMessage, onResultsAvailable, onExplain);
      } else if (ResultSetUtils.isQueryStillRunning(httpMessage)) {
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, httpMessage.data.data.transaction_status);
        if(httpMessage.data.data.result) {
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, httpMessage.data.data.result, true);
        }
        return Promise.resolve(this.pollForResult(onResultsAvailable, onExplain, onPollError, explainObject, flags));
      } else if (ResultSetUtils.isConnectionToServerLostWhilePolling(httpMessage)) {
        this.setEndTime(new Date());
        msg = httpMessage.data.data.result;
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, msg, true);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.TASK_END, gettext('Connection Error'), this.endTime);
      } else if (ResultSetUtils.isQueryCancelled(httpMessage)) {
        this.setEndTime(new Date());
        msg = httpMessage.data.data.result || gettext('Execution Cancelled!');
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, httpMessage.data.data.result || gettext('Execution Cancelled!'), true);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.TASK_END, gettext('Execution Cancelled'), this.endTime);
      }
      if(this.qtPref?.query_success_notification) {
        Notifier.success(msg);
      }
      if(!ResultSetUtils.isQueryStillRunning(httpMessage)) {
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.PUSH_HISTORY, {
          status: true,
          start_time: this.startTime,
          query: this.query,
          row_affected: httpMessage.data.data?.rows_affected,
          total_time: this.queryRunTime(),
          message: msg,
          query_source: this.historyQuerySource,
          is_pgadmin_query: false,
        });
      }
    } catch (error) {
      onPollError();
      this.handlePollError(error, explainObject, flags);
    }
  }

  getMoreRows(all=false) {
    let url = url_for('sqleditor.fetch', {
      'trans_id': this.transId,
    });
    if(all) {
      url = url_for('sqleditor.fetch_all', {
        'trans_id': this.transId,
        'fetch_all': 1,
      });
    }
    return this.api.get(url);
  }

  stopExecution() {
    return this.api.post(
      url_for('sqleditor.cancel_transaction', {'trans_id': this.transId})
    );
  }

  saveData(reqData) {
    return this.api.post(
      url_for('sqleditor.save', {
        'trans_id': this.transId
      }),
      JSON.stringify(reqData)
    );
  }

  async saveResultsToFile(fileName) {
    try {
      let {data: respData} = await this.api.post(
        url_for('sqleditor.query_tool_download', {
          'trans_id': this.transId,
        }),
        {filename: fileName}
      );

      if(!_.isUndefined(respData.data)) {
        if(!respData.status) {
          this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, respData.data.result);
        }
      } else {
        let respBlob = new Blob([respData], {type : 'text/csv'}),
          urlCreator = window.URL || window.webkitURL,
          download_url = urlCreator.createObjectURL(respBlob),
          link = document.createElement('a');

        document.body.appendChild(link);

        if (getBrowser() == 'IE' && window.navigator.msSaveBlob) {
        // IE10+ : (has Blob, but not a[download] or URL)
          window.navigator.msSaveBlob(respBlob, fileName);
        } else {
          link.setAttribute('href', download_url);
          link.setAttribute('download', fileName);
          link.click();
        }
        document.body.removeChild(link);
      }
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_RESULTS_END);
    } catch (error) {
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_RESULTS_END);
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, error);
    }
  }

  includeFilter(reqData) {
    return this.api.post(
      url_for('sqleditor.inclusive_filter', {
        'trans_id': this.transId,
      }),
      JSON.stringify(reqData)
    );
  }

  excludeFilter(reqData) {
    return this.api.post(
      url_for('sqleditor.exclusive_filter', {
        'trans_id': this.transId,
      }),
      JSON.stringify(reqData)
    );
  }

  removeFilter() {
    return this.api.post(
      url_for('sqleditor.remove_filter', {
        'trans_id': this.transId,
      })
    );
  }

  setLimit(limit) {
    return this.api.post(
      url_for('sqleditor.set_limit', {
        'trans_id': this.transId,
      }), JSON.stringify(parseInt(limit))
    );
  }

  getFinalColumn(c, isEditable, isPK, pgTypesOidMap) {
    let columnTypeInternal = pgTypesOidMap[c.type_code] || 'unknown';
    let columnType = (isPK ? '[PK] ' : '') + columnTypeInternal;
    let cellType;

    if (c.precision && c.precision >= 0 && c.precision != 65535) {
      columnType += ' (' + c.precision;
      columnType += c.scale && c.scale != 65535 ?
        ',' + c.scale + ')' :
        ')';
    }
    // Identify cell type of column.
    switch (columnTypeInternal) {
    case 'oid':
      cellType = 'oid';
      break;
    case 'json':
    case 'json[]':
    case 'jsonb':
    case 'jsonb[]':
      cellType = 'Json';
      break;
    case 'smallint':
    case 'smallint[]':
    case 'integer':
    case 'integer[]':
    case 'bigint':
    case 'bigint[]':
    case 'decimal':
    case 'decimal[]':
    case 'numeric':
    case 'numeric[]':
    case 'real':
    case 'real[]':
    case 'double precision':
    case 'double precision[]':
      cellType = 'number';
      break;
    case 'boolean':
      cellType = 'boolean';
      break;
    case 'character':
    case 'character[]':
    case '"char"':
    case '"char"[]':
    case 'character varying':
    case 'character varying[]':
      if (c.display_size && c.display_size >= 0 && c.display_size != 65535) {
        // Update column type to display length on column header
        columnType += ' (' + c.display_size + ')';
      }
      cellType = 'string';
      break;
    case 'bytea':
    case 'bytea[]':
      cellType = 'binary';
      break;
    case 'geometry':
      // PostGIS geometry type
      cellType = 'geometry';
      isEditable = false;
      break;
    case 'geography':
      // PostGIS geography type
      cellType = 'geography';
      isEditable = false;
      break;
    default:
      cellType = 'string';
    }

    let arrayBracketIdx = columnTypeInternal.lastIndexOf('[]');
    return {
      'key': c.name,
      'name': c.name,
      'display_name': c.display_name,
      'type': columnTypeInternal,
      'display_type': columnType,
      'column_type_internal': columnTypeInternal,
      'pos': c.pos,
      'cell': cellType,
      'can_edit': (c.name == 'oid') ? false : isEditable,
      'not_null': c.not_null,
      'has_default_val': c.has_default_val,
      'is_array': arrayBracketIdx > -1 && arrayBracketIdx + 2 == columnTypeInternal.length,
      'seqtypid': c.seqtypid,
      'isPK': isPK
    };
  }

  processColumns(data) {
    let columns = [];
    let self = this;

    let pgTypesOidMap = {};
    _.isArray(data.types) && data.types?.forEach((t)=>{
      pgTypesOidMap[t.oid] = t.typname;
    });

    // Create columns
    data.colinfo.forEach(function(c) {
      let isPK = false,
        isEditable = data.can_edit && (!self.isQueryTool || c.is_editable);

      // Check whether this column is a primary key
      if (isEditable) {
        isPK = _.some(data.primary_keys||[], (_v, key)=>key === c.name);
      }

      // Create column label and type.
      columns.push(self.getFinalColumn(c, isEditable, isPK, pgTypesOidMap));
    });

    return columns;
  }

  processClipboardVal(columnVal, col, rawCopiedVal, pasteSerials) {
    if(columnVal === '' ) {
      if(col.has_default_val) {
        // if column has default value
        columnVal = undefined;
      } else if(rawCopiedVal === null) {
        columnVal = null;
      }
    } else if (col.has_default_val && col.seqtypid && !pasteSerials) {
      // if column has default value and is serial type
      columnVal = undefined;
    }

    if(col.cell === 'boolean') {
      if(columnVal == 'true') {
        columnVal = true;
      } else if(columnVal == 'false') {
        columnVal = false;
      } else if(col.has_default_val) {
        columnVal = undefined;
      } else {
        columnVal = null;
      }
    }
    return columnVal;
  }

  processRows(result, columns, fromClipboard=false, pasteSerials=false) {
    let retVal = [];
    if(!_.isArray(result) || !_.size(result)) {
      return retVal;
    }
    let copiedRowsObjects = [];
    try {
      /* If the raw row objects are available, use to them identify null values */
      copiedRowsObjects = JSON.parse(localStorage.getItem('copied-rows'));
    } catch {/* Suppress the error */}
    for(const [recIdx, rec] of result?.entries()??[]) {
      // Convert 2darray to dict.
      let rowObj = {};
      for(const col of columns) {
        let columnVal = rec[col.pos];
        /* If the source is clipboard, then it needs some extra handling */
        if(fromClipboard) {
          columnVal = this.processClipboardVal(columnVal, col, copiedRowsObjects[recIdx]?.[col.key], pasteSerials);
        }
        rowObj[col.key] = columnVal;
      }
      /* This will used for uniquely identifying selected rows */
      rowObj[this.clientPK] = this.clientPKLastIndex.toString();
      retVal.push(rowObj);
      this.clientPKLastIndex++;
    }
    return retVal;
  }

  getPlanJson(result, data) {
    if(result && !_.isEmpty(data.colinfo)
      && data.colinfo[0].name == 'QUERY PLAN' && !_.isEmpty(data.types)
      && data.types[0] && data.types[0].typname === 'json') {
      /* json is sent as text, parse it */
      let planJson = JSON.parse(data.result[0][0]);
      if (planJson && planJson[0] && planJson[0].hasOwnProperty('Plan') &&
            _.isObject(planJson[0]['Plan'])
      ) {
        return planJson;
      }
    }
    return null;
  }

  queryFinished(httpMessage, onResultsAvailable, onExplain) {
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END, true);
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, httpMessage.data.data.transaction_status);
    this.eventBus.fireEvent(QUERY_TOOL_EVENTS.TASK_END, gettext('Query complete'), this.endTime);

    let retMsg, tabMsg;
    retMsg = tabMsg = gettext('Query returned successfully in %s.', this.queryRunTime());
    if(this.hasResultsToDisplay(httpMessage.data.data)) {
      let msg1 = gettext('Successfully run. Total query runtime: %s.', this.queryRunTime());
      let msg2 = gettext('%s rows affected.', httpMessage.data.data?.rows_affected);
      retMsg = msg1 + ' ' + msg2;
      tabMsg = msg1 + '\n' + msg2;
      if(!_.isNull(httpMessage.data.data.additional_messages)){
        tabMsg = httpMessage.data.data.additional_messages + '\n' + tabMsg;
      }
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, tabMsg, true);
      this.setClientPK(httpMessage.data.data.client_primary_key);
      let {result} = httpMessage.data.data;
      let data = {
        ...this.startData,
        ...httpMessage.data.data,
      };
      data.primary_keys = (_.isEmpty(data.primary_keys) && data.has_oids) ? data.oids : data.primary_keys;
      data.can_edit = !_.isEmpty(data.primary_keys);
      let procColumns = this.processColumns(data);
      onResultsAvailable(data, procColumns, this.processRows(result, procColumns));
      this.setStartData(null);
      let planJson = this.getPlanJson(result, data);
      if(planJson) {
        onExplain(planJson);
      } else {
        onExplain(null);
        this.eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.DATA_OUTPUT);
      }
    } else {
      if (httpMessage.data.data.result) {
        tabMsg = httpMessage.data.data.result + '\n\n' + tabMsg;
      }
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, tabMsg, true);
      this.eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.MESSAGES);
    }
    return retMsg;
  }
}

function dataChangeReducer(state, action) {
  let dataChange = _.clone(state);
  let count;
  switch (action.type) {
  case 'updated':
    dataChange.updated[action.clientPK] = {
      ...dataChange.updated[action.clientPK],
      ...action.payload,
      data: {
        ...dataChange.updated[action.clientPK]?.data,
        ...action.payload.data,
      }
    };
    break;
  case 'added':
    action.add = action.add || {};
    action.remove = action.remove || [];
    dataChange.added = _.pickBy(dataChange.added, (_v, k)=>(action.remove.indexOf(k) == -1));
    dataChange.added_index = _.pickBy(dataChange.added_index, (v)=>(action.remove.indexOf(v) == -1));
    count = _.max(Object.keys(dataChange.added_index).map(k=>+k))||0;
    Object.keys(action.add).forEach((k)=>{
      dataChange.added_index[++count] = k;
    });
    dataChange.added = {
      ...dataChange.added,
      ...action.add,
    };
    break;
  case 'deleted':
    dataChange.deleted = _.pickBy(dataChange.deleted, (_v, k)=>(action.remove.indexOf(k) == -1));
    dataChange.deleted = {
      ...dataChange.deleted,
      ...action.add,
    };
    break;
  case 'reset':
    dataChange = {
      updated: {},
      added: {},
      added_index: {},
      deleted: {},
    };
    break;
  default:
    break;
  }

  return dataChange;
}

const useStyles = makeStyles((theme)=>({
  root: {
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    backgroundColor: theme.otherVars.qtDatagridBg,
  }
}));

export function ResultSet() {
  const classes = useStyles();
  const containerRef = React.useRef(null);
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const [loaderText, setLoaderText] = useState('');
  const [queryData, setQueryData] = useState(null);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const api = getApiInstance();
  const rsu = React.useRef(new ResultSetUtils(api, queryToolCtx.params.trans_id, queryToolCtx.params.is_query_tool));
  const [dataChangeStore, dispatchDataChange] = React.useReducer(dataChangeReducer, {});
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedColumns, setSelectedColumns] = useState(new Set());
  const selectedCell = useRef([]);
  const selectedRange = useRef(null);
  const setSelectedCell = (val)=>{
    selectedCell.current=val;
    fireRowsColsCellChanged();
  };
  const setSelectedRange = (val)=>{
    if(val.startColumnIdx != val.endColumnIdx ||
      val.startRowIdx != val.endRowIdx) {
      selectedRange.current=val;
    } else {
      selectedRange.current=null;
    }
    fireRowsColsCellChanged();
  };
  const [rowsResetKey, setRowsResetKey] = useState(0);
  const lastScrollRef = useRef(null);
  const isResettingScroll = useRef(true);

  rsu.current.setEventBus(eventBus);
  rsu.current.setQtPref(queryToolCtx.preferences?.sqleditor);

  const isDataChanged = ()=>{
    return Boolean(_.size(dataChangeStore.updated) || _.size(dataChangeStore.added) || _.size(dataChangeStore.deleted));
  };

  const fireRowsColsCellChanged = ()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED, selectedRows.size, selectedColumns.size, selectedRange.current, selectedCell.current?.length);
  };

  const executionStartCallback = async (query, explainObject, external=false, reconnect=false)=>{
    const yesCallback = async ()=>{
      /* Reset */
      eventBus.fireEvent(QUERY_TOOL_EVENTS.HIGHLIGHT_ERROR, null);
      dispatchDataChange({type: 'reset'});
      setSelectedRows(new Set());
      setSelectedColumns(new Set());
      rsu.current.resetClientPKIndex();
      setLoaderText(gettext('Waiting for the query to complete...'));
      return await rsu.current.startExecution(
        query, explainObject,
        ()=>{
          setColumns([]);
          setRows([]);
        },
        {isQueryTool: queryToolCtx.params.is_query_tool, external: external, reconnect: reconnect}
      );
    };

    const pollCallback = async ()=>{
      rsu.current.pollForResult(
        (procQueryData, procColumns, procRows)=>{
          setRowsResetKey((prev)=>prev+1);
          setQueryData(procQueryData);
          setRows(procRows);
          setColumns(procColumns);
        },
        (planJson)=>{
          /* No need to open if plan is empty */
          if(!LayoutHelper.isTabOpen(queryToolCtx.docker, PANELS.EXPLAIN) && !planJson) {
            return;
          }
          LayoutHelper.openTab(queryToolCtx.docker, {
            id: PANELS.EXPLAIN,
            title: gettext('Explain'),
            content: <Explain plans={planJson} />,
            closable: true,
          }, PANELS.MESSAGES, 'after-tab', true);
        },
        ()=>{
          setColumns([]);
          setRows([]);
        },
        explainObject,
        {isQueryTool: queryToolCtx.params.is_query_tool, external: external, reconnect: reconnect}
      );
    };

    const executeAndPoll = async ()=>{
      await yesCallback();
      pollCallback();
    };

    if(isDataChanged()) {
      queryToolCtx.modal.confirm(
        gettext('Unsaved changes'),
        gettext('The data has been modified, but not saved. Are you sure you wish to discard the changes?'),
        executeAndPoll,
        function() {
          eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
        }
      );
    } else {
      await executeAndPoll();
    }
  };

  const triggerFilter = async (include)=>{
    if(_.isEmpty(selectedCell.current)) {
      return;
    }
    setLoaderText(gettext('Applying the new filter...'));
    try {
      let data = {
        [selectedCell.current[1].key]: selectedCell.current[0][selectedCell.current[1].key],
      };
      if(include) {
        await rsu.current.includeFilter(data);
      } else {
        await rsu.current.excludeFilter(data);
      }
      setLoaderText('');
      eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION);
    } catch(err) {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err, {
        checkTransaction: true,
      });
      setLoaderText('');
    }
  };

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_STOP_EXECUTION, async ()=>{
      try {
        await rsu.current.stopExecution();
      } catch(e) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, e);
      }
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, CONNECTION_STATUS.TRANSACTION_STATUS_IDLE);
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_END);
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTION_END, ()=>{
      setLoaderText(null);
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_RESULTS, async ()=>{
      let extension = queryToolCtx.preferences?.sqleditor?.csv_field_separator === ',' ? '.csv': '.txt';
      let fileName = 'data-' + new Date().getTime() + extension;
      if(!queryToolCtx.params.is_query_tool) {
        fileName = queryToolCtx.params.node_name + extension;
      }
      setLoaderText(gettext('Downloading results...'));
      await rsu.current.saveResultsToFile(fileName);
      setLoaderText('');
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SET_LIMIT, async (limit)=>{
      setLoaderText(gettext('Setting the limit on the result...'));
      try {
        await rsu.current.setLimit(limit);
        setLoaderText('');
        eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION);
      } catch(err) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err, {
          checkTransaction: true,
        });
        setLoaderText('');
      }
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_REMOVE_FILTER, async ()=>{
      setLoaderText(gettext('Removing the filter...'));
      try {
        await rsu.current.removeFilter();
        setLoaderText('');
        eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION);
      } catch(err) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err, {
          checkTransaction: true,
        });
        setLoaderText('');
      }
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_INCLUDE_EXCLUDE_FILTER, triggerFilter);

    eventBus.registerListener(QUERY_TOOL_EVENTS.GOTO_LAST_SCROLL, triggerResetScroll);
  }, []);

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTION_START, executionStartCallback);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.EXECUTION_START, executionStartCallback);
    };
  }, [queryToolCtx.docker, dataChangeStore]);

  useEffect(()=>{
    fireRowsColsCellChanged();
  }, [selectedRows.size, selectedColumns.size]);

  useEffect(()=>{
    rsu.current.transId = queryToolCtx.params.trans_id;
  }, [queryToolCtx.params.trans_id]);

  useEffect(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.RESET_GRAPH_VISUALISER, columns);
  }, [columns]);

  const fetchMoreRows = async (all=false, callback=undefined)=>{
    if(queryData.has_more_rows) {
      let res = [];
      setIsLoadingMore(true);
      try {
        res = await rsu.current.getMoreRows(all);
        const newRows = rsu.current.processRows(res.data.data.result, columns);
        setRows((prevRows)=>[...prevRows, ...newRows]);
        setQueryData((prev)=>({
          ...prev,
          has_more_rows: res.data.data.has_more_rows,
          rows_fetched_to: res.data.data.rows_fetched_to!=0 ? res.data.data.rows_fetched_to : prev.rows_fetched_to,
        }));
      } catch (e) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR,
          e,
          {
            connectionLostCallback: ()=>{
              eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, rsu.current.query, null, false, true);
            },
            checkTransaction: true,
          }
        );
      } finally {
        setIsLoadingMore(false);
      }
    }
    callback?.();
  };
  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.FETCH_MORE_ROWS, fetchMoreRows);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.FETCH_MORE_ROWS, fetchMoreRows);
    };
  }, [queryData?.has_more_rows, columns]);

  useEffect(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.ROWS_FETCHED, queryData?.rows_fetched_to, queryData?.rows_affected);
  }, [queryData?.rows_fetched_to, queryData?.rows_affected]);

  const warnSaveDataClose = ()=>{
    // No changes.
    if(!isDataChanged() || !queryToolCtx.preferences?.sqleditor.prompt_save_data_changes) {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_SAVE_TEXT_CLOSE);
      return;
    }
    queryToolCtx.modal.showModal(gettext('Save data changes?'), (closeModal)=>(
      <ConfirmSaveContent
        closeModal={closeModal}
        text={gettext('The data has changed. Do you want to save changes?')}
        onDontSave={()=>{
          eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_SAVE_TEXT_CLOSE);
        }}
        onSave={async ()=>{
          await triggerSaveData();
          eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_SAVE_TEXT_CLOSE);
        }}
      />
    ));
  };
  useEffect(()=>{
    let isDirty = _.size(dataChangeStore.updated) || _.size(dataChangeStore.added) || _.size(dataChangeStore.deleted);
    eventBus.fireEvent(QUERY_TOOL_EVENTS.DATAGRID_CHANGED, isDirty, dataChangeStore);

    eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_SAVE_DATA_CLOSE, warnSaveDataClose);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.WARN_SAVE_DATA_CLOSE, warnSaveDataClose);
    };
  }, [dataChangeStore]);

  const triggerSaveData = async ()=>{
    if(!_.size(dataChangeStore.updated) && !_.size(dataChangeStore.added) && !_.size(dataChangeStore.deleted)) {
      return;
    }
    rsu.current.historyQuerySource = QuerySources.SAVE_DATA;
    setLoaderText(gettext('Saving data...'));
    try {
      /* Convert the added info to actual rows */
      let added = {...dataChangeStore.added};
      Object.keys(added).forEach((clientPK)=>{
        added[clientPK].data = _.find(rows, (r)=>rowKeyGetter(r)==clientPK);
      });
      let {data: respData} = await rsu.current.saveData({
        updated: dataChangeStore.updated,
        deleted: dataChangeStore.deleted,
        added_index: dataChangeStore.added_index,
        added: added,
        columns: columns,
      });

      try {
        respData.data.query_results.forEach((r)=>{
          eventBus.fireEvent(QUERY_TOOL_EVENTS.PUSH_HISTORY, {
            'status': r.status,
            'start_time': rsu.current.startTime,
            'query': r.sql,
            'row_affected': r.rows_affected,
            'total_time': null,
            'message': r.result,
            'query_source': QuerySources.SAVE_DATA,
            'is_pgadmin_query': true,
            'info': gettext('This query was generated by pgAdmin as part of a "Save Data" operation'),
          });
        });
      } catch (_e) {/* History errors should not bother others */}

      if(!respData.data.status) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_DATA_DONE, false);
        eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, respData.data.result);
        Notifier.error(respData.data.result, 20000);
        // If the transaction is not idle, notify the user that previous queries are not rolled back,
        // only the failed save queries.
        if (respData.data.transaction_status != CONNECTION_STATUS.TRANSACTION_STATUS_IDLE) {
          Notifier.info(gettext('Saving data changes was rolled back but the current transaction is ' +
                                'still active; previous queries are unaffected.'));
        }
        setLoaderText(null);
        return;
      }

      eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_DATA_DONE, true);
      if(_.size(dataChangeStore.added)) {
        // Update the rows in a grid after addition
        respData.data.query_results.forEach((qr)=>{
          if(!_.isNull(qr.row_added)) {
            let rowClientPK = Object.keys(qr.row_added)[0];
            setRows((prevRows)=>{
              let rowIdx = prevRows.findIndex((r)=>rowKeyGetter(r)==rowClientPK);
              return [
                ...prevRows.slice(0, rowIdx),
                {
                  ...prevRows[rowIdx],
                  ...qr.row_added[rowClientPK],
                },
                ...prevRows.slice(rowIdx+1),
              ];
            });
          }
        });
      }
      let deletedKeys = Object.keys(dataChangeStore.deleted);
      if(deletedKeys.length == rows.length) {
        setRows([]);
      }
      else if(deletedKeys.length > 0) {
        setRows((prevRows)=>{
          return prevRows.filter((row)=>{
            return deletedKeys.indexOf(row[rsu.current.clientPK]) == -1;
          });
        });
        setColumns((prev)=>prev);
      }
      dispatchDataChange({type: 'reset'});
      setSelectedRows(new Set());
      setSelectedColumns(new Set());
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_CONNECTION_STATUS, respData.data.transaction_status);
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SET_MESSAGE, '');
      Notifier.success(gettext('Data saved successfully.'));
      if(respData.data.transaction_status > CONNECTION_STATUS.TRANSACTION_STATUS_IDLE) {
        Notifier.info(gettext('Auto-commit is off. You still need to commit changes to the database.'));
      }
    } catch (error) {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_DATA_DONE, false);
      eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, error, {
        checkTransaction: true,
      });
    }
    setLoaderText(null);
  };

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_DATA, triggerSaveData);
    return ()=>eventBus.deregisterListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_DATA, triggerSaveData);
  }, [dataChangeStore, rows, columns]);

  const getRangeIndexes = ()=>{
    let startColumnIdx = Math.min(selectedRange.current.startColumnIdx, selectedRange.current.endColumnIdx);
    let endColumnIdx = Math.max(selectedRange.current.startColumnIdx, selectedRange.current.endColumnIdx);
    let startRowIdx = Math.min(selectedRange.current.startRowIdx, selectedRange.current.endRowIdx);
    let endRowIdx = Math.max(selectedRange.current.startRowIdx, selectedRange.current.endRowIdx);
    return [startColumnIdx, endColumnIdx, startRowIdx, endRowIdx];
  };

  const copyDataFunc = (withHeaders=false)=>{
    const queryToolPref = queryToolCtx.preferences.sqleditor;
    let copyData = new CopyData({
      quoting: queryToolPref.results_grid_quoting,
      quote_char: queryToolPref.results_grid_quote_char,
      field_separator: queryToolPref.results_grid_field_separator,
    });
    let copyRows=[], copyCols=[];
    if(selectedRows.size > 0) {
      copyCols = columns;
      copyRows = rows.filter((r)=>selectedRows.has(r[rsu.current.clientPK]));
    } else if(selectedColumns.size > 0) {
      /* Row num col is added by QueryDataGrid, index will be +1 */
      copyCols = _.filter(columns, (_c, i)=>selectedColumns.has(i+1));
      copyRows = _.map(rows, (r)=>_.pick(r, _.map(copyCols, (c)=>c.key)));
    } else if(selectedRange.current) {
      let [startColumnIdx, endColumnIdx, startRowIdx, endRowIdx] = getRangeIndexes();
      copyCols = _.filter(columns, (_c, i)=>{
        /* Row num col is added by QueryDataGrid, index will be +1 */
        let idx = i+1;
        return idx>=startColumnIdx && idx<=endColumnIdx;
      });
      copyRows = rows.slice(startRowIdx, endRowIdx+1);
    } else if(selectedCell.current[0] && selectedCell.current[1]) {
      copyCols = [selectedCell.current[1]];
      copyRows = [{[selectedCell.current[1].key]: selectedCell.current[0][selectedCell.current[1].key]}];
    }
    if(copyRows.length > 0 && copyCols.length >0) {
      copyData.copyRowsToCsv(copyRows, copyCols, withHeaders);
    }
  };

  const triggerDeleteRows = ()=>{
    if(!queryData.can_edit) {
      return;
    }
    let add = {};
    let remove = [];
    let selRowsData = rows.filter((r)=>selectedRows.has(r[rsu.current.clientPK]));
    let removeNewlyAdded = [];
    for(let row of selRowsData) {
      let clientPK = row[rsu.current.clientPK];
      if(clientPK in dataChangeStore.deleted) {
        remove.push(clientPK);
      } else {
        /* If deleted from newly added */
        if(clientPK in dataChangeStore.added) {
          removeNewlyAdded.push(clientPK);
        } else {
          let primaryKeys = {};
          Object.keys(queryData.primary_keys).forEach((k)=>{
            primaryKeys[k] = row[k];
          });
          add[clientPK] = primaryKeys;
        }
      }
    }
    if(removeNewlyAdded.length > 0) {
      dispatchDataChange({
        type: 'added',
        remove: removeNewlyAdded,
      });
      setRows((prev)=>{
        return prev.filter((r)=>removeNewlyAdded.indexOf(rowKeyGetter(r))==-1);
      });
      setSelectedRows((prev)=>{
        let newRows = new Set(prev);
        removeNewlyAdded.forEach((rowId)=>{
          if(newRows.has(rowId)) {
            newRows.delete(rowId);
          }
        });
        return newRows;
      });
    }

    dispatchDataChange({
      type: 'deleted',
      add: add,
      remove: remove,
    });
  };

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.COPY_DATA, copyDataFunc);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.COPY_DATA, copyDataFunc);
    };
  }, [selectedRows, selectedColumns, columns, rows]);

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_DELETE_ROWS, triggerDeleteRows);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.TRIGGER_DELETE_ROWS, triggerDeleteRows);
    };
  }, [selectedRows, queryData, dataChangeStore, rows]);

  useEffect(()=>{
    const triggerAddRows = (_rows, fromClipboard, pasteSerials)=>{
      let insPosn = 0;
      if(selectedRows.size > 0) {
        let selectedRowsSorted = Array.from(selectedRows);
        selectedRowsSorted.sort();
        insPosn = _.findIndex(rows, (r)=>rowKeyGetter(r)==selectedRowsSorted[selectedRowsSorted.length-1])+1;
      }
      let newRows = rsu.current.processRows(_rows, columns, fromClipboard, pasteSerials);
      setRows((prev)=>[
        ...prev.slice(0, insPosn),
        ...newRows,
        ...prev.slice(insPosn)
      ]);
      let add = {};
      newRows.forEach((row)=>{
        add[rowKeyGetter(row)] = {
          err: false,
        };
      });
      dispatchDataChange({
        type: 'added',
        add: add,
      });
    };
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_ADD_ROWS, triggerAddRows);
    return ()=>eventBus.deregisterListener(QUERY_TOOL_EVENTS.TRIGGER_ADD_ROWS, triggerAddRows);
  }, [columns, selectedRows.size]);

  useEffect(()=>{
    const renderGeometries = (column)=>{
      let selRowsData = rows;
      if(selectedRows.size != 0) {
        selRowsData = rows.filter((r)=>selectedRows.has(rowKeyGetter(r)));
      } else if(selectedColumns.size > 0) {
        let selectedCols = _.filter(columns, (_c, i)=>selectedColumns.has(i+1));
        selRowsData = _.map(rows, (r)=>_.pick(r, _.map(selectedCols, (c)=>c.key)));
      } else if(selectedRange.current) {
        let [,, startRowIdx, endRowIdx] = getRangeIndexes();
        selRowsData = rows.slice(startRowIdx, endRowIdx+1);
      } else if(selectedCell.current?.[0]) {
        selRowsData = [selectedCell.current[0]];
      }
      LayoutHelper.openTab(queryToolCtx.docker, {
        id: PANELS.GEOMETRY,
        title:gettext('Geometry Viewer'),
        content: <GeometryViewer rows={selRowsData} columns={columns} column={column} />,
        closable: true,
      }, PANELS.MESSAGES, 'after-tab', true);
    };
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_RENDER_GEOMETRIES, renderGeometries);
    return ()=>eventBus.deregisterListener(QUERY_TOOL_EVENTS.TRIGGER_RENDER_GEOMETRIES, renderGeometries);
  }, [rows, columns, selectedRows.size, selectedColumns.size]);

  const handleScroll = (e) => {
    // Set scroll current position of RestSet.
    if (!_.isNull(e.currentTarget) && isResettingScroll.current) {
      lastScrollRef.current = {
        ref: { ...e },
        top: e.currentTarget.scrollTop,
        left: e.currentTarget.scrollLeft
      };
    }

    if (isLoadingMore || !rsu.current.isAtBottom(e)) return;
    eventBus.fireEvent(QUERY_TOOL_EVENTS.FETCH_MORE_ROWS);
  };

  const triggerResetScroll = () => {
    // Reset the scroll position to previously saved location.
    if (lastScrollRef.current) {
      isResettingScroll.current = false;
      setTimeout(() => {
        lastScrollRef.current.ref.currentTarget.scroll({
          top: lastScrollRef.current.top,
          left: lastScrollRef.current.left,
        });
        isResettingScroll.current = true;
      }, 1);
    }
  };


  const onRowsChange = (newRows, otherInfo)=>{
    let row = newRows[otherInfo.indexes[0]];
    let clientPK = rowKeyGetter(row);

    // Check if column is pk and value is null set it to default value.
    if(otherInfo.column.has_default_val && _.isNull(row[otherInfo.column.key]) && otherInfo.column.key in queryData.primary_keys) {
      row[otherInfo.column.key] = undefined;
    }

    if(clientPK in (dataChangeStore.added || {})) {
      /* No need to track this */
    } else if(clientPK in (dataChangeStore.updated || {})) {
      dispatchDataChange({
        type: 'updated',
        clientPK: clientPK,
        payload: {
          data: {[otherInfo.column.key]: row[otherInfo.column.key]},
        }
      });
    } else {
      let oldRow = rows[otherInfo.indexes[0]];
      /* If there are no primary keys, then discard */
      if(queryData.can_edit) {
        let primaryKeys = {};
        Object.keys(queryData.primary_keys).forEach((k)=>{
          primaryKeys[k] = oldRow[k];
        });
        dispatchDataChange({
          type: 'updated',
          clientPK: clientPK,
          payload: {
            err: false,
            data: {[otherInfo.column.key]: row[otherInfo.column.key]},
            primary_keys: primaryKeys,
          }
        });
      }
    }
    setRows(newRows);
  };

  useEffect(()=>{
    const showGraphVisualiser = async ()=>{
      LayoutHelper.openTab(queryToolCtx.docker, {
        id: PANELS.GRAPH_VISUALISER,
        title: gettext('Graph Visualiser'),
        content: <GraphVisualiser initColumns={columns}  />,
        closable: true,
      }, PANELS.MESSAGES, 'after-tab', true);
    };

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_GRAPH_VISUALISER, showGraphVisualiser);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.TRIGGER_GRAPH_VISUALISER, showGraphVisualiser);
    };
  }, [queryToolCtx.docker, columns]);

  const rowKeyGetter = React.useCallback((row)=>row[rsu.current.clientPK]);
  return (
    <Box className={classes.root} ref={containerRef} tabIndex="0">
      <Loader message={loaderText} />
      <Loader data-label="loader-more-rows" message={isLoadingMore ? gettext('Loading more rows...') : null} style={{top: 'unset', right: 'unset', padding: '0.5rem 1rem'}}/>
      {!queryData &&
        <EmptyPanelMessage text={gettext('No data output. Execute a query to get output.')}/>
      }
      {queryData && <>
        <ResultSetToolbar containerRef={containerRef} canEdit={queryData.can_edit} totalRowCount={queryData?.rows_affected}/>
        <Box flexGrow="1" minHeight="0">
          <QueryToolDataGrid
            columns={columns}
            rows={rows}
            totalRowCount={queryData?.rows_affected}
            columnWidthBy={
              queryToolCtx.preferences?.sqleditor?.column_data_auto_resize == 'by_data' ?
                queryToolCtx.preferences.sqleditor.column_data_max_width :
                queryToolCtx.preferences?.sqleditor?.column_data_auto_resize
            }
            key={rowsResetKey}
            rowKeyGetter={rowKeyGetter}
            onScroll={handleScroll}
            onRowsChange={onRowsChange}
            dataChangeStore={dataChangeStore}
            selectedRows={selectedRows}
            onSelectedRowsChange={setSelectedRows}
            selectedColumns={selectedColumns}
            onSelectedColumnsChange={setSelectedColumns}
            onSelectedCellChange={setSelectedCell}
            onSelectedRangeChange={setSelectedRange}
          />
        </Box>
      </>}
    </Box>
  );
}
