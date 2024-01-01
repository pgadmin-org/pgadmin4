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
import { getNodeListByName } from '../../../../static/js/node_ajax';


export function getMembershipSchema(nodeObj, treeNodeInfo, itemNodeData) {
  return new MembershipSchema(
    ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {}, ()=>true),
  );
}


export default class MembershipSchema extends BaseUISchema {
  constructor(roleMembersOptions) {
    super({
      role: undefined,
      admin: undefined
    });
    this.roleMembersOptions = roleMembersOptions;
  }

  get baseFields() {
    return [{
      id: 'role', label: gettext('User/Role'), type:'text',
      editable: true,
      cell: ()=>({
        cell: 'select', options: this.roleMembersOptions,
        controlProps: {
          allowClear: false,
        }
      }),
      noEmpty: true,
      minWidth: 300
    },
    {
      id: 'admin', label: gettext('WITH ADMIN'),
      cell: 'checkbox', type: 'checkbox',
      minWidth: 300,
      deps: ['role'],
      depChange: (state) => {
        if(_.isUndefined(state.admin)) {
          state.admin = false;
        }
      }
    },
    ];
  }


}
