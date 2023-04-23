/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { makeStyles } from '@material-ui/core';
import React from 'react';
import SchemaView from '../../../../../../static/js/SchemaView';
import BaseUISchema from '../../../../../../static/js/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import { QueryToolContext } from '../QueryToolComponent';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';

class SortingCollection extends BaseUISchema {
  constructor(columnOptions) {
    super({
      name: undefined,
      order: 'asc',
    });
    this.columnOptions = columnOptions;
    this.reloadColOptions = 0;
  }

  setColumnOptions(columnOptions) {
    this.columnOptions = columnOptions;
    this.reloadColOptions = this.reloadColOptions + 1;
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Column'), cell: 'select', controlProps: {
          allowClear: false,
        }, noEmpty: true, options: this.columnOptions, optionsReloadBasis: this.reloadColOptions
      },
      {
        id: 'order', label: gettext('Order'), cell: 'select', controlProps: {
          allowClear: false,
        }, options: [
          {label: gettext('ASC'), value: 'asc'},
          {label: gettext('DESC'), value: 'desc'},
        ]
      },
    ];
  }
}

class FilterSchema extends BaseUISchema {
  constructor(columnOptions) {
    super({
      sql: null,
      data_sorting: [],
    });
    this.sortingCollObj = new SortingCollection(columnOptions);
  }

  setColumnOptions(columnOptions) {
    this.sortingCollObj.setColumnOptions(columnOptions);
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'sql', label: gettext('SQL Filter'), type: 'sql', controlProps: {
          options: {
            lineWrapping: true,
          },
        }
      },
      {
        id: 'data_sorting', label: gettext('Data Sorting'), type: 'collection', schema: obj.sortingCollObj,
        group: 'temp', uniqueCol: ['name'], canAdd: true, canEdit: false, canDelete: true,
      },
    ];
  }
}

const useStyles = makeStyles((theme)=>({
  root: {
    ...theme.mixins.tabPanel,
  },
}));

export default function FilterDialog({onClose, onSave}) {
  const classes = useStyles();
  const queryToolCtx = React.useContext(QueryToolContext);
  const filterSchemaObj = React.useMemo(()=>new FilterSchema([]));

  const getInitData = ()=>{
    return new Promise((resolve, reject)=>{
      const getFilterData = async ()=>{
        try {
          let {data: respData} = await queryToolCtx.api.get(url_for('sqleditor.get_filter_data', {
            'trans_id': queryToolCtx.params.trans_id,
          }));
          let {column_list: columns, ...filterData} = respData.data.result;
          filterSchemaObj.setColumnOptions((columns||[]).map((c)=>({label: c, value: c})));
          resolve(filterData);
        } catch (error) {
          reject(error);
        }
      };
      getFilterData();
    });
  };

  const onSaveClick = (_isNew, changeData)=>{
    return new Promise((resolve, reject)=>{
      const setFilterData = async ()=>{
        try {
          let {data: respData} = await queryToolCtx.api.put(url_for('sqleditor.set_filter_data', {
            'trans_id': queryToolCtx.params.trans_id,
          }), changeData);
          if(respData.data.status) {
            resolve();
            onSave();
          } else {
            reject(respData.data.result);
          }
        } catch (error) {
          reject(error);
        }
      };
      setFilterData();
    });
  };

  return (<>
    <SchemaView
      formType={'dialog'}
      getInitData={getInitData}
      schema={filterSchemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onSave={onSaveClick}
      onClose={onClose}
      hasSQL={false}
      disableSqlHelp={true}
      disableDialogHelp={true}
      isTabView={false}
      formClassName={classes.root}
      checkDirtyOnEnableSave={true}
    />
  </>);
}

FilterDialog.propTypes = {
  onClose: PropTypes.func,
  onSave: PropTypes.func,
};
