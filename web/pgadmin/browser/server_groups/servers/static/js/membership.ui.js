/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getNodeListByName } from '../../../../static/js/node_ajax';


export function getMembershipSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new MembershipSchema(
    ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {}, ()=>true),
    treeNodeInfo.server
  );
}


export default class MembershipSchema extends BaseUISchema {
  constructor(roleMembersOptions, node_info={}) {
    super({
      role: undefined,
      admin: (node_info) && node_info.version >= 160000 ? false : undefined,
      inherit: undefined,
      set: (node_info) && node_info.version >= 160000 ? true : undefined,
    });
    this.roleMembersOptions = roleMembersOptions;
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'role', label: gettext('User/Role'), type:'text',
      editable: true,
      cell: ()=>({
        cell: 'select', options: this.roleMembersOptions,
        controlProps: {
          allowClear: false,
        }
      }),
      disabled: function (state) {
        return !obj.isNew(state);
      },
      noEmpty: true,
      width: 150
    },
    {
      id: 'admin', label: gettext('WITH ADMIN'),
      cell: 'checkbox', type: 'checkbox',
      minWidth: 100,
      deps: ['role'],
      depChange: (state) => {
        if(_.isUndefined(state.admin)) {
          state.admin = false;
        }
      }
    },{
      id: 'inherit', label: gettext('WITH INHERIT'),
      cell: 'checkbox', type: 'checkbox',
      minWidth: 100, min_version: 160000,
      deps: ['role'],
      depChange: (state) => {
        if(_.isUndefined(state.inherit)) {
          state.inherit = false;
        }
      }
    },{
      id: 'set', label: gettext('WITH SET'),
      cell: 'checkbox', type: 'checkbox',
      minWidth: 100, min_version: 160000,
      deps: ['role'],
      depChange: (state) => {
        if(_.isUndefined(state.set)) {
          state.set = false;
        }
      }
    },
    ];
  }


}
