/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, {useContext, useLayoutEffect, useRef, useEffect} from 'react';
import { DefaultButton, PrimaryButton } from '../../../../../../static/js/components/Buttons';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseIcon from '@mui/icons-material/Close';
import gettext from 'sources/gettext';
import JSONBigNumber from 'json-bignumber';
import JsonEditor from '../../../../../../static/js/components/JsonEditor';
import PropTypes from 'prop-types';
import { RowInfoContext } from '.';
import { usePgAdmin } from '../../../../../../static/js/PgAdminProvider';
import CustomPropTypes from '../../../../../../static/js/custom_prop_types';


const StyledEditorDiv = styled(Box)(({ theme }) => ({
  '&.Editors-textEditor': {
    position: 'absolute',
    zIndex: 1080,
    backgroundColor: theme.palette.background.default,
    padding: '0.25rem',
    fontSize: '12px',
    ...theme.mixins.panelBorder.all,
    left: 0,
    top: 0,
    '& textarea': {
      width: '250px',
      height: '80px',
      border: 0,
      outline: 0,
      resize: 'both',
      '& .Editors-textarea': {
        resize: 'both',
      },
    },
  },
  '& .Editors-input': {
    appearance: 'none',
    width: '100%',
    height: '100%',
    verticalAlign: 'top',
    outline: 'none',
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    border: 0,
    boxShadow: 'inset 0 0 0 1.5px ' + theme.palette.primary.main,
    padding: '0 2px',
    '::selection': {
      background: theme.palette.primary.light,
    },
  },
  '& .Editors-check': {
    display: 'inline-block',
    verticalAlign: 'top',
    width: '16px',
    height: '16px',
    border: '1px solid ' + theme.palette.grey[800],
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
  },
  '&.Editors-jsonEditor': {
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
      overflow: 'hidden',
    },
    '& .jsoneditor': {
      height: 'abc',
      border: 'none',
      '& .ace-jsoneditor .ace_marker-layer .ace_active-line': {
        background: theme.palette.primary.light,
      },
    },
  },
  '& .Editors-buttonMargin': {
    marginLeft: '0.5rem',
  },
}));

const ResizableDiv = ({columnIndex, children, ...otherProps}) => {

  const editorRef = React.useRef(null);
  const {getCellElement} = useContext(RowInfoContext);

  useEffect(()=>{
    // Function to check if element is going outsied browser window on resize
    // and set the height/width to keep it within the browser window.
    const resizeEditor = () => {
      const { innerHeight, innerWidth } = window;
      const box = editorRef.current.getBoundingClientRect();
      let currentHeight = parseInt(editorRef.current.firstChild.style.height);
      let heightDiff = parseInt(box.bottom) - innerHeight;
      let currentWidth = parseInt(editorRef.current.firstChild.style.width);
      let widthDiff = parseInt(box.right) - innerWidth;

      if (box.bottom > innerHeight) {
        editorRef.current.firstChild.style.height = `${currentHeight - heightDiff - 20}px`;
      }
      if (box.right > innerWidth) {
        editorRef.current.firstChild.style.width = `${currentWidth - widthDiff - 20}px`;
      }
    };

    editorRef.current.addEventListener('mousedown', () => {
      document.addEventListener('mouseup', resizeEditor, {once: true});
    });

    return () => document.removeEventListener('mouseup', resizeEditor);

  },[]);

  return (
    <StyledEditorDiv ref={(ele)=>{
      editorRef.current = ele;
      setEditorPosition(getCellElement(columnIndex), ele, '.rdg', 12);
    }} {...otherProps}>
      {children}
    </StyledEditorDiv>
  );
};
ResizableDiv.displayName = 'ResizableDiv';
ResizableDiv.propTypes = {
  children: CustomPropTypes.children,
  columnIndex: PropTypes.number
};

function autoFocusAndSelect(input) {
  input?.focus();
  input?.select();
}

function isValidArray(val) {
  val = val?.trim();
  return !(val != '' && (val.charAt(0) != '{' || val.charAt(val.length - 1) != '}'));
}

