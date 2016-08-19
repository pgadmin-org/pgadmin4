define(
  ['jquery','alertify', 'pgadmin','codemirror', 'codemirror/mode/sql/sql',
   'pgadmin.browser', 'wcdocker'],
  function($, alertify, pgAdmin, CodeMirror) {
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
           'foreign-table', 'catalog_object'
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
          if(!_.isUndefined(obj) && !_.isNull(obj))
            return (_.indexOf(unsupported_nodes, obj._type) !== -1 ? false: true);
          else
            return false;
        };

        // Define the nodes on which the menus to be appear
        var menus = [{
          name: 'query_tool', module: this, applies: ['tools'],
          callback: 'show_query_tool', enable: query_tool_menu_enabled,
          priority: 1, label: '{{ _('Query Tool') }}',
          icon: 'fa fa-bolt'
        }];

        // Create context menu
        for (var idx = 0; idx < supported_nodes.length; idx++) {
          menus.push({
            name: 'view_all_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 3},
            applies: ['context', 'object'], callback: 'show_data_grid', enable: view_menu_enabled,
            category: 'view_data', priority: 101, label: '{{ _('View All Rows') }}'
          },{
            name: 'view_first_100_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 1},
            applies: ['context', 'object'], callback: 'show_data_grid', enable: view_menu_enabled,
            category: 'view_data', priority: 102, label: '{{ _('View First 100 Rows') }}'
          },{
            name: 'view_last_100_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 2},
            applies: ['context', 'object'], callback: 'show_data_grid', enable: view_menu_enabled,
            category: 'view_data', priority: 103, label: '{{ _('View Last 100 Rows') }}'
          },{
            name: 'view_filtered_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx], module: this, data: {mnuid: 4},
            applies: ['context', 'object'], callback: 'show_filtered_row', enable: view_menu_enabled,
            category: 'view_data', priority: 104, label: '{{ _('View Filtered Rows...') }}'
         });
        }

        pgAdmin.Browser.add_menu_category('view_data', '{{ _('View Data') }}', 100, 'fa fa-th');
        pgAdmin.Browser.add_menus(menus);

        // Creating a new pgAdmin.Browser frame to show the data.
        var dataGridFrameType = new pgAdmin.Browser.Frame({
          name: 'frm_datagrid',
          title: 'Edit Data',
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

        var baseUrl = "{{ url_for('datagrid.index') }}" + "initialize/datagrid/" + data.mnuid + "/" + d._type + "/" +
          parentData.server._id + "/" + parentData.database._id + "/" + d._id;

        var grid_title = parentData.server.label + '-' + parentData.database.label + '-'
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

        // Create base url to initialize the edit grid
        var baseUrl = "{{ url_for('datagrid.index') }}" + "initialize/datagrid/" + data.mnuid + "/" + d._type + "/" +
          parentData.server._id + "/" + parentData.database._id + "/" + d._id;

        // Create url to validate the SQL filter
        var validateUrl = "{{ url_for('datagrid.index') }}" + "filter/validate/" +
          parentData.server._id + "/" + parentData.database._id + "/" + d._id;

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
                this.filter_obj = CodeMirror.fromTextArea($sql_filter.get(0), {
                  lineNumbers: true,
                  lineWrapping: true,
                  matchBrackets: true,
                  indentUnit: 4,
                  mode: "text/x-pgsql",
                  extraKeys: pgBrowser.editor_shortcut_keys,
                  tabSize: pgBrowser.editor_options.tabSize
                });
              },

              callback: function(closeEvent) {

                if (closeEvent.button.text == "{{ _('OK') }}") {
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
        $.get("{{ url_for('datagrid.index') }}" + "filter",
          function(data) {
            alertify.filterDialog('Data Filter', data, baseUrl, validateUrl).resizeTo(600, 400);
          }
        );
      },

      initialize_data_grid: function(baseUrl, grid_title, sql_filter) {
        var self = this;

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
            var panel_title = ' Query-' + self.title_index;
            self.title_index += 1;

            var dashboardPanel = pgBrowser.docker.findPanels('dashboard');
            dataGridPanel = pgBrowser.docker.addPanel('frm_datagrid', wcDocker.DOCK.STACKED, dashboardPanel[0]);
            dataGridPanel.title(panel_title);
            dataGridPanel.icon('fa fa-bolt');
            dataGridPanel.focus();

            // Listen on the panel closed event.
            dataGridPanel.on(wcDocker.EVENT.CLOSED, function() {
              $.ajax({
                url: "{{ url_for('datagrid.index') }}" + "close/" + res.data.gridTransId,
                method: 'GET'
              });
            });

            // Open the panel if frame is initialized
            baseUrl = "{{ url_for('datagrid.index') }}"  + "panel/" + res.data.gridTransId + "/false/"
                                                                    + encodeURIComponent(grid_title);
            var openDataGridURL = function(j) {
              j.data('embeddedFrame').$container.append(self.spinner_el);
              setTimeout(function() {
                var frameInitialized = j.data('frameInitialized');
                if (frameInitialized) {
                  var frame = j.data('embeddedFrame');
                  if (frame) {
                    frame.openURL(baseUrl);
                    frame.$container.find('.wcLoadingContainer').hide(1);
                  }
                } else {
                    openDataGridURL(j);
                }
              }, 100);
            };
            openDataGridURL($(dataGridPanel));
          },
          error: function(e) {
            alertify.alert(
              'SQL Tool Initialize Error',
              e.responseJSON.errormsg
            );
          }
        });
      },

      // This is a callback function to show query tool when user click on menu item.
      show_query_tool: function(url, i) {
        var self = this,
          sURL = url || '',
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

        var baseUrl = "{{ url_for('datagrid.index') }}" + "initialize/query_tool/" + parentData.server._id;

        // If database not present then use Maintenance database
        // We will handle this at server side
        if (parentData.database) {
          baseUrl += "/" + parentData.database._id;
        }
        // If Database is not available then use default db
        var db_label = parentData.database ? parentData.database.label
                                           : parentData.server.db;

        var grid_title = db_label + ' on ' + parentData.server.user.name + '@' +
                parentData.server.label ;

        var panel_title = ' Query-';

        if (!_.isUndefined(self.title_index) && !isNaN(self.title_index)) {
          panel_title += self.title_index;
          self.title_index += 1;
        } else {
          panel_title += "{{ _(' untitled') }}";
        }

        $.ajax({
          url: baseUrl,
          method: 'POST',
          dataType: 'json',
          contentType: "application/json",
          success: function(res) {

            /* On successfully initialization find the dashboard panel,
             * create new panel and add it to the dashboard panel.
             */
            var dashboardPanel = pgBrowser.docker.findPanels('dashboard');
            queryToolPanel = pgBrowser.docker.addPanel('frm_datagrid', wcDocker.DOCK.STACKED, dashboardPanel[0]);
            queryToolPanel.title(panel_title);
            queryToolPanel.icon('fa fa-bolt');
            queryToolPanel.focus();

            // Listen on the panel closed event.
            queryToolPanel.on(wcDocker.EVENT.CLOSED, function() {
              $.ajax({
                url: "{{ url_for('datagrid.index') }}" + "close/" + res.data.gridTransId,
                method: 'GET'
              });
            });

            // Open the panel if frame is initialized
            baseUrl = "{{ url_for('datagrid.index') }}"  + "panel/" + res.data.gridTransId + "/true/"
                        + encodeURIComponent(grid_title) + '?' + "query_url=" + encodeURI(sURL);
            var openQueryToolURL = function(j) {
              j.data('embeddedFrame').$container.append(pgAdmin.DataGrid.spinner_el);
              setTimeout(function() {
                var frameInitialized = j.data('frameInitialized');
                if (frameInitialized) {
                  var frame = j.data('embeddedFrame');
                  if (frame) {
                    frame.openURL(baseUrl);
                    frame.$container.find('.wcLoadingContainer').delay(1000).hide(1);
                  }
                } else {
                  openQueryToolURL(j);
                }
              }, 100);
            };
            openQueryToolURL($(queryToolPanel));
          },
          error: function(e) {
            alertify.alert(
              "{{ _('Query Tool Initialize Error') }}",
              e.responseJSON.errormsg
            );
          }
        });
      }
    };

    return pgAdmin.DataGrid;
  });
