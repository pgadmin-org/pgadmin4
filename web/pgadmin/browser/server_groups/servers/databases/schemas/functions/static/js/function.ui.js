/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import { isEmptyString } from 'sources/validators';
import _ from 'lodash';

export class DefaultArgumentSchema extends BaseUISchema {
  constructor(node_info, getTypes) {
    super();
    this.node_info = node_info;
    this.getTypes = getTypes;
    this.type_options = {};
  }
  setTypeOptions(options) {
    options.forEach((option)=>{
      this.type_options[option.value] = {
        ...option,
      };
    });
  }

  get baseFields() {
    return[{
      id: 'argid', visible: false, type: 'text',
      mode: ['properties', 'edit','create'],
    },{
      id: 'argtype', label: gettext('Data type'),
      options: this.getTypes,
      type: 'text',
      cell: ()=>({
        cell: 'select', options: this.getTypes,
        optionsLoaded: (options)=>{this.setTypeOptions(options);},
        controlProps: {
          allowClear: false,
        }
      }),
      editable: this.isEditable, first_empty: true,
    },{
      id: 'argmode', label: gettext('Mode'),
      type: 'text',
      cell: ()=>({
        cell: 'select',
        options:[
          {'label': 'IN', 'value': 'IN'},
          {'label': 'OUT', 'value': 'OUT'},
          {'label': 'INOUT', 'value': 'INOUT'},
          {'label': 'VARIADIC', 'value': 'VARIADIC'},
        ],
        optionsLoaded: (options)=>{this.setTypeOptions(options);},
        controlProps: {
          allowClear: false,
        }
      }),
      editable: this.isEditable,
    },{
      id: 'argname', label: gettext('Argument name'), type: 'text',
      editable: this.isInCatalog, cell: ()=>({cell: 'text'})
    },{
      id: 'argdefval', label: gettext('Default'), type: 'text',
      cell: ()=>({cell: 'text'}), editable: this.isInCatalog,
    }];
  }

  isEditable() {
    let node_info = this.node_info;
    if(node_info && 'catalog' in node_info) {
      return false;
    }
    return _.isUndefined(this.isNew) ? true : this.isNew();
  }
  isInCatalog(state){
    let node_info = this.node_info;
    if(node_info && 'catalog' in node_info) {
      return false;
    }
    // Below will disable default value cell if argument mode is 'INOUT' or 'OUT' as
    // user cannot set default value for out parameters.
    return !(!_.isUndefined(state.argmode) && !_.isUndefined(state.name) &&
       state.name == 'argdefval' &&
       (state.argmode == 'INOUT' || state.argmode == 'OUT'));
  }
}

