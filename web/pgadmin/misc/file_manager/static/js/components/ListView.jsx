import { Box, makeStyles } from '@material-ui/core';
import React, { useContext, useRef, useEffect } from 'react';
import { Row } from 'react-data-grid';
import PgReactDataGrid from '../../../../../static/js/components/PgReactDataGrid';
import FolderIcon from '@material-ui/icons/Folder';
import StorageRoundedIcon from '@material-ui/icons/StorageRounded';
import DescriptionIcon from '@material-ui/icons/Description';
import LockRoundedIcon from '@material-ui/icons/LockRounded';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme)=>({
  grid: {
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
      }
    }
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
  protected: {
    height: '0.75rem',
    width: '0.75rem',
    position: 'absolute',
    left: '14px',
    top: '5px',
    color: theme.palette.error.main,
    backgroundColor: 'inherit',
  }
}));

export const GridContextUtils = React.createContext();

export function FileNameEditor({row, column, onRowChange, onClose}) {
  const classes = useStyles();
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
    if(e.code === 'Tab' || e.code === 'Enter') {
      e.preventDefault();
      onClose();
    }
  };
  return (
    <input
      className={classes.input}
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

function CutomSortIcon({sortDirection}) {
  if(sortDirection == 'DESC') {
    return <KeyboardArrowDownIcon style={{fontSize: '1.2rem'}} />;
  } else if(sortDirection == 'ASC') {
    return <KeyboardArrowUpIcon style={{fontSize: '1.2rem'}} />;
  }
  return <></>;
}
CutomSortIcon.propTypes = {
  sortDirection: PropTypes.string,
};

export function CustomRow({inTest=false, ...props}) {
  const gridUtils = useContext(GridContextUtils);
  const handleKeyDown = (e)=>{
    if(e.code == 'Tab' || e.code == 'ArrowRight' || e.code == 'ArrowLeft') {
      e.stopPropagation();
    }
    if(e.code == 'Enter') {
      gridUtils.onItemEnter(props.row);
    }
  };
  const isRowSelected = props.selectedCellIdx >= 0;
  useEffect(()=>{
    if(isRowSelected) {
      gridUtils.onItemSelect(props.rowIdx);
    }
  }, [props.selectedCellIdx]);
  if(inTest) {
    return <div data-test='test-div' tabIndex={0} onKeyDown={handleKeyDown}></div>;
  }
  const onRowClick = (...args)=>{
    gridUtils.onItemClick?.(props.rowIdx);
    props.onRowClick?.(...args);
  };
  return (
    <Row {...props} onKeyDown={handleKeyDown} onRowClick={onRowClick} onRowDoubleClick={(row)=>gridUtils.onItemEnter(row)}
      selectCell={(row, column)=>props.selectCell(row, column)} aria-selected={isRowSelected}/>
  );
}
CustomRow.propTypes = {
  inTest: PropTypes.bool,
  row: PropTypes.object,
  selectedCellIdx: PropTypes.number,
  onRowClick: PropTypes.func,
  rowIdx: PropTypes.number,
  selectCell: PropTypes.func,
};

function FileNameFormatter({row}) {
  const classes = useStyles();
  let icon = <DescriptionIcon style={{fontSize: '1.2rem'}} />;
  if(row.file_type == 'dir') {
    icon = <FolderIcon style={{fontSize: '1.2rem'}} />;
  } else if(row.file_type == 'drive') {
    icon = <StorageRoundedIcon style={{fontSize: '1.2rem'}} />;
  }
  return <>
    {icon}
    {Boolean(row.Protected) && <LockRoundedIcon className={classes.protected}/>}
    <span style={{marginLeft: '4px'}}>{row['Filename']}</span>
  </>;
}
FileNameFormatter.propTypes = {
  row: PropTypes.object,
};

const columns = [
  {
    key: 'Filename',
    name: 'Name',
    formatter: FileNameFormatter,
    editor: FileNameEditor,
    editorOptions: {
      editOnClick: false,
      onCellKeyDown: (e)=>e.preventDefault(),
    }
  },{
    key: 'Properties.DateModified',
    name: 'Date Modified',
    formatter: ({row})=><>{row.Properties?.['Date Modified']}</>
  },{
    key: 'Properties.Size',
    name: 'Size',
    formatter: ({row})=><>{row.file_type != 'dir' && row.Properties?.['Size']}</>
  }
];


export default function ListView({items, operation, onItemSelect, onItemEnter, onItemClick, ...props}) {
  const classes = useStyles();
  const gridRef = useRef();

  useEffect(()=>{
    if(operation.type) {
      operation.type == 'add' && gridRef.current.scrollToRow(operation.idx);
      gridRef.current.selectCell({idx: 0, rowIdx: operation.idx}, true);
    }
  }, [operation]);

  useEffect(()=>{
    gridRef.current.selectCell({idx: 0, rowIdx: 0});
  }, [gridRef.current?.element]);

  return (
    <GridContextUtils.Provider value={{onItemEnter, onItemSelect, onItemClick}}>
      <PgReactDataGrid
        gridRef={gridRef}
        id="files"
        className={classes.grid}
        hasSelectColumn={false}
        columns={columns}
        rows={items}
        defaultColumnOptions={{
          sortable: true,
          resizable: true
        }}
        headerRowHeight={28}
        rowHeight={28}
        mincolumnWidthBy={25}
        enableCellSelect={false}
        components={{
          sortIcon: CutomSortIcon,
          rowRenderer: CustomRow,
          noRowsFallback: <Box textAlign="center" gridColumn="1/-1" p={1}>No files/folders found</Box>,
        }}
        onRowsChange={(rows)=>{
          operation?.onComplete?.(rows[operation.idx], operation.idx);
        }}
        {...props}
      />
    </GridContextUtils.Provider>
  );
}
ListView.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  operation: PropTypes.object,
  onItemSelect: PropTypes.func,
  onItemEnter: PropTypes.func,
  onItemClick: PropTypes.func,
};
