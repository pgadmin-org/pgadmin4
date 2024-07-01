/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useCallback, useEffect, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import PgTable from 'sources/components/PgTable';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { BgProcessManagerEvents, BgProcessManagerProcessState } from './BgProcessConstants';
import { PgButtonGroup, PgIconButton } from '../../../../static/js/components/Buttons';
import CancelIcon from '@mui/icons-material/Cancel';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpIcon from '@mui/icons-material/HelpRounded';
import url_for from 'sources/url_for';
import { Box } from '@mui/material';
import { usePgAdmin } from '../../../../static/js/BrowserComponent';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import ErrorBoundary from '../../../../static/js/helpers/ErrorBoundary';
import ProcessDetails from './ProcessDetails';


const Root = styled('div')(({theme}) => ({
  height: '100%',
  '& .Processes-stopButton': {
    color: theme.palette.error.main
  },
  '& .Processes-noPadding': {
    padding: '0 !important',
    '& .Processes-bgSucess': {
      backgroundColor: theme.palette.success.light,
      height: '100%',
      padding: '4px',
    },
    '& .Processes-bgFailed': {
      backgroundColor: theme.palette.error.light,
      height: '100%',
      padding: '4px',
    },
    '& .Processes-bgTerm': {
      backgroundColor: theme.palette.warning.light,
      height: '100%',
      padding: '4px',
    },
    '& .Processes-bgRunning': {
      backgroundColor: theme.palette.primary.light,
      height: '100%',
      padding: '4px',
    }
  },
}));

const ProcessStateTextAndColor = {
  [BgProcessManagerProcessState.PROCESS_NOT_STARTED]: [gettext('Not started'), 'bgRunning'],
  [BgProcessManagerProcessState.PROCESS_STARTED]: [gettext('Running'), 'bgRunning'],
  [BgProcessManagerProcessState.PROCESS_FINISHED]: [gettext('Finished'), 'bgSucess'],
  [BgProcessManagerProcessState.PROCESS_TERMINATED]: [gettext('Terminated'), 'bgTerm'],
  [BgProcessManagerProcessState.PROCESS_TERMINATING]: [gettext('Terminating...'), 'bgTerm'],
  [BgProcessManagerProcessState.PROCESS_FAILED]: [gettext('Failed'), 'bgFailed'],
};

const cellPropTypes = {
  row: PropTypes.any,
};

function CancelCell({row}) {
  const pgAdmin = usePgAdmin();

  return (
    <PgIconButton
      size="xs"
      noBorder
      icon={<CancelIcon />}
      className='Processes-stopButton'
      disabled={row.original.process_state != BgProcessManagerProcessState.PROCESS_STARTED
        || row.original.server_id != null}
      onClick={(e) => {
        e.preventDefault();
        pgAdmin.Browser.BgProcessManager.stopProcess(row.original.id);
      }}
      aria-label="Stop Process"
      title={gettext('Stop Process')}
    ></PgIconButton>
  );
}
CancelCell.propTypes = cellPropTypes;

function getLogsCell(pgAdmin, onViewDetailsClick) {
  function LogsCell({ row }) {
    return (
      <PgIconButton
        size="xs"
        icon={<DescriptionOutlinedIcon />}
        noBorder
        onClick={(e) => {
          e.preventDefault();
          onViewDetailsClick(row.original);
        }}
        aria-label="View details"
        title={gettext('View details')}
      />
    );
  }
  LogsCell.propTypes = cellPropTypes;

  return LogsCell;
}

function StatusCell({row}) {
  const [text, bgcolor] = ProcessStateTextAndColor[row.original.process_state];
  return <Box className={'Processes-'+bgcolor}>{text}</Box>;
}
StatusCell.propTypes = cellPropTypes;

function CustomHeader({selectedRowIDs, setSelectedRows}) {
  const pgAdmin = usePgAdmin();

  return (
    <Box>
      <PgButtonGroup>
        <PgIconButton
          icon={<DeleteIcon style={{height: '1.4rem'}}/>}
          aria-label="Acknowledge and Remove"
          title={gettext('Acknowledge and Remove')}
          onClick={() => {
            pgAdmin.Browser.notifier.confirm(gettext('Remove Processes'), gettext('Are you sure you want to remove the selected processes?'), ()=>{
              pgAdmin.Browser.BgProcessManager.acknowledge(selectedRowIDs);
              setSelectedRows({});
            });
          }}
          disabled={selectedRowIDs.length <= 0}
        ></PgIconButton>
        <PgIconButton
          icon={<HelpIcon style={{height: '1.4rem'}}/>}
          aria-label="Help"
          title={gettext('Help')}
          onClick={() => {
            window.open(url_for('help.static', {'filename': 'processes.html'}));
          }}
        ></PgIconButton>
      </PgButtonGroup>
    </Box>
  );
}
CustomHeader.propTypes = {
  selectedRowIDs: PropTypes.array,
  setSelectedRows: PropTypes.func,
};

