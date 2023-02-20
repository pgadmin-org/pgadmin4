/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { makeStyles, Box, Portal } from '@material-ui/core';
import React, {useContext, useLayoutEffect, useRef} from 'react';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import CloseIcon from '@material-ui/icons/Close';
import gettext from 'sources/gettext';
import clsx from 'clsx';
import JSONBigNumber from 'json-bignumber';
import JsonEditor from '../../../../../../static/js/components/JsonEditor';
import PropTypes from 'prop-types';
import { RowInfoContext } from '.';
import Notifier from '../../../../../../static/js/helpers/Notifier';

const useStyles = makeStyles((theme)=>({
  textEditor: {
    position: 'absolute',
    zIndex: 1080,
    backgroundColor: theme.palette.background.default,
    padding: '0.25rem',
    fontSize: '12px',
    ...theme.mixins.panelBorder.all,
    left: 0,
    // bottom: 0,
    top: 0,
    '& textarea': {
      width: '250px',
      height: '80px',
      border: 0,
      outline: 0,
      resize: 'both',
    }
  },
  jsonEditor: {
    position: 'absolute',
    zIndex: 1080,
    backgroundColor: theme.palette.background.default,
    ...theme.mixins.panelBorder,
    padding: '0.25rem',
    '& .jsoneditor-div': {
      fontSize: '12px',
      minWidth: '525px',
      minHeight: '300px',
      ...theme.mixins.panelBorder.all,
      outline: 0,
      resize: 'both',
      overflow: 'auto',
    },
    '& .jsoneditor': {
      height: 'abc',
      border: 'none',
      '& .ace-jsoneditor .ace_marker-layer .ace_active-line': {
        background: theme.palette.primary.light
      }
    }
  },
  buttonMargin: {
    marginLeft: '0.5rem',
  },
  textarea: {
    resize: 'both'
  },
  input: {
    appearance: 'none',
    width: '100%',
    height: '100%',
    verticalAlign: 'top',
    outline: 'none',
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    border: 0,
    boxShadow: 'inset 0 0 0 1.5px '+theme.palette.primary.main,
    padding: '0 2px',
    '::selection': {
      background: theme.palette.primary.light,
    }
  },
  check: {
    display: 'inline-block',
    verticalAlign: 'top',
    width: '16px',
    height: '16px',
    border: '1px solid '+theme.palette.grey[800],
    margin: '3px',
    textAlign: 'center',
    lineHeight: '16px',

    '&.checked, &.unchecked': {
      background: theme.palette.grey[200],
    },
    '&.checked:after': {
      content: '\'\\2713\'',
      fontWeight: 'bold',
    },
    '&.intermediate': {
      background: theme.palette.grey[200],
      '&:after': {
        content: '\'\\003F\'',
        fontWeight: 'bold',
      },
    },
  }
}));

function autoFocusAndSelect(input) {
  input?.focus();
  input?.select();
}

function isValidArray(val) {
  val = val?.trim();
  return !(val != '' && (val.charAt(0) != '{' || val.charAt(val.length - 1) != '}'));
}

function setEditorPosition(cellEle, editorEle) {
  if(!editorEle || !cellEle) {
    return;
  }
  /* Once the position is set, then don't change it */
  if(editorEle.style.left || editorEle.style.top) {
    return;
  }
  let gridEle = cellEle.closest('.rdg');
  let cellRect = cellEle.getBoundingClientRect();
  let gridEleRect = gridEle.getBoundingClientRect();
  let position = {
    left: cellRect.left,
    top:  Math.max(cellRect.top - editorEle.offsetHeight + 12, 0)
  };

  if ((position.left + editorEle.offsetWidth + 10) > gridEle.offsetWidth) {
    position.left -= position.left + editorEle.offsetWidth - gridEle.offsetWidth + 10;
  }
  if ((cellRect.left > gridEleRect.left) && gridEleRect.left !== 0) {
    position.left = cellRect.left - editorEle.offsetWidth + 20;
  }
  if (cellRect.left < gridEleRect.left) {
    position.left = gridEleRect.left + 10;
  }
  editorEle.style.left = `${Math.abs(position.left)}px`;
  editorEle.style.top = `${position.top}px`;
}

