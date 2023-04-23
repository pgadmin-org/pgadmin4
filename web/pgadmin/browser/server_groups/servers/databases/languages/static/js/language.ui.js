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
import SecLabelSchema from '../../../../static/js/sec_label.ui';
import _ from 'lodash';

export default class LanguageSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, fieldOptions={}, node_info={}, initValues={}) {
    super({
      name: undefined,
      lanowner: (node_info) ? node_info['node_info'].user.name: undefined,
      comment: undefined,
      lanacl: [],
      seclabels:[],
      trusted: true,
      lanproc: undefined,
      laninl: undefined,
      lanval: undefined,
      ...initValues,
    });

    this.fieldOptions=fieldOptions;
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.node_info = node_info;
    this.templateList = [];
    this.isTemplate = false;
  }
  get idAttribute() {
    return 'oid';
  }
  // This function check whether the server is less than 13 or not.
  isLessThan13(){
    return !_.isUndefined(this.node_info)
          && !_.isUndefined(this.node_info['node_info'])
          && !_.isUndefined(this.node_info['node_info'].version)
          && this.node_info['node_info'].version < 130000;
  }
  isDisabled(state){
    if (this.templateList.some(template => template.tmplname === state.name)){
      this.isTemplate = false;
      return true;
    }else{
      this.isTemplate =true;
      return false;
    }
  }
  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), noEmpty: true,
      mode: ['properties', 'create', 'edit'],
      optionsLoaded: (options) => { obj.templateList = options; },
      type: (state) => {
        if (obj.isLessThan13()){
          return {
            type: 'select',
            options: this.fieldOptions.templates_data,
            controlProps: {
              allowClear: false,
              multiple: false,
              creatable: true,
              filter: (options) => {
                let res = [];
                if (state && obj.isNew()) {
                  options.forEach((option) => {
                    res.push({label: option.tmplname, value: option.tmplname});
                  });
                }else{
                  res.push({label: state.name, value: state.name});
                }
                return res;
              }
            }
          };
        }else{
          return {type: 'text'};
        }
      },
    },
    {
      id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
      type: 'text',
    },{
      id: 'lanowner', label: gettext('Owner'), type: 'select',
      options: this.fieldOptions.role, controlProps: { allowClear: false },
      mode: ['edit', 'properties', 'create'],
    },{
      id: 'acl', label: gettext('Privileges'), type: 'text',
      group: gettext('Security'), mode: ['properties'],
    },{
      id: 'is_sys_obj', label: gettext('System language?'),
      cell:'boolean', type: 'switch', mode: ['properties'],
    },{
      id: 'description', label: gettext('Comment'), cell: 'string',
      type: 'multiline',
    },{
      id: 'trusted', label: gettext('Trusted?'), type: 'switch',
      group: gettext('Definition'), mode: ['edit', 'properties', 'create'],
      disabled:obj.isDisabled, deps:['name'],
      readonly: (state)  => {return !obj.isNew(state);},
    },
    {
      id: 'lanproc', label: gettext('Handler function'),
      group: gettext('Definition'), mode: ['properties'], type: 'text',
    },
    {
      id: 'lanproc', label: gettext('Handler function'), deps:['name'],
      group: gettext('Definition'), mode: ['edit', 'create'],
      /* This function is used to populate the handler function
           * for the selected language node. It will check if the property
           * type is 'handler' then push the data into the result array.
           */
      type: (state) => {
        return {
          type: 'select',
          options: this.fieldOptions.lan_functions,
          controlProps: {
            allowClear: false,
            filter: (options) => {
              let res = [];
              if (state) {
                options.forEach((option) => {
                  if(option.prop_type == 'handler')
                    res.push({label: option.label, value: option.label});
                });
              }
              return res;
            }
          }
        };
      },
      disabled: obj.isDisabled,
      readonly: (state)  => {return !obj.isNew(state);},
    },{
      id: 'laninl', label: gettext('Inline function'),
      group: gettext('Definition'), mode: ['edit', 'create'],
      deps:['name'], first_empty: false,
      type: (state) => {
        return {
          type: 'select',
          options: this.fieldOptions.lan_functions,
          controlProps: {
            allowClear: false,
            filter: (options) => {
              let res = [];
              if (state) {
                options.forEach((option) => {
                  if(option.prop_type == 'inline')
                    res.push({label: option.label, value: option.label});
                });
              }
              return res;
            }
          }
        };
      },
      disabled: obj.isDisabled,
      readonly: (state)  => {return !obj.isNew(state);},
    },
    {
      id: 'laninl', label: gettext('Inline function'),
      group: gettext('Definition'), mode: ['properties'], type: 'text',
    },{
      id: 'lanval', label: gettext('Validator function'), deps:['name'],
      group: gettext('Definition'), mode: ['edit', 'create'],
      type: (state) => {
        return {
          type: 'select',
          options: this.fieldOptions.lan_functions,
          optionsLoaded: (options) => { this.fieldOptions.lan_functions = options; },

          controlProps: {
            allowClear: false,
            filter: (options) => {
              let res = [];
              if (state) {
                options.forEach((option) => {
                  if(option.prop_type == 'validator')
                    res.push({label: option.label, value: option.label});
                });
              }
              return res;
            }
          }
        };
      },
      /* This function is used to populate the validator function
           * for the selected language node. It will check if the property
           * type is 'validator' then push the data into the result array.
           */
      disabled: obj.isDisabled,
      readonly: (state)  => {return !obj.isNew(state);},
    },
    {
      id: 'lanval', label: gettext('Validator function'),
      group: gettext('Definition'), mode: ['properties'], type: 'text',
    },
    {
      id: 'lanacl', label: gettext('Privileges'), type: 'collection',
      group: gettext('Security'), mode: ['edit', 'create'],
      schema: this.getPrivilegeRoleSchema(['U']),
      canAdd: true, canDelete: true, uniqueCol : ['grantee'],
    },
    {
      id: 'seclabels', label: gettext('Security labels'), mode: ['edit', 'create'],
      schema: new SecLabelSchema(), editable: false,
      type: 'collection', group: gettext('Security'), min_version: 90200,
      canAdd: true, canEdit: false, canDelete: true,
    },
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    if (this.isTemplate && isEmptyString(state.lanproc)) {
      errmsg = gettext('Handler function cannot be empty.');
      setError('lanproc', errmsg);
      return true;
    } else {
      setError('lanproc', null);
    }
    return false;
  }
}

