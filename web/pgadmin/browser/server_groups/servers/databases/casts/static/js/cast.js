/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeAjaxOptions } from '../../../../../../static/js/node_ajax';
import CastSchema from './cast.ui';
import getApiInstance from '../../../../../../../static/js/api_instance';

define('pgadmin.node.cast', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser) {
  // Extend the collection class for cast
  if (!pgBrowser.Nodes['coll-cast']) {
    pgAdmin.Browser.Nodes['coll-cast'] =
      pgAdmin.Browser.Collection.extend({
        node: 'cast',
        label: gettext('Casts'),
        type: 'coll-cast',
        columns: ['name', 'description'],
      });
  }

  // Extend the node class for cast
  if (!pgBrowser.Nodes['cast']) {
    pgAdmin.Browser.Nodes['cast'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'cast',
      sqlAlterHelp: 'sql-altercast.html',
      sqlCreateHelp: 'sql-createcast.html',
      dialogHelp: url_for('help.static', {'filename': 'cast_dialog.html'}),
      canDrop: true,
      canDropCascade: true,
      label: gettext('Cast'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for cast
        pgBrowser.add_menus([{
          name: 'create_cast_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          icon: 'wcTabIcon icon-cast', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },{
          name: 'create_cast_on_coll', node: 'coll-cast', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          icon: 'wcTabIcon icon-cast', data: {action: 'create'},
        },{
          name: 'create_cast', node: 'cast', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          icon: 'wcTabIcon icon-cast', data: {action: 'create'},
        }]);

      },

      // Define the backform model for cast node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        // Define the schema for cast
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          editable: false, type: 'text', readonly: true, cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          editable: false, type: 'text', mode: ['properties'],
        },
        {
          id: 'description', label: gettext('Comment'),
          type: 'multiline', cellHeaderClasses: 'width_percent_50',
        },
        ],
      }),

      getSchema: function(treeNodeInfo, itemNodeData){
        let schema = new CastSchema({
          getTypeOptions: ()=>getNodeAjaxOptions('get_type', this, treeNodeInfo, itemNodeData),
          getFuncOptions: (srcTyp, trgtyp) =>
          {
            return new Promise((resolve, reject)=>{
              const api = getApiInstance();

              var _url = pgBrowser.Nodes['cast'].generate_url.apply(
                pgBrowser.Nodes['cast'], [
                  null, 'get_functions', itemNodeData, false,
                  treeNodeInfo,
                ]);
              var data = {'srctyp' : srcTyp, 'trgtyp' : trgtyp};

              if(srcTyp != undefined && srcTyp != '' &&
                 trgtyp != undefined && trgtyp != ''){

                api.post(_url, data)
                  .then(res=>{
                    data = res.data.data;
                    resolve(data);
                  })
                  .catch((err)=>{
                    reject(err);
                  });
              }else{
                let data = [];
                resolve(data);
              }
            });
          },
        },
        );
        return schema;
      },
    });

  }
  return pgBrowser.Nodes['coll-cast'];
});
