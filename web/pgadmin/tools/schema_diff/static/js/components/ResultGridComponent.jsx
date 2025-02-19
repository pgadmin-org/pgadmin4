/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { SelectColumn } from 'react-data-grid';
import React, { useContext, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Box } from '@mui/material';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import InfoIcon from '@mui/icons-material/InfoRounded';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import { FILTER_NAME, SCHEMA_DIFF_EVENT } from '../SchemaDiffConstants';
import { SchemaDiffContext, SchemaDiffEventsContext } from './SchemaDiffComponent';
import { InputCheckbox } from '../../../../../static/js/components/FormComponents';
import PgReactDataGrid from '../../../../../static/js/components/PgReactDataGrid';
import { usePgAdmin } from '../../../../../static/js/PgAdminProvider';


const StyledBox = styled(Box)(({theme}) => ({
  paddingTop: '0.5rem',
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
  color: theme.palette.text.primary,
  backgroundColor: theme.otherVars.qtDatagridBg,
  border: 'none',
  fontSize: '13px',
  '--rdg-background-color': theme.palette.default.main,
  '--rdg-selection-color': theme.palette.primary.main,
  '& .ResultGridComponent-grid.ReactGrid-root': {
    fontSize: '13px',
    '--rdg-selection-color': 'none',
    '& .rdg-header-row': {
      backgroundColor: theme.palette.background.default,
      '& .rdg-cell': {
        padding: 0,
        paddingLeft: '0.5rem',
        boxShadow: 'none',
        '&[aria-colindex="1"]': {
          padding: 0,
        },
        '& .ResultGridComponent-headerSelectCell': {
          padding: '0rem 0.3rem 0 0.3rem'
        },
      },
    },
    '& .rdg-row': {
      backgroundColor: theme.palette.background.default,
      '&[aria-selected=false]': {
        '&.ResultGridComponent-selectedRow': {
          paddingLeft: '0.5rem',
          backgroundColor: theme.palette.primary.light,
        },
        '&.ResultGridComponent-source': {
          backgroundColor: theme.otherVars.schemaDiff.sourceRowColor,
          color: theme.otherVars.schemaDiff.diffSelectFG,
          paddingLeft: '0.5rem',
        },
        '&.ResultGridComponent-target': {
          backgroundColor: theme.otherVars.schemaDiff.targetRowColor,
          color: theme.otherVars.schemaDiff.diffSelectFG,
          paddingLeft: '0.5rem',
        },
        '&.ResultGridComponent-different': {
          backgroundColor: theme.otherVars.schemaDiff.diffRowColor,
          color: theme.otherVars.schemaDiff.diffSelectFG,
          paddingLeft: '0.5rem',
        },
        '&.ResultGridComponent-identical': {
          paddingLeft: '0.5rem',
          color: theme.otherVars.schemaDiff.diffColorFg,
        },
      },
      '& .rdg-cell': {
        padding: 0,
        boxShadow: 'none',
        color: theme.otherVars.schemaDiff.diffColorFg + ' !important',
        ...theme.mixins.panelBorder.right,
        ...theme.mixins.panelBorder.bottom,
        '&[aria-colindex="1"]': {
          padding: 0,
          textAlign: 'center',
        },
        '& .ResultGridComponent-rowIcon': {
          display: 'inline-block !important',
          height: '1.3rem',
          width: '1.3rem'
        },
        '& .ResultGridComponent-cellExpand': {
          width: '100%',
          '& > span': {
            verticalAlign: 'middle',
            cursor: 'pointer',
            '& > span': {
              display: 'flex',
              alignItems: 'center',
            }
          },
          '& .ResultGridComponent-subRow': {
            paddingLeft: '1rem',

            '& .ResultGridComponent-count': {
              display: 'inline-block !important',
              '& .ResultGridComponent-countLabel': {
                paddingLeft: '1rem',
              },
              '& .ResultGridComponent-countStyle': {
                fontWeight: 900,
                fontSize: '0.8rem',
                paddingLeft: '0.3rem',
              },
            }
          }
        },
        '& .ResultGridComponent-recordRow': {
          marginLeft: '2.7rem',
          height: '1.3rem',
          width: '1.3rem',
          display: 'inline-block',
          marginRight: '0.3rem',
          paddingLeft: '0.5rem',
        },
        '&.ResultGridComponent-selectCell': {
          padding: '0 0.3rem'
        },
      }
    },
    '& .ResultGridComponent-noRowsIcon': {
      width: '1.1rem',
      height: '1.1rem',
      marginRight: '0.5rem',
    },
    '&.rdg': {
      flex: 1,
      borderTop: '1px solid' + theme.otherVars.borderColor,
    },
  },
}));