export function setEditorPosition(cellEle, editorEle, closestEle, topValue) {
  if(!editorEle || !cellEle) {
    return;
  }
  /* Once the position is set, then don't change it */
  if(editorEle.style.left || editorEle.style.top) {
    return;
  }
  let gridEle = cellEle.closest(closestEle);
  let cellRect = cellEle.getBoundingClientRect();
  let gridEleRect = gridEle.getBoundingClientRect();
  let position = {
    left: cellRect.left,
    top:  Math.max(cellRect.top - editorEle.offsetHeight + topValue, 0)
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

  const value = row[column.key] ?? '';
  const [localVal, setLocalVal] = React.useState(value);
  const pgAdmin = usePgAdmin();

  const onChange = React.useCallback((e)=>{
    setLocalVal(e.target.value);
  }, []);

  const onOK = ()=>{
    if(column.is_array && !isValidArray(localVal)) {
      pgAdmin.Browser.notifier.error(gettext('Arrays must start with "{" and end with "}"'));
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

  const onkeydown = (e)=>{
    // If only the Enter key is pressed, then save the changes.
    if(e.keyCode == 13 && !e.shiftKey) {
      onOK();
    }
  };

  return (
    <Portal container={document.body}>
      <ResizableDiv columnIndex={column.idx}
        className='Editors-textEditor' data-label="pg-editor" onKeyDown={suppressEnterKey} >
        <textarea ref={autoFocusAndSelect} className='Editors-textarea' value={localVal} onChange={onChange} onKeyDown={onkeydown} />
        <Box display="flex" justifyContent="flex-end">
          <DefaultButton startIcon={<CloseIcon />} onClick={()=>onClose(false)} size="small">
            {gettext('Cancel')}
          </DefaultButton>
          {column.can_edit &&
            <PrimaryButton startIcon={<CheckRoundedIcon />} onClick={onOK} size="small" className='Editors-buttonMargin'>
              {gettext('OK')}
            </PrimaryButton>
          }
        </Box>
      </ResizableDiv>
    </Portal>
  );
}
TextEditor.propTypes = EditorPropTypes;

export function NumberEditor({row, column, onRowChange, onClose}) {

  const pgAdmin = usePgAdmin();

  const value = row[column.key] ?? '';
  const isValidData = ()=>{
    if(!column.is_array && isNaN(value)){
      pgAdmin.Browser.notifier.error(gettext('Please enter a valid number'));
      return false;
    } else if(column.is_array) {
      if(!isValidArray(value)) {
        pgAdmin.Browser.notifier.error(gettext('Arrays must start with "{" and end with "}"'));
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
          pgAdmin.Browser.notifier.error(gettext('Arrays must start with "{" and end with "}"'));
          return false;
        }
      }
    }
    return true;
  };
  const onBlur = ()=>{
    if(isValidData()) {
      onClose(column.can_edit);
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
    <StyledEditorDiv height={'100%'}>
      <input
        className='Editors-input'
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
    </StyledEditorDiv>
  );
}
NumberEditor.propTypes = EditorPropTypes;

export function CheckboxEditor({row, column, onRowChange, onClose}) {

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
    <StyledEditorDiv ref={containerRef} onClick={changeValue} onKeyDown={onSpaceHit} tabIndex="0" onBlur={onBlur} data-label="pg-checkbox-editor">
      <span className={['Editors-check', className].join(' ')}></span>
    </StyledEditorDiv>
  );
}
CheckboxEditor.propTypes = EditorPropTypes;

export function JsonTextEditor({row, column, onRowChange, onClose}) {

  const pgAdmin = usePgAdmin();

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
      pgAdmin.Browser.notifier.error(gettext('Invalid JSON input'));
      return;
    }
    onRowChange({ ...row, [column.key]: localVal}, true);
    onClose();
  };
  return (
    <Portal container={document.body}>
      <ResizableDiv columnIndex={column.idx}
        className='Editors-jsonEditor' data-label="pg-editor" onKeyDown={suppressEnterKey} >
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
            <PrimaryButton startIcon={<CheckRoundedIcon />} onClick={onOK} size="small" className='Editors-buttonMargin'>
              {gettext('OK')}
            </PrimaryButton>
          }
        </Box>
      </ResizableDiv>
    </Portal>
  );
}
JsonTextEditor.propTypes = EditorPropTypes;
