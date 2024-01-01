/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import { isEmptyString } from 'sources/validators';


export default class MViewSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, getVacuumSettingsSchema, fieldOptions={}, initValues={}) {
    super({
      spcname: undefined,
      toast_autovacuum_enabled: 'x',
      autovacuum_enabled: 'x',
      warn_text: undefined,
      amname: undefined,
      ...initValues
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.getVacuumSettingsSchema = getVacuumSettingsSchema;
    this.fieldOptions = {
      role: [],
      schema: [],
      spcname: [],
      nodeInfo: null,
      amname: [],
      ...fieldOptions,
    };

    this.nodeInfo = this.fieldOptions.nodeInfo;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name', label: gettext('Name'), cell: 'text',
        type: 'text', disabled: obj.inCatalog(), noEmpty: true,
      },{
        id: 'oid', label: gettext('OID'), cell: 'text',
        type: 'text', mode: ['properties'],
      },{
        id: 'owner', label: gettext('Owner'),
        type: 'select', cell: 'text',
        options: obj.fieldOptions.role, controlProps: { allowClear: false },
        disabled: obj.inCatalog(),
      },{
        id: 'schema', label: gettext('Schema'), cell: 'text',
        type: 'select', options: obj.fieldOptions.schema, mode: ['create', 'edit'],
        cache_node: 'database', disabled: obj.inCatalog(),
        controlProps: {
          allowClear: false,
          first_empty: false
        },
      },{
        id: 'system_view', label: gettext('System materialized view?'), cell: 'text',
        type: 'switch', mode: ['properties'],
      },
      {
        id: 'acl', label: gettext('Privileges'),
        mode: ['properties'], type: 'text', group: gettext('Security'),
      },{
        id: 'comment', label: gettext('Comment'), cell: 'text',
        type: 'multiline',
      },{
        id: 'with_data', label: gettext('With data?'),
        group: gettext('Definition'), mode: ['edit', 'create'],
        type: 'switch',
      },{
        id: 'spcname', label: gettext('Tablespace'), cell: 'text',
        type: 'select', group: gettext('Definition'),
        options: obj.fieldOptions.spcname,
        controlProps: {
          allowClear: false,
          first_empty: false,
        },
      }, {
        id: 'amname', label: gettext('Access Method'), group: gettext('Definition'),
        type: (state)=>{
          return {
            type: 'select', options: obj.fieldOptions.table_amname_list,
            controlProps: {
              allowClear: obj.isNew(state) ? true : false,
            }
          };
        }, mode: ['create', 'properties', 'edit'], min_version: 120000,
        disabled: (state) => {
          if (obj.getServerVersion() < 150000 && !obj.isNew(state)) {
            return true;
          }
        },
      },{
        id: 'fillfactor', label: gettext('Fill factor'),
        group: gettext('Definition'), mode: ['edit', 'create'],
        noEmpty: false, type: 'int', controlProps: {min: 10, max: 100}
      },{
        id: 'vacuum_settings_str', label: gettext('Storage settings'),
        type: 'multiline', group: gettext('Definition'), mode: ['properties'],
      },{
        id: 'definition', label: gettext('Definition'), cell: 'text',
        type: 'sql', mode: ['create', 'edit'], group: gettext('Code'),
        isFullTab: true, controlProps: { readOnly: this.nodeInfo && 'catalog' in this.nodeInfo ? true: false },
      },
      {
        type: 'nested-tab', group: gettext('Parameter'), mode: ['create', 'edit'],
        schema: this.getVacuumSettingsSchema(),
      },
      {
        id: 'datacl', label: gettext('Privileges'), type: 'collection',
        schema: this.getPrivilegeRoleSchema(['a', 'r', 'w', 'd', 'D', 'x', 't']),
        uniqueCol : ['grantee'],
        editable: false,
        group: gettext('Security'), mode: ['edit', 'create'],
        canAdd: true, canDelete: true,
      },
      {
      // Add Security Labels Control
        id: 'seclabels', label: gettext('Security labels'),
        schema: new SecLabelSchema(),
        editable: false, type: 'collection',
        canEdit: false, group: gettext('Security'), canDelete: true,
        mode: ['edit', 'create'], canAdd: true,
        control: 'unique-col-collection',
        uniqueCol : ['provider'],
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    let obj = this;

    if (isEmptyString(state.service)) {

      /* mview definition validation*/
      if (isEmptyString(state.definition)) {
        errmsg = gettext('Please enter view code.');
        setError('definition', errmsg);
        return true;
      } else {
        setError('definition', null);
      }

      if (state.definition) {
        obj.warningText = null;
        if (obj.origData.oid !== undefined && state.definition !== obj.origData.definition) {
          obj.warningText = gettext(
            'Updating the definition will drop and re-create the materialized view. It may result in loss of information about its dependent objects.'
          ) + '<br><br><b>' + gettext('Do you want to continue?') + '</b>';
        }
      }
      return false;
    } else {
      _.each(['definition'], (item) => {
        setError(item, null);
      });
    }
  }
}
