/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect } from 'react';
import { generateNodeUrl } from '../../../../browser/static/js/node_ajax';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import getApiInstance from 'sources/api_instance';
import { makeStyles } from '@material-ui/core/styles';
import CodeMirror from '../../../../static/js/components/CodeMirror';
import Loader from 'sources/components/Loader';
import withStandardTabInfo from '../../../../static/js/helpers/withStandardTabInfo';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { usePgAdmin } from '../../../../static/js/BrowserComponent';

const useStyles = makeStyles((theme) => ({
  textArea: {
    height: '100% !important',
    width: '100% !important',
    background: theme.palette.grey[400],
    overflow: 'auto !important',
    minHeight: '100%',
    minWidth: '100%',
  },
}));

function SQL({nodeData, node, treeNodeInfo, isActive, isStale, setIsStale}) {
  const classes = useStyles();
  const did = ((!_.isUndefined(treeNodeInfo)) && (!_.isUndefined(treeNodeInfo['database']))) ? treeNodeInfo['database']._id: 0;
  const dbConnected = !_.isUndefined(treeNodeInfo) && !_.isUndefined(treeNodeInfo['database']) ? treeNodeInfo.database.connected: false;
  const [nodeSQL, setNodeSQL] = React.useState('');
  const [loaderText, setLoaderText] = React.useState('');
  const pgAdmin = usePgAdmin();

  useEffect(() => {
    if(!isStale || !isActive) {
      return;
    }
    let sql = '-- ' + gettext('Please select an object in the tree view.');
    if(node) {
      let url = generateNodeUrl.call(
        node,
        treeNodeInfo,
        'sql',
        nodeData,
        true,
        node.url_jump_after_node
      );
      if (did && !dbConnected){
        return;
      }
      sql =
        '-- ' + gettext('No SQL could be generated for the selected object.');

      if (node.hasSQL) {
        const api = getApiInstance();
        setLoaderText('Loading...');
        api({
          url: url,
          type: 'GET',
        })
          .then((res) => {
            if (res.data.length > 0) {
              setNodeSQL(res.data);
              setLoaderText('');
            } else {
              setNodeSQL(sql);
            }
          })
          .catch((e) => {
            pgAdmin.Browser.notifier.alert(
              gettext('Error'),
              gettext(e.response.data.errormsg)
            );
            // show failed message.
            setNodeSQL(gettext('Failed to retrieve data from the server.'));
            setLoaderText('');
          }).then(()=>{
            setLoaderText('');
          });
      }
    }
    if (sql != '') {
      setNodeSQL(sql);
    }
    setIsStale(false);
  }, [isStale, isActive, nodeData?.id]);

  return (
    <>
      <Loader message={loaderText}/>
      <CodeMirror
        className={classes.textArea}
        value={nodeSQL}
        readonly={true}
        options={{
          lineNumbers: true,
          mode: 'text/x-pgsql',
        }}
      />
    </>
  );
}

SQL.propTypes = {
  res: PropTypes.array,
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  node: PropTypes.func,
  dbConnected: PropTypes.bool,
  did: PropTypes.number,
  isActive: PropTypes.bool,
  isStale: PropTypes.bool,
  setIsStale: PropTypes.func,
};

export default withStandardTabInfo(SQL, BROWSER_PANELS.SQL);
