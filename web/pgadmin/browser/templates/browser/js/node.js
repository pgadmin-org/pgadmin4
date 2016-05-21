define(
    ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser.menu',
     'backbone', 'alertify', 'pgadmin.browser.datamodel', 'backform',
     'pgadmin.backform', 'wcdocker', 'pgadmin.alertifyjs'],
function($, _, S, pgAdmin, Menu, Backbone, Alertify, pgBrowser, Backform) {

  var wcDocker = window.wcDocker;

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
  pgBrowser.Node.extend = function(props) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is defined to simply call
    // the parent's constructor.
    child = function(){ return parent.apply(this, arguments); };

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, _.omit(props, 'callbacks'));

    // Make sure - a child have all the callbacks of the parent.
    child.callbacks = _.extend({}, parent.callbacks, props.callbacks);

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

    title: function(d) {
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
        name: 'show_obj_properties', node: self.type, module: self,
        applies: ['object', 'context'], callback: 'show_obj_properties',
        priority: 3, label: '{{ _("Properties...") }}',
        data: {'action': 'edit'}, icon: 'fa fa-pencil-square-o'
      }, {
        name: 'refresh', node: self.type, module: self,
        applies: ['object', 'context'], callback: 'refresh',
        priority: 2, label: '{{ _("Refresh...") }}',
        icon: 'fa fa-refresh'
      }]);

      if (self.canDrop) {
        pgAdmin.Browser.add_menus([{
          name: 'delete_object', node: self.type, module: self,
          applies: ['object', 'context'], callback: 'delete_obj',
          priority: 3, label: '{{ _("Delete/Drop") }}',
          data: {'url': 'drop'}, icon: 'fa fa-trash',
          enable: _.isFunction(self.canDrop) ?
            function() {
              return !!(self.canDrop.apply(self, arguments));
            } : (!!self.canDrop)
        }]);
        if (self.canDropCascade) {
          pgAdmin.Browser.add_menus([{
            name: 'delete_object_cascade', node: self.type, module: self,
            applies: ['object', 'context'], callback: 'delete_obj',
            priority: 3, label: '{{ _("Drop Cascade") }}',
            data: {'url': 'delete'}, icon: 'fa fa-trash',
            enable: _.isFunction(self.canDropCascade) ?
              function() { return self.canDropCascade.apply(self, arguments); } : (!!self.canDropCascade)
          }]);
        }
      }
      // This will add options of scripts eg:'CREATE Script'
      if (self.hasScriptTypes && _.isArray(self.hasScriptTypes)
        &&  self.hasScriptTypes.length > 0) {
          // For each script type create menu
          _.each(self.hasScriptTypes, function(stype) {

            var type_label = S(
                "{{ _("%%s Script") }}"
                ).sprintf(stype.toUpperCase()).value(),
              stype = stype.toLowerCase();

            // Adding menu for each script type
            pgAdmin.Browser.add_menus([{
              name: 'show_script_' + stype, node: self.type, module: self,
              applies: ['object', 'context'], callback: 'show_script',
              priority: 3, label: type_label, category: 'Scripts',
              data: {'script': stype}, icon: 'fa fa-pencil',
              enable: this.check_user_permission
            }]);
          });
      // If node has hasSQL then provide CREATE Script by default
      } else if(self.hasSQL) {
          pgAdmin.Browser.add_menus([{
            name: 'show_script_create', node: self.type, module: self,
            applies: ['object', 'context'], callback: 'show_script',
            priority: 3, label: 'CREATE Script', category: 'Scripts',
            data: {'script': 'create'}, icon: 'fa fa-pencil',
            enable: this.check_user_permission
          }]);
      }
    },
    ///////
    // Checks if Script Type is allowed to user
    // First check if role node & create role allowed
    // Otherwise test rest of database objects
    // if no permission matched then do not allow create script
    ///////
    check_user_permission: function(itemData, item, data) {
      var node = pgBrowser.Nodes[itemData._type],
        parentData = node.getTreeNodeHierarchy(item);
      if ( _.indexOf(['create','insert','update', 'delete'], data.script) != -1) {
        if (itemData.type == 'role' &&
          parentData.server.user.can_create_role) {
          return true;
        } else if (parentData.server.user.is_superuser ||
          parentData.server.user.can_create_db ||
          (parentData.schema && parentData.schema.can_create)) {
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
    getView: function(item, type, el, node, formType, callback, ctx) {
      var that = this;

      if (!this.type || this.type == '')
        // We have no information, how to generate view for this type.
        return null;

      if (this.model) {
        // This will be the URL, used for object manipulation.
        // i.e. Create, Update in these cases
        var urlBase = this.generate_url(item, type, node, false);

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
            newModel = new (this.model.extend({urlRoot: urlBase})) (
                attrs, {node_info: info}
                ),
            fields = Backform.generateViewSchema(
                info, newModel, type, this, node
                );

        if (type == 'create' || type == 'edit') {

          if (callback && ctx) {
              callback = callback.bind(ctx);
          } else {
            callback = function() {
              console.log("Broke something!!! Why we don't have the callback or the context???");
            };
          }

          var onSessionInvalid = function(msg) {

            if(!_.isUndefined(that.statusBar)) {
              that.statusBar.html(msg).css("visibility", "visible");
            }
            callback(true);

            return true;
          };

          var onSessionValidated =  function(sessHasChanged) {

            if(!_.isUndefined(that.statusBar)) {
              that.statusBar.empty().css("visibility", "hidden");
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
            view = new Backform.Fieldset({
              el: el, model: newModel, schema: fields
            });
          } else {
            // This generates a view to be used by the node dialog
            // (for create/edit operation).
            view = new Backform.Dialog({
              el: el, model: newModel, schema: fields
            });
          }

          if (!newModel.isNew()) {
            // This is definetely not in create mode
            newModel.fetch()
              .success(function(res, msg, xhr) {
                // We got the latest attributes of the
                // object. Render the view now.
                view.render();
                if (type != 'properties') {
                  $(el).focus();
                }
                newModel.startNewSession();
              })
              .error(function(jqxhr, error, message) {
                // TODO:: We may not want to continue from here
                Alertify.pgNotifier(
                  error, jqxhr,
                  S(
                    "{{ _("Error retrieving the properties - %%s.") }}"
                    ).sprintf(message).value()
                  );
              });
          } else {
            // Yay - render the view now!
            $(el).focus();
            view.render();
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

      p = new pgBrowser.Panel({
          name: 'node_props',
          showTitle: true,
          isCloseable: true,
          isPrivate: true,
          content: '<div class="obj_properties"><div class="alert alert-info pg-panel-message">{{ _('Please wait while we fetch information about the node from the server!') }}</div></div>',
            onCreate: function(myPanel, $container) {
              $container.addClass('pg-no-overflow');
            }
        });
      p.load(pgBrowser.docker);
    },
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
    // List of common callbacks - that can be used for different
    // operations!
    callbacks: {
      /******************************************************************
       * This function allows to create/edit/show properties of any
       * object depending on the arguments provided.
       *
       * args must be a object containing:
       *   action - create/edit/properties
       *   item   - The properties of the item (tree ndoe item)
       *
       * NOTE:
       * if item is not provided, the action will be done on the
       * currently selected tree item node.
       *
       **/
      show_obj_properties: function(args, item) {
        var t = pgBrowser.tree,
          i = args.item || item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined
          o = this,
          l = o.title.apply(this, [d]);

        // Make sure - the properties dialog type registered
        pgBrowser.Node.register_node_panel();

        // No node selected.
        if (!d)
          return;

        var self = this,
            isParent = (_.isArray(this.parent_type) ?
              function(d) {
                return (_.indexOf(self.parent_type, d._type) != -1);
              } : function(d) {
                return (self.parent_type == d._type);
              }),
            addPanel = function() {
              var d = window.document,
                  b = d.body,
                  el = d.createElement('div');

              d.body.insertBefore(el, d.body.firstChild);

              var pW = screen.width < 800 ? '95%' : '70%',
                  pH = screen.height < 600 ? '95%' : '70%';
                  w = pgAdmin.toPx(el, self.width || pW, 'width', true),
                  h = pgAdmin.toPx(el, self.height|| pH, 'height', true),
                  x = (b.offsetWidth - w) / 2,
                  y = (b.offsetHeight - h) / 2;

              p = pgBrowser.docker.addPanel(
                'node_props', wcDocker.DOCK.FLOAT, undefined,
                {w: w + 'px', h: h + 'px', x: x + 'px', y: y + 'px'}
              );

              b.removeChild(el);
              delete(el);

              return p;
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
              pd = t.itemData(i);

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

          if (!d)
            return;

          l = S('{{ _("Create - %%s") }}').sprintf(
              [this.label]).value();
          p = addPanel();

          setTimeout(function() {
            o.showProperties(i, d, p, args.action);
          }, 10);
        } else {
          if (pgBrowser.Node.panels && pgBrowser.Node.panels[d.id] &&
              pgBrowser.Node.panels[d.id].$container) {
            p = pgBrowser.Node.panels[d.id];
            /**  TODO ::
             *  Run in edit mode (if asked) only when it is
             *  not already been running edit mode
             **/
            var mode = p.$container.attr('action-mode');
            if (mode) {
              var msg = '{{ _('Are you sure want to stop editing the properties of the %%s - "%%s"?') }}';
              if (args.action == 'edit') {
                msg = '{{ _('Are you sure want to reset the current changes and re-open the panel for %%s - "%%s"?') }}';
              }

              Alertify.confirm(
                '{{ _('Edit in progress?') }}',
                S(msg).sprintf(o.label, d.label).value(),
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
          var input = args || {'url':'drop'};
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

          msg = S('{{ _('Are you sure you want to drop %%s "%%s" and all the objects that depend on it?') }}')
            .sprintf(obj.label, d.label).value();
          title = S('{{ _('DROP CASCADE %%s?') }}').sprintf(obj.label).value();

          if (!(_.isFunction(obj.canDropCascade) ?
                obj.canDropCascade.apply(obj, [d, i]) : obj.canDropCascade)) {
            Alertify.notify(
                S('The %s "%s" can not be dropped!')
                .sprintf(obj.label, d.label).value(),
                'error',
                10
                );
            return;
          }
        } else {
          msg = S('{{ _('Are you sure you want to drop %%s "%%s"?') }}')
            .sprintf(obj.label, d.label).value();
          title = S('{{ _('DROP %%s?') }}').sprintf(obj.label).value();

          if (!(_.isFunction(obj.canDrop) ?
                obj.canDrop.apply(obj, [d, i]) : obj.canDrop)) {
            Alertify.notify(
                S('The %s "%s" can not be dropped!')
                .sprintf(obj.label, d.label).value(),
                'error', 10
                );
            return;
          }
        }
        Alertify.confirm(title, msg,
          function() {
            $.ajax({
              url: obj.generate_url(i, input.url, d, true),
              type:'DELETE',
              success: function(res) {
                if (res.success == 0) {
                  pgBrowser.report_error(res.errormsg, res.info);
                } else {
                  var n = t.next(i);
                  if (!n || !n.length)
                    n = t.prev(i);
                  t.remove(i);
                  if (n.length) {
                    t.select(n);
                  }
                }
                return true;
              },
              error: function(jqx) {
                var msg = jqx.responseText;
                /* Error from the server */
                if (jqx.status == 417 || jqx.status == 410 || jqx.status == 500) {
                  try {
                    var data = $.parseJSON(jqx.responseText);
                    msg = data.errormsg;
                  } catch (e) {}
                }
                pgBrowser.report_error(
                    S('{{ _('Error dropping %%s: "%%s"') }}')
                      .sprintf(obj.label, objName)
                        .value(), msg);
              }
            });
          },
          null).show()
      },
      // Callback for creating script(s) & opening them in Query editor
      show_script: function(args, item) {
        var scriptType = args.script,
          obj = this,
          t = pgBrowser.tree,
          i = item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

        if (!d)
          return;

        /*
         * Make sure - we're using the correct version of node
         */
        obj = pgBrowser.Nodes[d._type];
        var objName = d.label;

        // URL for script type
        if(scriptType == 'insert') {
          sql_url = 'insert_sql';
        } else if(scriptType == 'update') {
          sql_url = 'update_sql';
        } else if(scriptType == 'delete') {
          sql_url = 'delete_sql';
        } else if(scriptType == 'select') {
          sql_url = 'select_sql';
        } else if(scriptType == 'exec') {
          sql_url = 'exec_sql';
        } else {
          // By Default get CREATE SQL
          sql_url = 'sql';
        }
        // Open data grid & pass the URL for fetching
        pgAdmin.DataGrid.show_query_tool.apply(
          this, [obj.generate_url(i, sql_url, d, true), i]
        );
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
          if ('sql' in b.panels &&
              b.panels['sql'] &&
              b.panels['sql'].panel &&
              b.panels['sql'].panel.isVisible()) {
            // TODO:: Show reverse engineered query for this object (when 'sql'
            // tab is active.)
          }
          if ('statistics' in b.panels &&
              b.panels['statistics'] &&
              b.panels['statistics'].panel &&
              b.panels['statistics'].panel.isVisible()) {
            // TODO:: Show statistics for this object (when the 'statistics'
            // tab is active.)
          }
          if ('dependencies' in b.panels &&
              b.panels['dependencies'] &&
              b.panels['dependencies'].panel &&
              b.panels['dependencies'].panel.isVisible()) {
            // TODO:: Show dependencies for this object (when the
            // 'dependencies' tab is active.)
          }
          if ('dependents' in b.panels &&
              b.panels['dependents'] &&
              b.panels['dependents'].panel &&
              b.panels['dependents'].panel.isVisible()) {
            // TODO:: Show dependents for this object (when the 'dependents'
            // tab is active.)
          }
        }

        return true;
      },
      removed: function(item) {
        var self = this;
        setTimeout(function() { self.clear_cache.apply(self, item); }, 0);
      },
      refresh: function(n, i) {
        var self = this,
            t = pgBrowser.tree,
            d = t.itemData(i);

        if (t.isInode(i) && t.wasLoad(i))
            t.unload(i);
        t.setInode(i, (d && d.inode) || false);
        t.deselect(i);

        setTimeout(function() {
          t.select(i);
        }, 10);
      }
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
        content = $('<div tabindex="1"></div>')
          .addClass('pg-prop-content col-xs-12'),

        // Template function to create the status bar
        createStatusBar = function(location){
            var statusBar = $('<div></div>').addClass(
                      'pg-prop-status-bar'
                      ).appendTo(j);
            statusBar.css("visibility", "hidden");
            if (location == "header") {
                statusBar.appendTo(that.header);
            } else {
                statusBar.prependTo(that.footer);
            }
            that.statusBar = statusBar;
            return statusBar;
        }.bind(panel),
        // Template function to create the button-group
        createButtons = function(buttons, location, extraClasses) {
          var panel = this;

          // arguments must be non-zero length array of type
          // object, which contains following attributes:
          // label, type, extraClasses, register
          if (buttons && _.isArray(buttons) && buttons.length > 0) {
            // All buttons will be created within a single
            // div area.
            var btnGroup =
              $('<div></div>').addClass(
                  'pg-prop-btn-group'
                  ),
              // Template used for creating a button
              tmpl = _.template([
                '<button type="<%= type %>" ',
                'class="btn <%=extraClasses.join(\' \')%>"',
                '<% if (disabled) { %> disabled="disabled"<% } %> title="<%-tooltip%>">',
                '<span class="<%= icon %>"></span><% if (label != "") { %>&nbsp;<%-label%><% } %></button>'
                ].join(' '));
            if (location == "header"){
                btnGroup.appendTo(that.header);
            }else{
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
                btn.icon = "";
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

          var panel = this;

          if (!content.hasClass('has-pg-prop-btn-group'))
            content.addClass('has-pg-prop-btn-group');

          // We need to release any existing view, before
          // creating new view.
          if (view) {
            // Release the view
            view.remove({data: true, internal: true, silent: true});
            // Deallocate the view
            delete view;
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
          view = that.getView(item, 'properties', content, data, 'fieldset');
          if (view) {
            // Save it for release it later
            j.data('obj-view', view);

            // Create status bar
            createStatusBar('footer');

            // Create proper buttons

            var buttons = [];
            buttons.push({
              label: '', type: 'edit',
              tooltip: '{{ _("Edit") }}',
              extraClasses: ['btn-default'],
              icon: 'fa fa-lg fa-pencil-square-o',
              disabled: false,
              register: function(btn) {
                btn.click(function() {
                  onEdit();
                });
              }
            });
            buttons.push({
              label: '', type: 'help',
              tooltip: '{{ _("SQL help for this object type.") }}',
              extraClasses: ['btn-default', 'pull-right'],
              icon: 'fa fa-lg fa-info',
              disabled: (that.sqlAlterHelp == '' && that.sqlCreateHelp == '') ? true : false,
              register: function(btn) {
                btn.click(function() {
                  onSqlHelp();
                });
              }
            });

            createButtons(buttons, 'header', 'pg-prop-btn-group-above');
          }
          j.append(content);
        }.bind(panel),
        onSqlHelp = function() {
          var panel = this;
          // See if we can find an existing panel, if not, create one
          pnlSqlHelp = pgBrowser.docker.findPanels('pnl_sql_help')[0];

          if (pnlSqlHelp == null) {
            pnlProperties = pgBrowser.docker.findPanels('properties')[0];
            pgBrowser.docker.addPanel('pnl_sql_help', wcDocker.DOCK.STACKED, pnlProperties);
            pnlSqlHelp = pgBrowser.docker.findPanels('pnl_sql_help')[0];
          }

          // Construct the URL
          server = that.getTreeNodeHierarchy(item).server;

          url = '{{ pg_help_path }}'
          if (server.server_type == 'ppas') {
            url = '{{ edbas_help_path }}'
          }

          major = Math.floor(server.version / 10000)
          minor = Math.floor(server.version / 100) - (major * 100)

          url = url.replace('$VERSION$', major + '.' + minor)
          if (!S(url).endsWith('/')) {
            url = url + '/'
          }
          if (that.sqlCreateHelp == '' && that.sqlAlterHelp != '') {
              url = url + that.sqlAlterHelp
          } else if (that.sqlCreateHelp != '' && that.sqlAlterHelp == '') {
              url = url + that.sqlCreateHelp
          } else {
            if (view.model.isNew()) {
              url = url + that.sqlCreateHelp
            } else {
              url = url + that.sqlAlterHelp
            }
          }

          // Update the panel
          iframe = $(pnlSqlHelp).data('embeddedFrame');
          pnlSqlHelp.title('SQL: ' + that.label);

          pnlSqlHelp.focus();
          iframe.openURL(url);
        }.bind(panel),

        onDialogHelp = function() {
          var panel = this;
          // See if we can find an existing panel, if not, create one
          pnlDialogHelp = pgBrowser.docker.findPanels('pnl_online_help')[0];

          if (pnlDialogHelp == null) {
            pnlProperties = pgBrowser.docker.findPanels('properties')[0];
            pgBrowser.docker.addPanel('pnl_online_help', wcDocker.DOCK.STACKED, pnlProperties);
            pnlDialogHelp = pgBrowser.docker.findPanels('pnl_online_help')[0];
          }

          // Update the panel
          iframe = $(pnlDialogHelp).data('embeddedFrame');

          pnlDialogHelp.focus();
          iframe.openURL(that.dialogHelp);
        }.bind(panel),

        editFunc = function() {
          var panel = this;
          if (action && action == 'properties') {
            action = 'edit';
          }
          panel.$container.attr('action-mode', action);
          // We need to release any existing view, before
          // creating the new view.
          if (view) {
            // Release the view
            view.remove({data: true, internal: true, silent: true});
            // Deallocate the view
            delete view;
            view = null;
            // Reset the data object
            j.data('obj-view', null);
          }
          // Make sure the HTML element is empty.
          j.empty();

          that.header = $('<div></div>').addClass(
                      'pg-prop-header'
                      ).appendTo(j)
          that.footer = $('<div></div>').addClass(
                      'pg-prop-footer'
                      ).appendTo(j);

          var updateButtons = function(hasError, modified) {

            var btnGroup = this.find('.pg-prop-btn-group'),
                btnSave = btnGroup.find('button.btn-primary'),
                btnReset = btnGroup.find('button.btn-warning');

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
          view = that.getView(item, action, content, data, 'dialog', updateButtons, j);
          if (view) {
            // Save it to release it later
            j.data('obj-view', view);

            panel.icon(
                _.isFunction(that['node_image']) ?
                  (that['node_image']).apply(that, [data, view.model]) :
                  (that['node_image'] || ('icon-' + that.type))
                );

            // Create proper buttons
            createButtons([{
              label: '', type: 'help',
              tooltip: '{{ _("SQL help for this object type.") }}',
              extraClasses: ['btn-default', 'pull-left'],
              icon: 'fa fa-lg fa-info',
              disabled: (that.sqlAlterHelp == '' && that.sqlCreateHelp == '') ? true : false,
              register: function(btn) {
                btn.click(function() {
                  onSqlHelp();
                });
              }
            },{
              label: '', type: 'help',
              tooltip: '{{ _("Help for this dialog.") }}',
              extraClasses: ['btn-default', 'pull-left'],
              icon: 'fa fa-lg fa-question',
              disabled: (that.dialogHelp == '') ? true : false,
              register: function(btn) {
                btn.click(function() {
                  onDialogHelp();
                });
              }
            },{
              label: '{{ _("Save") }}', type: 'save',
              tooltip: '{{ _("Save this object.") }}',
              extraClasses: ['btn-primary'],
              icon: 'fa fa-lg fa-save',
              disabled: true,
              register: function(btn) {
                // Save the changes
                btn.click(function() {
                  var m = view.model,
                    d = m.toJSON(true);
                  if (d && !_.isEmpty(d)) {
                    m.save({}, {
                      attrs: d,
                      validate: false,
                      cache: false,
                      success: function() {
                        onSaveFunc.call();
                      },
                      error: function(m, jqxhr) {
                        Alertify.pgNotifier(
                          "error", jqxhr,
                          S(
                            "{{ _("Error during saving properties: %%s!") }}"
                            ).sprintf(jqxhr.statusText).value()
                          );
                      }
                    });
                  }
                });
              }
            },{
              label: '{{ _('Cancel') }}', type: 'cancel',
              tooltip: '{{ _("Cancel changes to this object.") }}',
              extraClasses: ['btn-danger'],
              icon: 'fa fa-lg fa-close',
              disabled: false,
              register: function(btn) {
                btn.click(function() {
                  // Removing the action-mode
                  panel.$container.removeAttr('action-mode');
                  onCancelFunc.call(arguments);
                });
              }
            },{
              label: '{{ _('Reset') }}', type: 'reset',
              tooltip: '{{ _("Reset the fields on this dialog.") }}',
              extraClasses: ['btn-warning'],
              icon: 'fa fa-lg fa-recycle',
              disabled: true,
              register: function(btn) {
                btn.click(function() {
                  setTimeout(function() { editFunc.call(); }, 0);
                });
              }
            }],'footer' ,'pg-prop-btn-group-below');
          };

          // Create status bar.
          createStatusBar('footer');

          // Add some space, so that - button group does not override the
          // space
          content.addClass('pg-prop-has-btn-group-below');

          // Show contents before buttons
          j.prepend(content);
        }.bind(panel),
        closePanel = function() {
          // Closing this panel
          this.close();
        }.bind(panel),
        updateTreeItem = function(that) {
          var panel = this;

          // Clear the cache for this node now.
          setTimeout(function() { that.clear_cache.apply(that, item); }, 0);

          // Update the item lable (if label is modified.)
          if (view.model.tnode) {
            var itemData = tree.itemData(item),
                icon = itemData.icon,
                newNodeData = view.model.tnode;

            tree.addIcon(item, {icon: newNodeData.icon});
            tree.setLabel(item, {label: newNodeData.label});
            _.extend(itemData, newNodeData);
          } else if (view.model.get('name')) {
            tree.setLabel(item, {label: view.model.get("name")});
            if (
              view.model.get('data').icon && view.model.get('data').icon != ''
            )
              tree.addIcon(item, {icon: view.model.get('data').icon});
          }
          tree.deselect(item);
          panel.$container.removeAttr('action-mode');
          setTimeout(function() { closePanel(); }, 0);
          setTimeout(function() { tree.select(item, {focus: true}); }, 10);

          pgBrowser.Events.trigger(
            'pgadmin-node:updated:' + that.type, item, that
          );
        },
        saveNewNode = function(that) {
          var panel = this;

          // Clear the cache for this node now.
          setTimeout(function() { that.clear_cache.apply(that, item); }, 0);

          /* TODO:: Create new tree node for this */
          if (view.model.tnode && '_id' in view.model.tnode) {
            var d = _.extend({}, view.model.tnode),
              func = function(i) {
                setTimeout(function() {closePanel();}, 0);
                if (i) {
                  tree.select(i, {focus: true});
                }
                pgBrowser.Events.trigger(
                  'pgadmin-node:created:' + that.type, i, that
                );
              }, found = false;

            delete view.model.tnode;

            if (that.parent_type) {
              if (tree.wasLoad(item)) {
                var first = tree.first(item, false),
                    data = first && first.length && tree.itemData(first);

                // We found the same type of object here, we can append it
                // here.
                if (data && data._type == that.type) {
                  tree.append(item, {
                    itemData: d,
                    success: function(i, o) {
                      func(o.items.eq(0));
                    },
                    fail: function() {
                      // We still want to close the panel
                      console.log(arguments);
                      func(null);
                    }
                  });
                  return;
                } else {
                  var children = tree.children(item, false, false);

                  if (children) {
                    _.each(children, function(child) {
                      if (found)
                        return;
                      var j = $(child);
                      data = tree.itemData(j);

                      if (data && data._type && data._type in pgBrowser.Nodes) {
                        node = pgBrowser.Nodes[data._type];

                        if (node && ((node.node && node.node == that.type) ||
                                node.type == that.collection_type)) {
                          found = true;
                          if (tree.wasLoad(j)) {
                            tree.append(j, {
                              itemData: d,
                              success: function(i, o) {
                                func(o.items.eq(0));
                              }
                            });
                          } else {
                            /*
                             * This is not yet loaded, hence - we need to expand
                             * it, and find the actual object.
                             */
                            if (!tree.isInode(j)) {
                              tree.setInode(j);
                            }
                            tree.open(j, {
                              success: function() {
                                var children = tree.children(j, false, false),
                                    stop = false;

                                _.each(children, function(child) {

                                  if (stop)
                                    return;

                                  var j = $(child),
                                      data = tree.itemData(j);

                                  if (d._id == data._id) {
                                    stop = true;
                                    func(j);
                                  }
                                });
                                func(null);
                              },
                              fail: function() {
                                // We would still like to close it.
                                console.log(arguments);
                                func(null);
                              }
                            });
                          }
                        }
                      }
                    });
                  }
                }
                /*
                 * We already added the node at required place, stop going
                 * ahead.
                 */
                if (found)
                  return;

                /* When no children found, it was loaded.
                 * It sets the item to non-inode.
                 */
                if (!tree.isInode(item)) {
                    tree.setInode(item);
                }
                tree.open(item, {
                  success: function() {
                    var s = tree.search(item, {
                      search: d.id,
                      callback: function(i, s) {
                        var data = tree.itemData(i);

                        return (d._id == data._id);
                      },
                      success: function(i, o) {
                        func(i);
                      },
                      fail: function() {
                        // We would still like to close it.
                        console.log(arguments);
                        func(null);
                      }
                    });

                  },
                  fail: function() {
                    // We would still like to close it.
                    console.log(arguments);
                    func(null);
                  }
                });
              } else {
                func(null);
              }
            } else {
              tree.append(null, {
                itemData: d,
                success: function(i, o) {
                  func(i);
                },
                fail: function() {
                  // We would still like to close it.
                  console.log(arguments);
                  func(null);
                }
              });
            }
          } else {
            /*
             * Sometime we don't get node in response even though it's saved
             * on server. In such case just reload the collection to get newly
             * created nodes.
             */

            var children = tree.children(item, false, false),
                openNode = function(item, animation){
                  tree.open(item, {
                    success: function (item, options){
                      setTimeout(function() {closePanel();}, 0);
                      pgBrowser.Events.trigger(
                        'pgadmin-node:created:' + that.type, item, that
                      );
                    },
                    fail: function (item, options){
                      setTimeout(function() {closePanel();}, 0);
                      pgBrowser.Events.trigger(
                        'pgadmin-node:created:' + that.type, item, that
                      );
                    },
                    unanimated: animation
                  });
                };

            if (children) {
              _.each(children, function(child) {
                var $child = $(child),
                    data = tree.itemData($child);
                if (data._type == that.collection_type){
                  // We found collection which need to reload.
                  if (tree.wasLoad($child)) {
                    tree.unload($child, {
                      success: function (item, options){
                        openNode(item, true);
                      },
                      fail: function (item, options){
                        setTimeout(function() {closePanel();}, 0);
                      },
                      unanimated: true
                    });
                  } else {
                    openNode($child, false);
                  }
                }
              });
              return;
            }
            setTimeout(function() {closePanel();}, 0);
          }
        }.bind(panel, that),
        editInNewPanel = function() {
          // Open edit in separate panel
          setTimeout(function() {
            that.callbacks.show_obj_properties.apply(that, [{
              'action': 'edit',
              'item': item
            }]);
          }, 0);
        },
        onCancelFunc = closePanel,
        onSaveFunc = updateTreeItem.bind(panel, that),
        onEdit = editFunc.bind(panel);

      if (action) {
        if (action == 'create'){
          onCancelFunc = closePanel;
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
        var onCloseFunc = function() {
          var j = this.$container.find('.obj_properties').first(),
              view = j && j.data('obj-view');

          if (view) {
            view.remove({data: true, internal: true, silent: true});
          }
        }.bind(panel);
        panel.on(wcDocker.EVENT.CLOSED, onCloseFunc);
      }
    },
    /**********************************************************************
     * Generate the URL for different operations
     *
     * arguments:
     *   type:  Create/drop/edit/properties/sql/depends/statistics
     *   d:     Provide the ItemData for the current item node
     *   with_id: Required id information at the end?
     *
     * Supports url generation for create, drop, edit, properties, sql,
     * depends, statistics
     */
    generate_url: function(item, type, d, with_id, info) {
      var url = pgAdmin.Browser.URL + '{TYPE}/{REDIRECT}{REF}',
        opURL = {
          'create': 'obj', 'drop': 'obj', 'edit': 'obj',
          'properties': 'obj', 'statistics': 'stats'
        },
        ref = '', self = this,
        priority = -Infinity;

      info = (_.isUndefined(item) || _.isNull(item)) ?
        info || {} : this.getTreeNodeHierarchy(item);

      if (self.parent_type) {
        if (_.isString(self.parent_type)) {
          var p = info[self.parent_type];
          if (p) {
            priority = p.priority;
          }
        } else {
          _.each(self.parent_type, function(o) {
            var p = info[o];
            if (p) {
              if (priority < p.priority) {
                priority = p.priority;
              }
            }
          });
        }
      }

      _.each(
        _.sortBy(
          _.values(
           _.pick(info,
            function(v, k, o) {
              return (v.priority <= priority);
            })
           ),
          function(o) { return o.priority; }
          ),
        function(o) {
          ref = S('%s/%s').sprintf(ref, encodeURI(o._id)).value();
        });

      ref = S('%s/%s').sprintf(
          ref, with_id && d._type == self.type ? d._id : ''
          ).value();

      var args = {
        'TYPE': self.type,
        'REDIRECT': (type in opURL ? opURL[type] : type),
        'REF': ref
      };

      return url.replace(/{(\w+)}/g, function(match, arg) {
        return args[arg];
      });
    },
    // Base class for Node Data Collection
    Collection: pgBrowser.DataCollection,
    // Base class for Node Data Model
    Model: pgBrowser.DataModel,
    getTreeNodeHierarchy: function(i) {
      var idx = 0,
          res = {},
          t = pgBrowser.tree;
      do {
        d = t.itemData(i);
        if (d._type in pgBrowser.Nodes && pgBrowser.Nodes[d._type].hasId) {
          res[d._type] = _.extend({}, d, {
            'priority': idx
          });
          idx -= 1;
        }
        i = t.hasParent(i) ? t.parent(i) : null;
      } while (i);

      return res;
    },
    cache: function(url, node_info, level, data) {
      var cached = this.cached = this.cached || {},
          hash = url,
          min_priority = (
              node_info && node_info[level] && node_info[level].priority
              ) || 0;

      if (node_info) {
        _.each(
            _.sortBy(
              _.values(
                _.pick(
                  node_info,
                  function(v, k, o) {
                    return (v.priority <= min_priority);
                  })),
              function(o) { return o.priority; }),
            function(o) {
              hash = S('%s/%s').sprintf(hash, encodeURI(o._id)).value();
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

      res = cached[hash] = {data: data, at: Date.now(), level: level};

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
    }
  });

  return pgAdmin.Browser.Node;
});
