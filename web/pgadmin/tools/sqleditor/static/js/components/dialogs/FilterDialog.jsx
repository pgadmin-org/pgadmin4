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
        }, noEmpty: true, options: this.columnOptions, optionsReloadBasis: this.reloadColOptions,
        width: 300,
      },
      {
        id: 'order', label: gettext('Order'), cell: 'select', controlProps: {
          allowClear: false,
        }, options: [
          {label: gettext('ASC'), value: 'asc'},
          {label: gettext('DESC'), value: 'desc'},
        ],
        width: 150,
      },
      {
        id: 'order_null', label: gettext('NULLs'), cell: 'select', controlProps: {
          allowClear: true,
        }, options: [
          {label: gettext('FIRST'), value: 'nulls first'},
          {label: gettext('LAST'), value: 'nulls last'},
        ],
        width: 150,
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
          autocompleteOnKeyPress: true,
          autocompleteProvider: (context, onAvailable)=>{
            return new Promise((resolve)=>{
              const word = context.matchBefore(/\w*/);
              const fullSql = context.state.doc.toString();
              onAvailable();
              resolve({
                from: word.from,
                options: (this.sortingCollObj.columnOptions??[]).map((col)=>({
                  label: col.label, type: 'property',
                })),
                validFor: (text, from)=>{
                  return text.startsWith(fullSql.slice(from));
                }
              });
            });
          }
        }
      },
      {
        id: 'data_sorting', label: gettext('Data Sorting'), type: 'collection', schema: obj.sortingCollObj,
        group: 'temp', uniqueCol: ['name'], canAdd: true, canEdit: false, canDelete: true,
      },
    ];
  }
}

export default function FilterDialog({onClose, onSave}) {

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
          reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
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
            reject(new Error(respData.data.result));
          }
        } catch (error) {
          reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
        }
      };
      setFilterData();
    });
  };

  return (
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
      checkDirtyOnEnableSave={true}
    />
  );
}

FilterDialog.propTypes = {
  onClose: PropTypes.func,
  onSave: PropTypes.func,
};
