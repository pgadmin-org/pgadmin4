define(
    ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser.menu',
     'backbone', 'alertify', 'backform', 'pgadmin.backform', 'wcdocker',
     'pgadmin.alertifyjs', 'backbone.undo'],
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

  _.extend(pgAdmin.Browser.Node, Backbone.Events, {
    // Node type
    type: undefined,
    // Label
    label: '',
    title: function(d) {
      return d ? d.label : '';
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
      if (this.node_initialized)
        return;
      this.node_initialized = true;

      pgAdmin.Browser.add_menus([{
        name: 'show_obj_properties', node: this.type, module: this,
        applies: ['object', 'context'], callback: 'show_obj_properties',
        priority: 3, label: '{{ _("Properties...") }}',
        data: {'action': 'edit'}, icon: 'fa fa-pencil-square-o'
      }, {
        name: 'refresh', node: this.type, module: this,
        applies: ['object', 'context'], callback: 'refresh',
        priority: 2, label: '{{ _("Refresh...") }}',
        icon: 'fa fa-refresh'
      }]);
    },
    ///////
    // Generate a Backform view using the node's model type
    //
    // Used to generate view for the particular node properties, edit,
    // creation.
    getView: function(item, type, el, node, formType, callback, data) {

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
          attrs[this.model.idAttribute || 'id'] = node._id;
        }

        // We know - which data model to be used for this object.
        var newModel = new (this.model.extend({urlRoot: urlBase}))(attrs, {
              onChangeData: data,
              onChangeCallback: callback
            }),
            info = this.getTreeNodeHierarchy.apply(this, [item]),
            groups = Backform.generateViewSchema(info, newModel, type);

        // 'schema' has the information about how to generate the form.
        if (groups) {
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
                // We got the latest attributes of the
                // object. Render the view now.
                newModel.startNewSession();
                view.render();
                if (type != 'properties') {
                  $(el).focus();
                }
              })
              .error(function(jqxhr, error, message) {
                // TODO:: We may not want to continue from here
                Alertify.pgNotifier(
                  error, jqxhr,
                  S(
                    "{{ _("Error fetching the properties - %%s!") }}"
                    ).sprintf(message).value()
                  );
              });
          } else {
            // Yay - render the view now!
            newModel.startNewSession();
            view.render();
            $(el).focus();
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
          l = o.label + ' - ' + o.title(d);

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
              wcDocker.DOCK.FLOAT, undefined, {
                  w: (screen.width < 700 ?
                      screen.width * 0.95 : screen.width * 0.5),
                  h: (screen.height < 500 ?
                    screen.height * 0.95 : screen.height * 0.5),
                  x: (screen.width < 700 ? '2%' : '25%'),
                  y: (screen.height < 500 ? '2%' : '25%')
                });
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
                msg = '{{ _('Are you sure wish to reset the current changes, and reopen the panel for %%s - "%%s"?') }}';
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
                wcDocker.DOCK.FLOAT, undefined, {
                  w: (screen.width < 700 ?
                      screen.width * 0.95 : screen.width * 0.5),
                  h: (screen.height < 500 ?
                    screen.height * 0.95 : screen.height * 0.5),
                  x: (screen.width < 700 ? '2%' : '25%'),
                  y: (screen.height < 500 ? '2%' : '25%')
                });
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
                url: obj.generate_url(i, 'drop', d, true),
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
      },
      refresh: function(i) {
        var self = this,
            t = pgBrowser.tree,
            d = t.itemData(i);

        t.unload(i);
        t.setInode((d && d.inode) || false);
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
        // Template function to create the button-group
        createButtons = function(buttons, extraClasses) {
          // arguments must be non-zero length array of type
          // object, which contains following attributes:
          // label, type, extraClasses, register
          if (buttons && _.isArray(buttons) && buttons.length > 0) {
            // All buttons will be created within a single
            // div area.
            var btnGroup =
              $('<div></div>').addClass(
                  'pg-prop-btn-group'
                  ).appendTo(j),
              // Template used for creating a button
              tmpl = _.template([
                '<button type="<%= type %>" ',
                'class="btn <%=extraClasses.join(\' \')%>">',
                '<i class="<%= icon %>"></i>&nbsp;',
                '<%-label%></button>'
                ].join(' '));
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
              // for certain operatio for this button.
              btn.register(b);
            });
            return btnGroup;
          }
          return null;
        },
        // Callback to show object properties
        properties = function() {

          if (!content.hasClass('has-pg-prop-btn-group'))
            content.addClass('has-pg-prop-btn-group');

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
          view = that.getView(item, 'properties', content, data, 'fieldset');
          if (view) {
            // Save it for release it later
            j.data('obj-view', view);
            // Create proper buttons
            var buttons = [];
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
            createButtons(buttons, 'pg-prop-btn-group-above');
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

          var modelChanged = function(m, o) {
            var btnGroup = o.find('.pg-prop-btn-group'),
                btnSave = btnGroup.find('button[type="save"]'),
                btnReset = btnGroup.find('button[type="reset"]');

            if (m.sessValid() && m.sessChanged()) {
              btnSave.prop('disabled', false);
              btnSave.removeAttr('disabled');
              btnReset.prop('disabled', false);
              btnReset.removeAttr('disabled');
            } else {
              btnSave.prop('disabled', true);
              btnSave.attr('disabled', 'disabled');
              btnReset.prop('disabled', true);
              btnReset.attr('disabled', 'disabled');
            }
          };

          // Create a view to edit/create the properties in fieldsets
          view = that.getView(item, action, content, data, 'dialog', modelChanged, j);
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
                    d = m.toJSON(true);

                  if (d && !_.isEmpty(d)) {
                    m.save({}, {
                      attrs: d,
                      validate: false,
                      success: function() {
                        onSaveFunc.call();
                      },
                      error: function(m, jqxhr) {
                        Alertify.pgNotifier(
                          "error", jqxhr,
                          S(
                            "{{ _("Error during saving properties - %%s!") }}"
                            ).sprintf(jqxhr.statusText).value()
                          );
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
            }], 'pg-prop-btn-group-below');
          };

          // Add some space, so that - button group does not override the
          // space
          content.addClass('pg-prop-has-btn-group-below');

          // Show contents before buttons
          j.prepend(content);

          // Register the Ctrl/Meta+Z -> for Undo operation
          // and Ctrl+Shift+Z/Ctrl+Y -> Redo operation in the edit/create
          // dialog.
          content.closest('.wcFrame').attr('tabindex', "1").on('keydown', function(e) {
            switch (e.keyCode) {
              case 90:
                if ((e['ctrlKey'] || e['metaKey'])) {
                  if (e['shiftKey']) {
                    view && view.model && view.model.redo();
                  } else {
                    view && view.model && view.model.undo();
                  }
                  e.preventDefault();
                  break;
                }
                break;
              case 89:
                if ((e['ctrlKey'] || e['metaKey']) && !e['shiftKey']) {
                  view && view.model && view.model.redo();
                  e.preventDefault();
                }
                break;
            }
          });
          content.focus();
        },
        closePanel = function() {
          // Closing this panel
          panel.close()
        },
        updateTreeItem = function() {
          // Update the item lable (if lable is modified.)
          tree.setLabel(item, {label: view.model.get("name")});
          panel.$container.removeAttr('action-mode');
          setTimeout(function() { closePanel(); }, 0);
        },
        saveNewNode = function() {
          /* TODO:: Create new tree node for this */
          if (view.model.tnode) {
            var d = _.extend({}, view.model.tnode),
              func = function(i) {
                setTimeout(function() {
                  closePanel();
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
        onCancelFunc = closePanel,
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
    generate_url: function(item, type, d, with_id) {
      var url = pgAdmin.Browser.URL + '{TYPE}/{REDIRECT}{REF}',
        opURL = {
          'create': 'obj', 'drop': 'obj', 'edit': 'obj',
          'properties': 'obj', 'statistics': 'stats'
        },
        ref = '', self = this;

      _.each(
        _.sortBy(
          _.values(
           _.pick(
            this.getTreeNodeHierarchy(item), function(v, k, o) {
              return (k != self.type);
            })
           ),
          function(o) { return o.priority; }
          ),
        function(o) {
          ref = S('%s/%s').sprintf(ref, o.id).value();
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
    Collection: Backbone.Collection.extend({
      // Model collection
      initialize: function(attributes, options) {
        var self = this;

        options = options || {};
        self.sessAttrs = {
          'changed': [],
          'added': [],
          'deleted': []
        };
        self.handler = options.handler;
        self.trackChanges = false;

        self.undoMgr = new Backbone.UndoManager({
          register: self, track: true
        });

        if (self.handler && self.handler.undoMgr) {
          self.handler.undoMgr.merge(self.undoMgr);
          self.handler.ignoreTabChange = 0;
        }

        self.undoMgr.addUndoType("pg-sub-node:opened", {
          "on": function (model, cell) {
            return {
              "object": cell,
              "before": null,
              "after": null
            }
          },
          "undo": function (cell, before, after, opts) {
            if (cell && cell.exitEditMode &&
                _.isFunction(cell.exitEditMode)) {
              cell.exitEditMode();
            }
          },
          "redo": function (cell, before, after, opts) {
            if (cell && cell.enterEditMode &&
                _.isFunction(cell.enterEditMode)) {
              cell.enterEditMode();
            }
          }
        });
        self.undoMgr.addUndoType("pg-sub-node:closed", {
          "handler": (self.handler || self),
          "on": function (cell, index) {
            return {
              "object": {'cell': cell, 'index': index},
              "before": null,
              "after": null,
              "options": this.handler
            }
          },
          "undo": function (obj, before, after, opts) {
            if (obj.cell && obj.cell.enterEditMode &&
                _.isFunction(obj.cell.enterEditMode)) {
              obj.cell.enterEditMode();
              var tabs = obj.cell.currentEditor.objectView.$el
              .find('.nav-tabs').first();
              var tab = tabs.find('a[data-tab-index="' + obj.index + '"]');
              if (tab.length) {
                opts.ignoreTabChange++;
                tab.tab('show');
                tabs.find('li').removeClass('active');
                tab.parent().addClass('active');
              }
            }
          },
          "redo": function (cell, before, after, opts) {
            if (cell && cell.exitEditMode &&
                _.isFunction(cell.exitEditMode)) {
              cell.exitEditMode();
            }
          }
        });
        (self.handler || self).ignoreTabChange = 0;
        self.undoMgr.addUndoType("pg-property-tab-changed", {
          'mgr': self.undoMgr,
          'handler': (self.handler || self),
          "on": function (obj) {
            if (!this.handler.ignoreTabChange &&
                !this.mgr.stack.isCurrentlyUndoRedoing) {
              return {
                "object": obj,
                "before": null,
                "after": null,
                "options": this.handler
              }
            }
            this.handler.ignoreTabChange--;
          },
          "undo": function (obj, before, after, opts) {
            if (obj.hidden) {
              var m = obj.model;
              if (obj.collection) {
                m = obj.collection.models[obj.index];
              }
              var panelEl = m && m.panelEl;
              if (panelEl) {
                var tabs = panelEl.find('.nav-tabs').first(),
                    tab = tabs.find('a[data-tab-index="' + obj.hidden + '"]');
                if (tab.length) {
                  opts.ignoreTabChange++;
                  tab.tab('show');
                  tabs.find('li').removeClass('active');
                  tab.parent().addClass('active');
                }
              }
            }
          },
          "redo": function (obj, before, after, opts) {
            if (obj.shown) {
              var m = obj.model;
              if (obj.collection) {
                m = obj.collection.models[obj.index];
              }
              var panelEl = m && m.panelEl;
              if (panelEl) {
                var tabs = panelEl.find('.nav-tabs').first(),
                    tab = tabs.find('a[data-tab-index="' + obj.shown + '"]');
                if (tab.length) {
                  opts.ignoreTabChange++;
                  tab.tab('show');
                  tabs.find('li').removeClass('active');
                  tab.parent().addClass('active');
                }
              }
            }
          }
        });

        self.on('add', self.onModelAdd);
        self.on('remove', self.onModelRemove);
        self.on('change', self.onModelChange);

        return self;
      },
      startNewSession: function() {
        var self = this;

        self.trackChanges = true;
        self.sessAttrs = {
          'valid': true,
          'changed': [],
          'added': [],
          'deleted': []
        };

        self.undoMgr.clear();

        _.each(self.models, function(m) {
          if ('startNewSession' in m && _.isFunction(m.startNewSession)) {
            m.startNewSession();
          }
        });
      },
      onChange: function() {
        var self = this;

        if (self.handler && 'onChange' in self.handler &&
            _.isFunction(self.handler.onChange)) {
          return self.handler.onChange();
        }
        return true;
      },
      sessChanged: function() {
        return (
            this.sessAttrs['changed'].length > 0 ||
            this.sessAttrs['added'].length > 0 ||
            this.sessAttrs['deleted'].length > 0
            );
      },
      sessValid: function() {
        _.each(this.sessAttrs['added'], function(o) {
          if ('sessValid' in o && _.isFunction(o.sessValid) &&
             (!o.sessValid.apply(o) ||
              ('validate' in o && _.isFunction(o.validate) &&
               _.isString(o.validate.apply(o))))) {
            return false;
          }
          return true;
        });
        _.each(self.sessAttrs['changed'], function(o) {
          if ('sessValid' in o && _.isFunction(o.sessValid) &&
             (!o.sessValid.apply(o) ||
              ('validate' in o && _.isFunction(o.validate) &&
               _.isString(o.validate.apply(o))))) {
            return false;
          }
        });
        return true;
      },
      toJSON: function(session) {
        var self = this,
            onlyChanged = (typeof(session) != "undefined" &&
                  session == true);

        if (!onlyChanged) {
          return Backbone.Collection.prototype.toJSON.call(self);
        } else {
          var res = {};

          res['added'] = [];
          _.each(this.sessAttrs['added'], function(o) {
            res['added'].push(o.toJSON());
          });
          if (res['added'].length == 0) {
            delete res['added'];
          }
          res['changed'] = [];
          _.each(self.sessAttrs['changed'], function(o) {
            res['changed'].push(o.toJSON(true));
          });
          if (res['changed'].length == 0) {
            delete res['changed'];
          }
          res['deleted'] = [];
          _.each(self.sessAttrs['deleted'], function(o) {
            res['deleted'].push(o.toJSON(false, true));
          });
          if (res['deleted'].length == 0) {
            delete res['deleted'];
          }

          return (_.size(res) == 0 ? null : res);
        }
      },
      onModelAdd: function(obj) {

        if (!this.trackChanges)
          return true;

        var self = this, idx = _.indexOf(self.sessAttrs['deleted'], obj);

        // Hmm.. - it was originally deleted from this collection, we should
        // remove it from the 'deleted' list.
        if (idx >= 0) {
          self.sessAttrs['deleted'].splice(idx, 1);

          // It has been changed originally!
          if ((!'sessChanged' in obj) || obj.sessChanged()) {
            self.sessAttrs['changed'].push(obj);
          }
          return self.onChange();
        }
        self.sessAttrs['added'].push(obj);

        return self.onChange();
      },
      onModelRemove: function(obj) {

        if (!this.trackChanges)
          return true;

        var self = this, idx = _.indexOf(self.sessAttrs['added'], obj);

        // Hmm - it was newly added, we can safely remove it.
        if (idx >= 0) {
          self.sessAttrs['added'].splice(idx, 1);
          return self.onChange();
        }
        // Hmm - it was changed in this session, we should remove it from the
        // changed models.
        idx = _.indexOf(self.sessAttrs['changed'], obj);
        if (idx >= 0) {
          self.sessAttrs['changed'].splice(idx, 1);
        }
        self.sessAttrs['deleted'].push(obj);
        return self.onChange();
      },
      onModelChange: function(obj) {

        if (!this.trackChanges || obj instanceof pgBrowser.Node.Model)
          return true;

        var self = this, idx = _.indexOf(self.sessAttrs['added'], obj);

        // It was newly added model, we don't need to add into the changed
        // list.
        if (idx >= 0) {
          return true;
        }
        idx = _.indexOf(self.sessAttrs['changed'], obj);
        if (!'sessChanged' in obj) {
          if (idx > 0) {
            return true;
          }
          self.sessAttrs['changed'].push(obj);
          return self.onChange();
        }
        if (idx > 0) {
          if (!obj.sessChanged()) {
            self.sessAttrs['changed'].splice(idx, 1);
            return self.onChange();
          }
          return true;
        }
        self.sessAttrs['changed'].push(obj);
        return self.onChange();
      }
    }),
    // Base class for Node Model
    Model: Backbone.Model.extend({
      parse: function(res) {
        var self = this;
        if ('node' in res && res['node']) {
          self.tnode = _.extend({}, res.node);
          delete res.node;
        }
        if (self.schema && _.isArray(self.schema)) {
          _.each(self.schema, function(s) {
            if (s.id in res) {
              var o;
              switch(s.type) {
                case 'collection':
                  o = self.get(s.id)
                  o.reset(res[s.id], [{silent: true}]);
                  res[s.id] = o;
                  break;
                case 'model':
                  o = self.get(s.id);
                  o.set(res[s.id], [{silent: true}]);
                  res[s.id] = o;
                  break;
                default:
                  break;
              }
            }
          });
        }
        return res;
      },
      initialize: function(attributes, options) {
        var self = this;

        options = options || {};
        self.sessAttrs = {};
        self.origSessAttrs = {};
        self.objects = [];
        self.handler = (options.handler ||
            (self.collection && self.collection.handler));
        self.trackChanges = false;

        /*
         * A object in pgBrowser.Node.Collection does not require a separate
         * Undo manager.
         */
        if (self.collection && self.collection.undoMgr) {
          self.undoMgr = self.collection.undoMgr;
        } else {
          self.undoMgr = new Backbone.UndoManager({
            register: self, track: true
          });

          /*
           * Merged Undo stack should be kept at main handler
           */
          if (self.handler && self.handler.undoMgr) {
            self.handler.undoMgr.merge(self.undoMgr);
          }
        }

        self.onChangeData = options.onChangeData;
        self.onChangeCallback = options.onChangeCallback;

        if (self.schema && _.isArray(self.schema)) {
          _.each(self.schema, function(s) {
            var obj = null;
            switch(s.type) {
              case 'collection':
                if (_.isString(s.model) &&
                    s.model in pgBrowser.Nodes) {
                  var node = pgBrowser.Nodes[s.model];
                  obj = new (node.Collection)(null, {
                    model: node.model,
                    handler: self.handler || self
                  });
                } else {
                  obj = new (pgBrowser.Node.Collection)(null, {
                    model: s.model,
                    handler: self.handler || self
                  });
                }
                break;
              case 'model':
                if (_.isString(s.model) &&
                    s.model in pgBrowser.Nodes[s.model]) {
                  obj = new (pgBrowser.Nodes[s.model].Model)(
                      null, {handler: self.handler || self}
                      );
                } else {
                  obj = new (s.model)(null, {handler: self.handler || self});
                }
                break;
              default:
                return;
            }
            obj.name = s.id;
            self.objects.push(s.id);
            self.set(s.id, obj, {silent: true});
          });
        }

        return self;
      },
      onChange: function() {
        var self = this;

        if (self.handler && 'onChange' in self.handler &&
            _.isFunction(self.handler.onChange)) {
          return self.handler.onChange();
        }
        if (self.onChangeCallback && _.isFunction(self.onChangeCallback)) {
          return self.onChangeCallback(self, self.onChangeData);
        }
        return true;
      },
      sessChanged: function() {
        var self = this;

        return (_.size(self.sessAttrs) > 0 ||
            _.some(self.objects, function(o) {
              return self.get(o).sessChanged();
            }));
      },
      sessValid: function() {
        var self = this;
        if ('validate' in self && _.isFunction(self.validate) &&
            _.isString(self.validate.apply(self))) {
          return false;
        }
        return true;
      },
      set: function(key, val, options) {
        var res = Backbone.Model.prototype.set.call(this, key, val, options);

        if (key != null && res && this.trackChanges) {
          var attrs;
          var self = this, unChanged = [], handler = self.handler || self;

          attrChanged = function(v, k) {
            if (k in self.objects) {
              return;
            }
            if (self.origSessAttrs[k] == v) {
              delete self.sessAttrs[k];
            } else {
              self.sessAttrs[k] = v;
            }
          };

          // Handle both `"key", value` and `{key: value}` -style arguments.
          if (typeof key === 'object') {
            _.each(key, attrChanged);
          } else {
            attrChanged(val, key);
          }

          handler.onChange();
          return true;
        }
        return res;
      },
      toJSON: function(session, idOnly) {
        var self = this, res, isNew = self.isNew();

        session = (typeof(session) != "undefined" && session == true && isNew == false);
        idOnly = (typeof(idOnly) != "undefined" && idOnly == true);

        if (!session && !idOnly) {
          res = Backbone.Model.prototype.toJSON.call(this, arguments);
        } else {
          res = {};
          res[self.idAttribute || '_id'] = self.get(self.idAttribute || '_id');

          if (idOnly) {
            return res;
          }
          res = _.extend(res, self.sessAttrs);
        }

        _.each(self.objects, function(o) {
          res[o] = (self.get(o)).toJSON(session);
        });
        return res;
      },
      startNewSession: function() {
        var self = this;

        self.trackChanges = true;
        self.sessAttrs = {};
        self.origSessAttrs = _.clone(this.attributes);
        self.undoMgr.clear();
        self.handler = (self.handler ||
            (self.collection && self.collection.handler));

        var res = false;

        _.each(self.objects, function(o) {
          var obj = self.get(o);

          delete self.origSessAttrs[o];

          if ('startNewSession' in obj && _.isFunction(obj.startNewSession)) {
            obj.startNewSession();
          } else {
            self.undoMgr.register(obj);
          }
        });

        if (!self.handler) {
          self.onChange();
        }
      },
      canUndo: function() {
        if (this.undoMgr) {
          return this.undoMgr.isAvailable('undo');
        }
        return false;
      },
      canRedo: function() {
        if (this.undoMgr) {
          return this.undoMgr.isAvailable('redo');
        }
        return false;
      },
      undo: function() {
        if (this.undoMgr) {
          return this.undoMgr.undo(true);
        }
        return false;
      },
      redo: function() {
        if (this.undoMgr) {
          return this.undoMgr.redo(true);
        }
        return false;
      }
    }),
    getTreeNodeHierarchy: function(i) {
      var idx = 0,
          res = {},
          t = pgBrowser.tree;
      do {
        d = t.itemData(i);
        if (d._type in pgBrowser.Nodes && pgBrowser.Nodes[d._type].hasId) {
          res[d._type] = {
            'id': d._id,
            'priority': idx
          };
          idx -= 1;
        }
        i = t.hasParent(i) ? t.parent(i) : null;
      } while (i);

      return res;
    }
  });

  return pgAdmin.Browser.Node;
});
