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

export default class ExtensionsSchema extends BaseUISchema {
  constructor(fieldOptions = {}) {
    super({
      name: null,
      oid: undefined,
      version: '',
      schema: '',
      relocatable: false,
      is_sys_obj: false,
      comment: null,
    });
    fieldOptions = {
      extensionsList: [],
      role:[],
      schemaList: [],
      ...fieldOptions,
    };
    this.extensionsList = fieldOptions.extensionsList;
    this.schemaList = fieldOptions.schemaList;
    this.role = fieldOptions.role;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'),
        mode: ['properties', 'create', 'edit'],
        editable: false,
        noEmpty: true,
        readonly: function (state) {
          return !obj.isNew(state);
        },
        type: (state) => {
          return {
            type: 'select',
            options: obj.extensionsList,
            optionsLoaded: (options) => { obj.extensionData = options; },
            controlProps: {
              allowClear: false,
              filter: (options) => {
                let res = [];
                if (state && obj.isNew(state)) {
                  options.forEach((option) => {
                    if (option.data['installed_version'] === null) {
                      res.push({ label: option.label, value: option.value });
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
        depChange: (state) => {
          let extensionData = obj.extensionData;
          if (state && obj.isNew(state)) {
            extensionData.forEach((option) => {
              if (state.name == option.data['name']) {
                let dt = option.data;
                state.version = '';
                state.relocatable = (
                  (!_.isNull(dt.relocatable[0]) &&
                    !_.isUndefined(dt.relocatable[0])) ? dt.relocatable[0] : ''
                );
              }
            });
          }
        }
      },
      {
        id: 'oid', label: gettext('OID'), type: 'text',
        mode: ['properties'],
      },
      {
        id: 'owner', label: gettext('Owner'),
        options: this.role,
        type: 'select',
        mode: ['properties'], controlProps: { allowClear: false},
      },
      {
        id: 'schema', label: gettext('Schema'), type: 'select',
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        first_empty: true, deps: ['name'],
        controlProps: { allowClear: true }, editable: false,
        options: this.schemaList,
        disabled: function (state) {
          return !obj.isNew(state) && !state.relocatable;
        },
      },
      {
        id: 'relocatable', label: gettext('Relocatable?'), cell: 'switch',
        group: gettext('Definition'), type: 'switch', mode: ['properties'],
        deps: ['name'],
      },
      {
        id: 'version', label: gettext('Version'),
        mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
        first_empty: true,
        deps: ['name'],
        type: (state) => {
          return {
            type: 'select',
            options: this.extensionsList,
            controlProps: {
              allowClear: false,
              filter: (options) => {
                let res = [];
                if (state) {
                  if (state.name) {
                    options.forEach((option) => {
                      if (state.name == option.data['name']) {
                        let dt = option.data;
                        if (dt.version && _.isArray(dt.version)) {
                          _.each(dt.version, function (v) {
                            res.push({ label: v, value: v });
                          });
                        }
                      }
                    });
                  }
                } else {
                  options.forEach((option) => {
                    let dt = option.data;
                    if (dt.version && _.isArray(dt.version)) {
                      _.each(dt.version, function (v) {
                        res.push({ label: v, value: v });
                      });
                    }
                  });
                }
                return res;
              }
            }
          };
        },
      }, {
        id: 'is_sys_obj', label: gettext('System extension?'),
        cell: 'boolean', type: 'switch', mode: ['properties'],
      }, {
        id: 'comment', label: gettext('Comment'), cell: 'string',
        type: 'multiline', readonly: true,
      },
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    if (isEmptyString(state.name)) {
      errmsg = gettext('Name cannot be empty.');
      setError('name', errmsg);
      return true;
    } else {
      setError('name', null);
    }
    return false;
  }

}
