/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import { isEmptyString } from 'sources/validators';

export default class CollationSchema extends BaseUISchema {
  constructor(fieldOptions = {},initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      owner: undefined,
      copy_collation: null,
      locale: undefined,
      lc_type: undefined,
      lc_collate: undefined,
      description: undefined,
      provider: 'libc',
      is_deterministic: true,
      schema: null,
      ...initValues
    });
    this.schemaList = fieldOptions.schemaList;
    this.ownerList = fieldOptions.rolesList;
    this.collationsList = fieldOptions.collationsList;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'),
        type: 'text', mode: ['properties', 'create', 'edit'],
      },
      {
        id: 'oid', label: gettext('OID'),
        type: 'text', mode: ['properties'],
      },
      {
        id: 'owner', label: gettext('Owner'),
        type: 'select', mode: ['properties', 'create', 'edit'],
        options: obj.ownerList, controlProps: { allowClear: false },
      },
      {
        id: 'schema', label: gettext('Schema'),
        mode: ['create', 'edit'], node: 'schema',
        type: () => {
          return {
            type: 'select',
            options: obj.schemaList,
            controlProps: {
              filter: (options) => {
                let res = [];
                options.forEach((d) => {
                  if (!(d?.label.match(/^pg_/)))
                    res.push(d);
                });
                return res;
              }, allowClear: false,
            }
          };
        }
      },
      {
        id: 'copy_collation', label: gettext('Copy collation'),
        type: 'select', mode: ['create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        options: obj.collationsList,
        disabled: function (state) {
          // Enable copy_collation only if locale & lc_* is not provided
          if (state.locale)
            return true;
          return state.lc_collate || state.lc_type;
        },
        deps: ['locale', 'lc_collate', 'lc_type'],
      },
      {
        id: 'provider', label: gettext('Locale Provider'),
        editable: false, type: 'select',mode: ['create'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        options: [{
          label: gettext('icu'),
          value: 'icu',
        }, {
          label: gettext('libc'),
          value: 'libc',
        }],
        min_version: 110000,
        deps: ['copy_collation'],
        depChange: (state)=>{
          if (state.copy_collation)
            return { provider: '' };
          if (state.provider)
            return { provider: state.provider };
          return { provider: 'libc' };
        },
        disabled: function (state) {
          return state.copy_collation;
        }
      },
      {
        id: 'provider', label: gettext('Locale Provider'),
        type: 'text',mode: ['properties', 'edit'], group: gettext('Definition'),
        readonly: true,
        min_version: 110000,
      },
      {
        id: 'locale', label: gettext('Locale'),
        type: 'text', mode: ['create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        deps: ['lc_collate', 'lc_type', 'copy_collation','provider'],
        depChange: (state)=>{
          if (state.lc_collate || state.lc_type)
            return { locale: '' };
        },
        disabled: function (state) {
          // Enable locale only if lc_* & copy_collation is not provided
          if (state.lc_collate || state.lc_type)
            return true;
          return state.copy_collation;
        }
      },
      {
        id: 'lc_collate', label: gettext('LC_COLLATE'),
        type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        depChange: obj.depChangeFields,
        disabled: obj.disableFields,
        deps: ['locale', 'copy_collation','provider'],
      },
      {
        id: 'lc_type', label: gettext('LC_TYPE'),
        type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        depChange: obj.depChangeFields,
        disabled: obj.disableFields,
        deps: ['locale', 'copy_collation', 'provider'],
      },
      {
        id: 'is_deterministic', label: gettext('Deterministic'),
        type: 'switch', group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        mode: ['properties', 'edit', 'create'],
        min_version: 120000,
        helpMessageMode: ['edit', 'create'],
        deps: ['copy_collation'],
        disabled: function (state) {
          return state.copy_collation;
        },
        depChange: (state, source, topState, actionObj)=>{
          if (state.copy_collation) {
            return { is_deterministic: false };
          }
          else {
            if (actionObj.oldState.is_deterministic) {
              return { is_deterministic: false };
            }
            return { is_deterministic: true };
          }
        },
      },
      {
        id: 'version', label: gettext('Version'), type: 'text', group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        mode: ['properties','create', 'edit'], min_version: 110000,
        deps: ['copy_collation'],
        disabled: function (state) {
          return state.copy_collation;
        },
        depChange: (state)=>{
          if (state.copy_collation)
            return { version: '' };
        },
      },
      {
        id: 'rules', label: gettext('Rules'),
        editable: false, type: 'text', group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        mode: ['properties', 'edit', 'create'],
        deps: ['provider', 'copy_collation'],
        depChange: (state)=>{
          if (state.copy_collation)
            return { rules: '' };
          if (state.provider !== 'icu')
            return { rules: '' };
        },
        disabled: function(state) {
          if (state.copy_collation)
            return true;
          return state.provider !== 'icu';
        },
        min_version: 160000,
      },
      {
        id: 'is_sys_obj', label: gettext('System collation?'),
        cell: 'boolean', type: 'switch', mode: ['properties'],
      },
      {
        id: 'description', label: gettext('Comment'),
        type: 'multiline', mode: ['properties', 'create', 'edit'],
      }
    ];
  }
  depChangeFields(state){
    if (state.provider === 'icu')
      return { lc_type: '' , lc_collate: '' };
  }
  disableFields(state) {
    // Enable lc_* only if copy_collation & locale is not provided
    if (state.provider === 'icu')
      return true;
    if (state.locale || state.copy_collation) {
      if (state.locale)
        return true;
      if (state.copy_collation)
        return true;
    }
    return false;
  }

  validate(state, setError) {
    let errmsg = null,
      locale_flag = false,
      lc_type_flag = false,
      lc_coll_flag = false,
      copy_coll_flag = false;

    if (isEmptyString(state.name)) {
      errmsg = gettext('Name cannot be empty.');
      setError('name', errmsg);
      return true;
    }
    if (isEmptyString(state.locale)) {
      locale_flag = true;
    }
    if (isEmptyString(state.copy_collation)) {
      copy_coll_flag = true;
    }
    if (isEmptyString(state.lc_collate)) {
      lc_coll_flag = true;
    }
    if (isEmptyString(state.lc_type)) {
      lc_type_flag = true;
    }
    if (!lc_coll_flag && lc_type_flag){
      errmsg = gettext('Definition incomplete. Please provide LC_TYPE.');
      setError('lc_type', errmsg);
      return true;
    }
    if (!lc_type_flag && lc_coll_flag){
      errmsg = gettext('Definition incomplete. Please provide LC_COLLATE.');
      setError('lc_collate', errmsg);
      return true;
    }
    if (locale_flag && (lc_coll_flag || lc_type_flag) && copy_coll_flag) {
      errmsg = gettext('Definition incomplete. Please provide Locale OR Copy Collation OR LC_TYPE/LC_COLLATE.');
      setError('copy_collation', errmsg);
      return true;
    }
    return null;
  }

}
