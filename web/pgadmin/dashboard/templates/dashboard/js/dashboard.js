define([
    'require', 'jquery', 'pgadmin', 'underscore', 'backbone', 'flotr2', 'wcdocker',
    'pgadmin.browser', 'bootstrap'
    ],
function(r, $, pgAdmin, _, Backbone) {

  var wcDocker = window.wcDocker,
  pgBrowser = pgAdmin.Browser;

  /* Return back, this has been called more than once */
  if (pgAdmin.Dashboard)
    return;

  pgAdmin.Dashboard = {
        init: function() {
            if (this.initialized)
                return;

            this.initialized = true;

            // Bind the Dashboard object with the 'object_selected' function
            var selected = this.object_selected.bind(this);

            // Listen for selection of any of object
            pgBrowser.Events.on('pgadmin-browser:tree:selected', selected);

            // Load the default welcome dashboard
            url = '{{ url_for('dashboard.index') }}';

            var dashboardPanel = pgBrowser.panels['dashboard'].panel;
            if (dashboardPanel) {
                var div = dashboardPanel.layout().scene().find('.pg-panel-content');

                if (div) {
                    $.ajax({
                        url: url,
                        type: "GET",
                        dataType: "html",
                        success: function (data) {
                            $(div).html(data);
                        },
                        error: function (xhr, status) {
                            $(div).html(
                                '<div class="alert alert-danger pg-panel-message" role="alert">{{ gettext('An error occurred whilst loading the dashboard.') }}</div>'
                            );
                        }
                    });

                    // Cache the current IDs for next time
                    $(dashboardPanel).data('sid', -1)
                    $(dashboardPanel).data('did', -1)
                }
            }
        },

        // Handle treeview clicks
        object_selected: function(item, itemData, node) {
            var treeHierarchy = node.getTreeNodeHierarchy(item)
            if (itemData && itemData._type)
            {
                switch(itemData._type) {
                    case ('server-group'):
                        url = '{{ url_for('dashboard.index') }}';
                        break;

                    case ('server'):
                    case ('coll-database'):
                    case ('coll-role'):
                    case ('role'):
                    case ('coll-tablespace'):
                    case ('tablespace'):
                        url = '{{ url_for('dashboard.index') }}'
                            + treeHierarchy.server._id;
                        break;

                    default:
                        url = '{{ url_for('dashboard.index') }}'
                                + treeHierarchy.server._id
                        if ('database' in treeHierarchy) {
                          url += '/' + treeHierarchy.database._id;
                        }
                        break;
                }
            }

            var dashboardPanel = pgBrowser.panels['dashboard'].panel;
            if (dashboardPanel) {
                var div = dashboardPanel.layout().scene().find('.pg-panel-content');

                if (div) {
                    // Avoid unnecessary reloads
                    if (_.isUndefined(treeHierarchy.server) || _.isUndefined(treeHierarchy.server._id))
                        sid = -1
                    else
                        sid = treeHierarchy.server._id

                    if (_.isUndefined(treeHierarchy.database) || _.isUndefined(treeHierarchy.database._id))
                        did = -1
                    else
                        did = treeHierarchy.database._id

                    if (sid != $(dashboardPanel).data('sid') ||
                        did != $(dashboardPanel).data('did')) {

                        // Clear out everything so any existing timers die off
                        $(div).empty();

                        $.ajax({
                            url: url,
                            type: "GET",
                            dataType: "html",
                            success: function (data) {
                                $(div).html(data);
                            },
                            error: function (xhr, status) {
                                $(div).html(
                                    '<div class="alert alert-danger pg-panel-message" role="alert">{{ gettext('An error occurred whilst loading the dashboard.') }}</div>'
                                );
                            }
                        });

                        // Cache the current IDs for next time
                        $(dashboardPanel).data('sid', sid)
                        $(dashboardPanel).data('did', did)
                    }
                }
            }
        },

        // Render a chart
        render_chart: function(container, data, dataset, sid, did, url, options, counter, refresh) {

            // Data format:
            // [
            //     { data: [[0, y0], [1, y1]...], label: 'Label 1', [options] },
            //     { data: [[0, y0], [1, y1]...], label: 'Label 2', [options] },
            //     { data: [[0, y0], [1, y1]...], label: 'Label 3', [options] }
            // ]

            y = 0;
            if (dataset.length == 0) {
                if (counter == true)
                {
                    // Have we stashed initial values?
                    if (_.isUndefined($(container).data('counter_previous_vals'))) {
                        $(container).data('counter_previous_vals', data[0])
                    } else {
                        // Create the initial data structure
                        for (var x in data[0]) {
                            dataset.push({ 'data': [[0, data[0][x] - $(container).data('counter_previous_vals')[x]]], 'label': x });
                        }
                    }
                } else {
                    // Create the initial data structure
                    for (var x in data[0]) {
                        dataset.push({ 'data': [[0, data[0][x]]], 'label': x });
                    }
                }
            } else {
                for (var x in data[0]) {
                    // Push new values onto the existing data structure
                    // If this is a counter stat, we need to subtract the previous value
                    if (counter == false) {
                        dataset[y]['data'].unshift([0, data[0][x]]);
                    } else {
                        // Store the current value, minus the previous one we stashed.
                        // It's possible the tab has been reloaded, in which case out previous values are gone
                        if (_.isUndefined($(container).data('counter_previous_vals')))
                            return

                        dataset[y]['data'].unshift([0, data[0][x] - $(container).data('counter_previous_vals')[x]]);
                    }

                    // Reset the time index to get a proper scrolling display
                    for (z = 0; z < dataset[y]['data'].length; z++) {
                        dataset[y]['data'][z][0] = z;
                    }

                    y++;
                }
                $(container).data('counter_previous_vals', data[0])
            }

             // Remove uneeded elements
            for (x = 0; x < dataset.length; x++) {
                // Remove old data points
                if (dataset[x]['data'].length > 101) {
                    dataset[x]['data'].pop();
                }
            }

            // Draw Graph, if the container still exists and has a size
            var dashboardPanel = pgBrowser.panels['dashboard'].panel;
            var div = dashboardPanel.layout().scene().find('.pg-panel-content');
            if ($(div).find(container).length) { // Exists?
                if (container.clientHeight > 0 && container.clientWidth > 0) { // Not hidden?
                    Flotr.draw(container, dataset, options);
                }
            } else {
                return;
            }

            // Animate
            var setTimeoutFunc = function () {
                path = url + sid;
                if (did != -1) {
                    path += '/' + did;
                }

                $.ajax({
                    url: path,
                    type: "GET",
                    dataType: "html",
                    success: function (resp) {
                        $(container).removeClass('graph-error')
                        data = JSON.parse(resp);
                        pgAdmin.Dashboard.render_chart(container, data, dataset, sid, did, url, options, counter, refresh);
                    },
                    error: function (xhr, status, msg) {
                        // If we get a 428, it means the server isn't connected
                        if (xhr.status == 428) {
                            msg = '{{ gettext('Please connect to the selected server to view the graph.') }}';
                            cls = 'info';
                        } else {
                            msg = '{{ gettext('An error occurred whilst rendering the graph.') }}';
                            cls = 'danger';
                        }

                        $(container).addClass('graph-error');
                        $(container).html(
                            '<div class="alert alert-' + cls + ' pg-panel-message" role="alert">' + msg + '</div>'
                        );

                        // Try again...
                        if (container.clientHeight > 0 && container.clientWidth > 0) {
                            setTimeout(setTimeoutFunc, refresh * 1000);
                        }
                    },
                });
            };

            setTimeout(setTimeoutFunc, refresh * 1000);
        },

        // Handler function to support the "Add Server" link
        add_new_server: function() {
            if (pgBrowser && pgBrowser.tree) {
                var i = pgBrowser.tree.first(null, false),
                    serverModule = r('pgadmin.node.server');

                if (serverModule) {
                    serverModule.callbacks.show_obj_properties.apply(
                        serverModule, [{action: 'create'}, i]
                    );
                }
            }
        },

        // Render a grid
        render_grid: function(container, sid, did, url, columns) {
            var Datum = Backbone.Model.extend({});

            path = url + sid;
            if (did != -1) {
                path += '/' + did;
            }

            var Data = Backbone.Collection.extend({
              model: Datum,
              url: path,
              mode: "client"
            });

            var data = new Data();

            // Set up the grid
            var grid = new Backgrid.Grid({
              columns: columns,
              collection: data,
              className: "backgrid table-bordered table-striped"
            });

            // Render the grid
            $(container).append(grid.render().el)

            // Initialize a client-side filter to filter on the client
            // mode pageable collection's cache.
            var filter = new Backgrid.Extension.ClientSideFilter({
              collection: data
            });

            // Render the filter
            $('#' + container.id + '_filter').before(filter.render().el);

            // Add some space to the filter and move it to the right
            $(filter.el).css({float: "right", margin: "5px", "margin-right": "2px", "margin-top": "3px"});

            // Stash objects for future use
            $(container).data('data', data);
            $(container).data('grid', grid);
            $(container).data('filter', filter);
        },

        // Render the data in a grid
        render_grid_data: function(container) {
            data = $(container).data('data');
            grid = $(container).data('grid');
            filter = $(container).data('filter');

            if(_.isUndefined(data)){
              return null;
            }

            data.fetch({
                reset: true,
                success: function() {
                    // If we're showing an error, remove it, and replace the grid & filter
                    if ($(container).hasClass('grid-error')) {
                        $(container).removeClass('grid-error');
                        $(container).html(grid.render().el)
                        $(filter.el).show();
                    }

                    // Re-apply search criteria
                    filter.search();
                },
                error: function(model, xhr, options) {
                    // If we get a 428, it means the server isn't connected
                    if (xhr.status == 428) {
                        msg = '{{ gettext('Please connect to the selected server to view the table.') }}';
                        cls = 'info';
                    } else {
                        msg = '{{ gettext('An error occurred whilst rendering the table.') }}';
                        cls = 'danger';
                    }

                    // Replace the content with the error, if not already present. Always update the message
                    if (!$(container).hasClass('grid-error')) {
                        $(filter.el).hide();
                        $(container).addClass('grid-error');
                    }

                    $(container).html(
                        '<div class="alert alert-' + cls + ' pg-panel-message" role="alert">' + msg + '</div>'
                    );

                    // Try again
                    setTimeout(function() {
                        pgAdmin.Dashboard.render_grid_data(container, data);
                    }, 5000)
                }
            });
        },

        // Rock n' roll on the server dashboard
        init_server_dashboard: function(sid, version, session_stats_refresh, tps_stats_refresh, ti_stats_refresh, to_stats_refresh, bio_stats_refresh) {
            var div_sessions = document.getElementById('graph-sessions');
            var div_tps = document.getElementById('graph-tps');
            var div_ti = document.getElementById('graph-ti');
            var div_to = document.getElementById('graph-to');
            var div_bio = document.getElementById('graph-bio');
            var div_server_activity = document.getElementById('server_activity');
            var div_server_locks = document.getElementById('server_locks');
            var div_server_prepared = document.getElementById('server_prepared');
            var div_server_config = document.getElementById('server_config');
            var dataset_sessions = [];
            var data_sessions = [];
            var dataset_tps = [];
            var data_tps = [];
            var dataset_ti = [];
            var data_ti = [];
            var dataset_to = [];
            var data_to = [];
            var dataset_bio = [];
            var data_bio = [];

            // Fake DB ID
            did = -1;

            var options_line = {
                  parseFloat: false,
                  xaxis: {
                      min: 100,
                      max: 0,
                      autoscale: 0
                  },
                  yaxis : {
                      autoscale: 1
                  },
                  legend : {
                      position : 'nw',
                      backgroundColor : '#D2E8FF'
                  }
            }

            var server_activity_columns = [{
                name: "pid",
                label: "{{ _('PID') }}",
                editable: false,
                cell: "string"
            }, {
                name: "datname",
                label: "{{ _('Database') }}",
                editable: false,
                cell: "string"
            }, {
                name: "usename",
                label: "{{ _('User') }}",
                editable: false,
                cell: "string"
            }, {
                name: "application_name",
                label: "{{ _('Application') }}",
                editable: false,
                cell: "string"
            }, {
                name: "client_addr",
                label: "{{ _('Client') }}",
                editable: false,
                cell: "string"
            }, {
                name: "backend_start",
                label: "{{ _('Backend start') }}",
                editable: false,
                cell: "string"
            }, {
                name: "state",
                label: "{{ _('State') }}",
                editable: false,
                cell: "string"
            }];

            if (version < 90600) {
                server_activity_columns = server_activity_columns.concat(
                [{
                    name: "waiting",
                    label: "{{ _('Waiting?') }}",
                    editable: false,
                    cell: "string"
                }]);
            } else {
                server_activity_columns = server_activity_columns.concat(
                [{
                    name: "wait_event",
                    label: "{{ _('Wait Event') }}",
                    editable: false,
                    cell: "string"
                },{
                    name: "blocking_pids",
                    label: "{{ _('Blocking PIDs') }}",
                    editable: false,
                    cell: "string"
                }]);
            }

            var server_locks_columns = [{
                name: "pid",
                label: "{{ _('PID') }}",
                editable: false,
                cell: "string"
            }, {
                name: "datname",
                label: "{{ _('Database') }}",
                editable: false,
                cell: "string"
            }, {
                name: "locktype",
                label: "{{ _('Lock type') }}",
                editable: false,
                cell: "string"
            }, {
                name: "relation",
                label: "{{ _('Target relation') }}",
                editable: false,
                cell: "string"
            }, {
                name: "page",
                label: "{{ _('Page') }}",
                editable: false,
                cell: "string"
            }, {
                name: "tuple",
                label: "{{ _('Tuple') }}",
                editable: false,
                cell: "string"
            }, {
                name: "virtualxid",
                label: "{{ _('vXID (target)') }}",
                editable: false,
                cell: "string"
            }, {
                name: "transactionid",
                label: "{{ _('XID (target)') }}",
                editable: false,
                cell: "string"
            },{
                name: "classid",
                label: "{{ _('Class') }}",
                editable: false,
                cell: "string"
            },{
                name: "objid",
                label: "{{ _('Object ID') }}",
                editable: false,
                cell: "string"
            },{
                name: "virtualtransaction",
                label: "{{ _('vXID (owner)') }}",
                editable: false,
                cell: "string"
            },{
                name: "mode",
                label: "{{ _('Mode') }}",
                editable: false,
                cell: "string"
            },{
                name: "granted",
                label: "{{ _('Granted?') }}",
                editable: false,
                cell: "string"
            }];

            var server_prepared_columns = [{
                name: "git",
                label: "{{ _('Name') }}",
                editable: false,
                cell: "string"
            }, {
                name: "database",
                label: "{{ _('Database') }}",
                editable: false,
                cell: "string"
            }, {
                name: "Owner",
                label: "{{ _('Owner') }}",
                editable: false,
                cell: "string"
            }, {
                name: "transaction",
                label: "{{ _('XID') }}",
                editable: false,
                cell: "string"
            }, {
                name: "prepared",
                label: "{{ _('Prepared at') }}",
                editable: false,
                cell: "string"
            }];

            var server_config_columns = [{
                name: "name",
                label: "{{ _('Name') }}",
                editable: false,
                cell: "string"
            }, {
                name: "category",
                label: "{{ _('Category') }}",
                editable: false,
                cell: "string"
            }, {
                name: "setting",
                label: "{{ _('Setting') }}",
                editable: false,
                cell: "string"
            }, {
                name: "unit",
                label: "{{ _('Unit') }}",
                editable: false,
                cell: "string"
            }, {
                name: "short_desc",
                label: "{{ _('Description') }}",
                editable: false,
                cell: "string"
            }];

            // Render the graphs
            pgAdmin.Dashboard.render_chart(div_sessions, data_sessions, dataset_sessions, sid, did, '{{ url_for('dashboard.session_stats') }}', options_line, false, session_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_tps, data_tps, dataset_tps, sid, did, '{{ url_for('dashboard.tps_stats') }}', options_line, true, tps_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_ti, data_ti, dataset_ti, sid, did, '{{ url_for('dashboard.ti_stats') }}', options_line, true, ti_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_to, data_to, dataset_to, sid, did, '{{ url_for('dashboard.to_stats') }}', options_line, true, to_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_bio, data_bio, dataset_bio, sid, did, '{{ url_for('dashboard.bio_stats') }}', options_line, true, bio_stats_refresh);

            // Render the tabs, but only get data for the activity tab for now
            pgAdmin.Dashboard.render_grid(div_server_activity, sid, did, '{{ url_for('dashboard.activity') }}', server_activity_columns);
            pgAdmin.Dashboard.render_grid(div_server_locks, sid, did, '{{ url_for('dashboard.locks') }}', server_locks_columns);
            pgAdmin.Dashboard.render_grid(div_server_prepared, sid, did, '{{ url_for('dashboard.prepared') }}', server_prepared_columns);
            pgAdmin.Dashboard.render_grid(div_server_config, sid, did, '{{ url_for('dashboard.config') }}', server_config_columns);

            pgAdmin.Dashboard.render_grid_data(div_server_activity);

            // (Re)render the appropriate tab
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                switch ($(e.target).attr('aria-controls')) {
                    case "tab_server_activity":
                        pgAdmin.Dashboard.render_grid_data(div_server_activity);
                        break;

                    case "tab_server_locks":
                        pgAdmin.Dashboard.render_grid_data(div_server_locks);
                        break;

                    case "tab_server_prepared":
                        pgAdmin.Dashboard.render_grid_data(div_server_prepared);
                        break;

                    case "tab_server_config":
                        pgAdmin.Dashboard.render_grid_data(div_server_config);
                        break;
                }
            });

            // Handle button clicks
            $("button").click(function(e){
                switch(this.id) {
                    case "btn_server_activity_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_server_activity);
                        break;

                    case "btn_server_locks_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_server_locks);
                        break;

                    case "btn_server_prepared_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_server_prepared);
                        break;

                    case "btn_server_config_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_server_config);
                        break;
                }
            });

        },

        // Rock n' roll on the database dashboard
        init_database_dashboard: function(sid, did, version, session_stats_refresh, tps_stats_refresh, ti_stats_refresh, to_stats_refresh, bio_stats_refresh) {
            var div_sessions = document.getElementById('graph-sessions');
            var div_tps = document.getElementById('graph-tps');
            var div_ti = document.getElementById('graph-ti');
            var div_to = document.getElementById('graph-to');
            var div_bio = document.getElementById('graph-bio');
            var div_database_activity = document.getElementById('database_activity');
            var div_database_locks = document.getElementById('database_locks');
            var div_database_prepared = document.getElementById('database_prepared');
            var dataset_sessions = [];
            var data_sessions = [];
            var dataset_tps = [];
            var data_tps = [];
            var dataset_ti = [];
            var data_ti = [];
            var dataset_to = [];
            var data_to = [];
            var dataset_bio = [];
            var data_bio = [];

            var options_line = {
                  parseFloat: false,
                  xaxis: {
                      min: 100,
                      max: 0,
                      autoscale: 0
                  },
                  yaxis : {
                      autoscale: 1
                  },
                  legend : {
                      position : 'nw',
                      backgroundColor : '#D2E8FF'
                  }
            }

            var database_activity_columns = [{
                name: "pid",
                label: "{{ _('PID') }}",
                editable: false,
                cell: "string"
            }, {
                name: "usename",
                label: "{{ _('User') }}",
                editable: false,
                cell: "string"
            }, {
                name: "application_name",
                label: "{{ _('Application') }}",
                editable: false,
                cell: "string"
            }, {
                name: "client_addr",
                label: "{{ _('Client') }}",
                editable: false,
                cell: "string"
            }, {
                name: "backend_start",
                label: "{{ _('Backend start') }}",
                editable: false,
                cell: "string"
            }, {
                name: "state",
                label: "{{ _('State') }}",
                editable: false,
                cell: "string"
            }];

            if (version < 90600) {
                database_activity_columns = database_activity_columns.concat(
                [{
                    name: "waiting",
                    label: "{{ _('Waiting?') }}",
                    editable: false,
                    cell: "string"
                }]);
            } else {
                database_activity_columns = database_activity_columns.concat(
                [{
                    name: "wait_event",
                    label: "{{ _('Wait Event') }}",
                    editable: false,
                    cell: "string"
                },{
                    name: "blocking_pids",
                    label: "{{ _('Blocking PIDs') }}",
                    editable: false,
                    cell: "string"
                }]);
            }

            var database_locks_columns = [{
                name: "pid",
                label: "{{ _('PID') }}",
                editable: false,
                cell: "string"
            }, {
                name: "locktype",
                label: "{{ _('Lock type') }}",
                editable: false,
                cell: "string"
            }, {
                name: "relation",
                label: "{{ _('Target relation') }}",
                editable: false,
                cell: "string"
            }, {
                name: "page",
                label: "{{ _('Page') }}",
                editable: false,
                cell: "string"
            }, {
                name: "tuple",
                label: "{{ _('Tuple') }}",
                editable: false,
                cell: "string"
            }, {
                name: "virtualxid",
                label: "{{ _('vXID (target)') }}",
                editable: false,
                cell: "string"
            }, {
                name: "transactionid",
                label: "{{ _('XID (target)') }}",
                editable: false,
                cell: "string"
            },{
                name: "classid",
                label: "{{ _('Class') }}",
                editable: false,
                cell: "string"
            },{
                name: "objid",
                label: "{{ _('Object ID') }}",
                editable: false,
                cell: "string"
            },{
                name: "virtualtransaction",
                label: "{{ _('vXID (owner)') }}",
                editable: false,
                cell: "string"
            },{
                name: "mode",
                label: "{{ _('Mode') }}",
                editable: false,
                cell: "string"
            },{
                name: "granted",
                label: "{{ _('Granted?') }}",
                editable: false,
                cell: "string"
            }];

            var database_prepared_columns = [{
                name: "git",
                label: "{{ _('Name') }}",
                editable: false,
                cell: "string"
            }, {
                name: "Owner",
                label: "{{ _('Owner') }}",
                editable: false,
                cell: "string"
            }, {
                name: "transaction",
                label: "{{ _('XID') }}",
                editable: false,
                cell: "string"
            }, {
                name: "prepared",
                label: "{{ _('Prepared at') }}",
                editable: false,
                cell: "string"
            }];

            // Render the graphs
            pgAdmin.Dashboard.render_chart(div_sessions, data_sessions, dataset_sessions, sid, did, '{{ url_for('dashboard.session_stats') }}', options_line, false, session_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_tps, data_tps, dataset_tps, sid, did, '{{ url_for('dashboard.tps_stats') }}', options_line, true, tps_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_ti, data_ti, dataset_ti, sid, did, '{{ url_for('dashboard.ti_stats') }}', options_line, true, ti_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_to, data_to, dataset_to, sid, did, '{{ url_for('dashboard.to_stats') }}', options_line, true, to_stats_refresh);
            pgAdmin.Dashboard.render_chart(div_bio, data_bio, dataset_bio, sid, did, '{{ url_for('dashboard.bio_stats') }}', options_line, true, bio_stats_refresh);

            // Render the tabs, but only get data for the activity tab for now
            pgAdmin.Dashboard.render_grid(div_database_activity, sid, did, '{{ url_for('dashboard.activity') }}', database_activity_columns);
            pgAdmin.Dashboard.render_grid(div_database_locks, sid, did, '{{ url_for('dashboard.locks') }}', database_locks_columns);
            pgAdmin.Dashboard.render_grid(div_database_prepared, sid, did, '{{ url_for('dashboard.prepared') }}', database_prepared_columns);

            pgAdmin.Dashboard.render_grid_data(div_database_activity);

            // (Re)render the appropriate tab
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                switch ($(e.target).attr('aria-controls')) {
                    case "tab_database_activity":
                        pgAdmin.Dashboard.render_grid_data(div_database_activity);
                        break;

                    case "tab_database_locks":
                        pgAdmin.Dashboard.render_grid_data(div_database_locks);
                        break;

                    case "tab_database_prepared":
                        pgAdmin.Dashboard.render_grid_data(div_database_prepared);
                        break;
                }
            });

            // Handle button clicks
            $("button").click(function(e){
                switch(this.id) {
                    case "btn_database_activity_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_database_activity);
                        break;

                    case "btn_database_locks_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_database_locks);
                        break;

                    case "btn_database_prepared_refresh":
                        pgAdmin.Dashboard.render_grid_data(div_database_prepared);
                        break;
                }
            });

        }
  };

  return pgAdmin.Dashboard;
});
