/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Box, makeStyles } from '@material-ui/core';
import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import HelpIcon from '@material-ui/icons/HelpRounded';
import SearchRoundedIcon from '@material-ui/icons/SearchRounded';
import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import Loader from 'sources/components/Loader';
import clsx from 'clsx';
import getApiInstance, { parseApiError } from '../../../../static/js/api_instance';
import { PrimaryButton, PgIconButton } from '../../../../static/js/components/Buttons';
import { useModalStyles } from '../../../../static/js/helpers/ModalProvider';
import { FormFooterMessage, InputSelect, InputText, MESSAGE_TYPE } from '../../../../static/js/components/FormComponents';
import PgReactDataGrid from '../../../../static/js/components/PgReactDataGrid';

const pgBrowser = pgAdmin.Browser;

const useStyles = makeStyles((theme)=>({
  grid: {
    fontSize: '13px',
    '& .rdg-header-row': {
      '& .rdg-cell': {
        padding: '0px 4px',
      }
    },
    '& .rdg-cell': {
      padding: '0px 4px',
      '&[aria-colindex="1"]': {
        padding: '0px 4px',
        '&.rdg-editor-container': {
          padding: '0px',
        },
      }
    }
  },
  toolbar: {
    padding: '4px',
    display: 'flex',
    ...theme.mixins.panelBorder?.bottom,
  },
  inputSearch: {
    lineHeight: 1,
  },
  footer1: {
    justifyContent: 'space-between',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    borderTop: `1px solid ${theme.otherVars.inputBorderColor}`,
  },
  footer: {
    borderTop: `1px solid ${theme.otherVars.inputBorderColor} !important`,
    padding: '0.5rem',
    display: 'flex',
    width: '100%',
    background: theme.otherVars.headerBg,
  },
  gridCell: {
    display: 'inline-block',
    height: '1.3rem',
    width: '1.3rem',
  },
  funcArgs: {
    cursor: 'pointer',
  },
  cellMuted: {
    color: `${theme.otherVars.textMuted} !important`,
    cursor: 'default !important',
  },
  textWrap: {
    textOverflow: 'ellipsis',
    overflow: 'hidden'
  }
}));

function ObjectNameFormatter({row}) {
  const classes = useStyles();
  return (
    <div className='rdg-cell-value'>
      <Box className={row.show_node ? '' : classes.cellMuted}>
        <span className={clsx(classes.gridCell, row.icon)}></span>
        {row.name}
        {row.other_info != null && row.other_info != '' && <>
          <span className={classes.funcArgs}onClick={()=>{row.showArgs = true;}}> {row?.showArgs ? `(${row.other_info})` : '(...)'}</span>
        </>}
      </Box>
    </div>
  );
}
ObjectNameFormatter.propTypes = {
  row: PropTypes.object,
};

function TypePathFormatter({row, column}) {
  const classes = useStyles();
  let val = '';

  if(column.key == 'type') {
    val = row.type_label;
  } else if(column.key == 'path') {
    val = row.path;
  }

  return (
    <Box className={clsx(classes.textWrap, row.show_node ? '' : classes.cellMuted)}>{val}</Box>
  );
}
TypePathFormatter.propTypes = {
  row: PropTypes.object,
  column: PropTypes.object,
};


const columns = [
  {
    key: 'name',
    name: gettext('Object name'),
    width: 250,
    formatter: ObjectNameFormatter,
  },{
    key: 'type',
    name: gettext('Type'),
    width: 30,
    formatter: TypePathFormatter,
  },{
    key: 'path',
    name: gettext('Object path'),
    sortable: false,
    formatter: TypePathFormatter,
  }
];

/* This function is used to get the final data with the proper icon
 * based on the type and translated path.
 */
const finaliseData = (nodeData, datum)=> {
  datum.icon = 'icon-' + datum.type;
  /* finalise path */
  [datum.path, datum.id_path] = translateSearchObjectsPath(nodeData, datum.path, datum.catalog_level);
  /* id is required by dataview */
  datum.id = datum.id_path ? datum.id_path.join('.') : _.uniqueId(datum.name);

  datum.other_info = datum.other_info ? _.escape(datum.other_info) : datum.other_info;

  return datum;
};

const getCollNode = (node_type)=> {
  if('coll-'+node_type in pgBrowser.Nodes) {
    return pgBrowser.Nodes['coll-'+node_type];
  } else if(node_type in pgBrowser.Nodes &&
      typeof(pgBrowser.Nodes[node_type].collection_type) === 'string') {
    return pgBrowser.Nodes[pgBrowser.Nodes[node_type].collection_type];
  }

  return null;
};

