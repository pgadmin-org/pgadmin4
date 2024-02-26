/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import PropTypes from 'prop-types';
import { checkTrojanSource } from '../../../utils';
import usePreferences from '../../../../../preferences/static/js/store';
import KeyboardArrowRightRoundedIcon from '@material-ui/icons/KeyboardArrowRightRounded';
import ExpandMoreRoundedIcon from '@material-ui/icons/ExpandMoreRounded';

// Codemirror packages
import {
  lineNumbers,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  EditorView,
  keymap,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentLess, insertTab } from '@codemirror/commands';
import { highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import {
  foldGutter,
  indentOnInput,
  bracketMatching,
  indentUnit,
  foldKeymap,
} from '@codemirror/language';

import syntaxHighlighting from '../extensions/highlighting';
import PgSQL from '../extensions/dialect';
import { sql } from '@codemirror/lang-sql';
import errorMarkerExtn from '../extensions/errorMarker';
import CustomEditorView from '../CustomEditorView';
import breakpointGutter, { breakpointEffect } from '../extensions/breakpointGutter';
import activeLineExtn from '../extensions/activeLineMarker';

const arrowRightHtml = ReactDOMServer.renderToString(<KeyboardArrowRightRoundedIcon style={{fontSize: '1.2em'}} />);
const arrowDownHtml = ReactDOMServer.renderToString(<ExpandMoreRoundedIcon style={{fontSize: '1.2em'}} />);

function handleDrop(e, editor) {
  let dropDetails = null;
  try {
    dropDetails = JSON.parse(e.dataTransfer.getData('text'));

    /* Stop firefox from redirecting */

    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }
  } catch (error) {
    /* if parsing fails, it must be the drag internal of codemirror text */
    return false;
  }

  const dropPos = editor.posAtCoords({ x: e.x, y: e.y });
  editor.dispatch({
    changes: { from: dropPos, to: dropPos, insert: dropDetails.text || '' },
    selection: { anchor: dropPos + dropDetails.cur.from, head: dropPos + dropDetails.cur.to }
  });

  editor.focus();
}

function calcFontSize(fontSize) {
  if (fontSize) {
    fontSize = parseFloat((Math.round(parseFloat(fontSize + 'e+2')) + 'e-2'));
    let rounded = Number(fontSize);
    if (rounded > 0) {
      return rounded + 'em';
    }
  }
  return '1em';
}

function handlePaste(e) {
  let copiedText = e.clipboardData.getData('text');
  checkTrojanSource(copiedText, true);
}