export default class FunctionSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, getNodeVariableSchema, fieldOptions={}, node_info={}, type='function', initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      xmin: undefined,
      funcowner: undefined,
      pronamespace: undefined,
      description: undefined,
      pronargs: undefined, /* Argument Count */
      proargs: undefined, /* Arguments */
      proargtypenames: undefined, /* Argument Signature */
      prorettypename: undefined, /* Return Type */
      lanname: undefined, /* Language Name in which function is being written */
      provolatile: undefined, /* Volatility */
      proretset: undefined, /* Return Set */
      proisstrict: undefined,
      prosecdef: undefined, /* Security of definer */
      proiswindow: undefined, /* Window Function ? */
      proparallel: undefined, /* Parallel mode */
      procost: undefined, /* Estimated execution Cost */
      prorows: 0, /* Estimated number of rows */
      proleakproof: undefined,
      prosupportfunc: undefined, /* Support function */
      arguments: [],
      prosrc: undefined,
      prosrc_c: undefined,
      probin: '$libdir/',
      options: [],
      variables: [],
      proacl: undefined,
      seclabels: [],
      acl: [],
      sysfunc: undefined,
      sysproc: undefined,
      ...initValues
    });

    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.getNodeVariableSchema = getNodeVariableSchema;
    this.node_info = node_info;
    this.type =  type.type;
    this.fieldOptions = {
      role: [],
      schema: [],
      getTypes: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'oid';
  }

  isVisible(state) {
    if(this.type !== 'procedure'){
      return !state.sysproc;
    }else{
      if (state.sysfunc) {
        return false;
      } else if (state.sysproc) {
        return true;
      }

      return false;
    }
  }

  isGreaterThan95(state){
    if (
      this.node_info['node_info'].server.version < 90500 ||
      this.node_info['node_info']['server'].server_type != 'ppas' ||
      state.lanname != 'edbspl'
    ) {
      state.provolatile = null;
      state.proisstrict = false;
      state.procost = null;
      state.proleakproof = false;
      return true;
    } else {
      return false;
    }
  }

  isGreaterThan96(state){
    if (
      this.node_info['node_info'].server.version < 90600 ||
      this.node_info['node_info']['server'].server_type != 'ppas' ||
      state.lanname != 'edbspl'
    ) {
      state.proparallel = null;
      return true;
    } else {
      return false;
    }
  }


  isReadonly() {
    return !this.isNew();
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'string',
      type: 'text', mode: ['properties', 'create', 'edit'],
      disabled: obj.inCatalog(),
      noEmpty: true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      type: 'text' , mode: ['properties'],
    },{
      id: 'funcowner', label: gettext('Owner'), cell: 'string',
      options: this.fieldOptions.role, type: 'select',
      disabled: (state) => {
        if (this.type !== 'procedure') {
          obj.inCatalog(state);
        } else {
          obj.isGreaterThan95(state);
        }
      },
      noEmpty: true,
    },{
      id: 'pronamespace', label: gettext('Schema'), cell: 'string',
      type: 'select', disabled: obj.inCatalog(),
      mode: ['create', 'edit'],
      controlProps: {
        allowClear: false,
        first_empty: false,
      },
      options: obj.fieldOptions.schema, noEmpty: true,
    },{
      id: 'sysfunc', label: gettext('System function?'),
      cell:'boolean', type: 'switch',
      mode: ['properties'], visible: obj.isVisible,
    },{
      id: 'sysproc', label: gettext('System procedure?'),
      cell:'boolean', type: 'switch',
      mode: ['properties'], visible: () => {
        return this.type === 'procedure';
      },
    },{
      id: 'description', label: gettext('Comment'), cell: 'string',
      type: 'multiline', disabled: obj.inCatalog(),
    },{
      id: 'pronargs', label: gettext('Argument count'), cell: 'string',
      type: 'text', group: gettext('Definition'), mode: ['properties'],
    },{
      id: 'proargs', label: gettext('Arguments'), cell: 'string',
      type: 'text', group: gettext('Definition'), mode: ['properties'],
    },{
      id: 'proargtypenames', label: gettext('Signature arguments'), cell:
      'string', type: 'text', group: gettext('Definition'), mode: ['properties'],
    },{
      id: 'prorettypename', label: gettext('Return type'), cell: 'string',
      type: 'select', group: gettext('Definition'),
      options: this.fieldOptions.getTypes,
      readonly: obj.isReadonly, first_empty: true,
      mode: ['create'], visible: obj.isVisible,
    },{
      id: 'prorettypename', label: gettext('Return type'), cell: 'string',
      type: 'text', group: gettext('Definition'),
      mode: ['properties', 'edit'], readonly: obj.isReadonly, visible: obj.isVisible,
    },{
      id: 'lanname', label: gettext('Language'), cell: 'string', noEmpty: true,
      options: this.fieldOptions.getLanguage, type: 'select', group: gettext('Definition'),
      disabled: function() {
        if(this.type === 'procedure'){
          return this.node_info['node_info'].server.version < 110000;
        }

        return this.node_info && 'catalog' in this.node_info;
      }
    },
    {
      id: 'probin', label: gettext('Object file'), cell: 'string',
      type: 'text', group: gettext('Definition'), deps: ['lanname'], visible:
      function(state) {
        return state.lanname == 'c';
      }, disabled: obj.inCatalog(),
    },{
      id: 'prosrc_c', label: gettext('Link symbol'), cell: 'string',
      type: 'text', group: gettext('Definition'),  deps: ['lanname'], visible:
      function(state) {
        return state.lanname == 'c';
      }, disabled: obj.inCatalog(),
    },
    {
      id: 'arguments', label: gettext('Arguments'), cell: 'string',
      group: gettext('Definition'), type: 'collection', canAdd: function(){
        return obj.isNew();
      },
      canDelete: true, mode: ['create', 'edit'],
      columns: ['argtype', 'argmode', 'argname', 'argdefval'],
      schema : new DefaultArgumentSchema(this.node_info, this.fieldOptions.getTypes),
      disabled: obj.inCatalog(),
      canDeleteRow: function() {
        return obj.isNew();
      },
    },{
      id: 'prosrc', label: gettext('Code'), cell: 'text',
      type: 'sql', mode: ['properties', 'create', 'edit'],
      group: gettext('Code'), deps: ['lanname'],
      isFullTab: true,
      visible: function(state) {
        return state.lanname !== 'c';
      }, disabled: obj.inCatalog(),
    },{
      id: 'provolatile', label: gettext('Volatility'), cell: 'text',
      type: 'select', group: gettext('Options'),
      deps: ['lanname'],
      options:[
        {'label': 'VOLATILE', 'value': 'v'},
        {'label': 'STABLE', 'value': 's'},
        {'label': 'IMMUTABLE', 'value': 'i'},
      ], disabled: (this.type !== 'procedure') ? obj.inCatalog() : obj.isGreaterThan95,
      controlProps: {allowClear: false},
    },{
      id: 'proretset', label: gettext('Returns a set?'), type: 'switch',
      disabled: ()=>{return !obj.isNew();}, group: gettext('Options'),
      visible: obj.isVisible, readonly: obj.isReadonly,
    },{
      id: 'proisstrict', label: gettext('Strict?'), type: 'switch',
      group: gettext('Options'), disabled: obj.inCatalog(),
      deps: ['lanname'],
    },{
      id: 'prosecdef', label: gettext('Security of definer?'),
      group: gettext('Options'), type: 'switch',
      disabled: (this.type !== 'procedure') ? obj.inCatalog(): ()=>{
        return obj.node_info['node_info'].server.version < 90500;
      },
    },{
      id: 'proiswindow', label: gettext('Window?'),
      group: gettext('Options'), cell:'boolean', type: 'switch',
      disabled: ()=>{return !obj.isNew();}, visible: obj.isVisible, readonly: obj.isReadonly,
    },{
      id: 'proparallel', label: gettext('Parallel'), cell: 'string',
      type: 'select', group: gettext('Options'),
      deps: ['lanname'],
      options:[
        {'label': 'UNSAFE', 'value': 'u'},
        {'label': 'RESTRICTED', 'value': 'r'},
        {'label': 'SAFE', 'value': 's'},
      ],
      disabled: (this.type !== 'procedure') ? obj.inCatalog(): obj.isGreaterThan96,
      min_version: 90600,
      controlProps: {allowClear: false},
    },{
      id: 'procost', label: gettext('Estimated cost'), group: gettext('Options'),
      cell:'string', type: 'text', deps: ['lanname'],
      disabled: (this.type !== 'procedure') ? obj.isDisabled: obj.isGreaterThan95,
    },{
      id: 'prorows', label: gettext('Estimated rows'), type: 'text',
      deps: ['proretset'], visible: obj.isVisible,
      readonly: (state) => {
        let isReadonly = true;
        if(state.proretset) {
          isReadonly = false;
        }
        return isReadonly;
      },
      group: gettext('Options'),
    },{
      id: 'proleakproof', label: gettext('Leak proof?'),
      group: gettext('Options'), cell:'boolean', type: 'switch', min_version: 90200,
      disabled: (this.type !== 'procedure') ? obj.inCatalog(): obj.isGreaterThan95,
      deps: ['lanname'],
    },{
      id: 'prosupportfunc', label: gettext('Support function'),
      type: 'select',
      disabled: ()=>{
        if (obj.node_info && 'catalog' in obj.node_info) {
          return true;
        }

        return !(obj.node_info['node_info'].server.user.is_superuser);
      },
      group: gettext('Options'), visible: obj.isVisible,
      options: this.fieldOptions.getSupportFunctions, min_version: 120000,
    },{
      id: 'proacl', label: gettext('Privileges'), type: 'text',
      mode: ['properties'], group: gettext('Security'),
    },
    {
      id: 'variables', label: '', type: 'collection',
      group: gettext('Parameters'),
      schema: this.getNodeVariableSchema(),
      mode: ['edit', 'create'], canAdd: true, canEdit: false,
      canDelete: true,
    },
    {
      id: 'acl', label: gettext('Privileges'), editable: false,
      schema: this.getPrivilegeRoleSchema(['X']),
      uniqueCol : ['grantee', 'grantor'], type: 'collection',
      group: 'Security', mode: ['edit', 'create'], canAdd: true,
      canDelete: true,
      disabled: obj.inCatalog(),
    },{
      id: 'seclabels', label: gettext('Security labels'), canAdd: true,
      schema: new SecLabelSchema(), type: 'collection',
      min_version: 90100, group: 'Security', mode: ['edit', 'create'],
      canEdit: false, canDelete: true, uniqueCol : ['provider'],
      disabled: obj.inCatalog(),
      visible: function() {
        return this.node_info && this.type !== 'procedure';
      },
    },
    ];
  }
  validate(state, setError) {
    let errmsg = null;
    if (this.type !== 'procedure' &&(isEmptyString(state.prorettypename))) {
      errmsg = gettext('Return type cannot be empty.');
      setError('prorettypename', errmsg);
      return true;
    } else {
      setError('prorettypename', null);
    }

    if ((String(state.lanname) == 'c')) {
      if (isEmptyString(state.probin)){
        errmsg = gettext('Object File cannot be empty.');
        setError('probin', errmsg);
        return true;
      }else {
        setError('probin', null);
      }

      if (isEmptyString(state.prosrc_c)) {
        errmsg = gettext('Link Symbol cannot be empty.');
        setError('prosrc_c', errmsg);
        return true;
      }else {
        setError('prosrc_c', null);
      }

    }else {
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
