/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { getNodeListByName } from '../../../../../../static/js/node_ajax';
import SubscriptionSchema from './subscription.ui';
import getApiInstance from '../../../../../../../static/js/api_instance';
import _ from 'lodash';
import Notify from '../../../../../../../static/js/helpers/Notifier';

define('pgadmin.node.subscription', [
  'sources/gettext', 'sources/url_for', 'jquery',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.browser.collection',
], function(gettext, url_for, $, pgAdmin, pgBrowser, Backform) {

  // Extend the browser's collection class for subscriptions collection
  if (!pgBrowser.Nodes['coll-subscription']) {
    pgBrowser.Nodes['coll-subscription'] =
      pgBrowser.Collection.extend({
        node: 'subscription',
        label: gettext('Subscriptions'),
        type: 'coll-subscription',
        columns: ['name', 'subowner', 'pub', 'enabled'],
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
          icon: 'wcTabIcon icon-subscription', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].canCreate,
        },{
          name: 'create_subscription_on_coll', node: 'coll-subscription', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          icon: 'wcTabIcon icon-subscription', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_subscription', node: 'subscription', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Subscription...'),
          icon: 'wcTabIcon icon-subscription', data: {action: 'create'},
          enable: 'canCreate',
        }]);
      },
      // Define the model for subscription node
      model: pgBrowser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,
          subowner: undefined,
          pubtable: undefined,
          connect_timeout: 10,
          pub:[],
          enabled:true,
          create_slot: true,
          copy_data:true,
          connect:true,
          copy_data_after_refresh:false,
          sync:'off',
          refresh_pub: false,
          password: '',
          sslmode: 'prefer',
          sslcompression: false,
          sslcert: '',
          sslkey: '',
          sslrootcert: '',
          sslcrl: '',
          host: '',
          hostaddr: '',
          port: 5432,
          db: 'postgres',
        },

        // Default values!
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            this.set({'subowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        // Define the schema for the subscription node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'],
          visible: function() {
            if(!_.isUndefined(this.node_info) && !_.isUndefined(this.node_info.server)
              && !_.isUndefined(this.node_info.server.version) &&
                this.node_info.server.version >= 100000) {
              return true;
            }
            return false;
          },
        },{
          id: 'oid', label: gettext('OID'), cell: 'string', mode: ['properties'],
          type: 'text',
        },
        {
          id: 'subowner', label: gettext('Owner'), type: 'text',
          control: Backform.NodeListByNameControl, node: 'role',
          mode: ['edit', 'properties', 'create'], select2: { allowClear: false},
          disabled: function(m){
            if(m.isNew())
              return true;
            return false;
          },
        },
        {
          id: 'enabled', label: gettext('Enabled?'),
          type: 'switch', mode: ['properties'],
          group: gettext('With'),
          readonly: 'isConnect', deps :['connect'],
          helpMessage: gettext('Specifies whether the subscription should be actively replicating, or whether it should be just setup but not started yet.'),
        },
        {
          id: 'pub', label: gettext('Publication'), type: 'text', group: gettext('Connection'),
          mode: ['properties'],
        },
        ],
        sessChanged: function() {
          if (!this.isNew() && _.isUndefined(this.attributes['refresh_pub']))
            return false;
          return pgBrowser.DataModel.prototype.sessChanged.apply(this);
        },
        canCreate: function(itemData, item) {
          var treeData = pgBrowser.tree.getTreeNodeHierarchy(item),
            server = treeData['server'];

          // If server is less than 10 then do not allow 'create' menu
          if (server && server.version < 100000)
            return false;

          // by default we want to allow create menu
          return true;
        },
      }),
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
                  var _url = pgBrowser.Nodes['cast'].generate_url.apply(
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
