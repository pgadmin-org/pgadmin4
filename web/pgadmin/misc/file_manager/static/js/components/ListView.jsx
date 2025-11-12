import { styled } from '@mui/material/styles';
import React, { useRef, useEffect, useCallback } from 'react';
import PgReactDataGrid from '../../../../../static/js/components/PgReactDataGrid';
import FolderIcon from '@mui/icons-material/Folder';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import DescriptionIcon from '@mui/icons-material/Description';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';


const StyledPgReactDataGrid = styled(PgReactDataGrid)(({theme}) => ({
  '&.Grid-grid': {
    fontSize: '13px',
    '& .rdg-header-row': {
      '& .rdg-cell': {
        padding: '0px 4px',
      }
    },
    '& .rdg-cell': {
      padding: '0px 4px',
      '&[aria-colindex="1"]': {
        padding: '0px 4px',
        '&.rdg-editor-container': {
          padding: '0px',
        },
      },
      '& .Grid-input': {
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
      '& .Grid-protected': {
        height: '0.75rem',
        width: '0.75rem',
        position: 'absolute',
        left: '14px',
        top: '5px',
        color: theme.palette.error.main,
        backgroundColor: 'inherit',
      }
    }
  },
}));

export const GridContextUtils = React.createContext();

export function FileNameEditor({row, column, onRowChange, onClose}) {

  const value = row[column.key] ?? '';
  const [localVal, setLocalVal] = React.useState(value);
  const localValRef = useRef(localVal);

  localValRef.current = localVal;
  useEffect(()=>{
    return ()=>{
      /* When unmounted, trigger onRowChange */
      onRowChange({ ...row, [column.key]: localValRef.current?.trim()}, true);
    };
  }, []);

  const onKeyDown = (e)=>{
    if(e.code === 'Tab' || e.code == 'Escape' || e.code == 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };
  return (
    <input
      className='Grid-input'
      value={localVal}
      onChange={(e)=>{
        setLocalVal(e.target.value);
      }}
      onKeyDown={onKeyDown}
      autoFocus
    />
  );
}

FileNameEditor.propTypes = {
  row: PropTypes.object,
  column: PropTypes.object,
  onRowChange: PropTypes.func,
  onClose: PropTypes.func,
};
function FileNameFormatter({row}) {

  let icon = <DescriptionIcon style={{fontSize: '1.2rem'}} />;
  if(row.file_type == 'dir') {
    icon = <FolderIcon style={{fontSize: '1.2rem'}} />;
  } else if(row.file_type == 'drive') {
    icon = <StorageRoundedIcon style={{fontSize: '1.2rem'}} />;
  }
  return <>
    {icon}
    {Boolean(row.Protected) && <LockRoundedIcon className='Grid-protected'/>}
    <span style={{marginLeft: '4px'}}>{row['Filename']}</span>
  </>;
}
FileNameFormatter.propTypes = {
  row: PropTypes.object,
};

const columns = [
  {
    key: 'Filename',
    name: gettext('Name'),
    renderCell: FileNameFormatter,
    renderEditCell: FileNameEditor,
  },{
    key: 'Properties.DateModified',
    name: gettext('Date Modified'),
    renderCell: ({row})=><>{row.Properties?.['Date Modified']}</>
  },{
    key: 'Properties.Size',
    name: gettext('Size'),
    renderCell: ({row})=><>{row.file_type != 'dir' && row.Properties?.['Size']}</>
  }
];


export default function ListView({items, operation, ...props}) {
  const gridRef = useRef();

  useEffect(()=>{
    if(operation.type) {
      operation.type == 'add' && gridRef.current.scrollToCell({rowIdx: operation.idx});
      gridRef.current.selectCell({idx: 0, rowIdx: operation.idx}, true);
    }
  }, [operation]);

  const onRowsChange = useCallback((rows)=>{
    operation?.onComplete?.(rows[operation.idx], operation.idx);
  }, [operation]);

  const onCellKeyDown = useCallback(({mode}, e)=>{
    /* Typing should not open the editor */
    if(mode == 'SELECT' && e.code != 'ArrowDown' && e.code != 'ArrowUp') {
      e.preventGridDefault();
    }
  }, []);

  return (
    <StyledPgReactDataGrid
      gridRef={gridRef}
      id="list"
      className='Grid-grid'
      hasSelectColumn={false}
      columns={columns}
      rows={items}
      defaultColumnOptions={{
        sortable: true,
        resizable: true
      }}
      headerRowHeight={35}
      rowHeight={28}
      mincolumnWidthBy={25}
      enableCellSelect={false}
      noRowsText={gettext('No files/folders found')}
      onRowsChange={onRowsChange}
      onCellKeyDown={onCellKeyDown}
      {...props}
    />
  );
}
ListView.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  operation: PropTypes.object,
  onItemSelect: PropTypes.func,
  onItemEnter: PropTypes.func,
  onItemClick: PropTypes.func,
};