function useFocusRef(isSelected) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!isSelected) return;
    ref.current?.focus({ preventScroll: true });
  }, [isSelected]);

  return {
    ref,
    tabIndex: isSelected ? 0 : -1
  };
}

function setRecordCount(row, filterParams) {
  row['identicalCount'] = 0;
  row['differentCount'] = 0;
  row['sourceOnlyCount'] = 0;
  row['targetOnlyCount'] = 0;

  row.children.map((ch) => {
    if (filterParams.includes(ch.status)) {
      if (ch.status == FILTER_NAME.IDENTICAL) {
        row['identicalCount'] = row['identicalCount'] + 1;
      } else if (ch.status == FILTER_NAME.DIFFERENT) {
        row['differentCount'] = row['differentCount'] + 1;
      } else if (ch.status == FILTER_NAME.SOURCE_ONLY) {
        row['sourceOnlyCount'] = row['sourceOnlyCount'] + 1;
      } else if (ch.status == FILTER_NAME.TARGET_ONLY) {
        row['targetOnlyCount'] = row['targetOnlyCount'] + 1;
      }
    }
  });

}

function CellExpanderFormatter({
  row,
  isCellSelected,
  expanded,
  filterParams,
  onCellExpand
}) {
  const { ref, tabIndex } = useFocusRef(isCellSelected);
  'identicalCount' in row && setRecordCount(row, filterParams);

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onCellExpand();
    }
  }

  return (
    <div className='ResultGridComponent-cellExpand'>
      <span onClick={onCellExpand} onKeyDown={handleKeyDown}>
        <span ref={ref} tabIndex={tabIndex} className={'identicalCount' in row ? 'ResultGridComponent-subRow' : null}>
          {expanded ? <KeyboardArrowDownRoundedIcon /> : <KeyboardArrowRightRoundedIcon />} <span className={row.icon + ' ResultGridComponent-rowIcon'}></span>{row.label}
          {
            'identicalCount' in row ?
              <span className={'ResultGridComponent-count'}>
                {
                  filterParams.includes(FILTER_NAME.IDENTICAL) && <><span className='ResultGridComponent-countLabel'>{FILTER_NAME.IDENTICAL}:</span> <span className='ResultGridComponent-countStyle'>{row.identicalCount} </span></>
                }
                {
                  filterParams.includes(FILTER_NAME.DIFFERENT) && <><span className='ResultGridComponent-countLabel'>{FILTER_NAME.DIFFERENT}:</span> <span className='ResultGridComponent-countStyle'>{row.differentCount}  </span></>
                }
                {
                  filterParams.includes(FILTER_NAME.SOURCE_ONLY) && <><span className='ResultGridComponent-countLabel'>{FILTER_NAME.SOURCE_ONLY}:</span> <span className='ResultGridComponent-countStyle'>{row.sourceOnlyCount}  </span></>
                }
                {
                  filterParams.includes(FILTER_NAME.TARGET_ONLY) && <><span className='ResultGridComponent-countLabel'>{FILTER_NAME.TARGET_ONLY}: </span><span className='ResultGridComponent-countStyle'>{row.targetOnlyCount}</span></>
                }
              </span>
              : null

          }
        </span>
      </span>
    </div>
  );
}

CellExpanderFormatter.propTypes = {
  row: PropTypes.object,
  isCellSelected: PropTypes.bool,
  expanded: PropTypes.bool,
  onCellExpand: PropTypes.func,
  filterParams: PropTypes.array
};


function toggleSubRow(rows, id, filterParams) {
  const newRows = [...rows];
  const rowIndex = newRows.findIndex((r) => r.id === id);

  const row = newRows[rowIndex];
  if (!row) return newRows;
  const { children } = row;
  if (!children) return newRows;

  if (children.length > 0) {
    newRows[rowIndex] = { ...row, isExpanded: !row.isExpanded };
    if (!row.isExpanded) {
      let tempChild = [];
      expandRows(children, filterParams, tempChild, newRows, rowIndex);
    } else {
      collapseRows(newRows, filterParams, rowIndex);
    }
    return newRows;
  } else {
    newRows.splice(rowIndex, 1);
    return newRows;
  }
}