const EditorPropTypes = {
  row: PropTypes.object,
  column: PropTypes.object,
  onRowChange: PropTypes.func,
  onClose: PropTypes.func
};

function textColumnFinalVal(columnVal, column) {
  if(columnVal === '') {
    columnVal = null;
  } else if (!column.is_array) {
    if (columnVal === '\'\'' || columnVal === '""') {
      columnVal = '';
    } else if (columnVal === '\\\'\\\'') {
      columnVal = '\'\'';
    } else if (columnVal === '\\"\\"') {
      columnVal = '""';
    }
  }
  return columnVal;
}

function suppressEnterKey(e) {
  if(e.keyCode == 13) {
    e.stopPropagation();
  }
}
export function TextEditor({row, column, onRowChange, onClose}) {
  const classes = useStyles();
  const value = row[column.key] ?? '';
  const [localVal, setLocalVal] = React.useState(value);
  const {getCellElement} = useContext(RowInfoContext);

  const onChange = React.useCallback((e)=>{
    setLocalVal(e.target.value);
  }, []);

  const onOK = ()=>{
    if(column.is_array && !isValidArray(localVal)) {
      Notifier.error(gettext('Arrays must start with "{" and end with "}"'));
    } else {
      if(value == localVal) {
        onClose(false);
        return;
      }
      let columnVal = textColumnFinalVal(localVal, column);
      onRowChange({ ...row, [column.key]: columnVal}, true);
      onClose();
    }
  };

  return(
    <Portal container={document.body}>
      <Box ref={(ele)=>{
        setEditorPosition(getCellElement(column.idx), ele);
      }} className={classes.textEditor} data-label="pg-editor" onKeyDown={suppressEnterKey} >
        <textarea ref={autoFocusAndSelect} className={classes.textarea} value={localVal} onChange={onChange} />
        <Box display="flex" justifyContent="flex-end">
          <DefaultButton startIcon={<CloseIcon />} onClick={()=>onClose(false)} size="small">
            {gettext('Cancel')}
          </DefaultButton>
          {column.can_edit &&
          <>
            <PrimaryButton startIcon={<CheckRoundedIcon />} onClick={onOK} size="small" className={classes.buttonMargin}>
              {gettext('OK')}
            </PrimaryButton>
          </>}
        </Box>
      </Box>
    </Portal>
  );
}
TextEditor.propTypes = EditorPropTypes;

