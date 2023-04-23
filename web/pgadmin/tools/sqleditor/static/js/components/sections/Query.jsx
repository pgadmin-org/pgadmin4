/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { makeStyles } from '@material-ui/styles';
import React, {useContext, useCallback, useEffect } from 'react';
import { QueryToolContext, QueryToolEventsContext } from '../QueryToolComponent';
import CodeMirror from '../../../../../../static/js/components/CodeMirror';
import {PANELS, QUERY_TOOL_EVENTS} from '../QueryToolConstants';
import url_for from 'sources/url_for';
import { LayoutEventsContext, LAYOUT_EVENTS } from '../../../../../../static/js/helpers/Layout';
import ConfirmSaveContent from '../../../../../../static/js/Dialogs/ConfirmSaveContent';
import gettext from 'sources/gettext';
import OrigCodeMirror from 'bundled_codemirror';
import Notifier from '../../../../../../static/js/helpers/Notifier';
import { isMac } from '../../../../../../static/js/keyboard_shortcuts';
import { checkTrojanSource } from '../../../../../../static/js/utils';
import { parseApiError } from '../../../../../../static/js/api_instance';

const useStyles = makeStyles(()=>({
  sql: {
    height: '100%',
  }
}));

function registerAutocomplete(api, transId, sqlEditorPref, onFailure) {
  let timeoutId;
  let loadingEle;
  let prevSearch = null;
  OrigCodeMirror.registerHelper('hint', 'sql', function (editor) {
    let data = [],
      doc = editor.getDoc(),
      cur = doc.getCursor(),
      // function context
      ctx = {
        editor: editor,
        // URL for auto-complete
        url: url_for('sqleditor.autocomplete', {
          'trans_id': transId,
        }),
        data: data,
        // Get the line number in the cursor position
        current_line: cur.line,
        /*
         * Render function for hint to add our own class
         * and icon as per the object type.
         */
        hint_render: function (elt, data_arg, cur_arg) {
          let el = document.createElement('span');
          switch (cur_arg.type) {
          case 'database':
            el.className = 'sqleditor-hint pg-icon-' + cur_arg.type;
            break;
          case 'datatype':
            el.className = 'sqleditor-hint icon-type';
            break;
          case 'keyword':
            el.className = 'sqleditor-hint icon-key';
            break;
          case 'table alias':
            el.className = 'sqleditor-hint icon-at';
            break;
          case 'join':
          case 'fk join':
            el.className = 'sqleditor-hint icon-join';
            break;
          default:
            el.className = 'sqleditor-hint icon-' + cur_arg.type;
          }

          el.appendChild(document.createTextNode(cur_arg.text));
          elt.appendChild(el);
        },
      };

    data.push(doc.getValue());

    if (!editor.state.autoCompleteList)
      editor.state.autoCompleteList = [];

    // This function is used to show the loading element until response comes.
    const showLoading = (editor)=>{
      if (editor.getInputField().getAttribute('aria-activedescendant') != null) {
        hideLoading();
        return;
      }

      if(!loadingEle) {
        let ownerDocument = editor.getInputField().ownerDocument;
        loadingEle = ownerDocument.createElement('div');
        loadingEle.className = 'CodeMirror-hints';
        let iconEle = ownerDocument.createElement('div');
        iconEle.className = 'icon-spinner';
        iconEle.style.marginTop = '4px';
        iconEle.style.marginLeft = '2px';

        let spanEle = ownerDocument.createElement('span');
        spanEle.innerText = gettext('Loading...');
        spanEle.style.marginLeft = '17px';

        iconEle.appendChild(spanEle);
        loadingEle.appendChild(iconEle);
        ownerDocument.body.appendChild(loadingEle);
      }
      let pos = editor.cursorCoords(true);
      loadingEle.style.left = pos.left + 'px';
      loadingEle.style.top = pos.bottom + 'px';
      loadingEle.style.height = '25px';
    };

    // This function is used to hide the loading element.
    const hideLoading = ()=>{
      loadingEle?.parentNode?.removeChild(loadingEle);
      loadingEle = null;
    };

    return {
      then: function (cb) {
        let self_local = this;

        // This function is used to filter the data and call the callback
        // function with that filtered data.
        function setAutoCompleteData() {
          const searchRe = new RegExp('^"{0,1}' + search, 'i');
          let filterData = self_local.editor.state.autoCompleteList.filter((item)=>{
            return searchRe.test(item.text);
          });

          cb({
            list: filterData,
            from: {
              line: self_local.current_line,
              ch: start,
            },
            to: {
              line: self_local.current_line,
              ch: end,
            },
          });
        }

        /*
         * Below logic find the start and end point
         * to replace the selected auto complete suggestion.
         */
        let token = self_local.editor.getTokenAt(cur),
          start, end, search;
        if (token.end > cur.ch) {
          token.end = cur.ch;
          token.string = token.string.slice(0, cur.ch - token.start);
        }

        if (token.string.match(/^[."`\w@]\w*$/)) {
          search = token.string;
          start = token.start;
          end = token.end;
        } else {
          start = end = cur.ch;
          search = '';
        }

        /*
         * Added 1 in the start position if search string
         * started with "." or "`" else auto complete of code mirror
         * will remove the "." when user select any suggestion.
         */
        if (search.charAt(0) == '.' || search.charAt(0) == '``') {
          start += 1;
          search = search.slice(1);
        }

        // Handled special case when autocomplete on keypress is off,
        // the query is cleared, and retype some other words and press CTRL/CMD + Space.
        if (!sqlEditorPref.autocomplete_on_key_press && start == 0)
          self_local.editor.state.autoCompleteList = [];

        // Clear the auto complete list if previous token/search is blank or dot.
        if (prevSearch == '' || prevSearch == '.' || prevSearch == '"')
          self_local.editor.state.autoCompleteList = [];

        prevSearch = search;
        // Get the text from start to the current cursor position.
        self_local.data.push(
          doc.getRange({
            line: 0,
            ch: 0,
          }, {
            line: self_local.current_line,
            ch: token.start + 1,
          })
        );

        // If search token is not empty and auto complete list have some data
        // then no need to send the request to the backend to fetch the data.
        // auto complete the data using already fetched list.
        if (search != '' && self_local.editor.state.autoCompleteList.length != 0) {
          setAutoCompleteData();
          return;
        }

        //Show loading indicator
        showLoading(self_local.editor);

        timeoutId && clearTimeout(timeoutId);
        timeoutId = setTimeout(()=> {
          timeoutId = null;
          // Make ajax call to find the autocomplete data
          api.post(self_local.url, JSON.stringify(self_local.data))
            .then((res) => {
              hideLoading();
              let result = [];

              _.each(res.data.data.result, function (obj, key) {
                result.push({
                  text: key,
                  type: obj.object_type,
                  render: self_local.hint_render,
                });
              });

              self_local.editor.state.autoCompleteList = result;
              setAutoCompleteData();
            })
            .catch((err) => {
              hideLoading();
              onFailure?.(err);
            });
        }, 300);
      }.bind(ctx),
    };
  });
}

export default function Query() {
  const classes = useStyles();
  const editor = React.useRef();
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const layoutEvenBus = useContext(LayoutEventsContext);
  const lastCursorPos = React.useRef();
  const lastSavedText = React.useRef('');
  const markedLine = React.useRef(0);
  const marker = React.useRef();

  const removeHighlightError = (cmObj)=>{
    // Remove already existing marker
    marker.current?.clear();
    cmObj.removeLineClass(markedLine.current, 'wrap', 'CodeMirror-activeline-background');
    markedLine.current = 0;
  };
  const highlightError = (cmObj, result)=>{
    let errorLineNo = 0,
      startMarker = 0,
      endMarker = 0,
      selectedLineNo = 0;

    removeHighlightError(cmObj);

    // In case of selection we need to find the actual line no
    if (cmObj.getSelection().length > 0)
      selectedLineNo = cmObj.getCursor(true).line;

    // Fetch the LINE string using regex from the result
    let line = /LINE (\d+)/.exec(result),
      // Fetch the Character string using regex from the result
      char = /Character: (\d+)/.exec(result);

    // If line and character is null then no need to mark
    if (line != null && char != null) {
      errorLineNo = (parseInt(line[1]) - 1) + selectedLineNo;
      let errorCharNo = (parseInt(char[1]) - 1);

      /* We need to loop through each line till the error line and
        * count the total no of character to figure out the actual
        * starting/ending marker point for the individual line. We
        * have also added 1 per line for the "\n" character.
        */
      let prevLineChars = 0;
      for (let i = selectedLineNo > 0 ? selectedLineNo : 0; i < errorLineNo; i++)
        prevLineChars += cmObj.getLine(i).length + 1;

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
      marker.current = cmObj.markText({
        line: errorLineNo,
        ch: startMarker,
      }, {
        line: errorLineNo,
        ch: endMarker,
      }, {
        className: 'sql-editor-mark',
      });

      markedLine.current = errorLineNo;
      cmObj.addLineClass(errorLineNo, 'wrap', 'CodeMirror-activeline-background');
      cmObj.focus();
      cmObj.setCursor(errorLineNo, 0);
    }
  };

  const triggerExecution = (explainObject, macroSQL)=>{
    if(queryToolCtx.params.is_query_tool) {
      let external = null;
      let query = editor.current?.getSelection();
      if(!_.isUndefined(macroSQL)) {
        const regex = /\$SELECTION\$/gi;
        query =  macroSQL.replace(regex, query);
        external = true;
      } else{
        /* Normal execution */
        query = query || editor.current?.getValue() || '';
      }
      if(query) {
        eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, query, explainObject, external);
      }
    } else {
      eventBus.fireEvent(QUERY_TOOL_EVENTS.EXECUTION_START, null, null);
    }
  };

  useEffect(()=>{
    layoutEvenBus.registerListener(LAYOUT_EVENTS.ACTIVE, (currentTabId)=>{
      currentTabId == PANELS.QUERY && editor.current.focus();
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_EXECUTION, triggerExecution);

    eventBus.registerListener(QUERY_TOOL_EVENTS.HIGHLIGHT_ERROR, (result)=>{
      if(result) {
        highlightError(editor.current, result);
      } else {
        removeHighlightError(editor.current);
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
        lastSavedText.current = res.data;
        eventBus.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE_DONE, fileName, true);
      }).catch((err)=>{
        eventBus.fireEvent(QUERY_TOOL_EVENTS.LOAD_FILE_DONE, null, false);
        Notifier.error(parseApiError(err));
      });
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.SAVE_FILE, (fileName)=>{
      let editorValue = editor.current.getValue();
      queryToolCtx.api.post(url_for('sqleditor.save_file'), {
        'file_name': decodeURI(fileName),
        'file_content': editor.current.getValue(),
      }).then(()=>{
        lastSavedText.current = editorValue;
        eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, fileName, true);
        eventBus.fireEvent(QUERY_TOOL_EVENTS.QUERY_CHANGED, isDirty());
        Notifier.success(gettext('File saved successfully.'));
      }).catch((err)=>{
        eventBus.fireEvent(QUERY_TOOL_EVENTS.SAVE_FILE_DONE, null, false);
        eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err);
      });
    });

    eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_EXEC_CMD, (cmd='')=>{
      editor.current?.execCommand(cmd);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.COPY_TO_EDITOR, (text)=>{
      editor.current?.setValue(text);
      eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.QUERY);
      setTimeout(()=>{
        editor.current?.focus();
        editor.current?.setCursor(editor.current.lineCount(), 0);
      }, 250);
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_FIND_REPLACE, (replace=false)=>{
      editor.current?.focus();
      let key = {
        keyCode: 70, metaKey: false, ctrlKey: true, shiftKey: replace, altKey: false,
      };
      if(isMac()) {
        key.metaKey = true;
        key.ctrlKey = false;
        key.shiftKey = false;
        key.altKey = replace;
      }
      editor.current?.triggerOnKeyDown(
        new KeyboardEvent('keydown', key)
      );
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, (value, focus=true)=>{
      focus && editor.current?.focus();
      editor.current?.setValue(value);
      if (value == '' && editor.current) {
        editor.current.state.autoCompleteList = [];
      }
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_QUERY_CHANGE, ()=>{
      change();
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.WARN_SAVE_TEXT_CLOSE, ()=>{
      if(!isDirty() || !queryToolCtx.preferences?.sqleditor.prompt_save_query_changes) {
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
      ));
    });
    eventBus.registerListener(QUERY_TOOL_EVENTS.TRIGGER_FORMAT_SQL, ()=>{
      let selection = true, sql = editor.current?.getSelection();
      if(sql == '') {
        sql = editor.current.getValue();
        selection = false;
      }
      queryToolCtx.api.post(url_for('sql.format'), {
        'sql': sql,
      }).then((res)=>{
        if(selection) {
          editor.current.replaceSelection(res.data.data.sql, 'around');
        } else {
          editor.current.setValue(res.data.data.sql);
        }
      }).catch(()=>{/* failure should be ignored */});
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
      editor.current.focus();
    }, 250);
  }, []);

  useEffect(()=>{
    registerAutocomplete(queryToolCtx.api, queryToolCtx.params.trans_id, queryToolCtx.preferences.sqleditor,
      (err)=>{eventBus.fireEvent(QUERY_TOOL_EVENTS.HANDLE_API_ERROR, err);}
    );
  }, [queryToolCtx.params.trans_id]);

  const isDirty = ()=>(queryToolCtx.params.is_query_tool && lastSavedText.current !== editor.current.getValue());

  const cursorActivity = useCallback((cmObj)=>{
    const c = cmObj.getCursor();
    lastCursorPos.current = c;
    eventBus.fireEvent(QUERY_TOOL_EVENTS.CURSOR_ACTIVITY, [c.line+1, c.ch+1]);
  }, []);

  const change = useCallback(()=>{
    eventBus.fireEvent(QUERY_TOOL_EVENTS.QUERY_CHANGED, isDirty());
  }, []);

  return <CodeMirror
    currEditor={(obj)=>{
      editor.current=obj;
    }}
    value={''}
    className={classes.sql}
    events={{
      'focus': cursorActivity,
      'cursorActivity': cursorActivity,
      'change': change,
    }}
    disabled={!queryToolCtx.params.is_query_tool}
    autocomplete={true}
  />;
}