function expandRows(children, filterParams, tempChild, newRows, rowIndex) {
  children.map((child) => {
    if ('children' in child) {
      let tempSubChild = [];
      child.children.map((subChild) => {
        if (filterParams.includes(subChild.status)) {
          tempSubChild.push(subChild);
        }
      });

      if (tempSubChild.length > 0) {
        tempChild.push(child);
      }

    }
    else if (filterParams.includes(child.status)) {
      tempChild.push(child);
    }
  });
  if (tempChild.length > 0) {
    newRows.splice(rowIndex + 1, 0, ...tempChild);
  } else {
    newRows.splice(rowIndex, 1);
  }
}

function collapseRows(newRows, filterParams, rowIndex) {
  let totalChild = 0;
  let filteredChild = newRows[rowIndex].children.filter((el) => {
    if (el?.children) {
      let clist = el.children.filter((subch) => {
        return filterParams.includes(subch.status);
      });
      if (clist.length > 0) {
        return el;
      }
    } else {
      return el?.status ? filterParams.includes(el.status) : el;
    }
  });
  let totalChCount = filteredChild.length;
  for (let i = 0; i < filteredChild.length; i++) {
    let _index = i + 1;
    let indx = totalChild ? rowIndex + totalChild + _index : rowIndex + _index;
    if (newRows[indx]?.isExpanded) {
      let filteredSubChild = newRows[indx].children.filter((el) => {
        return filterParams.includes(el.status);
      });
      totalChild += filteredSubChild.length;
    }
  }
  newRows.splice(rowIndex + 1, totalChild ? totalChCount + totalChild : totalChCount);
}

function getChildrenRows(data) {
  if ('children' in data) {
    return data.children;
  }

  return data;
}

function checkRowExpanedStatus(rows, record) {
  if (rows.length > 0) {
    let tempRecord = rows.filter((rec) => {
      return rec.parentId == record.parentId && rec.label == record.label;
    });
    return tempRecord.length > 0 ? tempRecord[0].isExpanded : false;
  }
  return false;
}

function prepareRows(rows, gridData, filterParams) {
  let newRows = [];

  let addedIds = [];
  // Filter data objects with label 'Database Objects'.
  let newGridData = gridData.filter(function (obj) {
    return obj.label === gettext('Database Objects');
  });
  // Filter data objects except 'Database Objects'
  let otherObjects = gridData.filter(function (obj) {
    return obj.label !== gettext('Database Objects');
  });
  // Sort other objects
  otherObjects.sort((a, b) => (a.label > b.label) ? 1 : -1);
  // Merge 'Database Objects' and other data
  newGridData = newGridData.concat(otherObjects);

  newGridData.map((record) => {
    let children = getChildrenRows(record);
    // Sort the children using label
    children.sort((a, b) => (a.label > b.label) ? 1 : -1);

    if (children.length > 0) {
      children.map((child) => {
        let subChildren = getChildrenRows(child);
        // Sort the sub children using label
        subChildren.sort((a, b) => (a.label > b.label) ? 1 : -1);
        let tempChildList = [];
        subChildren.map((subChild) => {
          if (filterParams.includes(subChild.status)) {
            tempChildList.push(subChild);
            addedIds.push(subChild.id);
          }
        });

        if (!addedIds.includes(record.id) && tempChildList.length > 0) {
          addedIds.push(record.id);
          record.isExpanded = true;
          newRows.push(record);
        }

        if (!addedIds.includes(child.id) && tempChildList.length > 0) {
          addedIds.push(child.id);
          child.isExpanded = checkRowExpanedStatus(rows, child);
          newRows.push(child);
          newRows = checkAndAddChild(child, newRows, tempChildList);
        }

      });

    }
  });

  return newRows;
}

function checkAndAddChild(child, newRows, tempChildList) {
  if (child.isExpanded) {
    newRows = newRows.concat(tempChildList);
  }

  return newRows;
}

