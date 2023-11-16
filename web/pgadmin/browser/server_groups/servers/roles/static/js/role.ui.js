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
import SecLabelSchema from '../../../static/js/sec_label.ui';


export default class RoleSchema extends BaseUISchema {
  constructor(getVariableSchema, getMembershipSchema,fieldOptions={}) {
    super({
      oid: null,
      rolname: null,
      rolcanlogin: false,
      rolpassword: null,
      rolconnlimit: -1,
      rolsuper: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolinherit: true,
      rolcatupdate: false,
      rolreplication: false,
      rolmembership: [],
      rolmembers: [],
      rolvaliduntil: null,
      seclabels: [],
      variables: [],
    });
    this.getVariableSchema = getVariableSchema;
    this.getMembershipSchema = getMembershipSchema;
    this.fieldOptions = {
      role: [],
      ...fieldOptions,
    };

    this.isReadOnly = null;
    this.nodeInfo = this.fieldOptions.nodeInfo;
    this.user = this.nodeInfo.server.user;
  }

  get idAttribute() {
    return 'oid';
  }

  readOnly(state) {
    let user = this.nodeInfo.server.user;
    this.oid = state.oid;
    this.isReadOnly = !(user.is_superuser || user.can_create_role);
    return (!(user.is_superuser || user.can_create_role) && user.id != state.oid);
  }

  memberDataFormatter(rawData) {
    let members = '';
    if(_.isObject(rawData)) {
      let withAdmin = '';
      rawData.forEach(member => {
        if(member.admin) { withAdmin = ' [WITH ADMIN]';}

        if (members.length > 0) { members += ', '; }
        members = members + (member.role + withAdmin);
      });
    }
    return members;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'rolname', label: gettext('Name'), type: 'text', noEmpty: true,
        disabled: obj.readOnly,
      },{
        id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
        editable: false, type: 'text', visible: true,
      },
      {
        id: 'is_sys_obj', label: gettext('System role?'),
        cell:'boolean', type: 'switch', mode: ['properties'],
      },
      {
        id: 'description', label: gettext('Comments'), type: 'multiline',
        mode: ['properties', 'edit', 'create'],
        disabled: obj.readOnly,
      },
      {
        id: 'rolpassword', label: gettext('Password'), type: 'password',
        group: gettext('Definition'), mode: ['edit', 'create'],
        control: 'input', deps: ['rolcanlogin'], retype: true,
        cell: 'text', disabled: obj.readOnly,
      },
      {
        id: 'rolvaliduntil', type: 'datetimepicker',
        group: gettext('Definition'), label: gettext('Account expires'),
        mode: ['properties', 'edit', 'create'],
        deps: ['rolcanlogin'],
        helpMessage: gettext('Please note that if you leave this field blank, then password will never expire.'),
        helpMessageMode: ['edit', 'create'],
        controlProps: {
          ampm: false,
          placeholder: gettext('No Expiry'), autoOk: true,
        },
        disabled: obj.readOnly,
      },
      {
        id: 'rolconnlimit',  type: 'int', group: gettext('Definition'),
        label: gettext('Connection limit'), cell: 'integer', min : -1,
        mode: ['properties', 'edit', 'create'],
        disabled: obj.readOnly,
      },
      {
        id: 'rolcanlogin', label: gettext('Can login?'),
        type: 'switch',
        group: gettext('Privileges'),
        disabled: obj.readOnly,
      },
      {
        id: 'rolsuper', label: gettext('Superuser?'),
        type: 'switch',
        group: gettext('Privileges'),
        depChange: (state) => {
          state.rolcatupdate = state.rolcreaterole = state.rolcreatedb =  state.rolsuper;
        },
        disabled: obj.readOnly,
      },
      {
        id: 'rolcreaterole', label: gettext('Create roles?'),
        group: gettext('Privileges'),
        type: 'switch',
        disabled: obj.readOnly,
      },
      {
        id: 'rolcreatedb', label: gettext('Create databases?'),
        group: gettext('Privileges'),
        type: 'switch',
        disabled: obj.readOnly,
      },
      {
        id: 'rolcatupdate', label: gettext('Update catalog?'),
        max_version: 90400,
        group: gettext('Privileges'),
        type: 'switch',
        disabled: (state) => {
          return !state.rolsuper;
        },
        readonly: () => {
          return !(obj.user.is_superuser || obj.user.can_create_role);
        }
      },
      {
        id: 'rolinherit', group: gettext('Privileges'),
        label: gettext('Inherit rights from the parent roles?'),
        type: 'switch',
        disabled: obj.readOnly,
      },
      {
        id: 'rolreplication', group: gettext('Privileges'),
        label: gettext('Can initiate streaming replication and backups?'),
        type: 'switch',
        min_version: 90100,
        disabled: obj.readOnly,
      },
      {
        id: 'rolmembership', label: gettext('Member of'), group: gettext('Membership'),
        disabled: obj.readOnly,
        mode: ['edit', 'create'], cell: 'text',
        type: 'collection',
        schema: new obj.getMembershipSchema(),
        helpMessage: obj.isReadOnly ? gettext('Select the checkbox for roles to include WITH ADMIN OPTION.') : gettext('Roles shown with a check mark have the WITH ADMIN OPTION set.'),
      },
      {
        id: 'rolmembership', label: gettext('Member of'), group: gettext('Membership'),
        disabled: obj.readOnly,
        mode: ['properties'], cell: 'text',
        type: 'text',
        controlProps: {
          formatter: {
            fromRaw: obj.memberDataFormatter,
          },
        }
      },
      {
        id: 'rolmembers', label: gettext('Members'), group: gettext('Membership'),
        mode: ['edit', 'create'], cell: 'text',
        type: 'collection',
        schema: new obj.getMembershipSchema(),
        disabled: obj.readOnly,
        helpMessage: obj.isReadOnly ? gettext('Select the checkbox for roles to include WITH ADMIN OPTION.') : gettext('Roles shown with a check mark have the WITH ADMIN OPTION set.') ,
      },
      {
        id: 'rolmembers', label: gettext('Members'), group: gettext('Membership'),
        disabled: obj.readOnly,
        mode: ['properties'], cell: 'text',
        type: 'text',
        controlProps: {
          formatter: {
            fromRaw: obj.memberDataFormatter,
          },
        }
      },
      {
        id: 'variables', label: '', type: 'collection',
        group: gettext('Parameters'),
        schema: this.getVariableSchema(),
        mode: [ 'edit', 'create'], canAdd: true, canDelete: true,
        disabled: obj.readOnly,
      },
      {
        id: 'seclabels', label: gettext('Security labels'), type: 'collection',
        schema: new SecLabelSchema(),
        editable: false, group: gettext('Security'),
        mode: ['edit', 'create'],
        canAdd: true, canEdit: false, canDelete: true,
        uniqueCol : ['provider'],
        min_version: 90200,
        disabled: obj.readOnly,
      }
    ];
  }
}
