/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import CodeMirror from '../../../../../../static/js/components/ReactCodeMirror';
import { PANELS, QUERY_TOOL_EVENTS, MODAL_DIALOGS } from '../QueryToolConstants';
import url_for from 'sources/url_for';
import { LayoutDockerContext, LAYOUT_EVENTS } from '../../../../../../static/js/helpers/Layout';
import ConfirmSaveContent from '../../../../../../static/js/Dialogs/ConfirmSaveContent';
import gettext from 'sources/gettext';
import { isMac } from '../../../../../../static/js/keyboard_shortcuts';
import { checkTrojanSource, isShortcutValue, parseKeyEventValue, parseShortcutValue } from '../../../../../../static/js/utils';
import { parseApiError } from '../../../../../../static/js/api_instance';
import { usePgAdmin } from '../../../../../../static/js/PgAdminProvider';
import ConfirmPromotionContent from '../dialogs/ConfirmPromotionContent';
import ConfirmExecuteQueryContent from '../dialogs/ConfirmExecuteQueryContent';
import usePreferences from '../../../../../../preferences/static/js/store';
import { getTitle } from '../../sqleditor_title';
import PropTypes from 'prop-types';
import { useApplicationState } from '../../../../../../settings/static/ApplicationStateProvider';
import { useDelayDebounce } from '../../../../../../static/js/custom_hooks';

async function registerAutocomplete(editor, api, transId) {
  editor.registerAutocomplete((context, onAvailable)=>{
    return new Promise((resolve, reject)=>{
      const url = url_for('sqleditor.autocomplete', {
        'trans_id': transId,
      });
      const word = context.matchBefore(/\w*/);
      const fullSql = context.state.doc.toString();
      const sqlTillCur = context.state.sliceDoc(0, context.state.selection.main.head);
      api.post(url, JSON.stringify([fullSql, sqlTillCur]))
        .then((res) => {
          onAvailable();
          resolve({
            from: word.from,
            options: Object.keys(res.data.data.result).map((key)=>({
              label: key, type: res.data.data.result[key].object_type
            })),
            validFor: (text, from)=>{
              return text.startsWith(fullSql.slice(from));
            }
          });
        })
        .catch((err) => {
          onAvailable();
          reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
        });
    });
  });
}

