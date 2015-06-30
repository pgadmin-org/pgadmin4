define(
    ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser.menu',
     'backbone', 'alertify', 'backform', 'pgadmin.backform', 'wcdocker'],
function($, _, S, pgAdmin, Menu, Backbone, Alertify, Backform) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};
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

  // Defines - which control needs to be instantiated in different modes.
  // i.e. Node properties, create, edit, etc.
  var controlType = {
    'properties': {
      'int': 'uneditable-input',
      'text': 'uneditable-input',
      'numeric': 'uneditable-input',
      'date': 'date',
      'boolean': 'bool-text',
      'options': 'uneditable-input',
      'multiline': 'textarea'
    },
    'edit': {
      'int': 'input',
      'text': 'input',
      'numeric': 'input',
      'date': 'date',
      'boolean': 'boolean',
      'options': 'select',
      'multiline': 'textarea'
    },
    'create': {
      'int': 'input',
      'text': 'input',
      'numeric': 'input',
      'date': 'date',
      'boolean': 'boolean',
      'options': 'select',
      'multiline': 'textarea'
    }
  };

  _.extend(pgAdmin.Browser.Node, {
    // Node type
    type: undefined,
    // Label
    label: '',
    title: function(d) {
      return d ? d.label : '';
    },
    ///////
    // Initialization function
    // Generally - used to register the menus for this type of node.
    //
    // Also, look at pgAdmin.Browser.add_menus(...) function.
    //
    // NOTE: Override this for each node for initialization purpose
    Init: function() {
      if (this.node_initialized)
        return;
      this.node_initialized = true;

      pgAdmin.Browser.add_menus([{
        name: 'show_obj_properties', node: this.type, module: this,
        applies: ['object', 'context'], callback: 'show_obj_properties',
        priority: 3, label: '{{ _("Properties...") }}',
        data: {'action': 'properties'}, icon: 'fa fa-th-list'
      }]);
    },
    ///////
    // Generate a Backform view using the node's model type
    //
    // Used to generate view for the particular node properties, edit,
    // creation.
    getView: function(type, el, node, formType, callback) {

      if (!this.type || this.type == '' || !type in controlType)
        // We have no information, how to generate view for this type.
        return null;

      if (this.model) {
        // This will be the URL, used for object manipulation.
        // i.e. Create, Update in these cases
        var urlBase = this.generate_url(type, node);

        if (!urlBase)
          // Ashamed of myself, I don't know how to manipulate this
          // node.
          return null;

        var opts = {};

        // In order to get the object data from the server, we must set
        // object-id in the model (except in the create mode).
        if (type !== 'create') {
          opts[this.model.idAttribute || 'id'] = node._id;
        }

        // We know - which data model to be used for this object.
        var newModel = new (this.model.extend({urlRoot: urlBase}))(opts);

        // 'schema' has the information about how to generate the form.
        if (newModel.schema && _.isArray(newModel.schema)) {
          var groups = {};

          _.each(newModel.schema, function(f) {
            // Do we understand - what control, we're creating
            // here?
            if (f && f.mode && _.isObject(f.mode) &&
              _.indexOf(f.mode, type) != -1 &&
              type in controlType) {
              // Each field is kept in specified group, or in
              // 'General' category.
              var group = f.group || '{{ _("General") }}';

              // Generate the empty group list (if not exists)
              if (!groups[group]) {
                groups[group] = [];
              }

              // Temporarily store in dictionaly format for
              // utilizing it later.
              groups[group].push({
                name: f.id, label: f.label,
                control: controlType[type][f.type],
                // Do we need to show this control in this mode?
                show: f.show && newModel[f.show] &&
                  typeof newModel[f.show] == "function" ?
                  newModel[f.show] : undefined,
                // This can be disabled in some cases (if not hidden)
                disable: f.disable && newModel[f.disable] &&
                  typeof newModel[f.disable] == "function" ?
                  newModel[f.disable] : undefined,
                options: f.options
              });
            }
          });

          // Do we have fields to genreate controls, which we
          // understand?
          if (_.isEmpty(groups)) {
            return null;
          }

          var fields = [];
          // This will contain the actual view
          var view;

          // Create an array from the dictionary with proper required
          // structure.
          _.each(groups, function(val, key) {
            fields.push({label: key, fields: val});
          });

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
                if (res) {
                  // We got the latest attributes of the
                  // object. Render the view now.
                  view.render();
                  if (typeof(callback) != "undefined") {
                    callback(view);
                  }
                }
              })
              .error(function() {
                // TODO:: Handle the error message properly.
              });
          } else {
            // Yay - render the view now!
            view.render();
            if (typeof(callback) != "undefined") {
              callback(view);
            }
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
          isCloseable: false,
          isPrivate: false,
          content: '<div class="obj_properties">No object selected!</div>'
        });
      p.load(pgBrowser.docker);
    },
    /******************************************************************
     * This function determines the given item is deletable or not.
     *
     * Override this, when a node is not deletable.
     */
    canDelete: function(i) {
      return true;
    },
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
      show_obj_properties: function(args) {
        var t = pgBrowser.tree,
          i = args.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined
          o = this,
          l = o.title(d);

        // Make sure - the properties dialog type registered
        pgBrowser.Node.register_node_panel();

        // No node selected.
        if (!d)
          return;

        if (args.action == 'create') {
          // If we've parent, we will get the information of it for
          // proper object manipulation.
          //
          // You know - we're working with RDBMS, relation is everything
          // for us.
          if (this.parent_type && this.parent_type != d._type) {
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

              if (this.parent_type == pd._type) {
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
          if (!d || (d._type != this.parent_type &&
                this.parent_type != null)) {
            // It should never come here.
            // If it is here, that means - we do have some bug in code.
            return;
          }

          if (!d)
            return;

          l = S('{{ _("Create - %%s") }}').sprintf(
              [this.label]).value();
          p = pgBrowser.docker.addPanel('node_props',
              wcDocker.DOCK_FLOAT, undefined,
              {w: '500', h: '400'});
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
              var msg = '{{ _('Are you sure wish to stop editing the properties of the %%s - "%%s"?') }}';
              if (args.action == 'edit') {
                msg = '{{ _('Are you sure wish to reset the current changes, and reopen the panel for %%s = "%%s"?') }}';
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
            p = pgBrowser.docker.addPanel('node_props',
                wcDocker.DOCK_FLOAT, undefined,
                {w: '500', h: '400'});
            pgBrowser.Node.panels = pgBrowser.Node.panels || {};
            pgBrowser.Node.panels[d.id] = p;

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
      delete_obj: function(args) {
        var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

        if (!d)
          return;

        if (!pgBrowser.Nodes[d._type].canDelete(i)) {
          Alertify.notify(
              S('The %s - "%s" can not be deleted!')
              .sprintf(obj.label, d.label).value(),
              'error',
              10
              );
          return;
        }

        Alertify.confirm(
          S('{{ _('Drop %%s?') }}').sprintf(obj.label).value(),
          S('{{ _('Are you sure you wish to drop the %%s - "%%s"?') }}')
            .sprintf(obj.label, d.label).value(),
            function() {
              $.ajax({
                url: obj.generate_url('drop', d, true),
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
                },
                error: function(jqx) {
                  var msg = jqx.responseText;
                  /* Error from the server */
                  if (jqx.status == 410) {
                    try {
                      var data = $.parseJSON(
                          jqx.responseText);
                      msg = data.errormsg;
                    } catch (e) {}
                  }
                  pgBrowser.report_error(
                      S('{{ _('Error droping the %%s - "%%s"') }}')
                        .sprintf(obj.label, d.label)
                          .value(), msg);
                }
              });
            },
            null).show()
      },
      // Callback called - when a node is selected in browser tree.
      selected: function(o) {
        // Show (One of these, whose panel is open)
        // + Properties
        // + Query
        // + Dependents
        // + Dependencies
        // + Statistics

        // Update the menu items
        pgAdmin.Browser.enable_disable_menus.apply(o.browser, [o.item]);

        if (o && o.data && o.browser) {
          var br = o.browser;
          if ('properties' in br.panels &&
              br.panels['properties'] &&
              br.panels['properties'].panel &&
              br.panels['properties'].panel.isVisible()) {
            // Show object properties (only when the 'properties' tab
            // is active).
            this.showProperties(o.item, o.data,
                pgBrowser.panels['properties'].panel);
          } else if ('sql' in br.panels &&
              br.panels['sql'] &&
              br.panels['sql'].panel &&
              br.panels['sql'].panel.isVisible()) {
            // Show reverse engineered query for this object (when
            // the 'sql' tab is active.)
          } else if ('statistics' in br.panels &&
              br.panels['statistics'] &&
              br.panels['statistics'].panel &&
              br.panels['statistics'].panel.isVisible()) {
            // Show statistics for this object (when the
            // 'statistics' tab is active.)
          } else if ('dependencies' in br.panels &&
              br.panels['dependencies'] &&
              br.panels['dependencies'].panel &&
              br.panels['dependencies'].panel.isVisible()) {
            // Show dependencies for this object (when the
            // 'dependencies' tab is active.)
          } else if ('dependents' in br.panels &&
              br.panels['dependents'] &&
              br.panels['dependents'].panel &&
              br.panels['dependents'].panel.isVisible()) {
            // Show dependents for this object (when the
            // 'dependents' tab is active.)
          }
        }
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
        content = $('<div></div>')
          .addClass('has-pg-prop-btn-group pg-prop-content col-xs-12'),
        // Template function to create the button-group
        createButtons = function(buttons) {
          // arguments must be non-zero length array of type
          // object, which contains following attributes:
          // label, type, extraClasses, register
          if (buttons && _.isArray(buttons) && buttons.length > 0) {
            // All buttons will be created within a single
            // div area.
            var btnGroup =
              $('<div></div>').addClass(
                  'pg-prop-btn-group col-xs-12'
                  ).appendTo(j),
            // Template used for creating a button
            tmpl = _.template([
                '<button type="<%= type %>" ',
                'class="btn <%=extraClasses.join(\' \')%>">',
                '<i class="<%= icon %>"></i>&nbsp;',
                '<%-label%></button>'
                ].join(' '));
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
              // for certain operatio for this button.
              btn.register(b);
            });
            return btnGroup;
          }
          return null;
        },
        // Callback to show object properties
        properties = function() {
          // We need to release any existing view, before
          // creating new view.
          if (view) {
            // Release the view
            view.remove();
            // Deallocate the view
            delete view;
            view = null;
            // Reset the data object
            j.data('obj-view', null);
          }
          // Make sure the HTML element is empty.
          j.empty();
          // Create a view to show the properties in fieldsets
          view = that.getView('properties', content, data, 'fieldset');
          if (view) {
            // Save it for release it later
            j.data('obj-view', view);
            // Create proper buttons
            var buttons = [];
            if (action) {
              buttons.push({
                label: '{{ _("Close") }}', type: 'close',
                extraClasses: ['btn-danger'],
                icon: 'fa fa-lg fa-close',
                register: function(btn) {
                  btn.click(function() {
                    closePanel();
                  });
                }
              });
            }
            buttons.push({
              label: '{{ _("Edit") }}', type: 'edit',
              extraClasses: ['btn-primary'],
              icon: 'fa fa-lg fa-pencil-square-o',
              register: function(btn) {
                btn.click(function() {
                  onEdit();
                });
              }
            });
            createButtons(buttons);
          }
          j.append(content);
        },
        editFunc = function() {
          if (action && action == 'properties') {
            action = 'edit';
          }
          panel.$container.attr('action-mode', action);
          // We need to release any existing view, before
          // creating the new view.
          if (view) {
            // Release the view
            view.remove();
            // Deallocate the view
            delete view;
            view = null;
            // Reset the data object
            j.data('obj-view', null);
          }
          // Make sure the HTML element is empty.
          j.empty();
          // Create a view to edit/create the properties in fieldsets
          view = that.getView(action, content, data, 'fieldset');

          if (view) {
            // Save it to release it later
            j.data('obj-view', view);
            // Create proper buttons
            createButtons([{
              label: '{{ _("Save") }}', type: 'save',
              extraClasses: ['btn-primary'],
              icon: 'fa fa-lg fa-save',
              register: function(btn) {
                // Save the changes
                btn.click(function() {

                  var m = view.model,
                    c = m.isNew() ? m.attributes :
                      m.changedAttributes();

                  if (c && !_.isEmpty(c)) {
                    m.save({} ,{
                      attrs: (m.isNew() ?
                          m.attributes :
                          m.changedAttributes()),
                      success: function() {
                        onSaveFunc.call();
                      },
                      error: function() {
                        /* Reset the changed attributes on failure */
                        m.changed = c;

                        /* TODO:: Alert for the user on error */
                        console.log('ERROR:');
                        console.log(arguments);
                      }
                    });
                  }
                });
              }
            },{
              label: '{{ _('Cancel') }}', type: 'cancel',
              extraClasses: ['btn-danger'],
              icon: 'fa fa-lg fa-close',
              register: function(btn) {
                btn.click(function() {
                  // Removing the action-mode
                  panel.$container.removeAttr('action-mode');
                  onCancelFunc.call(arguments);
                });
              }
            },{
              label: '{{ _("Reset") }}', type: 'reset',
              extraClasses: ['btn-warning'],
              icon: 'fa fa-lg fa-recycle',
              register: function(btn) {
                btn.click(function() {
                  setTimeout(function() { editFunc.call(); }, 0);
                });
              }
            }]);
          };
          // Show contents after buttons
          j.append(content);
        },
        closePanel = function() {
          // Closing this panel
          panel.close()
        },
        updateTreeItem = function() {
          // Update the item lable (if lable is modified.)
          tree.setLabel(item, {label: view.model.get("name")});
          panel.$container.removeAttr('action-mode');
          setTimeout(function() { properties(); }, 0);
        },
        saveNewNode = function() {
          /* TODO:: Create new tree node for this */
          if (view.model.tnode) {
            var d = _.extend({}, view.model.tnode),
              func = function(i) {
                /* Register this panel for this node */
                pgBrowser.Node.panels =
                  pgBrowser.Node.panels || {};
                pgBrowser.Node.panels[d.id] = panel;
                panel.title(that.title(d));
                setTimeout(function() {
                  that.showProperties(i, d, panel,
                    'properties');
                }, 0);
                tree.setVisible(i);
                tree.select(i);
              };

            delete view.model.tnode;

            if (that.parent_type) {
              if (tree.wasLoad(item)) {
                tree.append(item, {
                  itemData: d,
                  success: function(i, o) {
                    func(o.items.eq(0));
                  }
                });
              } else {
                /* When no children found, it was loaded.
                 * It sets the item to non-inode.
                 */
                if (!tree.isInode(item)) {
                    tree.setInode(item);
                }
                tree.open(item, {
                  expand: true,
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
                        console.log(arguments);
                      }
                    });

                  },
                  fail: function() {
                    console.log(arguments);
                  }
                });
              }
            } else {
              tree.append(null, {
                itemData: d,
                success: function(i, o) {
                  func(i);
                }
              });
            }
          }
        },
        editInNewPanel = function() {
          // Open edit in separate panel
          setTimeout(function() {
            that.callbacks.show_obj_properties.apply(that, [{
              'action': 'edit',
              'item': item
            }]);
          }, 0);
        },
        onCancelFunc = properties,
        onSaveFunc = updateTreeItem,
        onEdit = editFunc;

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
        onEdit = editInNewPanel;
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
    generate_url: function(type, d, with_id) {
      var url = pgAdmin.Browser.URL + '{TYPE}/{REDIRECT}{REF}',
        ref = S('/%s/').sprintf(d._id).value(),
        opURL = {
          'create': 'obj', 'drop': 'obj', 'edit': 'obj',
          'properties': 'obj', 'depends': 'deps',
          'statistics': 'stats'
        };

      if (d._type == this.type) {
        ref = '';
        if (d.refid)
          ref = S('/%s').sprintf(d.refid).value();
        if (with_id)
          ref = S('%s/%s').sprintf(ref, d._id).value();
      }

      var args = { 'TYPE': this.type, 'REDIRECT': '', 'REF': ref };

      if (type in opURL) {
        args.REDIRECT = opURL[type];
        if (type == 'create' && !this.parent_type) {
          args.REF = '/';
        }
      } else {
        args.REDIRECT = type;
      }

      return url.replace(/{(\w+)}/g, function(match, arg) {
        return args[arg];
      });
    },
    // Base class for Node Model
    Model: Backbone.Model.extend({
      parse: function(res) {
        if ('node' in res && res['node']) {
          this.tnode = _.extend({}, res.node);
          delete res.node;
        }
        return res;
      }
    })
  });

  return pgAdmin.Browser.Node;
});
