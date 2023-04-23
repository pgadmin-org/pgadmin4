/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeAjaxOptions } from '../../../../../../static/js/node_ajax';
import CastSchema from './cast.ui';
import getApiInstance from '../../../../../../../static/js/api_instance';

define('pgadmin.node.cast', [
  'sources/gettext', 'sources/url_for',
  'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.browser.collection',
], function(gettext, url_for, pgAdmin, pgBrowser) {
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
          data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },{
          name: 'create_cast_on_coll', node: 'coll-cast', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          data: {action: 'create'},
        },{
          name: 'create_cast', node: 'cast', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          data: {action: 'create'},
        }]);

      },

      getSchema: function(treeNodeInfo, itemNodeData){
        return new CastSchema({
          getTypeOptions: ()=>getNodeAjaxOptions('get_type', this, treeNodeInfo, itemNodeData),
          getFuncOptions: (srcTyp, trgtyp) =>
          {
            return new Promise((resolve, reject)=>{
              const api = getApiInstance();

              let _url = pgBrowser.Nodes['cast'].generate_url.apply(
                pgBrowser.Nodes['cast'], [
                  null, 'get_functions', itemNodeData, false,
                  treeNodeInfo,
                ]);
              let data = {'srctyp' : srcTyp, 'trgtyp' : trgtyp};

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
              } else {
                data = [];
                resolve(data);
              }
            });
          },
        },
        );
      },
    });

  }
  return pgBrowser.Nodes['coll-cast'];
});
