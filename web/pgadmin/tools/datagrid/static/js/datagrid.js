define('pgadmin.datagrid', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'pgadmin.alertifyjs', 'sources/pgadmin', 'bundled_codemirror',
  'sources/sqleditor_utils', 'backbone',
  'tools/datagrid/static/js/show_data',
  'tools/datagrid/static/js/get_panel_title',
  'tools/datagrid/static/js/show_query_tool',
  'wcdocker',
], function(
  gettext, url_for, $, _, alertify, pgAdmin, codemirror, sqlEditorUtils,
  Backbone, showData, panelTitle, showQueryTool
) {
  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker,
    pgBrowser = pgAdmin.Browser,
    CodeMirror = codemirror.default;

  /* Return back, this has been called more than once */
  if (pgAdmin.DataGrid)
    return pgAdmin.DataGrid;

  pgAdmin.DataGrid =
  _.extend(
    {
      init: function() {
        if (this.initialized)
          return;
        this.initialized = true;
        this.title_index = 1;


        let self = this;
        /* Cache may take time to load for the first time
         * Keep trying till available
         */
        let cacheIntervalId = setInterval(function() {
          if(pgBrowser.preference_version() > 0) {
            self.preferences = pgBrowser.get_preferences_for_module('sqleditor');
            clearInterval(cacheIntervalId);
          }
        },0);

        pgBrowser.onPreferencesChange('sqleditor', function() {
          self.preferences = pgBrowser.get_preferences_for_module('sqleditor');
        });


        this.spinner_el = '<div class="wcLoadingContainer">'+
              '<div class="wcLoadingBackground"></div>'+
                '<div class="wcLoadingIconContainer">'+
                  '<i class="wcLoadingIcon fa fa-spinner fa-pulse"></i>'+
                '</div>'+
              '</div>';
        // Define list of nodes on which view data option appears
        var supported_nodes = [
            'table', 'view', 'mview',
            'foreign_table', 'catalog_object', 'partition',
          ],

        /* Enable/disable View data menu in tools based
         * on node selected. if selected node is present
         * in supported_nodes, menu will be enabled
         * otherwise disabled.
         */
          view_menu_enabled = function(obj) {
            if (!_.isUndefined(obj) && !_.isNull(obj))
              return (_.indexOf(supported_nodes, obj._type) !== -1 ? true : false);
            else
              return false;
          },

        /* Enable/disable Query tool menu in tools based
         * on node selected. if selected node is present
         * in unsupported_nodes, menu will be disabled
         * otherwise enabled.
         */
          query_tool_menu_enabled = function(obj) {
            if (!_.isUndefined(obj) && !_.isNull(obj)) {
              if (_.indexOf(pgAdmin.unsupported_nodes, obj._type) == -1) {
                if (obj._type == 'database' && obj.allowConn)
                  return true;
                else if (obj._type != 'database')
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
          name: 'query_tool',
          module: this,
          applies: ['tools'],
          callback: 'show_query_tool',
          enable: query_tool_menu_enabled,
          priority: 1,
          label: gettext('Query Tool'),
          icon: 'fa fa-bolt',
        }];

        // Create context menu
        for (var idx = 0; idx < supported_nodes.length; idx++) {
          menus.push({
            name: 'view_all_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx],
            module: this,
            data: {
              mnuid: 3,
            },
            applies: ['context', 'object'],
            callback: 'show_data_grid',
            enable: view_menu_enabled,
            category: 'view_data',
            priority: 101,
            label: gettext('All Rows'),
          }, {
            name: 'view_first_100_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx],
            module: this,
            data: {
              mnuid: 1,
            },
            applies: ['context', 'object'],
            callback: 'show_data_grid',
            enable: view_menu_enabled,
            category: 'view_data',
            priority: 102,
            label: gettext('First 100 Rows'),
          }, {
            name: 'view_last_100_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx],
            module: this,
            data: {
              mnuid: 2,
            },
            applies: ['context', 'object'],
            callback: 'show_data_grid',
            enable: view_menu_enabled,
            category: 'view_data',
            priority: 103,
            label: gettext('Last 100 Rows'),
          }, {
            name: 'view_filtered_rows_context_' + supported_nodes[idx],
            node: supported_nodes[idx],
            module: this,
            data: {
              mnuid: 4,
            },
            applies: ['context', 'object'],
            callback: 'show_filtered_row',
            enable: view_menu_enabled,
            category: 'view_data',
            priority: 104,
            label: gettext('Filtered Rows...'),
          });
        }

        pgAdmin.Browser.add_menu_category('view_data', gettext('View/Edit Data'), 100, '');
        pgAdmin.Browser.add_menus(menus);

        // Creating a new pgAdmin.Browser frame to show the data.
        var dataGridFrameType = new pgAdmin.Browser.Frame({
          name: 'frm_datagrid',
          showTitle: true,
          isCloseable: true,
          isPrivate: true,
          url: 'about:blank',
        });

        // Load the newly created frame
        dataGridFrameType.load(pgBrowser.docker);
        this.on('pgadmin-datagrid:transaction:created', function(trans_obj) {
          this.launch_grid(trans_obj);
        });
      },

      // This is a callback function to show data when user click on menu item.
      show_data_grid: function(data, i) {
        showData.showDataGrid(this, pgBrowser, alertify, data, i);
      },

      // This is a callback function to show filtered data when user click on menu item.
      show_filtered_row: function(data, i) {
        var self = this,
          d = pgAdmin.Browser.tree.itemData(i);
        if (d === undefined) {
          alertify.alert(
            gettext('Data Grid Error'),
            gettext('No object selected.')
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
          'sgid': parentData.server_group._id,
          'sid': parentData.server._id,
          'did': parentData.database._id,
          'obj_id': d._id,
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
                  buttons:[{
                    text: gettext('OK'),
                    key: 13,
                    className: 'btn btn-primary',
                  },
                  {
                    text: gettext('Cancel'),
                    key: 27,
                    className: 'btn btn-danger',
                  },
                  ],
                  options: {
                    modal: 0,
                    resizable: true,
                    maximizable: false,
                    pinnable: false,
                    autoReset: false,
                  },
                };
              },
              build: function() {
                alertify.pgDialogBuild.apply(this);
              },
              prepare:function() {
                var self = this,
                  $content = $(this.message),
                  $sql_filter = $content.find('#sql_filter');

                $(this.elements.body.childNodes[0]).addClass(
                  'dataview_filter_dialog'
                );

                this.setContent($content.get(0));

                // Apply CodeMirror to filter text area.
                this.filter_obj = CodeMirror.fromTextArea($sql_filter.get(0), {
                  lineNumbers: true,
                  mode: 'text/x-pgsql',
                  extraKeys: pgBrowser.editor_shortcut_keys,
                  indentWithTabs: !this.preferences.use_spaces,
                  indentUnit: this.preferences.tab_size,
                  tabSize: this.preferences.tab_size,
                  lineWrapping: this.preferences.wrap_code,
                  autoCloseBrackets: this.preferences.insert_pair_brackets,
                  matchBrackets: this.preferences.brace_matching,
                });

                setTimeout(function() {
                  // Set focus on editor
                  self.filter_obj.focus();
                }, 500);
              },

              callback: function(closeEvent) {

                if (closeEvent.button.text == gettext('OK')) {
                  var sql = this.filter_obj.getValue();
                  var that = this;

                  // Make ajax call to include the filter by selection
                  $.ajax({
                    url: that.validateUrl,
                    method: 'POST',
                    async: false,
                    contentType: 'application/json',
                    data: JSON.stringify(sql),
                  })
                  .done(function(res) {
                    if (res.data.status) {
                      // Initialize the data grid.
                      self.create_transaction(that.baseUrl, null, 'false', parentData.server.server_type, '', grid_title, sql, false);
                    }
                    else {
                      alertify.alert(
                        gettext('Validation Error'),
                          res.data.result
                      );
                    }
                  })
                  .fail(function(e) {
                    alertify.alert(
                      gettext('Validation Error'),
                      e
                    );
                  });
                }
              },
            };
          });
        }

        $.get(url_for('datagrid.filter'),
          function(data) {
            alertify.filterDialog('Data Filter', data, baseUrl, validateUrl)
                    .resizeTo(300, 200);
          }
        );
      },

      get_panel_title: function() {
        return panelTitle.getPanelTitle(pgBrowser);
      },
      // This is a callback function to show query tool when user click on menu item.
      show_query_tool: function(url, aciTreeIdentifier, panelTitle) {
        showQueryTool.showQueryTool(this, pgBrowser, alertify, url,
          aciTreeIdentifier, panelTitle);
      },
      create_transaction: function(baseUrl, target, is_query_tool, server_type, sURL, panel_title, sql_filter, recreate) {
        var self = this;
        target =  target || self;
        if (recreate) {
          baseUrl += '?recreate=1';
        }
        $.ajax({
          url: baseUrl,
          method: 'POST',
          dataType: 'json',
          data: JSON.stringify(sql_filter),
          contentType: 'application/json',
        })
        .done(function(res) {
          res.data.is_query_tool = is_query_tool;
          res.data.server_type = server_type;
          res.data.sURL = sURL;
          res.data.panel_title = panel_title;
          target.trigger('pgadmin-datagrid:transaction:created', res.data);
        })
        .fail(function(xhr) {
          if (target !== self) {
            if(xhr.status == 503 && xhr.responseJSON.info != undefined &&
                xhr.responseJSON.info == 'CONNECTION_LOST') {
              setTimeout(function() {
                target.handle_connection_lost(true, xhr);
              });
              return;
            }
          }

          try {
            var err = JSON.parse(xhr.responseText);
            alertify.alert(gettext('Query Tool Initialize Error'),
              err.errormsg
            );
          } catch (e) {
            alertify.alert(
              e.statusText, gettext('Query Tool Initialize Error')
            );
          }
        });
      },
      launch_grid: function(trans_obj) {
        var self = this,
          panel_title = trans_obj.panel_title,
          grid_title = self.get_panel_title(),
          // Open the panel if frame is initialized
          url_params = {
            'trans_id': trans_obj.gridTransId,
            'is_query_tool': trans_obj.is_query_tool,
            'editor_title': encodeURIComponent(grid_title),
          },
          baseUrl = url_for('datagrid.panel', url_params) +
            '?' + 'query_url=' + encodeURI(trans_obj.sURL) + '&server_type=' + encodeURIComponent(trans_obj.server_type);

        if(trans_obj.is_query_tool == 'false') {
          panel_title = gettext('Edit Data - ') + grid_title;
        } else {
          // Create title for CREATE/DELETE scripts
          if (panel_title) {
            panel_title =
              sqlEditorUtils.capitalizeFirstLetter(panel_title) + ' script';
          } else {
            panel_title = gettext('Query - ') + grid_title;
          }
        }

        if (self.preferences.new_browser_tab) {
          var newWin = window.open(baseUrl, '_blank');

          // add a load listener to the window so that the title gets changed on page load
          newWin.addEventListener('load', function() {
            newWin.document.title = panel_title;

            /* Set the initial version of pref cache the new window is having
             * This will be used by the poller to compare with window openers
             * pref cache version
             */
            //newWin.pgAdmin.Browser.preference_version(pgBrowser.preference_version());
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
              url: url_for('datagrid.close', {'trans_id': trans_obj.gridTransId}),
              method: 'GET',
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
    },
    Backbone.Events);

  return pgAdmin.DataGrid;
});
