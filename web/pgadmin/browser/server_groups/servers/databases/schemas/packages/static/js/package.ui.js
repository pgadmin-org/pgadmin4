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
import { isEmptyString } from 'sources/validators';

export default class PackageSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, fieldOptions = {}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      owner: undefined,
      is_sys_object: undefined,
      description: undefined,
      pkgheadsrc: undefined,
      pkgbodysrc: undefined,
      acl: undefined,
      pkgacl: [],
      warn_text: undefined,
      ...initValues
    });
    this.fieldOptions = {
      schemas: [],
      ...fieldOptions
    };
    this.warningText = null;
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let packageSchemaObj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'string',
        type: 'text', mode: ['properties', 'create', 'edit'], noEmpty: true,
        readonly: function (state) {
          return !packageSchemaObj.isNew(state);
        },
      },{
        id: 'oid', label: gettext('OID'), cell: 'string',
        type: 'text', mode: ['properties'],
      },{
        id: 'owner', label: gettext('Owner'), cell: 'string',
        type: 'text', mode: ['properties', 'create', 'edit'],
        readonly: true, editable: false,
        visible: function (state) {
          return !packageSchemaObj.isNew(state);
        },
      },{
        id: 'schema', label: gettext('Schema'), node: 'schema',
        readonly: function (state) {
          return !packageSchemaObj.isNew(state);
        }, noEmpty: true,
        type: (state) => {
          return {
            type: 'select',
            options: packageSchemaObj.fieldOptions.schemas,
            optionsLoaded: (options) => { packageSchemaObj.fieldOptions.schemas = options; },
            controlProps: {
              allowClear: true,
              filter: (options) => {
                let res = [];
                if (state && packageSchemaObj.isNew(state)) {
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
      },{
        id: 'is_sys_object', label: gettext('System package?'),
        cell:'boolean', type: 'switch',mode: ['properties'],
      },{
        id: 'description', label: gettext('Comment'), type: 'multiline',
        mode: ['properties', 'create', 'edit'],
      },{
        id: 'pkgheadsrc',
        type: 'sql', isFullTab: true, cell: 'text',
        mode: ['properties', 'create', 'edit'],
        group: gettext('Header'),
        depChange: (state, source, topState, actionObj) => {

          if(packageSchemaObj._origData.oid && state.pkgheadsrc != actionObj.oldState.pkgheadsrc) {
            packageSchemaObj.warningText = gettext(
              'Updating the package header definition may remove its existing body.'
            ) + '<br><br><b>' + gettext('Do you want to continue?') +
              '</b>';
          }
          else {
            packageSchemaObj.warningText = null;
          }
        }
      },{
        id: 'pkgbodysrc',
        type: 'sql', isFullTab: true, cell: 'text',
        mode: ['properties', 'create', 'edit'], group: gettext('Body'),
        depChange: (state, source, topState, actionObj) => {

          if(packageSchemaObj._origData.oid && state.pkgbodysrc != actionObj.oldState.pkgbodysrc) {
            packageSchemaObj.warningText = gettext(
              'Updating the package header definition may remove its existing body.'
            ) + '<br><br><b>' + gettext('Do you want to continue?') +
              '</b>';
          }
          else {
            packageSchemaObj.warningText = null;
          }
        }
      },{
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },{
        id: 'pkgacl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['X']),
        uniqueCol : ['grantee', 'grantor'], editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    /* code validation */
    if (isEmptyString(state.pkgheadsrc)) {
      errmsg = gettext('Header cannot be empty.');
      setError('pkgheadsrc', errmsg);
      return true;
    } else {
      setError('pkgheadsrc', null);
    }
    return null;
  }
}
