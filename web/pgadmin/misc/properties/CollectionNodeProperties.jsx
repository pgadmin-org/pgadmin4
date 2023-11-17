/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import getApiInstance from 'sources/api_instance';
import { makeStyles } from '@material-ui/core/styles';
import { Box, Switch } from '@material-ui/core';
import { generateCollectionURL } from '../../browser/static/js/node_ajax';
import gettext from 'sources/gettext';
import PgTable from 'sources/components/PgTable';
import Theme from 'sources/Theme';
import PropTypes from 'prop-types';
import { PgButtonGroup, PgIconButton } from '../../static/js/components/Buttons';
import DeleteIcon from '@material-ui/icons/Delete';
import DeleteSweepIcon from '@material-ui/icons/DeleteSweep';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import EmptyPanelMessage from '../../static/js/components/EmptyPanelMessage';
import Loader from 'sources/components/Loader';
import { evalFunc } from '../../static/js/utils';
import { usePgAdmin } from '../../static/js/BrowserComponent';

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
  searchPadding: {
    flex: 2.5
  },
  searchInput: {
    flex: 1,
    margin: '4 0 4 0',
    borderLeft: 'none',
    paddingLeft: 5
  },
  propertiesPanel: {
    height: '100%'
  },
  autoResizer: {
    height: '100% !important',
    width: '100% !important',
    background: theme.palette.grey[400],
    padding: '8px',
    overflow: 'hidden !important',
    overflowX: 'auto !important'
  },
  readOnlySwitch: {
    opacity: 0.75,
    '& .MuiSwitch-track': {
      opacity: theme.palette.action.disabledOpacity,
    }
  }
}));

