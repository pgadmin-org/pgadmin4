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
import url_for from 'sources/url_for';
import { getNodeListByName, generateNodeUrl } from '../../../../../static/js/node_ajax';
import pgBrowser from 'top/browser/static/js/browser';
import { getUtilityView } from '../../../../../static/js/utility_view';
import Notify from '../../../../../../static/js/helpers/Notifier';
import { isEmptyString } from 'sources/validators';
import pgAdmin from 'sources/pgadmin';

export default class RoleReassign extends BaseUISchema{
  constructor(fieldOptions={}, initValues={}){
    super({
      role_op: 'reassign',
      did: undefined,
      new_role_id: undefined,
      new_role_name: undefined,
      drop_with_cascade: false,
      old_role_name: initValues.old_role_name,
      ...initValues
    });

    this.fieldOptions = {
      roleList: fieldOptions.roleList,
      databaseList: fieldOptions.databaseList,
      nodeInfo: fieldOptions.nodeInfo,
      ...fieldOptions,
    };

    this.nodeInfo = this.fieldOptions.nodeInfo;
    this.warningText = null;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields(){
    let obj = this;
    return [
      {
        id: 'role_op',
        label: gettext('Operation'),
        group: gettext('General'),
        type: 'toggle',
        options: [
          { 'label': gettext('Reassign'), 'value': 'reassign' },
          { 'label': gettext('Drop'), 'value': 'drop' },
        ],
        helpMessage: gettext('Change the ownership or\ndrop the database objects owned by a database role')
      },
      {
        id: 'new_role_id',
        label: gettext('Reassign objects to'),
        group: gettext('General'),
        type: ()=>{
          return{
            type: 'select',
            options: this.fieldOptions.roleList,
            optionsLoaded: (options) => { obj.roleNameIdList = options; },
            controlProps: {
              allowClear: false,
              filter: (options)=>{
                let data = [];
                let CURRENT_USER = {
                    label: 'CURRENT_USER', value: 'CURRENT_USER', image: 'icon-role'
                  },
                  SESSION_USER = {
                    label: 'SESSION_USER', value: 'SESSION_USER', image: 'icon-role'
                  };
                data.push(CURRENT_USER, SESSION_USER);

                if (obj.getServerVersion() >= 140000){
                  let CURRENT_ROLE = {
                    label: 'CURRENT_ROLE', value: 'CURRENT_ROLE', image: 'icon-role'
                  };
                  data.push(CURRENT_ROLE);
                }
                if (options && _.isArray(options)){
                  _.each(options, function(d) {
                  // omit currently selected role
                    if(d._id != obj.nodeInfo.role._id){
                      data.push({label: d.label, value: d._id, image: d.image});
                    }
                  });
                }
                return data;
              }
            }
          };
        },
        helpMessage: gettext('New owner of the affected objects'),
        deps: ['role_op'],
        disabled: (state)=>{
          return state.role_op == 'drop'? true: false;
        },
        depChange: (state) =>{
          if (state.role_op == 'drop'){
            return {new_role_id:''};
          }
        }
      },
      { /* this is dummy field not shown on UI but added as API require this value */
        id: 'new_role_name',
        visible: false,
        type: '',
        deps:['new_role_id'],
        depChange: (state)=>{
          let new_role_name;
          if (['CURRENT_USER','SESSION_USER','CURRENT_ROLE'].includes(state.new_role_id)){
            new_role_name = state.new_role_id;
          }else{
            new_role_name = obj.roleNameIdList.find(o=> o._id === state.new_role_id).label;
          }
          return {new_role_name: new_role_name};
        }
      },
      {
        id: 'drop_with_cascade',
        label: gettext('Cascade?'),
        group: gettext('General'),
        type: 'switch',
        deps: ['role_op'],
        helpMessage: gettext('Note: CASCADE will automatically drop objects that depend on the affected objects, and in turn all objects that depend on those objects')
      },
      {
        id: 'did',
        label: gettext('From database'),
        group: gettext('General'),
        helpMessage: gettext('Target database on which the operation will be carried out'),
        type: ()=>{
          return {
            type: 'select',
            options: this.fieldOptions.databaseList,
            controlProps: {
              allowClear: false,
              filter: (options)=>{
                let data = [];
                if (options && _.isArray(options)){
                  _.each(options, function(d) {
                    data.push({label: d.label, value: d._id, image: d.image});
                  });
                }
                return data;
              }
            },
          };
        }
      }
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    let obj = this;

    if (state.role_op == 'reassign' && isEmptyString(state.new_role_id)) {
      errmsg = gettext('\'Reassign objects to\' can not be empty');
      setError('new_role_id', errmsg);
      return true;
    }

    if (isEmptyString(state.did)) {
      errmsg = gettext('\'From database \' can not be empty');
      setError('did', errmsg);
      return true;
    }

    obj.warningText = gettext(`Are you sure you wish to ${state.role_op} all the objects owned by the selected role?`);
    return false;
  }
}

function saveCallBack (data) {
  if (data.errormsg) {
    Notify.alert(
      gettext('Error'),
      gettext(data.errormsg)
    );
  } else {
    Notify.success(gettext(data.info));
  }
}

function getUISchema(treeNodeInfo, itemNodeData ) {
  return new RoleReassign(
    {
      roleList: ()=>getNodeListByName('role', treeNodeInfo, itemNodeData, {includeItemKeys: ['_id']}),
      databaseList: ()=>getNodeListByName('database', treeNodeInfo, itemNodeData, {cacheLevel: 'database', cacheNode: 'database', includeItemKeys: ['_id']}),
      nodeInfo: treeNodeInfo
    },
    {
      old_role_name: itemNodeData.label
    }
  );
}

export function showRoleReassign() {
  let tree = pgBrowser.tree,
    item = tree.selected(),
    data = item ? tree.itemData(item) : undefined,
    treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(item),
    itemNodeData = pgBrowser.tree.findNodeByDomElement(item).getData();

  pgBrowser.Node.registerUtilityPanel();
  let panel = pgBrowser.Node.addUtilityPanel(pgBrowser.stdW.md, 480),
    j = panel.$container.find('.obj_properties').first();
  panel.title(gettext(`Reassign/Drop Owned - ${data.label}`));
  panel.focus();

  const baseUrl = generateNodeUrl.call( pgAdmin.Browser.Nodes[data._type], treeNodeInfo, 'reassign', data, true);

  let schema = getUISchema(treeNodeInfo, itemNodeData),
    sqlHelpUrl = '',
    msqlurl = generateNodeUrl.call( pgAdmin.Browser.Nodes[data._type], treeNodeInfo, 'reassign', data, true),
    extraData = {nodeType: data._type, msqlurl:msqlurl},
    helpUrl = url_for('help.static', {
      'filename': 'role_reassign_dialog.html',
    });

  getUtilityView(
    schema, treeNodeInfo, 'create', 'dialog', j[0], panel, saveCallBack, extraData, 'Reassign/Drop', baseUrl, sqlHelpUrl, helpUrl);
}