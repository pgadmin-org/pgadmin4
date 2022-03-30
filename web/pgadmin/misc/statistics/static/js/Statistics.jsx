/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React, { useEffect } from 'react';
import PgTable from 'sources/components/PgTable';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import Notify from '../../../../static/js/helpers/Notifier';
import getApiInstance from 'sources/api_instance';
import { makeStyles } from '@material-ui/core/styles';
import sizePrettify from 'sources/size_prettify';
import { getURL } from '../../../static/utils/utils';
import Loader from 'sources/components/Loader';
const useStyles = makeStyles((theme) => ({
  emptyPanel: {
    minHeight: '100%',
    minWidth: '100%',
    background: theme.palette.grey[400],
    overflow: 'auto',
    padding: '7.5px',
  },
  panelIcon: {
    width: '80%',
    margin: '0 auto',
    marginTop: '25px !important',
    position: 'relative',
    textAlign: 'center',
  },
  panelMessage: {
    marginLeft: '0.5rem',
    fontSize: '0.875rem',
  },
  loading: {
    marginLeft: '0.5rem',
    fontSize: '0.875rem',
    colour: theme.palette.grey[400]
  },
  autoResizer: {
    height: '100% !important',
    width: '100% !important',
    background: theme.palette.grey[400],
    padding: '7.5px',
    overflowX: 'auto !important',
    overflowY: 'hidden !important',
    minHeight: '100%',
    minWidth: '100%',
  },
}));

function getColumn(data, singleLineStatistics) {
  let columns = [];
  if (!singleLineStatistics) {
    if (!_.isUndefined(data)) {
      data.forEach((row) => {
        var column = {
          Header: row.name,
          accessor: row.name,
          sortble: true,
          resizable: false,
          disableGlobalFilter: false,
        };
        columns.push(column);
      });
    }
    return columns;
  } else {
    columns = [
      {
        Header: 'Statictics',
        accessor: 'name',
        sortble: true,
        resizable: false,
        disableGlobalFilter: false,
      },
      {
        Header: 'Value',
        accessor: 'value',
        sortble: true,
        resizable: false,
        disableGlobalFilter: false,
      },
    ];
  }
  return columns;
}

function getTableData(res, node) {
  let nodeStats = [],
    colData;
  if (res.data.data) {
    let data = res.data.data;
    if (node.hasCollectiveStatistics || data['rows'].length > 1) {
      data.rows.forEach((row) => {
        // Prettify the field values
        if (!_.isEmpty(node.statsPrettifyFields)) {
          node.statsPrettifyFields.forEach((field) => {
            row[field] = sizePrettify(row[field]);
          });
        }
        nodeStats.push({ ...row, icon: '' });
      });
      colData = getColumn(data.columns, false);
    } else {
      nodeStats = createSingleLineStatistics(data, node.statsPrettifyFields);
      colData = getColumn(data.columns, true);
    }
  }
  return [nodeStats, colData];
}

function createSingleLineStatistics(data, prettifyFields) {
  var row = data['rows'][0],
    columns = data['columns'],
    res = [],
    name,
    value;

  for (var idx in columns) {
    name = columns[idx]['name'];
    if (row && row[name]) {
      value =
        _.indexOf(prettifyFields, name) != -1
          ? sizePrettify(row[name])
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

export default function Statistics({ nodeData, item, node, ...props }) {
  const classes = useStyles();
  const [tableData, setTableData] = React.useState([]);

  const [msg, setMsg] = React.useState('');
  const [loaderText, setLoaderText] = React.useState('');
  const [columns, setColumns] = React.useState([
    {
      Header: 'Statictics',
      accessor: 'name',
      sortble: true,
      resizable: false,
      disableGlobalFilter: false,
    },
    {
      Header: 'Value',
      accessor: 'value',
      sortble: true,
      resizable: false,
      disableGlobalFilter: false,
    },
  ]);

  useEffect(() => {
    let url,
      message = gettext('Please select an object in the tree view.');

    if (node) {
      url = getURL(nodeData, true, props.treeNodeInfo, node, item, 'stats');

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
          .catch((e) => {
            Notify.alert(
              gettext('Failed to retrieve data from the server.'),
              gettext(e.message)
            );
            // show failed message.
            setLoaderText('');
            setMsg(gettext('Failed to retrieve data from the server.'));
          });
      } else {
        setLoaderText('');
        setMsg('No statistics are available for the selected object.');
      }
    }
    if (message != '') {
      setMsg(message);
    }
    return () => {
      setTableData([]);
    };
  }, [nodeData]);

  return (
    <>
      {tableData.length > 0 ? (
        <PgTable
          className={classes.autoResizer}
          columns={columns}
          data={tableData}
          msg={msg}
          type={'panel'}
        ></PgTable>
      ) : (
        <div className={classes.emptyPanel}>
          {loaderText ? (<Loader message={loaderText} className={classes.loading} />) :
            <div className={classes.panelIcon}>
              <i className="fa fa-exclamation-circle"></i>
              <span className={classes.panelMessage}>{gettext(msg)}</span>
            </div>
          }
        </div>
      )}
    </>
  );
}

Statistics.propTypes = {
  res: PropTypes.array,
  nodeData: PropTypes.object,
  item: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  node: PropTypes.func,
};