export default function Query({onTextSelect, setQtStatePartial}) {
  const editor = React.useRef();
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const layoutDocker = useContext(LayoutDockerContext);
  const lastCursorPos = React.useRef();
  const pgAdmin = usePgAdmin();
  const {saveToolData, isSaveToolDataEnabled, getQueryToolContent, deleteToolData} = useApplicationState();
  const preferencesStore = usePreferences();
  const modalId = MODAL_DIALOGS.QT_CONFIRMATIONS;

  const highlightError = (cmObj, {errormsg: result, data}, executeCursor)=>{
    let errorLineNo = 0,
      startMarker = 0,
      endMarker = 0,
      selectedLineNo = 1,
      origQueryLen = cmObj.getValue().length;

    cmObj.removeErrorMark();

    // In case of selection we need to find the actual line no
    if (cmObj.getSelection().length > 0 || executeCursor) {
      selectedLineNo = cmObj.getCurrentLineNo();
      origQueryLen = cmObj.getLine(selectedLineNo).length;
    }

    // Fetch the LINE string using regex from the result
    let line = /LINE (\d+)/.exec(result),
      // Fetch the Character string using regex from the result
      char = /Character: (\d+)/.exec(result);

    // If line and character is null then no need to mark
    if (line != null && char != null) {
      errorLineNo = parseInt(line[1]) + selectedLineNo - 1;
      let errorCharNo = parseInt(char[1]) - 1;

      /* If explain query has been run we need to
        calculate the character number.
      */
      if(data.explain_query_length) {
        let explainQueryLen = data.explain_query_length - parseInt(char[1]);
        errorCharNo = origQueryLen - explainQueryLen - 1;
      }

      /* We need to loop through each line till the error line and
        * count the total no of character to figure out the actual
        * starting/ending marker point for the individual line. We
        * have also added 1 per line for the "\n" character.
        */
      let prevLineChars = 0;
      for (let i = selectedLineNo; i < errorLineNo; i++)
        prevLineChars += cmObj.getLine(i).length;

      /* Marker starting point for the individual line is
        * equal to error character index minus total no of
        * character till the error line starts.
        */
      startMarker = errorCharNo - prevLineChars;

      // Find the next space from the character or end of line
      let errorLine = cmObj.getLine(errorLineNo);

      if (_.isUndefined(errorLine)) return;
      endMarker = errorLine.indexOf(' ', startMarker);
      if (endMarker < 0)
        endMarker = errorLine.length;

      // Mark the error text
      cmObj.setErrorMark({
        line: errorLineNo,
        pos: startMarker,
      }, {
        line: errorLineNo,
        pos: endMarker,
      });

      cmObj.focus();
      cmObj.setCursor(errorLineNo, endMarker);
    }
  };
  const triggerExecution = (explainObject, macroSQL, executeCursor=false)=>{
    if(queryToolCtx.params.is_query_tool) {
      let external = null;
      let query = editor.current?.getSelection();
      if(!_.isEmpty(macroSQL)) {
        const regex = /\$SELECTION\$/gi;
        query =  macroSQL.replace(regex, query);
        external = true;
      } else if(executeCursor) {
        /* Execute query at cursor position */
        query = query || editor.current?.getQueryAt(editor.current?.state.selection.head).value || '';
      } else {
        /* Normal execution */
        query = query || editor.current?.getValue() || '';
      }
      if(query) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, query, {explainObject, macroSQL, external, executeCursor});
      }
    } else {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, null, {});
    }
  };

  const warnReloadFile = (fileName, storage=null)=>{
    queryToolCtx.modal.confirm(
      gettext('Reload file?'),
      gettext('The file has been modified by another program. Do you want to reload it and loose changes made in pgadmin?'),
      function() {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE, fileName);
        deleteToolData();
      },
      function() {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_GET_QUERY_CONTENT);
        eventBus.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE_DONE, fileName, true, storage);
      }
    );
  };

  useEffect(()=>{
    layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.ACTIVE, (currentTabId)=>{
      currentTabId == PANELS.QUERY && editor.current.focus();
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, triggerExecution);

    eventBus.registerListener(QUERY_TOOL_EVENTS.EXECUTE_CURSOR_WARNING, checkUnderlineQueryCursorWarning);

    eventBus.registerListener(QUERY_TOOL_EVENTS.HIGHLIGHT_ERROR, (result, executeCursor)=>{
      if(result) {
        highlightError(editor.current, result, executeCursor);
      } else {
        editor.current.removeErrorMark();
      }
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.LOAD_FILE, (fileName, storage)=>{
      queryToolCtx.api.post(url_for('sqleditor.load_file'), {
        'file_name': decodeURI(fileName),
        'storage': storage
      }, {transformResponse: [(data, headers) => {
        if(headers['content-type'].includes('application/json')) {
          return JSON.parse(data);
        }
        return data;
      }]}).then((res)=>{
        editor.current.setValue(res.data);
        //Check the file content for Trojan Source
        checkTrojanSource(res.data);
        eventBus.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE_DONE, fileName, true, storage);
        // Detect line separator from content and editor's EOL.
        const lineSep = editor.current?.detectEOL(res.data);
        // Update the EOL if it differs from the current editor EOL
        setQtStatePartial({ eol: lineSep });
        // Mark the editor content as clean
        editor.current?.markClean();
      }).catch((err)=>{
        eventBus.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE_DONE, null, false, storage);
        pgAdmin.Browser.notifier.error(parseApiError(err));
      });
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.SAVE_FILE, (fileName)=>{
      queryToolCtx.api.post(url_for('sqleditor.save_file'), {
        'file_name': decodeURI(fileName),
        'file_content': editor.current.getValue(false, true),
      }).then(()=>{
        editor.current.markClean();
        eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, fileName, true);
        pgAdmin.Browser.notifier.success(gettext('File saved successfully.'));
      }).catch((err)=>{
        eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, null, false);
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err);
      });
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.COPY_TO_EDITOR, (text)=>{
      editor.current?.setValue(text);
      eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.QUERY);
      setTimeout(()=>{
        editor.current?.focus();
        editor.current?.setCursor(editor.current.lineCount(), 0);
      }, 250);
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, (value, focus=true)=>{
      focus && editor.current?.focus();
      editor.current?.setValue(value, !queryToolCtx.params.is_query_tool);
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_QUERY_CHANGE, ()=>{
      change();
    });
    
    eventBus.registerListener(QUERY_TOOL_EVENTS.CHANGE_EOL, (lineSep)=>{
      // Set the new EOL character in the editor.
      editor.current?.setEOL(lineSep);
      eventBus.fireEvent(QUERY_TOOL_EVENTS.QUERY_CHANGED, editor.current?.isDirty());
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_TOGGLE_CASE, ()=>{
      let selectedText = editor.current?.getSelection();
      if (!selectedText) return;

      if (selectedText === selectedText.toUpperCase()) {
        editor.current.replaceSelection(selectedText.toLowerCase());
      } else {
        editor.current.replaceSelection(selectedText.toUpperCase());
      }
    });

    const lastFocus = ()=>{
      editor.current.focus();
      if(lastCursorPos.current) {
        editor.current.setCursor(lastCursorPos.current.line, lastCursorPos.current.ch);
      }
    };

    eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_LAST_FOCUS, lastFocus);
    setTimeout(()=>{
      (queryToolCtx.params.is_query_tool|| queryToolCtx.preferences.view_edit_promotion_warning) && editor.current.focus();
    }, 250);

    eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_RELOAD_FILE, warnReloadFile);

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_SAVE_QUERY_TOOL_DATA, ()=>{
      setSaveQtData(true);
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_GET_QUERY_CONTENT, async ()=>{
      let sqlValue = await getQueryToolContent();
      if(sqlValue){
        eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, sqlValue);
        // call delete appplication state api
        deleteToolData();
      }
    });
  }, []);

  useEffect(()=>{
    const warnSaveTextClose = ()=>{
      if(!editor.current.isDirty() || !queryToolCtx.preferences?.sqleditor.prompt_save_query_changes) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE);
        return;
      }
      queryToolCtx.modal.showModal(gettext('Save query changes?'), (closeModal)=>(
        <ConfirmSaveContent
          closeModal={closeModal}
          text={gettext('The query text has changed. Do you want to save changes?')}
          onDontSave={()=>{
            eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE);
          }}
          onSave={()=>{
            eventBus.registerListener(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, (_f, success)=>{
              if(success) {
                eventBus.fireEvent(QUERY_TOOL_EVENTS.WARN_TXN_CLOSE);
              }
            }, true);
            eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_FILE);
          }}
        />
      ), {id:modalId});
    };

    const createKeyObjectFromShortcut = (pref)=>{
      // this function creates a key object from the shortcut preference
      let key = {
        keyCode: pref.key.key_code,
        metaKey: false,
        ctrlKey: pref.control,
        shiftKey: pref.shift,
        altKey: pref.alt,
      };
      if(isMac() && pref.ctrl_is_meta) {
        key.metaKey = pref.control;
        key.ctrlKey = false;
      }
      return key;
    };

    const unregisterEditorExecCmd = eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_EXEC_CMD, (cmd='')=>{
      let key = {}, gotolinecol = queryToolCtx.preferences.sqleditor.goto_line_col,
        formatSql = queryToolCtx.preferences.sqleditor.format_sql;
      switch(cmd) {
      case 'gotoLineCol':
        key = createKeyObjectFromShortcut(gotolinecol);
        break;
      case 'formatSql':
        key = createKeyObjectFromShortcut(formatSql);
        break;
      default:
        editor.current?.execCommand(cmd);
        return;
      }
      editor.current?.fireDOMEvent(new KeyboardEvent('keydown', key));
    });

    const unregisterFindReplace = eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_FIND_REPLACE, (replace=false)=>{
      let findShortcut = queryToolCtx.preferences.sqleditor.find;
      let replaceShortcut = queryToolCtx.preferences.sqleditor.replace;
      let key ={};
      editor.current?.focus();
      if (!replace) {
        key = createKeyObjectFromShortcut(findShortcut);
      } else {
        key = createKeyObjectFromShortcut(replaceShortcut);
      }
      editor.current?.fireDOMEvent(new KeyboardEvent('keydown', key));
    });

    const unregisterWarn = eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_SAVE_TEXT_CLOSE, warnSaveTextClose);

    return ()=>{
      unregisterWarn();
      unregisterEditorExecCmd();
      unregisterFindReplace();
    };
  }, [queryToolCtx.preferences]);

  useEffect(()=>{
    registerAutocomplete(editor.current, queryToolCtx.api, queryToolCtx.params.trans_id);
  }, [queryToolCtx.params.trans_id]);

  const cursorActivity = useCallback(_.debounce((cursor)=>{
    if (queryToolCtx.preferences.sqleditor.underline_query_cursor){
      let {from, to}=editor.current.getQueryAt(editor.current?.state.selection.head);
      editor.current.setQueryHighlightMark(from,to);
    }

    lastCursorPos.current = cursor;
    eventBus.fireEvent(QUERY_TOOL_EVENTS.CURSOR_ACTIVITY, [lastCursorPos.current.line, lastCursorPos.current.ch+1]);
  }, 100), []);

  const change = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.QUERY_CHANGED, editor.current.isDirty());

    if(isSaveToolDataEnabled('sqleditor') && editor.current.isDirty()){
      eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_QUERY_TOOL_DATA);
    }

    if(!queryToolCtx.params.is_query_tool && editor.current.isDirty()){
      if(queryToolCtx.preferences.sqleditor.view_edit_promotion_warning){
        checkViewEditDataPromotion();
      } else {
        promoteToQueryTool();
      }
    }
  }, []);


  const [saveQtData, setSaveQtData] = useState(false);
  useDelayDebounce(()=>{
    let connectionInfo = { ..._.find(queryToolCtx.connection_list, c => c.is_selected),
      'open_file_name':queryToolCtx.current_file, 'is_editor_dirty': editor.current.isDirty() };
    saveToolData('sqleditor', connectionInfo, queryToolCtx.params.trans_id, editor.current.getValue());
    setSaveQtData(false);
  }, saveQtData, 500);

  const closePromotionWarning = (closeModal)=>{
    if(editor.current.isDirty()) {
      editor.current.execCommand('undo');
      closeModal?.();
    }
  };

  const checkViewEditDataPromotion = () => {
    queryToolCtx.modal.showModal(gettext('Promote to Query Tool'), (closeModal) =>{
      return (<ConfirmPromotionContent
        closeModal={closeModal}
        text={'Manually editing the query will cause this View/Edit Data tab to be converted to a Query Tool tab. You will be able to edit the query text freely, but no longer be able to use the toolbar buttons for sorting and filtering data. </br> Do you wish to continue?'}
        onContinue={(formData)=>{
          promoteToQueryTool();
          let cursor = editor.current.getCursor();
          editor.current.setValue(editor.current.getValue());
          editor.current.setCursor(cursor.line, cursor.ch);
          editor.current.focus();
          let title = getTitle(pgAdmin, queryToolCtx.preferences.browser, null,null,queryToolCtx.params.server_name, queryToolCtx.params.dbname, queryToolCtx.params.user);
          queryToolCtx.updateTitle(title);
          preferencesStore.setPreference(formData);
          return true;
        }}
        onClose={()=>{
          closePromotionWarning(closeModal);
        }}
      />);
    }, {
      onClose:()=>{
        closePromotionWarning();
      }
    });
  };

  const checkUnderlineQueryCursorWarning = () => {
    let query = editor.current?.getSelection();
    query = query || editor.current?.getQueryAt(editor.current?.state.selection.head).value || '';
    query && queryToolCtx.modal.showModal(gettext('Execute query'), (closeModal) =>{
      return (<ConfirmExecuteQueryContent
        closeModal={closeModal}
        text={query}
        onContinue={(formData)=>{
          preferencesStore.setPreference(formData);
          eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, null, '', true);
        }}
        onClose={()=>{
          closeModal?.();
        }}
      />);
    }, {
      onClose:(closeModal)=>{
        closeModal?.();
      }
    });
  };

  const promoteToQueryTool = () => {
    if(!queryToolCtx.params.is_query_tool){
      queryToolCtx.toggleQueryTool();
      queryToolCtx.params.is_query_tool = true;
      eventBus.fireEvent(QUERY_TOOL_EVENTS.PROMOTE_TO_QUERY_TOOL);
    }
  };

  const shortcutOverrideKeys = useMemo(
    ()=>{
      // omit CM internal shortcuts
      const queryToolPref = _.omit(queryToolCtx.preferences.sqleditor, ['indent', 'unindent']);
      const queryToolShortcuts = Object.values(queryToolPref)
        .filter((p)=>isShortcutValue(p))
        .map((p)=>parseShortcutValue(p));

      return [{
        any: (_v, e)=>{
          const eventStr = parseKeyEventValue(e);
          if(queryToolShortcuts.includes(eventStr)) {
            queryToolCtx.mainContainerRef?.current?.dispatchEvent(new KeyboardEvent('keydown', {
              which: e.which,
              keyCode: e.keyCode,
              altKey: e.altKey,
              shiftKey: e.shiftKey,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
            }));
            e.preventDefault();
            e.stopPropagation();
            return true;
          }
          return false;
        },
      }];
    },
    [queryToolCtx.preferences]
  );

  return <CodeMirror
    currEditor={(obj)=>{
      editor.current=obj;
    }}
    value={''}
    onCursorActivity={cursorActivity}
    onChange={change}
    autocomplete={true}
    customKeyMap={shortcutOverrideKeys}
    onTextSelect={onTextSelect}
    disabled={queryToolCtx.editor_disabled}
  />;
}


Query.propTypes = {
  onTextSelect: PropTypes.func,
  setQtStatePartial: PropTypes.func
};
