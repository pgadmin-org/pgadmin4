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
import { getNodeListByName } from '../../../../static/js/node_ajax';

export function getNodePrivilegeRoleSchema(nodeObj, treeNodeInfo, itemNodeData, privileges) {
  return new PrivilegeRoleSchema(
    ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {}, ()=>true, (res)=>{
      res.unshift({label: 'PUBLIC', value: 'PUBLIC'});
      return res;
    }),
    ()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
    treeNodeInfo,
    privileges
  );
}

export default class PrivilegeRoleSchema extends BaseUISchema {
  constructor(granteeOptions, grantorOptions, nodeInfo, supportedPrivs) {
    super({
      grantee: undefined,
      grantor: nodeInfo?.server?.user?.name,
      privileges: undefined,
    });
    this.granteeOptions = granteeOptions;
    this.grantorOptions = grantorOptions;
    this.nodeInfo = nodeInfo;
    this.supportedPrivs = supportedPrivs || [];
  }

  updateSupportedPrivs = (updatedPrivs) => {
    this.supportedPrivs = updatedPrivs;
  }
  get baseFields() {
    let obj = this;

    return [{
      id: 'grantee', label: gettext('Grantee'), type:'text',
      editable: true,
      cell: ()=>({
        cell: 'select', options: this.granteeOptions,
        controlProps: {
          allowClear: false,
        }
      }),
      noEmpty: true,
    },
    {
      id: 'privileges', label: gettext('Privileges'),
      type: 'text', group: null,
      cell: ()=>({cell: 'privilege', controlProps: {
        supportedPrivs: this.supportedPrivs,
      }}),
      disabled : function(state) {
        return !(
          obj.nodeInfo &&
            obj.nodeInfo.server.user.name == state['grantor']
        );
      },
    },
    {
      id: 'grantor', label: gettext('Grantor'), type: 'text', readonly: true,
      editable: false, cell: ()=>({cell: 'select', options: obj.grantorOptions}),
    }];
  }

  validate(state, setError) {
    if((state.privileges || []).length <= 0) {
      setError('privileges', gettext('At least one privilege should be selected.'));
      return true;
    }
    return false;
  }
}
