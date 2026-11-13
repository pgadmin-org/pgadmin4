/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { checkTrojanSource } from 'sources/utils';
import gettext from 'sources/gettext';
import pgAdmin from 'sources/pgadmin';
import usePreferences from '../../../../preferences/static/js/store';
import ConfirmFileDropContent from '../../Dialogs/ConfirmFileDropContent';

/* Chromium moves the contenteditable caret under the mouse during an OS file
 * drag. Track the last user caret per editor and freeze it while dragging. */
const caretByView = new WeakMap();
const dragActiveByView = new WeakMap();

/** Return whether an OS file drag is active for the view. */
function isDragActive(view) {
  return Boolean(view && dragActiveByView.get(view));
}

/** Mark or clear OS file-drag active state for the view. */
function setDragActive(view, active) {
  if (!view) {
    return;
  }
  if (active) {
    dragActiveByView.set(view, true);
  } else {
    dragActiveByView.delete(view);
  }
}

/** Store the view's caret unless an OS file drag is active. */
export function rememberCaretPos(view) {
  if (!view || isDragActive(view)) {
    return;
  }
  caretByView.set(view, view.state.selection.main.head);
}

/** Resolve a clamped merge insert position from the remembered caret. */
function getMergePos(editor) {
  const docLen = editor.state.doc.length;
  const pos = caretByView.has(editor)
    ? caretByView.get(editor)
    : editor.state.selection.main.head;
  if (typeof pos !== 'number' || pos < 0) {
    return 0;
  }
  if (pos > docLen) {
    return docLen;
  }
  return pos;
}

/** Prevent default and stop propagation for an OS file drag/drop event. */
function stopOsFileEvent(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  if (e.stopPropagation) {
    e.stopPropagation();
  }
}

/** Detect whether a DataTransfer carries OS file drop data. */
export function hasOsFileDrop(dataTransfer) {
  if (!dataTransfer) {
    return false;
  }
  if (dataTransfer.files?.length > 0) {
    return true;
  }
  const items = dataTransfer.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        return true;
      }
    }
  }
  const types = dataTransfer.types;
  if (!types) {
    return false;
  }
  if (typeof types.includes === 'function') {
    return types.includes('Files');
  }
  if (typeof types.contains === 'function') {
    return types.contains('Files');
  }
  return Array.from(types).includes('Files');
}

/** Return the first File from a DataTransfer, if any. */
function getDroppedFile(dataTransfer) {
  if (dataTransfer.files?.length > 0) {
    return dataTransfer.files[0];
  }
  const items = dataTransfer.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        return items[i].getAsFile();
      }
    }
  }
  return null;
}

/** Read plain-text payload from a DataTransfer. */
function getDroppedText(dataTransfer) {
  if (!dataTransfer?.getData) {
    return '';
  }
  return dataTransfer.getData('text/plain')
    || dataTransfer.getData('text')
    || dataTransfer.getData('Text')
    || '';
}

/** Replace the editor contents with dropped file text. */
function applyDroppedFileText(editor, text) {
  const value = text ?? '';
  editor.setValue(value);
  caretByView.set(editor, editor.state.selection.main.head);
  checkTrojanSource(value, true);
  editor.focus();
}

/** Insert dropped file text at the remembered merge position. */
function mergeDroppedFileText(editor, text, mergePos) {
  const value = text ?? '';
  const docLen = editor.state.doc.length;
  const pos = Math.max(
    0,
    Math.min(typeof mergePos === 'number' ? mergePos : getMergePos(editor), docLen)
  );
  /* Windows CRLF: JS string length > CodeMirror Text length. Use mapPos. */
  const changes = editor.state.changes({ from: pos, to: pos, insert: value });
  const newPos = changes.mapPos(pos, 1);
  editor.dispatch({
    changes,
    selection: { anchor: newPos, head: newPos },
    scrollIntoView: true,
  });
  caretByView.set(editor, newPos);
  checkTrojanSource(value, true);
  editor.focus();
}

/** Read the Query Tool SQL file-drop preference (replace/merge/ask). */
function getSqlFileDropAction() {
  const prefs = usePreferences.getState().getPreferencesForModule('sqleditor');
  return prefs?.sql_file_drop_action || 'replace';
}

/** Apply a dropped SQL file using replace, merge, or ask preference. */
function applyOsFileDrop(editor, text, mergePos) {
  const value = text ?? '';
  const editorEmpty = !editor.getValue();
  const action = editorEmpty ? 'replace' : getSqlFileDropAction();

  if (action === 'merge') {
    mergeDroppedFileText(editor, value, mergePos);
    return;
  }
  if (action === 'ask') {
    pgAdmin.Browser.notifier.showModal(gettext('Drop SQL file'), (closeModal)=>(
      <ConfirmFileDropContent
        closeModal={closeModal}
        onMerge={()=>{
          mergeDroppedFileText(editor, value, mergePos);
        }}
        onReplace={()=>{
          applyDroppedFileText(editor, value);
        }}
      />
    ));
    return;
  }
  applyDroppedFileText(editor, value);
}

/** Remember caret position when the editor loses focus. */
export function handleEditorBlur(_e, view) {
  rememberCaretPos(view);
  return false;
}

/** Clear drag-active state and remember caret after mouseup. */
export function handleEditorMouseUp(_e, view) {
  setDragActive(view, false);
  rememberCaretPos(view);
  return false;
}

/** Clear drag-active state and remember caret after keyup. */
export function handleEditorKeyUp(_e, view) {
  setDragActive(view, false);
  rememberCaretPos(view);
  return false;
}

/** Accept OS file dragover and freeze caret updates while dragging. */
export function handleOsFileDragOver(e, view) {
  if (!hasOsFileDrop(e.dataTransfer)) {
    return false;
  }
  if (e.preventDefault) {
    e.preventDefault();
  }
  try {
    e.dataTransfer.dropEffect = 'copy';
  } catch {
    /* dropEffect is not always writable */
  }
  setDragActive(view, true);
  return true;
}

/**
 * Handle an OS file drop on the editor.
 * @returns {boolean} true when the event was an OS file drop (handled or ignored).
 */
export function handleOsFileDrop(e, editor) {
  if (!hasOsFileDrop(e.dataTransfer)) {
    return false;
  }
  stopOsFileEvent(e);
  if (editor.state.readOnly) {
    setDragActive(editor, false);
    return true;
  }
  const mergePos = getMergePos(editor);
  setDragActive(editor, false);
  const file = getDroppedFile(e.dataTransfer);
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result ?? '';
      /* Match CodeMirror's built-in drop handler: skip binary-looking content. */
      if (/[\x00-\x08\x0e-\x1f]{2}/.test(result)) {
        return;
      }
      applyOsFileDrop(editor, result, mergePos);
    };
    reader.onerror = () => {
      setDragActive(editor, false);
    };
    reader.readAsText(file);
  } else {
    const text = getDroppedText(e.dataTransfer);
    if (!text) {
      /* File-only transfer with no readable File/text — leave SQL unchanged. */
      return true;
    }
    if (/[\x00-\x08\x0e-\x1f]{2}/.test(text)) {
      return true;
    }
    applyOsFileDrop(editor, text, mergePos);
  }
  return true;
}
