/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { styled } from '@mui/material/styles';
import getApiInstance from 'sources/api_instance';
import { Box } from '@mui/material';
import { generateCollectionURL } from '../../browser/static/js/node_ajax';
import gettext from 'sources/gettext';
import PgTable from 'sources/components/PgTable';
import PropTypes from 'prop-types';
import { PgButtonGroup, PgIconButton } from '../../static/js/components/Buttons';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EmptyPanelMessage from '../../static/js/components/EmptyPanelMessage';
import Loader from 'sources/components/Loader';
import { evalFunc } from '../../static/js/utils';
import { usePgAdmin } from '../../static/js/BrowserComponent';
import { getSwitchCell } from '../../static/js/components/PgReactTableStyled';

const StyledBox = styled(Box)(({theme}) => ({
  height: '100%',
  '&.CollectionNodeProperties-emptyPanel': {
    minHeight: '100%',
    minWidth: '100%',
    background: theme.otherVars.emptySpaceBg,
    overflow: 'auto',
    padding: '8px',
    display: 'flex',
  }
}));

function CustomHeader({node, nodeData, nodeItem, treeNodeInfo, selectedObject, onDrop}) {
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
            (Object.keys(selectedObject).length > 0)
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
            (Object.keys(selectedObject).length > 0)
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
              (Object.keys(selectedObject).length > 0)
                ? !canDropForce
                : true
            }
          ></PgIconButton>}
      </PgButtonGroup>
    </Box>
  );
}

CustomHeader.propTypes = {
  node: PropTypes.func,
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  nodeItem: PropTypes.object,
  selectedObject: PropTypes.object,
  onDrop: PropTypes.func,
};

export default function CollectionNodeProperties({
  node,
  treeNodeInfo,
  nodeData,
  nodeItem,
  isActive,
  isStale,
  setIsStale
}) {
  const pgAdmin = usePgAdmin();
  const [data, setData] = React.useState([]);
  const [infoMsg, setInfoMsg] = React.useState('Please select an object in the tree view.');
  const [selectedObject, setSelectedObject] = React.useState({});
  const [loaderText, setLoaderText] = React.useState('');
  const schemaRef = React.useRef();

  const [pgTableColumns, setPgTableColumns] = React.useState([
    {
      header: 'properties',
      accessorKey: 'Properties',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
    {
      header: 'value',
      accessorKey: 'value',
      enableSorting: true,
      enableResizing: true,
      enableFilters: true,
    },
  ]);

  const onDrop = (type) => {
    let selRows = [],
      selItem = pgAdmin.Browser.tree.selected(),
      selectedItemData = selItem ? pgAdmin.Browser.tree.itemData(selItem) : null,
      selNode = selectedItemData && pgAdmin.Browser.Nodes[selectedItemData._type],
      url, msg, title;

    selRows = Object.keys(selectedObject).map((i)=>(selNode?.type == 'coll-constraints' ? {
      id: data[i].oid,
      _type: data[i]._type,
    } : data[i][schemaRef.current.idAttribute]));

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
          setSelectedObject({});
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
    if (node) {

      let nodeObj =
      pgAdmin.Browser.Nodes[nodeData?._type.replace('coll-', '')];

      let url = generateCollectionURL.call(nodeObj, nodeItem, 'properties');

      const api = getApiInstance();

      let tableColumns = [];
      let column = {};
      if(!isStale || !isActive) {
        return;
      }

      setLoaderText(gettext('Loading...'));
      if (!_.isUndefined(nodeObj.getSchema)) {
        schemaRef.current = nodeObj.getSchema?.(treeNodeInfo, nodeData);
        schemaRef.current?.fields.forEach((field) => {
          if (node.columns.indexOf(field.id) > -1) {
            if (field.label.indexOf('?') > -1) {
              column = {
                header: field.label,
                accessorKey: field.id,
                enableSorting: true,
                enableResizing: true,
                enableFilters: true,
                cell: getSwitchCell()
              };
            } else {
              column = {
                header: field.label,
                accessorKey: field.id,
                enableSorting: true,
                enableResizing: true,
                enableFilters: true,
              };
            }
            tableColumns.push(column);
          }
        });
      }else{
        node.columns.forEach((field) => {
          column = {
            header: field,
            accessorKey: field,
            enableSorting: true,
            enableResizing: true,
            enableFilters: true,
          };
          tableColumns.push(column);
        });
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
  }, [nodeData, node, nodeItem, isStale, isActive]);

  return (
    <>
      <Loader message={loaderText}/>
      <StyledBox>
        {data.length > 0 ?
          (
            <PgTable
              hasSelectRow={!('catalog' in treeNodeInfo) && (nodeData.label !== 'Catalogs') && _.isUndefined(node?.canSelect)}
              customHeader={<CustomHeader node={node} nodeData={nodeData} nodeItem={nodeItem} treeNodeInfo={treeNodeInfo} selectedObject={selectedObject} onDrop={onDrop} />}
              columns={pgTableColumns}
              data={data}
              type={'panel'}
              isSearch={false}
              selectedRows={selectedObject}
              setSelectedRows={setSelectedObject}
            />
          )
          :
          (
            <div className='CollectionNodeProperties-emptyPanel'>
              <EmptyPanelMessage text={gettext(infoMsg)}/>
            </div>
          )
        }
      </StyledBox>
    </>
  );
}

CollectionNodeProperties.propTypes = {
  node: PropTypes.func,
  nodeData: PropTypes.object,
  treeNodeInfo: PropTypes.object,
  nodeItem: PropTypes.object,
  isActive: PropTypes.bool,
  isStale: PropTypes.bool,
  setIsStale: PropTypes.func,
};
