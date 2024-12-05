import {
  EditorView
} from '@codemirror/view';
import { EditorState, EditorSelection } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import {undo, indentMore, indentLess, toggleComment} from '@codemirror/commands';
import { errorMarkerEffect } from './extensions/errorMarker';
import { currentQueryHighlighterEffect } from './extensions/currentQueryHighlighter';
import { activeLineEffect, activeLineField } from './extensions/activeLineMarker';
import { clearBreakpoints, hasBreakpoint, toggleBreakpoint } from './extensions/breakpointGutter';
import { autoCompleteCompartment, eol, eolCompartment } from './extensions/extraStates';


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
    // Set the initial and clean state for the document and EOL(end of line).
    this._cleanDoc = this.state.doc;
    this._cleanDocEOL = this.getEOL();
  }

  getValue(tillCursor=false, useLineSep=false) {
    if(tillCursor) {
      return this.state.sliceDoc(0, this.state.selection.main.head);
    } else if (useLineSep) {
      return this.state.doc.sliceString(0, this.state.doc.length, this.getEOL());
    }
    return this.state.sliceDoc();
  }

  /* Function to extract query based on position passed */
  getQueryAt(currPos) {
    try {
      if(typeof currPos == 'undefined') {
        currPos = this.state.selection.main.head;
      }
      const tree = syntaxTree(this.state);

      let origLine = this.state.doc.lineAt(currPos);
      let startPos = currPos;

      // Move the startPos a known node type or a space.
      // We don't want to be in an unknown teritory
      for(;startPos<origLine.to; startPos++) {
        let node = tree.resolve(startPos);
        if(node.type.name != 'Script') {
          break;
        }
        const currChar = this.state.sliceDoc(startPos, startPos+1);
        if(currChar == ' ' || currChar == '\t') {
          break;
        }
      }

      let maxEndPos = this.state.doc.length;
      let statementStartPos = -1;
      let validTextFound = false;

      // we'll go in reverse direction to get the start position.
      while(startPos >= 0) {
        const currLine = this.state.doc.lineAt(startPos);

        // If empty line then start with prev line
        // If empty line in between then that's it
        if(currLine.text.trim() == '') {
          if(origLine.number != currLine.number) {
            startPos = currLine.to + 1;
            break;
          }
          startPos = currLine.from - 1;
          continue;
        }

        // Script type doesn't give any info, better skip it.
        const currChar = this.state.sliceDoc(startPos, startPos+1);
        let node = tree.resolve(startPos);
        if(node.type.name == 'Script' || (currChar == '\n')) {
          startPos -= 1;
          continue;
        }

        // Skip the comments
        if(node.type.name == 'LineComment' || node.type.name == 'BlockComment') {
          startPos = node.from - 1;
          // comments are valid text
          validTextFound = true;
          continue;
        }

        // sometimes, node type is child of statement.
        while(node.type.name != 'Statement' && node.parent) {
          node = node.parent;
        }

        // We already had found valid text
        if(validTextFound) {
          // continue till it reaches start so we can check for empty lines, etc.
          if(statementStartPos >= 0 && statementStartPos < startPos) {
            startPos -= 1;
            continue;
          }
          // don't go beyond this
          startPos = node.to;
          break;
        }

        // statement found for the first time
        if(node.type.name == 'Statement') {
          statementStartPos = node.from;
          maxEndPos = node.to;

          // if the statement is on the same line, jump to stmt start
          if(node.from >= currLine.from) {
            startPos = node.from;
          }
        }

        validTextFound = true;
        startPos -= 1;
      }

      // move forward from start position
      let endPos = startPos+1;
      maxEndPos = maxEndPos == -1 ? this.state.doc.length : maxEndPos;
      while(endPos < maxEndPos) {
        const currLine = this.state.doc.lineAt(endPos);

        // If empty line in between then that's it
        if(currLine.text.trim() == '') {
          break;
        }

        let node = tree.resolve(endPos);
        // Skip the comments
        if(node.type.name == 'LineComment' || node.type.name == 'BlockComment') {
          endPos = node.to + 1;
          continue;
        }

        // Skip any other types
        if(node.type.name != 'Statement') {
          endPos += 1;
          continue;
        }

        // can't go beyond a statement
        if(node.type.name == 'Statement') {
          maxEndPos = node.to;
        }

        if(currLine.to < maxEndPos) {
          endPos = currLine.to + 1;
        } else {
          endPos +=1;
        }
      }

      // make sure start and end are valid values;
      if(startPos < 0) startPos = 0;
      if(endPos > this.state.doc.length) endPos = this.state.doc.length;

      return {
        value: this.state.sliceDoc(startPos, endPos).trim(),
        from: startPos,
        to: endPos,
      };
    } catch (error) {
      console.error(error);
      return {
        value: '',
        from: 0,
        to: 0,
      };
    }
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
    return this.state.selection.ranges.map((range)=>this.state.sliceDoc(range.from, range.to)).join('') ?? '';
  }

  replaceSelection(newValue) {
    this.dispatch(this.state.changeByRange(range => ({
      changes: { from: range.from, to: range.to, insert: newValue },
      range: EditorSelection.range(range.from, range.to)
    })));
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
      if(ch == -1 || pos > line.to) {
        pos = line.to;
      }
    }
    this.dispatch({ selection: { anchor: pos, head: pos }, scrollIntoView: true});
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
    this._cleanDocEOL = this.getEOL(); // Update the initial EOL value.
  }

  isDirty() {
    // Return true if either the document content or the EOL(end of line) has changed.
    return !this._cleanDoc.eq(this.state.doc) || this._cleanDocEOL !== this.getEOL();
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
      effects: autoCompleteCompartment.reconfigure(
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
    let scrollEffect = line >= 0 ? [EditorView.scrollIntoView(this.state.doc.line(line).from, {y: 'center'})] : [];
    this.dispatch({ effects: [activeLineEffect.of({ from: line, to: line })].concat(scrollEffect) });
  }

  setQueryHighlightMark(from,to) {
    this.dispatch({ effects: currentQueryHighlighterEffect.of({ from, to }) });
  }

  getEOL(){
    return this.state.facet(eol);
  }

  setEOL(val){
    this.dispatch({
      effects: eolCompartment.reconfigure(eol.of(val))
    });
  }

  // Use to detect EOL type.
  detectEOL(content) {
    const lineSep = content.includes('\r\n') ? '\r\n' : '\n';
    this.setEOL(lineSep);
    return lineSep == '\r\n' ? 'crlf' : 'lf';
  }
}
