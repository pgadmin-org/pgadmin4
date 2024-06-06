/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
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
import { parseApiError } from '../../../../static/js/api_instance';
import withStandardTabInfo from '../../../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { usePgAdmin } from '../../../../static/js/BrowserComponent';

const Root = styled('div')(({theme}) => ({
  height : '100%',
  '& .Dependencies-emptyPanel': {
    minHeight: '100%',
    minWidth: '100%',
    background: theme.otherVars.emptySpaceBg,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
  },
}));

function parseData(data, node) {
  // Update the icon
  data.forEach((element) => {
    if (element.icon == null || element.icon == '') {
      if (node) {
        element.icon = _.isFunction(node['node_image'])
          ? node['node_image'](null, null)
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

function Dependencies({ nodeData, nodeItem, node, treeNodeInfo, isActive, isStale, setIsStale }) {

  const [tableData, setTableData] = React.useState([]);
  const [loaderText, setLoaderText] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const pgAdmin = usePgAdmin();

  let columns = [
    {
      header: 'Type',
      accessorKey: 'type',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      cell: (info)=>{
        const type = info.getValue();
        return pgAdmin.Browser.Nodes?.[type]?.label ?? type;
      }
    },
    {
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      header: 'Restriction',
      accessorKey: 'field',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
      minSize: 280,
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
        'dependency'
      );
      message = gettext(
        'No dependency information is available for the selected object.'
      );
      if (node.hasDepends) {
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
              setLoaderText('');
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
      setMsg(message);
      setLoaderText('');
      setTableData([]);
    }
    setIsStale(false);
  }, [isActive, isStale]);

  return (
    (<Root>
      {tableData.length > 0 ? (
        <PgTable
          columns={columns}
          data={tableData}
          msg={msg}
          type={gettext('panel')}
        ></PgTable>
      ) : (
        <div className='Dependencies-emptyPanel'>
          {loaderText ? (<Loader message={loaderText}/>) :
            <EmptyPanelMessage text={gettext(msg)}/>
          }
        </div>
      )}
    </Root>)
  );
}

Dependencies.propTypes = {
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  node: PropTypes.func,
  nodeItem: PropTypes.object,
  isActive: PropTypes.bool,
  isStale: PropTypes.bool,
  setIsStale: PropTypes.func,
};

export default withStandardTabInfo(Dependencies, BROWSER_PANELS.DEPENDENCIES);
