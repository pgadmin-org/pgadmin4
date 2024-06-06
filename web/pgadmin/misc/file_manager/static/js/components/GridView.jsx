/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, {useState, useEffect, useRef, useLayoutEffect} from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';

const StyledBox = styled(Box)(({theme}) => ({
  '& .GridView-grid': {
    display: 'flex',
    fontSize: '13px',
    flexWrap: 'wrap',
    overflow: 'hidden',
    '& .GridView-gridItem': {
      width: '100px',
      margin: '4px',
      textAlign: 'center',
      position: 'relative',
      border: '1px solid transparent',
      cursor: 'pointer',
      '&[aria-selected=true]': {
        backgroundColor: theme.palette.primary.light,
        color: theme.otherVars.qtDatagridSelectFg,
        borderColor: theme.palette.primary.main,
      },
      '& .GridView-gridItemContent': {
        padding: '4px',
        '& .GridView-gridFilename': {
          overflowWrap: 'break-word',
        },
        '& .GridView-gridItemEdit': {
          border: `1px solid ${theme.otherVars.inputBorderColor}`,
          backgroundColor: theme.palette.background.default,
        },
        '& .GridView-protected': {
          height: '1.25rem',
          width: '1.25rem',
          position: 'absolute',
          left: '52px',
          color: theme.palette.error.main,
          backgroundColor: 'inherit',
        }
      },
    },
  },
}));

export function ItemView({idx, row, selected, onItemSelect, onItemEnter, onEditComplete}) {
  const editMode = Boolean(onEditComplete);
  const fileNameRef = useRef();

  useLayoutEffect(()=>{
    if(editMode) {
      fileNameRef.current?.focus();
    }
  }, [editMode]);

  const handleItemKeyDown = (e)=>{
    if(e.code == 'Enter') {
      onItemEnter(row);
    }
  };

  const handleEditKeyDown = (e)=>{
    if(e.code == 'Tab') {
      e.stopPropagation();
    }
    if(e.code == 'Enter') {
      e.stopPropagation();
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
    <div tabIndex="-1" className='GridView-gridItem' aria-selected={selected} onClick={()=>onItemSelect(idx)} onDoubleClick={()=>onItemEnter(row)} onKeyDown={handleItemKeyDown} role="gridcell">
      <div className='GridView-gridItemContent'>
        <div>
          {icon}
          {Boolean(row.Protected) && <LockRoundedIcon className='GridView-protected'/>}
        </div>
        <div tabIndex="-1" ref={fileNameRef} onKeyDown={handleEditKeyDown} onBlur={()=>onEditComplete?.(row)}
          className={editMode ? 'GridView-gridItemEdit' : 'GridView-gridFilename'} suppressContentEditableWarning={true}
          contentEditable={editMode} data-test="filename-div" role={editMode ? 'textbox' : 'none'}>{row['Filename']}</div>
      </div>
    </div>
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
    <StyledBox flexGrow={1} overflow="hidden auto" id="grid">
      <div ref={gridRef} className='GridView-grid'>
        {items.map((item, i)=>(
          <ItemView key={item.Filename} idx={i} row={item} selected={selectedIdx==i} onItemSelect={setSelectedIdx}
            onItemEnter={onItemEnter} onEditComplete={operation.idx==i ? onEditComplete : null} />)
        )}
      </div>
      {items.length == 0 && <Box textAlign="center" p={1}>{gettext('No files/folders found')}</Box>}
    </StyledBox>
  );
}

GridView.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  operation: PropTypes.object,
  onItemSelect: PropTypes.func,
  onItemEnter: PropTypes.func,
};
