/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core';
import FileCopyRoundedIcon from '@material-ui/icons/FileCopyRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import clsx from 'clsx';
import PropTypes from 'prop-types';

import gettext from 'sources/gettext';
import { PgIconButton } from '../Buttons';
import { copyToClipboard } from '../../clipboard';
import { useDelayedCaller } from '../../custom_hooks';

import Editor from './components/Editor';
import CustomPropTypes from '../../custom_prop_types';
import FindDialog from './components/FindDialog';
import GotoDialog from './components/GotoDialog';

const useStyles = makeStyles(() => ({
  root: {
    position: 'relative',
    height: '100%'
  },
  copyButton: {
    position: 'absolute',
    zIndex: 99,
    right: '4px',
    top: '4px',
  }
}));


function CopyButton({ editor }) {
  const classes = useStyles();
  const [isCopied, setIsCopied] = useState(false);
  const revertCopiedText = useDelayedCaller(() => {
    setIsCopied(false);
  });

  return (
    <PgIconButton size="small" className={classes.copyButton} icon={isCopied ? <CheckRoundedIcon /> : <FileCopyRoundedIcon />}
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


export default function CodeMirror({className, currEditor, showCopyBtn=false, ...props}) {
  const classes = useStyles();
  const editor = useRef();
  const [[showFind, isReplace], setShowFind] = useState([false, false]);
  const [showGoto, setShowGoto] = useState(false);
  const [showCopy, setShowCopy] = useState(false);

  const editMenuKeyMap = useMemo(()=>[{
    key: 'Mod-f', run: (_view, e) => {
      e.preventDefault();
      e.stopPropagation();
      setShowFind([false, false]);
      setShowFind([true, false]);
    }
  }, {
    key: 'Mod-Alt-f', run: (_view, e) => {
      e.preventDefault();
      e.stopPropagation();
      setShowFind([false, false]);
      setShowFind([true, true]);
    },
  }, {
    key: 'Mod-l', run: (_view, e) => {
      e.preventDefault();
      e.stopPropagation();
      setShowGoto(true);
    },
  }], []);

  const closeFind = () => {
    setShowFind([false, false]);
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

  return (
    <div className={clsx(className, classes.root)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} >
      <Editor currEditor={currEditorWrap} customKeyMap={editMenuKeyMap} {...props} />
      {showCopy && <CopyButton editor={editor.current} />}
      <FindDialog editor={editor.current} show={showFind} replace={isReplace} onClose={closeFind} />
      <GotoDialog editor={editor.current} show={showGoto} onClose={closeGoto} />
    </div>
  );
}

CodeMirror.propTypes = {
  currEditor: PropTypes.func,
  className: CustomPropTypes.className,
  showCopyBtn: PropTypes.bool,
};