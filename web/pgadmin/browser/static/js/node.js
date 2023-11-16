/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import getApiInstance from '../../../static/js/api_instance';
import { BROWSER_PANELS } from './constants';
import React from 'react';
import ObjectNodeProperties from '../../../misc/properties/ObjectNodeProperties';
import ErrorBoundary from '../../../static/js/helpers/ErrorBoundary';
import toPx from '../../../static/js/to_px';
import usePreferences from '../../../preferences/static/js/store';

define('pgadmin.browser.node', [
  'sources/gettext', 'sources/pgadmin',
  'sources/browser/generate_url', 'sources/utils',
  'pgadmin.browser.utils', 'pgadmin.browser.events',
], function(
  gettext, pgAdmin, generateUrl, commonUtils
) {
  const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  // It has already been defined.
  // Avoid running this script again.
  if (pgBrowser.Node)
    return pgBrowser.Node;

  pgBrowser.Nodes = pgBrowser.Nodes || {};

  // A helper (base) class for all the nodes, this has basic
  // operations/callbacks defined for basic operation.
  pgBrowser.Node = function() {/*This is intentional (SonarQube)*/};

  // Helper function to correctly set up the property chain, for subclasses.
  // Uses a hash of class properties to be extended.
  //
  // It is unlikely - we will instantiate an object for this class.
  pgBrowser.Node.extend = function(props, initialize) {
    let parent = this;
    let child;

    // The constructor function for the new subclass is defined to simply call
    // the parent's constructor.
    child = function() {
      return parent.apply(this, arguments);
    };

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, _.omit(props, 'callbacks'));

    // Make sure - a child have all the callbacks of the parent.
    child.callbacks = _.extend({}, parent.callbacks, props.callbacks);

    // Let's not bind the callbacks, or initialize the child.
    if (!(initialize??true))
      return child;

    let bindToChild = function(cb) {
        if (typeof(child.callbacks[cb]) == 'function') {
          child.callbacks[cb] = child.callbacks[cb].bind(child);
        }
      },
      callbacks = _.keys(child.callbacks);
    for (let cb_val of callbacks) bindToChild(cb_val);

    // Registering the node by calling child.Init(...) function
    child.Init.apply(child);

    // Initialize the parent
    this.Init.apply(child);

    return child;
  };

  _.extend(pgAdmin.Browser.Node, {
    // Node type
    type: undefined,
    // Label
    label: '',
    // Help pages
    sqlAlterHelp: '',
    sqlCreateHelp: '',
    dialogHelp: '',
    epasHelp: false,

    title: function(d, action) {
      if(action == 'create') {
        return gettext('Create - %s', this._label);
      }
      return d._label??'';
    },
    hasId: true,
    ///////
    // Initialization function
    // Generally - used to register the menus for this type of node.
    //
    // Also, look at pgAdmin.Browser.add_menus(...) function.
    //
    // NOTE: Override this for each node for initialization purpose
    Init: function() {
      let self = this;
      if (self.node_initialized)
        return;
      self.node_initialized = true;

      pgAdmin.Browser.add_menus([{
        name: 'refresh',
        node: self.type,
        module: self,
        applies: ['object', 'context'],
        callback: 'refresh',
        priority: 2,
        label: gettext('Refresh...'),
        enable: true,
      }]);

      if (self.canEdit) {
        pgAdmin.Browser.add_menus([{
          name: 'show_obj_properties',
          node: self.type,
          module: self,
          applies: ['object', 'context'],
          callback: 'show_obj_properties',
          priority: 999,
          label: gettext('Properties...'),
          data: {
            'action': 'edit',
          },
          enable: _.isFunction(self.canEdit) ?
            function() {
              return !!(self.canEdit.apply(self, arguments));
            } : (!!self.canEdit),
        }]);
      }

      if (self.canDrop) {
        pgAdmin.Browser.add_menus([{
          name: 'delete_object',
          node: self.type,
          module: self,
          applies: ['object', 'context'],
          callback: 'delete_obj',
          priority: self.dropPriority,
          label: (self.dropAsRemove) ? gettext('Remove %s', self.label) : gettext('Delete'),
          data: {
            'url': 'drop',
            data_disabled: gettext('The selected tree node does not support this option.'),
          },
          enable: _.isFunction(self.canDrop) ?
            function() {
              return !!(self.canDrop.apply(self, arguments));
            } : (!!self.canDrop),
        }]);

        if (self.canDropCascade) {
          pgAdmin.Browser.add_menus([{
            name: 'delete_object_cascade',
            node: self.type,
            module: self,
            applies: ['object', 'context'],
            callback: 'delete_obj',
            priority: 2,
            label: gettext('Delete (Cascade)'),
            data: {
              'url': 'delete',
            },
            enable: _.isFunction(self.canDropCascade) ?
              function() {
                return self.canDropCascade.apply(self, arguments);
              } : (!!self.canDropCascade),
          }]);
        }
      }

      // Show query tool only in context menu of supported nodes.
      if (_.indexOf(pgAdmin.unsupported_nodes, self.type) == -1) {
        let enable = function(itemData) {
          if (itemData?._type == 'database' && itemData?.allowConn)
            return true;
          else if (itemData?._type != 'database')
            return true;
          else
            return false;
        };
        pgAdmin.Browser.add_menus([{
          name: 'show_query_tool',
          node: self.type,
          module: self,
          applies: ['context'],
          callback: 'show_query_tool',
          priority: 998,
          label: gettext('Query Tool'),
          enable: enable,
        }]);

        // show search objects same as query tool
        pgAdmin.Browser.add_menus([{
          name: 'search_objects', node: self.type, module: pgAdmin.Tools.SearchObjects,
          applies: ['context'], callback: 'show_search_objects',
          priority: 997, label: gettext('Search Objects...'),
          icon: 'fa fa-search', enable: enable,
        }]);

        if(pgAdmin['enable_psql']) {
          // show psql tool same as query tool.
          pgAdmin.Browser.add_menus([{
            name: 'show_psql_tool', node: this.type, module: this,
            applies: ['context'], callback: 'show_psql_tool',
            priority: 998, label: gettext('PSQL Tool'),
          }]);
        }
      }

      // This will add options of scripts eg:'CREATE Script'
      if (self.hasScriptTypes && _.isArray(self.hasScriptTypes) &&
        self.hasScriptTypes.length > 0) {
        // For each script type create menu
        _.each(self.hasScriptTypes, function(stype) {

          let type_label = gettext('%s Script',stype.toUpperCase());

          stype = stype.toLowerCase();

          // Adding menu for each script type
          pgAdmin.Browser.add_menus([{
            name: 'show_script_' + stype,
            node: self.type,
            module: self,
            applies: ['object', 'context'],
            callback: 'show_script',
            priority: 4,
            label: type_label,
            category: gettext('Scripts'),
            data: {
              'script': stype,
              data_disabled: gettext('The selected tree node does not support this option.'),
            },
            enable: self.check_user_permission,
          }]);
        });
      }
    },
    ///////
    // Checks if Script Type is allowed to user
    // First check if role node & create role allowed
    // Otherwise test rest of database objects
    // if no permission matched then do not allow create script
    ///////
    check_user_permission: function(itemData, item, data) {
      // Do not display CREATE script on server group and server node
      if (itemData._type == 'server_group' || itemData._type == 'server') {
        return false;
      }

      // Do not display the menu if the database connection is not allowed
      if (itemData._type == 'database' && !itemData.allowConn)
        return false;

      let parentData = pgBrowser.tree.getTreeNodeHierarchy(item);
      if (_.indexOf(['create', 'insert', 'update', 'delete'], data.script) != -1) {
        if (itemData.type == 'role' &&
          parentData.server.user.can_create_role) {
          return true;
        } else if (
          (
            parentData.server && (
              parentData.server.user.is_superuser ||
              parentData.server.user.can_create_db)
          ) ||
          (
            parentData.schema && parentData.schema.can_create
          )
        ) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    },
    /*
     * Default script type menu for node.
     *
     * Override this, to show more script type menus (e.g hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'])
     *
     * Or set it to empty array to disable script type menu on node (e.g hasScriptTypes: [])
     */
    hasScriptTypes: ['create'],
    /******************************************************************
     * This function determines the given item is editable or not.
     *
     * Override this, when a node is not editable.
     */
    canEdit: true,
    /******************************************************************
     * This function determines the given item is deletable or not.
     *
     * Override this, when a node is not deletable.
     */
    canDrop: false,
    /************************************************************************
     * This function determines the given item and children are deletable or
     * not.
     *
     * Override this, when a node is not deletable.
     */
    canDropCascade: false,
    /*********************************************************************************
    dropAsRemove should be true in case, Drop object label needs to be replaced by Remove
    */
    dropAsRemove: false,
    /******************************************************************************
    dropPriority is set to 2 by default, override it when change is required
    */
    dropPriority: 2,
    /******************************************************************************
    select collection node on deletion.
    */
    selectParentNodeOnDelete: false,
    // List of common callbacks - that can be used for different
    // operations!
    callbacks: {
      /******************************************************************
       * This function allows to create/edit/show properties of any
       * object depending on the arguments provided.
       *
       * args must be a object containing:
       *   action - create/edit/properties
       *   item   - The properties of the item (tree node item)
       *
       * NOTE:
       * if item is not provided, the action will be done on the
       * currently selected tree item node.
       *
       **/
      show_obj_properties: function(args, item) {
        let t = pgBrowser.tree,
          nodeItem = (args && args.item) || item || t.selected(),
          nodeData = nodeItem ? t.itemData(nodeItem) : undefined,
          panelTitle = this.title(nodeData, args.action),
          treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(nodeItem);

        if (!nodeData)
          return;

        const isParent = (_.isArray(this.parent_type) ?
          (_d)=>{
            return (_.indexOf(this.parent_type, _d._type) != -1);
          } : (_d)=>{
            return (this.parent_type == _d._type);
          });

        if (args.action == 'create') {
          // If we've parent, we will get the information of it for
          // proper object manipulation.
          if (this.parent_type && !isParent(nodeData)) {
            // actual parent of a table is schema, not Tables.
            while (nodeItem && t.hasParent(nodeItem)) {
              nodeItem = t.parent(nodeItem);
              let pd = t.itemData(nodeItem);

              if (isParent(pd)) {
                // Assign the data, this is my actual parent.
                nodeData = pd;
                break;
              }
            }
          }

          // The only node who does not have parent is the Server Group
          if (!nodeData || (this.parent_type != null && !isParent(nodeData))) {
            // It should never come here.
            // If it is here, that means - we do have some bug in code.
            return;
          }

          treeNodeInfo = pgBrowser.tree.getTreeNodeHierarchy(nodeItem);
          const panelId = _.uniqueId(BROWSER_PANELS.EDIT_PROPERTIES);
          const onClose = (force=false)=>pgBrowser.docker.close(panelId, force);
          const onSave = (newNodeData)=>{
            // Clear the cache for this node now.
            setTimeout(()=>{
              this.clear_cache.apply(this, item);
            }, 0);
            try {
              pgBrowser.Events.trigger(
                'pgadmin:browser:tree:add', _.clone(newNodeData.node),
                _.clone(treeNodeInfo)
              );
            } catch (e) {
              console.warn(e.stack || e);
            }
            onClose();
          };
          this.showPropertiesDialog(panelId, panelTitle, {
            treeNodeInfo: treeNodeInfo,
            item: nodeItem,
            nodeData: nodeData,
            actionType: 'create',
            onSave: onSave,
            onClose: onClose,
          });
        } else {
          const panelId = BROWSER_PANELS.EDIT_PROPERTIES+nodeData.id;
          const onClose = (force=false)=>pgBrowser.docker.close(panelId, force);
          const onSave = (newNodeData)=>{
            let _old = nodeData,
              _new = newNodeData.node,
              info = treeNodeInfo;

            // Clear the cache for this node now.
            setTimeout(()=>{
              this.clear_cache.apply(this, item);
            }, 0);

            pgBrowser.Events.trigger(
              'pgadmin:browser:tree:update',
              _old, _new, info, {
                success: function(_item, _newNodeData, _oldNodeData) {
                  pgBrowser.Events.trigger(
                    'pgadmin:browser:node:updated', _item, _newNodeData,
                    _oldNodeData
                  );
                  pgBrowser.Events.trigger(
                    'pgadmin:browser:node:' + _newNodeData._type + ':updated',
                    _item, _newNodeData, _oldNodeData
                  );
                },
              }
            );
            onClose();
          };
          if(pgBrowser.docker.find(panelId)) {
            let msg = gettext('Are you sure want to stop editing the properties of %s "%s"?');
            if (args.action == 'edit') {
              msg = gettext('Are you sure want to reset the current changes and re-open the panel for %s "%s"?');
            }

            pgAdmin.Browser.notifier.confirm(
              gettext('Edit in progress?'),
              commonUtils.sprintf(msg, this.label.toLowerCase(), nodeData.label),
              ()=>{
                this.showPropertiesDialog(panelId, panelTitle, {
                  treeNodeInfo: treeNodeInfo,
                  item: nodeItem,
                  nodeData: nodeData,
                  actionType: 'edit',
                  onSave: onSave,
                  onClose: onClose,
                }, true);
              },
              null
            );
          } else {
            this.showPropertiesDialog(panelId, panelTitle, {
              treeNodeInfo: treeNodeInfo,
              item: nodeItem,
              nodeData: nodeData,
              actionType: 'edit',
              onSave: onSave,
              onClose: onClose,
            });
          }
        }
      },
      // Delete the selected object
      delete_obj: function(args, item) {
        let input = args || {
            'url': 'drop',
          },
          obj = this,
          t = pgBrowser.tree,
          i = input.item || item || t.selected(),
          d = i ? t.itemData(i) : undefined;

        if (!d)
          return;

        /*
         * Make sure - we're using the correct version of node
         */
        obj = pgBrowser.Nodes[d._type];
        let objName = _.unescape(d.label);

        let msg, title;

        if (input.url == 'delete' && d._type === 'database') {
          msg = gettext('Delete database with the force option will attempt to terminate all existing connections to the "%s" database. Are you sure you want to proceed?', d.label);
          title = gettext('Delete FORCE %s?', obj.label);

        } else if (input.url == 'delete') {
          msg = gettext('Are you sure you want to delete %s "%s" and all the objects that depend on it?',
            obj.label.toLowerCase(), d.label);
          title = gettext('Delete CASCADE %s?', obj.label);

          if (!(_.isFunction(obj.canDropCascade) ?
            obj.canDropCascade.apply(obj, [d, i]) : obj.canDropCascade)) {
            pgAdmin.Browser.notifier.error(
              gettext('The %s "%s" cannot be dropped.', obj.label, d.label),
              10000
            );
            return;
          }
        } else {
          if (obj.dropAsRemove) {
            msg = gettext('Are you sure you want to remove %s "%s"?', obj.label.toLowerCase(), d.label);
            title = gettext('Remove %s?', obj.label);
          } else {
            msg = gettext('Are you sure you want to delete %s "%s"?', obj.label.toLowerCase(), d.label);
            title = gettext('Delete %s?', obj.label);
          }

          if (!(_.isFunction(obj.canDrop) ?
            obj.canDrop.apply(obj, [d, i]) : obj.canDrop)) {
            pgAdmin.Browser.notifier.error(
              gettext('The %s "%s" cannot be dropped/removed.', obj.label, d.label),
              10000
            );
            return;
          }
        }
        pgAdmin.Browser.notifier.confirm(title, msg,
          function() {
            getApiInstance().delete(
              obj.generate_url(i, input.url, d, true),
            ).then(({data: res})=> {
              if(res.success == 2){
                pgAdmin.Browser.notifier.error(res.info, null);
                return;
              }
              if (res.success == 0) {
                pgAdmin.Browser.notifier.alert(res.errormsg, res.info);
              } else {
                // Remove the node from tree and set collection node as selected.
                let selectNextNode = true;
                if(obj.selectParentNodeOnDelete) {
                  let prv_i = t.parent(i);
                  setTimeout(function() {
                    t.select(prv_i);
                  }, 10);
                  selectNextNode = false;
                }
                pgBrowser.removeTreeNode(i, selectNextNode);
              }
              return true;
            }).catch(function(error) {
              let errmsg = error.request?.responseText;
              /* Error from the server */
              if (error.request?.status == 417 || error.request?.status == 410 || error.request?.status == 500) {
                try {
                  let data = error.response.data;
                  errmsg = data.info || data.errormsg;
                } catch (e) {
                  console.warn(e.stack || e);
                }
              }
              pgAdmin.Browser.notifier.alert(gettext('Error dropping/removing %s: "%s"', obj.label, objName), errmsg);
            });
          }
        );
      },
      // Callback for creating script(s) & opening them in Query editor
      show_script: function(args, item) {
        let scriptType = args.script,
          obj,
          t = pgBrowser.tree,
          i = item || t.selected(),
          d = i ? t.itemData(i) : undefined;

        if (!d)
          return;

        /*
         * Make sure - we're using the correct version of node
         */
        obj = pgBrowser.Nodes[d._type];
        let sql_url;

        // URL for script type
        if (scriptType == 'insert') {
          sql_url = 'insert_sql';
        } else if (scriptType == 'update') {
          sql_url = 'update_sql';
        } else if (scriptType == 'delete') {
          sql_url = 'delete_sql';
        } else if (scriptType == 'select') {
          sql_url = 'select_sql';
        } else if (scriptType == 'exec') {
          sql_url = 'exec_sql';
        } else {
          // By Default get CREATE SQL
          sql_url = 'sql';
        }
        // Open data grid & pass the URL for fetching
        pgAdmin.Tools.SQLEditor.showQueryTool(
          obj.generate_url(i, sql_url, d, true),
          i, scriptType
        );
      },

      // Callback to render query editor
      show_query_tool: function(args, item) {
        let preference = usePreferences.getState().getPreferences('sqleditor', 'copy_sql_to_query_tool');
        let t = pgBrowser.tree,
          i = item || t.selected(),
          d = i ? t.itemData(i) : undefined;

        if (!d)
          return;

        // Here call data grid method to render query tool
        //Open query tool with create script if copy_sql_to_query_tool is true else open blank query tool
        if(preference.value && !d._type.includes('coll-')){
          let stype = d._type.toLowerCase();
          let data = {
            'script': stype,
            data_disabled: gettext('The selected tree node does not support this option.'),
          };
          pgBrowser.Node.callbacks.show_script(data);
        }else{
          pgAdmin.Tools.SQLEditor.showQueryTool('', i);
        }
      },

      // Callback to render psql tool.
      show_psql_tool: function(args) {
        let input = args || {},
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i  ? t.itemData(i) : undefined;
        pgBrowser.psql.psql_tool(d, i, true);
      },

      // Logic to change the server background colour
      // There is no way of applying CSS to parent element so we have to
      // do it via JS code only
      change_server_background: function(item, data) {
        if (!item || !data)
          return;
        const treeH = pgBrowser.tree.getTreeNodeHierarchy(item);
        const serverData = treeH['server'];
        if (!serverData) {
          return;
        }
        const index = item.path.indexOf(serverData.id);

        // Go further only if node type is a Server
        if (index !== -1) {
          // First element will be icon and second will be colour code
          let bgcolor = serverData.icon.split(' ')[1] || null,
            fgcolor = serverData.icon.split(' ')[2] || '';

          if (bgcolor) {
            let dynamic_class = 'pga_server_' + serverData._id + '_bgcolor';
            // Prepare dynamic style tag
            const styleTag = document.createElement('style');
            styleTag.setAttribute('id', dynamic_class);
            styleTag.setAttribute('type', 'text/css');
            styleTag.innerText = `
              .${dynamic_class} .file-label {
                border-radius: 3px;
                margin-bottom: 2px;
                background: ${bgcolor} !important;
              }
              ${fgcolor ? `
              .${dynamic_class} span.file-name, .${dynamic_class} span.file-name:hover, .${dynamic_class} span.file-name.pseudo-active {
                color: ${fgcolor} !important;
              }
              `:''}
            `;

            // Prepare dynamic style tag using template
            document.querySelector(`style[id="${dynamic_class}"]`)?.remove();
            document.head.appendChild(styleTag);
            // Add dynamic class to the tree node.
            pgBrowser.tree.addCssClass(item, dynamic_class);
          }
        }
      },
      added: function(item, data) {
        if (pgBrowser.tree.getData(item)._type.indexOf('coll-') !== -1){
          setTimeout(function() {
            let _item = pgAdmin.Browser.Nodes[pgBrowser.tree.getData(item).nodes[0]];
            _item.clear_cache.apply(_item);
          }, 0);
        }
        pgBrowser.Events.trigger('pgadmin:browser:tree:expand-from-previous-tree-state',
          item);
        pgBrowser.Node.callbacks.change_server_background(item, data);
      },
      // Callback called - when a node is selected in browser tree.
      selected: function(item, data) {
        // Show the information about the selected node in the below panels,
        // which are visible at this time:
        // + Properties
        // + Query (if applicable, otherwise empty)
        // + Dependents
        // + Dependencies
        // + Statistics
        // Update the menu items
        pgAdmin.Browser.enable_disable_menus.apply(pgBrowser, [item]);

        pgBrowser.Events.trigger('pgadmin-browser:node:selected', item, data);

        pgBrowser.Events.trigger('pgadmin:browser:tree:update-tree-state',
          item);
        return true;
      },
      removed: function(item) {
        let self = this;
        setTimeout(function() {
          self.clear_cache.apply(self, item);
        }, 0);
      },
      refresh: function(cmd, _item) {
        let self = this,
          t = pgBrowser.tree,
          data = _item && t.itemData(_item);

        pgBrowser.Events.trigger(
          'pgadmin:browser:tree:refresh', _item || pgBrowser.tree.selected(), {
            success: function() {
              self.callbacks.selected.apply(self, [_item, data, pgBrowser]);
            },
          });
      },
      opened: function(item) {
        let tree = pgBrowser.tree,
          auto_expand = usePreferences.getState().getPreferences('browser', 'auto_expand_sole_children');

        if (auto_expand && auto_expand.value && tree.children(item).length == 1) {
          // Automatically expand the child node, if a treeview node has only a single child.
          const first_child = tree.first(item);

          if (first_child._loaded) {
            tree.open(first_child);
            tree.select(first_child);
          } else {
            const openSoleItem = setInterval(() => {
              if (first_child._loaded) {
                tree.open(first_child);
                tree.select(first_child);
                clearSoleItemInterval();
              }
            }, 200);
            const clearSoleItemInterval = function() {
              clearInterval(openSoleItem);
            };
          }

        } else if(tree.children(item).length == 1) {
          const first_child = tree.first(item);
          tree.select(first_child);
        }

        pgBrowser.Events.trigger('pgadmin:browser:tree:update-tree-state', item);

      },
      closed: function(item) {
        pgBrowser.Events.trigger('pgadmin:browser:tree:remove-from-tree-state',
          item);
      },
    },
    showPropertiesDialog: function(panelId, panelTitle, dialogProps, update=false) {
      const panelData = {
        id: panelId,
        title: panelTitle,
        manualClose: true,
        icon: `dialog-node-icon ${this.node_image?.(dialogProps.itemNodeData) ?? ('icon-' + this.type)}`,
        content: (
          <ErrorBoundary>
            <ObjectNodeProperties
              panelId={panelId}
              node={this}
              formType="dialog"
              {...dialogProps}
            />
          </ErrorBoundary>
        )
      };

      let w = toPx(this.width || (pgBrowser.stdW.default + 'px'), 'width', true);
      let h = toPx(this.height || (pgBrowser.stdH.default + 'px'), 'height', true);

      /* Fit to standard sizes */
      if(w <= pgBrowser.stdW.sm) {
        w = pgBrowser.stdW.sm;
      } else {
        if(w <= pgBrowser.stdW.md) {
          w = pgBrowser.stdW.md;
        } else {
          w = pgBrowser.stdW.lg;
        }
      }

      if(h <= pgBrowser.stdH.sm) {
        h = pgBrowser.stdH.sm;
      } else {
        if(h <= pgBrowser.stdH.md) {
          h = pgBrowser.stdH.md;
        } else {
          h = pgBrowser.stdH.lg;
        }
      }

      if(update) {
        dialogProps.onClose(true);
        setTimeout(()=>{
          pgBrowser.docker.openDialog(panelData, w, h);
        }, 10);
      } else {
        pgBrowser.docker.openDialog(panelData, w, h);
      }
    },
    _find_parent_node: function(t, i, d) {
      if (this.parent_type) {
        d = d || t.itemData(i);

        if (_.isString(this.parent_type)) {
          if (this.parent_type == d._type) {
            return i;
          }
          while (t.hasParent(i)) {
            i = t.parent(i);
            d = t.itemData(i);

            if (this.parent_type == d._type)
              return i;
          }
        } else {
          if (_.indexOf(this.parent_type, d._type) >= 0) {
            return i;
          }
          while (t.hasParent(i)) {
            i = t.parent(i);
            d = t.itemData(i);

            if (_.indexOf(this.parent_type, d._type) >= 0)
              return i;
          }
        }
      }
      return null;
    },
    /**********************************************************************
     * Generate the URL for different operations
     *
     * arguments:
     *   type:  Create/drop/edit/properties/sql/depends/statistics
     *   d:     Provide the ItemData for the current item node
     *   with_id: Required id information at the end?
     *   jump_after_node: This will skip all the value between jump_after_node
     *   to the last node, excluding jump_after_node and the last node. This is particularly
     *   helpful in partition table where we need to skip parent table OID of a partitioned
     *   table in URL formation. Partitioned table itself is a "table" and can be multilevel
     * Supports url generation for create, drop, edit, properties, sql,
     * depends, statistics
     */
    generate_url: function(item, type, d, with_id, info, jump_after_node) {
      let opURL = {
          'create': 'obj',
          'drop': 'obj',
          'edit': 'obj',
          'properties': 'obj',
          'statistics': 'stats',
        },
        self = this,
        priority = -Infinity;
      let treeInfo = (_.isUndefined(item) || _.isNull(item)) ?
        info || {} : pgBrowser.tree.getTreeNodeHierarchy(item);
      let actionType = type in opURL ? opURL[type] : type;
      let itemID = with_id && d._type == self.type ? encodeURIComponent(d._id) : '';

      if (self.parent_type) {
        if (_.isString(self.parent_type)) {
          let p = treeInfo[self.parent_type];
          if (p) {
            priority = p.priority;
          }
        } else {
          _.each(self.parent_type, function(o) {
            let p = treeInfo[o];
            if (p) {
              if (priority < p.priority) {
                priority = p.priority;
              }
            }
          });
        }
      }

      let jump_after_priority = priority;
      if(jump_after_node && treeInfo[jump_after_node]) {
        jump_after_priority = treeInfo[jump_after_node].priority;
      }

      let nodePickFunction = function(treeInfoValue) {
        return (treeInfoValue.priority <= jump_after_priority || treeInfoValue.priority == priority);
      };

      return generateUrl.generate_url(pgBrowser.URL, treeInfo, actionType, self.type, nodePickFunction, itemID);
    },
    cache: function(url, node_info, level, data) {
      let cached = this.cached = this.cached || {},
        hash = url,
        min_priority = (
          node_info && node_info[level] && node_info[level].priority
        ) || 0;

      if (node_info) {
        _.each(_.sortBy(_.values(_.pickBy(
          node_info,
          function(v) {
            return (v.priority <= min_priority);
          }
        )), function(o) {
          return o.priority;
        }), function(o) {
          hash = commonUtils.sprintf('%s_%s', hash, encodeURI(o._id));
        });
      }

      if (_.isUndefined(data)) {
        let res = cached[hash];

        if (!_.isUndefined(res) &&
          (res.at - Date.now() > 300000)) {
          res = undefined;
        }
        return res;
      }

      let res = cached[hash] = {
        data: data,
        at: Date.now(),
        level: level,
      };
      return res;
    },
    clear_cache: function(item) {
      /*
       * Reset the cache, when new node is created.
       *
       * FIXME:
       * At the moment, we will clear all the cache for this node. But - we
       * would like to clear the cache only this nodes parent, so that - it
       * fetches the new data.
       */
      this.cached = {};

      // Trigger Notify event about node's cache
      let self = this;
      pgBrowser.Events.trigger(
        'pgadmin:browser:node:' + self.type + ':cache_cleared',
        item, self
      );
    },
    cache_level: function(node_info, with_id) {
      if (node_info) {
        if (with_id && this.type in node_info) {
          return this.type;
        }
        if (_.isArray(this.parent_type)) {
          for (let parent in this.parent_type) {
            if (parent in node_info) {
              return parent;
            }
          }
          return this.type;
        }
        return this.parent_type;
      }
    },
  });

  return pgAdmin.Browser.Node;
});
