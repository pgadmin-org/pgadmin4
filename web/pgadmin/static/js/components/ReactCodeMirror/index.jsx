/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PropTypes from 'prop-types';
import { startCompletion } from '@codemirror/autocomplete';

import gettext from 'sources/gettext';
import { PgIconButton } from '../Buttons';
import { copyToClipboard } from '../../clipboard';
import { useDelayedCaller } from '../../custom_hooks';

import Editor from './components/Editor';
import CustomPropTypes from '../../custom_prop_types';
import FindDialog from './components/FindDialog';
import GotoDialog from './components/GotoDialog';
import usePreferences from '../../../../preferences/static/js/store';
import { toCodeMirrorKey } from '../../utils';
import { QUERY_TOOL_EVENTS } from '../../../../tools/sqleditor/static/js/components/QueryToolConstants';

const Root = styled('div')(() => ({
  position: 'relative',
  height: '100%',
  '& .CodeMirror-copyButton': {
    position: 'absolute',
    zIndex: 99,
    right: '4px',
    top: '4px',
  }
}));


function CopyButton({ editor }) {

  const [isCopied, setIsCopied] = useState(false);
  const revertCopiedText = useDelayedCaller(() => {
    setIsCopied(false);
  });

  return (
    <PgIconButton size="small" className='CodeMirror-copyButton' icon={isCopied ? <CheckRoundedIcon /> : <FileCopyRoundedIcon />}
      title={isCopied ? gettext('Copied!') : gettext('Copy')}
      onClick={() => {
        copyToClipboard(editor?.getValue());
        setIsCopied(true);
        revertCopiedText(1500);
      }}
    />
  );
}

CopyButton.propTypes = {
  editor: PropTypes.object,
};


export default function CodeMirror({className, currEditor, showCopyBtn=false, customKeyMap=[], onTextSelect, eventBus, ...props}) {
  const editor = useRef();
  const [[showFind, isReplace, findKey], setShowFind] = useState([false, false, false]);
  const [showGoto, setShowGoto] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const preferences = usePreferences().getPreferencesForModule('sqleditor');
  const finalCustomKeyMap = useMemo(()=>[{
    key: toCodeMirrorKey(preferences.find), run: () => {
      setShowFind(prevVal => [true, false, !prevVal[2]]);
    },
    preventDefault: true,
    stopPropagation: true,
  }, {
    key: toCodeMirrorKey(preferences.replace), run: () => {
      setShowFind(prevVal => [true, true, !prevVal[2]]);
    },
    preventDefault: true,
    stopPropagation: true,
  }, {
    key: toCodeMirrorKey(preferences.goto_line_col), run: () => {
      setShowGoto(true);
    },
    preventDefault: true,
    stopPropagation: true,
  }, {
    key: toCodeMirrorKey(preferences.comment), run: () => {
      editor.current?.execCommand('toggleComment');
    },
    preventDefault: true,
    stopPropagation: true,
  },{
    key: toCodeMirrorKey(preferences.format_sql), run: () => {
      eventBus?.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_FORMAT_SQL);
    },
    preventDefault: true,
    stopPropagation: true,
  },{
    key: toCodeMirrorKey(preferences.autocomplete), run: startCompletion,
    preventDefault: true,
  },
  ...customKeyMap], [customKeyMap]);

  const closeFind = () => {
    setShowFind([false, false, false]);
    editor.current?.focus();
  };

  const closeGoto = () => {
    setShowGoto(false);
    editor.current?.focus();
  };

  const currEditorWrap = useCallback((obj)=>{
    editor.current = obj;
    currEditor?.(obj);
  }, []);


  const onMouseEnter = useCallback(()=>{showCopyBtn && setShowCopy(true);}, []);
  const onMouseLeave = useCallback(()=>{showCopyBtn && setShowCopy(false);}, []);

  // Use to handle text selection events.
  useEffect(() => {
    if (!onTextSelect) return;

    const handleSelection = () => {
      const selectedText = editor.current?.getSelection();
      if (selectedText) {
        onTextSelect(selectedText);
      } else {
        onTextSelect(''); // Reset if no text is selected
      }
    };

    const handleKeyUp = () => {
      handleSelection();
    };
    // Add event listeners for mouseup and keyup events to detect text selection.
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleKeyUp);

    // Cleanup function to remove event listeners when component unmounts or onTextSelect changes.
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [onTextSelect]);


  return (
    <Root className={[className].join(' ')} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} >
      <Editor currEditor={currEditorWrap} customKeyMap={finalCustomKeyMap} {...props} />
      {showCopy && <CopyButton editor={editor.current} />}
      <FindDialog key={findKey} editor={editor.current} show={showFind} replace={isReplace} onClose={closeFind} />
      <GotoDialog editor={editor.current} show={showGoto} onClose={closeGoto} />
    </Root>
  );
}

CodeMirror.propTypes = {
  currEditor: PropTypes.func,
  className: CustomPropTypes.className,
  showCopyBtn: PropTypes.bool,
  customKeyMap: PropTypes.array,
  onTextSelect:PropTypes.func,
  eventBus: PropTypes.object,
};
