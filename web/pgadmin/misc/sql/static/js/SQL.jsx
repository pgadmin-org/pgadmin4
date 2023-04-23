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
import Notify from '../../../../static/js/helpers/Notifier';
import getApiInstance from 'sources/api_instance';
import { makeStyles } from '@material-ui/core/styles';
import CodeMirror from '../../../../static/js/components/CodeMirror';
import Loader from 'sources/components/Loader';

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

export default function SQL({ nodeData, node, did,  ...props }) {
  const classes = useStyles();
  const [nodeSQL, setNodeSQL] = React.useState('');
  const [loaderText, setLoaderText] = React.useState('');
  const [msg, setMsg] = React.useState('');

  useEffect(() => {
    let sql = '-- ' + gettext('Please select an object in the tree view.');
    if (node) {
      let url = generateNodeUrl.call(
        node,
        props.treeNodeInfo,
        'sql',
        nodeData,
        true,
        node.url_jump_after_node
      );
      setLoaderText('Loading...');
      if (did && !props.dbConnected){
        setLoaderText('');
        return;
      }
      sql =
        '-- ' + gettext('No SQL could be generated for the selected object.');

      if (node.hasSQL) {
        const api = getApiInstance();
        api({
          url: url,
          type: 'GET',
        })
          .then((res) => {
            if (res.data.length > 0) {
              setNodeSQL(res.data);
              setLoaderText('');
            } else {
              setMsg(sql);
            }
          })
          .catch((e) => {
            Notify.alert(
              gettext('Error'),
              gettext(e.response.data.errormsg)
            );
            // show failed message.
            setMsg(gettext('Failed to retrieve data from the server.'));
            setLoaderText('');
          });
      }else{
        setMsg(sql);
        setLoaderText('');
      }
    }
    if (sql != '') {
      setMsg(sql);
    }
    return () => {
      setNodeSQL([]);
    };
  }, [nodeData, props.dbConnected]);

  return (
    <>
      <Loader message={loaderText}/>
      <CodeMirror
        className={classes.textArea}
        value={nodeSQL.length > 0 ? nodeSQL : msg}
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
  did: PropTypes.number
};
