/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import PropTypes from 'prop-types';

import React, { useContext, useEffect, useState } from 'react';

import { Box, Grid } from '@material-ui/core';
import InfoRoundedIcon from '@material-ui/icons/InfoRounded';
import HelpIcon from '@material-ui/icons/HelpRounded';
import { makeStyles } from '@material-ui/styles';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import Loader from 'sources/components/Loader';
import pgWindow from 'sources/window';

import { PgButtonGroup, PgIconButton } from '../../../../../static/js/components/Buttons';
import ConnectServerContent from '../../../../../static/js/Dialogs/ConnectServerContent';
import { generateScript } from '../../../../sqleditor/static/js/show_query_tool';
import { FILTER_NAME, SCHEMA_DIFF_EVENT, TYPE } from '../SchemaDiffConstants';
import { InputComponent } from './InputComponent';
import { SchemaDiffButtonComponent } from './SchemaDiffButtonComponent';
import { SchemaDiffContext, SchemaDiffEventsContext } from './SchemaDiffComponent';
import { ResultGridComponent } from './ResultGridComponent';
import { openSocket, socketApiGet } from '../../../../../static/js/socket_instance';
import { parseApiError } from '../../../../../static/js/api_instance';
import { usePgAdmin } from '../../../../../static/js/BrowserComponent';

const useStyles = makeStyles(() => ({
  table: {
    minWidth: 650,
  },
  summaryContainer: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
  },
  note: {
    marginTop: '1.2rem',
    textAlign: 'center',
  },
  helpBtn: {
    display: 'flex',
    flexDirection: 'row-reverse',
    paddingRight: '0.3rem'
  },
  compareComp: {
    flexGrow: 1,
  },
  diffBtn: {
    display: 'flex',
    justifyContent: 'flex-end'
  }
}));

function generateFinalScript(script_array, scriptHeader, script_body) {
  _.each(Object.keys(script_array).reverse(), function (s) {
    if (script_array[s].length > 0) {
      script_body += script_array[s].join('\n') + '\n\n';
    }
  });

  return `${scriptHeader} BEGIN; \n ${script_body} END;`;
}

function checkAndGetSchemaQuery(data, script_array) {
  /* Check whether the selected object belongs to source only schema
     if yes then we will have to add create schema statement before creating any other object.*/

  if (!_.isUndefined(data.source_schema_name) && !_.isNull(data.source_schema_name)) {
    let schema_query = '\nCREATE SCHEMA IF NOT EXISTS ' + data.source_schema_name + ';\n';
    if (script_array[data.dependLevel].indexOf(schema_query) == -1) {
      script_array[data.dependLevel].push(schema_query);
    }
  }
}

function getGenerateScriptData(rows, selectedIds, script_array) {
  for (let selRowVal of rows) {
    if (selectedIds.includes(`${selRowVal.id}`)) {
      let data = selRowVal;
      if (!_.isUndefined(data.diff_ddl)) {
        if (!(data.dependLevel in script_array)) script_array[data.dependLevel] = [];
        checkAndGetSchemaQuery(data, script_array);
        script_array[data.dependLevel].push(data.diff_ddl);
      }
    }
  }
}

function raiseErrorOnFail(pgAdmin, alertTitle, xhr) {
  try {
    if (_.isUndefined(xhr.response.data)) {
      pgAdmin.Browser.notifier.alert(alertTitle, gettext('Unable to get the response text.'));
    } else {
      let err = JSON.parse(xhr.response.data);
      pgAdmin.Browser.notifier.alert(alertTitle, err.errormsg);
    }
  } catch (e) {
    pgAdmin.Browser.notifier.alert(alertTitle, gettext(e.message));
  }
}

const onHelpClick=()=>{
  let url = url_for('help.static', {'filename': 'schema_diff.html'});
  window.open(url, 'pgadmin_help');
};

