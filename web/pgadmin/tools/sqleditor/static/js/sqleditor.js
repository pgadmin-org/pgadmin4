define('tools.querytool', [
  'babel-polyfill', 'sources/gettext', 'sources/url_for', 'jquery',
  'underscore', 'underscore.string', 'pgadmin.alertifyjs',
  'sources/pgadmin', 'backbone', 'sources/../bundle/codemirror',
  'pgadmin.misc.explain',
  'sources/selection/grid_selector',
  'sources/selection/active_cell_capture',
  'sources/selection/clipboard',
  'sources/selection/copy_data',
  'sources/selection/range_selection_helper',
  'sources/slickgrid/event_handlers/handle_query_output_keyboard_event',
  'sources/selection/xcell_selection_model',
  'sources/selection/set_staged_rows',
  'sources/sqleditor_utils',
  'sources/sqleditor/execute_query',
  'sources/sqleditor/query_tool_http_error_handler',
  'sources/sqleditor/filter_dialog',
  'sources/sqleditor/geometry_viewer',
  'sources/history/index.js',
  'sourcesjsx/history/query_history',
  'react', 'react-dom',
  'sources/keyboard_shortcuts',
  'sources/sqleditor/query_tool_actions',
  'sources/sqleditor/query_tool_notifications',
  'pgadmin.datagrid',
  'sources/modify_animation',
  'sources/sqleditor/calculate_query_run_time',
  'sources/sqleditor/call_render_after_poll',
  'sources/sqleditor/query_tool_preferences',
  'sources/../bundle/slickgrid',
  'pgadmin.file_manager',
  'backgrid.sizeable.columns',
  'slick.pgadmin.formatters',
  'slick.pgadmin.editors',
  'pgadmin.browser',
  'pgadmin.tools.user_management',
], function(
  babelPollyfill, gettext, url_for, $, _, S, alertify, pgAdmin, Backbone, codemirror,
  pgExplain, GridSelector, ActiveCellCapture, clipboard, copyData, RangeSelectionHelper, handleQueryOutputKeyboardEvent,
  XCellSelectionModel, setStagedRows, SqlEditorUtils, ExecuteQuery, httpErrorHandler, FilterHandler,
  GeometryViewer, HistoryBundle, queryHistory, React, ReactDOM,
  keyboardShortcuts, queryToolActions, queryToolNotifications, Datagrid,
  modifyAnimation, calculateQueryRunTime, callRenderAfterPoll, queryToolPref) {
  /* Return back, this has been called more than once */
  if (pgAdmin.SqlEditor)
    return pgAdmin.SqlEditor;

  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker,
    pgBrowser = pgAdmin.Browser,
    CodeMirror = codemirror.default,
    Slick = window.Slick;

  var is_query_running = false;

  // Defining Backbone view for the sql grid.
  var SQLEditorView = Backbone.View.extend({
    initialize: function(opts) {
      this.$el = opts.el;
      this.handler = opts.handler;
      this.handler['col_size'] = {};
      let browser = window.opener ?
              window.opener.pgAdmin.Browser : window.top.pgAdmin.Browser;
      this.preferences = browser.get_preferences_for_module('sqleditor');
      this.handler.preferences = this.preferences;
      this.connIntervalId = null;
    },

    // Bind all the events
    events: {
      'click .btn-load-file': 'on_file_load',
      'click #btn-save': 'on_save',
      'click #btn-file-menu-save': 'on_save',
      'click #btn-file-menu-save-as': 'on_save_as',
      'click #btn-find': 'on_find',
      'click #btn-find-menu-find': 'on_find',
      'click #btn-find-menu-find-next': 'on_find_next',
      'click #btn-find-menu-find-previous': 'on_find_previous',
      'click #btn-find-menu-replace': 'on_replace',
      'click #btn-find-menu-replace-all': 'on_replace_all',
      'click #btn-find-menu-find-persistent': 'on_find_persistent',
      'click #btn-find-menu-jump': 'on_jump',
      'click #btn-delete-row': 'on_delete',
      'click #btn-filter': 'on_show_filter',
      'click #btn-filter-menu': 'on_show_filter',
      'click #btn-include-filter': 'on_include_filter',
      'click #btn-exclude-filter': 'on_exclude_filter',
      'click #btn-remove-filter': 'on_remove_filter',
      'click #btn-apply': 'on_apply',
      'click #btn-cancel': 'on_cancel',
      'click #btn-copy-row': 'on_copy_row',
      'click #btn-paste-row': 'on_paste_row',
      'click #btn-flash': 'on_flash',
      'click #btn-flash-menu': 'on_flash',
      'click #btn-cancel-query': 'on_cancel_query',
      'click #btn-download': 'on_download',
      'click #btn-edit': 'on_clear',
      'click #btn-clear': 'on_clear',
      'click #btn-auto-commit': 'on_auto_commit',
      'click #btn-auto-rollback': 'on_auto_rollback',
      'click #btn-clear-history': 'on_clear_history',
      'click .noclose': 'do_not_close_menu',
      'click #btn-explain': 'on_explain',
      'click #btn-explain-analyze': 'on_explain_analyze',
      'click #btn-explain-verbose': 'on_explain_verbose',
      'click #btn-explain-costs': 'on_explain_costs',
      'click #btn-explain-buffers': 'on_explain_buffers',
      'click #btn-explain-timing': 'on_explain_timing',
      'change .limit': 'on_limit_change',
      'keydown': 'keyAction',
      // Comment options
      'click #btn-comment-code': 'on_toggle_comment_block_code',
      'click #btn-toggle-comment-block': 'on_toggle_comment_block_code',
      'click #btn-comment-line': 'on_comment_line_code',
      'click #btn-uncomment-line': 'on_uncomment_line_code',
      // Indentation options
      'click #btn-indent-code': 'on_indent_code',
      'click #btn-unindent-code': 'on_unindent_code',
    },

    reflectPreferences: function() {
      let self = this,
        browser = window.opener ?
              window.opener.pgAdmin.Browser : window.top.pgAdmin.Browser;

      /* pgBrowser is different obj from window.top.pgAdmin.Browser
       * Make sure to get only the latest update. Older versions will be discarded
       * if function is called by older events.
       * This works for new tab sql editor also as it polls if latest version available
       * This is required because sql editor can update preferences directly
       */
      if(pgBrowser.preference_version() < browser.preference_version()){
        pgBrowser.preference_version(browser.preference_version());
        self.preferences = browser.get_preferences_for_module('sqleditor');
        self.handler.preferences = self.preferences;
        queryToolPref.updateUIPreferences(self);
      }
    },

    // This function is used to render the template.
    render: function() {
      var self = this;

      $('.editor-title').text(_.unescape(self.editor_title));

      // Updates connection status flag
      self.gain_focus = function() {
        setTimeout(function() {
          SqlEditorUtils.updateConnectionStatusFlag('visible');
        }, 100);
      };
      // Updates connection status flag
      self.lost_focus = function() {
        setTimeout(function() {
          SqlEditorUtils.updateConnectionStatusFlag('hidden');
        }, 100);
      };


      // Create main wcDocker instance
      var main_docker = new wcDocker(
        '#editor-panel', {
          allowContextMenu: false,
          allowCollapse: false,
          themePath: url_for('static', {
            'filename': 'css',
          }),
          theme: 'webcabin.overrides.css',
        });

      self.docker = main_docker;

      var sql_panel = new pgAdmin.Browser.Panel({
        name: 'sql_panel',
        title: false,
        width: '100%',
        height: '20%',
        isCloseable: false,
        isPrivate: true,
      });

      sql_panel.load(main_docker);
      var sql_panel_obj = main_docker.addPanel('sql_panel', wcDocker.DOCK.TOP);

      var text_container = $('<textarea id="sql_query_tool" tabindex: "-1"></textarea>');
      var output_container = $('<div id="output-panel" tabindex: "0"></div>').append(text_container);
      sql_panel_obj.$container.find('.pg-panel-content').append(output_container);

      self.query_tool_obj = CodeMirror.fromTextArea(text_container.get(0), {
        tabindex: '0',
        lineNumbers: true,
        styleSelectedText: true,
        mode: self.handler.server_type === 'gpdb' ? 'text/x-gpsql' : 'text/x-pgsql',
        foldOptions: {
          widget: '\u2026',
        },
        foldGutter: {
          rangeFinder: CodeMirror.fold.combine(
            CodeMirror.pgadminBeginRangeFinder,
            CodeMirror.pgadminIfRangeFinder,
            CodeMirror.pgadminLoopRangeFinder,
            CodeMirror.pgadminCaseRangeFinder
          ),
        },
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        extraKeys: pgBrowser.editor_shortcut_keys,
        scrollbarStyle: 'simple',
      });

      // Refresh Code mirror on SQL panel resize to
      // display its value properly
      sql_panel_obj.on(wcDocker.EVENT.RESIZE_ENDED, function() {
        setTimeout(function() {
          if (self && self.query_tool_obj) {
            self.query_tool_obj.refresh();
          }
        }, 200);
      });

      // Create panels for 'Data Output', 'Explain', 'Messages', 'History' and 'Geometry Viewer'
      var data_output = new pgAdmin.Browser.Panel({
        name: 'data_output',
        title: gettext('Data Output'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div id ="datagrid" class="sql-editor-grid-container text-12" tabindex: "0"></div>',
      });

      var explain = new pgAdmin.Browser.Panel({
        name: 'explain',
        title: gettext('Explain'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div class="sql-editor-explain" tabindex: "0"></div>',
      });

      var messages = new pgAdmin.Browser.Panel({
        name: 'messages',
        title: gettext('Messages'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div class="sql-editor-message" tabindex: "0"></div>',
      });

      var history = new pgAdmin.Browser.Panel({
        name: 'history',
        title: gettext('Query History'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div id ="history_grid" class="sql-editor-history-container" tabindex: "0"></div>',
      });

      var notifications = new pgAdmin.Browser.Panel({
        name: 'notifications',
        title: gettext('Notifications'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div id ="notification_grid" class="sql-editor-notifications" tabindex: "0"></div>',
      });

      var geometry_viewer = new pgAdmin.Browser.Panel({
        name: 'geometry_viewer',
        title: gettext('Geometry Viewer'),
        width: '100%',
        height: '100%',
        isCloseable: true,
        isPrivate: true,
        content: '<div id ="geometry_viewer_panel" class="sql-editor-geometry-viewer" tabindex: "0"></div>',
      });

      // Load all the created panels
      data_output.load(main_docker);
      explain.load(main_docker);
      messages.load(main_docker);
      history.load(main_docker);
      notifications.load(main_docker);
      geometry_viewer.load(main_docker);

      // Add all the panels to the docker
      self.data_output_panel = main_docker.addPanel('data_output', wcDocker.DOCK.BOTTOM, sql_panel_obj);
      self.explain_panel = main_docker.addPanel('explain', wcDocker.DOCK.STACKED, self.data_output_panel);
      self.messages_panel = main_docker.addPanel('messages', wcDocker.DOCK.STACKED, self.data_output_panel);
      self.notifications_panel = main_docker.addPanel('notifications', wcDocker.DOCK.STACKED, self.data_output_panel);
      self.history_panel = main_docker.addPanel('history', wcDocker.DOCK.STACKED, self.data_output_panel);

      self.render_history_grid();
      queryToolNotifications.renderNotificationsGrid(self.notifications_panel);

      if (!self.preferences.new_browser_tab) {
        // Listen on the panel closed event and notify user to save modifications.
        _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
          if (p.isVisible()) {
            p.on(wcDocker.EVENT.CLOSING, function() {
              // Only if we can edit data then perform this check
              var notify = false,
                msg;
              if (self.handler.can_edit
                  && self.preferences.prompt_save_data_changes) {
                var data_store = self.handler.data_store;
                if (data_store && (_.size(data_store.added) ||
                    _.size(data_store.updated))) {
                  msg = gettext('The data has changed. Do you want to save changes?');
                  notify = true;
                }
              } else if (self.handler.is_query_tool && self.handler.is_query_changed
                         && self.preferences.prompt_save_query_changes) {
                msg = gettext('The text has changed. Do you want to save changes?');
                notify = true;
              }
              if (notify) {
                return self.user_confirmation(p, msg);
              }
              return true;
            });

            // Set focus on query tool of active panel
            p.on(wcDocker.EVENT.GAIN_FOCUS, function() {
              var $container = $(this.$container),
                transId = self.handler.transId;

              if (!$container.hasClass('wcPanelTabContentHidden')) {
                setTimeout(function () {
                  self.handler.gridView.query_tool_obj.focus();
                }, 200);
                // Trigger an event to update connection status flag
                pgBrowser.Events.trigger(
                  'pgadmin:query_tool:panel:gain_focus:' + transId
                );
              }
            });

            // When any query tool panel lost it focus then
            p.on(wcDocker.EVENT.LOST_FOCUS, function () {
              var $container = $(this.$container),
                transId = self.handler.transId;
              // Trigger an event to update connection status flag
              if ($container.hasClass('wcPanelTabContentHidden')) {
                pgBrowser.Events.trigger(
                  'pgadmin:query_tool:panel:lost_focus:' + transId
                );
              }
            });
          }
        });

        // Code to update connection status polling flag
        pgBrowser.Events.on(
          'pgadmin:query_tool:panel:gain_focus:' + self.handler.transId,
          self.gain_focus, self
        );
        pgBrowser.Events.on(
          'pgadmin:query_tool:panel:lost_focus:' + self.handler.transId,
          self.lost_focus, self
        );
      }

      // set focus on query tool once loaded
      setTimeout(function() {
        self.query_tool_obj.focus();
      }, 500);

      /* We have override/register the hint function of CodeMirror
       * to provide our own hint logic.
       */
      CodeMirror.registerHelper('hint', 'sql', function(editor) {
        var data = [],
          doc = editor.getDoc(),
          cur = doc.getCursor(),
          // Get the current cursor position
          current_cur = cur.ch,
          // function context
          ctx = {
            editor: editor,
            // URL for auto-complete
            url: url_for('sqleditor.autocomplete', {
              'trans_id': self.transId,
            }),
            data: data,
            // Get the line number in the cursor position
            current_line: cur.line,
            /*
             * Render function for hint to add our own class
             * and icon as per the object type.
             */
            hint_render: function(elt, data, cur) {
              var el = document.createElement('span');

              switch (cur.type) {
              case 'database':
                el.className = 'sqleditor-hint pg-icon-' + cur.type;
                break;
              case 'datatype':
                el.className = 'sqleditor-hint icon-type';
                break;
              case 'keyword':
                el.className = 'fa fa-key';
                break;
              case 'table alias':
                el.className = 'fa fa-at';
                break;
              default:
                el.className = 'sqleditor-hint icon-' + cur.type;
              }

              el.appendChild(document.createTextNode(cur.text));
              elt.appendChild(el);
            },
          };

        data.push(doc.getValue());
        // Get the text from start to the current cursor position.
        data.push(
          doc.getRange({
            line: 0,
            ch: 0,
          }, {
            line: ctx.current_line,
            ch: current_cur,
          })
        );

        return {
          then: function(cb) {
            var self = this;
            // Make ajax call to find the autocomplete data
            $.ajax({
              url: self.url,
              method: 'POST',
              contentType: 'application/json',
              data: JSON.stringify(self.data),
            })
            .done(function(res) {
              var result = [];

              _.each(res.data.result, function(obj, key) {
                result.push({
                  text: key,
                  type: obj.object_type,
                  render: self.hint_render,
                });
              });

              // Sort function to sort the suggestion's alphabetically.
              result.sort(function(a, b) {
                var textA = a.text.toLowerCase(),
                  textB = b.text.toLowerCase();
                if (textA < textB) //sort string ascending
                  return -1;
                if (textA > textB)
                  return 1;
                return 0; //default return value (no sorting)
              });

              /*
               * Below logic find the start and end point
               * to replace the selected auto complete suggestion.
               */
              var token = self.editor.getTokenAt(cur),
                start, end, search;
              if (token.end > cur.ch) {
                token.end = cur.ch;
                token.string = token.string.slice(0, cur.ch - token.start);
              }

              if (token.string.match(/^[.`\w@]\w*$/)) {
                search = token.string;
                start = token.start;
                end = token.end;
              } else {
                start = end = cur.ch;
                search = '';
              }

              /*
               * Added 1 in the start position if search string
               * started with "." or "`" else auto complete of code mirror
               * will remove the "." when user select any suggestion.
               */
              if (search.charAt(0) == '.' || search.charAt(0) == '``')
                start += 1;

              cb({
                list: result,
                from: {
                  line: self.current_line,
                  ch: start,
                },
                to: {
                  line: self.current_line,
                  ch: end,
                },
              });
            })
            .fail(function(e) {
              return httpErrorHandler.handleLoginRequiredAndTransactionRequired(
                pgAdmin, self, e, null, [], false
              );
            });
          }.bind(ctx),
        };
      });

       /* If the screen width is small and we hover over the Explain Options,
        * the submenu goes behind the screen on the right side.
        * Below logic will make it appear on the left.
        */
      $('.dropdown-submenu').on('mouseenter',function() {
        var menu = $(this).find('ul.dropdown-menu');
        var menupos = $(menu).offset();

        if (menupos.left + menu.width() > $(window).width()) {
          var newpos = -$(menu).width();
          menu.css('left',newpos);
        }
      }).on('mouseleave', function() {
        var menu = $(this).find('ul.dropdown-menu');
        menu.css('left','');
      });

      self.reflectPreferences();

      /* Register for preference changed event broadcasted in parent
       * to reload the shorcuts. As sqleditor is in iFrame of wcDocker
       * window parent is referred
       */
      pgBrowser.onPreferencesChange('sqleditor', function() {
        self.reflectPreferences();
      });

      /* If sql editor is in a new tab, event fired is not available
       * instead, a poller is set up who will check
       */
      if(self.preferences.new_browser_tab) {
        setInterval(()=>{
          if(window.opener.pgAdmin) {
            self.reflectPreferences();
          }
        }, 1000);
      }
    },

    /* To prompt user for unsaved changes */
    user_confirmation: function(panel, msg) {
      // If there is anything to save then prompt user
      var that = this;

      alertify.confirmSave || alertify.dialog('confirmSave', function() {
        return {
          main: function(title, message) {
            this.setHeader(title);
            this.setContent(message);
          },
          setup: function() {
            return {
              buttons: [{
                text: gettext('Save'),
                className: 'btn btn-primary',
              }, {
                text: gettext('Don\'t save'),
                className: 'btn btn-danger',
              }, {
                text: gettext('Cancel'),
                key: 27, // ESC
                invokeOnClose: true,
                className: 'btn btn-warning',
              }],
              focus: {
                element: 0,
                select: false,
              },
              options: {
                maximizable: false,
                resizable: false,
              },
            };
          },
          callback: function(closeEvent) {
            switch (closeEvent.index) {
            case 0: // Save
              that.handler.close_on_save = true;
              that.handler._save(that, that.handler);
              break;
            case 1: // Don't Save
              that.handler.close_on_save = false;
              that.handler.close();
              break;
            case 2: //Cancel
                //Do nothing.
              break;
            }
          },
        };
      });
      alertify.confirmSave(gettext('Save changes?'), msg);
      return false;
    },

    /* Regarding SlickGrid usage in render_grid function.

     SlickGrid Plugins:
     ------------------
     1) Slick.AutoTooltips
     - This plugin is useful for displaying cell data as tooltip when
     user hover mouse on cell if data is large
     2) Slick.CheckboxSelectColumn
     - This plugin is useful for selecting rows using checkbox
     3) RowSelectionModel
     - This plugin is needed by CheckboxSelectColumn plugin to select rows
     4) Slick.HeaderButtons
     - This plugin is useful for add buttons in column header

     Grid Options:
     -------------
     1) editable
     - This option allow us to make grid editable
     2) enableAddRow
     - This option allow us to add new rows at the end of grid
     3) enableCellNavigation
     - This option allow us to navigate cells using keyboard
     4) enableColumnReorder
     - This option allow us to record column
     5) asyncEditorLoading
     - This option allow us to open editor async
     6) autoEdit
     - This option allow us to enter in edit mode directly when user clicks on it
     otherwise user have to double click or manually press enter on cell to go
     in cell edit mode

     Handling of data:
     -----------------
     We are doing data handling manually,what user adds/updates/deletes etc
     we will use `data_store` object to store everything user does within grid data

     - updated:
     This will hold all the data which user updates in grid
     - added:
     This will hold all the new row(s) data which user adds in grid
     - staged_rows:
     This will hold all the data which user copies/pastes/deletes in grid
     - deleted:
     This will hold all the data which user deletes in grid

     Events handling:
     ----------------
     1) onCellChange
     - We are using this event to listen to changes on individual cell.
     2) onAddNewRow
     - We are using this event to listen to new row adding functionality.
     3) onSelectedRangesChanged
     - We are using this event to listen when user selects rows for copy/delete operation.
     4) onBeforeEditCell
     - We are using this event to save the data before users modified them
     5) onKeyDown
     - We are using this event for Copy operation on grid
     */

    // This function is responsible to create and render the SlickGrid.
    render_grid: function(collection, columns, is_editable, client_primary_key, rows_affected) {
      var self = this;

      // This will work as data store and holds all the
      // inserted/updated/deleted data from grid
      self.handler.data_store = {
        updated: {},
        added: {},
        staged_rows: {},
        deleted: {},
        updated_index: {},
        added_index: {},
      };

      // To store primary keys before they gets changed
      self.handler.primary_keys_data = {};

      self.client_primary_key = client_primary_key;

      self.client_primary_key_counter = 0;

      // Remove any existing grid first
      if (self.handler.slickgrid) {
        self.handler.slickgrid.destroy();
      }

      if (!_.isArray(collection) || !_.size(collection)) {
        collection = [];
      }

      var grid_columns = [],
        table_name;
      var column_size = self.handler['col_size'],
        query = self.handler.query,
        // Extract table name from query
        table_list = query.match(/select.*from\s+\w+\.*(\w+)/i);

      if (!table_list) {
        table_name = SqlEditorUtils.getHash(query);
      } else {
        table_name = table_list[1];
      }

      self.handler['table_name'] = table_name;
      column_size[table_name] = column_size[table_name] || {};

      _.each(columns, function(c) {
        var options = {
          id: c.name,
          pos: c.pos,
          field: c.name,
          name: c.label,
          display_name: c.display_name,
          column_type: c.column_type,
          column_type_internal: c.column_type_internal,
          not_null: c.not_null,
          has_default_val: c.has_default_val,
          is_array: c.is_array,
        };

        // Get the columns width based on longer string among data type or
        // column name.
        var column_type = c.column_type.trim();
        var label = c.name.length > column_type.length ? c.name : column_type;

        if (_.isUndefined(column_size[table_name][c.name])) {
          options['width'] = SqlEditorUtils.calculateColumnWidth(label);
          column_size[table_name][c.name] = options['width'];
        } else {
          options['width'] = column_size[table_name][c.name];
        }
        // If grid is editable then add editor else make it readonly
        if (c.cell == 'oid') {
          options['editor'] = null;
        } else if (c.cell == 'Json') {
          options['editor'] = is_editable ? Slick.Editors.JsonText :
            Slick.Editors.ReadOnlyJsonText;
          options['formatter'] = Slick.Formatters.JsonString;
        } else if (c.cell == 'number' ||
          $.inArray(c.type, ['oid', 'xid', 'real']) !== -1
        ) {
          options['editor'] = is_editable ? Slick.Editors.CustomNumber :
            Slick.Editors.ReadOnlyText;
          options['formatter'] = Slick.Formatters.Numbers;
        } else if (c.cell == 'boolean') {
          options['editor'] = is_editable ? Slick.Editors.Checkbox :
            Slick.Editors.ReadOnlyCheckbox;
          options['formatter'] = Slick.Formatters.Checkmark;
        } else if (c.cell == 'binary') {
          // We do not support editing binary data in SQL editor and data grid.
          options['formatter'] = Slick.Formatters.Binary;
        } else if (c.cell == 'geometry' || c.cell == 'geography') {
          // increase width to add 'view' button
          options['width'] += 28;
        } else {
          options['editor'] = is_editable ? Slick.Editors.pgText :
            Slick.Editors.ReadOnlypgText;
          options['formatter'] = Slick.Formatters.Text;
        }

        grid_columns.push(options);
      });

      var gridSelector = new GridSelector();
      grid_columns = self.grid_columns = gridSelector.getColumnDefinitions(grid_columns);

      // add 'view' button in geometry and geography type column header
      _.each(grid_columns, function (c) {
        if (c.column_type_internal == 'geometry' || c.column_type_internal == 'geography') {
          GeometryViewer.add_header_button(c);
        }
      });

      if (rows_affected) {
        // calculate with for header row column.
        grid_columns[0]['width'] = SqlEditorUtils.calculateColumnWidth(rows_affected);
      }

      var grid_options = {
        editable: true,
        enableAddRow: is_editable,
        enableCellNavigation: true,
        enableColumnReorder: false,
        asyncEditorLoading: false,
        autoEdit: false,
      };

      var $data_grid = self.$el.find('#datagrid');
      // Calculate height based on panel size at runtime & set it
      var grid_height = $($('#editor-panel').find('.wcFrame')[1]).height() - 35;
      $data_grid.height(grid_height);

      var dataView = self.dataView = new Slick.Data.DataView(),
        grid = self.grid = new Slick.Grid($data_grid, dataView, grid_columns, grid_options);

      // Add-on function which allow us to identify the faulty row after insert/update
      // and apply css accordingly

      dataView.getItemMetadata = function(i) {
        var cssClass = '',
          data_store = self.handler.data_store;

        if (_.has(self.handler, 'data_store')) {
          if (i in data_store.added_index &&
            data_store.added_index[i] in data_store.added) {
            cssClass = 'new_row';
            if (data_store.added[data_store.added_index[i]].err) {
              cssClass += ' error';
            }
          } else if (i in data_store.updated_index && i in data_store.updated) {
            cssClass = 'updated_row';
            if (data_store.updated[data_store.updated_index[i]].err) {
              cssClass += ' error';
            }
          }
        }

        // Disable rows having default values
        if (!_.isUndefined(self.handler.rows_to_disable) &&
          self.handler.rows_to_disable.length > 0 &&
          _.indexOf(self.handler.rows_to_disable, i) !== -1) {
          cssClass += ' disabled_row';
        }

        return {
          'cssClasses': cssClass,
        };
      };

      grid.registerPlugin(new Slick.AutoTooltips({
        enableForHeaderCells: false,
      }));
      grid.registerPlugin(new ActiveCellCapture());
      grid.setSelectionModel(new XCellSelectionModel());
      grid.registerPlugin(gridSelector);
      var headerButtonsPlugin = new Slick.Plugins.HeaderButtons();
      headerButtonsPlugin.onCommand.subscribe(function (e, args) {
        let command = args.command;
        if (command === 'view-geometries') {
          let columns = args.grid.getColumns();
          let columnIndex = columns.indexOf(args.column);
          let selectedRows = args.grid.getSelectedRows();
          if (selectedRows.length === 0) {
            // if no rows are selected, load and render all the rows
            if (self.handler.has_more_rows) {
              self.fetch_next_all(function () {
                // trigger onGridSelectAll manually with new event data.
                gridSelector.onGridSelectAll.notify(args, new Slick.EventData());
                let items = args.grid.getData().getItems();
                GeometryViewer.render_geometries(self.handler, items, columns, columnIndex);
              });
            } else {
              gridSelector.onGridSelectAll.notify(args, new Slick.EventData());
              let items = args.grid.getData().getItems();
              GeometryViewer.render_geometries(self.handler, items, columns, columnIndex);
            }
          } else {
            // render selected rows
            let items = args.grid.getData().getItems();
            let selectedItems = _.map(selectedRows, function (row) {
              return items[row];
            });
            GeometryViewer.render_geometries(self.handler, selectedItems, columns, columnIndex);
          }
        }
      });
      grid.registerPlugin(headerButtonsPlugin);

      var editor_data = {
        keys: (_.isEmpty(self.handler.primary_keys) && self.handler.has_oids) ? self.handler.oids : self.handler.primary_keys,
        vals: collection,
        columns: columns,
        grid: grid,
        selection: grid.getSelectionModel(),
        editor: self,
        client_primary_key: self.client_primary_key,
        has_oids: self.handler.has_oids,
      };

      self.handler.slickgrid = grid;
      self.handler.slickgrid.CSVOptions = {
        quoting: self.preferences.results_grid_quoting,
        quote_char: self.preferences.results_grid_quote_char,
        field_separator: self.preferences.results_grid_field_separator,
      };

      // Listener function to watch selected rows from grid
      if (editor_data.selection) {
        editor_data.selection.onSelectedRangesChanged.subscribe(
          setStagedRows.bind(editor_data));
      }

      grid.onColumnsResized.subscribe(function() {
        var columns = this.getColumns();
        _.each(columns, function(col) {
          var column_size = self.handler['col_size'];
          column_size[self.handler['table_name']][col['id']] = col['width'];
        });
      });

      gridSelector.onBeforeGridSelectAll.subscribe(function(e, args) {
        if (self.handler.has_more_rows) {
          // this will prevent selection un-till we load all data
          e.stopImmediatePropagation();
          self.fetch_next_all(function() {
            // since we've stopped event propagation we need to
            // trigger onGridSelectAll manually with new event data.
            gridSelector.onGridSelectAll.notify(args, new Slick.EventData());
          });
        }
      });

      gridSelector.onBeforeGridColumnSelectAll.subscribe(function(e, args) {
        if (self.handler.has_more_rows) {
          // this will prevent selection un-till we load all data
          e.stopImmediatePropagation();
          self.fetch_next_all(function() {
            // since we've stopped event propagation we need to
            // trigger onGridColumnSelectAll manually with new event data.
            gridSelector.onGridColumnSelectAll.notify(args, new Slick.EventData());
          });
        }
      });

      // listen for row count change.
      dataView.onRowCountChanged.subscribe(function() {
        grid.updateRowCount();
        grid.render();
      });

      // listen for rows change.
      dataView.onRowsChanged.subscribe(function(e, args) {
        grid.invalidateRows(args.rows);
        grid.render();
      });

      // Listener function which will be called before user updates existing cell
      // This will be used to collect primary key for that row
      grid.onBeforeEditCell.subscribe(function(e, args) {
        if (args.column.column_type_internal == 'bytea' ||
          args.column.column_type_internal == 'bytea[]') {
          return false;
        }

        var before_data = args.item;

        // If newly added row is saved but grid is not refreshed,
        // then disable cell editing for that row
        if (self.handler.rows_to_disable &&
          _.contains(self.handler.rows_to_disable, args.row)) {
          return false;
        }

        if (self.handler.can_edit && before_data && self.client_primary_key in before_data) {
          var _pk = before_data[self.client_primary_key],
            _keys = self.handler.primary_keys,
            current_pk = {};

          // If already have primary key data then no need to go ahead
          if (_pk in self.handler.primary_keys_data) {
            return;
          }

          // Fetch primary keys for the row before they gets modified
          _.each(_keys, function(value, key) {
            current_pk[key] = before_data[key];
          });
          // Place it in main variable for later use
          self.handler.primary_keys_data[_pk] = current_pk;
        }
      });

      grid.onKeyDown.subscribe(function(event, args) {
        var KEY_A = 65;
        var modifiedKey = event.keyCode;
        var isModifierDown = event.ctrlKey || event.metaKey;
        // Intercept Ctrl/Cmd + A key board event.
        // As we might want to load all rows before selecting all.
        if (isModifierDown && modifiedKey == KEY_A && self.handler.has_more_rows) {
          self.fetch_next_all(function() {
            handleQueryOutputKeyboardEvent(event, args);
          });
        } else {
          handleQueryOutputKeyboardEvent(event, args);
        }
      });

      // Listener function which will be called when user updates existing rows
      grid.onCellChange.subscribe(function(e, args) {
        // self.handler.data_store.updated will holds all the updated data
        var changed_column = args.grid.getColumns()[args.cell].field,
          updated_data = args.item[changed_column], // New value for current field
          _pk = args.item[self.client_primary_key] || null, // Unique key to identify row
          column_data = {};

        // Access to row/cell value after a cell is changed.
        // The purpose is to remove row_id from temp_new_row
        // if new row has primary key instead of [default_value]
        // so that cell edit is enabled for that row.
        var grid = args.grid,
          row_data = grid.getDataItem(args.row),
          is_primary_key = self.primary_keys &&
          _.all(
            _.values(
              _.pick(
                row_data, self.primary_keys
              )
            ),
            function(val) {
              return val != undefined;
            }
          );

        // temp_new_rows is available only for view data.
        if (is_primary_key && self.handler.temp_new_rows) {
          var index = self.handler.temp_new_rows.indexOf(args.row);
          if (index > -1) {
            self.handler.temp_new_rows.splice(index, 1);
          }
        }

        column_data[changed_column] = updated_data;


        if (_pk) {
          // Check if it is in newly added row by user?
          if (_pk in self.handler.data_store.added) {
            _.extend(
              self.handler.data_store.added[_pk]['data'],
              column_data);
            //Find type for current column
            self.handler.data_store.added[_pk]['err'] = false;
            // Check if it is updated data from existing rows?
          } else if (_pk in self.handler.data_store.updated) {
            _.extend(
              self.handler.data_store.updated[_pk]['data'],
              column_data
            );
            self.handler.data_store.updated[_pk]['err'] = false;
          } else {
            // First updated data for this primary key
            self.handler.data_store.updated[_pk] = {
              'err': false,
              'data': column_data,
              'primary_keys': self.handler.primary_keys_data[_pk],
            };
            self.handler.data_store.updated_index[args.row] = _pk;
          }
        }
        // Enable save button
        $('#btn-save').prop('disabled', false);
      }.bind(editor_data));

      // Listener function which will be called when user adds new rows
      grid.onAddNewRow.subscribe(function(e, args) {
        // self.handler.data_store.added will holds all the newly added rows/data
        var column = args.column,
          item = args.item,
          data_length = this.grid.getDataLength(),
          _key = (self.client_primary_key_counter++).toString(),
          dataView = this.grid.getData();

        // Add new row in list to keep track of it
        if (_.isUndefined(item[0])) {
          self.handler.temp_new_rows.push(data_length);
        }

        // If copied item has already primary key, use it.
        if (item) {
          item[self.client_primary_key] = _key;
        }

        dataView.addItem(item);
        self.handler.data_store.added[_key] = {
          'err': false,
          'data': item,
        };
        self.handler.data_store.added_index[data_length] = _key;
        // Fetch data type & add it for the column
        var temp = {};
        temp[column.name] = _.where(this.columns, {
          pos: column.pos,
        })[0]['type'];
        grid.updateRowCount();
        grid.render();

        // Enable save button
        $('#btn-save').prop('disabled', false);
      }.bind(editor_data));

      // Listen grid viewportChanged event to load next chunk of data.
      grid.onViewportChanged.subscribe(function(e, args) {
        var rendered_range = args.grid.getRenderedRange(),
          data_len = args.grid.getDataLength();
        // start fetching next batch of records before reaching to bottom.
        if (self.handler.has_more_rows && !self.handler.fetching_rows && rendered_range.bottom > data_len - 100) {
          // fetch asynchronous
          setTimeout(self.fetch_next.bind(self));
        }
      });

      // Resize SlickGrid when window resize
      $(window).resize(function() {
        // Resize grid only when 'Data Output' panel is visible.
        if (self.data_output_panel.isVisible()) {
          self.grid_resize(grid);
        }
      });

      // Resize SlickGrid when output Panel resize
      self.data_output_panel.on(wcDocker.EVENT.RESIZE_ENDED, function() {
        // Resize grid only when 'Data Output' panel is visible.
        if (self.data_output_panel.isVisible()) {
          self.grid_resize(grid);
        }
      });

      // Resize SlickGrid when output Panel gets focus
      self.data_output_panel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function() {
        // Resize grid only if output panel is visible
        if (self.data_output_panel.isVisible())
          self.grid_resize(grid);
      });

      for (var i = 0; i < collection.length; i++) {
        // Convert to dict from 2darray
        var item = {};
        for (var j = 1; j < grid_columns.length; j++) {
          item[grid_columns[j]['field']] = collection[i][grid_columns[j]['pos']];
        }

        item[self.client_primary_key] = (self.client_primary_key_counter++).toString();
        collection[i] = item;
      }
      dataView.setItems(collection, self.client_primary_key);
    },
    fetch_next_all: function(cb) {
      this.fetch_next(true, cb);
    },
    fetch_next: function(fetch_all, cb) {
      var self = this,
        url = '';

      // This will prevent fetch operation if previous fetch operation is
      // already in progress.
      self.handler.fetching_rows = true;

      $('#btn-flash').prop('disabled', true);

      if (fetch_all) {
        self.handler.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Fetching all records...')
        );
        url = url_for('sqleditor.fetch_all', {
          'trans_id': self.transId,
          'fetch_all': 1,
        });
      } else {
        url = url_for('sqleditor.fetch', {
          'trans_id': self.transId,
        });
      }

      $.ajax({
        url: url,
        method: 'GET',
      })
      .done(function(res) {
        self.handler.has_more_rows = res.data.has_more_rows;
        $('#btn-flash').prop('disabled', false);
        self.handler.trigger('pgadmin-sqleditor:loading-icon:hide');
        self.update_grid_data(res.data.result);
        self.handler.fetching_rows = false;
        if (typeof cb == 'function') {
          cb();
        }
      })
      .fail(function(e) {
        $('#btn-flash').prop('disabled', false);
        self.handler.trigger('pgadmin-sqleditor:loading-icon:hide');
        self.handler.has_more_rows = false;
        self.handler.fetching_rows = false;
        if (typeof cb == 'function') {
          cb();
        }

        let msg = httpErrorHandler.handleQueryToolAjaxError(
          pgAdmin, self, e, null, [], false
        );
        self.update_msg_history(false, msg);
      });
    },

    update_grid_data: function(data) {
      this.dataView.beginUpdate();

      for (var i = 0; i < data.length; i++) {
        // Convert 2darray to dict.
        var item = {};
        for (var j = 1; j < this.grid_columns.length; j++) {
          item[this.grid_columns[j]['field']] = data[i][this.grid_columns[j]['pos']];
        }

        item[this.client_primary_key] = (this.client_primary_key_counter++).toString();
        this.dataView.addItem(item);
      }

      this.dataView.endUpdate();
    },

    /* This function is responsible to render output grid */
    grid_resize: function(grid) {
      var prev_height = $('#datagrid').height(),
        h = $($('#editor-panel').find('.wcFrame')[1]).height() - 35,
        prev_viewport = grid.getViewport(),
        prev_viewport_rows = grid.getRenderedRange(),
        prev_cell = grid.getActiveCell();

      // Apply css only if necessary, To avoid DOM operation
      if (prev_height != h) {
        $('#datagrid').css({
          'height': h + 'px',
        });
      }

      grid.resizeCanvas();

      /*
       * If there is an active cell from user then we have to go to that cell
       */
      if (prev_cell) {
        grid.scrollCellIntoView(prev_cell.row, prev_cell.cell);
      }

      // If already displaying from first row
      if (prev_viewport.top == prev_viewport_rows.top) {
        return;
      }
      // if user has scroll to the end/last row
      else if (prev_viewport.bottom - 2 == prev_viewport_rows.bottom) {
        grid.scrollRowIntoView(prev_viewport.bottom);
      } else {
        grid.scrollRowIntoView(prev_viewport.bottom - 2);
      }
    },

    /* This function is responsible to create and render the
     * new backgrid for the history tab.
     */
    render_history_grid: function() {
      var self = this;

      /* Should not reset if function called again */
      if(!self.history_collection) {
        self.history_collection = new HistoryBundle.HistoryCollection([]);
      }

      var historyComponent;
      var historyCollectionReactElement = React.createElement(
        queryHistory.QueryHistory, {
          historyCollection: self.history_collection,
          ref: function(component) {
            historyComponent = component;
          },
          sqlEditorPref: {
            sql_font_size: SqlEditorUtils.calcFontSize(this.preferences.sql_font_size),
          },
        });
      ReactDOM.render(historyCollectionReactElement, $('#history_grid')[0]);

      self.history_panel.off(wcDocker.EVENT.VISIBILITY_CHANGED);
      self.history_panel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function() {
        historyComponent.refocus();
      });
    },

    // Callback function for Add New Row button click.
    on_delete: function() {
      var self = this;

      // Trigger the addrow signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:deleterow',
        self,
        self.handler
      );
    },

    _stopEventPropogation: function(ev) {
      ev = ev || window.event;
      ev.cancelBubble = true;
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      ev.preventDefault();
    },

    _closeDropDown: function(ev) {
      var target = ev && (ev.currentTarget || ev.target);
      if (target) {
        $(target).closest('.open').removeClass('open').find('.dropdown-backdrop').remove();
      }
    },

    // Callback function for Save button click.
    on_save: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.handler.close_on_save = false;
      // Trigger the save signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:save',
        self,
        self.handler
      );
    },

    // Callback function for Save button click.
    on_save_as: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.handler.close_on_save = false;
      // Trigger the save signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:save',
        self,
        self.handler,
        true
      );
    },

    // Callback function for the find button click.
    on_find: function(ev) {
      var self = this;
      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('find');
    },

    // Callback function for the find next button click.
    on_find_next: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('findNext');
    },

    // Callback function for the find previous button click.
    on_find_previous: function(ev) {
      var self = this;
      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('findPrev');
    },

    // Callback function for the replace button click.
    on_replace: function(ev) {
      var self = this;
      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('replace');
    },

    // Callback function for the replace all button click.
    on_replace_all: function(ev) {
      var self = this;
      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('replaceAll');
    },

    // Callback function for the find persistent button click.
    on_find_persistent: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('findPersistent');
    },

    // Callback function for the jump button click.
    on_jump: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.query_tool_obj.execCommand('jumpToLine');
    },

    // Callback function for filter button click.
    on_show_filter: function() {
      var self = this;

      // Trigger the show_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:show_filter',
        self,
        self.handler
      );
    },

    // Callback function for include filter button click.
    on_include_filter: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      // Trigger the include_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:include_filter',
        self,
        self.handler
      );
    },

    // Callback function for exclude filter button click.
    on_exclude_filter: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      // Trigger the exclude_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:exclude_filter',
        self,
        self.handler
      );
    },

    // Callback function for remove filter button click.
    on_remove_filter: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      // Trigger the remove_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:remove_filter',
        self,
        self.handler
      );
    },

    // Callback function for ok button click.
    on_apply: function() {
      var self = this;

      // Trigger the apply_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:apply_filter',
        self,
        self.handler
      );
    },

    // Callback function for cancel button click.
    on_cancel: function() {
      $('#filter').addClass('hidden');
      $('#editor-panel').removeClass('sql-editor-busy-fetching');
    },

    // Callback function for copy button click.
    on_copy_row: function() {
      var self = this;

      // Trigger the copy signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:copy_row',
        self,
        self.handler
      );

    },

    // Callback function for paste button click.
    on_paste_row: function() {
      var self = this;

      // Trigger the paste signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:paste_row',
        self,
        self.handler
      );
    },

    // Callback function for the change event of combo box
    on_limit_change: function() {
      var self = this;

      // Trigger the limit signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:limit',
        self,
        self.handler
      );
    },

    // Callback function for the flash button click.
    on_flash: function() {
      queryToolActions.executeQuery(this.handler);
    },

    // Callback function for the cancel query button click.
    on_cancel_query: function() {
      var self = this;

      // Trigger the cancel-query signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:cancel-query',
        self,
        self.handler
      );
    },

    // Callback function for the line comment code
    on_comment_line_code: function() {
      queryToolActions.commentLineCode(this.handler);
    },

    // Callback function for the line uncomment code
    on_uncomment_line_code: function() {
      queryToolActions.uncommentLineCode(this.handler);
    },

    // Callback function for the block comment/uncomment code
    on_toggle_comment_block_code: function() {
      queryToolActions.commentBlockCode(this.handler);
    },

    on_indent_code: function() {
      var self = this;
      // Trigger the comment signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:indent_selected_code',
        self,
        self.handler
      );
    },

    on_unindent_code: function() {
      var self = this;
      // Trigger the comment signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:unindent_selected_code',
        self,
        self.handler
      );
    },

    // Callback function for the clear button click.
    on_clear: function(ev) {
      var self = this;
      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      /* If is_query_changed flag is set to false then no need to
       * confirm with the user for unsaved changes.
       */
      if (self.handler.is_query_changed) {
        alertify.confirm(
          gettext('Unsaved changes'),
          gettext('Are you sure you wish to discard the current changes?'),
          function() {
            // Do nothing as user do not want to save, just continue
            self.query_tool_obj.setValue('');
            setTimeout(() => { self.query_tool_obj.focus(); }, 200);
          },
          function() {
            return true;
          }
        ).set('labels', {
          ok: gettext('Yes'),
          cancel: gettext('No'),
        });
      } else {
        self.query_tool_obj.setValue('');
      }
    },

    // Callback function for the clear history button click.
    on_clear_history: function(ev) {
      var self = this;
      this._stopEventPropogation(ev);
      this._closeDropDown(ev);
      // ask for confirmation only if anything to clear
      if (!self.history_collection.length()) {
        return;
      }

      alertify.confirm(gettext('Clear history'),
        gettext('Are you sure you wish to clear the history?'),
        function() {
          if (self.history_collection) {
            self.history_collection.reset();
          }
          setTimeout(() => { self.query_tool_obj.focus(); }, 200);
        },
        function() {
          return true;
        }
      ).set('labels', {
        ok: gettext('Yes'),
        cancel: gettext('No'),
      });
    },

    // Callback function for the auto commit button click.
    on_auto_commit: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Trigger the auto-commit signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:auto_commit',
        self,
        self.handler
      );
    },

    // Callback function for the auto rollback button click.
    on_auto_rollback: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Trigger the download signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:auto_rollback',
        self,
        self.handler
      );
    },

    // Callback function for explain button click.
    on_explain: function(event) {
      this._stopEventPropogation(event);
      this._closeDropDown(event);

      queryToolActions.explain(this.handler);
    },

    // Callback function for explain analyze button click.
    on_explain_analyze: function(event) {
      this._stopEventPropogation(event);
      this._closeDropDown(event);

      queryToolActions.explainAnalyze(this.handler);
    },

    // Callback function for explain option "verbose" button click
    on_explain_verbose: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Trigger the explain "verbose" signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:explain-verbose',
        self,
        self.handler
      );
    },

    // Callback function for explain option "costs" button click
    on_explain_costs: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Trigger the explain "costs" signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:explain-costs',
        self,
        self.handler
      );
    },

    // Callback function for explain option "buffers" button click
    on_explain_buffers: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Trigger the explain "buffers" signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:explain-buffers',
        self,
        self.handler
      );
    },

    // Callback function for explain option "timing" button click
    on_explain_timing: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Trigger the explain "timing" signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:explain-timing',
        self,
        self.handler
      );
    },

    do_not_close_menu: function(ev) {
      ev.stopPropagation();
    },

    // callback function for load file button click.
    on_file_load: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      // Trigger the save signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:load_file',
        self,
        self.handler
      );
    },

    on_download: function() {
      queryToolActions.download(this.handler);
    },

    keyAction: function(event) {
      var panel_id, self = this;
      panel_id = keyboardShortcuts.processEventQueryTool(
        this.handler, queryToolActions, event
      );

      // If it return panel id then focus it
      if(!_.isNull(panel_id) && !_.isUndefined(panel_id)) {
        // Returned panel index, by incrementing it by 1 we will get actual panel
        panel_id++;
        this.docker.findPanels()[panel_id].focus();
        // We set focus on history tab so we need to set the focus on
        // editor explicitly
        if(panel_id == 3) {
          setTimeout(function() { self.query_tool_obj.focus(); }, 100);
        }
      }
    },
  });

  /* Defining controller class for data grid, which actually
   * perform the operations like executing the sql query, poll the result,
   * render the data in the grid, Save/Refresh the data etc...
   */
  var SqlEditorController = function() {
    this.initialize.apply(this, arguments);
  };

  _.extend(
    SqlEditorController.prototype,
    Backbone.Events,
    {
      initialize: function(container) {
        var self = this;
        this.container = container;
        this.state = {};
        // Disable animation first
        modifyAnimation.modifyAlertifyAnimation();

        if (!alertify.dlgGetServerPass) {
          alertify.dialog('dlgGetServerPass', function factory() {
            return {
              main: function(
                title, message
              ) {
                this.set('title', title);
                this.setting('message',message);
              },
              setup:function() {
                return {
                  buttons:[
                    {
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
                  focus: {
                    element: '#password',
                    select: true,
                  },
                  options: {
                    modal: 0,
                    resizable: false,
                    maximizable: false,
                    pinnable: false,
                  },
                };
              },
              build:function() {},
              settings:{
                message: null,
              },
              prepare:function() {
                this.setContent(this.setting('message'));
              },
              callback: function(closeEvent) {
                if (closeEvent.button.text == gettext('OK')) {
                  var passdata = $(this.elements.content).find('#frmPassword').serialize();
                  self.init_connection(false, passdata);
                }
              },
            };
          });
        }
        this.on('pgadmin-datagrid:transaction:created', function(trans_obj) {
          self.transId = trans_obj.gridTransId;
          self.warn_before_continue();
        });
        pgBrowser.Events.on('pgadmin:user:logged-in', function() {
          self.initTransaction();
        });
      },
      saveState: function(fn, args) {
        if (fn) {
          this.state = {
            'fn': fn,
            'args': args,
          };
        } else {
          this.state = {};
        }
      },

      initTransaction: function() {
        var url_endpoint;
        if (this.is_query_tool) {
          url_endpoint = 'datagrid.initialize_query_tool';

          // If database not present then use Maintenance database
          // We will handle this at server side
          if (this.url_params.did) {
            url_endpoint = 'datagrid.initialize_query_tool_with_did';
          }

        } else {
          url_endpoint = 'datagrid.initialize_datagrid';
        }

        var baseUrl = url_for(url_endpoint, this.url_params);

        Datagrid.create_transaction(baseUrl, this, this.is_query_tool,
            this.server_type, '', '', '', true);
      },

      handle_connection_lost: function(create_transaction, xhr) {
        /* If responseJSON is undefined then it could be object of
         * axios(Promise HTTP) response, so we should check accordingly.
         */
        if (xhr.responseJSON !== undefined &&
            xhr.responseJSON.data && !xhr.responseJSON.data.conn_id) {
          // if conn_id is null then this is maintenance db.
          // so attempt connection connect without prompt.
          this.init_connection(create_transaction);
        } else if (xhr.data !== undefined &&
          xhr.data.data && !xhr.data.data.conn_id) {
          // if conn_id is null then this is maintenance db.
          // so attempt connection connect without prompt.
          this.init_connection(create_transaction);
        } else {
          this.warn_before_continue();
        }
      },
      warn_before_continue: function() {
        var self = this;

        alertify.confirm(
          gettext('Connection Warning'),
          '<p style="float:left">'+
            '<span class="fa fa-exclamation-triangle warn-icon" aria-hidden="true">'+
            '</span>'+
          '</p>'+
          '<p style="display: inline-block;">'+
            '<span class="warn-header">'+
              gettext('The application has lost the database connection:')+
            '</span>'+
            '<br>'+
            '<span class="warn-body">'+
              gettext('⁃ If the connection was idle it may have been forcibly disconnected.')+
            '<br>'+
              gettext('⁃ The application server or database server may have been restarted.')+
            '<br>'+
              gettext('⁃ The user session may have timed out.')+
            '</span>'+
            '<br>'+
            '<span class="warn-footer">'+
            gettext('Do you want to continue and establish a new session?')+
            '</span>'+
          '</p>',
          function() {
            if ('fn' in self.state) {
              var fn = self.state['fn'],
                args = self.state['args'];
              self.saveState();
              if (args.indexOf('connect') == -1) {
                args.push('connect');
              }

              self[fn].apply(self, args);
            }
          }, function() {
            self.saveState();
          })
          .set({
            labels: {
              ok: gettext('Continue'),
              cancel: gettext('Cancel'),
            },
          });
      },
      init_connection: function(create_transaction, passdata) {
        var self = this;
        $.post(url_for('NODE-server.connect_id', {
          'gid': this.url_params.sgid,
          'sid': this.url_params.sid,
        }),passdata)
        .done(function(res) {
          if (res.success == 1) {
            alertify.success(res.info);
            if (create_transaction) {
              self.initTransaction();
            } else if ('fn' in self.state) {
              var fn = self.state['fn'],
                args = self.state['args'];
              self.saveState();
              self[fn].apply(self, args);
            }
          }
        })
        .fail(function(xhr) {
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, xhr, null, [], false
          );
          alertify.dlgGetServerPass(
            gettext('Connect to Server'), msg
          );
        });
      },
      /* This function is used to create instance of SQLEditorView,
       * call the render method of the grid view to render the backgrid
       * header and loading icon and start execution of the sql query.
       */
      start: function(transId, is_query_tool, editor_title, script_type_url,
        server_type, url_params
      ) {
        var self = this;

        self.is_query_tool = is_query_tool;
        self.rows_affected = 0;
        self.marked_line_no = 0;
        self.has_more_rows = false;
        self.fetching_rows = false;
        self.close_on_save = false;
        self.server_type = server_type;
        self.url_params = url_params;
        self.script_type_url = script_type_url;

        // We do not allow to call the start multiple times.
        if (self.gridView)
          return;

        self.gridView = new SQLEditorView({
          el: self.container,
          handler: self,
        });
        self.transId = self.gridView.transId = transId;

        self.gridView.editor_title = _.unescape(editor_title);
        self.gridView.current_file = undefined;

        // Render the header
        self.gridView.render();

        if (self.is_query_tool) {
          // Fetch the SQL for Scripts (eg: CREATE/UPDATE/DELETE/SELECT)
          // Call AJAX only if script type url is present
          if (script_type_url) {
            $.ajax({
              url: script_type_url,
              type:'GET',
            })
            .done(function(res) {
              self.gridView.query_tool_obj.refresh();
              if (res && res !== '') {
                self.gridView.query_tool_obj.setValue(res);
              }
              self.init_events();
            })
            .fail(function(jqx) {
              let msg = '';
              self.init_events();

              msg = httpErrorHandler.handleQueryToolAjaxError(
                pgAdmin, self, jqx, null, [], false
              );

              pgBrowser.report_error(
                S(gettext('Error fetching SQL for script: %s.')).sprintf(msg).value()
              );
            });
          } else {
            self.init_events();
          }
        }
        else {
          // Disable codemirror by setting readOnly option to true, background to dark, and cursor, hidden.
          self.init_events();
          self.gridView.query_tool_obj.setOption('readOnly', true);
          var cm = self.gridView.query_tool_obj.getWrapperElement();
          if (cm) {
            cm.className += ' bg-gray-1 opacity-5 hide-cursor-workaround';
          }
          self.disable_tool_buttons(true);
          self.execute_data_query();
        }
      },

      init_events: function() {
        var self = this;
        // Listen to the file manager button events
        pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:select_file', self._select_file_handler, self);
        pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:create_file', self._save_file_handler, self);

        // Listen to the codemirror on text change event
        // only in query editor tool
        if (self.is_query_tool) {
          self.gridView.query_tool_obj.on('change', self._on_query_change.bind(self));
        }

        // Listen on events come from SQLEditorView for the button clicked.
        self.on('pgadmin-sqleditor:button:load_file', self._load_file, self);
        self.on('pgadmin-sqleditor:button:save', self._save, self);
        self.on('pgadmin-sqleditor:button:deleterow', self._delete, self);
        self.on('pgadmin-sqleditor:button:show_filter', self._show_filter, self);
        self.on('pgadmin-sqleditor:button:include_filter', self._include_filter, self);
        self.on('pgadmin-sqleditor:button:exclude_filter', self._exclude_filter, self);
        self.on('pgadmin-sqleditor:button:remove_filter', self._remove_filter, self);
        self.on('pgadmin-sqleditor:button:apply_filter', self._apply_filter, self);
        self.on('pgadmin-sqleditor:button:copy_row', self._copy_row, self);
        self.on('pgadmin-sqleditor:button:paste_row', self._paste_row, self);
        self.on('pgadmin-sqleditor:button:limit', self._set_limit, self);
        self.on('pgadmin-sqleditor:button:cancel-query', self._cancel_query, self);
        self.on('pgadmin-sqleditor:button:auto_rollback', self._auto_rollback, self);
        self.on('pgadmin-sqleditor:button:auto_commit', self._auto_commit, self);
        self.on('pgadmin-sqleditor:button:explain-verbose', self._explain_verbose, self);
        self.on('pgadmin-sqleditor:button:explain-costs', self._explain_costs, self);
        self.on('pgadmin-sqleditor:button:explain-buffers', self._explain_buffers, self);
        self.on('pgadmin-sqleditor:button:explain-timing', self._explain_timing, self);
        // Indentation related
        self.on('pgadmin-sqleditor:indent_selected_code', self._indent_selected_code, self);
        self.on('pgadmin-sqleditor:unindent_selected_code', self._unindent_selected_code, self);
      },

      // This function checks if there is any dirty data in the grid before
      // it executes the sql query
      execute_data_query: function() {
        var self = this;

        // Check if the data grid has any changes before running query
        if (_.has(self, 'data_store') &&
          (_.size(self.data_store.added) ||
            _.size(self.data_store.updated) ||
            _.size(self.data_store.deleted))
        ) {
          alertify.confirm(gettext('Unsaved changes'),
            gettext('The data has been modified, but not saved. Are you sure you wish to discard the changes?'),
            function() {
              // Do nothing as user do not want to save, just continue
              self._run_query();
            },
            function() {
              // Stop, User wants to save
              return true;
            }
          ).set('labels', {
            ok: gettext('Yes'),
            cancel: gettext('No'),
          });
        } else {
          self._run_query();
        }
      },

      // This function makes the ajax call to execute the sql query.
      _run_query: function() {
        var self = this,
          url = url_for('sqleditor.view_data_start', {
            'trans_id': self.transId,
          });

        self.query_start_time = new Date();
        self.rows_affected = 0;
        self._init_polling_flags();
        // keep track of newly added rows
        self.rows_to_disable = new Array();
        // Temporarily hold new rows added
        self.temp_new_rows = new Array();
        self.has_more_rows = false;
        self.fetching_rows = false;

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Initializing query execution.')
        );

        $('#btn-flash').prop('disabled', true);

        self.trigger(
          'pgadmin-sqleditor:loading-icon:message',
          gettext('Waiting for the query execution to complete...')
        );

        if (arguments.length > 0 &&
          arguments[arguments.length - 1] == 'connect') {
          url += '?connect=1';
        }

        $.ajax({
          url: url,
          method: 'GET',
        })
        .done(function(res) {
          if (res.data.status) {
            self.can_edit = res.data.can_edit;
            self.can_filter = res.data.can_filter;
            self.info_notifier_timeout = res.data.info_notifier_timeout;

            // Set the sql query to the SQL panel
            self.gridView.query_tool_obj.setValue(res.data.sql);
            self.query = res.data.sql;


            /* If filter is applied then remove class 'btn-default'
             * and add 'btn-warning' to change the colour of the button.
             */
            if (self.can_filter && res.data.filter_applied) {
              $('#btn-filter').removeClass('btn-default');
              $('#btn-filter-dropdown').removeClass('btn-default');
              $('#btn-filter').addClass('btn-primary');
              $('#btn-filter-dropdown').addClass('btn-primary');
            } else {
              $('#btn-filter').removeClass('btn-primary');
              $('#btn-filter-dropdown').removeClass('btn-primary');
              $('#btn-filter').addClass('btn-default');
              $('#btn-filter-dropdown').addClass('btn-default');
            }
            $('#btn-save').prop('disabled', true);
            $('#btn-file-menu-dropdown').prop('disabled', true);
            $('#btn-copy-row').prop('disabled', true);
            $('#btn-paste-row').prop('disabled', true);

            // Set the combo box value
            $('.limit').val(res.data.limit);

            // If status is True then poll the result.
            self._poll();
          } else {
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            self.update_msg_history(false, res.data.result);
          }
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_run_query', [], true
          );
          self.update_msg_history(false, msg);
        });
      },

      // This is a wrapper to call_render function
      // We need this because we have separated columns route & result route
      // We need to combine both result here in wrapper before rendering grid
      call_render_after_poll: function(queryResult) {
        callRenderAfterPoll.callRenderAfterPoll(this,alertify,queryResult);
      },


      /* This function makes the ajax call to poll the result,
       * if status is Busy then recursively call the poll function
       * till the status is 'Success' or 'NotConnected'. If status is
       * 'Success' then call the render method to render the data.
       */
      _poll: function() {
        const executeQuery = new ExecuteQuery.ExecuteQuery(this, pgAdmin.Browser.UserManagement);
        executeQuery.delayedPoll(this);
      },

      /* This function is used to create the backgrid columns,
       * create the Backbone PageableCollection and finally render
       * the data in the backgrid.
       */
      _render: function(data) {
        var self = this;
        self.colinfo = data.col_info;
        self.primary_keys = (_.isEmpty(data.primary_keys) && data.has_oids) ? data.oids : data.primary_keys;
        self.client_primary_key = data.client_primary_key;
        self.cell_selected = false;
        self.selected_model = null;
        self.changedModels = [];
        self.has_oids = data.has_oids;
        self.oids = data.oids;
        $('.sql-editor-explain').empty();

        /* If object don't have primary keys then set the
         * can_edit flag to false.
         */
        if ((self.primary_keys === null || self.primary_keys === undefined ||
            _.size(self.primary_keys) === 0) && self.has_oids == false)
          self.can_edit = false;
        else
          self.can_edit = true;

        /* If user can filter the data then we should enabled
         * Filter and Limit buttons.
         */
        if (self.can_filter) {
          $('.limit').prop('disabled', false);
          $('.limit').addClass('limit-enabled');
          $('#btn-filter').prop('disabled', false);
          $('#btn-filter-dropdown').prop('disabled', false);
        }

        // Initial settings for delete row, copy row and paste row buttons.
        $('#btn-delete-row').prop('disabled', true);
        // Do not disable save button in query tool
        if (!self.is_query_tool && !self.can_edit) {
          $('#btn-save').prop('disabled', true);
          $('#btn-file-menu-dropdown').prop('disabled', true);
        }
        if (!self.can_edit) {
          $('#btn-delete-row').prop('disabled', true);
          $('#btn-copy-row').prop('disabled', true);
          $('#btn-paste-row').prop('disabled', true);
        }

        // Fetch the columns metadata
        self._fetch_column_metadata.call(
          self, data,
          function() {
            var self = this;

            self.trigger(
              'pgadmin-sqleditor:loading-icon:message',
              gettext('Loading data from the database server and rendering...'),
              self
            );

            // Show message in message and history tab in case of query tool
            self.total_time = calculateQueryRunTime.calculateQueryRunTime(
              self.query_start_time,
              self.query_end_time
            );
            var msg1 = S(gettext('Successfully run. Total query runtime: %s.')).sprintf(self.total_time).value();
            var msg2 = S(gettext('%s rows affected.')).sprintf(self.rows_affected).value();

            // Display the notifier if the timeout is set to >= 0
            if (self.info_notifier_timeout >= 0) {
              alertify.success(msg1 + ' ' + msg2, self.info_notifier_timeout);
            }

            var _msg = msg1 + '\n' + msg2;


            // If there is additional messages from server then add it to message
            if (!_.isNull(data.additional_messages) &&
              !_.isUndefined(data.additional_messages)) {
              _msg = data.additional_messages + '\n' + _msg;
            }

            self.update_msg_history(true, _msg, false);

            /* Add the data to the collection and render the grid.
             * In case of Explain draw the graph on explain panel
             * and add json formatted data to collection and render.
             */
            var explain_data_array = [];
            if (
              data.result && data.result.length >= 1 &&
              data.result[0] && data.result[0][0] && data.result[0][0][0] &&
              data.result[0][0][0].hasOwnProperty('Plan') &&
              _.isObject(data.result[0][0][0]['Plan'])
            ) {
              var explain_data = [JSON.stringify(data.result[0][0], null, 2)];
              explain_data_array.push(explain_data);
              // Make sure - the 'Data Output' panel is visible, before - we
              // start rendering the grid.
              self.gridView.data_output_panel.focus();
              setTimeout(
                function() {
                  self.gridView.render_grid(
                    explain_data_array, self.columns, self.can_edit,
                    self.client_primary_key
                  );
                  // Make sure - the 'Explain' panel is visible, before - we
                  // start rendering the grid.
                  self.gridView.explain_panel.focus();
                  pgExplain.DrawJSONPlan(
                    $('.sql-editor-explain'), data.result[0][0]
                  );
                }, 10
              );
            } else {
              // Make sure - the 'Data Output' panel is visible, before - we
              // start rendering the grid.
              self.gridView.data_output_panel.focus();
              setTimeout(
                function() {
                  self.gridView.render_grid(data.result, self.columns,
                    self.can_edit, self.client_primary_key, data.rows_affected);
                }, 10
              );
            }

            // Hide the loading icon
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            $('#btn-flash').prop('disabled', false);
          }.bind(self)
        );
      },

      // This function creates the columns as required by the backgrid
      _fetch_column_metadata: function(data, cb) {
        var colinfo = data.colinfo,
          primary_keys = data.primary_keys,
          columns = [],
          self = this;
        // Store pg_types in an array
        var pg_types = new Array();
        _.each(data.types, function(r) {
          pg_types[r.oid] = [r.typname];
        });

        // Create columns required by slick grid to render
        _.each(colinfo, function(c) {
          var is_primary_key = false;

          // Check whether table have primary key
          if (_.size(primary_keys) > 0) {
            _.each(primary_keys, function(value, key) {
              if (key === c.name)
                is_primary_key = true;
            });
          }

          // To show column label and data type in multiline,
          // The elements should be put inside the div.
          // Create column label and type.
          var col_type = '',
            column_label = '',
            col_cell;
          var type = pg_types[c.type_code] ?
            pg_types[c.type_code][0] :
            // This is the case where user might
            // have use casting so we will use type
            // returned by cast function
            pg_types[pg_types.length - 1][0] ?
            pg_types[pg_types.length - 1][0] : 'unknown';

          if (!is_primary_key)
            col_type += type;
          else
            col_type += '[PK] ' + type;

          if (c.precision && c.precision >= 0 && c.precision != 65535) {
            col_type += ' (' + c.precision;
            col_type += c.scale && c.scale != 65535 ?
              ',' + c.scale + ')' :
              ')';
          }
          // Identify cell type of column.
          switch (type) {
          case 'oid':
            col_cell = 'oid';
            break;
          case 'json':
          case 'json[]':
          case 'jsonb':
          case 'jsonb[]':
            col_cell = 'Json';
            break;
          case 'smallint':
          case 'smallint[]':
          case 'integer':
          case 'integer[]':
          case 'bigint':
          case 'bigint[]':
          case 'decimal':
          case 'decimal[]':
          case 'numeric':
          case 'numeric[]':
          case 'real':
          case 'real[]':
          case 'double precision':
          case 'double precision[]':
            col_cell = 'number';
            break;
          case 'boolean':
            col_cell = 'boolean';
            break;
          case 'character':
          case 'character[]':
          case '"char"':
          case '"char"[]':
          case 'character varying':
          case 'character varying[]':
            if (c.internal_size && c.internal_size >= 0 && c.internal_size != 65535) {
                // Update column type to display length on column header
              col_type += ' (' + c.internal_size + ')';
            }
            col_cell = 'string';
            break;
          case 'bytea':
          case 'bytea[]':
            col_cell = 'binary';
            break;
          case 'geometry':
            // PostGIS geometry type
            col_cell = 'geometry';
            break;
          case 'geography':
            // PostGIS geography type
            col_cell = 'geography';
            break;
          default:
            col_cell = 'string';
          }

          column_label = c.display_name + '<br>' + col_type;

          var array_type_bracket_index = type.lastIndexOf('[]'),
            col = {
              'name': c.name,
              'display_name': c.display_name,
              'column_type': col_type,
              'column_type_internal': type,
              'pos': c.pos,
              'label': column_label,
              'cell': col_cell,
              'can_edit': (c.name == 'oid') ? false : self.can_edit,
              'type': type,
              'not_null': c.not_null,
              'has_default_val': c.has_default_val,
              'is_array': array_type_bracket_index > -1 && array_type_bracket_index + 2 == type.length,
            };
          columns.push(col);
        });

        self.columns = columns;
        if (cb && typeof(cb) == 'function') {
          cb();
        }
      },

      resetQueryHistoryObject: function(history) {
        history.total_time = '-';
      },

      // This function is used to raise appropriate message.
      update_msg_history: function(status, msg, clear_grid) {
        var self = this;
        if (clear_grid === undefined)
          clear_grid = true;

        self.gridView.messages_panel.focus();

        if (clear_grid) {
          // Delete grid
          if (self.gridView.handler.slickgrid) {
            self.gridView.handler.slickgrid.destroy();

          }
          // Misc cleaning
          self.columns = undefined;
          self.collection = undefined;

          $('.sql-editor-message').text(msg);
        } else {
          $('.sql-editor-message').append(_.escape(msg));
        }

        // Scroll automatically when msgs appends to element
        setTimeout(function() {
          $('.sql-editor-message').scrollTop($('.sql-editor-message')[0].scrollHeight);

        }, 10);

        if (status != 'Busy') {
          $('#btn-flash').prop('disabled', false);
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          self.gridView.history_collection.add({
            'status': status,
            'start_time': self.query_start_time,
            'query': self.query,
            'row_affected': self.rows_affected,
            'total_time': self.total_time,
            'message': msg,
          });
        }
      },

      /* This function is used to check whether cell
       * is editable or not depending on primary keys
       * and staged_rows flag
       */
      is_editable: function(obj) {
        var self = this;
        if (obj instanceof Backbone.Collection)
          return false;
        return (self.get('can_edit'));
      },

      rows_to_delete: function(data) {
        var self = this,
          tmp_keys = self.primary_keys;

        // re-calculate rows with no primary keys
        self.temp_new_rows = [];
        data.forEach(function(d, idx) {
          var p_keys_list = _.pick(d, tmp_keys),
            is_primary_key = Object.keys(p_keys_list).length ?
            p_keys_list[0] : undefined;

          if (!is_primary_key) {
            self.temp_new_rows.push(idx);
          }
        });
        self.rows_to_disable = _.clone(self.temp_new_rows);
      },

      // This function will delete selected row.
      _delete: function() {
        var self = this,
          deleted_keys = [],
          is_added = _.size(self.data_store.added),
          is_updated = _.size(self.data_store.updated);

        // Remove newly added rows from staged rows as we don't want to send them on server
        if (is_added) {
          _.each(self.data_store.added, function(val, key) {
            if (key in self.data_store.staged_rows) {
              // Remove the row from data store so that we do not send it on server
              deleted_keys.push(key);
              delete self.data_store.staged_rows[key];
              delete self.data_store.added[key];
              delete self.data_store.added_index[key];
            }
          });
        }
        // If only newly rows to delete and no data is there to send on server
        // then just re-render the grid
        if (_.size(self.data_store.staged_rows) == 0) {
          var grid = self.slickgrid,
            dataView = grid.getData();

          grid.resetActiveCell();

          dataView.beginUpdate();
          for (var i = 0; i < deleted_keys.length; i++) {
            dataView.deleteItem(deleted_keys[i]);
          }
          dataView.endUpdate();
          self.rows_to_delete.apply(self, [dataView.getItems()]);
          grid.resetActiveCell();
          grid.setSelectedRows([]);
          grid.invalidate();

          // Nothing to copy or delete here
          $('#btn-delete-row').prop('disabled', true);
          $('#btn-copy-row').prop('disabled', true);
          if (_.size(self.data_store.added) || is_updated) {
            // Do not disable save button if there are
            // any other changes present in grid data
            $('#btn-save').prop('disabled', false);
          } else {
            $('#btn-save').prop('disabled', true);
          }
          alertify.success(gettext('Row(s) deleted.'));
        } else {
          // There are other data to needs to be updated on server
          if (is_updated) {
            alertify.alert(gettext('Operation failed'),
              gettext('There are unsaved changes in the grid. Please save them first to avoid data inconsistencies.')
            );
            return;
          }
          alertify.confirm(gettext('Delete Row(s)'),
            gettext('Are you sure you wish to delete selected row(s)?'),
            function() {
              $('#btn-delete-row').prop('disabled', true);
              $('#btn-copy-row').prop('disabled', true);
              // Change the state
              self.data_store.deleted = self.data_store.staged_rows;
              self.data_store.staged_rows = {};
              // Save the changes on server
              self._save();
            },
            function() {
              // Do nothing as user canceled the operation.
            }
          ).set('labels', {
            ok: gettext('Yes'),
            cancel: gettext('No'),
          });
        }
      },

      /* This function will fetch the list of changed models and make
       * the ajax call to save the data into the database server.
       * and will open save file dialog conditionally.
       */
      _save: function(view, controller, save_as) {
        var self = this,
          save_data = true;

        // Open save file dialog if query tool
        if (self.is_query_tool) {
          var current_file = self.gridView.current_file;
          if (!_.isUndefined(current_file) && !save_as) {
            self._save_file_handler(current_file);
          } else {
            // provide custom option to save file dialog
            var params = {
              'supported_types': ['*', 'sql'],
              'dialog_type': 'create_file',
              'dialog_title': 'Save File',
              'btn_primary': 'Save',
            };
            pgAdmin.FileManager.init();
            pgAdmin.FileManager.show_dialog(params);
          }
          return;
        }
        $('#btn-save').prop('disabled', true);
        $('#btn-file-menu-dropdown').prop('disabled', true);

        var is_added = _.size(self.data_store.added),
          is_updated = _.size(self.data_store.updated),
          is_deleted = _.size(self.data_store.deleted);

        if (!is_added && !is_updated && !is_deleted) {
          return; // Nothing to save here
        }

        if (save_data) {

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext('Saving the updated data...')
          );

          // Add the columns to the data so the server can remap the data
          var req_data = self.data_store;
          req_data.columns = view ? view.handler.columns : self.columns;

          // Make ajax call to save the data
          $.ajax({
            url: url_for('sqleditor.save', {
              'trans_id': self.transId,
            }),
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(req_data),
          })
          .done(function(res) {
            var grid = self.slickgrid,
              dataView = grid.getData(),
              data_length = dataView.getLength(),
              data = [];

            if (res.data.status) {
              if(is_added) {
                // Update the rows in a grid after addition
                dataView.beginUpdate();
                _.each(res.data.query_result, function(r) {
                  if (!_.isNull(r.row_added)) {
                    // Fetch temp_id returned by server after addition
                    var row_id = Object.keys(r.row_added)[0];
                    _.each(req_data.added_index, function(v, k) {
                      if (v == row_id) {
                        // Fetch item data through row index
                        var item = grid.getDataItem(k);
                        _.extend(item, r.row_added[row_id]);
                      }
                    });
                  }
                });
                dataView.endUpdate();
              }
              // Remove flag is_row_copied from copied rows
              _.each(data, function(row) {
                if (row.is_row_copied) {
                  delete row.is_row_copied;
                }
              });

              // Remove 2d copied_rows array
              if (grid.copied_rows) {
                delete grid.copied_rows;
              }

              // Remove deleted rows from client as well
              if (is_deleted) {
                var rows = grid.getSelectedRows();
                if (data_length == rows.length) {
                  // This means all the rows are selected, clear all data
                  data = [];
                  dataView.setItems(data, self.client_primary_key);
                } else {
                  dataView.beginUpdate();
                  for (var i = 0; i < rows.length; i++) {
                    var item = grid.getDataItem(rows[i]);
                    data.push(item);
                    dataView.deleteItem(item[self.client_primary_key]);
                  }
                  dataView.endUpdate();
                }
                self.rows_to_delete.apply(self, [data]);
                grid.setSelectedRows([]);
              }

              grid.setSelectedRows([]);

              // Reset data store
              self.data_store = {
                'added': {},
                'updated': {},
                'deleted': {},
                'added_index': {},
                'updated_index': {},
              };

              // Reset old primary key data now
              self.primary_keys_data = {};

              // Clear msgs after successful save
              $('.sql-editor-message').html('');

              alertify.success(gettext('Data saved successfully.'));
            } else {
              // Something went wrong while saving data on the db server
              $('#btn-flash').prop('disabled', false);
              $('.sql-editor-message').text(res.data.result);
              var err_msg = S(gettext('%s.')).sprintf(res.data.result).value();
              alertify.error(err_msg, 20);
              grid.setSelectedRows([]);
              // To highlight the row at fault
              if (_.has(res.data, '_rowid') &&
                (!_.isUndefined(res.data._rowid) || !_.isNull(res.data._rowid))) {
                var _row_index = self._find_rowindex(res.data._rowid);
                if (_row_index in self.data_store.added_index) {
                  // Remove new row index from temp_list if save operation
                  // fails
                  var index = self.handler.temp_new_rows.indexOf(res.data._rowid);
                  if (index > -1) {
                    self.handler.temp_new_rows.splice(index, 1);
                  }
                  self.data_store.added[self.data_store.added_index[_row_index]].err = true;
                } else if (_row_index in self.data_store.updated_index) {
                  self.data_store.updated[self.data_store.updated_index[_row_index]].err = true;
                }
              }
              grid.gotoCell(_row_index, 1);
            }

            // Update the sql results in history tab
            _.each(res.data.query_result, function(r) {
              self.gridView.history_collection.add({
                'status': r.status,
                'start_time': self.query_start_time,
                'query': r.sql,
                'row_affected': r.rows_affected,
                'total_time': self.total_time,
                'message': r.result,
              });
            });
            self.trigger('pgadmin-sqleditor:loading-icon:hide');

            grid.invalidate();
            if (self.close_on_save) {
              self.close();
            }
          })
          .fail(function(e) {
            let stateParams = [view, controller, save_as];
            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, e, '_save', stateParams, true
            );
            self.update_msg_history(false, msg);
          });
        }
      },

      // Find index of row at fault from grid data
      _find_rowindex: function(rowid) {
        var self = this,
          grid = self.slickgrid,
          dataView = grid.getData(),
          data = dataView.getItems(),
          _rowid,
          count = 0,
          _idx = -1;

        // If _rowid is object then it's update/delete operation
        if (_.isObject(rowid)) {
          _rowid = rowid;
        } else if (_.isString(rowid)) { // Insert operation
          rowid = {};
          rowid[self.client_primary_key] = rowid;
          _rowid = rowid;
        } else {
          // Something is wrong with unique id
          return _idx;
        }

        _.find(data, function(d) {
          // search for unique id in row data if found than its the row
          // which error out on server side
          var tmp = []; //_.findWhere needs array of object to work
          tmp.push(d);
          if (_.findWhere(tmp, _rowid)) {
            _idx = count;
            // Now exit the loop by returning true
            return true;
          }
          count++;
        });

        // Not able to find in grid Data
        return _idx;
      },

      // Save as
      _save_as: function() {
        return this._save(true);
      },

      // Set panel title.
      setTitle: function(title, unsafe) {
        var self = this;

        if (self.preferences.new_browser_tab) {
          window.document.title = title;
        } else {
          _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
            if (p.isVisible()) {
              if(unsafe) {
                title = _.escape(title);
              }
              p.title(title);
            }
          });
        }
      },

      // load select file dialog
      _load_file: function() {
        var self = this;

        /* If is_query_changed flag is set to false then no need to
         * confirm with the user for unsaved changes.
         */
        if (self.is_query_changed) {
          alertify.confirm(gettext('Unsaved changes'),
            gettext('Are you sure you wish to discard the current changes?'),
            function() {
              // User do not want to save, just continue
              self._open_select_file_manager();
            },
            function() {
              return true;
            }
          ).set('labels', {
            ok: 'Yes',
            cancel: 'No',
          });
        } else {
          self._open_select_file_manager();
        }

      },

      // Open FileManager
      _open_select_file_manager: function() {
        var params = {
          'supported_types': ['sql'], // file types allowed
          'dialog_type': 'select_file', // open select file dialog
        };
        pgAdmin.FileManager.init();
        pgAdmin.FileManager.show_dialog(params);
      },

      // read file data and return as response
      _select_file_handler: function(e) {
        var self = this,
          _e = e,
          data = {
            'file_name': decodeURI(e),
          };

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Loading the file...')
        );
        // set cursor to progress before file load
        var $busy_icon_div = $('.sql-editor-busy-fetching');
        $busy_icon_div.addClass('show_progress');

        // Make ajax call to load the data from file
        $.ajax({
          url: url_for('sqleditor.load_file'),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
        .done(function(res) {
          self.gridView.query_tool_obj.setValue(res);
          self.gridView.current_file = e;
          self.setTitle(self.gridView.current_file.split('\\').pop().split('/').pop(), true);
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          // hide cursor
          $busy_icon_div.removeClass('show_progress');

          // disable save button on file save
          $('#btn-save').prop('disabled', true);
          $('#btn-file-menu-save').css('display', 'none');

          // Update the flag as new content is just loaded.
          self.is_query_changed = false;
          setTimeout(() => { self.gridView.query_tool_obj.focus(); }, 200);
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let stateParams = [_e];
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_select_file_handler', stateParams, false
          );
          alertify.error(msg);
          // hide cursor
          $busy_icon_div.removeClass('show_progress');
        });
      },

      // read data from codemirror and write to file
      _save_file_handler: function(e) {
        var self = this,
          _e = e,
          data = {
            'file_name': decodeURI(e),
            'file_content': self.gridView.query_tool_obj.getValue(),
          };
        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Saving the queries in the file...')
        );

        // Make ajax call to save the data to file
        $.ajax({
          url: url_for('sqleditor.save_file'),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
        .done(function(res) {
          if (res.data.status) {
            alertify.success(gettext('File saved successfully.'));
            self.gridView.current_file = e;
            self.setTitle(self.gridView.current_file.replace(/^.*[\\\/]/g, ''), true);
            // disable save button on file save
            $('#btn-save').prop('disabled', true);
            $('#btn-file-menu-save').css('display', 'none');

            // Update the flag as query is already saved.
            self.is_query_changed = false;
            setTimeout(() => { self.gridView.query_tool_obj.focus(); }, 200);
          }
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          if (self.close_on_save) {
            self.close();
          }
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let stateParams = [_e];
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_save_file_handler', stateParams, false
          );
          alertify.error(msg);
        });
      },

      // codemirror text change event
      _on_query_change: function() {
        var self = this;

        if (!self.is_query_changed) {
          // Update the flag as query is going to changed.
          self.is_query_changed = true;

          if (self.gridView.current_file) {
            var title = self.gridView.current_file.replace(/^.*[\\\/]/g, '') + ' *';
            self.setTitle(title, true);
          } else {
            if (self.preferences.new_browser_tab) {
              title = window.document.title + ' *';
            } else {
              // Find the title of the visible panel
              _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
                if (p.isVisible()) {
                  self.gridView.panel_title = $(p._title).text();
                }
              });

              title = self.gridView.panel_title + ' *';
            }
            self.setTitle(title);
          }

          $('#btn-save').prop('disabled', false);
          $('#btn-file-menu-save').css('display', 'block');
          $('#btn-file-menu-dropdown').prop('disabled', false);
        }
      },

      // This function will set the required flag for polling response data
      _init_polling_flags: function() {
        var self = this;

        // To get a timeout for polling fallback timer in seconds in
        // regards to elapsed time
        self.POLL_FALLBACK_TIME = function() {
          var seconds = parseInt((Date.now() - self.query_start_time.getTime()) / 1000);
          // calculate & return fall back polling timeout
          if (seconds >= 10 && seconds < 30) {
            return 500;
          } else if (seconds >= 30 && seconds < 60) {
            return 1000;
          } else if (seconds >= 60 && seconds < 90) {
            return 2000;
          } else if (seconds >= 90) {
            return 5000;
          } else
            return 1;
        };
      },

      // This function will show the filter in the text area.
      _show_filter: function() {
        let self = this,
          reconnect = false;

        /* When server is disconnected and connected, connection is lost,
         * To reconnect pass true
         */
        if (arguments.length > 0 &&
          arguments[arguments.length - 1] == 'connect') {
          reconnect = true;
        }
        FilterHandler.dialog(self, reconnect);
      },

      // This function will include the filter by selection.
      _include_filter: function() {
        var self = this,
          data = {},
          grid, active_column, column_info, _values;

        grid = self.slickgrid;
        active_column = grid.getActiveCell();

        // If no cell is selected then return from the function
        if (_.isNull(active_column) || _.isUndefined(active_column))
          return;

        column_info = grid.getColumns()[active_column.cell];

        // Fetch current row data from grid
        _values = grid.getDataItem(active_column.row, active_column.cell);
        if (_.isNull(_values) || _.isUndefined(_values))
          return;

        // Add column position and it's value to data
        data[column_info.field] = _values[column_info.field] || '';

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Applying the new filter...')
        );

        // Make ajax call to include the filter by selection
        $.ajax({
          url: url_for('sqleditor.inclusive_filter', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
        .done(function(res) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          setTimeout(
            function() {
              if (res.data.status) {
                // Refresh the sql grid
                queryToolActions.executeQuery(self);
              } else {
                alertify.alert(gettext('Filter By Selection Error'), res.data.result);
              }
            }
          );
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_include_filter', [], true
          );
          alertify.alert(gettext('Filter By Selection Error'), msg);
        });
      },

      // This function will exclude the filter by selection.
      _exclude_filter: function() {
        var self = this,
          data = {},
          grid, active_column, column_info, _values;

        grid = self.slickgrid;
        active_column = grid.getActiveCell();

        // If no cell is selected then return from the function
        if (_.isNull(active_column) || _.isUndefined(active_column))
          return;

        column_info = grid.getColumns()[active_column.cell];

        // Fetch current row data from grid
        _values = grid.getDataItem(active_column.row, active_column.cell);
        if (_.isNull(_values) || _.isUndefined(_values))
          return;

        // Add column position and it's value to data
        data[column_info.field] = _values[column_info.field] || '';

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Applying the new filter...')
        );

        // Make ajax call to exclude the filter by selection.
        $.ajax({
          url: url_for('sqleditor.exclusive_filter', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
        .done(function(res) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          setTimeout(
            function() {
              if (res.data.status) {
                // Refresh the sql grid
                queryToolActions.executeQuery(self);
              } else {
                alertify.alert(gettext('Filter Exclude Selection Error'), res.data.result);
              }
            }, 10
          );
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_exclude_filter', [], true
          );
          alertify.alert(gettext('Filter Exclude Selection Error'), msg);
        });
      },

      // This function will remove the filter.
      _remove_filter: function() {
        var self = this;

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Removing the filter...')
        );

        // Make ajax call to exclude the filter by selection.
        $.ajax({
          url: url_for('sqleditor.remove_filter', {
            'trans_id': self.transId,
          }),
          method: 'POST',
        })
        .done(function(res) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          setTimeout(
            function() {
              if (res.data.status) {
                // Refresh the sql grid
                queryToolActions.executeQuery(self);
              } else {
                alertify.alert(gettext('Remove Filter Error'), res.data.result);
              }
            }
          );
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_remove_filter', [], true
          );
          alertify.alert(gettext('Remove Filter Error'), msg);
        });
      },

      // This function will apply the filter.
      _apply_filter: function() {
        var self = this,
          sql = self.gridView.filter_obj.getValue();

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Applying the filter...')
        );

        // Make ajax call to include the filter by selection
        $.ajax({
          url: url_for('sqleditor.apply_filter', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(sql),
        })
        .done(function(res) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          setTimeout(
            function() {
              if (res.data.status) {
                $('#filter').addClass('hidden');
                $('#editor-panel').removeClass('sql-editor-busy-fetching');
                // Refresh the sql grid
                queryToolActions.executeQuery(self);
              } else {
                alertify.alert(gettext('Apply Filter Error'), res.data.result);
              }
            }, 10
          );
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_apply_filter', [], true
          );
          alertify.alert(gettext('Apply Filter Error'), msg);
        });
      },

      // This function will copy the selected row.
      _copy_row: copyData,

      // This function will paste the selected row.
      _paste_row: function() {
        var self = this,
          grid = self.slickgrid,
          dataView = grid.getData(),
          data = dataView.getItems(),
          count = dataView.getLength(),
          rows = grid.getSelectedRows().sort(
            function(a, b) {
              return a - b;
            }
          ),
          copied_rows = rows.map(function(rowIndex) {
            return data[rowIndex];
          }),
          array_types = [];

        // for quick look up create list of array data types
        for (var k in self.columns) {
          if (self.columns[k].is_array) {
            array_types.push(self.columns[k].name);
          }
        }

        rows = rows.length == 0 ? self.last_copied_rows : rows;

        self.last_copied_rows = rows;

        // If there are rows to paste?
        if (copied_rows.length > 0) {
          // Enable save button so that user can
          // save newly pasted rows on server
          $('#btn-save').prop('disabled', false);

          var arr_to_object = function(arr) {
            var obj = {};

            _.each(arr, function(val, i) {
              if (arr[i] !== undefined) {
                // Do not stringify array types.
                if (_.isObject(arr[i]) && array_types.indexOf(i) == -1) {
                  obj[String(i)] = JSON.stringify(arr[i]);
                } else {
                  obj[String(i)] = arr[i];
                }
              }
            });
            return obj;
          };

          // Generate Unique key for each pasted row(s)
          // Convert array values to object to send to server
          // Add flag is_row_copied to handle [default] and [null]
          // for copied rows.
          // Add index of copied row into temp_new_rows
          // Trigger grid.onAddNewRow when a row is copied
          // Reset selection

          dataView.beginUpdate();
          _.each(copied_rows, function(row) {
            var new_row = arr_to_object(row),
              _key = (self.gridView.client_primary_key_counter++).toString();
            new_row.is_row_copied = true;
            self.temp_new_rows.push(count);
            new_row[self.client_primary_key] = _key;
            dataView.addItem(new_row);
            self.data_store.added[_key] = {
              'err': false,
              'data': new_row,
            };
            self.data_store.added_index[count] = _key;
            count++;
          });
          dataView.endUpdate();
          grid.updateRowCount();
          // Pasted row/s always append so bring last row in view port.
          grid.scrollRowIntoView(dataView.getLength());
          grid.setSelectedRows([]);
        }
      },

      // This function will set the limit for SQL query
      _set_limit: function() {
        var self = this,
          limit = parseInt($('.limit').val());

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Setting the limit on the result...')
        );
        // Make ajax call to change the limit
        $.ajax({
          url: url_for('sqleditor.set_limit', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(limit),
        })
        .done(function(res) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          setTimeout(
            function() {
              if (res.data.status) {
                // Refresh the sql grid
                queryToolActions.executeQuery(self);
              } else
                alertify.alert(gettext('Change limit Error'), res.data.result);
            }, 10
          );
        })
        .fail(function(e) {
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_set_limit', [], true
          );
          alertify.alert(gettext('Change limit Error'), msg);
        });
      },

      // This function is used to enable/disable buttons
      disable_tool_buttons: function(disabled) {
        $('#btn-clear').prop('disabled', disabled);
        $('#btn-query-dropdown').prop('disabled', disabled);
        $('#btn-edit-dropdown').prop('disabled', disabled);
        $('#btn-edit').prop('disabled', disabled);
        $('#btn-load-file').prop('disabled', disabled);
        if (this.is_query_tool) {
          // Cancel query tool needs opposite behaviour
          $('#btn-cancel-query').prop('disabled', !disabled);
        }
      },

      // This function will fetch the sql query from the text box
      // and execute the query.
      execute: function(explain_prefix, shouldReconnect=false) {
        var self = this,
          sql = '';

        self.has_more_rows = false;
        self.fetching_rows = false;

        /* If code is selected in the code mirror then execute
         * the selected part else execute the complete code.
         */
        var selected_code = self.gridView.query_tool_obj.getSelection();
        if (selected_code.length > 0)
          sql = selected_code;
        else
          sql = self.gridView.query_tool_obj.getValue();

        const executeQuery = new ExecuteQuery.ExecuteQuery(this, pgAdmin.Browser.UserManagement);
        executeQuery.execute(sql, explain_prefix, shouldReconnect);
      },

      /* This function is used to highlight the error line and
       * underlining for the error word.
       */
      _highlight_error: function(result) {
        var self = this,
          error_line_no = 0,
          start_marker = 0,
          end_marker = 0,
          selected_line_no = 0;

        // Remove already existing marker
        self.gridView.query_tool_obj.removeLineClass(self.marked_line_no, 'wrap', 'CodeMirror-activeline-background');

        // In case of selection we need to find the actual line no
        if (self.gridView.query_tool_obj.getSelection().length > 0)
          selected_line_no = self.gridView.query_tool_obj.getCursor(true).line;

        // Fetch the LINE string using regex from the result
        var line = /LINE (\d+)/.exec(result),
          // Fetch the Character string using regex from the result
          char = /Character: (\d+)/.exec(result);

        // If line and character is null then no need to mark
        if (line != null && char != null) {
          error_line_no = self.marked_line_no = (parseInt(line[1]) - 1) + selected_line_no;
          var error_char_no = (parseInt(char[1]) - 1);

          /* We need to loop through each line till the error line and
           * count the total no of character to figure out the actual
           * starting/ending marker point for the individual line. We
           * have also added 1 per line for the "\n" character.
           */
          var prev_line_chars = 0;
          var loop_index = selected_line_no > 0 ? selected_line_no : 0;
          for (var i = loop_index; i < error_line_no; i++)
            prev_line_chars += self.gridView.query_tool_obj.getLine(i).length + 1;

          /* Marker starting point for the individual line is
           * equal to error character index minus total no of
           * character till the error line starts.
           */
          start_marker = error_char_no - prev_line_chars;

          // Find the next space from the character or end of line
          var error_line = self.gridView.query_tool_obj.getLine(error_line_no);
          end_marker = error_line.indexOf(' ', start_marker);
          if (end_marker < 0)
            end_marker = error_line.length;

          // Mark the error text
          self.gridView.marker = self.gridView.query_tool_obj.markText({
            line: error_line_no,
            ch: start_marker,
          }, {
            line: error_line_no,
            ch: end_marker,
          }, {
            className: 'sql-editor-mark',
          });

          self.gridView.query_tool_obj.addLineClass(self.marked_line_no, 'wrap', 'CodeMirror-activeline-background');
        }
      },

      // This function will cancel the running query.
      _cancel_query: function() {
        var self = this;
        $.ajax({
          url: url_for('sqleditor.cancel_transaction', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
        })
        .done(function(res) {
          if (!res.data.status) {
            alertify.alert(gettext('Cancel Query Error'), res.data.result);
          }
          self.disable_tool_buttons(false);
          is_query_running = false;
          setTimeout(() => { self.gridView.query_tool_obj.focus(); }, 200);
        })
        .fail(function(e) {
          self.disable_tool_buttons(false);

          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_cancel_query', [], false
          );
          alertify.alert(gettext('Cancel Query Error'), msg);
        });
      },

      // Trigger query result download to csv.
      trigger_csv_download: function(query, filename) {
        var self = this,
          link = $(this.container).find('#download-csv'),
          url = url_for('sqleditor.query_tool_download', {
            'trans_id': self.transId,
          });

        url += '?' + $.param({
          query: query,
          filename: filename,
        });
        link.attr('src', url);
      },

      call_cache_preferences: function() {
        let browser = window.opener ?
              window.opener.pgAdmin.Browser : window.top.pgAdmin.Browser;
        browser.cache_preferences('sqleditor');

        /* This will make sure to get latest updates only and not older events */
        pgBrowser.preference_version(pgBrowser.generate_preference_version());
      },

      _auto_rollback: function() {
        var self = this,
          auto_rollback = true;

        if ($('.auto-rollback').hasClass('visibility-hidden') === true)
          $('.auto-rollback').removeClass('visibility-hidden');
        else {
          $('.auto-rollback').addClass('visibility-hidden');
          auto_rollback = false;
        }

        // Make ajax call to change the limit
        $.ajax({
          url: url_for('sqleditor.auto_rollback', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(auto_rollback),
        })
        .done(function(res) {
          if (!res.data.status)
            alertify.alert(gettext('Auto Rollback Error'), res.data.result);
          else
            self.call_cache_preferences();
        })
        .fail(function(e) {

          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_auto_rollback', [], true
          );
          alertify.alert(gettext('Auto Rollback Error'), msg);
        });
      },

      _auto_commit: function() {
        var self = this,
          auto_commit = true;

        if ($('.auto-commit').hasClass('visibility-hidden') === true)
          $('.auto-commit').removeClass('visibility-hidden');
        else {
          $('.auto-commit').addClass('visibility-hidden');
          auto_commit = false;
        }

        // Make ajax call to toggle auto commit
        $.ajax({
          url: url_for('sqleditor.auto_commit', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(auto_commit),
        })
        .done(function(res) {
          if (!res.data.status)
            alertify.alert(gettext('Auto Commit Error'), res.data.result);
          else
            self.call_cache_preferences();
        })
        .fail(function(e) {
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, '_auto_commit', [], true
          );
          alertify.alert(gettext('Auto Commit Error'), msg);
        });

      },

      explainPreferenceUpdate:  function(subItem, data, caller) {
        let self = this;
        $.ajax({
          url: url_for('sqleditor.query_tool_preferences', {
            'trans_id': self.transId,
          }),
          method: 'PUT',
          contentType: 'application/json',
          data: JSON.stringify(data),
        })
        .done(function(res) {
          if (res.success == undefined || !res.success) {
            alertify.alert(gettext('Explain options error'),
              gettext('Error occurred while setting %(subItem)s option in explain.',
                      {subItem : subItem})
            );
          }
          else
            self.call_cache_preferences();
        })
        .fail(function(e) {
          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, caller, [], true
          );
          alertify.alert(gettext('Explain options error'), msg);
        });
      },

      // This function will toggle "verbose" option in explain
      _explain_verbose: function() {
        var self = this;
        let explain_verbose = false;
        if ($('.explain-verbose').hasClass('visibility-hidden') === true) {
          $('.explain-verbose').removeClass('visibility-hidden');
          explain_verbose = true;
        } else {
          $('.explain-verbose').addClass('visibility-hidden');
          explain_verbose = false;
        }

        self.explainPreferenceUpdate(
          'verbose', {
            'explain_verbose': explain_verbose,
          }, '_explain_verbose'
        );
      },

      // This function will toggle "costs" option in explain
      _explain_costs: function() {
        var self = this;
        let explain_costs = false;
        if ($('.explain-costs').hasClass('visibility-hidden') === true) {
          $('.explain-costs').removeClass('visibility-hidden');
          explain_costs = true;
        } else {
          $('.explain-costs').addClass('visibility-hidden');
          explain_costs = false;
        }

        self.explainPreferenceUpdate(
          'costs', {
            'explain_costs': explain_costs,
          }, '_explain_costs'
        );
      },

      // This function will toggle "buffers" option in explain
      _explain_buffers: function() {
        var self = this;
        let explain_buffers = false;
        if ($('.explain-buffers').hasClass('visibility-hidden') === true) {
          $('.explain-buffers').removeClass('visibility-hidden');
          explain_buffers = true;
        } else {
          $('.explain-buffers').addClass('visibility-hidden');
          explain_buffers = false;
        }

        self.explainPreferenceUpdate(
          'buffers', {
            'explain_buffers': explain_buffers,
          }, '_explain_buffers'
        );
      },

      // This function will toggle "timing" option in explain
      _explain_timing: function() {
        var self = this;
        let explain_timing = false;
        if ($('.explain-timing').hasClass('visibility-hidden') === true) {
          $('.explain-timing').removeClass('visibility-hidden');
          explain_timing = true;
        } else {
          $('.explain-timing').addClass('visibility-hidden');
          explain_timing = false;
        }

        self.explainPreferenceUpdate(
          'timing', {
            'explain_timing': explain_timing,
          }, '_explain_timing'
        );
      },

      /*
       * This function will indent selected code
       */
      _indent_selected_code: function() {
        var self = this,
          editor = self.gridView.query_tool_obj;
        editor.execCommand('indentMore');
      },

      /*
       * This function will unindent selected code
       */
      _unindent_selected_code: function() {
        var self = this,
          editor = self.gridView.query_tool_obj;
        editor.execCommand('indentLess');
      },

      isQueryRunning: function() {
        return is_query_running;
      },

      setIsQueryRunning: function(value) {
        is_query_running = value;
      },

      close: function() {
        var self = this;

        pgBrowser.Events.off('pgadmin:user:logged-in', this.initTransaction);
        _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(panel) {
          if (panel.isVisible()) {
            window.onbeforeunload = null;
            panel.off(wcDocker.EVENT.CLOSING);
            // remove col_size object on panel close
            if (!_.isUndefined(self.col_size)) {
              delete self.col_size;
            }
            window.top.pgAdmin.Browser.docker.removePanel(panel);
          }
        });
      },
      /* This function is used to raise notify messages and update
       * the notification grid.
       */
      update_notifications: function (notifications) {
        queryToolNotifications.updateNotifications(notifications);
      },
    });

  pgAdmin.SqlEditor = {
    // This function is used to create and return the object of grid controller.
    create: function(container) {
      return new SqlEditorController(container);
    },
    jquery: $,
    S: S,
  };

  return pgAdmin.SqlEditor;
});
