/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.datagrid', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'pgadmin.alertifyjs', 'sources/pgadmin', 'bundled_codemirror',
  'sources/sqleditor_utils', 'backbone',
  'tools/datagrid/static/js/show_data',
  'tools/datagrid/static/js/show_query_tool', 'pgadmin.browser.toolbar',
  'tools/datagrid/static/js/datagrid_panel_title', 'wcdocker',
], function(
  gettext, url_for, $, _, alertify, pgAdmin, codemirror, sqlEditorUtils,
  Backbone, showData, showQueryTool, toolBar, panelTitleFunc
) {
  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker,
    pgBrowser = pgAdmin.Browser;

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
            var isEnabled = (() => {
              if (!_.isUndefined(obj) && !_.isNull(obj))
                return (_.indexOf(supported_nodes, obj._type) !== -1 ? true : false);
              else
                return false;
            })();

            toolBar.enable(gettext('View Data'), isEnabled);
            toolBar.enable(gettext('Filtered Rows'), isEnabled);
            return isEnabled;
          },

          /* Enable/disable Query tool menu in tools based
         * on node selected. if selected node is present
         * in unsupported_nodes, menu will be disabled
         * otherwise enabled.
         */
          query_tool_menu_enabled = function(obj) {
            var isEnabled = (() => {
              if (!_.isUndefined(obj) && !_.isNull(obj)) {
                if (_.indexOf(pgAdmin.unsupported_nodes, obj._type) == -1) {
                  if (obj._type == 'database' && obj.allowConn) {
                    return true;
                  } else if (obj._type != 'database') {
                    return true;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              } else {
                return false;
              }
            })();

            toolBar.enable(gettext('Query Tool'), isEnabled);
            return isEnabled;
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
        showData.showDataGrid(this, pgBrowser, alertify, data, i, true, this.preferences);
      },

      // This is a callback function to show query tool when user click on menu item.
      show_query_tool: function(url, aciTreeIdentifier) {
        showQueryTool.showQueryTool(this, pgBrowser, alertify, url, aciTreeIdentifier);
      },

      create_transaction: function(baseUrl, target, is_query_tool, server_type, sURL, panel_title, sql_filter, recreate) {
        var self = this;
        target =  target || self;
        if (recreate) {
          baseUrl += '?recreate=1';
        }

        /* Send the data only if required. Sending non required data may
         * cause connection reset error if data is not read by flask server
         */
        let reqData = null;
        if(sql_filter != '') {
          reqData = JSON.stringify(sql_filter);
        }

        $.ajax({
          url: baseUrl,
          method: 'POST',
          dataType: 'json',
          data: reqData,
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
              alertify.alert(gettext('Query Tool initialization error'),
                err.errormsg
              );
            } catch (e) {
              alertify.alert(gettext('Query Tool initialization error'),
                e.statusText
              );
            }
          });
      },
      launch_grid: function(trans_obj) {
        var self = this,
          panel_title = trans_obj.panel_title,
          grid_title = trans_obj.panel_title;

        // Open the panel if frame is initialized
        let titileForURLObj = sqlEditorUtils.removeSlashInTheString(grid_title);
        var url_params = {
            'trans_id': trans_obj.gridTransId,
            'is_query_tool': trans_obj.is_query_tool,
            'editor_title': titileForURLObj.title,
          },
          baseUrl = url_for('datagrid.panel', url_params) +
            '?' + 'query_url=' + encodeURI(trans_obj.sURL) +
            '&server_type=' + encodeURIComponent(trans_obj.server_type) +
            '&fslashes=' + titileForURLObj.slashLocations;

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
          panelTitleFunc.setQueryToolDockerTitle(queryToolPanel, trans_obj.is_query_tool, panel_title);
          queryToolPanel.focus();

          // Listen on the panel closed event.
          queryToolPanel.on(wcDocker.EVENT.CLOSED, function() {
            $.ajax({
              url: url_for('datagrid.close', {'trans_id': trans_obj.gridTransId}),
              method: 'DELETE',
            });
          });

          var openQueryToolURL = function(j) {
            // add spinner element
            let $spinner_el =
              $(`<div class="pg-sp-container">
                    <div class="pg-sp-content">
                        <div class="row">
                            <div class="col-12 pg-sp-icon"></div>
                        </div>
                    </div>
                </div>`).appendTo($(j).data('embeddedFrame').$container);

            let init_poller_id = setInterval(function() {
              var frameInitialized = $(j).data('frameInitialized');
              if (frameInitialized) {
                clearInterval(init_poller_id);
                var frame = $(j).data('embeddedFrame');
                if (frame) {
                  frame.onLoaded(()=>{
                    $spinner_el.remove();
                  });
                  frame.openURL(baseUrl);
                }
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
