/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
                  if (!(d && d.label.match(/^pg_/)))
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
        id: 'locale', label: gettext('Locale'),
        type: 'text', mode: ['create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        deps: ['lc_collate', 'lc_type', 'copy_collation'],
        disabled: function (state) {
          // Enable localy only if lc_* & copy_collation is not provided
          if (state.lc_collate || state.lc_type)
            return true;
          return state.copy_collation;
        }
      },
      {
        id: 'lc_collate', label: gettext('LC_COLLATE'),
        type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        disabled: obj.disableFields,
        deps: ['locale', 'copy_collation'],
      },
      {
        id: 'lc_type', label: gettext('LC_TYPE'),
        type: 'text', mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        readonly: function (state) { return !obj.isNew(state); },
        disabled: obj.disableFields,
        deps: ['locale', 'copy_collation'],
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

  disableFields(state) {
    // Enable lc_* only if copy_collation & locale is not provided
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
    if (locale_flag && (lc_coll_flag || lc_type_flag) && copy_coll_flag) {
      errmsg = gettext('Definition incomplete. Please provide Locale OR Copy Collation OR LC_TYPE/LC_COLLATE.');
      setError('copy_collation', errmsg);
      return true;
    }
    return null;
  }

}

