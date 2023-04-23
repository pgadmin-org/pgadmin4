/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box, makeStyles } from '@material-ui/core';
import React, {useState, useEffect, useRef, useLayoutEffect} from 'react';
import FolderIcon from '@material-ui/icons/Folder';
import DescriptionIcon from '@material-ui/icons/Description';
import LockRoundedIcon from '@material-ui/icons/LockRounded';
import StorageRoundedIcon from '@material-ui/icons/StorageRounded';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';


const useStyles = makeStyles((theme)=>({
  grid: {
    display: 'flex',
    fontSize: '13px',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  gridItem: {
    width: '100px',
    margin: '4px',
    textAlign: 'center',
    position: 'relative',
  },
  gridItemContent: {
    padding: '4px',
    border: '1px solid transparent',
    cursor: 'pointer',
    '&[aria-selected=true]': {
      backgroundColor: theme.palette.primary.light,
      color: theme.otherVars.qtDatagridSelectFg,
      borderColor: theme.palette.primary.main,
    },
  },
  gridFilename: {
    overflowWrap: 'break-word',
  },
  gridItemEdit: {
    border: `1px solid ${theme.otherVars.inputBorderColor}`,
    backgroundColor: theme.palette.background.default,
  },
  protected: {
    height: '1.25rem',
    width: '1.25rem',
    position: 'absolute',
    left: '52px',
    color: theme.palette.error.main,
    backgroundColor: 'inherit',
  }
}));

export function ItemView({idx, row, selected, onItemSelect, onItemEnter, onEditComplete}) {
  const classes = useStyles();
  const editMode = Boolean(onEditComplete);
  const fileNameRef = useRef();

  useLayoutEffect(()=>{
    if(editMode) {
      fileNameRef.current?.focus();
    }
  }, [editMode]);

  const handleKeyDown = (e)=>{
    if(e.code == 'Tab') {
      e.stopPropagation();
    }
    if(e.code == 'Enter') {
      onEditComplete({...row, Filename: fileNameRef.current.textContent?.trim()});
    }
    if(e.code == 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      fileNameRef.current.textContent = row.Filename;
      onEditComplete(row);
    }
  };
  
  let icon = <DescriptionIcon style={{fontSize: '2.5rem'}} />;
  if(row.file_type == 'dir') {
    icon = <FolderIcon style={{fontSize: '2.5rem'}} />;
  } else if(row.file_type == 'drive') {
    icon = <StorageRoundedIcon style={{fontSize: '2.5rem'}} />;
  }

  return (
    <li className={classes.gridItem} aria-rowindex={idx} aria-selected={selected}>
      <div className={classes.gridItemContent} aria-selected={selected} onClick={()=>onItemSelect(idx)} onDoubleClick={()=>onItemEnter(row)}>
        <div>
          {icon}
          {Boolean(row.Protected) && <LockRoundedIcon className={classes.protected}/>}
        </div>
        <div ref={fileNameRef} onKeyDown={handleKeyDown} onBlur={()=>onEditComplete(row)}
          className={editMode ? classes.gridItemEdit : classes.gridFilename} suppressContentEditableWarning={true}
          contentEditable={editMode} data-test="filename-div">{row['Filename']}</div>
      </div>
    </li>
  );
}
ItemView.propTypes = {
  idx: PropTypes.number,
  row: PropTypes.object,
  selected: PropTypes.bool,
  onItemSelect: PropTypes.func,
  onItemEnter: PropTypes.func,
  onEditComplete: PropTypes.func,
};

export default function GridView({items, operation, onItemSelect, onItemEnter}) {
  const classes = useStyles();
  const [selectedIdx, setSelectedIdx] = useState(null);
  const gridRef = useRef();

  useEffect(()=>{
    onItemSelect(selectedIdx);
  }, [selectedIdx]);


  let onEditComplete = null;
  if(operation?.onComplete) {
    onEditComplete = (row)=>{
      operation?.onComplete?.(row, operation.idx);
    };
  }

  return (
    <Box flexGrow={1} overflow="hidden auto">
      <ul ref={gridRef} className={classes.grid}>
        {items.map((item, i)=>(
          <ItemView key={i} idx={i} row={item} selected={selectedIdx==i} onItemSelect={setSelectedIdx}
            onItemEnter={onItemEnter} onEditComplete={operation.idx==i ? onEditComplete : null} />)
        )}
      </ul>
      {items.length == 0 && <Box textAlign="center" p={1}>{gettext('No files/folders found')}</Box>}
    </Box>
  );
}

GridView.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  operation: PropTypes.object,
  onItemSelect: PropTypes.func,
  onItemEnter: PropTypes.func,
};