export function SchemaDiffCompare({ params }) {
  const classes = useStyles();
  const schemaDiffToolContext = useContext(SchemaDiffContext);
  const eventBus = useContext(SchemaDiffEventsContext);

  const [showResultGrid, setShowResultGrid] = useState(false);
  const [selectedSourceSid, setSelectedSourceSid] = useState(null);
  const [selectedTargetSid, setSelectedTargetSid] = useState(null);

  const [sourceDatabaseList, setSourceDatabaseList] = useState([]);
  const [targetDatabaseList, setTargetDatabaseList] = useState([]);
  const [selectedSourceDid, setSelectedSourceDid] = useState(null);
  const [selectedTargetDid, setSelectedTargetDid] = useState(null);

  const [sourceSchemaList, setSourceSchemaList] = useState([]);
  const [targetSchemaList, setTargetSchemaList] = useState([]);
  const [selectedSourceScid, setSelectedSourceScid] = useState(null);
  const [selectedTargetScid, setSelectedTargetScid] = useState(null);

  const [sourceGroupServerList, setSourceGroupServerList] = useState([]);
  const [gridData, setGridData] = useState([]);
  const [allRowIdList, setAllRowIdList] = useState([]);
  const [filterOptions, setFilterOptions] = useState([]);
  const [compareOptions, setCompareOptions] = useState(undefined);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [loaderText, setLoaderText] = useState(null);
  const [apiResult, setApiResult] = useState([]);
  const [rowDep, setRowDep] = useState({});
  const [isInit, setIsInit] = useState(true);

  const pgAdmin = usePgAdmin();

  useEffect(() => {
    schemaDiffToolContext.api.get(url_for('schema_diff.servers')).then((res) => {
      let groupedOptions = [];
      _.forIn(res.data.data, (val, _key) => {
        if (val.lenght == 0) {
          return;
        }
        groupedOptions.push({
          label: _key,
          options: val
        });
      });

      setSourceGroupServerList(groupedOptions);
    }).catch((err) => {
      pgAdmin.Browser.notifier.alert(err.message);
    });
  }, []);

  useEffect(() => {
    // Register all eventes for debugger.
    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_SELECT_SERVER, triggerSelectServer);

    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_SELECT_DATABASE, triggerSelectDatabase);


    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_SELECT_SCHEMA, triggerSelectSchema);

    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_COMPARE_DIFF, triggerCompareDiff);

    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_FILTER, triggerChangeFilter);

    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_GENERATE_SCRIPT, triggerGenerateScript);

  }, []);

  function checkAndSetSourceData(diff_type, selectedOption) {
    if(selectedOption == null) {
      setSelectedRowIds([]);
      setGridData([]);
      if (diff_type == TYPE.SOURCE) {
        setSelectedSourceSid(null);
        setSelectedSourceDid(null);
        setSelectedSourceScid(null);
      } else {
        setSelectedTargetSid(null);
        setSelectedTargetDid(null);
        setSelectedTargetScid(null);
      }
    }

  }

  function setSourceTargetSid(diff_type, selectedOption) {
    if (diff_type == TYPE.SOURCE) {
      setSelectedSourceSid(selectedOption);
    } else {
      setSelectedTargetSid(selectedOption);
    }
  }

  const triggerSelectServer = ({ selectedOption, diff_type, serverList }) => {
    checkAndSetSourceData(diff_type, selectedOption);
    for (const group of serverList) {
      for (const opt of group.options) {
        if (opt.value == selectedOption) {
          if (!opt.connected) {
            connectServer(selectedOption, diff_type, null, serverList);
            break;
          } else {
            setSourceTargetSid(diff_type, selectedOption);
            getDatabaseList(selectedOption, diff_type);
          }
        }
      }
    }

    setSourceGroupServerList(serverList);
  };

  const triggerSelectDatabase = ({ selectedServer, selectedDB, diff_type, databaseList }) => {
    if(selectedDB == null) {
      setGridData([]);
    }
    if (databaseList) {
      for (const opt of databaseList) {
        if (opt.value == selectedDB) {
          if (!opt.connected) {
            connectDatabase(selectedServer, selectedDB, diff_type, databaseList);
            break;
          } else {
            getSchemaList(selectedServer, selectedDB, diff_type);
            break;
          }
        }

      }

      if (diff_type == TYPE.SOURCE) {
        setSelectedSourceDid(selectedDB);
        setSourceDatabaseList(databaseList);
      } else {
        setSelectedTargetDid(selectedDB);
        setTargetDatabaseList(databaseList);
      }

    }
  };

  const triggerSelectSchema = ({ selectedSC, diff_type }) => {

    if (diff_type == TYPE.SOURCE) {
      setSelectedSourceScid(selectedSC);
    } else {
      setSelectedTargetScid(selectedSC);
    }
  };

  const triggerCompareDiff = async ({ sourceData, targetData, compareParams, filterParams }) => {
    setGridData([]);
    setIsInit(false);

    let raiseSelectionError = false;
    if (!_.isUndefined(sourceData.scid) && !_.isNull(sourceData.scid) &&
        !_.isUndefined(targetData.scid) && !_.isNull(targetData.scid)) {
      if (sourceData.sid === targetData.sid  && sourceData.did === targetData.did && sourceData.scid === targetData.scid) {
        raiseSelectionError = true;
      }
    } else if (sourceData.sid === targetData.sid  && sourceData.did === targetData.did) {
      raiseSelectionError = true;
    }

    if (raiseSelectionError) {
      pgAdmin.Browser.notifier.alert(gettext('Selection Error'),
        gettext('Please select the different source and target.'));
    } else {
      setLoaderText('Comparing objects... (this may take a few minutes)...');
      let url_params = {
        'trans_id': params.transId,
        'source_sid': sourceData['sid'],
        'source_did': sourceData['did'],
        'target_sid': targetData['sid'],
        'target_did': targetData['did'],
        'ignore_owner': compareParams['ignoreOwner'],
        'ignore_whitespaces': compareParams['ignoreWhitespaces'],
        'ignore_tablespace': compareParams['ignoreTablespace'],
        'ignore_grants': compareParams['ignoreGrants'],
      };
      let socketEndpoint = 'compare_database';
      if (sourceData['scid'] != null && targetData['scid'] != null) {
        url_params['source_scid'] = sourceData['scid'];
        url_params['target_scid'] = targetData['scid'];
        socketEndpoint = 'compare_schema';
      }
      let resData = [];
      let socket;
      try {
        setCompareOptions(compareParams);
        socket = await openSocket('/schema_diff');
        const compareStatus = _.debounce(res=>{
          let msg = res.compare_msg;
          msg = msg + gettext(` (this may take a few minutes)... ${Math.round(res.diff_percentage)} %`);
          setLoaderText(msg);
        }, 250);
        socket.on('compare_status', compareStatus);
        resData = await socketApiGet(socket, socketEndpoint, url_params);
        setShowResultGrid(true);
        // stop the listeners
        socket.off('compare_status', compareStatus);
        compareStatus.cancel();
        setLoaderText(null);
        setFilterOptions(filterParams);
        getResultGridData(resData, filterParams);
      } catch (error) {
        setLoaderText(null);
        setShowResultGrid(false);
        pgAdmin.Browser.notifier.alert(gettext('Error'), parseApiError(error));
      }
      socket?.disconnect();
    }
  };

  const triggerChangeFilter = ({ filterParams }) => {
    setFilterOptions(filterParams);
  };

  const triggerGenerateScript = ({ sid, did, selectedIds, rows }) => {
    setLoaderText(gettext('Generating script...'));
    let generatedScript = undefined, scriptHeader;

    scriptHeader = gettext('-- This script was generated by the Schema Diff utility in pgAdmin 4. \n');
    scriptHeader += gettext('-- For the circular dependencies, the order in which Schema Diff writes the objects is not very sophisticated \n');
    scriptHeader += gettext('-- and may require manual changes to the script to ensure changes are applied in the correct order.\n');
    scriptHeader += gettext('-- Please report an issue for any failure with the reproduction steps. \n');

    if (selectedIds.length > 0) {
      let script_array = { 1: [], 2: [], 3: [], 4: [], 5: [] },
        script_body = '';
      getGenerateScriptData(rows, selectedIds, script_array);

      generatedScript = generateFinalScript(script_array, scriptHeader, script_body);
      openQueryTool({ sid: sid, did: did, generatedScript: generatedScript, scriptHeader: scriptHeader });
    } else {
      openQueryTool({ sid: sid, did: did, scriptHeader: scriptHeader });
    }
  };

  function openQueryTool({ sid, did, generatedScript, scriptHeader }) {
    let baseServerUrl = url_for('schema_diff.get_server', { 'sid': sid, 'did': did });

    schemaDiffToolContext.api({
      url: baseServerUrl,
      method: 'GET',
      dataType: 'json',
      contentType: 'application/json',
    })
      .then(function (res) {
        let data = res.data.data;
        let serverData = {};
        if (data) {
          let sqlId = `schema${params.transId}`;
          serverData['sgid'] = data.gid;
          serverData['sid'] = data.sid;
          serverData['stype'] = data.type;
          serverData['server'] = data.name;
          serverData['user'] = data.user;
          serverData['did'] = did;
          serverData['database'] = data.database;
          serverData['sql_id'] = sqlId;

          if (_.isUndefined(generatedScript)) {
            generatedScript = scriptHeader + 'BEGIN;' + '\n' + '' + '\n' + 'END;';
          }
          localStorage.setItem(sqlId, generatedScript);
          generateScript(serverData, pgWindow.pgAdmin.Tools.SQLEditor);
          setLoaderText(null);
        }

      })
      .catch(function (xhr) {
        setLoaderText(null);
        raiseErrorOnFail(pgAdmin, gettext('Generate script error'), xhr);
      });
  }

  function generateGridData(record, tempData, allRowIds, filterParams) {
    if (record.group_name in tempData && record.label in tempData[record.group_name]['children']) {
      let chidId = record.id;
      allRowIds.push(`${chidId}`);

      tempData[record.group_name]['children'][record.label]['children'].push({
        'id': chidId,
        'parentId': tempData[record.group_name]['children'][record.label].id,
        'label': record.title,
        'status': record.status,
        'isVisible': filterParams.includes(record.status) ? true : false,
        'icon': `icon-${record.type}`,
        'isExpanded': false,
        'selected': false,
        'oid': record.oid,
        'itemType': record.type,
        'source_oid': record.source_oid,
        'target_oid': record.target_oid,
        'source_scid': record.source_scid,
        'target_scid': record.target_scid,
        'dependenciesOid': record.dependencies.map(({ oid }) => oid),
        'dependencies': record.dependencies,
        'dependencieRowIds': [],
        'ddlData': {
          'SQLdiff': record.diff_ddl,
          'sourceSQL': record.source_ddl,
          'targetSQL': record.target_ddl
        }
      });

    } else if (record.group_name in tempData) {
      let chidId = crypto.getRandomValues(new Uint16Array(1));
      allRowIds.push(`${chidId}`);

      let subChildId = record.id;
      allRowIds.push(`${subChildId}`);
      tempData[record.group_name]['children'][record.label] = {
        'id': chidId,
        'parentId': tempData[record.group_name]['id'],
        'label': record.label,
        'identicalCount': 0,
        'differentCount': 0,
        'sourceOnlyCount': 0,
        'targetOnlyCount': 0,
        'icon': `icon-coll-${record.type}`,
        'isExpanded': false,
        'selected': false,
        'children': [{
          'id': subChildId,
          'parentId': chidId,
          'label': record.title,
          'status': record.status,
          'isVisible': filterParams.includes(record.status) ? true : false,
          'icon': `icon-${record.type}`,
          'isExpanded': false,
          'selected': false,
          'oid': record.oid,
          'itemType': record.type,
          'source_oid': record.source_oid,
          'target_oid': record.target_oid,
          'source_scid': record.source_scid,
          'target_scid': record.target_scid,
          'dependenciesOid': record.dependencies.map(({ oid }) => oid),
          'dependencies': record.dependencies,
          'dependencieRowIds': [],
          'ddlData': {
            'SQLdiff': record.diff_ddl,
            'sourceSQL': record.source_ddl,
            'targetSQL': record.target_ddl
          }
        }]
      };
    } else {
      let label = record.label;
      let _id = crypto.getRandomValues(new Uint16Array(1));
      let _subChildId = crypto.getRandomValues(new Uint16Array(1));
      allRowIds.push(`${_id}`);
      allRowIds.push(`${_subChildId}`);
      tempData[record.group_name] = {
        'id': _id,
        'label': record.group_name,
        'icon': record.group_name == 'Database Objects' ? 'icon-coll-database' : 'icon-schema',
        'groupType': record.group_name,
        'isExpanded': false,
        'selected': false,
        'children': {}
      };
      let ch_id = record.id;
      allRowIds.push(`${ch_id}`);
      tempData[record.group_name]['children'][label] = {
        'id': _subChildId,
        'parentId': _id,
        'label': record.label,
        'identicalCount': 0,
        'differentCount': 0,
        'sourceOnlyCount': 0,
        'targetOnlyCount': 0,
        'selected': false,
        'icon': `icon-coll-${record.type}`,
        'isExpanded': false,
        'children': [{
          'id': ch_id,
          'parentId': _subChildId,
          'label': record.title,
          'status': record.status,
          'selected': false,
          'itemType': record.type,
          'isVisible': filterParams.includes(record.status) ? true : false,
          'icon': `icon-${record.type}`,
          'isExpanded': false,
          'oid': record.oid,
          'source_oid': record.source_oid,
          'target_oid': record.target_oid,
          'source_scid': record.source_scid,
          'target_scid': record.target_scid,
          'dependenciesOid': record.dependencies.map(({ oid }) => oid),
          'dependencies': record.dependencies,
          'dependencieRowIds': [],
          'ddlData': {
            'SQLdiff': record.diff_ddl,
            'sourceSQL': record.source_ddl,
            'targetSQL': record.target_ddl
          }
        }]
      };
    }
  }

  function getResultGridData(gridDataList, filterParams) {
    let tempData = {};
    let allRowIds = [];
    setApiResult(gridDataList);
    gridDataList.map((record) => {
      generateGridData(record, tempData, allRowIds, filterParams);
    });

    let keyList = Object.keys(tempData);
    let temp = [];
    let rowDependencies = {};

    for (let keyItem of keyList) {
      tempData[keyItem]['children'] = Object.values(tempData[keyItem]['children']);
      let subChildList = [];

      tempData[keyItem]['children'].map((ch) => ch.children.map(({ id }) => subChildList.push(`${id}`)));
      tempData[keyItem]['metadata'] = {
        isRoot: true,
        children: tempData[keyItem]['children'].map(({ id }) => `${id}`),
        subChildren: subChildList,
      };
      tempData[keyItem]['children'].map((child) => {
        child['metadata'] = {
          parentId: tempData[keyItem].id,
          children: tempData[keyItem]['children'].map(({ id }) => `${id}`),
          subChildren: child.children.map(({ id }) => `${id}`),
          dependencies: [],
        };
        child.children.map((ch) => {
          if (ch.dependenciesOid.length > 0) {
            tempData[keyItem]['children'].map((el) => {
              el.children.map((data) => {
                if (ch.dependenciesOid.includes(data.oid)) {
                  ch.dependencieRowIds.push(`${data.id}`);
                }
              });

            });
          }
          ch['metadata'] = {
            parentId: child.id,
            rootId: tempData[keyItem].id,
            children: child.children.map(({ id }) => `${id}`),

          };
          child['metadata']['dependencies'].push(...ch.dependencieRowIds);
        });
      });
      temp.push(tempData[keyItem]);
    }

    setRowDep(rowDependencies);
    setShowResultGrid(true);
    setGridData(temp);
    setAllRowIdList([...new Set(allRowIds)]);
  }

  const connectDatabase = (sid, selectedDB, diff_type, databaseList) => {
    schemaDiffToolContext.api({
      method: 'POST',
      url: url_for('schema_diff.connect_database', { 'sid': sid, 'did': selectedDB }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }).then((res) => {
      let dbList = databaseList;
      for (const opt of dbList) {
        if (opt.value == selectedDB) {
          opt.connected = true;
          opt.image = res.data.data.icon || 'pg-icon-database';
          getSchemaList(sid, selectedDB, diff_type);
          if (diff_type == TYPE.SOURCE) {
            setSelectedSourceDid(selectedDB);
            setSourceDatabaseList(dbList);
          } else {
            setSelectedTargetDid(selectedDB);
            setTargetDatabaseList(dbList);
          }
          break;
        }
      }
    }).catch((error) => {
      pgAdmin.Browser.notifier.error(gettext(`Error in connect database ${error.response.data}`));
    });

  };

  const connectServer = (sid, diff_type, formData = null, serverList = []) => {
    try {
      schemaDiffToolContext.api({
        method: 'POST',
        url: url_for('schema_diff.connect_server', { 'sid': sid }),
        data: formData,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }).then((res) => {
        for (const group of serverList) {
          for (const opt of group.options) {
            if (opt.value == sid) {
              opt.connected = true;
              opt.image = res.data.data.icon || 'icon-pg';
              break;
            }
          }
        }

        if (diff_type == TYPE.SOURCE) {
          setSelectedSourceSid(sid);
        } else {
          setSelectedTargetSid(sid);
        }

        setSourceGroupServerList(serverList);
        getDatabaseList(sid, diff_type);
      }).catch((error) => {
        showConnectServer(error.response?.data.result, sid, diff_type, serverList);
      });
    } catch (error) {
      pgAdmin.Browser.notifier.error(gettext(`Error in connect server ${error.response.data}` ));
    }
  };

  function getDatabaseList(sid, diff_type) {
    schemaDiffToolContext.api.get(
      url_for('schema_diff.databases', { 'sid': sid })
    ).then((res) => {
      res.data.data.map((opt) => {

        if (opt.is_maintenance_db) {
          if (diff_type == TYPE.SOURCE) {
            setSelectedSourceDid(opt.value);
          } else {
            setSelectedTargetDid(opt.value);
          }
          getSchemaList(sid, opt.value, diff_type);
        }
      });
      if (diff_type == TYPE.SOURCE) {
        setSourceDatabaseList(res.data.data);
      } else {
        setTargetDatabaseList(res.data.data);
      }

    });
  }

  function getSchemaList(sid, did, diff_type) {
    schemaDiffToolContext.api.get(
      url_for('schema_diff.schemas', { 'sid': sid, 'did': did })
    ).then((res) => {
      if (diff_type == TYPE.SOURCE) {
        setSourceSchemaList(res.data.data);
      } else {
        setTargetSchemaList(res.data.data);
      }

    });
  }

  function showConnectServer(result, sid, diff_type, serverList) {
    schemaDiffToolContext.modal.showModal(gettext('Connect to server'), (closeModal) => {
      return (
        <ConnectServerContent
          closeModal={() => {
            closeModal();
          }}
          data={result}
          onOK={(formData) => {
            connectServer(sid, diff_type, formData, serverList);
          }}
        />
      );
    });
  }

  function getFilterParams() {
    let opt = [];
    if(isInit && filterOptions.length == 0) {
      opt = [FILTER_NAME.DIFFERENT, FILTER_NAME.SOURCE_ONLY, FILTER_NAME.TARGET_ONLY];
    } else if(filterOptions.length > 0 ) {
      opt = filterOptions;
    }
    return opt;
  }

  return (
    <>
      <Loader message={loaderText} style={{fontWeight: 900}}></Loader>
      <Box id='compare-container-schema-diff'>
        <Grid
          container
          direction="row"
          alignItems="center"
          key={_.uniqueId('c')}
        >
          <Grid item lg={7} md={7} sm={10} xs={10} key={_.uniqueId('c')}>
            <InputComponent
              label={gettext('Select Source')}
              serverList={sourceGroupServerList}
              databaseList={sourceDatabaseList}
              schemaList={sourceSchemaList}
              selectedSid={selectedSourceSid}
              selectedDid={selectedSourceDid}
              selectedScid={selectedSourceScid}
              diff_type={TYPE.SOURCE}
            ></InputComponent>
          </Grid>
          <Grid item lg={5} md={5} sm={2} xs={2} key={_.uniqueId('c')} className={classes.helpBtn}>
            <PgButtonGroup size="small">
              <PgIconButton data-test='schema-diff-help' title={gettext('Help')} icon={<HelpIcon />} onClick={onHelpClick} />
            </PgButtonGroup>
          </Grid>
        </Grid>
        <Grid
          container
          direction="row"
          alignItems="center"
          key={_.uniqueId('c')}
        >
          <Grid item lg={7} md={7} sm={10} xs={10} key={_.uniqueId('c')}>
            <InputComponent
              label={gettext('Select Target')}
              serverList={sourceGroupServerList}
              databaseList={targetDatabaseList}
              schemaList={targetSchemaList}
              selectedSid={selectedTargetSid}
              selectedDid={selectedTargetDid}
              selectedScid={selectedTargetScid}
              diff_type={TYPE.TARGET}
            ></InputComponent>
          </Grid>

          <Grid item lg={5} md={5} sm={12} xs={12} key={_.uniqueId('c')} className={classes.diffBtn}>
            <SchemaDiffButtonComponent
              sourceData={{
                'sid': selectedSourceSid,
                'did': selectedSourceDid,
                'scid': selectedSourceScid,
              }}
              selectedRowIds={selectedRowIds}
              rows={apiResult}
              targetData={{
                'sid': selectedTargetSid,
                'did': selectedTargetDid,
                'scid': selectedTargetScid,
              }}
              filterParams={getFilterParams()}
              compareParams={compareOptions}
            ></SchemaDiffButtonComponent>
          </Grid>
        </Grid>
      </Box>
      {showResultGrid && gridData.length > 0  && selectedTargetDid && selectedSourceDid ?
        <ResultGridComponent
          gridData={gridData}
          allRowIds={allRowIdList}
          filterParams={filterOptions}
          selectedRowIds={(rows) => { setSelectedRowIds(rows); }}
          rowDependencies={rowDep}
          transId={params.transId}
          sourceData={{
            'sid': selectedSourceSid,
            'did': selectedSourceDid,
            'scid': selectedSourceScid,
          }}
          targetData={{
            'sid': selectedTargetSid,
            'did': selectedTargetDid,
            'scid': selectedTargetScid,
          }}
        ></ResultGridComponent>
        :
        <Box className={classes.note}>
          <InfoRoundedIcon style={{ fontSize: '1.2rem' }} />
          {gettext(' Source and Target database server must be of the same major version.')}<br />
          <strong>{gettext(' Database Compare:')}</strong>
          {gettext(' Select the server and database for the source and target and Click')} <strong>{gettext('Compare.')}</strong>
          <br />
          <strong>{gettext('Schema Compare:')}</strong>
          {gettext(' Select the server, database and schema for the source and target and Click')} <strong>{gettext('Compare.')}</strong>
          <br />
          <strong>{gettext('Note:')}</strong> {gettext('The dependencies will not be resolved in the Schema comparison.')}
        </Box>
      }
    </>
  );
}

SchemaDiffCompare.propTypes = {
  params: PropTypes.object,
  'params.transId': PropTypes.number,

};
