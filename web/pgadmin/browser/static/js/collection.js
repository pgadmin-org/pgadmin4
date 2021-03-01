/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin',
  'backbone', 'alertify', 'backform', 'backgrid', 'sources/browser/generate_url',
  'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.browser.node', 'backgrid.select.all',
], function(gettext, $, _, pgAdmin, Backbone, Alertify, Backform, Backgrid, generateUrl) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  // It has already been defined.
  // Avoid running this script again.
  if (pgBrowser.Collection)
    return pgBrowser.Collection;

  pgBrowser.Collection = function() {};

  _.extend(
    pgBrowser.Collection,
    _.clone(pgBrowser.Node), {
      ///////
      // Initialization function
      // Generally - used to register the menus for this type of node.
      //
      // Also, look at pgAdmin.Browser.add_menus(...) function.
      //
      // Collection will not have 'Properties' menu.
      //
      // NOTE: Override this for each node for initialization purpose
      Init: function() {
        if (this.node_initialized)
          return;
        this.node_initialized = true;

        pgAdmin.Browser.add_menus([{
          name: 'refresh', node: this.type, module: this,
          applies: ['object', 'context'], callback: 'refresh',
          priority: 1, label: gettext('Refresh...'),
          icon: 'fa fa-sync-alt',
        }]);

        // show query tool only in context menu of supported nodes.
        if (pgAdmin.unsupported_nodes && _.indexOf(pgAdmin.unsupported_nodes, this.type) == -1) {
          if ((this.type == 'database' && this.allowConn) || this.type != 'database') {
            pgAdmin.Browser.add_menus([{
              name: 'show_query_tool', node: this.type, module: this,
              applies: ['context'], callback: 'show_query_tool',
              priority: 998, label: gettext('Query Tool'),
              icon: 'pg-font-icon icon-query_tool',
            }]);

            // show search objects same as query tool
            pgAdmin.Browser.add_menus([{
              name: 'search_objects', node: this.type, module: this,
              applies: ['context'], callback: 'show_search_objects',
              priority: 997, label: gettext('Search Objects...'),
              icon: 'fa fa-search',
            }]);
          }
        }
      },

      hasId: false,
      is_collection: true,
      collection_node: true,
      // A collection will always have a collection of statistics, when the node
      // it represent will have some statistics.
      hasCollectiveStatistics: true,
      canDrop: true,
      canDropCascade: true,
      showProperties: function(item, data, panel) {
        var that = this,
          j = panel.$container.find('.obj_properties').first(),
          view = j.data('obj-view'),
          content = $('<div></div>')
            .addClass('pg-prop-content col-12 has-pg-prop-btn-group'),
          node = pgBrowser.Nodes[that.node],
          $msgContainer = '',
          // This will be the URL, used for object manipulation.
          urlBase = this.generate_url(item, 'properties', data),
          info = this.getTreeNodeHierarchy.apply(this, [item]),
          gridSchema = Backform.generateGridColumnsFromModel(
            info, node.model, 'properties', that.columns
          ),
          createButtons = function(buttonsList, location, extraClasses) {
            // Arguments must be non-zero length array of type
            // object, which contains following attributes:
            // label, type, extraClasses, register
            if (buttonsList && _.isArray(buttonsList) && buttonsList.length > 0) {
              // All buttons will be created within a single
              // div area.
              var btnGroup =
                $('<div class="pg-prop-btn-group"></div>'),
                // Template used for creating a button
                tmpl = _.template([
                  '<button tabindex="0" type="<%= type %>" ',
                  'class="btn <%=extraClasses.join(\' \')%>"',
                  '<% if (disabled) { %> disabled="disabled"<% } %> title="<%-tooltip%>">',
                  '<span class="<%= icon %>" role="img"></span><% if (label != "") { %>&nbsp;<%-label%><% } %><span class="sr-only"><%-tooltip%></span></button>',
                ].join(' '));
              if (location == 'header') {
                btnGroup.appendTo(that.header);
              } else {
                btnGroup.appendTo(that.footer);
              }
              if (extraClasses) {
                btnGroup.addClass(extraClasses);
              }
              _.each(buttonsList, function(btn) {
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
          }.bind(panel);

        that.collection = new (node.Collection.extend({
          url: urlBase,
          model: node.model,
        }))();
        // Add the new column for the multi-select menus
        if((_.isFunction(that.canDrop) ?
          that.canDrop.apply(that, [data, item]) : that.canDrop) ||
              (_.isFunction(that.canDropCascade) ?
                that.canDropCascade.apply(that, [data, item]) : that.canDropCascade)) {
          gridSchema.columns.unshift({
            name: 'oid',
            cell: Backgrid.Extension.SelectRowCell.extend({
              initialize: function (options) {
                this.column = options.column;
                if (!(this.column instanceof Backgrid.Column)) {
                  this.column = new Backgrid.Column(this.column);
                }

                var column = this.column, model = this.model, $el = this.$el;
                this.listenTo(column, 'change:renderable', function (col, renderable) {
                  $el.toggleClass('renderable', renderable);
                });

                if (Backgrid.callByNeed(column.renderable(), column, model)) $el.addClass('renderable width_percent_3');

                this.listenTo(model, 'backgrid:select', this.toggleCheckbox);
              },
              toggleCheckbox: function(model, selected) {
                if (this.checkbox().prop('disabled') === false) {
                  this.checkbox().prop('checked', selected).change();
                }
              },
              render: function() {
                let model = this.model.toJSON();
                // canDrop can be set to false for individual row from the server side to disable the checkbox
                let disabled = ('canDrop' in model && model.canDrop === false);
                let id = `row-${_.uniqueId(model.oid || model.name)}`;

                this.$el.empty().append(`
                  <div class="custom-control custom-checkbox custom-checkbox-no-label">
                    <input tabindex="-1" type="checkbox" class="custom-control-input" id="${id}" ${disabled?'disabled':''}/>
                    <label class="custom-control-label" for="${id}">
                      <span class="sr-only">` + gettext('Select') + `<span>
                    </label>
                  </div>
                `);
                this.delegateEvents();
                return this;
              },
            }),
            headerCell: Backgrid.Extension.SelectAllHeaderCell,
          });
        }
        /* Columns should be always non-editable  */
        gridSchema.columns.forEach((col)=>{
          col.disabled = true;
        });

        // Get the list of selected models, before initializing the grid
        // again.
        var selectedModels = [];
        if(!_.isUndefined(that.grid) && 'collection' in that.grid){
          selectedModels = that.grid.getSelectedModels();
        }

        // Initialize a new Grid instance
        that.grid = new Backgrid.Grid({
          emptyText: gettext('No data found'),
          columns: gridSchema.columns,
          collection: that.collection,
          className: 'backgrid table presentation table-bordered table-noouter-border table-hover',
        });

        var gridView = {
          'remove': function() {
            if (this.grid) {
              if (this.grid.collection) {
                this.grid.collection.reset([], {silent: true});
                delete (this.grid.collection);
              }
              delete (this.grid);
              this.grid = null;
            }
          },
          grid: that.grid,
        };

        if (view) {
          // Cache the current IDs for next time
          $(panel).data('node-prop', urlBase);

          // Reset the data object
          j.data('obj-view', null);
        }

        // Make sure the HTML element is empty.
        j.empty();
        j.data('obj-view', gridView);

        $msgContainer = '<div role="status" class="pg-panel-message pg-panel-properties-message">' +
         gettext('Retrieving data from the server...') + '</div>';

        $msgContainer = $($msgContainer).appendTo(j);

        that.header = $('<div></div>').addClass(
          'pg-prop-header'
        );

        // Render the buttons
        var buttons = [];

        buttons.push({
          label: '',
          type: 'delete',
          tooltip: gettext('Delete/Drop'),
          extraClasses: ['btn-primary-icon m-1', 'delete_multiple'],
          icon: 'fa fa-trash-alt',
          disabled:  (_.isFunction(that.canDrop)) ? !(that.canDrop.apply(self, [data, item])) : (!that.canDrop),
          register: function(btn) {
            btn.on('click',() => {
              onDrop('drop');
            });
          },
        });

        buttons.push({
          label: '',
          type: 'delete',
          tooltip: gettext('Drop Cascade'),
          extraClasses: ['btn-primary-icon m-1', 'delete_multiple_cascade'],
          icon: 'pg-font-icon icon-drop_cascade',
          disabled: (_.isFunction(that.canDropCascade)) ? !(that.canDropCascade.apply(self, [data, item])) : (!that.canDropCascade),
          register: function(btn) {
            btn.on('click',() => {
              onDrop('dropCascade');
            });
          },
        });

        createButtons(buttons, 'header', 'pg-prop-btn-group-above');

        // Render subNode grid
        content.append('<div class="pg-prop-coll-container"></div>');
        content.find('.pg-prop-coll-container').append(that.grid.render().$el);

        var timer;
        var getAjaxHook = function() {
          $.ajax({
            url: urlBase,
            type: 'GET',
            beforeSend: function(xhr) {
              xhr.setRequestHeader(pgAdmin.csrf_token_header, pgAdmin.csrf_token);
              // Generate a timer for the request
              timer = setTimeout(function() {
                // notify user if request is taking longer than 1 second

                if (!$msgContainer.text()== 'Failed to retrieve data from the server.')
                  $msgContainer.text(gettext('Retrieving data from the server...'));
                $msgContainer.removeClass('d-none');
                if (self.grid) {
                  self.grid.remove();
                }
              }, 1000);
            },
          }).done(function(res) {
            clearTimeout(timer);

            if (_.isUndefined(that.grid) || _.isNull(that.grid)) return;

            that.data = res;

            if (that.data.length > 0) {

              if (!$msgContainer.hasClass('d-none')) {
                $msgContainer.addClass('d-none');
              }
              that.header.appendTo(j);
              j.append(content);

              // Listen scroll event to load more rows
              $('.pg-prop-content').on('scroll', that.__loadMoreRows.bind(that));

              that.collection.reset(that.data.splice(0, 50));

              // Listen to select all checkbox event
              that.collection.on('backgrid:select-all', that.__loadAllRows.bind(that));

              // Trigger the backgrid:select event for already selected items
              // as we have created a new grid instance.
              if(selectedModels.length > 0) {
                that.collection.each(function (model) {
                  for(var inx=0; inx < selectedModels.length; inx++){
                    if (selectedModels[inx].id == model.id){
                      model.trigger('backgrid:select', model, true);
                    }
                  }
                });
              }
            } else {
            // Do not listen the scroll event
              $('.pg-prop-content').off('scroll', that.__loadMoreRows);

              $msgContainer.text(gettext('No properties are available for the selected object.'));

            }
            selectedModels = [];
          }).fail(function(xhr, error) {
            pgBrowser.Events.trigger(
              'pgadmin:node:retrieval:error', 'properties', xhr, error.message, item, that
            );
            if (!Alertify.pgHandleItemError(xhr, error.message, {
              item: item,
              info: info,
            })) {
              Alertify.pgNotifier(
                error, xhr, gettext('Error retrieving properties - %s', error.message || that.label),
                function(msg) {
                  if(msg === 'CRYPTKEY_SET') {
                    getAjaxHook();
                  } else {
                    console.warn(arguments);
                  }
                }
              );
            }
            // show failed message.
            $msgContainer.text(gettext('Failed to retrieve data from the server.'));
          });
        };
        getAjaxHook();

        var onDrop = function(type, confirm=true) {
          let sel_row_models = this.grid.getSelectedModels(),
            sel_rows = [],
            sel_item = pgBrowser.tree.selected(),
            d = sel_item ? pgBrowser.tree.itemData(sel_item) : null,
            sel_node = d && pgBrowser.Nodes[d._type],
            url = undefined,
            msg = undefined,
            title = undefined;

          if (sel_node && sel_node.type && sel_node.type == 'coll-constraints') {
            // In order to identify the constraint type, the type should be passed to the server
            sel_rows = sel_row_models.map(row => ({id: row.get('oid'), _type: row.get('_type')}));
          }
          else {
            sel_rows = sel_row_models.map(row => row.id);
          }

          if (sel_rows.length === 0) {
            Alertify.alert(gettext('Drop Multiple'),
              gettext('Please select at least one object to delete.')
            );
            return;
          }

          if (!sel_node)
            return;

          if (type === 'dropCascade') {
            url = sel_node.generate_url(sel_item, 'delete');
            msg = gettext('Are you sure you want to drop all the selected objects and all the objects that depend on them?');
            title = gettext('DROP CASCADE multiple objects?');
          } else {
            url = sel_node.generate_url(sel_item, 'drop');
            msg = gettext('Are you sure you want to drop all the selected objects?');
            title = gettext('DROP multiple objects?');
          }

          let dropAjaxHook = function() {
            $.ajax({
              url: url,
              type: 'DELETE',
              data: JSON.stringify({'ids': sel_rows}),
              contentType: 'application/json; charset=utf-8',
            }).done(function(res) {
              if (res.success == 0) {
                pgBrowser.report_error(res.errormsg, res.info);
              } else {
                $(pgBrowser.panels['properties'].panel).removeData('node-prop');
                pgBrowser.Events.trigger(
                  'pgadmin:browser:tree:refresh', sel_item || pgBrowser.tree.selected(), {
                    success: function() {
                      sel_node.callbacks.selected.apply(sel_node, [sel_item]);
                    },
                  });
              }
              return true;
            }).fail(function(xhr, error) {
              Alertify.pgNotifier(
                error, xhr,
                gettext('Error dropping %s', d._label.toLowerCase()),
                function(alertMsg) {
                  if (alertMsg == 'CRYPTKEY_SET') {
                    onDrop(type, false);
                  } else {
                    $(pgBrowser.panels['properties'].panel).removeData('node-prop');
                    pgBrowser.Events.trigger(
                      'pgadmin:browser:tree:refresh', sel_item || pgBrowser.tree.selected(), {
                        success: function() {
                          sel_node.callbacks.selected.apply(sel_node, [sel_item]);
                        },
                      }
                    );
                  }
                }
              );
            });
          };

          if(confirm) {
            Alertify.confirm(title, msg, dropAjaxHook, null).show();
          } else {
            dropAjaxHook();
          }
          return;
        }.bind(that);
      },
      __loadMoreRows: function(e) {
        let elem = e.currentTarget;
        if ((elem.scrollHeight - 10) < elem.scrollTop + elem.offsetHeight) {
          if (this.data.length > 0) {
            this.collection.add(this.data.splice(0, 50));
          }
        }
      },
      __loadAllRows: function(tmp, checked) {
        if (this.data.length > 0) {
          this.collection.add(this.data);
          this.collection.each(function (model) {
            model.trigger('backgrid:select', model, checked);
          });
        }
      },
      generate_url: function(item, type) {
        /*
         * Using list, and collection functions of a node to get the nodes
         * under the collection, and properties of the collection respectively.
         */
        var opURL = {
            'properties': 'obj',
            'children': 'nodes',
            'drop': 'obj',
          },
          self = this;
        var collectionPickFunction = function (treeInfoValue, treeInfoKey) {
          return (treeInfoKey != self.type);
        };
        var treeInfo = this.getTreeNodeHierarchy(item);
        var actionType = type in opURL ? opURL[type] : type;
        return generateUrl.generate_url(
          pgAdmin.Browser.URL, treeInfo, actionType, self.node,
          collectionPickFunction
        );
      },
      show_query_tool: function() {
        if(pgAdmin.DataGrid) {
          pgAdmin.DataGrid.show_query_tool('', pgAdmin.Browser.tree.selected());
        }
      },
      show_search_objects: function() {
        if(pgAdmin.SearchObjects) {
          pgAdmin.SearchObjects.show_search_objects('', pgAdmin.Browser.tree.selected());
        }
      },
    });

  return pgBrowser.Collection;
});