/* This function will translate the path given by search objects API into two parts
 * 1. The display path on the UI
 * 2. The tree search path to locate the object on the tree.
 *
 * Sample path returned by search objects API
 * :schema.11:/pg_catalog/:table.2604:/pg_attrdef
 *
 * Sample path required by tree locator
 * Normal object  - server_group/1.server/3.coll-database/3.database/13258.coll-schema/13258.schema/2200.coll-table/2200.table/41773
 * pg_catalog schema - server_group/1.server/3.coll-database/3.database/13258.coll-catalog/13258.catalog/11.coll-table/11.table/2600
 * Information Schema, sys:
 *  server_group/1.server/3.coll-database/3.database/13258.coll-catalog/13258.catalog/12967.coll-catalog_object/12967.catalog_object/13204
 *  server_group/1.server/11.coll-database/11.database/13258.coll-catalog/13258.catalog/12967.coll-catalog_object/12967.catalog_object/12997.coll-catalog_object_column/12997.catalog_object_column/13
 *
 * Column catalog_level has values as
 * N - Not a catalog schema
 * D - Catalog schema with DB support - pg_catalog
 * O - Catalog schema with object support only - info schema, sys
 */
const translateSearchObjectsPath = (nodeData, path, catalog_level)=> {
  if (path === null) {
    return [null, null];
  }

  catalog_level = catalog_level || 'N';

  /* path required by tree locator */
  /* the path received from the backend is after the DB node, initial path setup */
  let id_path = [
    nodeData?.server_group?.id,
    nodeData?.server?.id,
    getCollNode('database').type + '_' + nodeData?.server?._id,
    nodeData?.database?.id,
  ];

  let prev_node_id = nodeData?.database?._id;

  /* add the slash to match regex, remove it from display path later */
  path = '/' + path;
  /* the below regex will match all /:schema.2200:/ */
  let new_path = path.replace(/\/:[a-zA-Z_]+\.\d+:\//g, (token)=>{
    let orig_token = token;
    /* remove the slash and colon */
    token = token.slice(2, -2);
    let [node_type, node_oid, others] = token.split('.');
    if(typeof(others) !== 'undefined') {
      return token;
    }

    /* schema type is "catalog" for catalog schemas */
    node_type = (['D', 'O'].indexOf(catalog_level) != -1 && node_type == 'schema') ? 'catalog' : node_type;

    /* catalog like info schema will only have views and tables AKA catalog_object except for pg_catalog */
    node_type = (catalog_level === 'O' && ['view', 'table'].indexOf(node_type) != -1) ? 'catalog_object' : node_type;

    /* catalog_object will have column node as catalog_object_column */
    node_type = (catalog_level === 'O' && node_type == 'column') ? 'catalog_object_column' : node_type;

    /* If collection node present then add it */
    let coll_node = getCollNode(node_type);
    if(coll_node) {
      /* Add coll node to the path */
      if(prev_node_id != null) id_path.push(`${coll_node.type}_${prev_node_id}`);

      /* Add the node to the path */
      id_path.push(`${node_type}_${node_oid}`);

      /* This will be needed for coll node */
      prev_node_id = node_oid;

      /* This will be displayed in the grid */
      return  `/${coll_node.label}/`;
    } else if(node_type in pgBrowser.Nodes) {
      /* Add the node to the path */
      id_path.push(`${node_type}_${node_oid}`);

      /* This will be need for coll node id path */
      prev_node_id = node_oid;

      /* Remove the token and replace with slash. This will be displayed in the grid */
      return '/';
    }
    prev_node_id = null;
    return orig_token;
  });

  /* Remove the slash we had added */
  new_path = new_path.substring(1);

  return [new_path, id_path];
};