/* React wrapper for CodeMirror */
const defaultExtensions = [
  highlightSpecialChars(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting,
  highlightSelectionMatches(),
  keymap.of([defaultKeymap, closeBracketsKeymap, historyKeymap, foldKeymap, completionKeymap].flat()),
  keymap.of([{
    key: 'Tab',
    preventDefault: true,
    run: insertTab,
  },
  {
    key: 'Shift-Tab',
    preventDefault: true,
    run: indentLess,
  },{
    key: 'Tab',
    run: acceptCompletion,
  }]),
  sql({
    dialect: PgSQL,
  }),
  PgSQL.language.data.of({
    autocomplete: false,
  }),
  EditorView.domEventHandlers({
    drop: handleDrop,
    paste: handlePaste,
  }),
  errorMarkerExtn()
];

export default function Editor({
  currEditor, name, value, options, onCursorActivity, onChange, readonly, disabled, autocomplete = false,
  breakpoint = false, onBreakPointChange, showActiveLine=false, 
  keepHistory = true, cid, helpid, labelledBy, customKeyMap}) {

  const editorContainerRef = useRef();
  const editor = useRef();
  const defaultOptions = {
    lineNumbers: true,
    foldGutter: true,
  };

  const preferencesStore = usePreferences();
  const editable = !disabled;
  const configurables = useRef(new Compartment());
  const editableConfig = useRef(new Compartment());

  useEffect(() => {
    const finalOptions = { ...defaultOptions, ...options };
    const finalExtns = [
      ...defaultExtensions,
    ];
    if (finalOptions.lineNumbers) {
      finalExtns.push(lineNumbers());
    }
    if (finalOptions.foldGutter) {
      finalExtns.push(foldGutter({
        markerDOM: (open)=>{
          let icon = document.createElement('span');
          if(open) {
            icon.innerHTML = arrowDownHtml;
          } else {
            icon.innerHTML = arrowRightHtml;
          }
          return icon;
        }
      }));
    }
    if (editorContainerRef.current) {
      const state = EditorState.create({
        extensions: [
          ...finalExtns,
          configurables.current.of([]),
          keymap.of(customKeyMap??[]),
          editableConfig.current.of([
            EditorView.editable.of(!disabled),
            EditorState.readOnly.of(readonly),
          ].concat(keepHistory ? [history()] : [])),
          [EditorView.updateListener.of(function(update) {
            if(update.selectionSet) {
              onCursorActivity?.(update.view.getCursor(), update.view);
            }
            if(update.docChanged) {
              onChange?.(update.view.getValue(), update.view);
            }
            if(breakpoint) {
              for(const transaction of update.transactions) {
                for(const effect of transaction.effects) {
                  if(effect.is(breakpointEffect)) {
                    if(effect.value.silent) {
                      /* do nothing */
                      return;
                    }
                    const lineNo = editor.current.state.doc.lineAt(effect.value.pos).number;
                    onBreakPointChange?.(lineNo, effect.value.on);
                  }
                }
              }
            }
          })],
          EditorView.contentAttributes.of({
            id: cid,
            'aria-describedby': helpid,
            'aria-labelledby': labelledBy,
          }),
          breakpoint ? breakpointGutter : [],
          showActiveLine ? highlightActiveLine() : activeLineExtn(),
        ],
      });

      editor.current = new CustomEditorView({
        state,
        parent: editorContainerRef.current
      });

      if(!_.isEmpty(value)) {
        editor.current.setValue(value);
      } else {
        editor.current.setValue('');
      }

      currEditor?.(editor.current);
    }
    return () => {
      editor.current?.destroy();
    };
  }, []);

  useMemo(() => {
    if(editor.current) {
      if(value != editor.current.getValue()) {
        if(!_.isEmpty(value)) {
          editor.current.setValue(value);
        } else {
          editor.current.setValue('');
        }
      }
    }
  }, [value]);

  useEffect(() => {
    let pref = preferencesStore.getPreferencesForModule('sqleditor');
    let newConfigExtn = [];

    const fontSize = calcFontSize(pref.sql_font_size);
    newConfigExtn.push(EditorView.theme({
      '.cm-content': {
        fontSize: fontSize,
      },
      '.cm-gutters': {
        fontSize: fontSize,
      },
    }));

    const autoCompOptions = {
      icons: false,
      addToOptions: [{
        render: (completion) => {
          const element = document.createElement('div');
          if (completion.type == 'keyword') {
            element.className = 'cm-completionIcon cm-completionIcon-keyword';
          } else if (completion.type == 'property') {
            // CM adds columns as property, although we have changed this.
            element.className = 'pg-cm-autocomplete-icon icon-column';
          } else if (completion.type == 'type') {
            // CM adds table as type
            element.className = 'pg-cm-autocomplete-icon icon-table';
          } else {
            element.className = 'pg-cm-autocomplete-icon icon-' + completion.type;
          }
          return element;
        },
        position: 20,
      }],
    };
    if (autocomplete) {
      if (pref.autocomplete_on_key_press) {
        newConfigExtn.push(autocompletion({
          ...autoCompOptions,
          activateOnTyping: true,
        }));
      } else {
        newConfigExtn.push(autocompletion({
          ...autoCompOptions,
          activateOnTyping: false,
        }));
      }
    }

    newConfigExtn.push(
      EditorState.tabSize.of(pref.tab_size),
    );
    if (pref.use_spaces) {
      newConfigExtn.push(
        indentUnit.of(new Array(pref.tab_size).fill(' ').join('')),
      );
    } else {
      newConfigExtn.push(
        indentUnit.of('\t'),
      );
    }

    if (pref.wrap_code) {
      newConfigExtn.push(
        EditorView.lineWrapping
      );
    }

    if (pref.insert_pair_brackets) {
      newConfigExtn.push(closeBrackets());
    }
    if (pref.brace_matching) {
      newConfigExtn.push(bracketMatching());
    }

    editor.current.dispatch({
      effects: configurables.current.reconfigure(newConfigExtn)
    });
  }, [preferencesStore]);

  useMemo(() => {
    if (editor.current) {
      if (value != editor.current.getValue()) {
        editor.current.dispatch({
          changes: { from: 0, to: editor.current.state.doc.length, insert: value || '' }
        });
      }
    }
  }, [value]);

  useEffect(() => {
    editor.current?.dispatch({
      effects: editableConfig.current.reconfigure([
        EditorView.editable.of(editable),
        EditorState.readOnly.of(readonly),
      ].concat(keepHistory ? [history()] : []))
    });
  }, [readonly, disabled, keepHistory]);

  return useMemo(()=>(
    <div style={{ height: '100%' }} ref={editorContainerRef} name={name}></div>
  ), []);
}

Editor.propTypes = {
  currEditor: PropTypes.func,
  name: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.object,
  onCursorActivity: PropTypes.func,
  onChange: PropTypes.func,
  readonly: PropTypes.bool,
  disabled: PropTypes.bool,
  autocomplete: PropTypes.bool,
  breakpoint: PropTypes.bool,
  onBreakPointChange: PropTypes.func,
  showActiveLine: PropTypes.bool,
  showCopyBtn: PropTypes.bool,
  keepHistory: PropTypes.bool,
  cid: PropTypes.string,
  helpid: PropTypes.string,
  labelledBy: PropTypes.string,
  customKeyMap: PropTypes.array,
};