export default function CollectionNodeProperties({
  node,
  treeNodeInfo,
  nodeData,
  nodeItem,
  isActive,
  isStale,
  setIsStale
}) {
  const classes = useStyles();
  const pgAdmin = usePgAdmin();

  const [data, setData] = React.useState([]);
  const [infoMsg, setInfoMsg] = React.useState('Please select an object in the tree view.');
  const [selectedObject, setSelectedObject] = React.useState([]);
  const [loaderText, setLoaderText] = React.useState('');
  const schemaRef = React.useRef();

  const [pgTableColumns, setPgTableColumns] = React.useState([
    {
      Header: 'properties',
      accessor: 'Properties',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
    {
      Header: 'value',
      accessor: 'value',
      sortable: true,
      resizable: true,
      disableGlobalFilter: false,
    },
  ]);

  const getTableSelectedRows = (selRows) => {
    setSelectedObject(selRows);
  };

  const onDrop = (type) => {
    let selRowModels = selectedObject,
      selRows = [],
      selItem = pgAdmin.Browser.tree.selected(),
      selectedItemData = selItem ? pgAdmin.Browser.tree.itemData(selItem) : null,
      selNode = selectedItemData && pgAdmin.Browser.Nodes[selectedItemData._type],
      url = undefined,
      msg = undefined,
      title = undefined;

    if (selNode && selNode.type && selNode.type == 'coll-constraints') {
      // In order to identify the constraint type, the type should be passed to the server
      selRows = selRowModels.map((row) => ({
        id: row.original.oid,
        _type: row.original._type,
      }));
    } else {
      selRows = selRowModels.map((row) => row.original[schemaRef.current.idAttribute]);
    }

    if (selRows.length === 0) {
      pgAdmin.Browser.notifier.alert(
        gettext('Delete Multiple'),
        gettext('Please select at least one object to delete.')
      );
      return;
    }

    if (!selNode) return;

    if (type === 'dropCascade') {
      url = selNode.generate_url(selItem, 'delete');
      msg = gettext(
        'Are you sure you want to delete all the selected objects and all the objects that depend on them?'
      );
      title = gettext('Delete CASCADE multiple objects?');
    } else if (type === 'dropForce') {
      url = selNode.generate_url(selItem, 'delete');
      msg = gettext(
        'Delete databases with the force option will attempt to terminate all the existing connections to the selected databases. Are you sure you want to proceed?'
      );
      title = gettext('Delete FORCE multiple objects?');
    } else {
      url = selNode.generate_url(selItem, 'drop');
      msg = gettext('Are you sure you want to delete all the selected objects?');
      title = gettext('Delete multiple objects?');
    }

    const api = getApiInstance();
    let dropNodeProperties = function () {
      setLoaderText(gettext('Deleting Objects...'));
      api
        .delete(url, {
          data: JSON.stringify({ ids: selRows }),
          contentType: 'application/json; charset=utf-8',
        })
        .then(function (res) {
          if (res.success == 0) {
            pgAdmin.Browser.notifier.alert(res.errormsg, res.info);
          }
          pgAdmin.Browser.tree.refresh(selItem);
          setIsStale(true);
        })
        .catch(function (error) {
          pgAdmin.Browser.notifier.alert(
            gettext('Error deleting %s', selectedItemData._label.toLowerCase()),
            _.isUndefined(error.response) ? error.message : error.response.data.errormsg
          );
        })
        .then(()=>{
          setLoaderText('');
        });
    };

    if (confirm) {
      pgAdmin.Browser.notifier.confirm(title, msg, dropNodeProperties, null);
    } else {
      dropNodeProperties();
    }
  };

  React.useEffect(() => {
    if (node){

      let nodeObj =
      pgAdmin.Browser.Nodes[nodeData?._type.replace('coll-', '')];

      let url = generateCollectionURL.call(nodeObj, nodeItem, 'properties');

      const api = getApiInstance();

      let tableColumns = [];
      let column = {};
      setLoaderText(gettext('Loading...'));

      if (nodeData._type.indexOf('coll-') > -1 && !_.isUndefined(nodeObj.getSchema)) {
        schemaRef.current = nodeObj.getSchema?.call(nodeObj, treeNodeInfo, nodeData);
        schemaRef.current?.fields.forEach((field) => {
          if (node.columns.indexOf(field.id) > -1) {
            if (field.label.indexOf('?') > -1) {
              column = {
                Header: field.label,
                accessor: field.id,
                sortable: true,
                resizable: true,
                disableGlobalFilter: false,
                minWidth: 0,
                // eslint-disable-next-line react/display-name
                Cell: ({ value }) => {
                  return (<Switch color="primary" checked={value} className={classes.readOnlySwitch} value={value} readOnly title={String(value)} />);
                }
              };
            } else {
              column = {
                Header: field.label,
                accessor: field.id,
                sortable: true,
                resizable: true,
                disableGlobalFilter: false,
                minWidth: 0,
              };
            }
            tableColumns.push(column);
          }
        });
      }else{
        node.columns.forEach((field) => {
          column = {
            Header: field,
            accessor: field,
            sortable: true,
            resizable: true,
            disableGlobalFilter: false,
            minWidth: 0,
          };
          tableColumns.push(column);
        });
      }

      if(!isStale || !isActive) {
        return;
      }

      api({
        url: url,
        type: 'GET',
      })
        .then((res) => {
          res.data.forEach((element) => {
            element['icon'] = '';
          });
          setPgTableColumns(tableColumns);
          setData(res.data);
          setInfoMsg('No properties are available for the selected object.');
          setLoaderText('');
        })
        .catch((err) => {
          pgAdmin.Browser.notifier.alert(
            gettext('Failed to retrieve data from the server.'),
            gettext(err.message)
          );
        });
      setIsStale(false);
    }
  }, [nodeData, node, nodeItem, isStale]);

  const CustomHeader = () => {
    const canDrop = evalFunc(node, node.canDrop, nodeData, nodeItem, treeNodeInfo);
    const canDropCascade = evalFunc(node, node.canDropCascade, nodeData, nodeItem, treeNodeInfo);
    const canDropForce = evalFunc(node, node.canDropForce, nodeData, nodeItem, treeNodeInfo);
    return (
      <Box >
        <PgButtonGroup size="small">
          <PgIconButton
            icon={<DeleteIcon style={{height: '1.35rem'}}/>}
            aria-label="Delete"
            title={gettext('Delete')}
            onClick={() => {
              onDrop('drop');
            }}
            disabled={
              (selectedObject.length > 0)
                ? !canDrop
                : true
            }
          ></PgIconButton>
          {node.type !== 'coll-database' ? <PgIconButton
            icon={<DeleteSweepIcon style={{height: '1.5rem'}} />}
            aria-label="Delete Cascade"
            title={gettext('Delete (Cascade)')}
            onClick={() => {
              onDrop('dropCascade');
            }}
            disabled={
              (selectedObject.length > 0)
                ? !canDropCascade
                : true
            }
          ></PgIconButton> :
            <PgIconButton
              icon={<DeleteForeverIcon style={{height: '1.4rem'}} />}
              aria-label="Delete Force"
              title={gettext('Delete (Force)')}
              onClick={() => {
                onDrop('dropForce');
              }}
              disabled={
                (selectedObject.length > 0)
                  ? !canDropForce
                  : true
              }
            ></PgIconButton>}
        </PgButtonGroup>
      </Box>);
  };

  return (
    <Theme className='obj_properties'>
      <Loader message={loaderText}/>
      <Box className={classes.propertiesPanel}>
        {data.length > 0 ?
          (
            <PgTable
              isSelectRow={!('catalog' in treeNodeInfo) && (nodeData.label !== 'Catalogs') && _.isUndefined(node?.canSelect)}
              CustomHeader={CustomHeader}
              className={classes.autoResizer}
              columns={pgTableColumns}
              data={data}
              type={'panel'}
              isSearch={false}
              getSelectedRows={getTableSelectedRows}
            />
          )
          :
          (
            <div className={classes.emptyPanel}>
              <EmptyPanelMessage text={gettext(infoMsg)}/>
            </div>
          )
        }
      </Box>
    </Theme>
  );
}

CollectionNodeProperties.propTypes = {
  node: PropTypes.func,
  itemData: PropTypes.object,
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  nodeItem: PropTypes.object,
  preferences: PropTypes.object,
  sid: PropTypes.number,
  did: PropTypes.number,
  row: PropTypes.object,
  serverConnected: PropTypes.bool,
  value: PropTypes.bool,
  isActive: PropTypes.bool,
  isStale: PropTypes.bool,
  setIsStale: PropTypes.func,
};
