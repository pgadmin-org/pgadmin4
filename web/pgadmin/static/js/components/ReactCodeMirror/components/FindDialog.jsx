/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import { Box, InputAdornment, makeStyles } from '@material-ui/core';
import { InputText } from '../../FormComponents';
import { PgIconButton } from '../../Buttons';
import CloseIcon from '@material-ui/icons/CloseRounded';
import ArrowDownwardRoundedIcon from '@material-ui/icons/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded';
import SwapHorizRoundedIcon from '@material-ui/icons/SwapHorizRounded';
import SwapCallsRoundedIcon from '@material-ui/icons/SwapCallsRounded';
import { RegexIcon, FormatCaseIcon } from '../../ExternalIcon';

import {
  openSearchPanel,
  closeSearchPanel,
  setSearchQuery,
  SearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from '@codemirror/search';

const useStyles = makeStyles((theme)=>({
  root: {
    position: 'absolute',
    zIndex: 99,
    right: '4px',
    top: '0px',
    ...theme.mixins.panelBorder.all,
    borderTop: 'none',
    padding: '2px 4px',
    width: '250px',
    backgroundColor: theme.palette.background.default,
  },
  marginTop: {
    marginTop: '0.25rem',
  },
}));

export default function FindDialog({editor, show, replace, onClose}) {
  const [findVal, setFindVal] = useState(editor?.getSelection());
  const [replaceVal, setReplaceVal] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const findInputRef = useRef();
  const searchQuery = useRef();
  const classes = useStyles();

  const search = ()=>{
    if(editor) {
      let query = new SearchQuery({
        search: findVal,
        caseSensitive: matchCase,
        regexp: useRegex,
        wholeWord: false,
        replace: replaceVal,
      });
      if ((searchQuery.current && !query.eq(searchQuery.current))
          || !searchQuery.current) {
        searchQuery.current = query;
        editor.dispatch({effects: setSearchQuery.of(query)});
      }
    }
  };

  useEffect(()=>{
    if(show) {
      openSearchPanel(editor);
      // Get selected text from editor and set it to find/replace input.
      let selText = editor.getSelection();
      setFindVal(selText);
      findInputRef.current && findInputRef.current.select();
    }
  }, [show]);

  useEffect(()=>{
    search();
  }, [findVal, replaceVal, useRegex, matchCase]);

  const clearAndClose = ()=>{
    closeSearchPanel(editor);
    onClose();
  };

  const toggle = (name)=>{
    if(name == 'regex') {
      setUseRegex((prev)=>!prev);
    } else if(name == 'case') {
      setMatchCase((prev)=>!prev);
    }
  };

  const onFindEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if(e.shiftKey) {
        onFindPrev();
      } else {
        onFindNext();
      }
    }
  };

  const onReplaceEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onReplace();
    }
  };

  const onEscape = (e)=>{
    if (e.key === 'Escape') {
      e.preventDefault();
      clearAndClose();
    }
  };

  const onFindNext = ()=>{
    findNext(editor);
  };

  const onFindPrev = ()=>{
    findPrevious(editor);
  };

  const onReplace = ()=>{
    replaceNext(editor);
  };

  const onReplaceAll = ()=>{
    replaceAll(editor);
  };

  if(!editor) {
    return <></>;
  }

  return (
    <Box className={classes.root} style={{visibility: show ? 'visible' : 'hidden'}} tabIndex="0" onKeyDown={onEscape}>
      <InputText value={findVal}
        inputRef={(ele)=>{findInputRef.current = ele;}}
        onChange={(value)=>setFindVal(value)}
        onKeyPress={onFindEnter}
        endAdornment={
          <InputAdornment position="end">
            <PgIconButton data-test="case" title="Match case" icon={<FormatCaseIcon />} size="xs" noBorder
              onClick={()=>toggle('case')} color={matchCase ? 'primary' : 'default'} style={{marginRight: '2px'}}/>
            <PgIconButton data-test="regex" title="Use regex" icon={<RegexIcon />} size="xs" noBorder
              onClick={()=>toggle('regex')} color={useRegex ? 'primary' : 'default'}/>
          </InputAdornment>
        }
      />
      {replace &&
      <InputText value={replaceVal}
        className={classes.marginTop}
        onChange={(value)=>setReplaceVal(value)}
        onKeyPress={onReplaceEnter}
      />}

      <Box display="flex" className={classes.marginTop}>
        <PgIconButton title={gettext('Previous')} icon={<ArrowUpwardRoundedIcon />} size="xs" noBorder onClick={onFindPrev}
          style={{marginRight: '2px'}} />
        <PgIconButton title={gettext('Next')} icon={<ArrowDownwardRoundedIcon />} size="xs" noBorder onClick={onFindNext}
          style={{marginRight: '2px'}} />
        {replace && <>
          <PgIconButton title={gettext('Replace')} icon={<SwapHorizRoundedIcon style={{height: 'unset'}}/>} size="xs" noBorder onClick={onReplace}
            style={{marginRight: '2px'}} />
          <PgIconButton title={gettext('Replace All')} icon={<SwapCallsRoundedIcon />} size="xs" noBorder onClick={onReplaceAll}/>
        </>}
        <Box marginLeft="auto">
          <PgIconButton title={gettext('Close')} icon={<CloseIcon />} size="xs" noBorder onClick={clearAndClose}/>
        </Box>
      </Box>
    </Box>
  );
}


export const CodeMirrorInstanceType = PropTypes.shape({
  getValue: PropTypes.func,
  setValue: PropTypes.func,
  getSelection: PropTypes.func,
  dispatch: PropTypes.func,
});

FindDialog.propTypes = {
  editor: CodeMirrorInstanceType,
  show: PropTypes.bool,
  replace: PropTypes.bool,
  onClose: PropTypes.func,
};
