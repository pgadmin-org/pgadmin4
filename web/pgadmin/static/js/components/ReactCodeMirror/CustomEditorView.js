import {
  EditorView
} from '@codemirror/view';
import { StateEffect, EditorState } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import {undo, indentMore, indentLess, toggleComment} from '@codemirror/commands';
import { errorMarkerEffect } from './extensions/errorMarker';
import { activeLineEffect, activeLineField } from './extensions/activeLineMarker';
import { clearBreakpoints, hasBreakpoint, toggleBreakpoint } from './extensions/breakpointGutter';


function getAutocompLoading({ bottom, left }, dom) {
  const cmRect = dom.getBoundingClientRect();
  const div = document.createElement('div');
  div.classList.add('cm-tooltip', 'pg-autocomp-loader');
  div.innerText = 'Loading...';
  div.style.position = 'absolute';
  div.style.top = (bottom - cmRect.top) + 'px';
  div.style.left = (left - cmRect.left) + 'px';
  dom?.appendChild(div);
  return div;
}

export default class CustomEditorView extends EditorView {
  constructor(...args) {
    super(...args);
    this._cleanDoc = this.state.doc;
  }

  getValue() {
    return this.state.doc.toString();
  }
  
  setValue(newValue, markClean=false) {
    newValue = newValue || '';
    if(markClean) {
      // create a new doc with new value to make it clean
      this._cleanDoc = EditorState.create({
        doc: newValue
      }).doc;
    }
    this.dispatch({
      changes: { from: 0, to: this.getValue().length, insert: newValue }
    });
  }
  
  getSelection() {
    return this.state.sliceDoc(this.state.selection.main.from, this.state.selection.main.to) ?? '';
  }

  replaceSelection(newValue) {
    this.dispatch(this.state.replaceSelection(newValue));
  }

  getCursor() {
    let offset = this.state.selection.main.head;
    let line = this.state.doc.lineAt(offset);
    return {line: line.number, ch: offset - line.from};
  }
  
  setCursor(lineNo, ch) {
    // line is 1-based;
    // ch is 0-based;
    let pos = 0;
    if(lineNo > this.state.doc.lines) {
      pos = this.state.doc.length;
    } else {
      const line = this.state.doc.line(lineNo);
      pos = line.from + ch;
      if(pos > line.to) {
        pos = line.to;
      }
    }
    this.dispatch({ selection: { anchor: pos, head: pos } });
  }
  
  getCurrentLineNo() {
    return this.state.doc.lineAt(this.state.selection.main.head).number;
  }
  
  lineCount() {
    return this.state.doc.lines;
  }
  
  getLine(lineNo) {
    // line is 1-based;
    return this.state.doc.line(lineNo).text;
  }

  getActiveLine() {
    const activeLineChunk = this.state.field(activeLineField).chunkPos;
    if(activeLineChunk.length > 0) {
      return this.state.doc.lineAt(activeLineChunk[0]).number;
    }
    return undefined;
  }

  hasBreakpoint(lineNo) {
    const line = this.state.doc.line(lineNo);
    return hasBreakpoint(this, line.from);
  }

  toggleBreakpoint(lineNo, silent, val) {
    const line = this.state.doc.line(lineNo);
    toggleBreakpoint(this, line.from, silent, val);
  }

  clearBreakpoints() {
    clearBreakpoints(this);
  }

  markClean() {
    this._cleanDoc = this.state.doc;
  }

  isDirty() {
    return !this._cleanDoc.eq(this.state.doc);
  }

  fireDOMEvent(event) {
    this.contentDOM.dispatchEvent(event);
  }

  execCommand(cmd) {
    switch (cmd) {
    case 'undo': undo(this);
      break;
    case 'indentMore': indentMore(this);
      break;
    case 'indentLess': indentLess(this);
      break;
    case 'toggleComment': toggleComment(this);
      break;
    default:
      break;
    }
  }
  
  registerAutocomplete(completionFunc) {
    this.dispatch({
      effects: StateEffect.appendConfig.of(
        autocompletion({
          override: [(context) => {
            this.loadingDiv?.remove();
            this.loadingDiv = getAutocompLoading(this.coordsAtPos(context.pos), this.dom);
            context.addEventListener('abort', () => {
              this.loadingDiv?.remove();
            });
            return Promise.resolve(completionFunc(context, () => {
              this.loadingDiv?.remove();
            }));
          }]
        }
        ))
    });
  }
  
  setErrorMark(fromCursor, toCursor) {
    const from = this.state.doc.line(fromCursor.line).from + fromCursor.pos;
    const to = this.state.doc.line(toCursor.line).from + toCursor.pos;
    this.dispatch({ effects: errorMarkerEffect.of({ from, to }) });
  }
  
  removeErrorMark() {
    this.dispatch({ effects: errorMarkerEffect.of({ clear: true }) });
  }

  setActiveLine(line) {
    this.dispatch({ effects: activeLineEffect.of({ from: line, to: line }) });
  }
}
  