export function NumberEditor({row, column, onRowChange, onClose}) {
  const classes = useStyles();
  const value = row[column.key] ?? '';
  const isValidData = ()=>{
    if(!column.is_array && isNaN(value)){
      Notifier.error(gettext('Please enter a valid number'));
      return false;
    } else if(column.is_array) {
      if(!isValidArray(value)) {
        Notifier.error(gettext('Arrays must start with "{" and end with "}"'));
        return false;
      }
      let checkVal = value.trim().slice(1, -1);
      if(checkVal == '') {
        checkVal = [];
      } else {
        checkVal = checkVal.split(',');
      }
      for (const val of checkVal) {
        if(isNaN(val)) {
          Notifier.error(gettext('Arrays must start with "{" and end with "}"'));
          return false;
        }
      }
    }
    return true;
  };
  const onBlur = ()=>{
    if(isValidData()) {
      onClose(column.can_edit ? true : false);
      return true;
    }
    return false;
  };
  const onKeyDown = (e)=>{
    if(e.code === 'Tab' || e.code === 'Enter') {
      e.preventDefault();
      if(!onBlur()) {
        e.stopPropagation();
      }
    }
  };
  return (
    <input
      className={classes.input}
      ref={autoFocusAndSelect}
      value={value}
      onChange={(e)=>{
        if(column.can_edit) {
          onRowChange({ ...row, [column.key]: (e.target.value == '' ? null :  e.target.value)});
        }
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
NumberEditor.propTypes = EditorPropTypes;

export function CheckboxEditor({row, column, onRowChange, onClose}) {
  const classes = useStyles();
  const value = row[column.key] ?? null;
  const containerRef = useRef();
  const changeValue = ()=>{
    if(!column.can_edit) {
      return;
    }
    let newVal = true;
    if(value) {
      newVal = false;
    } else if(value != null && !value) {
      newVal = null;
    }
    onRowChange({ ...row, [column.key]: newVal});
  };
  const onBlur = ()=>{onClose(true);};
  let className = 'checked';
  if(!value && value != null) {
    className = 'unchecked';
  } else if(value == null){
    className = 'intermediate';
  }

  const onSpaceHit = (e)=>{
    if(e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      changeValue();
    }
  };

  useLayoutEffect(()=>{
    containerRef.current.focus();
  }, []);

  return (
    <div ref={containerRef} onClick={changeValue} onKeyDown={onSpaceHit} tabIndex="0" onBlur={onBlur} data-label="pg-checkbox-editor">
      <span className={clsx(classes.check, className)}></span>
    </div>
  );
}
CheckboxEditor.propTypes = EditorPropTypes;

export function JsonTextEditor({row, column, onRowChange, onClose}) {
  const classes = useStyles();
  const {getCellElement} = useContext(RowInfoContext);
  const value = React.useMemo(()=>{
    let newVal = row[column.key] ?? null;
    /* If jsonb or array */
    if(column.column_type_internal === 'jsonb' && !Array.isArray(newVal) && newVal != null) {
      newVal = JSONBigNumber.stringify(JSONBigNumber.parse(newVal), null, 2);
    } else if (Array.isArray(newVal)) {
      let temp = newVal.map((ele)=>{
        if (typeof ele === 'object') {
          return JSONBigNumber.stringify(ele, null, 2);
        }
        return ele;
      });
      newVal = '[' + temp.join() + ']';
    }
    /* set editor content to empty if value is null*/
    if (_.isNull(newVal)){
      newVal = '';
    }
    return newVal;
  });
  const [localVal, setLocalVal] = React.useState(value);
  const [hasError, setHasError] = React.useState(false);

  const onChange = React.useCallback((newVal)=>{
    setLocalVal(newVal);
  }, []);
  const onOK = ()=>{
    if(value == localVal) {
      onClose(false);
      return;
    }
    if(hasError) {
      Notifier.error(gettext('Invalid JSON input'));
      return;
    }
    onRowChange({ ...row, [column.key]: localVal}, true);
    onClose();
  };
  return (
    <Portal container={document.body}>
      <Box ref={(ele)=>{
        setEditorPosition(getCellElement(column.idx), ele);
      }} className={classes.jsonEditor} data-label="pg-editor" onKeyDown={suppressEnterKey} >
        <JsonEditor
          value={localVal}
          options={{
            onChange: onChange,
            onValidationError: (errors)=>{setHasError(Boolean(errors.length));}
          }}
          className={'jsoneditor-div'}
        />
        <Box display="flex" justifyContent="flex-end" marginTop="0.25rem">
          <DefaultButton startIcon={<CloseIcon />} onClick={()=>onClose(false)} size="small">
            {gettext('Cancel')}
          </DefaultButton>
          {column.can_edit &&
          <>
            <PrimaryButton startIcon={<CheckRoundedIcon />} onClick={onOK} size="small" className={classes.buttonMargin}>
              {gettext('OK')}
            </PrimaryButton>
          </>}
        </Box>
      </Box>
    </Portal>
  );
}
JsonTextEditor.propTypes = EditorPropTypes;