export default function Processes() {

  const pgAdmin = usePgAdmin();
  const [tableData, setTableData] = React.useState([]);
  const [selectedRows, setSelectedRows] = React.useState({});
  const selectedRowIDs = useMemo(()=>Object.keys(selectedRows).filter((k)=>selectedRows[k]), [selectedRows]);

  const onViewDetailsClick = useCallback((p)=>{
    const panelTitle = gettext('Process Watcher - %s', p.type_desc);
    const panelId = BROWSER_PANELS.PROCESS_DETAILS+''+p.id;
    pgAdmin.Browser.docker.openDialog({
      id: panelId,
      title: panelTitle,
      content: (
        <ErrorBoundary>
          <ProcessDetails
            data={p}
          />
        </ErrorBoundary>
      )
    }, pgAdmin.Browser.stdW.md, pgAdmin.Browser.stdH.md);
  }, []);


  const columns = useMemo(()=>{
    return [{
      header: () => null,
      enableSorting: false,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-stop',
      cell: CancelCell,
    },
    {
      header: () => null,
      enableSorting: false,
      enableResizing: false,
      enableFilters: false,
      size: 35,
      maxSize: 35,
      minSize: 35,
      id: 'btn-logs',
      cell: getLogsCell(pgAdmin, onViewDetailsClick),
    },
    {
      header: gettext('PID'),
      accessorKey: 'utility_pid',
      enableSorting: true,
      enableResizing: false,
      width: 70,
      minWidth: 70,
      enableFilters: true,
    },
    {
      header: gettext('Type'),
      accessorFn: (row)=>row.details?.type,
      enableSorting: true,
      enableResizing: true,
      width: 100,
      minWidth: 70,
      enableFilters: true,
    },
    {
      header: gettext('Server'),
      accessorFn: (row)=>row.details?.server,
      enableSorting: true,
      enableResizing: true,
      width: 200,
      minWidth: 120,
      enableFilters: true,
    },
    {
      header: gettext('Object'),
      accessorFn: (row)=>row.details?.object,
      enableSorting: true,
      enableResizing: true,
      width: 200,
      minWidth: 120,
      enableFilters: true,
    },
    {
      id: 'stime',
      header: gettext('Start Time'),
      enableSorting: true,
      enableResizing: true,
      enableFilters: false,
      width: 150,
      minWidth: 150,
      accessorFn: (row)=>(new Date(row.stime)),
      cell: (info)=>(info.getValue().toLocaleString()),
    },
    {
      header: gettext('Status'),
      enableSorting: true,
      enableResizing: false,
      enableFilters: true,
      width: 120,
      minWidth: 120,
      accessorFn: (row)=>ProcessStateTextAndColor[row.process_state][0],
      dataClassName: 'Processes-noPadding',
      cell: StatusCell,
    },
    {
      header: gettext('Time Taken (sec)'),
      accessorKey: 'execution_time',
      enableSorting: true,
      enableResizing: true,
      enableFilters: false,
    }];
  }, []);

  const updateList = ()=>{
    if(pgAdmin.Browser.BgProcessManager.procList) {
      setTableData([...pgAdmin.Browser.BgProcessManager.procList]);
    }
  };

  useEffect(() => {
    updateList();
    pgAdmin.Browser.BgProcessManager.registerListener(BgProcessManagerEvents.LIST_UPDATED, updateList);
    return ()=>{
      pgAdmin.Browser.BgProcessManager.deregisterListener(BgProcessManagerEvents.LIST_UPDATED, updateList);
    };
  }, []);

  return (
    <Root>
      <PgTable
        data-test="processes"
        columns={columns}
        data={tableData}
        sortOptions={[{id: 'stime', desc: true}]}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        hasSelectRow={true}
        tableProps={{
          getRowId: (row)=>{
            return row.id;
          }
        }}
        customHeader={<CustomHeader selectedRowIDs={selectedRowIDs} setSelectedRows={setSelectedRows} />}
      ></PgTable></Root>
  );
}
