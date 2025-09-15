/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import PropTypes from 'prop-types';

import { useIsMounted } from 'sources/custom_hooks';

import { checkTrojanSource } from 'sources/utils';
import usePreferences from '../../../../../preferences/static/js/store';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

// Codemirror packages
import {
  lineNumbers,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  EditorView,
  keymap,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { history, defaultKeymap, historyKeymap, indentLess, indentMore, deleteCharBackwardStrict } from '@codemirror/commands';
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import {
  foldGutter,
  indentOnInput,
  bracketMatching,
  indentUnit,
  foldKeymap,
  indentService
} from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import syntaxHighlighting from '../extensions/highlighting';
import PgSQL from '../extensions/dialect';
import { sql } from '@codemirror/lang-sql';
import { json } from '@codemirror/lang-json';
import errorMarkerExtn from '../extensions/errorMarker';
import CustomEditorView from '../CustomEditorView';
import breakpointGutter, { breakpointEffect } from '../extensions/breakpointGutter';
import activeLineExtn from '../extensions/activeLineMarker';
import currentQueryHighlighterExtn from '../extensions/currentQueryHighlighter';
import { autoCompleteCompartment, eolCompartment, indentNewLine, eol } from '../extensions/extraStates';
import { OS_EOL } from '../../../../../tools/sqleditor/static/js/components/QueryToolConstants';
import { useTheme } from '@mui/material';
import plpgsqlFoldService from '../extensions/plpgsqlFoldService';

const arrowRightHtml = ReactDOMServer.renderToString(<KeyboardArrowRightRoundedIcon style={{width: '16px', fill: 'currentcolor'}} />);
const arrowDownHtml = ReactDOMServer.renderToString(<ExpandMoreRoundedIcon style={{width: '16px', fill: 'currentcolor'}} />);

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
  } catch {
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

function insertTabWithUnit({ state, dispatch }) {
  if (state.selection.ranges.some(r => !r.empty))
    return indentMore({ state, dispatch });

  // If indent is space based, then calc the number of spaces required.
  let indentVal = state.facet(indentUnit);
  if(indentVal != '\t') {
    const line = state.doc.lineAt(state.selection.main.head);
    indentVal =  ' '.repeat(indentVal.length - (state.selection.main.head - line.from) % indentVal.length);
  }
  dispatch(state.update(state.replaceSelection(indentVal), { scrollIntoView: true, userEvent: 'input' }));
  return true;
}

/* React wrapper for CodeMirror */
const defaultExtensions = [
  highlightSpecialChars(),
  rectangularSelection(),
  dropCursor(),
  crosshairCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting,
  keymap.of([{
    key: 'Tab',
    run: acceptCompletion,
  },{
    key: 'Tab',
    preventDefault: true,
    run: insertTabWithUnit,
    shift: indentLess,
  },{
    key: 'Backspace',
    preventDefault: true,
    run: deleteCharBackwardStrict,
  }]),
  PgSQL.language.data.of({
    autocomplete: false,
  }),
  EditorView.domEventHandlers({
    drop: handleDrop,
    paste: handlePaste,
  }),
  errorMarkerExtn(),
  indentService.of((context, pos) => {
    if(context.state.facet(indentNewLine)) {
      const previousLine = context.lineAt(pos, -1);
      let prevText = previousLine.text.replaceAll('\t', ' '.repeat(context.state.tabSize));
      return prevText.match(/^\s*/)?.[0].length;
    }
    return 0;
  }),
  autoCompleteCompartment.of([]),
  EditorView.clipboardOutputFilter.of((text, state)=>{
    return CustomEditorView.getSelectionFromState(state);
  }),
];

export default function Editor({
  currEditor, name, value, options, onCursorActivity, onChange, readonly,
  disabled, autocomplete = false, autocompleteOnKeyPress, breakpoint = false, onBreakPointChange,
  showActiveLine=false, keepHistory = true, cid, helpid, labelledBy,
  customKeyMap, language='pgsql'
}) {
  const checkIsMounted = useIsMounted();

  const editorContainerRef = useRef();
  const editor = useRef();
  const finalOptions = {
    lineNumbers: true,
    foldGutter: true,
    ...options
  };

  const preferencesStore = usePreferences();
  const theme = useTheme();
  const editable = !disabled;

  const shortcuts = useRef(new Compartment());
  const configurables = useRef(new Compartment());
  const editableConfig = useRef(new Compartment());

  useEffect(() => {
    if (!checkIsMounted()) return;
    const osEOL = OS_EOL === 'crlf' ? '\r\n' : '\n';
    const finalExtns = [
      ...defaultExtensions,
    ];
    if (finalOptions.lineNumbers) {
      finalExtns.push(lineNumbers());
    }
    if (editorContainerRef.current) {
      const state = EditorState.create({
        extensions: [
          ...finalExtns,
          eolCompartment.of([eol.of(osEOL)]),
          shortcuts.current.of([]),
          configurables.current.of([]),
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
    if (!checkIsMounted()) return;
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
    if (!checkIsMounted()) return;
    const keys = keymap.of([
      // Filtering out the default keymaps so that it uses the custom keymaps.
      customKeyMap??[], ...completionKeymap.filter(k => k.key != 'Ctrl-Space'),
      defaultKeymap.filter(k => k.key != 'Mod-/'), closeBracketsKeymap, historyKeymap,
      foldKeymap
    ].flat());
    editor.current?.dispatch({
      effects: shortcuts.current.reconfigure(keys)
    });
  }, [customKeyMap]);

  useEffect(() => {
    if (!checkIsMounted()) return;
    let pref = preferencesStore.getPreferencesForModule('sqleditor');
    let editorPref = preferencesStore.getPreferencesForModule('editor');
    let newConfigExtn = [];

    const fontSize = calcFontSize(editorPref.sql_font_size);
    newConfigExtn.push(EditorView.theme({
      '& .cm-scroller .cm-content': {
        fontSize: fontSize,
        fontVariantLigatures: editorPref.sql_font_ligatures ? 'normal' : 'none',
        fontFamily: `${editorPref.sql_font_family}, ${theme.typography.fontFamilySourceCode}`,
      },
      '.cm-gutters': {
        fontSize: fontSize,
      },
    }));

    const autoCompOptions = {
      defaultKeymap: false,
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
      if (pref.autocomplete_on_key_press || autocompleteOnKeyPress) {
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
      EditorState.tabSize.of(editorPref.tab_size),
    );
    if (editorPref.use_spaces) {
      newConfigExtn.push(
        indentUnit.of(' '.repeat(editorPref.tab_size)),
      );
    } else {
      newConfigExtn.push(
        indentUnit.of('\t'),
      );
    }

    if(editorPref.indent_new_line) {
      newConfigExtn.push(indentNewLine.of(true));
    } else {
      newConfigExtn.push(indentNewLine.of(false));
    }

    if (editorPref.wrap_code) {
      newConfigExtn.push(
        EditorView.lineWrapping
      );
    }

    if (editorPref.insert_pair_brackets) {
      newConfigExtn.push(closeBrackets());
    }

    if (editorPref.highlight_selection_matches){
      newConfigExtn.push(highlightSelectionMatches());
    }

    if (editorPref.brace_matching) {
      newConfigExtn.push(bracketMatching());
    }
    if (pref.underline_query_cursor){
      newConfigExtn.push(currentQueryHighlighterExtn());
    }

    if(!editorPref.plain_editor_mode) {
      // lang override
      if(language == 'json') {
        newConfigExtn.push(json());
      } else {
        newConfigExtn.push(sql({dialect: PgSQL}));
      }
    }

    if(editorPref.code_folding && finalOptions.foldGutter) {
      newConfigExtn.push(foldGutter({
        markerDOM: (open)=>{
          let icon = document.createElement('span');
          if(open) {
            icon.innerHTML = arrowDownHtml;
          } else {
            icon.innerHTML = arrowRightHtml;
          }
          return icon;
        },
      }));
    }

    const CURSOR_BLINK_RATE_MAP = {
      'none': 0,
      'slow': 1800,
      'medium': 1200,
      'fast': 600,
    };
    newConfigExtn.push(drawSelection({
      cursorBlinkRate: CURSOR_BLINK_RATE_MAP[editorPref.cursor_blink_rate] ?? 1200
    }));

    // add fold service conditionally
    if(!editorPref.plain_editor_mode && editorPref.code_folding && language == 'pgsql') {
      newConfigExtn.push(plpgsqlFoldService);
    }

    editor.current.dispatch({
      effects: configurables.current.reconfigure(newConfigExtn)
    });
  }, [preferencesStore]);

  useMemo(() => {
    if (!checkIsMounted()) return;
    if (editor.current) {
      if (value != editor.current.getValue()) {
        editor.current.dispatch({
          changes: { from: 0, to: editor.current.state.doc.length, insert: value || '' }
        });
      }
    }
  }, [value]);

  useEffect(() => {
    if (!checkIsMounted()) return;
    editor.current?.dispatch({
      effects: editableConfig.current.reconfigure([
        EditorView.editable.of(editable),
        EditorState.readOnly.of(readonly),
      ].concat(keepHistory ? [history()] : []))
    });
  }, [readonly, disabled, keepHistory]);

  return useMemo(() => (
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
  language: PropTypes.string,
};