function reducer(rows, { type, id, filterParams, gridData }) {
  switch (type) {
  case 'toggleSubRow':
    return toggleSubRow(rows, id, filterParams);
  case 'applyFilter':
    return prepareRows(rows, gridData, filterParams);
  default:
    return rows;
  }
}

function selectHeaderRenderer({selectedRows, setSelectedRows, rootSelection, setRootSelection, allRowIds, selectedRowIds}) {
  const Cell = ()=>(
    <InputCheckbox
      cid={_.uniqueId('rgc')}
      className='ResultGridComponent-headerSelectCell'
      value={selectedRows.length == allRowIds.length ? rootSelection : false}
      size='small'
      onChange={(e) => {
        if (e.target.checked) {
          setRootSelection(true);
          setSelectedRows([...allRowIds]);
          selectedRowIds([...allRowIds]);
        } else {
          setRootSelection(false);
          setSelectedRows([]);
          selectedRowIds([]);
        }
      }
      }
    ></InputCheckbox>
  );
  Cell.displayName = 'Cell';
  return Cell;
}
function selectFormatter({selectedRows, setSelectedRows, setRootSelection, setActiveRow, allRowIds, selectedRowIds, selectedResultRows, deselectResultRows}) {
  const Cell = ({ row, isCellSelected }) => {
    isCellSelected && setActiveRow(row.id);
    return (
      <InputCheckbox
        className='ResultGridComponent-selectCell'
        cid={`${row.id}`}
        value={selectedRows.includes(`${row.id}`)}
        size='small'
        onChange={(e) => {
          setSelectedRows((prev) => {
            let tempSelectedRows = [...prev];
            if (!prev.includes(e.target.id)) {
              selectedResultRows(row, tempSelectedRows);
              tempSelectedRows.length === allRowIds.length && setRootSelection(true);
            } else {
              deselectResultRows(row, tempSelectedRows);
            }
            tempSelectedRows = new Set(tempSelectedRows);
            selectedRowIds([...tempSelectedRows]);
            return [...tempSelectedRows];
          });
        }
        }
      ></InputCheckbox>
    );
  };

  Cell.displayName = 'Cell';
  Cell.propTypes = {
    row: PropTypes.object,
    isCellSelected: PropTypes.bool,
  };
  return Cell;
}

function expandFormatter({setActiveRow, filterParams, gridData, selectedRows, dispatch}) {
  const Cell = ({ row, isCellSelected })=>{
    const hasChildren = row.children !== undefined;
    isCellSelected && setActiveRow(row.id);
    return (
      <>
        {hasChildren && (

          <CellExpanderFormatter
            row={row}
            isCellSelected={isCellSelected}
            expanded={row.isExpanded === true}
            filterParams={filterParams}
            onCellExpand={() => dispatch({ id: row.id, type: 'toggleSubRow', filterParams: filterParams, gridData: gridData, selectedRows: selectedRows })}
          />
        )}
        {!hasChildren && (
          <Box>
            <span className={'ResultGridComponent-recordRow ' + row.icon}></span>
            {row.label}
          </Box>
        )}
      </>
    );
  };

  Cell.displayName = 'Cell';
  Cell.propTypes = {
    row: PropTypes.object,
    isCellSelected: PropTypes.bool,
  };
  return Cell;
}

function resultFormatter({setActiveRow}) {
  const Cell = ({ row, isCellSelected })=>{
    isCellSelected && setActiveRow(row.id);

    return (
      <Box>
        {row.status}
      </Box>
    );
  };

  Cell.displayName = 'Cell';
  Cell.propTypes = {
    row: PropTypes.object,
    isCellSelected: PropTypes.bool,
  };
  return Cell;
}

