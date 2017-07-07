define([
  'sources/gettext', 'sources/url_for', 'jquery','alertify', 'pgadmin','codemirror',
  'sources/sqleditor_utils', 'pgadmin.browser', 'wcdocker',
  'codemirror/addon/edit/matchbrackets', 'codemirror/addon/edit/closebrackets'

], function(gettext, url_for, $, alertify, pgAdmin, codemirror, sqlEditorUtils) {
    // Some scripts do export their object in the window only.
    // Generally the one, which do no have AMD support.
    var wcDocker = window.wcDocker,
      pgBrowser = pgAdmin.Browser;

    /* Return back, this has been called more than once */
    if (pgAdmin.DataGrid)
      return pgAdmin.DataGrid;

    pgAdmin.DataGrid = {
      init: function() {
        if (this.initialized)
            return;
        this.initialized = true;
        this.title_index = 1;

        this.spinner_el = '<div class="wcLoadingContainer">'+
              '<div class="wcLoadingBackground"></div>'+
                '<div class="wcLoadingIconContainer">'+
                  '<i class="wcLoadingIcon fa fa-spinner fa-pulse"></i>'+
                '</div>'+
              '</div>';
        // Define list of nodes on which view data option appears
        var supported_nodes = [
           'table', 'view', 'mview',
           'foreign-table', 'catalog_object', 'partition'
        ],

        /* Enable/disable View data menu in tools based
         * on node selected. if selected node is present
         * in supported_nodes, menu will be enabled
         * otherwise disabled.
         */
        view_menu_enabled = function(obj) {
          if(!_.isUndefined(obj) && !_.isNull(obj))
            return (_.indexOf(supported_nodes, obj._type) !== -1 ? true: false);
          else
            return false;
        };

        // Define list of nodes on which Query tool option doesn't appears
        var unsupported_nodes = pgAdmin.unsupported_nodes = [
           'server-group', 'server', 'coll-tablespace', 'tablespace',
           'coll-role', 'role', 'coll-resource_group', 'resource_group',
           'coll-database'
        ],

        /* Enable/disable Query tool menu in tools based
         * on node selected. if selected node is present
         * in unsupported_nodes, menu will be disabled
         * otherwise enabled.
         */
        query_tool_menu_enabled = function(obj) {
          if(!_.isUndefined(obj) && !_.isNull(obj)) {
            if(_.indexOf(unsupported_nodes, obj._type) == -1) {
              if (obj._type == 'database' && obj.allowConn)
                return true;
              else if(obj._type != 'database')
                return true;
              else
                return false;
             } else {
                return false;
             }
          } else {
            return false;
          }
        };

        // Define the nodes on which the menus to be appear
        var menus = [{
          name: 'query_tool', module: this, applies: ['tools'],
          callback: 'show_query_tool', enable: query_tool_menu_enabled,
          priority: 1, label: gettext('Query Tool'),
          icon: 'fa fa-bolt'
        }];

        // Create context menu
        for (var idx = 0; idx < supported_nodes.length; idx++) {
          menus.push({
            name: 'view_all_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 3},
            applies: ['context', 'object'], callback: 'show_data_grid', enable: view_menu_enabled,
            category: 'view_data', priority: 101, label: gettext('All Rows')
          },{
            name: 'view_first_100_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 1},
            applies: ['context', 'object'], callback: 'show_data_grid', enable: view_menu_enabled,
            category: 'view_data', priority: 102, label: gettext('First 100 Rows')
          },{
            name: 'view_last_100_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 2},
            applies: ['context', 'object'], callback: 'show_data_grid', enable: view_menu_enabled,
            category: 'view_data', priority: 103, label: gettext('Last 100 Rows')
          },{
            name: 'view_filtered_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 4},
            applies: ['context', 'object'], callback: 'show_filtered_row', enable: view_menu_enabled,
            category: 'view_data', priority: 104, label: gettext('Filtered Rows...')
         });
        }

        pgAdmin.Browser.add_menu_category('view_data', gettext('View/Edit Data'), 100, 'fa fa-th');
        pgAdmin.Browser.add_menus(menus);

        // Creating a new pgAdmin.Browser frame to show the data.
        var dataGridFrameType = new pgAdmin.Browser.Frame({
          name: 'frm_datagrid',
          showTitle: true,
          isCloseable: true,
          isPrivate: true,
          url: 'about:blank'
        });

        // Load the newly created frame
        dataGridFrameType.load(pgBrowser.docker);
      },

      // This is a callback function to show data when user click on menu item.
      show_data_grid: function(data, i) {
        var self = this,
            d = pgAdmin.Browser.tree.itemData(i);
        if (d === undefined) {
          alertify.alert(
            'Data Grid Error',
            'No object selected.'
          );
          return;
        }

        // Get the parent data from the tree node hierarchy.
        var node = pgBrowser.Nodes[d._type],
          parentData = node.getTreeNodeHierarchy(i);

        // If server, database or schema is undefined then return from the function.
        if (parentData.server === undefined || parentData.database === undefined) {
          return;
        }
        // If schema, view, catalog object all are undefined then return from the function.
        if (parentData.schema === undefined && parentData.view === undefined &&
             parentData.catalog === undefined) {
          return;
        }

        var nsp_name = '';

        if (parentData.schema != undefined) {
            nsp_name = parentData.schema.label;
        }
        else if (parentData.view != undefined) {
            nsp_name = parentData.view.label;
        }
        else if (parentData.catalog != undefined) {
            nsp_name = parentData.catalog.label;
        }
        var url_params = {
          'cmd_type': data.mnuid,
          'obj_type': d._type,
          'sid': parentData.server._id,
          'did': parentData.database._id,
          'obj_id': d._id
        };

        var baseUrl = url_for('datagrid.initialize_datagrid', url_params);
        var grid_title = parentData.server.label + ' - ' + parentData.database.label + ' - '
                        + nsp_name + '.' + d.label;

        // Initialize the data grid.
        self.initialize_data_grid(baseUrl, grid_title, '');
      },

      // This is a callback function to show filtered data when user click on menu item.
      show_filtered_row: function(data, i) {
        var self = this,
            d = pgAdmin.Browser.tree.itemData(i);
        if (d === undefined) {
          alertify.alert(
            'Data Grid Error',
            'No object selected.'
          );
          return;
        }

        // Get the parent data from the tree node hierarchy.
        var node = pgBrowser.Nodes[d._type],
          parentData = node.getTreeNodeHierarchy(i);

        // If server or database is undefined then return from the function.
        if (parentData.server === undefined || parentData.database === undefined) {
          return;
        }

        // If schema, view, catalog object all are undefined then return from the function.
        if (parentData.schema === undefined && parentData.view === undefined &&
             parentData.catalog === undefined) {
          return;
        }

        var nsp_name = '';

        if (parentData.schema != undefined) {
            nsp_name = parentData.schema.label;
        }
        else if (parentData.view != undefined) {
            nsp_name = parentData.view.label;
        }
        else if (parentData.catalog != undefined) {
            nsp_name = parentData.catalog.label;
        }

        var url_params = {
          'cmd_type': data.mnuid,
          'obj_type': d._type,
          'sid': parentData.server._id,
          'did': parentData.database._id,
          'obj_id': d._id

        };

        var baseUrl = url_for('datagrid.initialize_datagrid', url_params);

        // Create url to validate the SQL filter
        var validateUrl = url_for('datagrid.filter_validate', {
                        'sid': url_params['sid'],
                        'did': url_params['did'],
                        'obj_id': url_params['obj_id'],
                      });
        var grid_title = parentData.server.label + '-' + parentData.database.label + '-'
                        + nsp_name + '.' + d.label;

        // Create filter dialog using alertify
        if (!alertify.filterDialog) {
          alertify.dialog('filterDialog', function factory() {
            return {
              main: function(title, message, baseUrl, validateUrl) {
                this.set('title', title);
                this.message = message;
                this.baseUrl = baseUrl;
                this.validateUrl = validateUrl;
              },

              setup:function() {
                return {
                  buttons:[
                    { text: "OK", className: "btn btn-primary" },
                    { text: "Cancel", className: "btn btn-danger" }
                  ],
                  options: { modal: 0, resizable: false, maximizable: false, pinnable: false}
                };
              },

              build:function() {},
              prepare:function() {
		        var $content = $(this.message),
                    $sql_filter = $content.find('#sql_filter');

                this.setContent($content.get(0));

                // Apply CodeMirror to filter text area.
                this.filter_obj = codemirror.fromTextArea($sql_filter.get(0), {
                  lineNumbers: true,
                  indentUnit: 4,
                  mode: "text/x-pgsql",
                  extraKeys: pgBrowser.editor_shortcut_keys,
                  tabSize: pgBrowser.editor_options.tabSize,
                  lineWrapping: pgAdmin.Browser.editor_options.wrapCode,
                  autoCloseBrackets: pgAdmin.Browser.editor_options.insert_pair_brackets,
                  matchBrackets: pgAdmin.Browser.editor_options.brace_matching
                });
              },

              callback: function(closeEvent) {

                if (closeEvent.button.text == gettext("OK")) {
                  var sql = this.filter_obj.getValue();
                  var that = this;

                  // Make ajax call to include the filter by selection
                  $.ajax({
                    url: that.validateUrl,
                    method: 'POST',
                    async: false,
                    contentType: "application/json",
                    data: JSON.stringify(sql),
                    success: function(res) {
                      if (res.data.status) {
                        // Initialize the data grid.
                        self.initialize_data_grid(that.baseUrl, grid_title, sql);
                      }
                      else {
                        alertify.alert(
                          'Validation Error',
                            res.data.result
                        );
                      }
                    },
                    error: function(e) {
                      alertify.alert(
                        'Validation Error',
                        e
                      );
                    }
                  });
                }
              }
            };
          });
        }

        var content = '';
        $.get(url_for('datagrid.filter'),
          function(data) {
            alertify.filterDialog('Data Filter', data, baseUrl, validateUrl).resizeTo(600, 400);
          }
        );
      },

      get_panel_title: function() {
        // Get the parent data from the tree node hierarchy.
        var tree = pgAdmin.Browser.tree,
            selected_item = tree.selected(),
            item_data = tree.itemData(selected_item);
        var self = this;

        var node = pgBrowser.Nodes[item_data._type],
          parentData = node.getTreeNodeHierarchy(selected_item);

        // If server, database is undefined then return from the function.
        if (parentData.server === undefined) {
          return;
        }
        // If Database is not available then use default db
        var db_label = parentData.database ? parentData.database.label
                                           : parentData.server.db;

        var grid_title = db_label + ' on ' + parentData.server.user.name + '@' +
                parentData.server.label;
        return grid_title;
      },

      initialize_data_grid: function(baseUrl, grid_title, sql_filter) {
        var self = this;
          self.grid_title = grid_title;

        /* Ajax call to initialize the edit grid, which creates
         * an asynchronous connection and create appropriate query
         * for the selected node.
         */
        $.ajax({
          url: baseUrl,
          method: 'POST',
          dataType: 'json',
          contentType: "application/json",
          data: JSON.stringify(sql_filter),
          success: function(res) {

            /* On successfully initialization find the dashboard panel,
             * create new panel and add it to the dashboard panel.
             */
            var url_params = {
              'trans_id': res.data.gridTransId,
              'is_query_tool': 'false',
              'editor_title': encodeURIComponent(self.grid_title)
            };

            var baseUrl = url_for('datagrid.panel', url_params);
            var grid_title = gettext('Edit Data - ') + self.grid_title;
            if (res.data.newBrowserTab) {
              var newWin = window.open(baseUrl, '_blank');

              // add a load listener to the window so that the title gets changed on page load
              newWin.addEventListener("load", function() {
                newWin.document.title = grid_title;
              });
            } else {
              var propertiesPanel = pgBrowser.docker.findPanels('properties');
              var dataGridPanel = pgBrowser.docker.addPanel('frm_datagrid', wcDocker.DOCK.STACKED, propertiesPanel[0]);

              // Set panel title and icon
              dataGridPanel.title('<span title="'+grid_title+'">'+grid_title+'</span>');
              dataGridPanel.icon('fa fa-bolt');
              dataGridPanel.focus();

              // Listen on the panel closed event.
              dataGridPanel.on(wcDocker.EVENT.CLOSED, function() {
                $.ajax({
                  url: url_for('datagrid.close', {'trans_id': res.data.gridTransId}),
                  method: 'GET'
                });
              });

              var openDataGridURL = function(j) {
                // add spinner element
                $(j).data('embeddedFrame').$container.append(self.spinner_el);
                setTimeout(function() {
                  var frameInitialized = $(j).data('frameInitialized');
                  if (frameInitialized) {
                    var frame = $(j).data('embeddedFrame');
                    if (frame) {
                      frame.openURL(baseUrl);
                      frame.$container.find('.wcLoadingContainer').hide(1);
                    }
                  } else {
                    openDataGridURL(j);
                  }
                }, 100);
              };

              openDataGridURL(dataGridPanel);
            }
          },
          error: function(e) {
            alertify.alert(
              'SQL Tool Initialize Error'
            );
          }
        });
      },

      // This is a callback function to show query tool when user click on menu item.
      show_query_tool: function(url, i, panel_title) {
        var self = this,
          sURL = url || '',
          panel_title = panel_title || '';
          d = pgAdmin.Browser.tree.itemData(i);
        if (d === undefined) {
          alertify.alert(
            'Query tool Error',
            'No object selected.'
          );
          return;
        }

        // Get the parent data from the tree node hierarchy.
        var node = pgBrowser.Nodes[d._type],
          parentData = node.getTreeNodeHierarchy(i);

        // If server, database is undefined then return from the function.
        if (parentData.server === undefined) {
          return;
        }

        var url_params = {
          'sid': parentData.server._id
        };
        var url_endpoint = 'datagrid.initialize_query_tool'
        // If database not present then use Maintenance database
        // We will handle this at server side
        if (parentData.database) {
          url_params['did'] = parentData.database._id;
          url_endpoint = 'datagrid.initialize_query_tool_with_did';
        }
        var baseUrl = url_for(url_endpoint, url_params);

        $.ajax({
          url: baseUrl,
          method: 'POST',
          dataType: 'json',
          contentType: "application/json",
          success: function(res) {
            var grid_title = self.get_panel_title();
            // Open the panel if frame is initialized
            var url_params = {
              'trans_id': res.data.gridTransId,
              'is_query_tool': 'true',
              'editor_title': encodeURIComponent(grid_title)
            }

            var baseUrl = url_for('datagrid.panel', url_params) +
                '?' + "query_url=" + encodeURI(sURL);

            // Create title for CREATE/DELETE scripts
            if (panel_title) {
              panel_title =
                sqlEditorUtils.capitalizeFirstLetter(panel_title) + ' script';
            }
            else {
              panel_title = gettext('Query - ') + grid_title;
            }

            if (res.data.newBrowserTab) {
              var newWin = window.open(baseUrl, '_blank');

              // add a load listener to the window so that the title gets changed on page load
              newWin.addEventListener("load", function() {
                newWin.document.title = panel_title;
              });
            } else {
              /* On successfully initialization find the dashboard panel,
               * create new panel and add it to the dashboard panel.
               */
              var propertiesPanel = pgBrowser.docker.findPanels('properties');
              var queryToolPanel = pgBrowser.docker.addPanel('frm_datagrid', wcDocker.DOCK.STACKED, propertiesPanel[0]);

              // Set panel title and icon
              queryToolPanel.title('<span title="'+panel_title+'">'+panel_title+'</span>');
              queryToolPanel.icon('fa fa-bolt');
              queryToolPanel.focus();

              // Listen on the panel closed event.
              queryToolPanel.on(wcDocker.EVENT.CLOSED, function() {
                $.ajax({
                  url: url_for('datagrid.close', {'trans_id': res.data.gridTransId}),
                  method: 'GET'
                });
              });

              var openQueryToolURL = function(j) {
                // add spinner element
                $(j).data('embeddedFrame').$container.append(pgAdmin.DataGrid.spinner_el);
                setTimeout(function() {
                  var frameInitialized = $(j).data('frameInitialized');
                  if (frameInitialized) {
                    var frame = $(j).data('embeddedFrame');
                    if (frame) {
                      frame.openURL(baseUrl);
                      frame.$container.find('.wcLoadingContainer').delay(1000).hide(1);
                    }
                  } else {
                    openQueryToolURL(j);
                  }
                }, 100);
              };

              openQueryToolURL(queryToolPanel);
            }
          },
          error: function(e) {
            alertify.alert(
              gettext("Query Tool Initialize Error")
            );
          }
        });
      }
    };

    return pgAdmin.DataGrid;
  });
