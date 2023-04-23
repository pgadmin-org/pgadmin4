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

import { getNodeAjaxOptions } from '../../../../../../../static/js/node_ajax';
import _ from 'lodash';
import getApiInstance from 'sources/api_instance';
import { isEmptyString } from 'sources/validators';

function isTlengthEditable(state, options) {
  // We will store type from selected from combobox
  let of_type = state.type;
  // iterating over all the types
  _.each(options, function(o) {
    // if type from selected from combobox matches in options
    if ( of_type == o.value ) {
      // if length is allowed for selected type
      if(o.length)
      {
        // set the values in state
        state.is_tlength = true;
        state.min_val = o.min_val;
        state.max_val = o.max_val;
      } else {
        // set the values in state
        state.is_tlength = false;
      }
    }
  });
  return state.is_tlength;
}

function isPrecisionEditable(state, options) {
  // We will store type from selected from combobox
  let of_type = state.type;
  // iterating over all the types
  _.each(options, function(o) {
    // if type from selected from combobox matches in options
    if ( of_type == o.value ) {
      // if precession is allowed for selected type
      if(o.precision)
      {
        // set the values in model
        state.is_precision = true;
        state.min_val = o.min_val;
        state.max_val = o.max_val;
      } else {
        // set the values in model
        state.is_precision = false;
      }
    }
  });
  return state.is_precision;
}

function getTypes(nodeObj, treeNodeInfo, itemNodeData) {
  return getNodeAjaxOptions('get_types', nodeObj, treeNodeInfo, itemNodeData, {
    cacheLevel: 'domain'
  });
}

function getCompositeSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new CompositeSchema(
    {
      types: () => { return getTypes(nodeObj, treeNodeInfo, itemNodeData); },
      collations: () => getNodeAjaxOptions('get_collations', nodeObj, treeNodeInfo, itemNodeData)
    }
  );
}

function getRangeSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new RangeSchema(
    {
      typnameList: () => getNodeAjaxOptions('get_stypes', nodeObj, treeNodeInfo, itemNodeData),
      getSubOpClass: (typname) => {
        return new Promise((resolve, reject)=>{
          const api = getApiInstance();

          let _url = nodeObj.generate_url.apply(
            nodeObj, [
              null, 'get_subopclass', itemNodeData, false,
              treeNodeInfo,
            ]);
          let data;

          if(!_.isUndefined(typname) && typname != ''){
            api.get(_url, {
              params: {
                'typname' : typname
              }
            }).then(res=>{
              data = res.data.data;
              resolve(data);
            }).catch((err)=>{
              reject(err);
            });
          } else {
            resolve(data);
          }
        });
      },
      collationsList: () => getNodeAjaxOptions('get_collations', nodeObj, treeNodeInfo, itemNodeData),
      getCanonicalFunctions: (name) => {
        return new Promise((resolve, reject)=>{
          const api = getApiInstance();

          let _url = nodeObj.generate_url.apply(
            nodeObj, [
              null, 'get_canonical', itemNodeData, false,
              treeNodeInfo,
            ]);
          let data = [];

          if(!_.isUndefined(name) && name != '' && name != null){
            api.get(_url, {
              params: {
                'name' : name
              }
            }).then(res=>{
              data = res.data.data;
              resolve(data);
            }).catch((err)=>{
              reject(err);
            });
          } else {
            resolve(data);
          }
        });
      },
      getSubDiffFunctions: (typname, opcname) => {
        return new Promise((resolve, reject)=>{
          const api = getApiInstance();

          let _url = nodeObj.generate_url.apply(
            nodeObj, [
              null, 'get_stypediff', itemNodeData, false,
              treeNodeInfo,
            ]);
          let data;

          if(!_.isUndefined(typname) && typname != '' &&
              !_.isUndefined(opcname) && opcname != ''){
            api.get(_url, {
              params: {
                'typname' : typname,
                'opcname': opcname
              }
            }).then(res=>{
              data = res.data.data;
              resolve(data);
            }).catch((err)=>{
              reject(err);
            });
          } else {
            resolve(data);
          }
        });
      },
    }, {
      node_info: treeNodeInfo
    }
  );
}

function getExternalSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new ExternalSchema(
    {
      externalFunctionsList: () => getNodeAjaxOptions('get_external_functions', nodeObj, treeNodeInfo, itemNodeData),
      types: () => { return getTypes(nodeObj, treeNodeInfo, itemNodeData); },
    }, {
      node_info: treeNodeInfo
    }
  );
}

function getDataTypeSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new DataTypeSchema(
    {
      types: () => { return getTypes(nodeObj, treeNodeInfo, itemNodeData); }
    }
  );
}

function isVisible(state, type) {
  return state.typtype === type;
}

class EnumerationSchema extends BaseUISchema {

  constructor() {
    super({
      oid: undefined,
      label: undefined,
    });
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'label', label: gettext('Label'),
        type: 'text', cell: 'text', minWidth: 640,
        editable: (state) => {
          return _.isUndefined(obj.isNew) ? true : obj.isNew(state);
        }
      }
    ];
  }
}

class RangeSchema extends BaseUISchema {
  constructor(fieldOptions = {}, node_info={}, initValues={}) {
    super({
      typname: null,
      oid: undefined,
      is_sys_type: false,
      ...initValues
    });
    this.fieldOptions = {
      typnameList: [],
      collationsList: [],
      ...fieldOptions
    };
    this.nodeInfo = {
      ...node_info.node_info
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [{
      // We will disable range type control in edit mode
      id: 'typname', label: gettext('Subtype'),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.typnameList,
          optionsLoaded: (options) => { obj.fieldOptions.typnameList = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              let res = [];
              if (state && obj.isNew(state)) {
                if(options && options.length > 0) {
                  state.subtypes = options;
                }
                options.forEach((option) => {
                  if(option && option.label == '') {
                    return;
                  }
                  res.push({ label: option.label, value: option.value });
                });
              } else {
                res = options;
              }
              return res;
            }
          }
        };
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
      mode: ['properties', 'create', 'edit'],
      group: gettext('Range Type'),
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    }, {
      id: 'opcname', label: gettext('Subtype operator class'), cell: 'string',
      mode: ['properties', 'create', 'edit'], group: gettext('Range Type'),
      disabled: () => obj.inCatalog(),
      readonly: function(state) {
        return !obj.isNew(state);
      },
      deps: ['typname'],
      type: (state)=>{
        return {
          type: 'select',
          options: () => obj.fieldOptions.getSubOpClass(state.typname),
          optionsReloadBasis: state.typname,
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    }, {
      id: 'collname', label: gettext('Collation'), cell: 'string',
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.collationsList,
          optionsLoaded: (options) => { obj.fieldOptions.collationsList = options; },
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
      mode: ['properties', 'create', 'edit'],
      group: gettext('Range Type'),
      deps: ['typname'],
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
      disabled: (state) => {
        let disableCollNameControl = obj.inCatalog();
        if (disableCollNameControl)
          return disableCollNameControl;

        // To check if collation is allowed?
        let of_subtype = state.typname;
        if(!_.isUndefined(of_subtype)) {
          // iterating over all the types
          _.each(state.subtypes, function(s) {
            // if subtype from selected from combobox matches
            if ( of_subtype === s.label ) {
              // if collation is allowed for selected subtype
              // then enable it else disable it
              disableCollNameControl = s.is_collate;
            }
          });
        }
        // If is_collate is true then do not disable
        if(!disableCollNameControl) {
          state.collname = '';
          this.options = [];
        }

        return disableCollNameControl ? false : true;
      },
      readonly: function(state) {
        return !obj.isNew(state);
      }
    }, {
      id: 'rngcanonical', label: gettext('Canonical function'), cell: 'string',
      type: (state)=>{
        return {
          type: 'select',
          options: () => obj.fieldOptions.getCanonicalFunctions(state.name),
          optionsReloadBasis: state.typname,
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
      mode: ['properties', 'create', 'edit'],
      group: gettext('Range Type'),
      disabled: () => obj.inCatalog(),
      readonly: function(state) {
        return !obj.isNew(state);
      },
      deps: ['name', 'typname'],
    }, {
      id: 'rngsubdiff', label: gettext('Subtype diff function'), cell: 'string',
      mode: ['properties', 'create', 'edit'],
      group: gettext('Range Type'),
      disabled: () => obj.inCatalog(),
      readonly: function(state) {
        return !obj.isNew(state);
      },
      deps: ['typname', 'opcname'],
      type: (state)=>{
        let fetchOptionsBasis = state.typname + state.opcname;
        return {
          type: 'select',
          options: () => obj.fieldOptions.getSubDiffFunctions(state.typname, state.opcname),
          optionsReloadBasis: fetchOptionsBasis,
          controlProps: {
            allowClear: true,
            filter: (options) => {
              return obj.getFilterOptions(state, options);
            }
          }
        };
      },
    }
    ];
  }

  validate(state, setError) {

    let errmsg = null;

    if(state.typtype === 'r') {
      if (isEmptyString(state.typname)) {
        errmsg = gettext('Subtype cannot be empty');
        setError('typname', errmsg);
        return true;
      }
    }
  }
}

class ExternalSchema extends BaseUISchema {
  constructor(fieldOptions = {}, node_info={}, initValues={}) {
    super({
      name: null,
      typinput: undefined,
      oid: undefined,
      is_sys_type: false,
      typtype: undefined,
      ...initValues
    });
    this.fieldOptions = {
      types: [],
      externalFunctionsList: [],
      ...fieldOptions
    };
    this.fieldOptions.typeCategory = [
      {label :'Array types', value : 'A'},
      {label :'Boolean types', value : 'B'},
      {label :'Composite types', value : 'C'},
      {label :'Date/time types', value : 'D'},
      {label :'Enum types', value : 'E'},
      {label :'Geometric types', value : 'G'},
      {label :'Network address types', value : 'I'},
      {label :'Numeric types', value : 'N'},
      {label :'Pseudo-types', value : 'P'},
      {label :'String types', value : 'S'},
      {label :'Timespan types', value : 'T'},
      {label :'User-defined types', value : 'U'},
      {label :'Bit-string types', value : 'V'},
      {label :'unknown type', value : 'X'},
    ];
    this.fieldOptions.typeAlignOptions = [
      {label: 'char', value: 'c'},
      {label: 'int2', value: 's'},
      {label: 'int4', value: 'i'},
      {label: 'double', value: 'd'},
    ];
    this.fieldOptions.typStorageOptions = [
      {label: 'PLAIN', value: 'p'},
      {label: 'EXTERNAL', value: 'e'},
      {label: 'MAIN', value: 'm'},
      {label: 'EXTENDED', value: 'x'},
    ];
    this.nodeInfo = {
      ...node_info.node_info
    };
  }

  get idAttribute() {
    return 'oid';
  }

  // Function will help us to fill combobox
  external_func_combo(control) {
    let result = [];
    _.each(control, function(item) {

      if(item && item.label == '') {
        return;
      }
      // if type from selected from combobox matches in options
      if ( item.cbtype == 'all' ) {
        result.push(item);
      }
    });
    return result;
  }

  filterFunctionOptions(state, options) {
    let res = [];
    if (state && this.isNew(state)) {
      res = this.external_func_combo(options);
    } else {
      res = options;
    }
    return res;
  }

  getFunctionType(state) {
    let obj = this;
    return {
      type: 'select',
      options: obj.fieldOptions.externalFunctionsList,
      optionsLoaded: (options) => { obj.fieldOptions.externalFunctionsList = options; },
      controlProps: {
        allowClear: true,
        placeholder: '',
        width: '100%',
        filter: (options) => {
          return obj.filterFunctionOptions(state, options);
        }
      }
    };
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'spacer_ctrl', group: gettext('Required'), mode: ['edit', 'create'], type: 'spacer',
    },{
      id: 'typinput', label: gettext('Input function'),
      mode: ['properties', 'create', 'edit'], group: gettext('Required'),
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      type: (state) => {
        return obj.getFunctionType(state);
      },
    }, {
      id: 'typoutput', label: gettext('Output function'),
      mode: ['properties', 'create', 'edit'],
      group: gettext('Required'),
      type: (state) => {
        return obj.getFunctionType(state);
      },
      readonly: function (state) {
        return !obj.isNew(state);
      },
      disabled: () => obj.inCatalog(),
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'spacer_ctrl_optional_1', group: gettext('Optional-1'), mode: ['edit', 'create'], type: 'spacer',
    },{
      id: 'typreceive', label: gettext('Receive function'),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.externalFunctionsList,
          optionsLoaded: (options) => { obj.fieldOptions.externalFunctionsList = options; },
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
            filter: (options) => {
              let res = [];
              if (state && obj.isNew(state)) {
                res = obj.external_func_combo(options);
              } else {
                res = options;
              }
              return res;
            }
          }
        };
      },
      group: gettext('Optional-1'),
      mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'typsend', label: gettext('Send function'),
      group: gettext('Optional-1'),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.externalFunctionsList,
          optionsLoaded: (options) => { obj.fieldOptions.externalFunctionsList = options; },
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
            filter: (options) => {
              return obj.filterFunctionOptions(state, options);
            }
          }
        };
      },
      mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'typmodin', label: gettext('Typmod in function'),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.externalFunctionsList,
          optionsLoaded: (options) => { obj.fieldOptions.externalFunctionsList = options; },
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
            filter: (options) => {
              let res = [];
              if (state && obj.isNew(state)) {
                _.each(options, function(item) {
                  if(item && item.label == '') {
                    return;
                  }
                  // if type from selected from combobox matches in options
                  if ( item.cbtype === 'typmodin' || item.cbtype === 'all') {
                    res.push(item);
                  }
                });
              } else {
                res = options;
              }
              return res;
            }
          }
        };
      },
      mode: ['properties', 'create', 'edit'], group: gettext('Optional-1'),
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'typmodout', label: gettext('Typmod out function'),
      group: gettext('Optional-1'),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.externalFunctionsList,
          optionsLoaded: (options) => { obj.fieldOptions.externalFunctionsList = options; },
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
            filter: (options) => {
              let res = [];
              if (state && obj.isNew(state)) {
                _.each(options, function(item) {
                  if(item && item.label == '') {
                    return;
                  }
                  // if type from selected from combobox matches in options
                  if ( item.cbtype === 'typmodout' || item.cbtype === 'all') {
                    res.push(item);
                  }
                });
              } else {
                res = options;
              }
              return res;
            }
          }
        };
      },
      mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    },{
      id: 'typlen', label: gettext('Internal length'),
      cell: 'integer', group: gettext('Optional-1'),
      type: 'int', mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    },{
      id: 'variable', label: gettext('Variable?'), cell: 'switch',
      group: gettext('Optional-1'), type: 'switch',
      mode: ['create','edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    },{
      id: 'typdefault', label: gettext('Default?'),
      cell: 'string', group: gettext('Optional-1'),
      type: 'text', mode: ['properties', 'create','edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    },{
      id: 'typanalyze', label: gettext('Analyze function'),
      group: gettext('Optional-1'),
      type: (state) => {
        return obj.getFunctionType(state);
      },
      mode: ['properties', 'create','edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'typcategory', label: gettext('Category type'),
      cell: 'string',
      group: gettext('Optional-1'),
      type: () => {
        return {
          type: 'select',
          options: obj.fieldOptions.typeCategory,
          optionsLoaded: (options) => { obj.fieldOptions.typeCategory = options; },
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
          }
        };
      },
      mode: ['properties', 'create','edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'typispreferred', label: gettext('Preferred?'),
      type: 'switch', mode: ['properties', 'create','edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      group: gettext('Optional-1'),
    },{
      id: 'spacer_ctrl_optional_2', group: gettext('Optional-2'), mode: ['edit', 'create'], type: 'spacer',
    },{
      id: 'element', label: gettext('Element type'),
      group: gettext('Optional-2'),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.types,
          controlProps: {
            allowClear: true,
            placeholder: '',
            width: '100%',
            filter: (options) => {
              let res = [];
              if (state && obj.isNew(state)) {
                _.each(options, function(item) {
                  if(item && item.label == '') {
                    return;
                  }
                  // if type from selected from combobox matches in options
                  res.push(item);
                });
              } else {
                res = options;
              }
              return res;
            }
          }
        };
      },
      mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    },{
      id: 'typdelim', label: gettext('Delimiter'),
      cell: 'string',
      type: 'text',
      mode: ['properties', 'create', 'edit'],
      group: gettext('Optional-2'),
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
    },{
      id: 'typalign', label: gettext('Alignment type'),
      cell: 'string', group: gettext('Optional-2'),
      type: 'select',
      options: obj.fieldOptions.typeAlignOptions,
      mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
    },{
      id: 'typstorage', label: gettext('Storage type'),
      type: 'select', mode: ['properties', 'create', 'edit'],
      group: gettext('Optional-2'), cell: 'string',
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: true, placeholder: '', width: '100%' },
      options: obj.fieldOptions.typStorageOptions,
    },{
      id: 'typbyval', label: gettext('Passed by value?'),
      cell: 'switch',
      type: 'switch', mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      group: gettext('Optional-2'),
    },{
      id: 'is_collatable', label: gettext('Collatable?'),
      cell: 'switch',  min_version: 90100, group: gettext('Optional-2'),
      type: 'switch', mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      // End of extension tab
    }];
  }

  validate(state, setError) {

    let errmsg = null;

    if(state.typtype === 'b') {

      if (isEmptyString(state.typinput)) {
        errmsg = gettext('Input function cannot be empty');
        setError('typinput', errmsg);
        return true;
      }

      if (isEmptyString(state.typoutput)) {
        errmsg = gettext('Output function cannot be empty');
        setError('typoutput', errmsg);
        return true;
      }
    }
    return false;
  }
}

class CompositeSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues={}) {
    super({
      oid: undefined,
      is_sys_type: false,
      attnum: undefined,
      member_name: undefined,
      type: undefined,
      tlength: null,
      is_tlength: false,
      precision: undefined,
      is_precision: false,
      collation: undefined,
      min_val: undefined,
      max_val: undefined,
      ...initValues
    });
    this.fieldOptions = {
      types: [],
      collations: [],
      ...fieldOptions
    };
    this.type_options = {};
  }

  setTypeOptions(options) {
    options.forEach((option)=>{
      this.type_options[option.value] = {
        ...option,
      };
    });
  }

  get idAttribute() {
    return 'oid';
  }

  onTypeChange(state, changeSource) {
    if(_.isArray(changeSource) && changeSource[2] == 'type') {
      return {...state
        , value: null
      };
    }
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'member_name', label: gettext('Member Name'),
      type: 'text', cell: 'text'
    },
    {
      id: 'type', label: gettext('Type'),
      type: 'text',
      cell: ()=>({
        cell: 'select', options: obj.fieldOptions.types,
        optionsLoaded: (options)=>{obj.setTypeOptions(options);},
        controlProps: {
          allowClear: false,
        }
      }),
    }, {
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'tlength', label: gettext('Length/Precision'), deps: ['type'], type: 'text',
      disabled: false,
      cell: 'int',
      depChange: (state, changeSource)=>{
        if(_.isArray(changeSource) && changeSource[2] == 'type') {
          state.tlength = null;
          return {...state
            , value: null
          };
        }
      },
      editable: (state)=>{
        return isTlengthEditable(state, obj.type_options);
      }
    }, {
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'precision', label: gettext('Scale'), deps: ['type'],
      type: 'text', disabled: false, cell: 'int',
      depChange: (state, changeSource)=>{
        return obj.onTypeChange(state, changeSource);
      },
      editable: (state) => {
        return isPrecisionEditable(state, obj.type_options);
      },
    }, {
      id: 'collation', label: gettext('Collation'), type: 'text',
      depChange: (state, changeSource)=>{
        return obj.onTypeChange(state, changeSource);
      },
      cell: ()=>({
        cell: 'select', options: obj.fieldOptions.collations,
        controlProps: {
          allowClear: false,
        }
      }),
      deps: ['type'],
      editable: (state) => {
        // We will store type from selected from combobox
        let of_type = state.type;
        let flag = false;
        if(obj.type_options) {
          // iterating over all the types
          _.each(obj.type_options, function(o) {
            // if type from selected from combobox matches in options
            if ( of_type == o.value ) {
              if(o.is_collatable) {
                flag = true;
                return;
              }
            }
          });
        }
        return flag;
      },
    }];
  }

  validate(state, setError) {

    let self = this,
      errmsg = null;

    if(self.top && self.top.sessData && self.top.sessData.typtype === 'c') {
      if (isEmptyString(state.member_name)) {
        errmsg = gettext('Please specify the value for member name.');
        setError('member_name', errmsg);
        return true;
      } else if(isEmptyString(state.type)) {
        errmsg = gettext('Please specify the type.');
        setError('type', errmsg);
        return true;
      }
      if(_.isUndefined(errmsg) || errmsg == null) {
        setError('member_name', null);
        setError('type', null);
      }
    }
    return false;
  }
}

