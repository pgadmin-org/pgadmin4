/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React, { useEffect } from 'react';
import PgTable from 'sources/components/PgTable';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import getApiInstance from 'sources/api_instance';
import { makeStyles } from '@material-ui/core/styles';
import { getURL } from '../../../static/utils/utils';
import Loader from 'sources/components/Loader';
import EmptyPanelMessage from '../../../../static/js/components/EmptyPanelMessage';
import { parseApiError } from '../../../../static/js/api_instance';
import withStandardTabInfo from '../../../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { usePgAdmin } from '../../../../static/js/BrowserComponent';

const useStyles = makeStyles((theme) => ({
  emptyPanel: {
    minHeight: '100%',
    minWidth: '100%',
    background: theme.otherVars.emptySpaceBg,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
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
  autoResizer: {
    height: '100% !important',
    width: '100% !important',
    background: theme.palette.grey[400],
    padding: '7.5px',
    overflow: 'auto !important',
    minHeight: '100%',
    minWidth: '100%',
  },
}));

function parseData(data, node) {
  // Update the icon
  data.forEach((element) => {
    if (element.icon == null || element.icon == '') {
      if (node) {
        element.icon = _.isFunction(node['node_image'])
          ? node['node_image'].apply(node, [null, null])
          : node['node_image'] || 'icon-' + element.type;
      } else {
        element.icon = 'icon-' + element.type;
      }
    }
    if (element.icon) {
      element['icon'] = {
        type: element.icon,
      };
    }
  });
  return data;
}

function Dependents({ nodeData, nodeItem, node, treeNodeInfo, isActive, isStale, setIsStale }) {
  const classes = useStyles();
  const [tableData, setTableData] = React.useState([]);
  const [loaderText, setLoaderText] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const pgAdmin = usePgAdmin();

  let columns = [
    {
      Header: 'Type',
      accessor: 'type',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      Header: 'Name',
      accessor: 'name',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      Header: 'Restriction',
      accessor: 'field',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
      minWidth: 280,
    },
  ];

  useEffect(() => {
    if(!isStale || !isActive) {
      return;
    }

    let message = gettext('Please select an object in the tree view.');
    if (node) {
      let url = getURL(
        nodeData,
        true,
        treeNodeInfo,
        node,
        nodeItem,
        'dependent'
      );
      message = gettext(
        'No dependent information is available for the selected object.'
      );
      if (node.hasDepends && !nodeData.is_collection) {
        const api = getApiInstance();
        setLoaderText('Loading...');
        api({
          url: url,
          type: 'GET',
        })
          .then((res) => {
            if (res.data.length > 0) {
              let data = parseData(res.data, node);
              setTableData(data);
            } else {
              setMsg(message);
              setLoaderText('');
            }
          })
          .catch((e) => {
            pgAdmin.Browser.notifier.alert(
              gettext('Failed to retrieve data from the server.'),
              parseApiError(e)
            );
            // show failed message.
            setMsg(gettext('Failed to retrieve data from the server.'));
          });
      }
    }
    if (message != '') {
      setLoaderText('');
      setTableData([]);
      setMsg(message);
    }

    setIsStale(false);
  }, [isActive, isStale]);

  return (
    <>
      {tableData.length > 0 ? (
        <PgTable
          className={classes.autoResizer}
          columns={columns}
          data={tableData}
          msg={msg}
          type={gettext('panel')}
        ></PgTable>
      ) : (
        <div className={classes.emptyPanel}>
          {loaderText ? (<Loader message={loaderText}/>) :
            <EmptyPanelMessage text={gettext(msg)}/>
          }
        </div>

      )}
    </>
  );
}

Dependents.propTypes = {
  res: PropTypes.array,
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  node: PropTypes.func,
  nodeItem: PropTypes.object,
  isActive: PropTypes.bool,
  isStale: PropTypes.bool,
  setIsStale: PropTypes.func,
};

export default withStandardTabInfo(Dependents, BROWSER_PANELS.DEPENDENTS);
