/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.browser.node', [
  'sources/tree/pgadmin_tree_node', 'sources/url_for',
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'pgadmin.browser.menu', 'backbone', 'pgadmin.alertifyjs', 'pgadmin.browser.datamodel',
  'backform', 'sources/browser/generate_url', 'pgadmin.help', 'sources/utils',
  'pgadmin.browser.utils', 'pgadmin.backform',
], function(
  pgadminTreeNode, url_for,
  gettext, $, _, pgAdmin,
  Menu, Backbone, Alertify, pgBrowser,
  Backform, generateUrl, help,
  commonUtils
) {

  var wcDocker = window.wcDocker,
    keyCode = {
      ENTER: 13,
      ESCAPE: 27,
      F1: 112,
    };

  // It has already been defined.
  // Avoid running this script again.
  if (pgBrowser.Node)
    return pgBrowser.Node;

  pgBrowser.Nodes = pgBrowser.Nodes || {};

  // A helper (base) class for all the nodes, this has basic
  // operations/callbacks defined for basic operation.
  pgBrowser.Node = function() {};

  // Helper function to correctly set up the property chain, for subclasses.
  // Uses a hash of class properties to be extended.
  //
  // It is unlikely - we will instantiate an object for this class.
  // (Inspired by Backbone.extend function)
  pgBrowser.Node.extend = function(props, initialize) {
    var parent = this;
    var child;

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
    if (initialize === false)
      return child;

    var bindToChild = function(cb) {
        if (typeof(child.callbacks[cb]) == 'function') {
          child.callbacks[cb] = child.callbacks[cb].bind(child);
        }
      },
      callbacks = _.keys(child.callbacks);
    for (var idx = 0; idx < callbacks.length; idx++) bindToChild(callbacks[idx]);

    // Registering the node by calling child.Init(...) function
    child.Init.apply(child);

    // Initialize the parent
    this.Init.apply(child);

    return child;
  };

  _.extend(pgAdmin.Browser.Node, Backbone.Events, {
    // Node type
    type: undefined,
    // Label
    label: '',
    // Help pages
    sqlAlterHelp: '',
    sqlCreateHelp: '',
    dialogHelp: '',

    title: function(o, d) {
      return o.label + (d ? (' - ' + d.label) : '');
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
      var self = this;
      if (self.node_initialized)
        return;
      self.node_initialized = true;

      pgAdmin.Browser.add_menus([{
        name: 'refresh',
        node: self.type,
        module: self,
        applies: ['object', 'context'],
        callback: 'refresh',
        priority: 1,
        label: gettext('Refresh...'),
        icon: 'fa fa-refresh',
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
          icon: 'fa fa-pencil-square-o',
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
          label: (self.dropAsRemove) ? gettext('Remove %s', self.label) : gettext('Delete/Drop'),
          data: {
            'url': 'drop',
          },
          icon: 'fa fa-trash',
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
            priority: 3,
            label: gettext('Drop Cascade'),
            data: {
              'url': 'delete',
            },
            icon: 'fa fa-trash',
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
          if (itemData._type == 'database' && itemData.allowConn)
            return true;
          else if (itemData._type != 'database')
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
          label: gettext('Query Tool...'),
          icon: 'pg-font-icon icon-query-tool',
          enable: enable,
        }]);

        // show search objects same as query tool
        pgAdmin.Browser.add_menus([{
          name: 'search_objects', node: self.type, module: pgAdmin.SearchObjects,
          applies: ['context'], callback: 'show_search_objects',
          priority: 997, label: gettext('Search Objects...'),
          icon: 'fa fa-search', enable: enable,
        }]);
      }

      // This will add options of scripts eg:'CREATE Script'
      if (self.hasScriptTypes && _.isArray(self.hasScriptTypes) &&
        self.hasScriptTypes.length > 0) {
        // For each script type create menu
        _.each(self.hasScriptTypes, function(stype) {

          var type_label = gettext('%s Script',stype.toUpperCase());

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
            },
            icon: 'fa fa-pencil',
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

      var node = pgBrowser.Nodes[itemData._type],
        parentData = node.getTreeNodeHierarchy(item);
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
    ///////
    // Generate a Backform view using the node's model type
    //
    // Used to generate view for the particular node properties, edit,
    // creation.
    getView: function(item, type, el, node, formType, callback, ctx, cancelFunc) {
      var that = this;

      if (!this.type || this.type == '')
        // We have no information, how to generate view for this type.
        return null;

      if (this.model) {
        // This will be the URL, used for object manipulation.
        // i.e. Create, Update in these cases
        var urlBase = this.generate_url(item, type, node, false, null, that.url_jump_after_node);

        if (!urlBase)
          // Ashamed of myself, I don't know how to manipulate this
          // node.
          return null;

        var attrs = {};

        // In order to get the object data from the server, we must set
        // object-id in the model (except in the create mode).
        if (type !== 'create') {
          attrs[this.model.idAttribute || this.model.prototype.idAttribute ||
            'id'] = node._id;
        }

        // We know - which data model to be used for this object.
        var info = this.getTreeNodeHierarchy.apply(this, [item]),
          newModel = new(this.model.extend({
            urlRoot: urlBase,
          }))(
            attrs, {
              node_info: info,
            }
          ),
          fields = Backform.generateViewSchema(
            info, newModel, type, this, node
          );

        if (type == 'create' || type == 'edit') {

          if (callback && ctx) {
            callback = callback.bind(ctx);
          } else {
            callback = function() {
              console.warn(
                'Broke something!!! Why we don\'t have the callback or the context???'
              );
            };
          }

          var onSessionInvalid = function(msg) {
            var alertMessage = `
            <div class="error-in-footer">
              <div class="d-flex px-2 py-1">
                <div class="pr-2">
                  <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true" role="img"></i>
                </div>
                <div role="alert" class="alert-text">${msg}</div>
                <div class="ml-auto close-error-bar">
                  <a class="close-error fa fa-times text-danger"></a>
                </div>
              </div>
            </div>`;

            if (!_.isUndefined(that.statusBar)) {
              that.statusBar.html(alertMessage).css('visibility', 'visible');
              that.statusBar.find('a.close-error').bind('click', function() {
                this.empty().css('visibility', 'hidden');
              }.bind(that.statusBar));
            }

            var sessHasChanged = false;
            if(this.sessChanged && this.sessChanged()){
              sessHasChanged = true;
            }
            callback(true, sessHasChanged);

            return true;
          };

          var onSessionValidated = function(sessHasChanged) {

            if (!_.isUndefined(that.statusBar)) {
              that.statusBar.empty().css('visibility', 'hidden');
            }

            callback(false, sessHasChanged);
          };

          callback(false, false);

          newModel.on('pgadmin-session:valid', onSessionValidated);
          newModel.on('pgadmin-session:invalid', onSessionInvalid);
        }
        // 'schema' has the information about how to generate the form.
        if (_.size(fields)) {
          // This will contain the actual view
          var view;

          if (formType == 'fieldset') {
            // It is used to show, edit, create the object in the
            // properties tab.
            view = new Backform.Accordian({
              el: el,
              model: newModel,
              schema: fields,
            });
          } else {
            // This generates a view to be used by the node dialog
            // (for create/edit operation).
            view = new Backform.Dialog({
              el: el,
              model: newModel,
              schema: fields,
            });
          }

          var setFocusOnEl = function() {
            var container = $(el).find('.tab-content:first > .tab-pane.active:first');
            commonUtils.findAndSetFocus(container);
          };

          if (!newModel.isNew()) {
            // This is definetely not in create mode
            var msgDiv = '<div role="status" class="pg-panel-message pg-panel-properties-message">' +
              gettext('Retrieving data from the server...') + '</div>',
              $msgDiv = $(msgDiv);
            var timer = setTimeout(function(_ctx) {
              // notify user if request is taking longer than 1 second

              if (!_.isUndefined(_ctx)) {
                $msgDiv.appendTo(_ctx);
              }
            }, 1000, ctx);


            var fetchAjaxHook = function() {
              newModel.fetch({
                success: function() {
                  // Clear timeout and remove message
                  clearTimeout(timer);
                  $msgDiv.addClass('d-none');

                  // We got the latest attributes of the object. Render the view
                  // now.
                  view.render();
                  setFocusOnEl();
                  newModel.startNewSession();
                },
                error: function(model, xhr, options) {
                  var _label = that && item ?
                    that.getTreeNodeHierarchy(
                      item
                    )[that.type].label : '';
                  pgBrowser.Events.trigger(
                    'pgadmin:node:retrieval:error', 'properties',
                    xhr, options.textStatus, options.errorThrown, item
                  );
                  if (!Alertify.pgHandleItemError(
                    xhr, options.textStatus, options.errorThrown, {
                      item: item,
                      info: info,
                    }
                  )) {
                    Alertify.pgNotifier(
                      options.textStatus, xhr,
                      gettext('Error retrieving properties - %s', options.errorThrown || _label),
                      function(msg) {
                        if(msg === 'CRYPTKEY_SET') {
                          fetchAjaxHook();
                        } else {
                          console.warn(arguments);
                        }
                      }
                    );
                  }
                  // Close the panel (if could not fetch properties)
                  if (cancelFunc) {
                    cancelFunc();
                  }
                },
              });
            };

            fetchAjaxHook();
          } else {
            // Yay - render the view now!
            view.render();
            setFocusOnEl();
            newModel.startNewSession();
          }
        }

        return view;
      }

      return null;
    },
    register_node_panel: function() {
      var w = pgBrowser.docker,
        p = w.findPanels('node_props');

      if (p && p.length == 1)
        return;

      var events = {};
      events[wcDocker.EVENT.RESIZE_ENDED] = function() {
        var $container = this.$container.find('.obj_properties').first(),
          v = $container.data('obj-view');

        if (v && v.model && v.model) {
          v.model.trigger(
            'pg-browser-resized', {
              'view': v,
              'panel': this,
              'container': $container,
            });

        }
      };

      p = new pgBrowser.Panel({
        name: 'node_props',
        showTitle: true,
        isCloseable: true,
        isPrivate: true,
        isLayoutMember: false,
        elContainer: true,
        content: '<div class="obj_properties container-fluid"><div role="status" class="pg-panel-message">' + gettext('Please wait while we fetch information about the node from the server...') + '</div></div>',
        onCreate: function(myPanel, $container) {
          $container.addClass('pg-no-overflow');
        },
        events: events,
      });
      p.load(pgBrowser.docker);
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
        var t = pgBrowser.tree,
          i = (args && args.item) || item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined,
          o = this,
          l = o.title.apply(this, [d]);

        // Make sure - the properties dialog type registered
        pgBrowser.Node.register_node_panel();

        // No node selected.
        if (!d)
          return;

        var self = this,
          isParent = (_.isArray(this.parent_type) ?
            function(_d) {
              return (_.indexOf(self.parent_type, _d._type) != -1);
            } : function(_d) {
              return (self.parent_type == _d._type);
            }),
          addPanel = function() {
            var body = window.document.body,
              el = document.createElement('div');

            body.insertBefore(el, body.firstChild);

            let w, h, x, y;
            if(screen.width < 800) {
              w = pgAdmin.toPx(el, '95%', 'width', true);
            } else {
              w = pgAdmin.toPx(
                el, self.width || (pgBrowser.stdW.default + 'px'),
                'width', true
              );

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
            }

            if(screen.height < 600) {
              h = pgAdmin.toPx(el, '95%', 'height', true);
            } else {
              h = pgAdmin.toPx(
                el, self.height || (pgBrowser.stdH.default + 'px'),
                'height', true
              );

              /* Fit to standard sizes */
              if(h <= pgBrowser.stdH.sm) {
                h = pgBrowser.stdH.sm;
              } else {
                if(h <= pgBrowser.stdH.md) {
                  h = pgBrowser.stdH.md;
                } else {
                  h = pgBrowser.stdH.lg;
                }
              }
            }

            x = (body.offsetWidth - w) / 2;
            y = (body.offsetHeight - h) / 4;

            // If the screen resolution is higher, but - it is zoomed, dialog
            // may be go out of window, and will not be accessible through the
            // keyboard.
            if (w > window.innerWidth) {
              x = 0;
              w = window.innerWidth;
            }
            if (h > window.innerHeight) {
              y = 0;
              h = window.innerHeight;
            }

            var new_panel = pgBrowser.docker.addPanel(
              'node_props', wcDocker.DOCK.FLOAT, undefined, {
                w: w + 'px',
                h: h + 'px',
                x: x + 'px',
                y: y + 'px',
              }
            );

            body.removeChild(el);

            return new_panel;
          };

        if (args.action == 'create') {
          // If we've parent, we will get the information of it for
          // proper object manipulation.
          //
          // You know - we're working with RDBMS, relation is everything
          // for us.
          if (self.parent_type && !isParent(d)) {
            // In browser tree, I can be under any node, But - that
            // does not mean, it is my parent.
            //
            // We have some group nodes too.
            //
            // i.e.
            // Tables, Views, etc. nodes under Schema node
            //
            // And, actual parent of a table is schema, not Tables.
            while (i && t.hasParent(i)) {
              i = t.parent(i);
              var pd = t.itemData(i);

              if (isParent(pd)) {
                // Assign the data, this is my actual parent.
                d = pd;
                break;
              }
            }
          }

          // Seriously - I really don't have parent data present?
          //
          // The only node - which I know - who does not have parent
          // node, is the Server Group (and, comes directly under root
          // node - which has no parent.)
          if (!d || (this.parent_type != null && !isParent(d))) {
            // It should never come here.
            // If it is here, that means - we do have some bug in code.
            return;
          }

          l = gettext('Create - %s', this.label);
          p = addPanel();

          setTimeout(function() {
            o.showProperties(i, d, p, args.action);
          }, 10);
        } else {
          if (pgBrowser.Node.panels && pgBrowser.Node.panels[d.id] &&
            pgBrowser.Node.panels[d.id].$container) {
            var p = pgBrowser.Node.panels[d.id];
            /**  TODO ::
             *  Run in edit mode (if asked) only when it is
             *  not already been running edit mode
             **/
            var mode = p.$container.attr('action-mode');
            if (mode) {
              var msg = gettext('Are you sure want to stop editing the properties of %s "%s"?');
              if (args.action == 'edit') {
                msg = gettext('Are you sure want to reset the current changes and re-open the panel for %s "%s"?');
              }

              Alertify.confirm(
                gettext('Edit in progress?'),
                commonUtils.sprintf(msg, o.label.toLowerCase(), d.label),
                function() {
                  setTimeout(function() {
                    o.showProperties(i, d, p, args.action);
                  }, 10);
                },
                null).show();
            } else {
              setTimeout(function() {
                o.showProperties(i, d, p, args.action);
              }, 10);
            }
          } else {
            pgBrowser.Node.panels = pgBrowser.Node.panels || {};
            p = pgBrowser.Node.panels[d.id] = addPanel();

            setTimeout(function() {
              o.showProperties(i, d, p, args.action);
            }, 10);
          }
        }

        p.title(l);
        p.icon('icon-' + this.type);

        // Make sure the properties dialog is visible
        p.focus();
      },
      // Delete the selected object
      delete_obj: function(args, item) {
        var input = args || {
            'url': 'drop',
          },
          obj = this,
          t = pgBrowser.tree,
          i = input.item || item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

        if (!d)
          return;

        /*
         * Make sure - we're using the correct version of node
         */
        obj = pgBrowser.Nodes[d._type];
        var objName = d.label;

        var msg, title;

        if (input.url == 'delete') {

          msg = gettext('Are you sure you want to drop %s "%s" and all the objects that depend on it?',
            obj.label.toLowerCase(), d.label);
          title = gettext('DROP CASCADE %s?', obj.label);

          if (!(_.isFunction(obj.canDropCascade) ?
            obj.canDropCascade.apply(obj, [d, i]) : obj.canDropCascade)) {
            Alertify.error(
              gettext('The %s "%s" cannot be dropped.', obj.label, d.label),
              10
            );
            return;
          }
        } else {
          if (obj.dropAsRemove) {
            msg = gettext('Are you sure you want to remove %s "%s"?', obj.label.toLowerCase(), d.label);
            title = gettext('Remove %s?', obj.label);
          } else {
            msg = gettext('Are you sure you want to drop %s "%s"?', obj.label.toLowerCase(), d.label);
            title = gettext('Drop %s?', obj.label);
          }

          if (!(_.isFunction(obj.canDrop) ?
            obj.canDrop.apply(obj, [d, i]) : obj.canDrop)) {
            Alertify.error(
              gettext('The %s "%s" cannot be dropped/removed.', obj.label, d.label),
              10
            );
            return;
          }
        }
        Alertify.confirm(title, msg,
          function() {
            $.ajax({
              url: obj.generate_url(i, input.url, d, true),
              type: 'DELETE',
            })
              .done(function(res) {
                if (res.success == 0) {
                  pgBrowser.report_error(res.errormsg, res.info);
                } else {
                  pgBrowser.removeTreeNode(i, true);
                }
                return true;
              })
              .fail(function(jqx) {
                var errmsg = jqx.responseText;
                /* Error from the server */
                if (jqx.status == 417 || jqx.status == 410 || jqx.status == 500) {
                  try {
                    var data = JSON.parse(jqx.responseText);
                    errmsg = data.info || data.errormsg;
                  } catch (e) {
                    console.warn(e.stack || e);
                  }
                }
                pgBrowser.report_error(
                  gettext('Error dropping/removing %s: "%s"', obj.label, objName), errmsg);

              });
          },
          null
        ).set('labels', {
          ok: gettext('Yes'),
          cancel: gettext('No'),
        }).show();
      },
      // Callback for creating script(s) & opening them in Query editor
      show_script: function(args, item) {
        var scriptType = args.script,
          obj,
          t = pgBrowser.tree,
          i = item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

        if (!d)
          return;

        /*
         * Make sure - we're using the correct version of node
         */
        obj = pgBrowser.Nodes[d._type];
        var sql_url;

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
        pgAdmin.DataGrid.show_query_tool(
          obj.generate_url(i, sql_url, d, true),
          i, scriptType
        );
      },

      // Callback to render query editor
      show_query_tool: function(args, item) {
        var t = pgBrowser.tree,
          i = item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

        if (!d)
          return;

        // Here call data grid method to render query tool
        pgAdmin.DataGrid.show_query_tool('', i);
      },

      // Logic to change the server background colour
      // There is no way of applying CSS to parent element so we have to
      // do it via JS code only
      change_server_background: function(item, data) {
        if (!item || !data)
          return;

        // Go further only if node type is a Server
        if (data._type && data._type == 'server') {
          var element = $(item).find('span.aciTreeItem').first() || null,
            // First element will be icon and second will be colour code
            bgcolor = data.icon.split(' ')[1] || null,
            fgcolor = data.icon.split(' ')[2] || '';

          if (bgcolor) {
            // li tag for the current branch
            var first_level_element = (element && element.parents()[3]) || null,
              dynamic_class = 'pga_server_' + data._id + '_bgcolor',
              style_tag;

            // Prepare dynamic style tag
            style_tag = '<style id=' + dynamic_class + ' type=\'text/css\'> \n';
            style_tag += '.' + dynamic_class + ' .aciTreeItem {';
            style_tag += ' border-radius: 3px; margin-bottom: 2px;';
            style_tag += ' background: ' + bgcolor + '} \n';
            if (fgcolor) {
              style_tag += '.' + dynamic_class + ' .aciTreeText {';
              style_tag += ' color: ' + fgcolor + ';} \n';
            }
            style_tag += '</style>';

            // Prepare dynamic style tag using template
            $('#' + dynamic_class).remove();
            $(style_tag).appendTo('head');

            if (first_level_element)
              $(first_level_element).addClass(dynamic_class);
          }
        }
      },
      added: function(item, data, browser) {
        var b = browser || pgBrowser,
          t = b.tree,
          pItem = t.parent(item),
          pData = pItem && t.itemData(pItem),
          pNode = pData && pgBrowser.Nodes[pData._type];

        // Check node is a collection or not.
        if (pNode && pNode.is_collection) {
          /* If 'collection_count' is not present in data
           * it means tree node expanded first time, so we will
           * kept collection count and label in data itself.
           */
          if (!('collection_count' in pData)) {
            pData.collection_count = 0;
          }
          pData.collection_count++;
          t.setLabel(
            pItem, {
              label: (
                _.escape(pData._label) + ' <span>(' + pData.collection_count + ')</span>'
              ),
            }
          );
        }

        pgBrowser.Events.trigger('pgadmin:browser:tree:expand-from-previous-tree-state',
          item);
        pgBrowser.Node.callbacks.change_server_background(item, data);
      },
      // Callback called - when a node is selected in browser tree.
      selected: function(item, data, browser) {
        // Show the information about the selected node in the below panels,
        // which are visible at this time:
        // + Properties
        // + Query (if applicable, otherwise empty)
        // + Dependents
        // + Dependencies
        // + Statistics
        var b = browser || pgBrowser,
          t = b.tree,
          d = data || t.itemData(item);

        // Update the menu items
        pgAdmin.Browser.enable_disable_menus.apply(b, [item]);

        if (d && b) {
          if ('properties' in b.panels &&
            b.panels['properties'] &&
            b.panels['properties'].panel &&
            b.panels['properties'].panel.isVisible()) {
            // Show object properties (only when the 'properties' tab
            // is active).
            this.showProperties(item, d, b.panels['properties'].panel);
          }
        }

        pgBrowser.Events.trigger('pgadmin:browser:tree:update-tree-state',
          item);
        return true;
      },
      removed: function(item) {
        var self = this,
          t = pgBrowser.tree,
          pItem = t.parent(item),
          pData = pItem && t.itemData(pItem),
          pNode = pData && pgBrowser.Nodes[pData._type];

        // Check node is a collection or not.
        if (
          pNode && pNode.is_collection && 'collection_count' in pData
        ) {
          pData.collection_count--;
          t.setLabel(
            pItem, {
              label: (
                _.escape(pData._label) + ' <span>(' + pData.collection_count + ')</span>'
              ),
            }
          );
        }

        setTimeout(function() {
          self.clear_cache.apply(self, item);
        }, 0);
      },
      unloaded: function(item) {
        var self = this,
          t = pgBrowser.tree,
          data = item && t.itemData(item);

        // In case of unload remove the collection counter
        if (self.is_collection &&  data === Object(data) &&'collection_count' in data) {
          delete data.collection_count;
          t.setLabel(item, {
            label: _.escape(data._label),
          });
        }
      },
      refresh: function(cmd, _item) {
        var self = this,
          t = pgBrowser.tree,
          data = _item && t.itemData(_item);

        $(pgBrowser.panels['properties'].panel).removeData('node-prop');
        pgBrowser.Events.trigger(
          'pgadmin:browser:tree:refresh', _item || pgBrowser.tree.selected(), {
            success: function() {
              self.callbacks.selected.apply(self, [_item, data, pgBrowser]);
            },
          });
      },
      opened: function(item) {
        let tree = pgBrowser.tree,
          auto_expand = pgBrowser.get_preference('browser', 'auto_expand_sole_children');

        pgBrowser.Events.trigger('pgadmin:browser:tree:update-tree-state',
          item);

        if (auto_expand && auto_expand.value == true && tree.children(item).length == 1) {
          // Automatically expand the child node, if a treeview node has only a single child.
          tree.open(tree.first(item));
        }

      },
      closed: function(item) {
        pgBrowser.Events.trigger('pgadmin:browser:tree:remove-from-tree-state',
          item);
      },
    },
    /**********************************************************************
     * A hook (not a callback) to show object properties in given HTML
     * element.
     *
     * This has been used for the showing, editing properties of the node.
     * This has also been used for creating a node.
     **/
    showProperties: function(item, data, panel, action) {
      var that = this,
        tree = pgAdmin.Browser.tree,
        j = panel.$container.find('.obj_properties').first(),
        view = j.data('obj-view'),
        content = $('<div></div>')
          .addClass('pg-prop-content col-12'),
        confirm_close = true;

      // Handle key press events for Cancel, save and help button
      var handleKeyDown = function(event, context) {
        // If called on panel other than node_props, return
        if (panel && panel['_type'] !== 'node_props') return;

        switch (event.which) {
        case keyCode.ESCAPE:
          closePanel(true);
          break;
        case keyCode.ENTER:
          // Return if event is fired from child element
          if (event.target !== context) return;
          if (view && view.model && view.model.sessChanged()) {
            var btn = $(event.target).closest('.obj_properties')
              .find('.pg-prop-btn-group')
              .find('button.btn-primary');
            onSave.call(this, view, btn);
          }
          break;
        case keyCode.F1:
          onDialogHelp();
          break;
        default:
          break;
        }
      }.bind(panel);

      setTimeout(function() {
        // Register key press events with panel element
        panel.$container.find('.backform-tab').on('keydown', function(event) {
          handleKeyDown(event, this);
        });
      }, 200); // wait for panel tab to render

      // Template function to create the status bar
      var createStatusBar = function(location) {
          var statusBar = $('<div role="status"></div>').addClass(
            'pg-prop-status-bar'
          ).appendTo(j);
          statusBar.css('visibility', 'hidden');
          if (location == 'header') {
            statusBar.appendTo(that.header);
          } else {
            statusBar.prependTo(that.footer);
          }
          that.statusBar = statusBar;
          return statusBar;
        }.bind(panel),
        // Template function to create the button-group
        createButtons = function(buttons, location, extraClasses) {
          // Arguments must be non-zero length array of type
          // object, which contains following attributes:
          // label, type, extraClasses, register
          if (buttons && _.isArray(buttons) && buttons.length > 0) {
            // All buttons will be created within a single
            // div area.
            var btnGroup =
              $('<div class="pg-prop-btn-group"></div>'),
              // Template used for creating a button
              tmpl = _.template([
                '<button tabindex="0" type="<%= type %>" ',
                'class="btn <%=extraClasses.join(\' \')%>"',
                '<% if (disabled) { %> disabled="disabled"<% } %> title="<%-tooltip%>"',
                '<% if (label != "") {} else { %> aria-label="<%-tooltip%>"<% } %> >',
                '<span class="<%= icon %>"></span><% if (label != "") { %>&nbsp;<%-label%><% } %></button>',
              ].join(' '));
            if (location == 'header') {
              btnGroup.appendTo(that.header);
            } else {
              btnGroup.appendTo(that.footer);
            }
            if (extraClasses) {
              btnGroup.addClass(extraClasses);
            }
            _.each(buttons, function(btn) {
              // Create the actual button, and append to
              // the group div

              // icon may not present for this button
              if (!btn.icon) {
                btn.icon = '';
              }
              var b = $(tmpl(btn));
              btnGroup.append(b);
              // Register is a callback to set callback
              // for certain operation for this button.
              btn.register(b);
            });
            return btnGroup;
          }
          return null;
        }.bind(panel),
        // Callback to show object properties
        properties = function() {

          // Avoid unnecessary reloads
          var i = tree.selected(),
            d = i && tree.itemData(i),
            n = i && d && pgBrowser.Nodes[d._type],
            treeHierarchy = n.getTreeNodeHierarchy(i);

          if (_.isEqual($(this).data('node-prop'), treeHierarchy)) {
            return;
          }

          // Cache the current IDs for next time
          $(this).data('node-prop', treeHierarchy);

          if (!content.hasClass('has-pg-prop-btn-group'))
            content.addClass('has-pg-prop-btn-group');

          // We need to release any existing view, before
          // creating new view.
          if (view) {
            // Release the view
            view.remove({
              data: true,
              internal: true,
              silent: true,
            });
            // Deallocate the view
            // delete view;
            view = null;
            // Reset the data object
            j.data('obj-view', null);
          }
          // Make sure the HTML element is empty.
          j.empty();
          that.header = $('<div></div>').addClass(
            'pg-prop-header'
          ).appendTo(j);
          that.footer = $('<div></div>').addClass(
            'pg-prop-footer'
          ).appendTo(j);

          // Create a view to show the properties in fieldsets
          view = that.getView(item, 'properties', content, data, 'fieldset', undefined, j);
          if (view) {
            // Save it for release it later
            j.data('obj-view', view);

            // Create proper buttons

            var buttons = [];

            buttons.push({
              label: gettext('Edit'),
              type: 'edit',
              tooltip: gettext('Edit'),
              extraClasses: ['btn', 'btn-primary', 'pull-right', 'm-1'],
              icon: 'fa fa-sm fa-pencil',
              disabled: !that.canEdit,
              register: function(btn) {
                btn.on('click',() => {
                  onEdit();
                });
              },
            });

            buttons.push({
              label: '',
              type: 'help',
              tooltip: gettext('SQL help for this object type.'),
              extraClasses: ['btn-primary-icon', 'btn-primary-icon', 'm-1'],
              icon: 'fa fa-lg fa-info',
              disabled: (that.sqlAlterHelp == '' && that.sqlCreateHelp == '') ? true : false,
              register: function(btn) {
                btn.on('click',() => {
                  onSqlHelp();
                });
              },
            });
            createButtons(buttons, 'header', 'pg-prop-btn-group-above');
          }
          j.append(content);
        }.bind(panel),
        onSqlHelp = function() {
          // Construct the URL
          var server = that.getTreeNodeHierarchy(item).server;

          var url = pgBrowser.utils.pg_help_path;
          if (server.server_type == 'ppas') {
            url = pgBrowser.utils.edbas_help_path;
          }

          var fullUrl = '';
          if (that.sqlCreateHelp == '' && that.sqlAlterHelp != '') {
            fullUrl = help.getHelpUrl(url, that.sqlAlterHelp, server.version, server.server_type);
          } else if (that.sqlCreateHelp != '' && that.sqlAlterHelp == '') {
            fullUrl = help.getHelpUrl(url, that.sqlCreateHelp, server.version, server.server_type);
          } else {
            if (view.model.isNew()) {
              fullUrl = help.getHelpUrl(url, that.sqlCreateHelp, server.version, server.server_type);
            } else {
              fullUrl = help.getHelpUrl(url, that.sqlAlterHelp, server.version, server.server_type);
            }
          }

          window.open(fullUrl, 'postgres_help');
        }.bind(panel),

        onDialogHelp = function() {
          window.open(that.dialogHelp, 'pgadmin_help');
        }.bind(panel),

        warnBeforeChangesLost = function(warn_text, yes_callback) {
          var $props = this.$container.find('.obj_properties').first(),
            objview = $props && $props.data('obj-view'),
            self = this;

          let confirm_on_properties_close = pgBrowser.get_preferences_for_module('browser').confirm_on_properties_close;
          if (confirm_on_properties_close && confirm_close && objview && objview.model) {
            if(objview.model.sessChanged()){
              Alertify.confirm(
                gettext('Warning'),
                warn_text,
                function() {
                  setTimeout(function(){
                    yes_callback();
                  }.bind(self), 50);
                  return true;
                },
                function() {
                  return true;
                }
              ).set('labels', {
                ok: gettext('Yes'),
                cancel: gettext('No'),
              }).show();
            } else {
              return true;
            }
          } else {
            yes_callback();
            return true;
          }
        }.bind(panel),

        warnBeforeAttributeChange = function(yes_callback) {
          var $props = this.$container.find('.obj_properties').first(),
            objview = $props && $props.data('obj-view'),
            self = this;

          if (objview && objview.model && !_.isUndefined(objview.model.warn_text) && !_.isNull(objview.model.warn_text)) {
            let warn_text;
            warn_text = gettext(objview.model.warn_text);
            if(objview.model.sessChanged()){
              Alertify.confirm(
                gettext('Warning'),
                warn_text,
                function() {
                  setTimeout(function(){
                    yes_callback();
                  }.bind(self), 50);
                  return true;
                },
                function() {
                  return true;
                }
              ).set('labels', {
                ok: gettext('Yes'),
                cancel: gettext('No'),
              }).show();
            } else {
              return true;
            }
          } else {
            yes_callback();
            return true;
          }
        }.bind(panel),

        informBeforeAttributeChange = function(ok_callback) {
          var $props = this.$container.find('.obj_properties').first(),
            objview = $props && $props.data('obj-view');

          if (objview && objview.model && !_.isUndefined(objview.model.inform_text) && !_.isNull(objview.model.inform_text)) {
            Alertify.alert(
              gettext('Warning'),
              gettext(objview.model.inform_text)
            );

          }
          ok_callback();
          return true;
        }.bind(panel),

        onSave = function(_view, saveBtn) {
          var m = _view.model,
            d = m.toJSON(true),
            // Generate a timer for the request
            timer = setTimeout(function() {
              $('.obj_properties').addClass('show_progress');
            }, 1000);

          // Prevent subsequent save operation by disabling Save button
          if (saveBtn)
            $(saveBtn).prop('disabled', true);

          if (d && !_.isEmpty(d)) {
            m.save({}, {
              attrs: d,
              validate: false,
              cache: false,
              wait: true,
              success: function() {
                onSaveFunc.call();
                // Hide progress cursor
                $('.obj_properties').removeClass('show_progress');
                clearTimeout(timer);

                // Removing the node-prop property of panel
                // so that we show updated data on panel
                var pnlProperties = pgBrowser.docker.findPanels('properties')[0],
                  pnlSql = pgBrowser.docker.findPanels('sql')[0],
                  pnlStats = pgBrowser.docker.findPanels('statistics')[0],
                  pnlDependencies = pgBrowser.docker.findPanels('dependencies')[0],
                  pnlDependents = pgBrowser.docker.findPanels('dependents')[0];

                if (pnlProperties)
                  $(pnlProperties).removeData('node-prop');
                if (pnlSql)
                  $(pnlSql).removeData('node-prop');
                if (pnlStats)
                  $(pnlStats).removeData('node-prop');
                if (pnlDependencies)
                  $(pnlDependencies).removeData('node-prop');
                if (pnlDependents)
                  $(pnlDependents).removeData('node-prop');
              },
              error: function(_m, jqxhr) {
                Alertify.pgNotifier(
                  'error', jqxhr,
                  gettext('Error saving properties')
                );

                // Hide progress cursor
                $('.obj_properties').removeClass('show_progress');
                clearTimeout(timer);
                if (saveBtn)
                  $(saveBtn).prop('disabled', false);
              },
            });
          }
        }.bind(panel),

        editFunc = function() {
          var self = this;
          if (action && action == 'properties') {
            action = 'edit';
          }
          self.$container.attr('action-mode', action);
          // We need to release any existing view, before
          // creating the new view.
          if (view) {
            // Release the view
            view.remove({
              data: true,
              internal: true,
              silent: true,
            });
            // Deallocate the view
            view = null;
            // Reset the data object
            j.data('obj-view', null);
          }
          // Make sure the HTML element is empty.
          j.empty();

          that.header = $('<div></div>').addClass(
            'pg-prop-header'
          ).appendTo(j);
          that.footer = $('<div></div>').addClass(
            'pg-prop-footer'
          ).appendTo(j);

          var updateButtons = function(hasError, modified) {

            var btnGroup = this.find('.pg-prop-btn-group'),
              btnSave = btnGroup.find('button.btn-primary'),
              btnReset = btnGroup.find('button.btn-secondary[type="reset"]');

            if (hasError || !modified) {
              btnSave.prop('disabled', true);
              btnSave.attr('disabled', 'disabled');
            } else {
              btnSave.prop('disabled', false);
              btnSave.removeAttr('disabled');
            }

            if (!modified) {
              btnReset.prop('disabled', true);
              btnReset.attr('disabled', 'disabled');
            } else {
              btnReset.prop('disabled', false);
              btnReset.removeAttr('disabled');
            }
          };

          // Create a view to edit/create the properties in fieldsets
          view = that.getView(item, action, content, data, 'dialog', updateButtons, j, onCancelFunc);
          if (view) {
            // Save it to release it later
            j.data('obj-view', view);

            self.icon(
              _.isFunction(that['node_image']) ?
                (that['node_image']).apply(that, [data, view.model]) :
                (that['node_image'] || ('icon-' + that.type))
            );

            // Create proper buttons
            let btn_grp = createButtons([{
              label: '',
              type: 'help',
              tooltip: gettext('SQL help for this object type.'),
              extraClasses: ['btn-primary-icon', 'pull-left', 'mx-1'],
              icon: 'fa fa-lg fa-info',
              disabled: (that.sqlAlterHelp == '' && that.sqlCreateHelp == '') ? true : false,
              register: function(btn) {
                btn.on('click',() => {
                  onSqlHelp();
                });
              },
            }, {
              label: '',
              type: 'help',
              tooltip: gettext('Help for this dialog.'),
              extraClasses: ['btn-primary-icon', 'pull-left', 'mx-1'],
              icon: 'fa fa-lg fa-question',
              disabled: (that.dialogHelp == '') ? true : false,
              register: function(btn) {
                btn.on('click',() => {
                  onDialogHelp();
                });
              },
            }, {
              label: gettext('Cancel'),
              type: 'cancel',
              tooltip: gettext('Cancel changes to this object.'),
              extraClasses: ['btn-secondary', 'mx-1'],
              icon: 'fa fa-close pg-alertify-button',
              disabled: false,
              register: function(btn) {
                btn.on('click',() => {
                  // Removing the action-mode
                  self.$container.removeAttr('action-mode');
                  onCancelFunc.call(true);
                });
              },
            }, {
              label: gettext('Reset'),
              type: 'reset',
              tooltip: gettext('Reset the fields on this dialog.'),
              extraClasses: ['btn-secondary', 'mx-1'],
              icon: 'fa fa-recycle pg-alertify-button',
              disabled: true,
              register: function(btn) {
                btn.on('click',() => {
                  warnBeforeChangesLost.call(
                    self,
                    gettext('Changes will be lost. Are you sure you want to reset?'),
                    function() {
                      setTimeout(function() {
                        editFunc.call();
                      }, 0);
                    }
                  );
                });
              },
            }, {
              label: gettext('Save'),
              type: 'save',
              tooltip: gettext('Save this object.'),
              extraClasses: ['btn-primary', 'mx-1'],
              icon: 'fa fa-save pg-alertify-button',
              disabled: true,
              register: function(btn) {
                // Save the changes
                btn.on('click',() => {
                  warnBeforeAttributeChange.call(
                    self,
                    function() {
                      informBeforeAttributeChange.call(self, function(){
                        setTimeout(function() {
                          onSave.call(this, view, btn);
                        }, 0);
                      });
                    }
                  );
                });
              },
            }], 'footer', 'pg-prop-btn-group-below');

            btn_grp.on('keydown', 'button', function(event) {
              if (!event.shiftKey && event.keyCode == 9 && $(this).nextAll('button:not([disabled])').length == 0) {
                // set focus back to first focusable element on dialog
                view.$el.closest('.wcFloating').find('[tabindex]:not([tabindex="-1"]').first().focus();
                return false;
              }
              let btnGroup = $(self.$container.find('.pg-prop-btn-group'));
              let el = $(btnGroup).find('button:first');
              if (self.$container.find('.number-cell.editable:last').is(':visible')){
                if (event.keyCode === 9 && event.shiftKey) {
                  if ($(el).is($(event.target))){
                    $(self.$container.find('td.editable:last').trigger('click'));
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }
              }
            });

            setTimeout(function() {
              pgBrowser.keyboardNavigation.getDialogTabNavigator(self.pgElContainer);
            }, 200);
          }

          // Create status bar.
          createStatusBar('footer');

          // Add some space, so that - button group does not override the
          // space
          content.addClass('pg-prop-has-btn-group-below');

          // Show contents before buttons
          j.prepend(content);
          view.$el.closest('.wcFloating').find('.wcFrameButtonBar > .wcFrameButton[style!="display: none;"]').on('keydown', function(e) {

            if(e.shiftKey && e.keyCode === 9) {
              e.stopPropagation();
              setTimeout(() => {
                view.$el.closest('.wcFloating').find('[tabindex]:not([tabindex="-1"]):not([disabled])').last().focus();
              }, 10);
            }
          });
        }.bind(panel),
        closePanel = function(confirm_close_flag) {
          if(!_.isUndefined(confirm_close_flag)) {
            confirm_close = confirm_close_flag;
          }
          // Closing this panel
          this.close();
        }.bind(panel),
        updateTreeItem = function(obj) {
          var _old = data,
            _new = _.clone(view.model.tnode),
            info = _.clone(view.model.node_info);

          // Clear the cache for this node now.
          setTimeout(function() {
            obj.clear_cache.apply(obj, item);
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
          closePanel(false);
        },
        saveNewNode = function(obj) {
          var $props = this.$container.find('.obj_properties').first(),
            objview = $props.data('obj-view');

          // Clear the cache for this node now.
          setTimeout(function() {
            obj.clear_cache.apply(obj, item);
          }, 0);
          try {
            pgBrowser.Events.trigger(
              'pgadmin:browser:tree:add', _.clone(objview.model.tnode),
              _.clone(objview.model.node_info)
            );
          } catch (e) {
            console.warn(e.stack || e);
          }
          closePanel(false);
        }.bind(panel, that),
        editInNewPanel = function() {
          // Open edit in separate panel
          setTimeout(function() {
            that.callbacks.show_obj_properties.apply(that, [{
              'action': 'edit',
              'item': item,
            }]);
          }, 0);
        },
        onCancelFunc = closePanel,
        onSaveFunc = updateTreeItem.bind(panel, that),
        onEdit = editFunc.bind(panel);

      if (action) {
        if (action == 'create') {
          onSaveFunc = saveNewNode;
        }
        if (action != 'properties') {
          // We need to keep track edit/create mode for this panel.
          editFunc();
        } else {
          properties();
        }
      } else {
        /* Show properties */
        properties();
        onEdit = editInNewPanel.bind(panel);
      }
      if (panel.closeable()) {
        panel.on(wcDocker.EVENT.CLOSING, warnBeforeChangesLost.bind(
          panel,
          gettext('Changes will be lost. Are you sure you want to close the dialog?'),
          function() {
            panel.off(wcDocker.EVENT.CLOSING);
            panel.close();
          }
        ));

        var onCloseFunc = function() {
          var $props = this.$container.find('.obj_properties').first(),
            objview = $props && $props.data('obj-view');

          if (objview) {
            objview.remove({
              data: true,
              internal: true,
              silent: true,
            });
          }
        }.bind(panel);
        panel.on(wcDocker.EVENT.CLOSED, onCloseFunc);
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
      var opURL = {
          'create': 'obj',
          'drop': 'obj',
          'edit': 'obj',
          'properties': 'obj',
          'statistics': 'stats',
        },
        self = this,
        priority = -Infinity;

      var treeInfo = (_.isUndefined(item) || _.isNull(item)) ?
        info || {} : this.getTreeNodeHierarchy(item);
      var actionType = type in opURL ? opURL[type] : type;
      var itemID = with_id && d._type == self.type ? encodeURIComponent(d._id) : '';

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

      var nodePickFunction = function(treeInfoValue) {
        return (treeInfoValue.priority <= jump_after_priority || treeInfoValue.priority == priority);
      };

      return generateUrl.generate_url(pgBrowser.URL, treeInfo, actionType, self.type, nodePickFunction, itemID);
    },
    // Base class for Node Data Collection
    Collection: pgBrowser.DataCollection,
    // Base class for Node Data Model
    Model: pgBrowser.DataModel,
    getTreeNodeHierarchy: pgadminTreeNode.getTreeNodeHierarchyFromIdentifier.bind(pgBrowser),
    cache: function(url, node_info, level, data) {
      var cached = this.cached = this.cached || {},
        hash = url,
        min_priority = (
          node_info && node_info[level] && node_info[level].priority
        ) || 0;

      if (node_info) {
        _.each(_.sortBy(_.values(_.pick(
          node_info,
          function(v) {
            return (v.priority <= min_priority);
          }
        )), function(o) {
          return o.priority;
        }), function(o) {
          hash = commonUtils.sprintf('%s/%s', hash, encodeURI(o._id));
        });
      }

      if (_.isUndefined(data)) {
        var res = cached[hash];

        if (!_.isUndefined(res) &&
          (res.at - Date.now() > 300000)) {
          res = undefined;
        }
        return res;
      }

      res = cached[hash] = {
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
      var self = this;
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
          for (var parent in this.parent_type) {
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