class DataTypeSchema extends BaseUISchema {

  constructor(fieldOptions = {}, initValues={}) {
    super({
      oid: undefined,
      is_sys_type: false,
      attnum: undefined,
      member_name: undefined,
      type: undefined,
      tlength: null,
      is_tlength: false,
      precision: undefined,
      is_precision: false,
      min_val: undefined,
      max_val: undefined,
      attlen: undefined,
      min_val_attlen: undefined,
      max_val_attlen: undefined,
      attprecision: null,
      min_val_attprecision: undefined,
      max_val_attprecision: undefined,
      ...initValues
    });
    this.types = fieldOptions.types;
    this.type_options = [];
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let dataTypeObj = this;
    return [{
      id: 'type',
      label: gettext('Data Type'),
      group: gettext('Definition'),
      mode: ['edit', 'create'],
      disabled: false,
      readonly: function (state) {
        return !dataTypeObj.isNew(state);
      },
      node: 'type',
      cache_node: 'domain',
      editable: true,
      deps: ['typtype'],
      type: (state) => {
        return {
          type: 'select',
          options: dataTypeObj.types,
          optionsLoaded: (options) => { dataTypeObj.types = options; },
          controlProps: {
            allowClear: false,
            filter: (options) => {
              let data_types = [];
              options.forEach((option) => {
                if (!(option.value.includes('[]'))) {
                  data_types.push(option);
                }
              });
              state.type_options = data_types;
              return data_types;
            }
          }
        };
      }
    },{
      id: 'maxsize',
      group: gettext('Definition'),
      label: gettext('Size'),
      type: 'int',
      deps: ['typtype'],
      cell: 'int',
      mode: ['create', 'edit'],
      readonly: function (state) {
        return !dataTypeObj.isNew(state);
      },
      visible: (state) => isVisible(state, 'V'),
    },{
    // Note: There are ambiguities in the PG catalogs and docs between
    // precision and scale. In the UI, we try to follow the docs as
    // closely as possible, therefore we use Length/Precision and Scale
      id: 'tlength',
      group: gettext('Data Type'),
      label: gettext('Length/Precision'),
      mode: ['edit', 'create'],
      deps: ['type'],
      type: 'text',
      cell: 'int',
      readonly: function (state) {
        return !dataTypeObj.isNew(state);
      },
      visible: (state) => isVisible(state, 'N'),
      disabled: function(state) {

        let of_type = state.type,
          flag = true;
        if (state.type_options) {
          _.each(state.type_options, function (o) {
            if (of_type == o.value) {
              if (o.length) {
                state.min_val_attlen = o.min_val;
                state.max_val_attlen = o.max_val;
                flag = false;
              }
            }
          });
        }
        flag && setTimeout(function () {
          if (state.attlen) {
            state.attlen = null;
          }
        }, 10);
        return flag;
      },
      editable: (state)=>{
        let options = state.type_options;
        return isTlengthEditable(state, options);
      }
    },{
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'precision',
      group: gettext('Data Type'),
      label: gettext('Scale'),
      mode: ['edit', 'create'],
      deps: ['type'],
      type: 'text',
      readonly: function (state) {
        return !dataTypeObj.isNew(state);
      },
      cell: 'int',
      visible: (state) => isVisible(state, 'N'),
      disabled: function(state) {
        let of_type = state.type,
          flag = true;
        _.each(state.type_options, function(o) {
          if ( of_type == o.value ) {
            if(o.precision) {
              state.min_val_attprecision  = 0;
              state.max_val_attprecision = o.max_val;
              flag = false;
            }
          }
        });

        flag && setTimeout(function() {
          if(state.attprecision) {
            state.attprecision = null;
          }
        },10);
        return flag;
      },
      editable: function(state) {
        let options = state.type_options;
        return isPrecisionEditable(state, options);
      },
    }];
  }
}

