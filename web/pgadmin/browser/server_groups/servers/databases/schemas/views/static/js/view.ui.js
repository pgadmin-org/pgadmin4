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


export default class ViewSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, nodeInfo, fieldOptions={}, initValues={}) {
    super({
      owner: undefined,
      schema: undefined,
      ...initValues
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.nodeInfo = nodeInfo;
    this.warningText = null;
    this.fieldOptions = {
      role: [],
      schema: [],
      ...fieldOptions,
    };

  }

  get idAttribute() {
    return 'oid';
  }

  notInSchema() {
    return this.nodeInfo && 'catalog' in this.nodeInfo;
  }


  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'text',
      type: 'text', disabled: obj.notInSchema, noEmpty: true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'text',
      type: 'text', mode: ['properties'],
    },{
      id: 'owner', label: gettext('Owner'), cell: 'text',
      node: 'role', disabled: obj.notInSchema,
      type: 'select', controlProps: { allowClear: false },
      options: obj.fieldOptions.role
    },{
      id: 'schema', label: gettext('Schema'), cell: 'text',
      type: 'select', disabled: obj.notInSchema, mode: ['create', 'edit'],
      controlProps: {
        allowClear: false,
        first_empty: false,
      },
      options: obj.fieldOptions.schema
    },{
      id: 'system_view', label: gettext('System view?'), cell: 'text',
      type: 'switch', mode: ['properties'],
    },{
      id: 'acl', label: gettext('Privileges'),
      mode: ['properties'], type: 'text', group: gettext('Security'),
    },{
      id: 'comment', label: gettext('Comment'), cell: 'text',
      type: 'multiline', disabled: obj.notInSchema,
    },{
      id: 'security_barrier', label: gettext('Security barrier?'),
      type: 'switch', min_version: '90200', group: gettext('Definition'),
      disabled: obj.notInSchema,
    },{
      id: 'security_invoker', label: gettext('Security invoker?'),
      type: 'switch', min_version: '150000', group: gettext('Definition'),
      disabled: obj.notInSchema,
    },{
      id: 'check_option', label: gettext('Check options'),
      type: 'select', group: gettext('Definition'),
      min_version: '90400', mode:['properties', 'create', 'edit'],
      controlProps: {
        // Set select2 option width to 100%
        allowClear: false,
      }, disabled: obj.notInSchema,
      options:[{
        label: gettext('No'), value: 'no',
      },{
        label: gettext('Local'), value: 'local',
      },{
        label: gettext('Cascaded'), value: 'cascaded',
      }],
    },{
      id: 'definition', label: gettext('Code'), cell: 'text',
      type: 'sql', mode: ['create', 'edit'], group: gettext('Code'),
      isFullTab: true,
      controlProps: { readOnly: obj.nodeInfo && 'catalog' in obj.nodeInfo ? true: false },
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
      uniqueCol : ['provider'],
    }
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    let obj = this;
    if (isEmptyString(state.service)) {

      /* view definition validation*/
      if (isEmptyString(state.definition)) {
        errmsg = gettext('Please enter view code.');
        setError('definition', errmsg);
        return true;
      } else {
        setError('definition', null);
      }

      if (state.definition) {
        if (!(obj.nodeInfo.server.server_type == 'pg' &&
          // No need to check this when creating a view
          obj.origData.oid !== undefined
        ) || (
          state.definition === obj.origData.definition
        )) {
          obj.warningText = null;
          return false;
        }

        let old_def = obj.origData.definition &&
          obj.origData.definition.replace(
            /\s/gi, ''
          ).split('FROM'),
          new_def = [];

        if (state.definition !== undefined) {
          new_def = state.definition.replace(
            /\s/gi, ''
          ).split('FROM');
        }

        if ((old_def.length != new_def.length) || (
          old_def.length > 1 && (
            old_def[0] != new_def[0]
          )
        )) {
          obj.warningText = gettext(
            'Changing the columns in a view requires dropping and re-creating the view. This may fail if other objects are dependent upon this view, or may cause procedural functions to fail if they are not modified to take account of the changes.'
          ) + '<br><br><b>' + gettext('Do you wish to continue?') +
          '</b>';
        } else {
          obj.warningText = null;
        }
        return false;
      }

    } else {
      _.each(['definition'], (item) => {
        setError(item, null);
      });
    }
  }
}
