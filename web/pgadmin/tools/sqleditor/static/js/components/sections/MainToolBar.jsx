/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useContext, useCallback, useEffect, useState} from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';
import { PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { FilterIcon, CommitIcon, RollbackIcon, ExecuteQueryIcon } from '../../../../../../static/js/components/ExternalIcon';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import ExplicitRoundedIcon from '@mui/icons-material/ExplicitRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import HelpIcon from '@mui/icons-material/HelpRounded';
import {QUERY_TOOL_EVENTS, CONNECTION_STATUS} from '../QueryToolConstants';
import { QueryToolConnectionContext, QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import { PgMenu, PgMenuDivider, PgMenuItem, usePgMenuGroup } from '../../../../../../static/js/components/Menu';
import gettext from 'sources/gettext';
import { useKeyboardShortcuts } from '../../../../../../static/js/custom_hooks';
import url_for from 'sources/url_for';
import _ from 'lodash';
import { InputSelectNonSearch } from '../../../../../../static/js/components/FormComponents';
import PropTypes from 'prop-types';
import CustomPropTypes from '../../../../../../static/js/custom_prop_types';
import ConfirmTransactionContent from '../dialogs/ConfirmTransactionContent';
import { LayoutDocker } from '../../../../../../static/js/helpers/Layout';
import CloseRunningDialog from '../dialogs/CloseRunningDialog';

const StyledBox = styled(Box)(({theme}) => ({
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: theme.otherVars.editorToolbarBg,
  flexWrap: 'wrap',
  ...theme.mixins.panelBorder.bottom,
}));

function autoCommitRollback(type, api, transId, value) {
  let url = url_for(`sqleditor.${type}`, {
    'trans_id': transId,
  });
  return api.post(url, JSON.stringify(value));
}

export function MainToolBar({containerRef, onFilterClick, onManageMacros, onAddToMacros}) {
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const queryToolConnCtx = useContext(QueryToolConnectionContext);

  const [highlightFilter, setHighlightFilter] = useState(false);
  const [limit, setLimit] = useState('-1');
  const [buttonsDisabled, setButtonsDisabled] = useState({
    'save': true,
    'cancel': true,
    'save-data': true,
    'delete-rows': true,
    'commit': true,
    'rollback': true,
    'filter': true,
    'limit': false,
    'execute-options': !queryToolCtx.params.is_query_tool,
  });
  const {openMenuName, toggleMenu, onMenuClose} = usePgMenuGroup();
  const [checkedMenuItems, setCheckedMenuItems] = React.useState({});
  /* Menu button refs */
  const saveAsMenuRef = React.useRef(null);
  const openInNewTabMenuRef = React.useRef(null);
  const editMenuRef = React.useRef(null);
  const autoCommitMenuRef = React.useRef(null);
  const explainMenuRef = React.useRef(null);
  const macrosMenuRef = React.useRef(null);
  const filterMenuRef = React.useRef(null);

  const queryToolPref = queryToolCtx.preferences.sqleditor;
  const setDisableButton = useCallback((name, disable=true)=>{
    setButtonsDisabled((prev)=>({...prev, [name]: disable}));
  }, []);

  const executeCursor = useCallback(()=>{
    if(!queryToolCtx.preferences.sqleditor.underline_query_cursor && queryToolCtx.preferences.sqleditor.underlined_query_execute_warning){
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTE_CURSOR_WARNING);
    } else {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, null, '', true);
    }
  }, [queryToolCtx.preferences.sqleditor]);
  const executeScript = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION);
  }, []);
  const cancelQuery = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_STOP_EXECUTION);
  }, []);

  const explain = useCallback((analyze=false)=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, {
      format: 'json',
      analyze: analyze,
      verbose: Boolean(checkedMenuItems['explain_verbose']),
      costs: Boolean(checkedMenuItems['explain_costs']),
      buffers: analyze ? Boolean(checkedMenuItems['explain_buffers']) : false,
      timing: analyze ? Boolean(checkedMenuItems['explain_timing']) : false,
      summary: Boolean(checkedMenuItems['explain_summary']),
      settings: Boolean(checkedMenuItems['explain_settings']),
      wal: analyze ? Boolean(checkedMenuItems['explain_wal']) : false,
    });
  }, [checkedMenuItems]);

  const explainAnalyse = useCallback(()=>{
    explain(true);
  }, [explain]);

  const checkMenuClick = useCallback((e)=>{
    setCheckedMenuItems((prev)=>{
      let newVal = !prev[e.value];
      if(e.value === 'auto_commit' || e.value === 'auto_rollback') {
        autoCommitRollback(e.value, queryToolCtx.api, queryToolCtx.params.trans_id, newVal)
          .catch ((error)=>{
            newVal = prev[e.value];
            eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, error, {
              checkTransaction: true,
            });
          });
      }
      return {
        ...prev,
        [e.value]: newVal,
      };
    });
  }, []);

  const openFile = useCallback(()=>{
    confirmDiscard(()=>{
      eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_LOAD_FILE, Boolean(checkedMenuItems['open_in_new_tab']));
    }, true);
  }, [buttonsDisabled['save'], checkedMenuItems]);

  const saveFile = useCallback((saveAs=false)=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_FILE, saveAs);
  }, []);

  useEffect(()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTION_START, ()=>{
      setDisableButton('execute', true);
      setDisableButton('cancel', false);
      setDisableButton('explain', true);
      setDisableButton('explain_analyse', true);
      setDisableButton('limit', true);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTION_END, ()=>{
      setDisableButton('execute', false);
      setDisableButton('cancel', true);
      setDisableButton('explain', false);
      setDisableButton('explain_analyse', false);
      setDisableButton('limit', false);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_RESULTS, ()=>{
      setDisableButton('execute', true);
      setDisableButton('explain', true);
      setDisableButton('explain_analyse', true);
      setDisableButton('limit', true);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_RESULTS_END, ()=>{
      setDisableButton('execute', false);
      setDisableButton('explain', false);
      setDisableButton('explain_analyse', false);
      setDisableButton('limit', false);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.QUERY_CHANGED, (isDirty)=>{
      setDisableButton('save', !isDirty);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.LOAD_FILE_DONE, ()=>{
      setDisableButton('save', true);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, ()=>{
      setDisableButton('save', true);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.DATAGRID_CHANGED, (isDirty)=>{
      setDisableButton('save-data', !isDirty);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SELECTED_ROWS_COLS_CELL_CHANGED, (rows)=>{
      setDisableButton('delete-rows', !rows);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SET_FILTER_INFO, (canFilter, filterApplied)=>{
      setDisableButton('filter', !canFilter);
      setHighlightFilter(filterApplied);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.SET_LIMIT_VALUE, (l)=>{
      setLimit(l);
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.PROMOTE_TO_QUERY_TOOL, ()=>{
      setDisableButton('filter', true);
      setHighlightFilter(false);
      setDisableButton('limit', true);

      setDisableButton('execute', false);
      setDisableButton('execute-options', false);
    });


  }, []);

  useEffect(()=>{
    setDisableButton('execute', queryToolConnCtx.obtainingConn);
    setDisableButton('explain', queryToolConnCtx.obtainingConn);
    setDisableButton('explain_analyse', queryToolConnCtx.obtainingConn);
  }, [queryToolConnCtx.obtainingConn]);

  const isInTxn = ()=>(queryToolConnCtx.connectionStatus == CONNECTION_STATUS.TRANSACTION_STATUS_INTRANS
    || queryToolConnCtx.connectionStatus == CONNECTION_STATUS.TRANSACTION_STATUS_INERROR);

  const onExecutionDone = ()=>{
    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTION_END, (success)=>{
      if(success) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.FORCE_CLOSE_PANEL);
      }
    }, true);
  };
  const warnTxnClose = ()=>{
    if(!isInTxn() || !queryToolCtx.preferences?.sqleditor.prompt_commit_transaction) {
      /* This will show Close query tool dialog if there is any query running and transaction is active i.e queryToolConnCtx.connectionStatus is 1 */
      if(queryToolConnCtx.connectionStatus==CONNECTION_STATUS.TRANSACTION_STATUS_ACTIVE){
        queryToolCtx.modal.showModal(gettext('Close query tool?'), (closeModal)=>(
          <CloseRunningDialog
            closeModal={closeModal}
            text={gettext('There is an active query running currently. Are you sure you want to close?')}
            onYes={()=>{
              eventBus.fireEvent(QUERY_TOOL_EVENTS.FORCE_CLOSE_PANEL);
            }}
          />
        ));
        return;
      } else {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.FORCE_CLOSE_PANEL);
        return;
      }
    }
    queryToolCtx.modal.showModal(gettext('Commit transaction?'), (closeModal)=>(
      <ConfirmTransactionContent
        closeModal={closeModal}
        text={gettext('The current transaction is not committed to the database. '
          +'Do you want to commit or rollback the transaction?')}
        onRollback={()=>{
          onExecutionDone();
          onRollbackClick();
        }}
        onCommit={()=>{
          onExecutionDone();
          onCommitClick();
        }}
      />
    ));
  };
  useEffect(()=>{
    if(isInTxn()) {
      setDisableButton('commit', false);
      setDisableButton('rollback', false);
      setDisableButton('execute-options', true);
    } else {
      setDisableButton('commit', true);
      setDisableButton('rollback', true);
      setDisableButton('execute-options', !queryToolCtx.params.is_query_tool);
    }
    eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE, warnTxnClose);
    return ()=>{
      eventBus.deregisterListener(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE, warnTxnClose);
    };
  }, [queryToolConnCtx.connectionStatus]);

  const onCommitClick=()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, 'COMMIT;', {external: true});
  };
  const onRollbackClick=()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, 'ROLLBACK;', {external: true});
  };
  const executeMacro = (m)=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, null, m.sql);
  };
  const onLimitChange=(e)=>{
    setLimit(e.target.value);
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SET_LIMIT,e.target.value);
  };
  const formatSQL=()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_FORMAT_SQL);
  };
  const toggleCase=()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_TOGGLE_CASE);
  };
  const clearQuery=()=>{
    confirmDiscard(()=>{
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, '');
    });
  };
  const onHelpClick=()=>{
    let url = url_for('help.static', {'filename': queryToolCtx.params.is_query_tool ? 'query_tool.html' : 'editgrid.html'});
    window.open(url, 'pgadmin_help');
  };
  const confirmDiscard=(callback, checkSaved=false)=>{
    if(checkSaved && buttonsDisabled['save']) {
      /* No need to check  */
      callback();
      return;
    }
    queryToolCtx.modal.confirm(
      gettext('Unsaved changes'),
      gettext('Are you sure you wish to discard the current changes?'),
      function() {
        callback();
      },
      function() {
        return true;
      }
    );
  };

  const executeCmd = (cmd)=>eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_EXEC_CMD, cmd);

  useEffect(()=>{
    if(queryToolPref) {
      /* Get the prefs first time */
      if(_.isUndefined(checkedMenuItems.auto_commit)) {
        setCheckedMenuItems({
          auto_commit: queryToolPref.auto_commit,
          auto_rollback: queryToolPref.auto_rollback,
          explain_verbose: queryToolPref.explain_verbose,
          explain_costs: queryToolPref.explain_costs,
          explain_buffers: queryToolPref.explain_buffers,
          explain_timing: queryToolPref.explain_timing,
          explain_summary: queryToolPref.explain_summary,
          explain_settings: queryToolPref.explain_settings,
          explain_wal: queryToolPref.explain_wal,
          open_in_new_tab: queryToolPref.open_in_new_tab,
        });
      }
    }
  }, [queryToolPref]);

  /* Button shortcuts */
  useKeyboardShortcuts([
    {
      shortcut: queryToolPref.btn_open_file,
      options: {
        callback: ()=>{openFile();}
      }
    },
    {
      shortcut: queryToolPref.btn_save_file,
      options: {
        callback: ()=>{!buttonsDisabled['save']&&saveFile(false);}
      }
    },
    {
      shortcut: queryToolPref.btn_edit_options,
      options: {
        callback: ()=>{queryToolCtx.params.is_query_tool&&toggleMenu({
          currentTarget: {name: 'menu-edit'}
        });}
      }
    },
    {
      shortcut: queryToolPref.btn_filter_dialog,
      options: {
        callback: ()=>{!buttonsDisabled['filter']&&onFilterClick();}
      }
    },
    {
      shortcut: queryToolPref.btn_filter_options,
      options: {
        callback: ()=>{!buttonsDisabled['filter']&&toggleMenu({
          currentTarget: {name: 'menu-filter'}
        });}
      }
    },
    {
      shortcut: queryToolPref.btn_cancel_query,
      options: {
        callback: ()=>{!buttonsDisabled['cancel']&&cancelQuery();}
      }
    },
    {
      shortcut: queryToolPref.btn_execute_options,
      options: {
        callback: ()=>{!buttonsDisabled['execute-options']&&toggleMenu({
          currentTarget: {name: 'menu-autocommit'}
        });}
      }
    },
    {
      shortcut: queryToolPref.execute_script,
      options: {
        callback: ()=>{!buttonsDisabled['execute']&&executeScript();}
      }
    },
    {
      shortcut: queryToolPref.execute_cursor,
      options: {
        callback: ()=>{!buttonsDisabled['execute']&&executeCursor();}
      }
    },
    {
      shortcut: queryToolPref.explain_query,
      options: {
        callback: (e)=>{e.preventDefault(); !buttonsDisabled['explain']&&explain();}
      }
    },
    {
      shortcut: queryToolPref.explain_analyze_query,
      options: {
        callback: ()=>{!buttonsDisabled['explain_analyse']&&explainAnalyse();}
      }
    },
    {
      shortcut: queryToolPref.commit_transaction,
      options: {
        callback: ()=>{onCommitClick();}
      }
    },
    {
      shortcut: queryToolPref.rollback_transaction,
      options: {
        callback: ()=>{onRollbackClick();}
      }
    },
    {
      shortcut: queryToolPref.toggle_case,
      options: {
        callback: ()=>{toggleCase();}
      }
    },
    {
      shortcut: queryToolPref.clear_query,
      options: {
        callback: ()=>{clearQuery();}
      }
    },
    {
      shortcut: queryToolPref.format_sql,
      options: {
        callback: ()=>{formatSQL();}
      }
    },
  ], containerRef);

  /* Macro shortcuts */
  useKeyboardShortcuts(
    queryToolCtx.params?.macros?.map((m)=>{
      return {
        shortcut: {
          ...m,
          'key': {
            'key_code': m.key_code,
            'char': m.key,
          },
        },
        options: {
          callback: ()=>{executeMacro(m);}
        }
      };
    }) || [],
    containerRef
  );

  /* Panel shortcuts */
  useKeyboardShortcuts([
    {
      shortcut: queryToolPref.move_previous,
      options: {
        callback: ()=>{
          LayoutDocker.moveTo('left');
        }
      }
    },
    {
      shortcut: queryToolPref.move_next,
      options: {
        callback: ()=>{
          LayoutDocker.moveTo('right');
        }
      }
    },
    {
      shortcut: queryToolPref.switch_panel,
      options: {
        callback: ()=>{
          LayoutDocker.switchPanel(queryToolCtx.docker);
        }
      }
    },
  ], containerRef);

  return (
    (<>
      <StyledBox>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Open File')} icon={<FolderRoundedIcon />} disabled={!queryToolCtx.params.is_query_tool}
            shortcut={queryToolPref.btn_open_file} onClick={openFile} />
          <PgIconButton title={gettext('Open in a new tab')} icon={<KeyboardArrowDownIcon />} splitButton disabled={!queryToolCtx.params.is_query_tool}
            name="menu-openfileintab" ref={openInNewTabMenuRef} onClick={toggleMenu}
          />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Save File')} icon={<SaveRoundedIcon />}
            shortcut={queryToolPref.btn_save_file} disabled={buttonsDisabled['save'] || !queryToolCtx.params.is_query_tool}
            onClick={()=>{saveFile(false);}} />
          <PgIconButton title={gettext('File')} icon={<KeyboardArrowDownIcon />} splitButton disabled={!queryToolCtx.params.is_query_tool}
            name="menu-saveas" ref={saveAsMenuRef} onClick={toggleMenu}
          />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Edit')} icon={
            <><EditRoundedIcon /><KeyboardArrowDownIcon style={{marginLeft: '-10px'}} /></>}
          disabled={!queryToolCtx.params.is_query_tool} shortcut={queryToolPref.btn_edit_options}
          name="menu-edit" ref={editMenuRef} onClick={toggleMenu}  />
        </PgButtonGroup>
        <PgButtonGroup size="small" >
          <PgIconButton title={gettext('Sort/Filter')} color={highlightFilter ? 'primary' : 'default'} icon={<FilterIcon />}
            onClick={onFilterClick} disabled={buttonsDisabled['filter']} shortcut={queryToolPref.btn_filter_dialog}/>
          <PgIconButton title={gettext('Filter options')} color={highlightFilter ? 'primary' : 'default'} icon={<KeyboardArrowDownIcon />} splitButton
            disabled={buttonsDisabled['filter']} name="menu-filter" ref={filterMenuRef} shortcut={queryToolPref.btn_filter_options}
            onClick={toggleMenu} />
        </PgButtonGroup>
        <InputSelectNonSearch options={[
          {label: gettext('No limit'), value: '-1'},
          {label: gettext('1000 rows'), value: '1000'},
          {label: gettext('500 rows'), value: '500'},
          {label: gettext('100 rows'), value: '100'},
        ]} value={limit} onChange={onLimitChange} disabled={buttonsDisabled['limit'] || queryToolCtx.params.is_query_tool} />
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Cancel query')} icon={<StopRoundedIcon style={{height: 'unset'}} />}
            onClick={cancelQuery} disabled={buttonsDisabled['cancel']} shortcut={queryToolPref.btn_cancel_query} />
          <PgIconButton title={gettext('Execute script')} icon={<PlayArrowRoundedIcon style={{height: 'unset'}} />}
            onClick={executeScript} disabled={buttonsDisabled['execute']} shortcut={queryToolPref.execute_script}/>
          <PgIconButton title={gettext('Execute query')} icon={<ExecuteQueryIcon style={{padding: '2px 5px'}} />}
            onClick={executeCursor} disabled={buttonsDisabled['execute'] || !queryToolCtx.params.is_query_tool} shortcut={queryToolPref.execute_cursor}/>
          <PgIconButton title={gettext('Execute options')} icon={<KeyboardArrowDownIcon />} splitButton
            name="menu-autocommit" ref={autoCommitMenuRef} shortcut={queryToolPref.btn_execute_options}
            onClick={toggleMenu} disabled={buttonsDisabled['execute-options']}/>
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Explain')} icon={<ExplicitRoundedIcon />}
            onClick={()=>{explain();}} disabled={buttonsDisabled['explain'] || !queryToolCtx.params.is_query_tool} shortcut={queryToolPref.explain_query}/>
          <PgIconButton title={gettext('Explain Analyze')} icon={<AssessmentRoundedIcon />}
            onClick={()=>{explainAnalyse();}} disabled={buttonsDisabled['explain_analyse'] || !queryToolCtx.params.is_query_tool} shortcut={queryToolPref.explain_analyze_query}/>
          <PgIconButton title={gettext('Explain Settings')} icon={<KeyboardArrowDownIcon />} splitButton
            disabled={!queryToolCtx.params.is_query_tool}
            name="menu-explain" ref={explainMenuRef} onClick={toggleMenu} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Commit')} icon={<CommitIcon />}
            onClick={onCommitClick} disabled={buttonsDisabled['commit']} shortcut={queryToolPref.commit_transaction}/>
          <PgIconButton title={gettext('Rollback')} icon={<RollbackIcon />}
            onClick={onRollbackClick} disabled={buttonsDisabled['rollback']} shortcut={queryToolPref.rollback_transaction}/>
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Macros')} icon={
            <><FormatListNumberedRoundedIcon /><KeyboardArrowDownIcon style={{marginLeft: '-10px'}} /></>}
          disabled={!queryToolCtx.params.is_query_tool} name="menu-macros" ref={macrosMenuRef} onClick={toggleMenu} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Help')} icon={<HelpIcon />} onClick={onHelpClick} />
        </PgButtonGroup>
      </StyledBox>
      <PgMenu
        anchorRef={openInNewTabMenuRef}
        open={openMenuName=='menu-openfileintab'}
        onClose={onMenuClose}
        label={gettext('Open file Menu')}
      >
        <PgMenuItem hasCheck value="open_in_new_tab" checked={checkedMenuItems['open_in_new_tab']}
          onClick={checkMenuClick}>{gettext('Open in a new tab?')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={saveAsMenuRef}
        open={openMenuName=='menu-saveas'}
        onClose={onMenuClose}
        label={gettext('Save As')}
      >
        <PgMenuItem onClick={()=>{saveFile(true);}}>{gettext('Save As')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={editMenuRef}
        open={openMenuName=='menu-edit'}
        onClose={onMenuClose}
        label={gettext('Edit Menu')}
      >
        <PgMenuItem shortcut={queryToolPref.find}
          onClick={()=>{eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_FIND_REPLACE, false);}}>{gettext('Find')}</PgMenuItem>
        <PgMenuItem shortcut={queryToolPref.replace}
          onClick={()=>{eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_FIND_REPLACE, true);}}>{gettext('Replace')}</PgMenuItem>
        <PgMenuItem shortcut={queryToolPref.gotolinecol}
          onClick={()=>{executeCmd('gotoLineCol');}}>{gettext('Go to Line/Column')}</PgMenuItem>
        <PgMenuDivider />
        <PgMenuItem shortcut={queryToolPref.indent}
          onClick={()=>{executeCmd('indentMore');}}>{gettext('Indent Selection')}</PgMenuItem>
        <PgMenuItem shortcut={queryToolPref.unindent}
          onClick={()=>{executeCmd('indentLess');}}>{gettext('Unindent Selection')}</PgMenuItem>
        <PgMenuItem shortcut={queryToolPref.comment}
          onClick={()=>{executeCmd('toggleComment');}}>{gettext('Toggle Comment')}</PgMenuItem>
        <PgMenuItem shortcut={queryToolPref.toggle_case}
          onClick={toggleCase}>{gettext('Toggle Case Of Selected Text')}</PgMenuItem>
        <PgMenuItem shortcut={queryToolPref.clear_query}
          onClick={clearQuery}>{gettext('Clear Query')}</PgMenuItem>
        <PgMenuDivider />
        <PgMenuItem shortcut={queryToolPref.format_sql} onClick={formatSQL}>{gettext('Format SQL')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={filterMenuRef}
        open={openMenuName=='menu-filter'}
        onClose={onMenuClose}
        label={gettext('Filter Options Menu')}
      >
        <PgMenuItem onClick={()=>{eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_INCLUDE_EXCLUDE_FILTER, true);}}>{gettext('Filter by Selection')}</PgMenuItem>
        <PgMenuItem onClick={()=>{eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_INCLUDE_EXCLUDE_FILTER, false);}}>{gettext('Exclude by Selection')}</PgMenuItem>
        <PgMenuItem onClick={()=>{eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_REMOVE_FILTER);}}>{gettext('Remove Sort/Filter')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={autoCommitMenuRef}
        open={openMenuName=='menu-autocommit'}
        onClose={onMenuClose}
        label={gettext('Execute Options Menu')}
      >
        <PgMenuItem hasCheck value="auto_commit" checked={checkedMenuItems['auto_commit']}
          onClick={checkMenuClick}>{gettext('Auto commit?')}</PgMenuItem>
        <PgMenuItem hasCheck value="auto_rollback" checked={checkedMenuItems['auto_rollback']}
          onClick={checkMenuClick}>{gettext('Auto rollback on error?')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={explainMenuRef}
        open={openMenuName=='menu-explain'}
        onClose={onMenuClose}
        label={gettext('Explain Options Menu')}
      >
        <PgMenuItem hasCheck value="explain_verbose" checked={checkedMenuItems['explain_verbose']}
          onClick={checkMenuClick}>{gettext('Verbose')}</PgMenuItem>
        <PgMenuItem hasCheck value="explain_costs" checked={checkedMenuItems['explain_costs']}
          onClick={checkMenuClick}>{gettext('Costs')}</PgMenuItem>
        <PgMenuItem hasCheck value="explain_buffers" checked={checkedMenuItems['explain_buffers']}
          onClick={checkMenuClick}>{gettext('Buffers')}</PgMenuItem>
        <PgMenuItem hasCheck value="explain_timing" checked={checkedMenuItems['explain_timing']}
          onClick={checkMenuClick}>{gettext('Timing')}</PgMenuItem>
        <PgMenuItem hasCheck value="explain_summary" checked={checkedMenuItems['explain_summary']}
          onClick={checkMenuClick}>{gettext('Summary')}</PgMenuItem>
        <PgMenuItem hasCheck value="explain_settings" checked={checkedMenuItems['explain_settings']}
          onClick={checkMenuClick}>{gettext('Settings')}</PgMenuItem>
        <PgMenuItem hasCheck value="explain_wal" checked={checkedMenuItems['explain_wal']}
          onClick={checkMenuClick}>{gettext('Wal')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={macrosMenuRef}
        open={openMenuName=='menu-macros'}
        onClose={onMenuClose}
        label={gettext('Macros Menu')}
      >
        <PgMenuItem onClick={onManageMacros}>{gettext('Manage macros')}</PgMenuItem>
        <PgMenuItem onClick={onAddToMacros}>{gettext('Add to macros')}</PgMenuItem>
        <PgMenuDivider />
        {queryToolCtx.params?.macros?.map((m)=>{
          return (
            <PgMenuItem shortcut={{
              ...m,
              'key': {
                'key_code': m.key_code,
                'char': m.key,
              },
            }} onClick={()=>executeMacro(m)} key={m.name}>
              {m.name}
            </PgMenuItem>
          );
        })}
      </PgMenu>
    </>)
  );
}

MainToolBar.propTypes = {
  containerRef: CustomPropTypes.ref,
  onFilterClick: PropTypes.func,
  onManageMacros: PropTypes.func,
  onAddToMacros: PropTypes.func
};
