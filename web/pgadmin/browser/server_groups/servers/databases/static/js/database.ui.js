/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../static/js/sec_label.ui';

export class DefaultPrivSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema) {
    super();
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
  }

  get baseFields() {
    return [
      {
        id: 'deftblacl', type: 'collection', group: gettext('Tables'),
        schema: this.getPrivilegeRoleSchema(['a', 'r', 'w', 'd', 'D', 'x', 't']),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
        uniqueCol : ['grantee', 'grantor'],
      },{
        id: 'defseqacl', type: 'collection', group: gettext('Sequences'),
        schema: this.getPrivilegeRoleSchema(['r', 'w', 'U']),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
        uniqueCol : ['grantee', 'grantor'],
      },{
        id: 'deffuncacl', type: 'collection', group: gettext('Functions'),
        schema: this.getPrivilegeRoleSchema(['X']),
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
      },{
        id: 'deftypeacl', type: 'collection', group: gettext('Types'),
        schema: this.getPrivilegeRoleSchema(['U']), min_version: 90200,
        mode: ['edit', 'create'],
        canAdd: true, canDelete: true, uniqueCol : ['grantee', 'grantor'],
      },
    ];
  }
}

export default class DatabaseSchema extends BaseUISchema {
  constructor(getVariableSchema, getPrivilegeRoleSchema, fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      owner: undefined,
      is_sys_obj: false,
      comment: undefined,
      encoding: 'UTF8',
      template: undefined,
      tablespace: undefined,
      collation: undefined,
      char_type: undefined,
      datconnlimit: -1,
      datallowconn: undefined,
      variables: [],
      privileges: [],
      securities: [],
      datacl: [],
      deftblacl: [],
      deffuncacl: [],
      defseqacl: [],
      is_template: false,
      deftypeacl: [],
      schema_res: [],
      ...initValues,
    });
    this.getVariableSchema = getVariableSchema;
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.fieldOptions = {
      role: [],
      encoding: [],
      template: [],
      spcname: [],
      datcollate: [],
      datctype: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'did';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Database'), cell: 'text',
        editable: false, type: 'text', noEmpty: true, isCollectionProperty: true,
      },{
        id: 'did', label: gettext('OID'), cell: 'text', mode: ['properties'],
        editable: false, type: 'text',
      },{
        id: 'datowner', label: gettext('Owner'),
        editable: false, type: 'select', options: this.fieldOptions.role,
        controlProps: { allowClear: false }, isCollectionProperty: true,
      },{
        id: 'is_sys_obj', label: gettext('System database?'),
        cell: 'switch', type: 'switch', mode: ['properties'],
      },{
        id: 'comments', label: gettext('Comment'),
        editable: false, type: 'multiline', isCollectionProperty: true,
      },{
        id: 'encoding', label: gettext('Encoding'),
        editable: false, type: 'select', group: gettext('Definition'),
        readonly: function(state) {return !obj.isNew(state); },
        options: this.fieldOptions.encoding,
      },{
        id: 'template', label: gettext('Template'),
        editable: false, type: 'select', group: gettext('Definition'),
        readonly: function(state) {return !obj.isNew(state); },
        options: this.fieldOptions.template,
        controlProps: { allowClear: false }, mode: ['create'],
      },{
        id: 'spcname', label: gettext('Tablespace'),
        editable: false, type: 'select', group: gettext('Definition'),
        options: this.fieldOptions.spcname,
        controlProps: { allowClear: false },
      },{
        id: 'datcollate', label: gettext('Collation'),
        editable: false, type: 'select', group: gettext('Definition'),
        readonly: function(state) {return !obj.isNew(state); },
        options: this.fieldOptions.datcollate,
      },{
        id: 'datctype', label: gettext('Character type'),
        editable: false, type: 'select', group: gettext('Definition'),
        readonly: function(state) {return !obj.isNew(state); },
        options: this.fieldOptions.datctype,
      },{
        id: 'datconnlimit', label: gettext('Connection limit'),
        editable: false, type: 'int', group: gettext('Definition'),
        min: -1,
      },{
        id: 'is_template', label: gettext('Template?'),
        type: 'switch', group: gettext('Definition'),
        mode: ['properties', 'edit', 'create'], readonly: function(state) {return (state.is_sys_obj); },
        helpMessage: gettext('Note: When the preferences setting \'show template databases\' is set to false, then template databases won\'t be displayed in the browser tree.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'datallowconn', label: gettext('Allow connections?'),
        editable: false, type: 'switch', group: gettext('Definition'),
        mode: ['properties'],
      },{
        id: 'acl', label: gettext('Privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },{
        id: 'tblacl', label: gettext('Default TABLE privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },{
        id: 'seqacl', label: gettext('Default SEQUENCE privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },{
        id: 'funcacl', label: gettext('Default FUNCTION privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'],
      },{
        id: 'typeacl', label: gettext('Default TYPE privileges'), type: 'text',
        group: gettext('Security'), mode: ['properties'], min_version: 90200,
      },
      {
        id: 'datacl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['C', 'T', 'c']),
        uniqueCol : ['grantee', 'grantor'],
        editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      },
      {
        id: 'variables', label: '', type: 'collection',
        schema: this.getVariableSchema(),
        editable: false,
        group: gettext('Parameters'), mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true, hasRole: true,
        node: 'role',
      },{
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        schema: new SecLabelSchema(),
        editable: false, group: gettext('Security'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90200,
      },{
        type: 'nested-tab', group: gettext('Default Privileges'),
        mode: ['edit'],
        schema: new DefaultPrivSchema(this.getPrivilegeRoleSchema),
      },
      {
        id: 'schema_res', label: gettext('Schema restriction'),
        type: 'select', group: gettext('Advanced'),
        mode: ['properties', 'edit', 'create'],
        helpMessage: gettext('Note: Changes to the schema restriction will require the Schemas node in the browser to be refreshed before they will be shown.'),
        helpMessageMode: ['edit', 'create'],
        controlProps: {
          multiple: true, allowClear: false, creatable: true, noDropdown: true, placeholder: 'Specify the schemas to be restrict...'
        }, depChange: (state)=>{
          if(!_.isUndefined(state.oid)) {
            obj.informText = undefined;
          }

          if(!_.isEqual(obj.origData.schema_res, state.schema_res)) {
            obj.informText = gettext(
              'Please refresh the Schemas node to make changes to the schema restriction take effect.'
            );
          } else {
            obj.informText = undefined;
          }
        },
      },
    ];
  }
}
