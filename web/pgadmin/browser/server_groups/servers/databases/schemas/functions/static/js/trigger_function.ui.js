/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from 'sources/validators';


export default class TriggerFunctionSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, getVariableSchema, fieldOptions={}, initValues={}) {
    super({
      name: null,
      oid: null,
      xmin: null,
      funcowner: null,
      pronamespace: null,
      description: null,
      pronargs: null, /* Argument Count */
      proargs: null, /* Arguments */
      proargtypenames: null, /* Argument Signature */
      prorettypename: 'trigger', /* Return Type */
      lanname: 'plpgsql', /* Language Name in which function is being written */
      provolatile: null, /* Volatility */
      proretset: null, /* Return Set */
      proisstrict: null,
      prosecdef: null, /* Security of definer */
      proiswindow: null, /* Window Function ? */
      procost: null, /* Estimated execution Cost */
      prorows: null, /* Estimated number of rows */
      proleakproof: null,
      args: [],
      prosrc: null,
      prosrc_c: null,
      probin: '$libdir/',
      options: [],
      variables: [],
      proacl: null,
      seclabels: [],
      acl: [],
      sysfunc: null,
      sysproc: null,
      ...initValues
    });

    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.getVariableSchema = getVariableSchema;
    this.fieldOptions = {
      role: [],
      schema: [],
      language: [],
      nodeInfo: null,
      ...fieldOptions,
    };

  }

  get idAttribute() {
    return 'oid';
  }

  isReadonly() {
    return false;
  }

  setReadonlyInEditMode() {
    return !this.isNew();
  }


  isVisible(state) {
    return state.name != 'sysproc';
  }

  isDisabled() {
    return 'catalog' in this.fieldOptions.nodeInfo;
  }


  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', mode: ['properties', 'create', 'edit'],
        disabled: obj.isDisabled, readonly: obj.isReadonly,
        noEmpty: true
      },{
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text' , mode: ['properties'],
      },{
        id: 'funcowner', label: gettext('Owner'), cell: 'text',
        type:'select', disabled: obj.isDisabled, readonly: obj.isReadonly,
        options: obj.fieldOptions.role,
        controlProps: { allowClear: false }
      },{
        id: 'pronamespace', label: gettext('Schema'), cell: 'string',
        type: 'select', cache_level: 'database',
        disabled: obj.isDisabled, readonly: obj.isReadonly,
        mode: ['create', 'edit'],
        options: obj.fieldOptions.schema,
        controlProps: { allowClear: false }
      },{
        id: 'sysfunc', label: gettext('System trigger function?'),
        cell:'boolean', type: 'switch',
        mode: ['properties'], visible: obj.isVisible
      },{
        id: 'description', label: gettext('Comment'), cell: 'string',
        type: 'multiline', disabled: obj.isDisabled, readonly: obj.isReadonly,
      },{
        id: 'pronargs', label: gettext('Argument count'), cell: 'text',
        type: 'text', group: gettext('Definition'), mode: ['properties'],
      },{
        id: 'proargs', label: gettext('Arguments'), cell: 'string',
        type: 'text', group: gettext('Definition'), mode: ['properties', 'edit'],
        disabled: obj.isDisabled, readonly: obj.setReadonlyInEditMode,
      },{
        id: 'proargtypenames', label: gettext('Signature arguments'), cell:
        'text', type: 'text', group: gettext('Definition'), mode: ['properties'],
        disabled: obj.isDisabled, readonly: obj.setReadonlyInEditMode,
      },{
        id: 'prorettypename', label: gettext('Return type'), cell: 'text',
        type: 'select', group: gettext('Definition'),
        disabled: obj.isDisabled, readonly: obj.setReadonlyInEditMode,
        controlProps: {
          width: '100%',
          allowClear: false,
        },
        mode: ['create'], visible: obj.isVisible,
        options: [
          {label: gettext('trigger'), value: 'trigger'},
          {label: gettext('event_trigger'), value: 'event_trigger'},
        ],
      },{
        id: 'prorettypename', label: gettext('Return type'), cell: 'text',
        type: 'text', group: gettext('Definition'),
        mode: ['properties', 'edit'], disabled: obj.isDisabled, readonly: obj.setReadonlyInEditMode,
        visible: obj.isVisible
      },  {
        id: 'lanname', label: gettext('Language'), cell: 'text',
        type: 'select', group: gettext('Definition'),
        mode: ['create', 'properties', 'edit'],
        disabled: obj.isDisabled, readonly: obj.isReadonly,
        options: obj.fieldOptions.language,
        controlProps: {
          allowClear: false,
          filter: (options) => {
            return (options||[]).filter(option => {
              return option.label != '';
            });
          }
        },
      },{
        id: 'prosrc', label: gettext('Code'), cell: 'text',
        type: 'sql', isFullTab: true,
        mode: ['properties', 'create', 'edit'],
        group: gettext('Code'), deps: ['lanname'],
        visible: (state) => {
          return state.lanname !== 'c';
        },
        disabled: obj.isDisabled, readonly: obj.isReadonly,
      },{
        id: 'probin', label: gettext('Object file'), cell: 'string',
        type: 'text', group: gettext('Definition'), deps: ['lanname'],
        visible: (state) => {
          return state.lanname == 'c';
        },
        disabled: obj.isDisabled, readonly: obj.isReadonly,
      },{
        id: 'prosrc_c', label: gettext('Link symbol'), cell: 'string',
        type: 'text', group: gettext('Definition'),  deps: ['lanname'],
        visible: (state) => {
          return state.lanname == 'c';
        },
        disabled: obj.isDisabled, readonly: obj.isReadonly,
      },{
        id: 'provolatile', label: gettext('Volatility'), cell: 'text',
        type: 'select', group: gettext('Options'),
        options:[
          {'label': 'VOLATILE', 'value': 'v'},
          {'label': 'STABLE', 'value': 's'},
          {'label': 'IMMUTABLE', 'value': 'i'},
        ], disabled: obj.isDisabled, readonly: obj.isReadonly,
        controlProps: { allowClear: false },
      },{
        id: 'proretset', label: gettext('Returns a set?'), type: 'switch',
        group: gettext('Options'), disabled: obj.isDisabled, readonly: obj.setReadonlyInEditMode,
        visible: obj.isVisible
      },{
        id: 'proisstrict', label: gettext('Strict?'), type: 'switch',
        disabled: obj.isDisabled, readonly: obj.isReadonly, group: gettext('Options'),
      },{
        id: 'prosecdef', label: gettext('Security of definer?'),
        group: gettext('Options'), cell:'boolean', type: 'switch',
        disabled: obj.isDisabled, readonly: obj.isReadonly,
      },{
        id: 'proiswindow', label: gettext('Window?'),
        group: gettext('Options'), cell:'boolean', type: 'switch',
        disabled: obj.isDisabled, readonly: obj.setReadonlyInEditMode, visible: obj.isVisible
      },{
        id: 'procost', label: gettext('Estimated cost'), type: 'text',
        group: gettext('Options'), disabled: obj.isDisabled, readonly: obj.isReadonly,
      },{
        id: 'prorows', label: gettext('Estimated rows'), type: 'text',
        group: gettext('Options'),
        disabled: (state) => {
          let isDisabled = true;
          if(state.proretset) {
            isDisabled = false;
          }
          return isDisabled;
        },
        readonly: obj.isReadonly,
        deps: ['proretset'], visible: obj.isVisible
      },{
        id: 'proleakproof', label: gettext('Leak proof?'),
        group: gettext('Options'), cell:'boolean', type: 'switch', min_version: 90200,
        disabled: obj.isDisabled, readonly: obj.isReadonly,
      }, {
        id: 'proacl', label: gettext('Privileges'), mode: ['properties'],
        group: gettext('Security'), type: 'text',
      },
      {
        id: 'variables', label: '', type: 'collection',
        group: gettext('Parameters'), control: 'variable-collection',
        mode: ['edit', 'create'], canEdit: false,
        canDelete: true, disabled: obj.isDisabled, readonly: obj.isReadonly,
        schema: this.getVariableSchema(),
        editable: false,
      },
      {
        id: 'acl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['X']),
        uniqueCol : ['grantee'],
        editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      },
      {
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        schema: new SecLabelSchema(),
        editable: false, group: gettext('Security'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: true, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90200,
        disabled: obj.isDisabled, readonly: obj.isReadonly,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    if (isEmptyString(state.service)) {

      /* code validation*/
      if (isEmptyString(state.prosrc)) {
        errmsg = gettext('Code cannot be empty.');
        setError('prosrc', errmsg);
        return true;
      } else {
        setError('prosrc', null);
      }

    }
  }
}