export function ResultGridComponent({ gridData, allRowIds, filterParams, selectedRowIds, transId, sourceData, targetData }) {

  const [rows, dispatch] = useReducer(reducer, [...gridData]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [rootSelection, setRootSelection] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const schemaDiffToolContext = useContext(SchemaDiffContext);
  const pgAdmin = usePgAdmin();

  function checkAllChildInclude(row, tempSelectedRows) {
    let isChildAllInclude = true;
    row.metadata.children.map((id) => {
      if (!tempSelectedRows.includes(id) && id !== `${row.id}`) {
        isChildAllInclude = false;
      }
    });
    return isChildAllInclude;
  }

  function selectedResultRows(row, tempSelectedRows) {
    if (row.metadata.isRoot) {
      tempSelectedRows.push(`${row.id}`, ...row.metadata.children);
      tempSelectedRows.push(...row.metadata.subChildren);
    } else if (row.metadata.subChildren) {
      tempSelectedRows.push(...row.metadata.dependencies);
      tempSelectedRows.push(`${row.id}`, ...row.metadata.subChildren);
      let isChildAllInclude = checkAllChildInclude(row, tempSelectedRows);
      isChildAllInclude && tempSelectedRows.push(`${row.metadata.parentId}`);
    } else {
      tempSelectedRows.push(...row.dependencieRowIds);
      tempSelectedRows.push(`${row.id}`);
      let isChildAllInclude = checkAllChildInclude(row, tempSelectedRows);
      isChildAllInclude && tempSelectedRows.push(`${row.metadata.parentId}`);

      for(let rowData of rows) {
        if (rowData.id == row.metadata.parentId) {
          let isChildInclude = checkAllChildInclude(rowData, tempSelectedRows);
          isChildInclude && tempSelectedRows.push(`${rowData.metadata.parentId}`);
        }
      }

    }
  }

  function deselectChildAndSubChild(children, tempSelectedRows) {
    children.map((chid) => {
      let indx = tempSelectedRows.indexOf(chid);
      indx != -1 && tempSelectedRows.splice(indx, 1);
    });
  }

  function deselectResultRows(row, tempSelectedRows) {
    if (row.metadata.isRoot) {
      deselectChildAndSubChild(row.metadata.subChildren, tempSelectedRows);

      deselectChildAndSubChild(row.metadata.children, tempSelectedRows);

      let rootIndex = tempSelectedRows.indexOf(`${row.id}`);
      rootIndex != -1 && tempSelectedRows.splice(rootIndex, 1);

    } else if (row.metadata.subChildren) {
      deselectChildAndSubChild(row.metadata.subChildren, tempSelectedRows);

      let isChildAllInclude = true;
      row.metadata.children.map((id) => {
        if (tempSelectedRows.includes(id)) {
          isChildAllInclude = false;
        }
      });

      let rootIndex = tempSelectedRows.indexOf(`${row.id}`);
      rootIndex != -1 && tempSelectedRows.splice(rootIndex, 1);

      let parentIndex = tempSelectedRows.indexOf(`${row.metadata.parentId}`);
      (!isChildAllInclude && parentIndex != -1) && tempSelectedRows.splice(parentIndex, 1);

      row.metadata.dependencies.map((depid) => {
        let depIndex = tempSelectedRows.indexOf(`${depid}`);
        depIndex != -1 && tempSelectedRows.splice(depIndex, 1);
      });

    } else {
      let elementIndex = tempSelectedRows.indexOf(`${row.id}`);
      elementIndex != -1 && tempSelectedRows.splice(elementIndex, 1);

      let parentElIndex = tempSelectedRows.indexOf(`${row.metadata.parentId}`);
      parentElIndex != -1 && tempSelectedRows.splice(parentElIndex, 1);

      let rootIndex = tempSelectedRows.indexOf(`${row.metadata.rootId}`);
      rootIndex != -1 && tempSelectedRows.splice(rootIndex, 1);

      row.dependencieRowIds.map((id) => {
        let deptRowIndex = tempSelectedRows.indexOf(`${id}`);
        deptRowIndex != -1 && tempSelectedRows.splice(deptRowIndex, 1);
      });
    }
  }

  function getStyleClassName(row, selectedRowIds, activeRowId) {
    let clsName = null;
    if (selectedRowIds.includes(`${row.id}`) || row.id == activeRowId) {
      clsName = 'ResultGridComponent-selectedRow';
    } else if (row.status == FILTER_NAME.DIFFERENT) {
      clsName = 'ResultGridComponent-different';
    } else if (row.status == FILTER_NAME.SOURCE_ONLY) {
      clsName = 'ResultGridComponent-source';
    } else if (row.status == FILTER_NAME.TARGET_ONLY) {
      clsName = 'ResultGridComponent-target';
    } else if (row.status == FILTER_NAME.IDENTICAL) {
      clsName = 'ResultGridComponent-identical';
    }

    return clsName;
  }

  const columns = [
    {
      key: 'id',
      ...SelectColumn,
      minWidth: 30,
      width: 30,
      renderHeaderCell: selectHeaderRenderer({
        selectedRows, setSelectedRows, rootSelection,
        setRootSelection, allRowIds, selectedRowIds
      }),
      renderCell: selectFormatter({
        selectedRows, setSelectedRows, setRootSelection,
        setActiveRow, allRowIds, selectedRowIds,
        selectedResultRows, deselectResultRows
      }),
    },
    {
      key: 'label',
      name: 'Objects',
      width: '80%',
      colSpan(args) {
        if (args.type === 'ROW' && 'children' in args.row) {
          return 2;
        }

        return 1;
      },
      renderCell: expandFormatter({
        setActiveRow, filterParams, gridData,
        selectedRows, dispatch
      }),
    },
    {
      key: 'status',
      name: 'Comparison Result',
      renderCell: resultFormatter({setActiveRow}),
    },
  ];

  useEffect(() => {
    let tempRows = gridData;
    tempRows.map((row) => {
      dispatch({ id: row.id, type: 'applyFilter', filterParams: filterParams, gridData: gridData, selectedRows: selectedRows });
    });
  }, [filterParams]);

  const eventBus = useContext(SchemaDiffEventsContext);
  const rowSelectionTimeoutRef = useRef();

  const rowSelection = (rowIdx) => {
    if (rowSelectionTimeoutRef.current) {
      clearTimeout(rowSelectionTimeoutRef.current);
      rowSelectionTimeoutRef.current = null;
    }

    rowSelectionTimeoutRef.current = setTimeout(()=> {
      rowSelectionTimeoutRef.current = null;
      const row = rows[rowIdx];
      if (row.ddlData != undefined && row.status != FILTER_NAME.IDENTICAL) {
        eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_RESULT_SQL, row.ddlData);
      } else if (row.status == FILTER_NAME.IDENTICAL) {
        let url_params = {
          'trans_id': transId,
          'source_sid': sourceData.sid,
          'source_did': sourceData.did,
          'source_scid': row.source_scid,
          'target_sid': targetData.sid,
          'target_did': targetData.did,
          'target_scid': row.target_scid,
          'comp_status': row.status,
          'source_oid': row.source_oid,
          'target_oid': row.target_oid,
          'node_type': row.itemType,
        };

        let baseUrl = url_for('schema_diff.ddl_compare', url_params);
        schemaDiffToolContext.api.get(baseUrl).then((res) => {
          row.ddlData = {
            'SQLdiff': res.data.diff_ddl,
            'sourceSQL': res.data.source_ddl,
            'targetSQL': res.data.target_ddl
          };
          eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_RESULT_SQL, row.ddlData);
        }).catch((err) => {
          pgAdmin.Browser.notifier.alert(err.message);
        });
      } else {
        eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_RESULT_SQL, {});
      }
    }, 250);
  };

  function rowKeyGetter(row) {
    return row.id;
  }

  return (
    <StyledBox flexGrow="1" minHeight="0" id="schema-diff-grid">
      {
        gridData ?
          <PgReactDataGrid
            id="schema-diff-result-grid"
            columns={columns} rows={rows}
            className='ResultGridComponent-grid'
            treeDepth={2}
            enableRowSelect={true}
            defaultColumnOptions={{
              enableResizing: true
            }}
            headerRowHeight={28}
            rowHeight={28}
            onItemSelect={rowSelection}
            enableCellSelect={false}
            rowKeyGetter={rowKeyGetter}
            direction={'vertical-lr'}
            noRowsText={gettext('No difference found')}
            noRowsIcon={<InfoIcon className='ResultGridComponent-noRowsIcon' />}
            rowClass={(row) =>
              getStyleClassName(row, selectedRows, activeRow)
            }
          />
          :
          <>
            {gettext('Loading result grid...')}
          </>
      }
    </StyledBox>
  );
}

ResultGridComponent.propTypes = {
  gridData: PropTypes.array,
  allRowIds: PropTypes.array,
  filterParams: PropTypes.array,
  selectedRowIds: PropTypes.func,
  transId: PropTypes.number,
  sourceData: PropTypes.object,
  targetData: PropTypes.object,
};
