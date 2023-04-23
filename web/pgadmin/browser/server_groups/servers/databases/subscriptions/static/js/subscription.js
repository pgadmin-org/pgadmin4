/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeListByName } from '../../../../../../static/js/node_ajax';
import SubscriptionSchema from './subscription.ui';
import getApiInstance from '../../../../../../../static/js/api_instance';
import _ from 'lodash';
import Notify from '../../../../../../../static/js/helpers/Notifier';

define('pgadmin.node.subscription', [
  'sources/gettext', 'sources/url_for',
  'pgadmin.browser', 'pgadmin.browser.collection',
], function(gettext, url_for, pgBrowser) {

  // Extend the browser's collection class for subscriptions collection
  if (!pgBrowser.Nodes['coll-subscription']) {
    pgBrowser.Nodes['coll-subscription'] =
      pgBrowser.Collection.extend({
        node: 'subscription',
        label: gettext('Subscriptions'),
        type: 'coll-subscription',
        columns: ['name', 'subowner', 'proppub', 'enabled'],
        hasStatistics: true,
      });
  }

  // Extend the browser's node class for subscription node
  if (!pgBrowser.Nodes['subscription']) {
    pgBrowser.Nodes['subscription'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'subscription',
      sqlAlterHelp: 'sql-altersubscription.html',
      sqlCreateHelp: 'sql-createsubscription.html',
      dialogHelp: url_for('help.static', {'filename': 'subscription_dialog.html'}),
      label: gettext('Subscription'),
      hasSQL:  true,
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      hasStatistics: true,
      width: '501px',
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;


        // Add context menus for subscription
        pgBrowser.add_menus([{
          name: 'create_subscription_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].canCreate,
        },{
          name: 'create_subscription_on_coll', node: 'coll-subscription', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_subscription', node: 'subscription', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          data: {action: 'create'},
          enable: 'canCreate',
        }]);
      },
      getSchema: function(treeNodeInfo, itemNodeData){
        return new SubscriptionSchema(
          {
            role:()=>getNodeListByName('role', treeNodeInfo, itemNodeData),
            getPublication: (host, password, port, username, db,
              connectTimeout, passfile, sslmode,
              sslcompression, sslcert, sslkey,
              sslrootcert, sslcrl) =>
            {
              return new Promise((resolve, reject)=>{
                const api = getApiInstance();
                if(host != undefined && port!= undefined && username!= undefined && db != undefined){
                  let _url = pgBrowser.Nodes['cast'].generate_url.apply(
                    pgBrowser.Nodes['subscription'], [
                      null, 'get_publications', itemNodeData, false,
                      treeNodeInfo,
                    ]);
                  api.get(_url, {
                    params: {host, password, port, username, db,
                      connectTimeout, passfile, sslmode,
                      sslcompression, sslcert, sslkey,
                      sslrootcert, sslcrl},
                  })
                    .then(res=>{
                      if ((res.data.errormsg === '') && !_.isNull(res.data.data)){
                        resolve(res.data.data);
                        Notify.info(
                          gettext('Publication fetched successfully.')
                        );
                      }else if(!_.isNull(res.data.errormsg) && _.isNull(res.data.data)){
                        reject(res.data.errormsg);
                        Notify.alert(
                          gettext('Check connection?'),
                          gettext(res.data.errormsg)
                        );
                      }
                    })
                    .catch((err)=>{
                      reject(err);
                    });
                }
              });
            },
          },{
            node_info: treeNodeInfo.server,
          },
          {
            subowner: pgBrowser.serverInfo[treeNodeInfo.server._id].user.name,
          },
        );
      },
    });
  }
  return pgBrowser.Nodes['coll-subscription'];
});
