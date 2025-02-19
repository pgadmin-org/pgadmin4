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
import React, { useEffect } from 'react';
import PgTable from 'sources/components/PgTable';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import getApiInstance from 'sources/api_instance';
import { getURL } from '../../../static/utils/utils';
import Loader from 'sources/components/Loader';
import EmptyPanelMessage from '../../../../static/js/components/EmptyPanelMessage';
import { toPrettySize } from '../../../../static/js/utils';
import withStandardTabInfo from '../../../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';

const Root = styled('div')(({theme}) => ({
  height : '100%',
  '& .Statistics-emptyPanel': {
    minHeight: '100%',
    minWidth: '100%',
    background: theme.otherVars.emptySpaceBg,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
  }
}));

function getColumn(data, singleLineStatistics, prettifyFields=[]) {
  let columns = [];
  if (!singleLineStatistics) {
    if (!_.isUndefined(data)) {
      data.forEach((row) => {
        columns.push({
          header: row.name,
          accessorKey: row.name,
          enableSorting: true,
          enableResizing: true,
          enableFilters: true,
          sortingFn: 'alphanumeric',
        });
      });
    }
  } else {
    columns = [
      {
        header: gettext('Statistics'),
        accessorKey: 'name',
        enableSorting: true,
        enableResizing: true,
        enableFilters: true,
      },
      {
        header: 'Value',
        accessorKey: 'value',
        enableSorting: false,
        enableResizing: true,
        enableFilters: true,
      },
    ];
  }
  columns.forEach((c)=>{
    // Prettify the cell view
    if(prettifyFields.includes(c.header)) {
      c.cell = ({cell})=><>{toPrettySize(cell.getValue())}</>;
      c.cell.displayName = 'Cell';
      c.cell.propTypes = {
        value: PropTypes.any,
      };
    }
  });
  return columns;
}

function getTableData(res, node) {
  let nodeStats = [],
    colData;
  if (res.data.data) {
    let data = res.data.data;
    if (node.hasCollectiveStatistics || data['rows'].length > 1) {
      data.rows.forEach((row) => {
        nodeStats.push({ ...row, icon: '' });
      });
      colData = getColumn(data.columns, false, node.statsPrettifyFields);
    } else {
      nodeStats = createSingleLineStatistics(data, node.statsPrettifyFields);
      colData = getColumn(data.columns, true);
    }
  }
  return [nodeStats, colData];
}

function createSingleLineStatistics(data, prettifyFields) {
  let row = data['rows'][0],
    columns = data['columns'],
    res = [],
    name,
    value;

  for (let idx in columns) {
    name = columns[idx]['name'];
    if (row?.[name]) {
      value =
        _.indexOf(prettifyFields, name) != -1
          ? toPrettySize(row[name])
          : row[name];
    } else {
      value = null;
    }

    res.push({
      name: name,
      value: value,
      icon: '',
    });
  }

  return res;
}

function Statistics({ nodeData, nodeItem, node, treeNodeInfo, isActive, isStale, setIsStale }) {
  const [tableData, setTableData] = React.useState([]);
  const [msg, setMsg] = React.useState('');
  const [loaderText, setLoaderText] = React.useState('');
  const [columns, setColumns] = React.useState([
    {
      header: 'Statictics',
      accessorKey: 'name',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      header: 'Value',
      accessorKey: 'value',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ]);
  const pgAdmin = usePgAdmin();

  useEffect(() => {
    if(!isStale || !isActive) {
      return;
    }

    let url,
      message = gettext('Please select an object in the tree view.');

    if (node) {
      url = getURL(nodeData, true, treeNodeInfo, node, nodeItem, 'stats');

      message = gettext('No statistics are available for the selected object.');

      const api = getApiInstance();
      if (node.hasStatistics) {
        setLoaderText('Loading...');
        api({
          url: url,
          type: 'GET',
        })
          .then((res) => {
            let [nodeStats, colData] = getTableData(res, node);
            setTableData(nodeStats);
            if (!_.isUndefined(colData)) {
              setColumns(colData);
            }
            setLoaderText('');
          })
          .catch((err) => {
            // show failed message.
            setLoaderText('');

            if (err?.response?.data?.info == 'CRYPTKEY_MISSING') {
              pgAdmin.Browser.notifier.pgNotifier('error', err.request, 'The master password is not set', function(mesg) {
                setTimeout(function() {
                  if (mesg == 'CRYPTKEY_SET') {
                    setMsg('No statistics are available for the selected object.');
                  } else if (mesg == 'CRYPTKEY_NOT_SET') {
                    setMsg(gettext('The master password is not set.'));
                  }
                }, 100);
              });
            } else {
              pgAdmin.Browser.notifier.alert(
                gettext('Failed to retrieve data from the server.'),
                gettext(err.message)
              );
              setMsg(gettext('Failed to retrieve data from the server.'));
            }
          });
      } else {
        setLoaderText('');
        setMsg('No statistics are available for the selected object.');
      }
    }
    if (message != '') {
      setTableData([]);
      setMsg(message);
    }
    setIsStale(false);
  }, [isStale, isActive, nodeData?.id]);

  return (
    <Root>
      {tableData.length > 0 ? (
        <PgTable
          columns={columns}
          data={tableData}
          msg={msg}
          type={'panel'}
        ></PgTable>
      ) : (
        <div className='Statistics-emptyPanel'>
          <Loader message={loaderText} />
          <EmptyPanelMessage text={gettext(msg)}/>
        </div>
      )}
    </Root>
  );
}

Statistics.propTypes = {
  nodeData: PropTypes.object,
  nodeItem: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  node: PropTypes.func,
  isActive: PropTypes.bool,
  isStale: PropTypes.bool,
  setIsStale: PropTypes.func,
};

export default withStandardTabInfo(Statistics, BROWSER_PANELS.STATISTICS);
