/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getNodeAjaxOptions, getNodeListByName } from '../../../../static/js/node_ajax';
import { isEmptyString } from '../../../../../static/js/validators';

export function getNodeVariableSchema(nodeObj, treeNodeInfo, itemNodeData, hasDatabase, hasRole) {
  let keys = ['name', 'value'];
  if(hasDatabase) {
    keys.push('database');
  }
  if(hasRole) {
    keys.push('role');
  }
  return new VariableSchema(
    ()=>getNodeAjaxOptions('vopts', nodeObj, treeNodeInfo, itemNodeData, null, (vars)=>{
      var res = [];
      _.each(vars, function(v) {
        res.push({
          'value': v.name,
          'image': undefined,
          'label': v.name,
          'vartype': v.vartype,
          'enumvals': v.enumvals,
          'max_val': v.max_val,
          'min_val': v.min_val,
        });
      });

      return res;
    }),
    ()=>getNodeListByName('database', treeNodeInfo, itemNodeData),
    ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
    keys
  );
}

export default class VariableSchema extends BaseUISchema {
  constructor(vnameOptions, databaseOptions, roleOptions, keys) {
    super({
      name: undefined,
      value: undefined,
      role: null,
      database: null,
    });
    this.vnameOptions = vnameOptions;
    this.databaseOptions = databaseOptions;
    this.roleOptions = roleOptions;
    this.varTypes = {};
    this.keys = keys;
  }

  setVarTypes(options) {
    options.forEach((option)=>{
      this.varTypes[option.value] = {
        ...option,
      };
    });
  }

  getValueFieldProps(variable) {
    switch(variable?.vartype) {
    case 'bool':
      return 'switch';
    case 'enum':
      return {
        cell: 'select',
        options: (variable.enumvals || []).map((val)=>({
          label: val,
          value: val
        }))
      };
    case 'integer':
      return 'int';
    case 'real':
      return 'numeric';
    case 'string':
      return 'text';
    default:
      return '';
    }
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'id', label: gettext('ID'), type: 'int', group: null,
        mode: ['properties'],
      },
      {
        id: 'name', label: gettext('Name'), type:'text',
        readonly: function(state) {
          return !obj.isNew(state);
        },
        cell: ()=>({
          cell: 'select',
          options: this.vnameOptions,
          optionsLoaded: (options)=>{obj.setVarTypes(options);},
          controlProps: { allowClear: false },
        }),
      },
      {
        id: 'value', label: gettext('Value'), type: 'text',
        deps: ['name'],
        depChange: (state, source)=>{
          if(source[source.length-1] == 'name') {
            let variable = this.varTypes[state.name];
            if(variable.vartype === 'bool'){
              return {
                value: false,
              };
            }
            return {
              value: null
            };
          }
        },
        cell: (row)=>{
          let variable = this.varTypes[row.name];
          return this.getValueFieldProps(variable);
        }
      },
      {id: 'database', label: gettext('Database'), type: 'text',
        cell: ()=>({cell: 'select', options: this.databaseOptions }),
      },
      {id: 'role', label: gettext('Role'), type: 'text',
        cell: ()=>({cell: 'select', options: this.roleOptions,
          controlProps: {
            allowClear: false,
          }
        }),
      },
    ];
  }

  validate(state, setError) {
    if (isEmptyString(state.name)) {
      setError('name', gettext('Please select a parameter name.'));
      return true;
    } else {
      setError('name', null);
    }

    if (isEmptyString(state.value)) {
      setError('value', gettext('Please enter a value for the parameter.'));
      return true;
    } else {
      setError('value', null);
    }

  }
}