export default class TypeSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, compositeSchema, rangeSchema, externalSchema, dataTypeSchema, fieldOptions = {}, initValues={}) {
    super({
      name: null,
      oid: undefined,
      is_sys_type: false,
      typtype: undefined,
      typeowner: undefined,
      schema: undefined,
      ...initValues
    });
    this.fieldOptions = {
      roles: [],
      schemas: [],
      server_info: [],
      node_info: [],
      ...fieldOptions
    };
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.compositeSchema = compositeSchema(); // create only once the composite schema to avoid initializing the current (i.e. top)
    this.getRangeSchema = rangeSchema;
    this.getExternalSchema = externalSchema;
    this.getDataTypeSchema = dataTypeSchema;
    this.nodeInfo = this.fieldOptions.node_info;
  }

  isInvalidColumnAdded(state) {

    let tempCol = _.map(state.enum, 'label');
    let dontAddColumn = false;

    if(tempCol.length == 1 && tempCol[0] == undefined) {
      dontAddColumn = true;
    } else {
      tempCol.forEach(function(enumVal) {
        if(enumVal == undefined) {
          dontAddColumn = true;
        }
      });
    }
    return dontAddColumn;
  }

  schemaCheck(state) {
    if(this.fieldOptions.node_info && this.fieldOptions.node_info?.schema) {
      if(!state)
        return true;
      if (this.isNew(state)) {
        return false;
      } else {
        return state && state.typtype === 'p';
      }
    }
    return true;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'string',
      type: 'text', mode: ['properties', 'create', 'edit'],
      noEmpty: true,
      disabled: (state) => obj.schemaCheck(state),
    },{
      id: 'oid', label: gettext('OID'), cell: 'string',
      type: 'text' , mode: ['properties'],
    },{
      id: 'typeowner', label: gettext('Owner'), cell: 'string',
      mode: ['properties', 'create', 'edit'], noEmpty: true,
      type: 'select', options: this.fieldOptions.roles,
      controlProps: { allowClear: false },
      disabled: () => obj.inCatalog(),
    },{
      id: 'schema', label: gettext('Schema'), cell: 'string',
      mode: ['create', 'edit'], noEmpty: true,
      disabled: (state) => obj.schemaCheck(state),
      type: (state) => {
        return {
          type: 'select',
          options: obj.fieldOptions.schemas,
          optionsLoaded: (options) => { obj.fieldOptions.schemas = options; },
          controlProps: {
            allowClear: true,
            filter: (options) => {
              let res = [];
              if (state && obj.isNew(state)) {
                options.forEach((option) => {
                  // If schema name start with pg_* then we need to exclude them
                  if(option && option.label.match(/^pg_/)) {
                    return;
                  }
                  res.push({ label: option.label, value: option.value, image: 'icon-schema' });
                });
              } else {
                res = options;
              }
              return res;
            }
          }
        };
      }
    },
    {
      id: 'typtype', label: gettext('Type'),
      mode: ['create','edit'], group: gettext('Definition'),
      type: 'select',
      disabled: () => obj.inCatalog(),
      readonly: function (state) {
        return !obj.isNew(state);
      },
      controlProps: { allowClear: false },
      options: function() {
        let typetype = [
          {label: gettext('Composite'), value: 'c'},
          {label: gettext('Enumeration'), value: 'e'},
          {label: gettext('External'), value: 'b'},
          {label: gettext('Range'), value: 'r'},
          {label: gettext('Shell'), value: 'p'},
        ];
        if (obj.fieldOptions.server_info.server_type === 'ppas' &&
        obj.fieldOptions.server_info.version >= 90500){
          typetype.push(
            {label: gettext('Nested Table'), value: 'N'},
            {label: gettext('Varying Array'), value: 'V'}
          );
        }
        return typetype;
      },
    },
    {
      id: 'composite', label: gettext('Composite Type'),
      editable: true, type: 'collection',
      group: gettext('Definition'), mode: ['edit', 'create'],
      uniqueCol : ['member_name'],
      canAdd: true,  canEdit: false, canDelete: true,
      disabled: () => obj.inCatalog(),
      schema: obj.compositeSchema,
      deps: ['typtype'],
      depChange: (state)=>{
        if(_.isArray(state.composite) && state.composite.length > 0 && state.typtype !== 'c') {
          state.composite.splice(0, state.composite.length);
        }
      },
      visible: (state) => isVisible(state, 'c'),
    },
    {
      id: 'enum', label: gettext('Enumeration type'),
      schema: new EnumerationSchema(),
      type: 'collection',
      group: gettext('Definition'), mode: ['edit', 'create'],
      canAddRow: function(state) {
        return !obj.isInvalidColumnAdded(state);
      },
      canEdit: false,
      canDeleteRow: function(state) {
        // We will disable it if it's in 'edit' mode
        return obj.isNew(state);
      },
      canEditRow: false,
      disabled: () => obj.inCatalog(),
      deps: ['typtype'],
      uniqueCol : ['label'],
      visible: (state) => isVisible(state, 'e'),
    }, {
      type: 'nested-fieldset',
      group: gettext('Definition'),
      label: '',
      deps: ['typtype'],
      mode: ['edit', 'create'],
      visible: function(state) {
        return state.typtype === 'N' || state.typtype === 'V';
      },
      schema: obj.getDataTypeSchema()
    }, {
      // We will disable range type control in edit mode
      type: 'nested-fieldset',
      group: gettext('Definition'),
      label: '',
      mode: ['edit', 'create'],
      visible: (state) => isVisible(state, 'r'),
      deps: ['typtype'],
      schema: obj.getRangeSchema(),
    }, {
      type: 'nested-tab',
      group: gettext('Definition'),
      label: gettext('External Type'), deps: ['typtype'],
      mode: ['create', 'edit'], tabPanelExtraClasses:'inline-tab-panel-padded',
      visible: (state) => isVisible(state, 'b'),
      schema: obj.getExternalSchema(),
    },
    {
      id: 'alias', label: gettext('Alias'), cell: 'string',
      type: 'text', mode: ['properties'],
      disabled: () => obj.inCatalog(),
    },
    {
      id: 'member_list', label: gettext('Members'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'c'),
    },{
      id: 'enum_list', label: gettext('Labels'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'e'),
    },
    {
      id: 'typname', label: gettext('SubType'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'r'),
    },
    {
      id: 'opcname', label: gettext('Subtype operator class'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'r'),
    },
    {
      id: 'collname', label: gettext('Collation'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'r'),
    },
    {
      id: 'rngcanonical', label: gettext('Canonical function'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'r'),
    },
    {
      id: 'rngsubdiff', label: gettext('Subtype diff function'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'r'),
    },
    {
      id: 'typinput', label: gettext('Input function'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'b'),
    },
    {
      id: 'typoutput', label: gettext('Output function'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'b'),
    },
    {
      id: 'type', label: gettext('Data Type'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: function(state) {
        return state.typtype === 'N' || state.typtype === 'V';
      }
    },
    {
      id: 'tlength', label: gettext('Length/Precision'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'N'),
    },
    {
      id: 'precision', label: gettext('Scale'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'N'),
    },
    {
      id: 'maxsize', label: gettext('Size'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Definition'),
      disabled: () => obj.inCatalog(),
      visible: (state) => isVisible(state, 'V'),
    },
    {
      id: 'type_acl', label: gettext('Privileges'), cell: 'string',
      type: 'text', mode: ['properties'], group: gettext('Security'),
      disabled: () => obj.inCatalog(),
    },
    {
      id: 'is_sys_type', label: gettext('System type?'), cell: 'switch',
      type: 'switch', mode: ['properties'],
      disabled: () => obj.inCatalog(),
    },
    {
      id: 'description', label: gettext('Comment'), cell: 'string',
      type: 'multiline', mode: ['properties', 'create', 'edit'],
      disabled: () => obj.inCatalog(),
    },
    {
      id: 'typacl', label: gettext('Privileges'), type: 'collection',
      group: gettext('Security'),
      schema: this.getPrivilegeRoleSchema(['U']),
      mode: ['edit', 'create'], canDelete: true,
      uniqueCol : ['grantee'], deps: ['typtype'],
      canAdd: function(state) {
        // Do not allow to add when shell type is selected
        // Clear acl & security label collections as well
        if (state.typtype === 'p') {
          let acl = state.typacl;
          if(acl && acl.length > 0)
            acl.splice(0, acl.length);
        }
        return (state.typtype !== 'p');
      },
    },
    {
      id: 'seclabels', label: gettext('Security labels'),
      schema: new SecLabelSchema(),
      editable: false, type: 'collection',
      group: gettext('Security'), mode: ['edit', 'create'],
      min_version: 90100, canEdit: false, canDelete: true,
      uniqueCol : ['provider'], deps: ['typtype'],
      canAdd: function(state) {
        // Do not allow to add when shell type is selected
        // Clear acl & security label collections as well
        if (state.typtype === 'p') {
          let secLabs = state.seclabels;
          if(secLabs && secLabs.length > 0)
            secLabs.splice(0, secLabs.length);
        }
        return (state.typtype !== 'p');
      },
    }];
  }
}

export {
  CompositeSchema,
  EnumerationSchema,
  ExternalSchema,
  RangeSchema,
  getCompositeSchema,
  getRangeSchema,
  getExternalSchema,
  getDataTypeSchema
};
