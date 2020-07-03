/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.dashboard', [
  'sources/url_for', 'sources/gettext', 'require', 'jquery', 'underscore',
  'sources/pgadmin', 'backbone', 'backgrid', './charting',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'sources/nodes/dashboard',
  'sources/utils', 'sources/window', 'pgadmin.browser', 'bootstrap', 'wcdocker',
], function(
  url_for, gettext, r, $, _, pgAdmin, Backbone, Backgrid, charting,
  Alertify, Backform, NodesDashboard, commonUtils, pgWindow
) {

  pgAdmin.Browser = pgAdmin.Browser || {};
  var pgBrowser = pgAdmin.Browser;

  /* Return back, this has been called more than once */
  if (pgAdmin.Dashboard)
    return;

  var dashboardVisible = true,
    cancel_query_url = '',
    terminate_session_url = '',
    is_super_user = false,
    current_user, maintenance_database,
    is_server_dashboard = false,
    is_database_dashboard = false;

  // Custom BackGrid cell, Responsible for cancelling active sessions
  var customDashboardActionCell = Backgrid.Extension.DeleteCell.extend({
    render: function() {
      this.$el.empty();
      var self = this,
        cell_action = self.column.get('cell_action');
      // if cancel query button then
      if (cell_action === 'cancel') {
        this.$el.html(
          '<i class=\'fa fa-stop\' data-toggle=\'tooltip\' ' +
          'title=\'' + gettext('Cancel the active query') +
          '\' aria-label=\''+ gettext('Cancel the active query') +'\'></i>'
        );
      } else {
        this.$el.html(
          '<i class=\'fa fa-times-circle text-danger\' data-toggle=\'tooltip\' ' +
          'title=\'' + gettext('Terminate the session') +
          '\' aria-label=\''+ gettext('Terminate the session') +'\'></i>'
        );
      }
      this.$el.attr('tabindex', 0);
      this.$el.on('keydown', function(e) {
        // terminating session or cancel the active query.
        if (e.keyCode == 32) {
          self.$el.click();
        }
      });
      this.delegateEvents();
      return this;
    },
    deleteRow: function(e) {
      var self = this,
        title, txtConfirm, txtSuccess, txtError, action_url,
        cell_action = self.column.get('cell_action');

      e.preventDefault();

      var canDeleteRow = Backgrid.callByNeed(
        self.column.get('canDeleteRow'), self.column, self.model
      );
      // If we are not allowed to cancel the query, return from here
      if (!canDeleteRow)
        return;

      // This will refresh the grid
      let refresh_grid = () => {
        $('#btn_refresh').trigger('click');
      };

      if (cell_action === 'cancel') {
        title = gettext('Cancel Active Query?');
        txtConfirm = gettext('Are you sure you wish to cancel the active query?');
        txtSuccess = gettext('Active query cancelled successfully.');
        txtError = gettext('An error occurred whilst cancelling the active query.');
        action_url = cancel_query_url + self.model.get('pid');
      } else {
        title = gettext('Terminate Session?');
        txtConfirm = gettext('Are you sure you wish to terminate the session?');
        txtSuccess = gettext('Session terminated successfully.');
        txtError = gettext('An error occurred whilst terminating the active query.');
        action_url = terminate_session_url + self.model.get('pid');
      }

      Alertify.confirm(
        title, txtConfirm,
        function() {
          $.ajax({
            url: action_url,
            type: 'DELETE',
          })
            .done(function(res) {
              if (res == gettext('Success')) {
                Alertify.success(txtSuccess);
                refresh_grid();
              } else {
                Alertify.error(txtError);
              }
            })
            .fail(function(xhr, status, error) {
              Alertify.pgRespErrorNotify(xhr, error);
            });
        },
        function() {
          return true;
        }
      );
    },
  });


  // Subnode Cell, which will display subnode control
  var SessionDetailsCell = Backgrid.Extension.ObjectCell.extend({
    enterEditMode: function() {
      // Notify that we are about to enter in edit mode for current cell.
      this.model.trigger('enteringEditMode', [this]);

      Backgrid.Cell.prototype.enterEditMode.apply(this, arguments);
      /* Make sure - we listen to the click event */
      this.delegateEvents();
      var editable = Backgrid.callByNeed(this.column.editable(), this.column, this.model);

      if (editable) {
        this.$el.html(
          '<i class=\'fa fa-caret-down subnode-edit-in-process\'></i>'
        );
        this.model.trigger(
          'pg-sub-node:opened', this.model, this
        );
      }
    },
    render: function() {
      this.$el.empty();
      this.$el.html(
        '<i class=\'fa fa-caret-right\' data-toggle=\'tooltip\' ' +
        'title=\'' + gettext('View the active session details') +
        '\' aria-label=\''+ gettext('View the active session details') +'\'></i>'
      );
      this.delegateEvents();
      if (this.grabFocus)
        this.$el.trigger('focus');
      return this;
    },
  });

  // Subnode Model
  var ActiveQueryDetailsModel = Backbone.Model.extend({
    defaults: {
      version: null,
      /* Postgres version */
    },
    schema: [{
      id: 'backend_type',
      label: gettext('Backend type'),
      type: 'text',
      editable: true,
      readonly: true,
      group: gettext('Details'),
      visible: function() {
        return this.version >= 100000;
      },
    }, {
      id: 'query_start',
      label: gettext('Query started at'),
      type: 'text',
      editable: false,
      readonly: true,
      group: gettext('Details'),
    }, {
      id: 'state_change',
      label: gettext('Last state changed at'),
      type: 'text',
      editable: true,
      readonly: true,
      group: gettext('Details'),
    }, {
      id: 'query',
      label: gettext('SQL'),
      type: 'text',
      editable: true,
      readonly: true,
      control: Backform.SqlFieldControl,
      group: gettext('Details'),
    }],
  });

  pgAdmin.Dashboard = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      this.sid = this.did = -1;
      this.version = -1;


      // Bind the Dashboard object with the 'object_selected' function
      var selected = this.object_selected.bind(this);
      var disconnected = this.object_disconnected.bind(this);

      // Listen for selection of any of object
      pgBrowser.Events.on('pgadmin-browser:tree:selected', selected);

      // Listen for server disconnected event
      pgBrowser.Events.on('pgadmin:server:disconnect', disconnected);

      // Load the default welcome dashboard
      var url = url_for('dashboard.index');

      /* Store the chart objects, refresh freq and next refresh time */
      this.chart_store = {};
      this.charts_poller_int_id = -1;

      var dashboardPanel = pgBrowser.panels['dashboard'].panel;
      if (dashboardPanel) {
        var div = dashboardPanel.layout().scene().find('.pg-panel-content');

        if (div) {
          var ajaxHook = function() {
            $.ajax({
              url: url,
              type: 'GET',
              dataType: 'html',
            })
              .done(function(data) {
                $(div).html(data);
              })
              .fail(function(xhr, error) {
                Alertify.pgNotifier(
                  error, xhr,
                  gettext('An error occurred whilst loading the dashboard.'),
                  function(msg) {
                    if(msg === 'CRYPTKEY_SET') {
                      ajaxHook();
                    } else {
                      $(div).html(
                        '<div class="pg-panel-message" role="alert">' + gettext('An error occurred whilst loading the dashboard.') + '</div>'
                      );
                    }
                  }
                );
              });
          };
          $(div).html(
            '<div class="pg-panel-message" role="alert">' + gettext('Loading dashboard...') + '</div>'
          );
          ajaxHook();

          // Cache the current IDs for next time
          $(dashboardPanel).data('sid', -1);
          $(dashboardPanel).data('did', -1);
        }
      }
    },

    // Handle Server Disconnect
    object_disconnected: function() {
      let item = pgBrowser.tree.selected(),
        itemData = item && pgBrowser.tree.itemData(item);

      // The server connected may not be the same one, which was selected, and
      // we do care out the current selected one only.
      if (item.length != 0) {
        this.object_selected(item, itemData, pgBrowser.Nodes[itemData._type]);
      }
    },

    // Handle treeview clicks
    object_selected: function(item, itemData, node) {
      let self = this;

      if (dashboardVisible === false) {
        /*
         * Clear all the interval functions, even when dashboard is not
         * visible (in case of connection of the object got disconnected).
         */
        if (
          !_.isUndefined(itemData.connected) &&
            itemData.connected !== true
        ) {
          self.clearChartFromStore();
        }
      } else if (itemData && itemData._type) {
        var treeHierarchy = node.getTreeNodeHierarchy(item),
          url = NodesDashboard.url(itemData, item, treeHierarchy);

        if (url === null) {
          url = url_for('dashboard.index');
          self.version = (treeHierarchy.server && treeHierarchy.server.version) || 0;

          cancel_query_url = url + 'cancel_query/';
          terminate_session_url = url + 'terminate_session/';

          // Check if user is super user
          var server = treeHierarchy['server'];
          maintenance_database = (server && server.db) || null;

          if (server && server.user && server.user.is_superuser) {
            is_super_user = true;
          } else {
            is_super_user = false;
            // Set current user
            current_user = (server && server.user) ? server.user.name : null;
          }

          if ('database' in treeHierarchy) {
            self.sid = treeHierarchy.server._id;
            self.did = treeHierarchy.database._id;
            is_server_dashboard = false;
            is_database_dashboard = true;
            url += self.sid + '/' + self.did;
            cancel_query_url += self.sid + '/' + self.did + '/';
            terminate_session_url += self.sid + '/' + self.did + '/';
          } else if ('server' in treeHierarchy) {
            self.sid = treeHierarchy.server._id;
            self.did = -1;
            is_server_dashboard = true;
            is_database_dashboard = false;
            url += self.sid;
            cancel_query_url += self.sid + '/';
            terminate_session_url += self.sid + '/';
          } else {
            is_server_dashboard = is_database_dashboard = false;
          }
        } else {
          is_server_dashboard = is_database_dashboard = false;
        }

        var dashboardPanel = pgBrowser.panels['dashboard'].panel;
        if (dashboardPanel) {
          var div = dashboardPanel.layout().scene().find(
            '.pg-panel-content'
          );

          if (div) {
            if (itemData.connected || _.isUndefined(itemData.connected)) {
              // Avoid unnecessary reloads
              if (
                url !== $(dashboardPanel).data('dashboard_url') || (
                  url === $(dashboardPanel).data('dashboard_url') &&
                  $(dashboardPanel).data('server_status') == false
                )
              ) {
                $(div).empty();

                /* Clear all the charts previous dashboards */
                self.clearChartFromStore();

                let ajaxHook = function() {
                  $.ajax({
                    url: url,
                    type: 'GET',
                    dataType: 'html',
                  })
                    .done(function(data) {
                      $(div).html(data);
                      self.init_dashboard();
                    })
                    .fail(function(xhr, error) {
                      Alertify.pgNotifier(
                        error, xhr,
                        gettext('An error occurred whilst loading the dashboard.'),
                        function(msg) {
                          if(msg === 'CRYPTKEY_SET') {
                            ajaxHook();
                          } else {
                            $(div).html(
                              '<div class="pg-panel-message" role="alert">' + gettext('An error occurred whilst loading the dashboard.') + '</div>'
                            );
                          }
                        }
                      );
                    });
                };
                $(div).html(
                  '<div class="pg-panel-message" role="alert">' + gettext('Loading dashboard...') + '</div>'
                );
                ajaxHook();
                $(dashboardPanel).data('server_status', true);
              }
            } else {
              $(div).empty();
              if (
                !_.isUndefined(itemData.connected) &&
                  itemData.connected !== true
              ) {
                /* Clear all the charts previous dashboards */
                self.clearChartFromStore();
              }
              $(div).html(
                '<div class="pg-panel-message" role="alert">' + gettext('Please connect to the selected server to view the dashboard.') + '</div>'
              );
              $(dashboardPanel).data('server_status', false);
            }
            // Cache the current IDs for next time
            $(dashboardPanel).data('dashboard_url', url);
          }
        }
      }
    },

    // Render the charts
    renderCharts: function(charts_config) {

      let self = this,
        tooltipFormatter = function(refresh, currVal) {
          return(`Seconds ago: ${parseInt(currVal.x * refresh)}</br>
                  Value: ${currVal.y}`);
        },
        curr_epoch=commonUtils.getEpoch();

      self.stopChartsPoller();

      charts_config.map((chart_config) => {
        if(self.chart_store[chart_config.chart_name]
          && self.old_preferences[chart_config.refresh_pref_name] !=
            self.preferences[chart_config.refresh_pref_name]) {
          self.clearChartFromStore(chart_config.chart_name);
        }

        if(self.chart_store[chart_config.chart_name]) {
          let chart_obj = self.chart_store[chart_config.chart_name].chart_obj;
          chart_obj.setOptions(chart_config.options, false);
          chart_obj.setTooltipFormatter(
            tooltipFormatter.bind(null, self.preferences[chart_config.refresh_pref_name])
          );
        }

        if(!self.chart_store[chart_config.chart_name]) {
          let chart_obj = new charting.Chart(chart_config.container, chart_config.options);

          chart_obj.setTooltipFormatter(
            tooltipFormatter.bind(null, self.preferences[chart_config.refresh_pref_name])
          );

          chart_obj.setOtherData('counter', chart_config.counter);

          self.chart_store[chart_config.chart_name] = {
            'chart_obj' : chart_obj,
            'refresh_on': curr_epoch,
            'refresh_rate': self.preferences[chart_config.refresh_pref_name],
          };
        }
      });

      self.startChartsPoller(self.chart_store, self.sid, self.did);
    },

    getStatsUrl: function(sid=-1, did=-1, chart_names=[]) {
      let base_url = url_for('dashboard.dashboard_stats');
      base_url += '/' + sid;
      base_url += (did > 0) ? ('/' + did) : '';
      base_url += '?chart_names=' + chart_names.join(',');
      return base_url;
    },

    updateChart: function(chart_obj, new_data){
      // Dataset format:
      // [
      //     { data: [[0, y0], [1, y1]...], label: 'Label 1', [options] },
      //     { data: [[0, y0], [1, y1]...], label: 'Label 2', [options] },
      //     { data: [[0, y0], [1, y1]...], label: 'Label 3', [options] }
      // ]
      let dataset = chart_obj.getOtherData('dataset') || [],
        counter_prev_data = chart_obj.getOtherData('counter_prev_data') || new_data,
        counter = chart_obj.getOtherData('counter') || false;

      if (dataset.length == 0) {
        // Create the initial data structure
        for (let label in new_data) {
          dataset.push({
            'data': [
              [0, counter ? (new_data[label] - counter_prev_data[label]) : new_data[label]],
            ],
            'label': label,
          });
        }
      } else {
        Object.keys(new_data).forEach((label, label_ind) => {
          // Push new values onto the existing data structure
          // If this is a counter stat, we need to subtract the previous value
          if (!counter) {
            dataset[label_ind]['data'].unshift([0, new_data[label]]);
          } else {
            // Store the current value, minus the previous one we stashed.
            // It's possible the tab has been reloaded, in which case out previous values are gone
            if (_.isUndefined(counter_prev_data))
              return;

            dataset[label_ind]['data'].unshift([0, new_data[label] - counter_prev_data[label]]);
          }

          // Reset the time index to get a proper scrolling display
          for (var time_ind = 0; time_ind < dataset[label_ind]['data'].length; time_ind++) {
            dataset[label_ind]['data'][time_ind][0] = time_ind;
          }
        });
        counter_prev_data = new_data;
      }

      // Remove old data points
      for (let label_ind = 0; label_ind < dataset.length; label_ind++) {
        if (dataset[label_ind]['data'].length > 101) {
          dataset[label_ind]['data'].pop();
        }
      }

      chart_obj.setOtherData('dataset', dataset);
      chart_obj.setOtherData('counter_prev_data', counter_prev_data);

      if (chart_obj.isInPage()) {
        if (chart_obj.isVisible()) {
          chart_obj.draw(dataset);
        }
      } else {
        return;
      }
    },

    stopChartsPoller: function() {
      clearInterval(this.charts_poller_int_id);
    },

    startChartsPoller: function(chart_store, sid, did) {
      let self = this;
      /* polling will the greatest common divisor of the refresh rates*/
      let poll_interval = commonUtils.getGCD(
        Object.values(chart_store).map(item => item.refresh_rate)
      );
      const WAIT_COUNTER = 3;
      let last_poll_wait_counter = 0;
      let resp_not_received_counter = 0;

      /* Stop if running, only one poller lives */
      self.stopChartsPoller();

      var thePollingFunc = function() {
        let curr_epoch = commonUtils.getEpoch();
        let chart_names_to_get = [];

        for(let chart_name in chart_store) {
          /* when its time to get the data */
          if(chart_store[chart_name].refresh_on <= curr_epoch) {
            /* set the next trigger point */
            chart_store[chart_name].refresh_on = curr_epoch + chart_store[chart_name].refresh_rate;
            chart_names_to_get.push(chart_name);
          }
        }

        /* If none of the chart wants data, don't trouble
         * If response not received from prev poll, don't trouble !!
         */
        if(chart_names_to_get.length == 0 || last_poll_wait_counter > 0 || resp_not_received_counter >= WAIT_COUNTER) {
          /* reduce the number of tries, request should be sent if last_poll_wait_counter
           * completes WAIT_COUNTER times.*/
          last_poll_wait_counter--;
          return;
        }

        var path = self.getStatsUrl(sid, did, chart_names_to_get);
        resp_not_received_counter++;
        $.ajax({
          url: path,
          type: 'GET',
        })
          .done(function(resp) {
            for(let chart_name in resp) {
              let chart_obj = chart_store[chart_name].chart_obj;
              $(chart_obj.getContainer()).removeClass('graph-error');
              self.updateChart(chart_obj, resp[chart_name]);
            }
          })
          .fail(function(xhr) {
            let err = '';
            let msg = '';
            let cls = 'info';

            if (xhr.readyState === 0) {
              msg = gettext('Not connected to the server or the connection to the server has been closed.');
            } else {
              err = JSON.parse(xhr.responseText);
              msg = err.errormsg;

              // If we get a 428, it means the server isn't connected
              if (xhr.status === 428) {
                if (_.isUndefined(msg) || _.isNull(msg)) {
                  msg = gettext('Please connect to the selected server to view the graph.');
                }
              } else {
                msg = gettext('An error occurred whilst rendering the graph.');
                cls = 'error';
              }
            }

            for(let chart_name in chart_store) {
              let chart_obj = chart_store[chart_name].chart_obj;
              $(chart_obj.getContainer()).addClass('graph-error');
              $(chart_obj.getContainer()).html(
                '<div class="pg-panel-' + cls + ' pg-panel-message" role="alert">' + msg + '</div>'
              );
            }
          })
          .always(function() {
            last_poll_wait_counter = 0;
            resp_not_received_counter--;
          });
        last_poll_wait_counter = WAIT_COUNTER;
      };
      /* Execute once for the first time as setInterval will not do */
      thePollingFunc();
      self.charts_poller_int_id = setInterval(thePollingFunc, poll_interval * 1000);
    },

    // Handler function to support the "Add Server" link
    add_new_server: function() {
      if (pgBrowser && pgBrowser.tree) {
        var i = pgBrowser.tree.selected().length != 0 ?
            pgBrowser.tree.selected() :
            pgBrowser.tree.first(null, false),
          serverModule = require('pgadmin.node.server'),
          itemData = pgBrowser.tree.itemData(i);

        while (itemData && itemData._type != 'server_group') {
          i = pgBrowser.tree.next(i);
          itemData = pgBrowser.tree.itemData(i);
        }

        if (!itemData) {
          return;
        }

        if (serverModule) {
          serverModule.callbacks.show_obj_properties.apply(
            serverModule, [{
              action: 'create',
            }, i]
          );
        }
      }
    },

    // Render a grid
    render_grid: function(container, url, columns) {
      var Datum = Backbone.Model.extend({}),
        self = this;

      var path = url + self.sid;
      if (self.did != -1) {
        path += '/' + self.did;
      }

      var Data = Backbone.Collection.extend({
        model: Datum,
        url: path,
        mode: 'client',
      });

      var data = new Data();

      // Set up the grid
      var grid = new Backgrid.Grid({
        emptyText: gettext('No data found'),
        columns: columns,
        collection: data,
        className: 'backgrid presentation table table-bordered table-noouter-border table-hover',
      });

      // Render the grid
      $(container).empty();
      $(container).append(grid.render().el);

      // Initialize a client-side filter to filter on the client
      // mode pageable collection's cache.
      var filter = new Backgrid.Extension.ClientSideFilter({
        collection: data,
      });

      filter.setCustomSearchBox($('#txtGridSearch'));
      // Stash objects for future use
      $(container).data('data', data);
      $(container).data('grid', grid);
      $(container).data('filter', filter);
    },

    // Render the data in a grid
    render_grid_data: function(container) {
      var data = $(container).data('data'),
        grid = $(container).data('grid'),
        filter = $(container).data('filter');

      if (_.isUndefined(data)) {
        return null;
      }

      data.fetch({
        reset: true,
        success: function() {
          // If we're showing an error, remove it, and replace the grid & filter
          if ($(container).hasClass('grid-error')) {
            $(container).removeClass('grid-error');
            $(container).html(grid.render().el);
            $(filter.el).show();
          }

          // Re-apply search criteria
          filter.search();
        },
        error: function(model, xhr) {
          let err = '';
          let msg = '';
          let cls = 'info';

          if (xhr.readyState === 0) {
            msg = gettext('Not connected to the server or the connection to the server has been closed.');
          } else {
            err = JSON.parse(xhr.responseText);
            msg = err.errormsg;

            // If we get a 428, it means the server isn't connected
            if (xhr.status === 428) {
              if (_.isUndefined(msg) || _.isNull(msg)) {
                msg = gettext('Please connect to the selected server to view the table.');
              }
            } else {
              msg = gettext('An error occurred whilst rendering the table.');
              cls = 'error';
            }
          }

          // Replace the content with the error, if not already present. Always update the message
          if (!$(container).hasClass('grid-error')) {
            $(filter.el).hide();
            $(container).addClass('grid-error');
          }

          $(container).html(
            '<div class="pg-panel-' + cls + ' pg-panel-message" role="alert">' + msg + '</div>'
          );

          // Try again
          setTimeout(function() {
            pgAdmin.Dashboard.render_grid_data(container, data);
          }, 5000);
        },
      });
    },

    clearChartFromStore: function(chartName) {
      var self = this;
      if(!chartName){
        self.stopChartsPoller();
        _.each(self.chart_store, function(chart, key) {
          delete self.chart_store[key];
        });
      }
      else {
        delete self.chart_store[chartName];
      }
    },

    // Rock n' roll on the dashboard
    init_dashboard: function() {
      let self = this;

      /* Cache may take time to load for the first time
       * Keep trying till available
       */
      let cacheIntervalId = setInterval(function() {
        try {
          if(pgWindow.default.pgAdmin.Browser.preference_version() > 0) {
            clearInterval(cacheIntervalId);
            self.reflectPreferences();
          }
        }
        catch(err) {
          clearInterval(cacheIntervalId);
          throw err;
        }
      },0);

      /* Register for preference changed event broadcasted */
      pgBrowser.onPreferencesChange('dashboards', function() {
        self.reflectPreferences();
      });

    },

    reflectPreferences: function() {
      var self = this;
      var tickColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');

      /* We will use old preferences for selective graph updates on preference change */
      if(self.preferences) {
        self.old_preferences = self.preferences;
        self.preferences = pgWindow.default.pgAdmin.Browser.get_preferences_for_module('dashboards');
      }
      else {
        self.preferences = pgWindow.default.pgAdmin.Browser.get_preferences_for_module('dashboards');
        self.old_preferences = self.preferences;
      }

      if(is_server_dashboard || is_database_dashboard) {
        /* Common things can come here */
        var div_sessions = $('.dashboard-container').find('#graph-sessions')[0];
        var div_tps = $('.dashboard-container').find('#graph-tps')[0];
        var div_ti = $('.dashboard-container').find('#graph-ti')[0];
        var div_to = $('.dashboard-container').find('#graph-to')[0];
        var div_bio = $('.dashboard-container').find('#graph-bio')[0];
        var options_line = {
          parseFloat: false,
          xaxis: {
            min: 100,
            max: 0,
            autoscale: 0,
          },
          yaxis: {
            autoscale: 1,
          },
          grid: {
            color: 'transparent',
            tickColor: tickColor,
          },
        };

        if(self.preferences.graph_data_points) {
          /* Merge data points related options */
          options_line = {
            ...options_line,
            ...{
              points: {
                show:true,
                radius: 1,
                hitRadius: 3,
              },
            },
          };
        }

        if(self.preferences.graph_mouse_track) {
          /* Merge mouse track related options */
          options_line = {
            ...options_line,
            ...{
              mouse: {
                track:true,
                position: 'sw',
              },
            },
          };
        }

        if(self.preferences.show_graphs && $('#dashboard-graphs').hasClass('dashboard-hidden')) {
          $('#dashboard-graphs').removeClass('dashboard-hidden');
        }
        else if(!self.preferences.show_graphs) {
          $('#dashboard-graphs').addClass('dashboard-hidden');
          self.clearChartFromStore();
        }

        if (self.preferences.show_activity && $('#dashboard-activity').hasClass('dashboard-hidden')) {
          $('#dashboard-activity').removeClass('dashboard-hidden');
        }
        else if(!self.preferences.show_activity) {
          $('#dashboard-activity').addClass('dashboard-hidden');
        }

        if(self.preferences.show_graphs) {
          // Render the graphs
          pgAdmin.Dashboard.renderCharts([{
            chart_name: 'session_stats',
            container: div_sessions,
            options: options_line,
            counter: false,
            refresh_pref_name: 'session_stats_refresh',
          }, {
            chart_name: 'tps_stats',
            container: div_tps,
            options: options_line,
            counter: true,
            refresh_pref_name: 'tps_stats_refresh',
          }, {
            chart_name: 'ti_stats',
            container: div_ti,
            options: options_line,
            counter: true,
            refresh_pref_name: 'ti_stats_refresh',
          }, {
            chart_name: 'to_stats',
            container: div_to,
            options: options_line,
            counter: true,
            refresh_pref_name: 'to_stats_refresh',
          }, {
            chart_name: 'bio_stats',
            container: div_bio,
            options: options_line,
            counter: true,
            refresh_pref_name: 'bio_stats_refresh',
          }]);
        }

        if(!self.preferences.show_graphs && !self.preferences.show_activity) {
          $('#dashboard-none-show').removeClass('dashboard-hidden');
        }
        else {
          $('#dashboard-none-show').addClass('dashboard-hidden');
        }

        /* Dashboard specific preferences can be updated in the
         * appropriate functions
         */
        if(is_server_dashboard) {
          self.reflectPreferencesServer();
        }
        else if(is_database_dashboard) {
          self.reflectPreferencesDatabase();
        }
      }
    },
    reflectPreferencesServer: function() {
      var self = this;
      var $dashboardContainer = $('.dashboard-container');
      var div_server_activity = $dashboardContainer.find('#server_activity').get(0);
      var div_server_locks = $dashboardContainer.find('#server_locks').get(0);
      var div_server_prepared = $dashboardContainer.find('#server_prepared').get(0);
      var div_server_config = $dashboardContainer.find('#server_config').get(0);

      var tab_grid_map = {
        'tab_server_activity': div_server_activity,
        'tab_server_locks': div_server_locks,
        'tab_server_prepared': div_server_prepared,
        'tab_server_config': div_server_config,
      };

      // Display server activity
      if (self.preferences.show_activity) {
        var server_activity_columns = [{
          name: 'pid',
          label: gettext('PID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'datname',
          label: gettext('Database'),
          editable: false,
          cell: 'string',
        }, {
          name: 'usename',
          label: gettext('User'),
          editable: false,
          cell: 'string',
        }, {
          name: 'application_name',
          label: gettext('Application'),
          editable: false,
          cell: 'string',
        }, {
          name: 'client_addr',
          label: gettext('Client'),
          editable: false,
          cell: 'string',
        }, {
          name: 'backend_start',
          label: gettext('Backend start'),
          editable: false,
          cell: 'string',
        }, {
          name: 'state',
          label: gettext('State'),
          editable: false,
          cell: 'string',
        }];

        if (self.version < 90600) {
          server_activity_columns = server_activity_columns.concat(
            [{
              name: 'waiting',
              label: gettext('Waiting?'),
              editable: false,
              cell: 'string',
            }]);
        } else {
          server_activity_columns = server_activity_columns.concat(
            [{
              name: 'wait_event',
              label: gettext('Wait event'),
              editable: false,
              cell: 'string',
            }, {
              name: 'blocking_pids',
              label: gettext('Blocking PIDs'),
              editable: false,
              cell: 'string',
            }]);
        }

        var newActiveQueryDetailsModel = new ActiveQueryDetailsModel();

        var subNodeFieldsModel = Backform.generateViewSchema(
          null, newActiveQueryDetailsModel, 'create', null, null, true
        );

        // Add version to each field
        _.each(subNodeFieldsModel[0].fields, function(obj) {
          obj['version'] = self.version;
        });

        // Add cancel active query button
        server_activity_columns.unshift({
          name: 'pg-backform-expand',
          label: '',
          cell: SessionDetailsCell,
          cell_priority: -1,
          postgres_version: self.version,
          schema: subNodeFieldsModel,
        });

        // Add cancel active query button
        server_activity_columns.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: customDashboardActionCell,
          cell_action: 'cancel',
          editable: false,
          cell_priority: -1,
          canDeleteRow: pgAdmin.Dashboard.can_take_action,
          postgres_version: self.version,
        });

        server_activity_columns.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: customDashboardActionCell,
          cell_action: 'terminate',
          editable: false,
          cell_priority: -1,
          canDeleteRow: pgAdmin.Dashboard.can_take_action,
          postgres_version: self.version,
        });

        var server_locks_columns = [{
          name: 'pid',
          label: gettext('PID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'datname',
          label: gettext('Database'),
          editable: false,
          cell: 'string',
        }, {
          name: 'locktype',
          label: gettext('Lock type'),
          editable: false,
          cell: 'string',
        }, {
          name: 'relation',
          label: gettext('Target relation'),
          editable: false,
          cell: 'string',
        }, {
          name: 'page',
          label: gettext('Page'),
          editable: false,
          cell: 'string',
        }, {
          name: 'tuple',
          label: gettext('Tuple'),
          editable: false,
          cell: 'string',
        }, {
          name: 'virtualxid',
          label: gettext('vXID (target)'),
          editable: false,
          cell: 'string',
        }, {
          name: 'transactionid',
          label: gettext('XID (target)'),
          editable: false,
          cell: 'string',
        }, {
          name: 'classid',
          label: gettext('Class'),
          editable: false,
          cell: 'string',
        }, {
          name: 'objid',
          label: gettext('Object ID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'virtualtransaction',
          label: gettext('vXID (owner)'),
          editable: false,
          cell: 'string',
        }, {
          name: 'mode',
          label: gettext('Mode'),
          editable: false,
          cell: 'string',
        }, {
          name: 'granted',
          label: gettext('Granted?'),
          editable: false,
          cell: 'string',
        }];

        var server_prepared_columns = [{
          name: 'git',
          label: gettext('Name'),
          editable: false,
          cell: 'string',
        }, {
          name: 'database',
          label: gettext('Database'),
          editable: false,
          cell: 'string',
        }, {
          name: 'Owner',
          label: gettext('Owner'),
          editable: false,
          cell: 'string',
        }, {
          name: 'transaction',
          label: gettext('XID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'prepared',
          label: gettext('Prepared at'),
          editable: false,
          cell: 'string',
        }];

        var server_config_columns = [{
          name: 'name',
          label: gettext('Name'),
          editable: false,
          cell: 'string',
        }, {
          name: 'category',
          label: gettext('Category'),
          editable: false,
          cell: 'string',
        }, {
          name: 'setting',
          label: gettext('Setting'),
          editable: false,
          cell: 'string',
        }, {
          name: 'unit',
          label: gettext('Unit'),
          editable: false,
          cell: 'string',
        }, {
          name: 'short_desc',
          label: gettext('Description'),
          editable: false,
          cell: 'string',
        }];

        // To align subnode controls properly
        $(div_server_activity).addClass('pg-el-container');
        $(div_server_activity).attr('el', 'sm');

        // Render the tabs, but only get data for the activity tab for now
        pgAdmin.Dashboard.render_grid(
          div_server_activity, url_for('dashboard.activity'), server_activity_columns
        );
        pgAdmin.Dashboard.render_grid(
          div_server_locks, url_for('dashboard.locks'), server_locks_columns
        );
        pgAdmin.Dashboard.render_grid(
          div_server_prepared, url_for('dashboard.prepared'), server_prepared_columns
        );
        pgAdmin.Dashboard.render_grid(
          div_server_config, url_for('dashboard.config'), server_config_columns
        );

        pgAdmin.Dashboard.render_grid_data(div_server_activity);

        // (Re)render the appropriate tab
        $('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
          let prevGrid = tab_grid_map[$(e.relatedTarget).attr('aria-controls')];
          $(prevGrid).data('filtertext', $('#txtGridSearch').val());

          let currGrid = tab_grid_map[$(e.target).attr('aria-controls')];
          $('#txtGridSearch').val($(currGrid).data('filtertext'));
          pgAdmin.Dashboard.render_grid_data(currGrid);
        });

        $('#btn_refresh').off('click').on('click', () => {
          let currGrid = tab_grid_map[$('#dashboard-activity .nav-tabs .active').attr('aria-controls')];
          pgAdmin.Dashboard.render_grid_data(currGrid);
        });
      }
    },
    reflectPreferencesDatabase: function() {
      var self = this;
      var div_database_activity = document.getElementById('database_activity');
      var div_database_locks = document.getElementById('database_locks');
      var div_database_prepared = document.getElementById('database_prepared');

      var tab_grid_map = {
        'tab_database_activity': div_database_activity,
        'tab_database_locks': div_database_locks,
        'tab_database_prepared': div_database_prepared,
      };

      // Display server activity
      if (self.preferences.show_activity) {
        var database_activity_columns = [{
          name: 'pid',
          label: gettext('PID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'usename',
          label: gettext('User'),
          editable: false,
          cell: 'string',
        }, {
          name: 'application_name',
          label: gettext('Application'),
          editable: false,
          cell: 'string',
        }, {
          name: 'client_addr',
          label: gettext('Client'),
          editable: false,
          cell: 'string',
        }, {
          name: 'backend_start',
          label: gettext('Backend start'),
          editable: false,
          cell: 'string',
        }, {
          name: 'state',
          label: gettext('State'),
          editable: false,
          cell: 'string',
        }];

        if (self.version < 90600) {
          database_activity_columns = database_activity_columns.concat(
            [{
              name: 'waiting',
              label: gettext('Waiting?'),
              editable: false,
              cell: 'string',
            }]);
        } else {
          database_activity_columns = database_activity_columns.concat(
            [{
              name: 'wait_event',
              label: gettext('Wait event'),
              editable: false,
              cell: 'string',
            }, {
              name: 'blocking_pids',
              label: gettext('Blocking PIDs'),
              editable: false,
              cell: 'string',
            }]);
        }

        var newActiveQueryDetailsModel = new ActiveQueryDetailsModel();

        var subNodeFieldsModel = Backform.generateViewSchema(
          null, newActiveQueryDetailsModel, 'create', null, null, true
        );

        // Add version to each field
        _.each(subNodeFieldsModel[0].fields, function(obj) {
          obj['version'] = self.version;
        });

        // Add cancel active query button
        database_activity_columns.unshift({
          name: 'pg-backform-expand',
          label: '',
          cell: SessionDetailsCell,
          cell_priority: -1,
          postgres_version: self.version,
          schema: subNodeFieldsModel,
        });

        database_activity_columns.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: customDashboardActionCell,
          cell_action: 'cancel',
          editable: false,
          cell_priority: -1,
          canDeleteRow: pgAdmin.Dashboard.can_take_action,
          postgres_version: self.version,
        });
        database_activity_columns.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: customDashboardActionCell,
          cell_action: 'terminate',
          editable: false,
          cell_priority: -1,
          canDeleteRow: pgAdmin.Dashboard.can_take_action,
          postgres_version: self.version,
        });

        var database_locks_columns = [{
          name: 'pid',
          label: gettext('PID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'locktype',
          label: gettext('Lock type'),
          editable: false,
          cell: 'string',
        }, {
          name: 'relation',
          label: gettext('Target relation'),
          editable: false,
          cell: 'string',
        }, {
          name: 'page',
          label: gettext('Page'),
          editable: false,
          cell: 'string',
        }, {
          name: 'tuple',
          label: gettext('Tuple'),
          editable: false,
          cell: 'string',
        }, {
          name: 'virtualxid',
          label: gettext('vXID (target)'),
          editable: false,
          cell: 'string',
        }, {
          name: 'transactionid',
          label: gettext('XID (target)'),
          editable: false,
          cell: 'string',
        }, {
          name: 'classid',
          label: gettext('Class'),
          editable: false,
          cell: 'string',
        }, {
          name: 'objid',
          label: gettext('Object ID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'virtualtransaction',
          label: gettext('vXID (owner)'),
          editable: false,
          cell: 'string',
        }, {
          name: 'mode',
          label: gettext('Mode'),
          editable: false,
          cell: 'string',
        }, {
          name: 'granted',
          label: gettext('Granted?'),
          editable: false,
          cell: 'string',
        }];

        var database_prepared_columns = [{
          name: 'git',
          label: gettext('Name'),
          editable: false,
          cell: 'string',
        }, {
          name: 'Owner',
          label: gettext('Owner'),
          editable: false,
          cell: 'string',
        }, {
          name: 'transaction',
          label: gettext('XID'),
          editable: false,
          cell: 'string',
        }, {
          name: 'prepared',
          label: gettext('Prepared at'),
          editable: false,
          cell: 'string',
        }];

        // To align subnode controls properly
        $(div_database_activity).addClass('pg-el-container');
        $(div_database_activity).attr('el', 'sm');

        // Render the tabs, but only get data for the activity tab for now
        pgAdmin.Dashboard.render_grid(
          div_database_activity, url_for('dashboard.activity'), database_activity_columns
        );
        pgAdmin.Dashboard.render_grid(
          div_database_locks, url_for('dashboard.locks'), database_locks_columns
        );
        pgAdmin.Dashboard.render_grid(
          div_database_prepared, url_for('dashboard.prepared'), database_prepared_columns
        );

        pgAdmin.Dashboard.render_grid_data(div_database_activity);

        // (Re)render the appropriate tab
        $('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
          let prevGrid = tab_grid_map[$(e.relatedTarget).attr('aria-controls')];
          $(prevGrid).data('filtertext', $('#txtGridSearch').val());

          let currGrid = tab_grid_map[$(e.target).attr('aria-controls')];
          $('#txtGridSearch').val($(currGrid).data('filtertext'));
          pgAdmin.Dashboard.render_grid_data(currGrid);
        });

        $('#btn_refresh').off('click').on('click', () => {
          let currGrid = tab_grid_map[$('#dashboard-activity .nav-tabs .active').attr('aria-controls')];
          pgAdmin.Dashboard.render_grid_data(currGrid);
        });
      }
    },
    toggleVisibility: function(visible, closed=false) {
      dashboardVisible = visible;
      if(closed) {
        this.clearChartFromStore();
      }
    },
    can_take_action: function(m) {
      // We will validate if user is allowed to cancel the active query
      // If there is only one active session means it probably our main
      // connection session
      var active_sessions = m.collection.where({
          'state': 'active',
        }),
        pg_version = this.get('postgres_version') || null,
        cell_action = this.get('cell_action') || null,
        is_cancel_session = cell_action === 'cancel',
        txtMessage;

      // With PG10, We have background process showing on dashboard
      // We will not allow user to cancel them as they will fail with error
      // anyway, so better usability we will throw our on notification

      // Background processes do not have database field populated
      if (pg_version && pg_version >= 100000 && !m.get('datname')) {
        if (is_cancel_session) {
          txtMessage = gettext('You cannot cancel background worker processes.');
        } else {
          txtMessage = gettext('You cannot terminate background worker processes.');
        }
        Alertify.info(txtMessage);
        return false;
        // If it is the last active connection on maintenance db then error out
      } else if (maintenance_database == m.get('datname') &&
        m.get('state') == 'active' && active_sessions.length == 1) {
        if (is_cancel_session) {
          txtMessage = gettext('You are not allowed to cancel the main active session.');
        } else {
          txtMessage = gettext('You are not allowed to terminate the main active session.');
        }
        Alertify.error(txtMessage);
        return false;
      } else if (is_cancel_session && m.get('state') == 'idle') {
        // If this session is already idle then do nothing
        Alertify.info(
          gettext('The session is already in idle state.')
        );
        return false;
      } else if (is_super_user) {
        // Super user can do anything
        return true;
      } else if (current_user && current_user == m.get('usename')) {
        // Non-super user can cancel only their active queries
        return true;
      } else {
        // Do not allow to cancel someone else session to non-super user
        if (is_cancel_session) {
          txtMessage = gettext('Superuser privileges are required to cancel another users query.');
        } else {
          txtMessage = gettext('Superuser privileges are required to terminate another users query.');
        }
        Alertify.error(txtMessage);
        return false;
      }
    },
  };

  return pgAdmin.Dashboard;
});
