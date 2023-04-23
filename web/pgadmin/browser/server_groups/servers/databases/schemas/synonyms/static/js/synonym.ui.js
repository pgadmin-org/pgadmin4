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
import { emptyValidator } from 'sources/validators';

export default class SynonymSchema extends BaseUISchema {
  constructor(fieldOptions={}, nodeInfo={}, initValues={}) {
    super({
      targettype: 'r',
      ...initValues,
    });
    this.fieldOptions = fieldOptions;
    this.nodeInfo = nodeInfo;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', mode: ['properties', 'create', 'edit'],
        readonly: function(state) { return !obj.isNew(state); },
      }, {
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      }, {
        id: 'owner', label: gettext('Owner'),
        options: this.fieldOptions.role,
        controlProps: { allowClear: false, editable: false},
        type: 'select', mode: ['properties', 'create', 'edit'],
        readonly: true , visible: false,
      }, {
        id: 'schema', label: gettext('Schema'),
        type: 'select', mode: ['properties', 'create', 'edit'],
        options: this.fieldOptions.schema,
        controlProps: { allowClear: false, editable: false },
        readonly: function(state) { return !obj.isNew(state); },
      }, {
        id: 'targettype', label: gettext('Target type'),
        readonly: obj.inCatalog(), group: gettext('Definition'),
        controlProps: { allowClear: false },
        type: 'select',
        options: [
          {label: gettext('Function'), value: 'f'},
          {label: gettext('Package'), value: 'P'},
          {label: gettext('Procedure'), value: 'p'},
          {label: gettext('Public Synonym'), value: 's'},
          {label: gettext('Sequence'), value: 'S'},
          {label: gettext('Table'), value: 'r'},
          {label: gettext('View'), value: 'v'}
        ]
      }, {
        id: 'synobjschema', label: gettext('Target schema'),
        type: 'select', mode: ['properties', 'create', 'edit'],
        group: gettext('Definition'), deps: ['targettype'],
        controlProps: { allowClear: false},
        options: this.fieldOptions.synobjschema,
        readonly: function(state) {
          // If tagetType is synonym then disable it
          if(!obj.inCatalog()) {
            return state.targettype == 's';
          }
          return true;
        },
        depChange: function(state) {
          if(!obj.inCatalog() && state.targettype == 's') {
            return { synobjschema: 'public'};
          }
        }
      }, {
        id: 'synobjname', label: gettext('Target object'),
        group: gettext('Definition'),
        deps: ['targettype', 'synobjschema'],
        depChange: function(state, source) {
          if(source[0] == 'targettype' || source[0] == 'synobjschema') {
            return { synobjname: null};
          }
        },
        type: (state)=>{
          let fetchOptionsBasis = state.targettype + state.synobjschema;
          return {
            type: 'select',
            options: ()=>obj.fieldOptions.getTargetObjectOptions(state.targettype, state.synobjschema),
            optionsReloadBasis: fetchOptionsBasis,
          };
        },
        readonly: function() {
          if(!obj.inCatalog()) {
            return false;
          }
          return true;
        }
      }, {
        id: 'is_sys_obj', label: gettext('System synonym?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;

    errmsg = emptyValidator('Name', state.name);
    if (errmsg) {
      setError('name', errmsg);
      return true;
    } else {
      setError('name', errmsg);
    }

    errmsg = emptyValidator('Target schema', state.synobjschema);
    if (errmsg) {
      setError('synobjschema', errmsg);
      return true;
    } else {
      setError('synobjschema', errmsg);
    }

    errmsg = emptyValidator('Target object', state.synobjname);
    if (errmsg) {
      setError('synobjname', errmsg);
      return true;
    } else {
      setError('synobjname', errmsg);
    }
  }
}