// This function is used to sort the column.
function getComparator(sortColumn) {
  const key = sortColumn?.columnKey;
  const dir = sortColumn?.direction == 'ASC' ? 1 : -1;

  if (!key) return ()=>0;

  return (a, b) => {
    return dir*(a[key].localeCompare(b[key]));
  };
}
export default function SearchObjects({nodeData}) {
  const classes = useStyles();
  const modalClasses = useModalStyles();
  const [type, setType] = React.useState('all');
  const [loaderText, setLoaderText] = useState('');
  const [search, setSearch] = useState('');
  const [footerText, setFooterText] = useState('0 matches found.');
  const [searchData, setSearchData] = useState([]);
  const [sortColumns, setSortColumns] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const api = getApiInstance();

  const onDialogHelp = ()=> {
    window.open(url_for('help.static', { 'filename': 'search_objects.html' }), 'pgadmin_help');
  };

  const sortedItems = useMemo(()=>(
    [...searchData].sort(getComparator(sortColumns[0]))
  ), [searchData, sortColumns]);

  const onItemEnter = useCallback((rowData)=>{
    let tree = pgBrowser.tree;
    setErrorMsg('');

    if(!rowData.show_node) {
      setErrorMsg(
        gettext('%s objects are disabled in the browser. You can enable them in the <a id="prefdlgid" class="pref-dialog-link">preferences dialog</a>.', rowData.type_label));

      setTimeout(()=> {
        document.getElementById('prefdlgid').addEventListener('click', ()=>{
          if(pgAdmin.Preferences) {
            pgAdmin.Preferences.show();
          }
        });
      }, 100);

      return false;
    }
    setLoaderText(gettext('Locating...'));
    tree.findNodeWithToggle(rowData.id_path)
      .then((treeItem)=>{
        setTimeout(() => {
          tree.select(treeItem, true, 'center');
        }, 100);
        setLoaderText(null);
      })
      .catch(()=>{
        setLoaderText(null);
        setErrorMsg(gettext('Unable to locate this object in the browser.'));
      });
  }, []);

  const onSearch = ()=> {
    // If user press the Enter key and the search characters are
    // less than 3 characters then return from the function.
    if (search.length < 3)
      return;
    setLoaderText(gettext('Searching....'));
    setErrorMsg('');

    let searchType = type;
    if(type === 'constraints') {
      searchType = ['constraints', 'check_constraint', 'foreign_key', 'primary_key', 'unique_constraint', 'exclusion_constraint'];
    }

    api.get(url_for('search_objects.search',{
      sid: nodeData?.server?._id,
      did: nodeData?.database?._id,
    }), { params: {
      text: search,
      type: searchType,
    }})
      .then(res=>{
        setLoaderText(null);
        let finalData = [];
        // Get the finalise list of data.
        res?.data?.data.forEach((element) => {
          finalData.push(finaliseData(nodeData, element));
        });
        setSearchData(finalData);
        setFooterText(res?.data?.data?.length + ' matches found');
      })
      .catch((err)=>{
        setLoaderText(null);
        pgAdmin.Browser.notifier.error(parseApiError(err));
      });
  };

  const onEnterPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
  };

  const typeOptions = ()=> {
    return new Promise((resolve, reject)=>{
      try {
        api.get(url_for('search_objects.types', {
          sid: nodeData?.server?._id,
          did: nodeData?.database?._id,
        }))
          .then(res=>{
            let typeOpt = [{label:gettext('All types'), value:'all'}];
            let typesRes = Object.entries(res.data.data).sort();
            typesRes.forEach((element) => {
              typeOpt.push({label:gettext(element[1]), value:element[0]});
            });

            resolve(typeOpt);
          })
          .catch((err)=>{
            pgAdmin.Browser.notifier.error(parseApiError(err));
            reject(err);
          });
      } catch (error) {
        pgAdmin.Browser.notifier.error(parseApiError(error));
        reject(error);
      }
    });
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" className={modalClasses.container}>
      <Box flexGrow="1" display="flex" flexDirection="column" position="relative" overflow="hidden">
        <Loader message={loaderText} />
        <Box className={classes.toolbar}>
          <InputText type="search" className={classes.inputSearch} data-label="search" placeholder={gettext('Type at least 3 characters')} value={search} onChange={setSearch} onKeyPress={onEnterPress}/>
          <Box style={{marginLeft: '4px', width: '50%'}}>
            <InputSelect value={type} controlProps={{allowClear: false}} options={typeOptions} onChange={(v)=>setType(v)}/>
          </Box>
          <PrimaryButton style={{width: '120px'}} data-test="search" className={modalClasses.margin} startIcon={<SearchRoundedIcon />}
            onClick={onSearch} disabled={search.length >= 3 ? false : true}>{gettext('Search')}</PrimaryButton>
        </Box>
        <Box flexGrow="1" display="flex" flexDirection="column" position="relative" overflow="hidden">
          <PgReactDataGrid
            id="searchobjects"
            className={classes.grid}
            hasSelectColumn={false}
            columns={columns}
            rows={sortedItems}
            defaultColumnOptions={{
              sortable: true,
              resizable: true
            }}
            headerRowHeight={28}
            rowHeight={28}
            mincolumnWidthBy={25}
            enableCellSelect={false}
            sortColumns={sortColumns}
            onSortColumnsChange={setSortColumns}
            onItemEnter={onItemEnter}
          />
        </Box>
        <Box className={classes.footer1}>
          <Box>{footerText}</Box>
        </Box>
        <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={errorMsg} closable onClose={()=>setErrorMsg('')}  />
      </Box>
      <Box className={classes.footer}>
        <Box>
          <PgIconButton data-test="dialog-help" onClick={onDialogHelp} icon={<HelpIcon />} title={gettext('Help for this dialog.')} />
        </Box>
      </Box>
    </Box>
  );
}

SearchObjects.propTypes = {
  onClose: PropTypes.func,
  nodeData: PropTypes.object,
};
