/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {launchDataGrid} from 'tools/datagrid/static/js/show_query_tool';

define('tools.querytool', [
  'sources/gettext', 'sources/url_for', 'jquery', 'jquery.ui',
  'jqueryui.position', 'underscore', 'pgadmin.alertifyjs',
  'sources/pgadmin', 'backbone', 'bundled_codemirror', 'sources/utils',
  'pgadmin.misc.explain',
  'pgadmin.user_management.current_user',
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
  'sources/sqleditor/new_connection_dialog',
  'sources/sqleditor/geometry_viewer',
  'sources/sqleditor/history/history_collection.js',
  'sources/sqleditor/history/query_history',
  'sources/sqleditor/history/query_sources',
  'sources/keyboard_shortcuts',
  'sources/sqleditor/query_tool_actions',
  'sources/sqleditor/query_tool_notifications',
  'pgadmin.datagrid',
  'sources/modify_animation',
  'sources/sqleditor/calculate_query_run_time',
  'sources/sqleditor/call_render_after_poll',
  'sources/sqleditor/query_tool_preferences',
  'sources/sqleditor/query_txn_status_constants',
  'sources/csrf',
  'tools/datagrid/static/js/datagrid_panel_title',
  'sources/window',
  'sources/is_native',
  'sources/sqleditor/macro',
  'sources/../bundle/slickgrid',
  'pgadmin.file_manager',
  'slick.pgadmin.formatters',
  'slick.pgadmin.editors',
  'slick.pgadmin.plugins/slick.autocolumnsize',
  'pgadmin.browser',
  'pgadmin.tools.user_management',
], function(
  gettext, url_for, $, jqueryui, jqueryui_position, _, alertify, pgAdmin, Backbone, codemirror, pgadminUtils,
  pgExplain, current_user, GridSelector, ActiveCellCapture, clipboard, copyData, RangeSelectionHelper, handleQueryOutputKeyboardEvent,
  XCellSelectionModel, setStagedRows, SqlEditorUtils, ExecuteQuery, httpErrorHandler, FilterHandler, newConnectionHandler,
  GeometryViewer, historyColl, queryHist, querySources,
  keyboardShortcuts, queryToolActions, queryToolNotifications, Datagrid,
  modifyAnimation, calculateQueryRunTime, callRenderAfterPoll, queryToolPref, queryTxnStatus, csrfToken, panelTitleFunc,
  pgWindow, isNative, MacroHandler) {
  /* Return back, this has been called more than once */
  if (pgAdmin.SqlEditor)
    return pgAdmin.SqlEditor;

  // Some scripts do export their object in the window only.
  // Generally the one, which do no have AMD support.
  var wcDocker = window.wcDocker,
    pgBrowser = pgAdmin.Browser,
    CodeMirror = codemirror.default,
    Slick = window.Slick,
    HistoryCollection = historyColl.default,
    QueryHistory = queryHist.default,
    QuerySources = querySources.QuerySources;

  csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);

  var is_query_running = false;

  const EMPTY_DATA_OUTPUT_CONTENT = '<div role="status" class="pg-panel-message">' +
    gettext('No data output. Execute a query to get output.') +
  '</div>';

  const EMPTY_EXPLAIN_CONTENT = '<div role="status" class="pg-panel-message">' +
    gettext('Use Explain/Explain analyze button to generate the plan for a query. Alternatively, you can also execute "EXPLAIN (FORMAT JSON) [QUERY]".') +
  '</div>';

  // Defining Backbone view for the sql grid.
  var SQLEditorView = Backbone.View.extend({
    initialize: function(opts) {
      this.$el = opts.el;
      this.handler = opts.handler;
      this.handler['col_size'] = {};
      let browser = pgWindow.default.pgAdmin.Browser;
      this.preferences = browser.get_preferences_for_module('sqleditor');
      this.browser_preferences = browser.get_preferences_for_module('browser');
      this.handler.preferences = this.preferences;
      this.handler.browser_preferences = this.browser_preferences;
      this.connIntervalId = null;
      this.layout = opts.layout;
      this.set_server_version(opts.server_ver);
      this.trigger('pgadmin-sqleditor:view:initialised');
      this.connection_list = [
        {'server_group': null,'server': null, 'database': null, 'user': null, 'role': null, 'title': '&lt;' + gettext('New Connection') + '&gt;'},
      ];
    },

    // Bind all the events
    events: {
      'click #btn-show-query-tool': 'on_show_query_tool',
      'click .btn-load-file': 'on_file_load',
      'click #btn-save-file': 'on_save_file',
      'click #btn-file-menu-save': 'on_save_file',
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
      'click #btn-save-data': 'on_save_data',
      'click #btn-filter': 'on_show_filter',
      'click #btn-filter-menu': 'on_show_filter',
      'click #btn-include-filter': 'on_include_filter',
      'click #btn-exclude-filter': 'on_exclude_filter',
      'click #btn-remove-filter': 'on_remove_filter',
      'click #btn-cancel': 'on_cancel',
      'click #btn-copy-row': 'on_copy_row',
      'click #btn-copy-with-header': 'on_copy_row_with_header',
      'click #btn-paste-row': 'on_paste_row',
      'click #btn-flash': 'on_flash',
      'click #btn-flash-menu': 'on_flash',
      'click #btn-cancel-query': 'on_cancel_query',
      'click #btn-download': 'on_download',
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
      'click #btn-explain-summary': 'on_explain_summary',
      'click #btn-explain-settings': 'on_explain_settings',
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
      // Format
      'click #btn-format-sql': 'on_format_sql',
      // Transaction control
      'click #btn-commit': 'on_commit_transaction',
      'click #btn-rollback': 'on_rollback_transaction',
      // Manage Macros
      'click #btn-manage-macros': 'on_manage_macros',
      'click .btn-macro': 'on_execute_macro',
    },

    render_connection: function(data_list) {
      if(this.handler.is_query_tool) {
        var dropdownElement = document.getElementById('connections-list');
        dropdownElement.innerHTML = '';
        data_list.forEach((option, index) => {
          var opt = '';
          if ('is_selected' in option && option['is_selected']) {
            opt = '<li class="connection-list-item selected-connection" data-index='+ index +'><a class="dropdown-item" href="#" tabindex="0">'+ option.title +'</a></li>';
          } else {
            opt = '<li class="connection-list-item" data-index='+ index +'><a class="dropdown-item" href="#" tabindex="0">'+ option.title +'</a></li>';
          }
          $('#connections-list').append(opt);
        });
        var self = this;
        $('.connection-list-item').click(function() {
          self.get_connection_data(this);
        });
      } else {
        $('.conn-info-dd').hide();
        $('.connection-data').css({pointerEvents: 'none', cursor: 'arrow'});
      }
    },

    get_connection_data: function(event){
      var index = $(event).attr('data-index');
      var connection_details = this.connection_list[index];
      if(connection_details.server_group) {
        this.on_change_connection(connection_details);
      } else {
        this.on_new_connection();
      }

    },

    reflectPreferences: function() {
      let self = this,
        browser = pgWindow.default.pgAdmin.Browser,
        browser_preferences = browser.get_preferences_for_module('browser');

      /* pgBrowser is different obj from pgWindow.default.pgAdmin.Browser
       * Make sure to get only the latest update. Older versions will be discarded
       * if function is called by older events.
       * This works for new tab sql editor also as it polls if latest version available
       * This is required because sql editor can update preferences directly
       */
      if(pgBrowser.preference_version() < browser.preference_version()){
        pgBrowser.preference_version(browser.preference_version());
        self.preferences = browser.get_preferences_for_module('sqleditor');
        self.preferences.show_query_tool = browser_preferences.sub_menu_query_tool;
        self.handler.preferences = self.preferences;
        queryToolPref.updateUIPreferences(self);
      }
    },

    buildDefaultLayout: function(docker) {
      let sql_panel_obj = docker.addPanel('sql_panel', wcDocker.DOCK.TOP);

      docker.addPanel('scratch', wcDocker.DOCK.RIGHT, sql_panel_obj);
      docker.addPanel('history', wcDocker.DOCK.STACKED, sql_panel_obj);

      let data_output_panel = docker.addPanel('data_output', wcDocker.DOCK.BOTTOM);
      docker.addPanel('explain', wcDocker.DOCK.STACKED, data_output_panel);
      docker.addPanel('messages', wcDocker.DOCK.STACKED, data_output_panel);
      docker.addPanel('notifications', wcDocker.DOCK.STACKED, data_output_panel);
    },

    set_server_version: function(server_ver) {
      let self = this;
      self.server_ver = server_ver;

      this.$el.find('*[data-min-ver]').map(function() {
        let minVer = 0,
          ele = $(this);
        minVer = parseInt(ele.attr('data-min-ver'));
        if(minVer > self.server_ver) {
          ele.addClass('d-none');
        } else {
          ele.removeClass('d-none');
        }
      });
    },

    set_editor_title: function(title) {
      this.$el.find('.editor-title').text(_.unescape(title));
      this.render_connection(this.connection_list);
    },

    // This function is used to render the template.
    render: function() {
      var self = this;

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
      self.docker = new wcDocker(
        '#editor-panel', {
          allowContextMenu: true,
          allowCollapse: false,
          loadingClass: 'pg-sp-icon',
          themePath: url_for('static', {
            'filename': 'css',
          }),
          theme: 'webcabin.overrides.css',
        }
      );

      // Create the panels
      var sql_panel = new pgAdmin.Browser.Panel({
        name: 'sql_panel',
        title: gettext('Query Editor'),
        width: '75%',
        height: '33%',
        isCloseable: false,
        isPrivate: true,
      });

      var data_output = new pgAdmin.Browser.Panel({
        name: 'data_output',
        title: gettext('Data Output'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        extraClasses: 'hide-vertical-scrollbar',
        content: `<div id ="datagrid" class="sql-editor-grid-container text-12" tabindex="0">${EMPTY_DATA_OUTPUT_CONTENT}</div>`,
      });

      var explain = new pgAdmin.Browser.Panel({
        name: 'explain',
        title: gettext('Explain'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: `<div class="sql-editor-explain pg-el-container" tabindex="0">${EMPTY_EXPLAIN_CONTENT}</div>`,
      });

      var messages = new pgAdmin.Browser.Panel({
        name: 'messages',
        title: gettext('Messages'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div role="status" class="sql-editor-message" tabindex="0"></div>',
      });

      var history = new pgAdmin.Browser.Panel({
        name: 'history',
        title: gettext('Query History'),
        width: '100%',
        height: '33%',
        isCloseable: false,
        isPrivate: true,
        content: '<div id ="history_grid" class="sql-editor-history-container" tabindex="0"></div>',
      });

      var scratch = new pgAdmin.Browser.Panel({
        name: 'scratch',
        title: gettext('Scratch Pad'),
        width: '25%',
        height: '33%',
        isCloseable: true,
        isPrivate: false,
        content: '<div class="sql-scratch"><textarea wrap="off" tabindex="0"></textarea></div>',
      });

      var notifications = new pgAdmin.Browser.Panel({
        name: 'notifications',
        title: gettext('Notifications'),
        width: '100%',
        height: '100%',
        isCloseable: false,
        isPrivate: true,
        content: '<div id ="notification_grid" class="sql-editor-notifications" tabindex="0"></div>',
      });

      var geometry_viewer = new pgAdmin.Browser.Panel({
        name: 'geometry_viewer',
        title: gettext('Geometry Viewer'),
        width: '100%',
        height: '100%',
        isCloseable: true,
        isPrivate: true,
        isLayoutMember: false,
        content: '<div id ="geometry_viewer_panel" class="sql-editor-geometry-viewer" tabindex="0"></div>',
      });

      // Load all the created panels
      sql_panel.load(self.docker);
      data_output.load(self.docker);
      explain.load(self.docker);
      messages.load(self.docker);
      history.load(self.docker);
      scratch.load(self.docker);
      notifications.load(self.docker);
      geometry_viewer.load(self.docker);

      // restore the layout if present else fallback to buildDefaultLayout
      pgBrowser.restore_layout(self.docker, this.layout, this.buildDefaultLayout.bind(this));

      self.docker.on(wcDocker.EVENT.LAYOUT_CHANGED, function() {
        pgBrowser.save_current_layout('SQLEditor/Layout', self.docker);
      });

      self.sql_panel_obj = self.docker.findPanels('sql_panel')[0];
      self.history_panel = self.docker.findPanels('history')[0];
      self.data_output_panel = self.docker.findPanels('data_output')[0];
      self.explain_panel = self.docker.findPanels('explain')[0];
      self.messages_panel = self.docker.findPanels('messages')[0];
      self.notifications_panel = self.docker.findPanels('notifications')[0];

      if (_.isUndefined(self.sql_panel_obj) || _.isUndefined(self.history_panel) ||
       _.isUndefined(self.data_output_panel) || _.isUndefined(self.explain_panel) ||
       _.isUndefined(self.messages_panel) || _.isUndefined(self.notifications_panel)) {
        alertify.alert(
          gettext('Panel Loading Error'),
          gettext('Something went wrong while loading the panels.'
          + ' Please make sure to reset the layout (File > Reset Layout) for the better user experience.')
        );
      }

      // Refresh Code mirror on SQL panel resize to
      // display its value properly
      self.sql_panel_obj.on(wcDocker.EVENT.RESIZE_ENDED, function() {
        setTimeout(function() {
          if (self && self.query_tool_obj) {
            self.query_tool_obj.refresh();
          }
        }, 200);
      });

      self.render_history_grid();
      pgBrowser.Events.on('pgadmin:query_tool:connected:'+self.handler.transId, ()=>{
        self.fetch_query_history();
      });

      queryToolNotifications.renderNotificationsGrid(self.notifications_panel);

      var text_container = $('<textarea id="sql_query_tool" tabindex="-1"></textarea>');
      var output_container = $('<label for="sql_query_tool" class="sr-only">SQL Editor</label><div id="output-panel" tabindex="0"></div>').append(text_container);
      self.sql_panel_obj.$container.find('.pg-panel-content').append(output_container);

      self.query_tool_obj = CodeMirror.fromTextArea(text_container.get(0), {
        tabindex: '0',
        lineNumbers: true,
        styleSelectedText: true,
        mode: self.handler.server_type === 'gpdb' ? 'text/x-gpsql' : 'text/x-pgsql',
        foldOptions: {
          widget: '\u2026',
        },
        foldGutter: true,
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        extraKeys: pgBrowser.editor_shortcut_keys,
        scrollbarStyle: 'simple',
        dragDrop: false,
        screenReaderLabel: gettext('SQL editor'),
      });

      if(self.handler.is_query_tool) {
        self.query_tool_obj.setOption('dragDrop', true);
        self.query_tool_obj.on('drop', (editor, e) => {
          var dropDetails = null;
          try {
            dropDetails = JSON.parse(e.dataTransfer.getData('text'));

            /* Stop firefox from redirecting */

            if(e.preventDefault) {
              e.preventDefault();
            }
            if (e.stopPropagation) {
              e.stopPropagation();
            }
          } catch(error) {
            /* if parsing fails, it must be the drag internal of codemirror text */
            return;
          }

          var cursor = editor.coordsChar({
            left: e.x,
            top: e.y,
          });
          editor.replaceRange(dropDetails.text, cursor);
          editor.focus();
          editor.setSelection({
            ...cursor,
            ch: cursor.ch + dropDetails.cur.from,
          },{
            ...cursor,
            ch: cursor.ch +dropDetails.cur.to,
          });
        });
      }

      pgBrowser.Events.on('pgadmin:query_tool:sql_panel:focus', ()=>{
        self.query_tool_obj.focus();
      });

      pgBrowser.Events.on('pgadmin:query_tool:explain:focus', ()=>{
        setTimeout(function () {
          $('.sql-editor-explain .backform-tab .nav-link.active').focus();
        }, 200);
      });

      var open_new_tab = self.browser_preferences.new_browser_tab_open;
      if (_.isNull(open_new_tab) || _.isUndefined(open_new_tab) || !open_new_tab.includes('qt')) {
        // Listen on the panel closed event and notify user to save modifications.
        _.each(pgWindow.default.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
          if (p.isVisible()) {
            p.on(wcDocker.EVENT.CLOSING, function() {
              return self.handler.check_needed_confirmations_before_closing_panel(true);
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
            hint_render: function(elt, data_arg, cur_arg) {
              var el = document.createElement('span');

              switch (cur_arg.type) {
              case 'database':
                el.className = 'sqleditor-hint pg-icon-' + cur_arg.type;
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
                el.className = 'sqleditor-hint icon-' + cur_arg.type;
              }

              el.appendChild(document.createTextNode(cur_arg.text));
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
            var self_local = this;
            // Make ajax call to find the autocomplete data
            $.ajax({
              url: self_local.url,
              method: 'POST',
              contentType: 'application/json',
              data: JSON.stringify(self_local.data),
            })
              .done(function(res) {
                var result = [];

                _.each(res.data.result, function(obj, key) {
                  result.push({
                    text: key,
                    type: obj.object_type,
                    render: self_local.hint_render,
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
                var token = self_local.editor.getTokenAt(cur),
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
                    line: self_local.current_line,
                    ch: start,
                  },
                  to: {
                    line: self_local.current_line,
                    ch: end,
                  },
                });
              })
              .fail(function(e) {
                return httpErrorHandler.handleLoginRequiredAndTransactionRequired(
                  pgAdmin, self_local, e, null, [], false
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

      /* Set Auto-commit and auto-rollback on query editor */
      if (self.preferences.auto_commit) {
        $('.auto-commit').removeClass('visibility-hidden');
      }
      else {
        $('.auto-commit').addClass('visibility-hidden');
      }
      if (self.preferences.auto_rollback) {
        $('.auto-rollback').removeClass('visibility-hidden');
      }
      else {
        $('.auto-rollback').addClass('visibility-hidden');
      }

      /* Register for preference changed event broadcasted in parent
       * to reload the shorcuts. As sqleditor is in iFrame of wcDocker
       * window parent is referred
       */
      pgWindow.default.pgAdmin.Browser.onPreferencesChange('sqleditor', function() {
        self.reflectPreferences();
      });

      /* If sql editor is in a new tab, event fired is not available
       * instead, a poller is set up who will check
       */
      //var browser_qt_preferences = pgBrowser.get_preferences_for_module('browser');
      var open_new_tab_qt = self.browser_preferences.new_browser_tab_open;
      if(open_new_tab_qt && open_new_tab_qt.includes('qt')) {
        pgBrowser.bind_beforeunload();
        setInterval(()=>{
          if(pgWindow.default.pgAdmin) {
            self.reflectPreferences();
          }
        }, 1000);
      }

      /* Register to log the activity */
      pgBrowser.register_to_activity_listener(document, ()=>{
        alertify.alert(gettext('Timeout'), gettext('Your session has timed out due to inactivity. Please close the window and login again.'));
      });

      self.render_connection(self.connection_list);
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

      self.handler.numberOfModifiedCells = 0;

      self.handler.reset_data_store();

      // keep track of newly added rows
      self.handler.rows_to_disable = new Array();
      // Temporarily hold new rows added
      self.handler.temp_new_rows = new Array();

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
        c.display_name = _.escape(c.display_name);
        c.column_type = _.escape(c.column_type);

        // If the keys have name from existing JS keywords then it may
        // create problem. eg - contructor, hasOwnProperty.
        // nonative_field is field with extra double quotes
        var options = {
          id:  _.escape(c.name),
          pos: c.pos,
          field: c.name,
          nonative_field: `"${c.name}"`,
          name: c.label,
          display_name: c.display_name,
          column_type: c.column_type,
          column_type_internal: c.column_type_internal,
          cell: c.cell,
          not_null: c.not_null,
          has_default_val: c.has_default_val,
          is_array: c.is_array,
          can_edit: c.can_edit,
        };

        // Get the columns width based on longer string among data type or
        // column name.
        var column_type = c.column_type.trim();
        var label = c.name.length > column_type.length ? _.escape(c.display_name) : column_type;

        if (_.isUndefined(column_size[table_name][options.nonative_field])) {
          options['width'] = SqlEditorUtils.calculateColumnWidth(label);
          column_size[table_name][c.nonative_field] = options['width'];
        } else {
          options['width'] = column_size[table_name][options.nonative_field];
        }
        // If grid is editable then add editor else make it readonly
        if (c.cell == 'oid' && c.name == 'oid') {
          options['editor'] = null;
        } else if (c.cell == 'Json') {
          options['editor'] = c.can_edit ? Slick.Editors.JsonText :
            Slick.Editors.ReadOnlyJsonText;
          options['formatter'] = Slick.Formatters.JsonString;
        } else if (c.cell == 'number' || c.cell == 'oid' ||
          $.inArray(c.type, ['xid', 'real']) !== -1
        ) {
          options['editor'] = c.can_edit ? Slick.Editors.CustomNumber :
            Slick.Editors.ReadOnlyText;
          options['formatter'] = Slick.Formatters.Numbers;
        } else if (c.cell == 'boolean') {
          options['editor'] = c.can_edit ? Slick.Editors.Checkbox :
            Slick.Editors.ReadOnlyCheckbox;
          options['formatter'] = Slick.Formatters.Checkmark;
        } else if (c.cell == 'binary') {
          // We do not support editing binary data in SQL editor and data grid.
          options['formatter'] = Slick.Formatters.Binary;
        } else if (c.cell == 'geometry' || c.cell == 'geography') {
          // increase width to add 'view' button
          options['width'] += 28;
          options['can_edit'] = false;
        } else {
          options['editor'] = c.can_edit ? Slick.Editors.pgText :
            Slick.Editors.ReadOnlypgText;
          options['formatter'] = Slick.Formatters.Text;
        }

        if(!_.isUndefined(c.can_edit)) {
          // Increase width for editable/read-only icon
          options['width'] += 12;

          let tooltip = '';
          if(c.can_edit)
            tooltip = gettext('Editable column');
          else
            tooltip = gettext('Read-only column');

          options['toolTip'] = tooltip;
        }

        grid_columns.push(options);
      });

      var gridSelector = new GridSelector();
      grid_columns = self.grid_columns = gridSelector.getColumnDefinitions(grid_columns);

      _.each(grid_columns, function (c) {
        // Add 'view' button in geometry and geography type column headers
        if (c.column_type_internal == 'geometry' || c.column_type_internal == 'geography') {
          GeometryViewer.add_header_button(c);
        }
        // Add editable/read-only icon to columns
        if (!_.isUndefined(c.can_edit)) {
          SqlEditorUtils.addEditableIcon(c, c.can_edit);
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

      var $data_grid = $('#datagrid');
      // Calculate height based on panel size at runtime & set it
      var grid_height = $(this.data_output_panel.$container.parent().parent()).height() - 35;
      $data_grid.height(grid_height);

      var dataView = self.dataView = new Slick.Data.DataView(),
        grid = self.grid = new Slick.Grid($data_grid, dataView, grid_columns, grid_options);

      // Add-on function which allow us to identify the faulty row after insert/update
      // and apply css accordingly

      dataView.getItemMetadata = function(rows) {
        var cssClass = '',
          data_store = self.handler.data_store;

        if (_.has(self.handler, 'data_store')) {
          if (rows in data_store.added_index &&
            data_store.added_index[rows] in data_store.added) {
            cssClass = 'new_row';
            if (data_store.added[data_store.added_index[rows]].err) {
              cssClass += ' error';
            }
          } else if (rows in data_store.updated_index && rows in data_store.updated) {
            cssClass = 'updated_row';
            if (data_store.updated[data_store.updated_index[rows]].err) {
              cssClass += ' error';
            }
          }
        }

        // Disable rows having default values
        if (!_.isUndefined(self.handler.rows_to_disable) &&
          self.handler.rows_to_disable.length > 0 &&
          _.indexOf(self.handler.rows_to_disable, rows) !== -1) {
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
      grid.registerPlugin(new Slick.AutoColumnSize());
      var headerButtonsPlugin = new Slick.Plugins.HeaderButtons();
      headerButtonsPlugin.onCommand.subscribe(function (e, args) {
        let command = args.command;
        if (command === 'view-geometries') {
          let cols = args.grid.getColumns();
          let columnIndex = cols.indexOf(args.column);
          let selectedRows = args.grid.getSelectedRows();
          if (selectedRows.length === 0) {
            // if no rows are selected, load and render all the rows
            if (self.handler.has_more_rows) {
              self.fetch_next_all(function () {
                // trigger onGridSelectAll manually with new event data.
                gridSelector.onGridSelectAll.notify(args, new Slick.EventData());
                let items = args.grid.getData().getItems();
                GeometryViewer.render_geometries(self.handler, items, cols, columnIndex);
              });
            } else {
              gridSelector.onGridSelectAll.notify(args, new Slick.EventData());
              let items = args.grid.getData().getItems();
              GeometryViewer.render_geometries(self.handler, items, cols, columnIndex);
            }
          } else {
            // render selected rows
            let items = args.grid.getData().getItems();
            let selectedItems = _.map(selectedRows, function (row) {
              return items[row];
            });
            GeometryViewer.render_geometries(self.handler, selectedItems, cols, columnIndex);
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
        var cols = this.getColumns();
        _.each(cols, function(col) {
          var col_size = self.handler['col_size'];
          col_size[self.handler['table_name']][col['nonative_field']] = col['width'];
        });
      }.bind(grid));

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

      // Handles blur event for slick grid cell
      $('.slick-viewport').on('blur', 'input.editor-text', function () {
        window.setTimeout(function() {
          if (Slick.GlobalEditorLock.isActive())
            Slick.GlobalEditorLock.commitCurrentEdit();
        });
      });

      // Listener function which will be called when user updates existing rows
      grid.onCellChange.subscribe(function(e, args) {
        // self.handler.data_store.updated will holds all the updated data
        var changed_column = args.grid.getColumns()[args.cell].field,
          updated_data = args.item[changed_column], // New value for current field
          _pk = args.item[self.client_primary_key] || null, // Unique key to identify row
          column_data = {};

        // Highlight the changed cell
        self.handler.numberOfModifiedCells++;
        args.grid.addCellCssStyles(self.handler.numberOfModifiedCells, {
          [args.row] : {
            [changed_column]: 'highlighted_grid_cells',
          },
        });

        // Access to row/cell value after a cell is changed.
        // The purpose is to remove row_id from temp_new_row
        // if new row has primary key instead of [default_value]
        // so that cell edit is enabled for that row.
        var grid_edit = args.grid,
          row_data = grid_edit.getDataItem(args.row),
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
        $('#btn-save-data').prop('disabled', false);
      }.bind(editor_data));

      // Listener function which will be called when user adds new rows
      grid.onAddNewRow.subscribe(function(e, args) {
        // self.handler.data_store.added will holds all the newly added rows/data
        var column = args.column,
          item_current = args.item,
          data_length = this.grid.getDataLength(),
          _key = (self.client_primary_key_counter++).toString(),
          data_view = this.grid.getData();

        // Add new row in list to keep track of it
        if (_.isUndefined(item_current[0])) {
          self.handler.temp_new_rows.push(data_length);
        }

        // If copied item has already primary key, use it.
        if (item_current) {
          item_current[self.client_primary_key] = _key;
        }

        // When adding new rows, mark all native JS keywords undefined if not already set
        _.each(args.grid.getColumns(), function(col){
          if(isNative(item_current[col.field])) {
            item_current[col.field] = undefined;
          }
        });

        data_view.addItem(item_current);
        self.handler.data_store.added[_key] = {
          'err': false,
          'data': item_current,
        };
        self.handler.data_store.added_index[data_length] = _key;

        // Fetch data type & add it for the column
        var temp = {};
        temp[column.name] = _.where(this.columns, {
          pos: column.pos,
        })[0]['type'];
        grid.updateRowCount();
        grid.render();

        // Highlight the first added cell of the new row
        var row = data_view.getRowByItem(item_current);
        self.handler.numberOfModifiedCells++;
        args.grid.addCellCssStyles(self.handler.numberOfModifiedCells, {
          [row] : {
            [column.field]: 'highlighted_grid_cells',
          },
        });

        // Enable save button
        $('#btn-save-data').prop('disabled', false);
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

      grid.onValidationError.subscribe(function (e, args) {
        alertify.error(args.validationResults.msg);
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
      $('#btn-download').prop('disabled', true);

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
          $('#btn-download').prop('disabled', false);
          self.handler.trigger('pgadmin-sqleditor:loading-icon:hide');
          self.update_grid_data(res.data.result);
          self.handler.fetching_rows = false;
          if (typeof cb == 'function') {
            cb();
          }
        })
        .fail(function(e) {
          $('#btn-flash').prop('disabled', false);
          $('#btn-download').prop('disabled', false);
          self.handler.trigger('pgadmin-sqleditor:loading-icon:hide');
          self.handler.has_more_rows = false;
          self.handler.fetching_rows = false;
          if (typeof cb == 'function') {
            cb();
          }

          let msg = httpErrorHandler.handleQueryToolAjaxError(
            pgAdmin, self, e, null, [], false
          );
          if (msg)
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
        h = $(this.data_output_panel.$container.parent().parent()).height() - 35,
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

    fetch_query_history: function() {
      let self = this;
      $.ajax({
        url: url_for('sqleditor.get_query_history', {
          'trans_id': self.handler.transId,
        }),
        method: 'GET',
        contentType: 'application/json',
      }).done(function(res) {
        res.data.result.map((entry) => {
          let newEntry = JSON.parse(entry);
          newEntry.start_time = new Date(newEntry.start_time);
          self.history_collection.add(newEntry);
        });
      }).fail(function() {
      /* history fetch fail should not affect query tool */
      });
    },
    /* This function is responsible to create and render the the history tab. */
    render_history_grid: function() {
      var self = this;

      /* Should not reset if function called again */
      if(!self.history_collection) {
        self.history_collection = new HistoryCollection([]);
      }

      if(!self.historyComponent) {
        self.historyComponent = new QueryHistory($('#history_grid'), self.history_collection);

        /* Copy query to query editor, set the focus to editor and move cursor to end */
        self.historyComponent.onCopyToEditorClick((query)=>{
          self.query_tool_obj.setValue(query);
          self.sql_panel_obj.focus();
          setTimeout(() => {
            self.query_tool_obj.focus();
            self.query_tool_obj.setCursor(self.query_tool_obj.lineCount(), 0);
          }, 100);
        });

        self.historyComponent.render();

        self.history_panel.off(wcDocker.EVENT.VISIBILITY_CHANGED);
        self.history_panel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function() {
          if (self.history_panel.isVisible()) {
            setTimeout(()=>{
              self.historyComponent.focus();
            }, 100);
          }
        });
      }

      if(!self.handler.is_query_tool) {
        self.historyComponent.setEditorPref({'copy_to_editor':false});
      }
    },

    // Callback function for delete button click.
    on_delete: function() {
      var self = this;

      // Trigger the deleterow signal to the SqlEditorController class
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
        $(target).closest('.editor-toolbar').find('.show').removeClass('show');
      }
    },

    // Callback function for Save button click.
    on_save_file: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.handler.close_on_save = false;
      // Trigger the save signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:save_file'
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
        'pgadmin-sqleditor:button:save_file',
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

    on_new_connection: function() {
      var self = this;

      // Trigger the show_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:show_new_connection',
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

    // Callback function for cancel button click.
    on_cancel: function() {
      $('#filter').addClass('d-none');
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

    // Callback function for copy with header button click.
    on_copy_row_with_header: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      // Toggle the button
      self.handler.trigger(
        'pgadmin-sqleditor:button:copy_row_with_header',
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

    // Callback function for Save Data Changes button click.
    on_save_data: function() {
      this.handler.history_query_source = QuerySources.SAVE_DATA;

      queryToolActions.saveDataChanges(this.handler);
    },

    // Callback function for the flash button click.
    on_flash: function() {
      let data_click_counter = $('#btn-flash').attr('data-click-counter');
      data_click_counter = (parseInt(data_click_counter) + 1)%10;
      $('#btn-flash').attr('data-click-counter', data_click_counter);

      this.handler.history_query_source = QuerySources.EXECUTE;

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

    on_format_sql: function() {
      var self = this;
      // Trigger the format signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:format_sql',
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
        gettext('Are you sure you wish to clear the history?') + '</br>' +
        gettext('This will remove all of your query history from this and other sessions for this database.'),
        function() {
          if (self.history_collection) {
            self.history_collection.reset();
          }

          if(self.handler.is_query_tool) {
            $.ajax({
              url: url_for('sqleditor.clear_query_history', {
                'trans_id': self.handler.transId,
              }),
              method: 'DELETE',
              contentType: 'application/json',
            })
              .done(function() {})
              .fail(function() {
              /* history clear fail should not affect query tool */
              });
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

      this.handler.history_query_source = QuerySources.EXPLAIN;
      queryToolActions.explain(this.handler);
    },

    // Callback function for explain analyze button click.
    on_explain_analyze: function(event) {
      this._stopEventPropogation(event);
      this._closeDropDown(event);

      this.handler.history_query_source = QuerySources.EXPLAIN_ANALYZE;
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

    on_explain_summary: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      self.handler.trigger(
        'pgadmin-sqleditor:button:explain-summary',
        self,
        self.handler
      );
    },

    on_explain_settings: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);

      self.handler.trigger(
        'pgadmin-sqleditor:button:explain-settings',
        self,
        self.handler
      );
    },


    do_not_close_menu: function(ev) {
      ev.stopPropagation();
    },

    // callback function for show query tool click.
    on_show_query_tool: function(ev) {
      var self = this;

      this._stopEventPropogation(ev);
      this._closeDropDown(ev);

      self.handler.trigger(
        'pgadmin-sqleditor:button:show_query_tool',
        self,
        self.handler
      );
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
      var panel_type='';

      panel_type = keyboardShortcuts.processEventQueryTool(
        this.handler, queryToolActions, event, this.docker
      );

      if(!_.isNull(panel_type) && !_.isUndefined(panel_type) && panel_type != '') {
        setTimeout(function() {
          pgBrowser.Events.trigger(`pgadmin:query_tool:${panel_type}:focus`);
        }, 100);
      }
    },

    // Callback function for the commit button click.
    on_commit_transaction: function() {
      this.handler.close_on_idle_transaction = false;
      this.handler.history_query_source = QuerySources.COMMIT;

      queryToolActions.executeCommit(this.handler);
    },

    // Callback function for the rollback button click.
    on_rollback_transaction: function() {
      this.handler.close_on_idle_transaction = false;
      this.handler.history_query_source = QuerySources.ROLLBACK;

      queryToolActions.executeRollback(this.handler);
    },

    // Callback function for manage macros button click.
    on_manage_macros: function() {
      var self = this;

      // Trigger the show_filter signal to the SqlEditorController class
      self.handler.trigger(
        'pgadmin-sqleditor:button:manage_macros',
        self,
        self.handler
      );
    },

    // Callback function for manage macros button click.
    on_execute_macro: function(e) {
      let macroId = $(e.currentTarget).data('macro-id');
      this.handler.history_query_source = QuerySources.EXECUTE;
      queryToolActions.executeMacro(this.handler, macroId);
    },

    set_selected_option: function(selected_config) {
      this.connection_list.forEach(option =>{
        if(option['server'] == selected_config['server'] && option['database'] == selected_config['database'] && option['user'] == selected_config['user'] && option['role'] == selected_config['role']) {
          selected_config['is_selected'] = true;
        } else {
          option['is_selected'] = false;
        }
      });
    },

    on_change_connection: function(connection_details, ref, add_new_connection=true) {
      if(!connection_details['is_selected']) {
        var self = this;
        if(add_new_connection) {
          alertify.confirm(gettext('Change connection'),
            gettext('By changing the connection you will lose all your unsaved data for the current connection. <br> Do you want to continue?'),
            function() {
              self.change_connection(connection_details, ref, true);
            },
            function() {
              var loadingDiv = $('#fetching_data');
              loadingDiv.addClass('d-none');
              alertify.newConnectionDialog().destroy();
              return true;
            }
          ).set('labels', {
            ok: gettext('Yes'),
            cancel: gettext('No'),
          });
        } else {
          self.change_connection(connection_details, ref, false);
        }
      }
    },

    change_connection: function(connection_details, ref, add_new_connection) {
      var self = this;
      var loadingDiv = null;
      var msgDiv = null;
      if(ref){
        loadingDiv = $('#show_filter_progress');
        loadingDiv.removeClass('d-none');
        msgDiv = loadingDiv.find('.sql-editor-busy-text');
        msgDiv.text('Connecting to database...');
      } else{
        loadingDiv = $('#fetching_data');
        loadingDiv.removeClass('d-none');
        msgDiv = loadingDiv.find('.sql-editor-busy-text');
      }
      self.set_selected_option(connection_details);
      $.ajax({
        url: url_for('datagrid.update_query_tool_connection', {
          'trans_id': self.transId,
          'sgid': connection_details['server_group'],
          'sid': connection_details['server'],
          'did': connection_details['database'],
        }),
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(connection_details),
      })
        .done(function(res) {
          if(res.success) {
            delete connection_details.password;
            self.transId = res.data.tran_id;
            self.handler.transId = res.data.tran_id;
            self.handler.url_params = {
              'did': connection_details['database'],
              'is_query_tool': self.handler.url_params.is_query_tool,
              'server_type': self.handler.url_params.server_type,
              'sgid': connection_details['server_group'],
              'sid': connection_details['server'],
              'title': connection_details['title'],
            };
            self.set_editor_title(_.unescape(self.handler.url_params.title));
            self.handler.setTitle(_.unescape(self.handler.url_params.title));
            let success_msg = connection_details['server_name'] + '/' + connection_details['database_name'] + '- Database connected';
            alertify.success(success_msg);
            if(ref){
              let connection_data = {
                'server_group': self.handler.url_params.sgid,
                'server': connection_details['server'],
                'database': connection_details['database'],
                'user': connection_details['user'],
                'title': connection_details['title'],
                'role': connection_details['role'],
                'is_allow_new_connection': true,
                'database_name': connection_details['database_name'],
                'server_name': connection_details['server_name'],
                'is_selected': true,
              };
              delete connection_data.password;
              if(add_new_connection) {
                self.connection_list.unshift(connection_data);
              }

              self.render_connection(self.connection_list);
              loadingDiv.addClass('d-none');
              alertify.newConnectionDialog().destroy();
              alertify.connectServer().destroy();
            } else {
              loadingDiv.addClass('d-none');
              alertify.connectServer().destroy();
            }
          }
          return true;
        })
        .fail(function(xhr) {
          if(xhr.status == 428) {
            var connection_info = connection_details;
            if(ref) {
              connection_info = {};
            }
            alertify.connectServer('Connect to server', xhr.responseJSON.result, connection_details['server'], false, connection_info);
          } else {
            alertify.error(xhr.responseJSON['errormsg']);
          }
        });
    },
  });



  /* Defining controller class for data grid, which actually
   * perform the operations like executing the sql query, poll the result,
   * render the data in the grid, Save/Refresh the data etc...
   */
  var SqlEditorController = function() {
    this.initialize.apply(this, arguments);
  };

  /* This function is used to check whether user have closed
   * the main window when query tool is opened on new tab
   */
  var is_main_window_alive = function() {

    if((pgWindow.default && pgWindow.default.closed) ||
        pgWindow.default.pgAdmin && pgWindow.default.pgAdmin.Browser
            && pgWindow.default.pgAdmin.Browser.preference_version() <= 0) {

      alertify.alert()
        .setting({
          'title': gettext('Connection lost'),
          'label':gettext('Close'),
          'message': gettext('The pgAdmin browser window has been closed and the connection to the server is lost. Please close this window and open a new pgAdmin session.'),
          'onok': function(){
            //Close the window after connection is lost
            window.close();
          },
        }).show();
    }
  };

  _.extend(
    SqlEditorController.prototype,
    Backbone.Events,
    {
      initialize: function(container) {
        var self = this;
        this.container = container;
        this.state = {};
        this.csrf_token = pgAdmin.csrf_token;

        //call to check whether user have closed the parent window and trying to refresh, if yes return error.
        is_main_window_alive();

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
        var self = this, url_endpoint;
        if (self.is_query_tool) {
          url_endpoint = 'datagrid.initialize_query_tool';

          // If database not present then use Maintenance database
          // We will handle this at server side
          if (self.url_params.did) {
            url_endpoint = 'datagrid.initialize_query_tool_with_did';
          }

        } else {
          url_endpoint = 'datagrid.initialize_datagrid';
        }

        var baseUrl = url_for(url_endpoint, {
          ...self.url_params,
          'trans_id': self.transId,
        });

        $.ajax({
          url: baseUrl,
          type: 'POST',
          data: self.is_query_tool?null:JSON.stringify(self.url_params.sql_filter),
          contentType: 'application/json',
        }).done((res)=>{
          pgBrowser.Events.trigger(
            'pgadmin:query_tool:connected:' + self.transId, res.data
          );
        }).fail((xhr, status, error)=>{
          if (xhr.status === 410) {
          //checking for Query tool in new window.
            var open_new_tab = self.browser_preferences.new_browser_tab_open;
            if(open_new_tab && open_new_tab.includes('qt')) {
              pgBrowser.report_error(gettext('Error fetching rows - %s.', xhr.statusText), xhr.responseJSON.errormsg, undefined, window.close);
            } else {
              pgBrowser.report_error(gettext('Error fetching rows - %s.', xhr.statusText), xhr.responseJSON.errormsg, undefined, self.close.bind(self));
            }
          } else {
            pgBrowser.Events.trigger(
              'pgadmin:query_tool:connected_fail:' + self.transId, xhr, error
            );
          }
        });
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
      handle_cryptkey_missing: function() {
        pgBrowser.set_master_password('', ()=>{
          this.warn_before_continue();
        });
      },
      warn_before_continue: function() {
        var self = this;

        alertify.confirm(
          gettext('Connection Warning'),
          '<p style="float:left">'+
            '<span class="fa fa-exclamation-triangle warn-icon" aria-hidden="true" role="img">'+
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
              if (fn in self) {
                self[fn].apply(self, args);
              } else {
                console.warn('The callback is not valid for this context');
              }

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
            if (msg)
              alertify.dlgGetServerPass(
                gettext('Connect to Server'), msg
              );
          });
      },
      /* This function is used to create instance of SQLEditorView,
       * call the render method of the grid view to render the slickgrid
       * header and loading icon and start execution of the sql query.
       */
      start: function(transId, url_params, layout, macros) {
        var self = this;

        self.is_query_tool = url_params.is_query_tool==='true'?true:false;
        self.rows_affected = 0;
        self.marked_line_no = 0;
        self.has_more_rows = false;
        self.fetching_rows = false;
        self.close_on_save = false;
        self.close_on_idle_transaction = false;
        self.last_transaction_status = -1;
        self.server_type = url_params.server_type;
        self.url_params = url_params;
        self.is_transaction_buttons_disabled = true;

        // We do not allow to call the start multiple times.
        if (self.gridView)
          return;

        self.gridView = new SQLEditorView({
          el: self.container,
          handler: self,
          layout: layout,
        });
        self.transId = self.gridView.transId = transId;
        self.macros = self.gridView.macros = macros;

        self.gridView.current_file = undefined;

        // Render the header
        self.gridView.render();

        self.trigger('pgadmin-sqleditor:loading-icon:hide');

        self.gridView.set_editor_title('(' + gettext('Obtaining connection...') + ` ${_.unescape(url_params.title)}`);

        let afterConn = function() {
          let enableBtns = [];

          if(self.is_query_tool){
            enableBtns = ['#btn-flash', '#btn-explain', '#btn-explain-analyze'];
          } else {
            enableBtns = ['#btn-flash'];
          }

          enableBtns.forEach((selector)=>{
            $(selector).prop('disabled', false);
          });

          $('#btn-conn-status i').removeClass('obtaining-conn');

          var tree_data = pgWindow.default.pgAdmin.Browser.treeMenu.translateTreeNodeIdFromACITree(pgWindow.default.pgAdmin.Browser.treeMenu.selected());

          var server_data = pgWindow.default.pgAdmin.Browser.treeMenu.findNode(tree_data.slice(0,2));
          var database_data = pgWindow.default.pgAdmin.Browser.treeMenu.findNode(tree_data.slice(0,4));



          self.gridView.set_editor_title(_.unescape(url_params.title));
          let connection_data = {
            'server_group': self.gridView.handler.url_params.sgid,
            'server': self.gridView.handler.url_params.sid,
            'database': self.gridView.handler.url_params.did,
            'user': server_data.data.user.name,
            'role': null,
            'title': _.unescape(url_params.title),
            'is_allow_new_connection': false,
            'database_name': _.unescape(database_data.data.label),
            'server_name': _.unescape(server_data.data.label),
            'is_selected': true,
          };
          delete connection_data.password;
          self.gridView.connection_list.unshift(connection_data);
          self.gridView.render_connection(self.gridView.connection_list);
        };

        pgBrowser.Events.on('pgadmin:query_tool:connected:' + transId, afterConn);
        pgBrowser.Events.on('pgadmin:query_tool:connected_fail:' + transId, afterConn);

        pgBrowser.Events.on('pgadmin:query_tool:connected:' + transId, (res_data)=>{
          self.gridView.set_server_version(res_data.serverVersion);
        });

        pgBrowser.Events.on('pgadmin:query_tool:connected_fail:' + transId, (xhr, error)=>{
          alertify.pgRespErrorNotify(xhr, error);
        });

        self.initTransaction();

        /* wcDocker focuses on window always, and all our shortcuts are
         * bind to editor-panel. So when we use wcDocker focus, editor-panel
         * loses focus and events don't work.
         */
        $(window).on('keydown', (e)=>{
          if(($('.sql-editor').find(e.target).length !== 0 || e.target == $('body.wcDesktop')[0]) && self.gridView.keyAction) {
            self.gridView.keyAction(e);
          }
        });

        self.init_events();
        if (self.is_query_tool) {
          // Fetch the SQL for Scripts (eg: CREATE/UPDATE/DELETE/SELECT)
          // Call AJAX only if script type url is present
          if (url_params.query_url) {
            $.ajax({
              url: url_params.query_url,
              type:'GET',
            })
              .done(function(res) {
                self.gridView.query_tool_obj.refresh();
                if (res) {
                  self.gridView.query_tool_obj.setValue(res);
                }
              })
              .fail(function(jqx) {
                let msg = '';

                msg = httpErrorHandler.handleQueryToolAjaxError(
                  pgAdmin, self, jqx, null, [], false
                );
                if (msg) {
                  var open_new_tab = self.browser_preferences.new_browser_tab_open;
                  if(open_new_tab && open_new_tab.includes('qt')) {
                    pgBrowser.report_error(gettext('Error fetching SQL for script - %s.', jqx.statusText), jqx.responseJSON.errormsg, undefined, window.close);
                  } else {
                    pgBrowser.report_error(gettext('Error fetching SQL for script - %s.', jqx.statusText), jqx.responseJSON.errormsg, undefined, self.close.bind(self));
                  }
                }

              });
          }
        }
        else {
          // Disable codemirror by setting readOnly option to true, background to dark, and cursor, hidden.
          self.gridView.query_tool_obj.setOption('readOnly', true);
          var cm = self.gridView.query_tool_obj.getWrapperElement();
          if (cm) {
            cm.className += ' bg-gray-lighter opacity-5 hide-cursor-workaround';
          }
          self.disable_tool_buttons(true);
          pgBrowser.Events.on('pgadmin:query_tool:connected:'+ transId,()=>{
            self.check_data_changes_to_execute_query();
          });
        }
      },

      set_value_to_editor: function(query) {
        if (this.gridView && this.gridView.query_tool_obj && !_.isUndefined(query)) {
          this.gridView.query_tool_obj.setValue(query);
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
        self.on('pgadmin-sqleditor:button:save_file', self._save_file, self);
        self.on('pgadmin-sqleditor:button:deleterow', self._delete, self);
        self.on('pgadmin-sqleditor:button:show_filter', self._show_filter, self);
        self.on('pgadmin-sqleditor:button:show_new_connection', self._show_new_connection, self);
        self.on('pgadmin-sqleditor:button:include_filter', self._include_filter, self);
        self.on('pgadmin-sqleditor:button:exclude_filter', self._exclude_filter, self);
        self.on('pgadmin-sqleditor:button:remove_filter', self._remove_filter, self);
        self.on('pgadmin-sqleditor:button:copy_row', self._copy_row, self);
        self.on('pgadmin-sqleditor:button:copy_row_with_header', self._copy_row_with_header, self);
        self.on('pgadmin-sqleditor:button:paste_row', self._paste_row, self);
        self.on('pgadmin-sqleditor:button:limit', self._set_limit, self);
        self.on('pgadmin-sqleditor:button:cancel-query', self._cancel_query, self);
        self.on('pgadmin-sqleditor:button:auto_rollback', self._auto_rollback, self);
        self.on('pgadmin-sqleditor:button:auto_commit', self._auto_commit, self);
        self.on('pgadmin-sqleditor:button:explain-verbose', self._explain_verbose, self);
        self.on('pgadmin-sqleditor:button:explain-costs', self._explain_costs, self);
        self.on('pgadmin-sqleditor:button:explain-buffers', self._explain_buffers, self);
        self.on('pgadmin-sqleditor:button:explain-timing', self._explain_timing, self);
        self.on('pgadmin-sqleditor:button:explain-summary', self._explain_summary, self);
        self.on('pgadmin-sqleditor:button:explain-settings', self._explain_settings, self);
        self.on('pgadmin-sqleditor:button:show_query_tool', self._show_query_tool, self);
        // Indentation related
        self.on('pgadmin-sqleditor:indent_selected_code', self._indent_selected_code, self);
        self.on('pgadmin-sqleditor:unindent_selected_code', self._unindent_selected_code, self);
        // Format
        self.on('pgadmin-sqleditor:format_sql', self._format_sql, self);
        self.on('pgadmin-sqleditor:button:manage_macros', self._manage_macros, self);
        self.on('pgadmin-sqleditor:button:execute_macro', self._execute_macro, self);

        window.parent.$(window.parent.document).on('pgadmin-sqleditor:rows-copied', self._copied_in_other_session);
      },

      // Checks if there is any dirty data in the grid before executing a query
      check_data_changes_to_execute_query: function(explain_prefix=null, shouldReconnect=false, macroId=undefined) {
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
              // The user does not want to save, just continue
              if (macroId !== undefined) {
                self._execute_macro_query(explain_prefix, shouldReconnect, macroId);
              }
              else if(self.is_query_tool) {
                self._execute_sql_query(explain_prefix, shouldReconnect);
              }
              else {
                self._execute_view_data_query();
              }
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
          if (macroId !== undefined) {
            self._execute_macro_query(explain_prefix, shouldReconnect, macroId);
          }
          else if(self.is_query_tool) {
            self._execute_sql_query(explain_prefix, shouldReconnect);
          }
          else {
            self._execute_view_data_query();
          }
        }
      },

      // Makes the ajax call to execute the sql query in View Data mode
      _execute_view_data_query: function() {
        var self = this,
          url = url_for('sqleditor.view_data_start', {
            'trans_id': self.transId,
          });

        self.query_start_time = new Date();
        self.rows_affected = 0;
        self._init_polling_flags();

        self.has_more_rows = false;
        self.fetching_rows = false;

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Running query...')
        );

        $('#btn-flash').prop('disabled', true);
        $('#btn-download').prop('disabled', true);

        self.trigger(
          'pgadmin-sqleditor:loading-icon:message',
          gettext('Waiting for the query to complete...')
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


              /* If filter is applied then remove class 'btn-secondary'
             * and add 'btn-primary' to change the colour of the button.
             */
              if (self.can_filter && res.data.filter_applied) {
                $('#btn-filter').removeClass('btn-secondary');
                $('#btn-filter-dropdown').removeClass('btn-secondary');
                $('#btn-filter').addClass('btn-primary');
                $('#btn-filter-dropdown').addClass('btn-primary');
              } else {
                $('#btn-filter').removeClass('btn-primary');
                $('#btn-filter-dropdown').removeClass('btn-primary');
                $('#btn-filter').addClass('btn-secondary');
                $('#btn-filter-dropdown').addClass('btn-secondary');
              }

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
              pgAdmin, self, e, '_execute_view_data_query', [], true
            );
            if (msg)
              self.update_msg_history(false, msg);
          });
      },

      // Executes sql query  for macroin the editor in Query Tool mode
      _execute_macro_query: function(explain_prefix, shouldReconnect, macroId) {
        var self = this;

        self.has_more_rows = false;
        self.fetching_rows = false;

        $.ajax({
          url: url_for('sqleditor.get_macro', {'macro_id': macroId, 'trans_id': self.transId}),
          method: 'GET',
          contentType: 'application/json',
          dataType: 'json',
        })
          .done(function(res) {
            if (res) {
              // Replace the place holder
              const regex = /\$SELECTION\$/gi;
              let query =  res.sql.replace(regex, self.gridView.query_tool_obj.getSelection());

              const executeQuery = new ExecuteQuery.ExecuteQuery(self, pgAdmin.Browser.UserManagement);
              executeQuery.poll = pgBrowser.override_activity_event_decorator(executeQuery.poll).bind(executeQuery);
              executeQuery.execute(query, explain_prefix, shouldReconnect);
            } else {
              // Let it be for now
            }
          })
          .fail(function() {
          /* failure should not be ignored */
          });

      },

      // Executes sql query in the editor in Query Tool mode
      _execute_sql_query: function(explain_prefix, shouldReconnect) {
        var self = this, sql = '';

        self.has_more_rows = false;
        self.fetching_rows = false;

        if (!_.isUndefined(self.special_sql)) {
          sql = self.special_sql;
        } else {
          /* If code is selected in the code mirror then execute
           * the selected part else execute the complete code.
           */
          var selected_code = self.gridView.query_tool_obj.getSelection();
          if (selected_code.length > 0)
            sql = selected_code;
          else
            sql = self.gridView.query_tool_obj.getValue();
        }

        const executeQuery = new ExecuteQuery.ExecuteQuery(this, pgAdmin.Browser.UserManagement);
        executeQuery.poll = pgBrowser.override_activity_event_decorator(executeQuery.poll).bind(executeQuery);
        executeQuery.execute(sql, explain_prefix, shouldReconnect);
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

      /* This function is used to create the slickgrid columns
       * and render the data in the slickgrid.
       */
      _render: function(data) {
        var self = this;
        self.colinfo = data.colinfo;
        self.primary_keys = (_.isEmpty(data.primary_keys) && data.has_oids) ? data.oids : data.primary_keys;
        self.client_primary_key = data.client_primary_key;
        self.cell_selected = false;
        self.selected_model = null;
        self.changedModels = [];
        self.has_oids = data.has_oids;
        self.oids = data.oids;
        $('.sql-editor-explain').html(EMPTY_EXPLAIN_CONTENT);
        self.explain_plan = false;

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

        // No data to save initially
        $('#btn-save-data').prop('disabled', true);

        // Initial settings for delete row, copy row and paste row buttons.
        $('#btn-delete-row').prop('disabled', true);

        if (!self.can_edit) {
          $('#btn-delete-row').prop('disabled', true);
          $('#btn-copy-row').prop('disabled', true);
          $('#btn-paste-row').prop('disabled', true);
        }

        // Fetch the columns metadata
        self._fetch_column_metadata.call(
          self, data,
          function() {
            var self_col = this;

            self_col.trigger(
              'pgadmin-sqleditor:loading-icon:message',
              gettext('Loading data from the database server and rendering...'),
              self_col
            );

            // Show message in message and history tab in case of query tool
            self_col.total_time = calculateQueryRunTime.calculateQueryRunTime(
              self_col.query_start_time,
              self_col.query_end_time
            );
            var msg1 = gettext('Successfully run. Total query runtime: %s.',self_col.total_time);
            var msg2 = gettext('%s rows affected.',self_col.rows_affected);

            // Display the notifier if the timeout is set to >= 0
            if (self_col.info_notifier_timeout >= 0) {
              alertify.success(msg1 + ' ' + msg2, self_col.info_notifier_timeout);
            }

            var _msg = msg1 + '\n' + msg2;


            // If there is additional messages from server then add it to message
            if (!_.isNull(data.additional_messages) &&
              !_.isUndefined(data.additional_messages)) {
              _msg = data.additional_messages + '\n' + _msg;
            }

            self_col.update_msg_history(true, _msg, false);

            /* Add the data to the collection and render the grid.
             * In case of Explain draw the graph on explain panel
             * and add json formatted data to collection and render.
             */
            var explain_data_array = [],
              explain_data_json = null;

            if(data.result && !_.isEmpty(self_col.colinfo)
             && self_col.colinfo[0].name == 'QUERY PLAN' && !_.isEmpty(data.types)
             && data.types[0] && data.types[0].typname === 'json') {
              /* json is sent as text, parse it */
              explain_data_json = JSON.parse(data.result[0][0]);
            }

            if (explain_data_json && explain_data_json[0] &&
              explain_data_json[0].hasOwnProperty('Plan') &&
              _.isObject(explain_data_json[0]['Plan'])
            ) {
              var explain_data = [JSON.stringify(explain_data_json, null, 2)];
              explain_data_array.push(explain_data);
              // Make sure - the 'Data Output' panel is visible, before - we
              // start rendering the grid.
              self_col.gridView.data_output_panel.focus();
              setTimeout(
                function() {
                  self_col.gridView.render_grid(
                    explain_data_array, self_col.columns, self_col.can_edit,
                    self_col.client_primary_key, 0
                  );
                  // Make sure - the 'Explain' panel is visible, before - we
                  // start rendering the grid.
                  self_col.gridView.explain_panel.focus();
                  pgExplain.DrawJSONPlan(
                    $('.sql-editor-explain'), explain_data_json
                  );
                }, 10
              );
            } else {
              // Make sure - the 'Data Output' panel is visible, before - we
              // start rendering the grid.
              self_col.gridView.data_output_panel.focus();
              setTimeout(
                function() {
                  self_col.gridView.render_grid(data.result, self_col.columns,
                    self_col.can_edit, self_col.client_primary_key, data.rows_affected);
                }, 10
              );
            }

            // Hide the loading icon
            self_col.trigger('pgadmin-sqleditor:loading-icon:hide');
            $('#btn-flash').prop('disabled', false);
            $('#btn-download').prop('disabled', false);
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
          var is_primary_key = false,
            is_editable = self.can_edit && (!self.is_query_tool || c.is_editable);

          // Check whether this column is a primary key
          if (is_editable && _.size(primary_keys) > 0) {
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
              'can_edit': (c.name == 'oid') ? false : is_editable,
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

      set_sql_message(msg, append=false) {
        if(append) {
          $('.sql-editor-message').append(msg);
        } else {
          $('.sql-editor-message').text(msg);
        }

        // Scroll automatically when msgs appends to element
        setTimeout(function() {
          $('.sql-editor-message').scrollTop($('.sql-editor-message')[0].scrollHeight);
        }, 10);
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

          self.set_sql_message(msg);
        } else {
          self.set_sql_message(_.escape(msg), true);
        }

        if (status != 'Busy') {
          $('#btn-flash').prop('disabled', false);
          $('#btn-download').prop('disabled', false);
          self.trigger('pgadmin-sqleditor:loading-icon:hide');

          if(!self.total_time) {
            self.total_time = calculateQueryRunTime.calculateQueryRunTime(
              self.query_start_time,
              new Date());
          }

          if(_.isUndefined(self.history_query_source)) {
            self.history_query_source = QuerySources.VIEW_DATA;
          }

          let history_entry = {
            'status': status,
            'start_time': self.query_start_time,
            'query': self.query,
            'row_affected': self.rows_affected,
            'total_time': self.total_time,
            'message': msg,
            'query_source': self.history_query_source,
            'is_pgadmin_query': !self.is_query_tool,
          };

          if(!self.is_query_tool) {
            var info_msg = gettext('This query was generated by pgAdmin as part of a "View/Edit Data" operation');
            history_entry.info = info_msg;
          }

          self.add_to_history(history_entry);
        }
      },

      /* Make ajax call to save the history data */
      add_to_history: function(history_entry) {
        var self = this;

        $.ajax({
          url: url_for('sqleditor.add_query_history', {
            'trans_id': self.transId,
          }),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(history_entry),
        })
          .done(function() {})
          .fail(function() {});

        self.gridView.history_collection.add(history_entry);
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
        let self = this;
        let tmp_keys = self.primary_keys;

        // re-calculate rows with no primary keys
        self.temp_new_rows = [];
        data.forEach(function(d, idx) {
          let p_keys_list = _.pick(d, _.keys(tmp_keys));
          let is_primary_key = Object.keys(p_keys_list).length > 0;

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
            }
          });
        }
        // If only newly rows to delete and no data is there to send on server
        // then just re-render the grid
        if (_.size(self.data_store.staged_rows) > 0 && (_.size(self.data_store.staged_rows) === _.size(deleted_keys))) {
          var grid = self.slickgrid,
            dataView = grid.getData();

          grid.resetActiveCell();

          dataView.beginUpdate();
          for (var i = 0; i < deleted_keys.length; i++) {
            delete self.data_store.staged_rows[deleted_keys[i]];
            delete self.data_store.added[deleted_keys[i]];
            delete self.data_store.added_index[deleted_keys[i]];
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
            $('#btn-save-data').prop('disabled', false);
          } else {
            $('#btn-save-data').prop('disabled', true);
          }
          alertify.success(gettext('Row(s) deleted.'));
        } else {

          let strikeout = true;
          _.each(_.keys(self.data_store.staged_rows), function(key) {
            if(key in self.data_store.deleted) {
              strikeout = false;
              return;
            }
          });

          if (!strikeout) {
            $(self.gridView.grid.getCanvasNode()).find('div.selected').removeClass('strikeout');
            _.each(_.keys(self.data_store.staged_rows), function(key) {
              if(key in self.data_store.deleted) {
                delete self.data_store.deleted[key];
              }
            });
          } else {
            // Strike out the rows to be deleted
            self.data_store.deleted = Object.assign({}, self.data_store.deleted, self.data_store.staged_rows);
            $(self.gridView.grid.getCanvasNode()).find('div.selected').addClass('strikeout');
          }

          if (_.size(self.data_store.added) || is_updated || _.size(self.data_store.deleted)) {
            // Do not disable save button if there are
            // any other changes present in grid data
            $('#btn-save-data').prop('disabled', false);
          } else {
            $('#btn-save-data').prop('disabled', true);
          }
        }
      },

      // This function will open save file dialog conditionally.

      _save_file: function(save_as=false) {
        var self = this;

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
      },

      /* This function will fetch the list of changed models and make
       * the ajax call to save the data into the database server.
       */
      save_data: function() {
        var self = this;

        if(!self.can_edit)
          return;

        var is_added = _.size(self.data_store.added),
          is_updated = _.size(self.data_store.updated),
          is_deleted = _.size(self.data_store.deleted);

        if (!is_added && !is_updated && !is_deleted) {
          return; // Nothing to save here
        }

        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Saving the updated data...')
        );
        // Disable query tool buttons and cancel button only if query tool
        if(self.is_query_tool)
          self.disable_tool_buttons(true, true);

        // Add the columns to the data so the server can remap the data
        var req_data = self.data_store, view = self.gridView;
        req_data.columns = view ? view.handler.columns : self.columns;

        var save_successful = false, save_start_time = new Date();

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

            var transaction_status = res.data.transaction_status;

            // Update last transaction status
            self.last_transaction_status = transaction_status;

            var is_commit_required = transaction_status > 0; // 0 is idle

            // Enable/Disable commit and rollback button.
            if (is_commit_required) {
              self.disable_transaction_buttons(false);
            } else {
              self.disable_transaction_buttons(true);
            }
            // Enable query tool buttons and cancel button only if query tool
            if(self.is_query_tool)
              self.disable_tool_buttons(false);

            if (res.data.status) {
              // Disable Save Data Changes button
              $('#btn-save-data').prop('disabled', true);

              save_successful = true;

              // Remove highlighted cells styling
              for (let i = 1; i <= self.numberOfModifiedCells; i++)
                grid.removeCellCssStyles(i);

              self.numberOfModifiedCells = 0;

              if(is_added) {
              // Update the rows in a grid after addition
                dataView.beginUpdate();
                _.each(res.data.query_results, function(r) {
                  if (!_.isNull(r.row_added)) {
                  // Fetch temp_id returned by server after addition
                    var row_id = Object.keys(r.row_added)[0];
                    _.each(req_data.added_index, function(v, k) {
                      if (v == row_id) {
                      // Fetch item data through row index
                        var item_fetched = grid.getDataItem(k);
                        _.extend(item_fetched, r.row_added[row_id]);
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
                var rows = _.keys(self.data_store.deleted);
                if (data_length == rows.length) {
                // This means all the rows are selected, clear all data
                  data = [];
                  dataView.setItems(data, self.client_primary_key);
                } else {
                  dataView.beginUpdate();
                  for (var j = 0; j < rows.length; j++) {
                    var item = grid.getDataItem(rows[j]);
                    data.push(item);
                    dataView.deleteItem(item[self.client_primary_key]);
                  }
                  dataView.endUpdate();
                }
                self.rows_to_delete.apply(self, [data]);
              }

              grid.setSelectedRows([]);

              // Reset data store
              self.reset_data_store();

              // Reset old primary key data now
              self.primary_keys_data = {};

              // Clear msgs after successful save
              self.set_sql_message('');

              alertify.success(gettext('Data saved successfully.'));

              if(is_commit_required)
                alertify.info(gettext('Auto-commit is off. You still need to commit changes to the database.'));


            } else {
            // Something went wrong while saving data on the db server
              self.set_sql_message(res.data.result);
              var err_msg = gettext('%s.', res.data.result);
              alertify.error(err_msg, 20);
              // If the transaction is not idle, notify the user that previous queries are not rolled back,
              // only the failed save queries.
              if (transaction_status != 0)
                alertify.info(gettext('Saving data changes was rolled back but the current transaction is ' +
                                      'still active; previous queries are unaffected.'));
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

            var query_history_info_msg = gettext('This query was generated by pgAdmin as part of a "Save Data" operation');

            _.each(res.data.query_results, function(r) {
              var history_entry = {
                'status': r.status,
                'start_time': save_start_time,
                'query': r.sql,
                'row_affected': r.rows_affected,
                'total_time': null,
                'message': r.result,
                'query_source': QuerySources.SAVE_DATA,
                'is_pgadmin_query': true,
                'info': query_history_info_msg,
              };
              self.add_to_history(history_entry);
            });

            self.trigger('pgadmin-sqleditor:loading-icon:hide');

            grid.invalidate();
            if (self.close_on_save) {
              if(save_successful) {
                // Check for any other needed confirmations before closing
                self.check_needed_confirmations_before_closing_panel();
              }
              else {
                self.close_on_save = false;
              }
            }
          })
          .fail(function(e) {
            let stateParams = [view];
            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, e, 'save_data', stateParams, true
            );
            // Enable query tool buttons and cancel button only if query tool
            if(self.is_query_tool)
              self.disable_tool_buttons(false);
            if (msg)
              self.update_msg_history(false, msg);
          });
      },

      reset_data_store: function() {
        var self = this;
        // This holds all the inserted/updated/deleted data from grid
        self.data_store = {
          updated: {},
          added: {},
          staged_rows: {},
          deleted: {},
          updated_index: {},
          added_index: {},
        };
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
        return this._save_file(true);
      },

      // Set panel title.
      setTitle: function(title, is_file) {
        var self = this;
        var open_new_tab = self.browser_preferences.new_browser_tab_open;
        if(open_new_tab && open_new_tab.includes('qt')) {
          window.document.title = title;
        } else {
          _.each(pgWindow.default.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
            if (p.isVisible()) {
              panelTitleFunc.setQueryToolDockerTitle(p, self.is_query_tool, title, is_file);
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
            ok: gettext('Yes'),
            cancel: gettext('No'),
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
            $('#btn-save-file').prop('disabled', true);
            $('#btn-file-menu-save').css('display', 'none');

            // Update the flag as new content is just loaded.
            self.is_query_changed = false;
            setTimeout(() => { self.gridView.query_tool_obj.focus(); }, 200);
          })
          .fail(function(er) {
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            let stateParams = [_e];
            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, er, '_select_file_handler', stateParams, false
            );
            if (msg)
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
              $('#btn-save-file').prop('disabled', true);
              $('#btn-file-menu-save').css('display', 'none');

              // Update the flag as query is already saved.
              self.is_query_changed = false;
              setTimeout(() => { self.gridView.query_tool_obj.focus(); }, 200);
            }
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            if (self.close_on_save) {
              // Check for any other needed confirmations before closing
              self.check_needed_confirmations_before_closing_panel();
            }
          })
          .fail(function(er) {
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            let stateParams = [_e];
            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, er, '_save_file_handler', stateParams, false
            );
            if (msg)
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
            var open_new_tab = self.browser_preferences.new_browser_tab_open;
            if(open_new_tab && open_new_tab.includes('qt')) {
              title = window.document.title + ' *';
            } else {
              // Find the title of the visible panel
              _.each(pgWindow.default.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
                if (p.isVisible()) {
                  self.gridView.panel_title = $(p._title).text();
                }
              });

              title = self.gridView.panel_title + ' *';
            }
            self.setTitle(title);
          }

          $('#btn-save-file').prop('disabled', false);
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
          } else {
            return 1;
          }
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
      // This function will show the new connection.
      _show_new_connection: function() {
        let self = this,
          reconnect = false;

        /* When server is disconnected and connected, connection is lost,
         * To reconnect pass true
         */
        if (arguments.length > 0 && arguments[arguments.length - 1] == 'connect') {
          reconnect = true;
        }

        newConnectionHandler.dialog(self, reconnect, self.browser_preferences);
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
            if (msg)
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
            if (msg)
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
            if (msg)
              alertify.alert(gettext('Remove Filter Error'), msg);
          });
      },

      // This function will copy the selected row.
      _copy_row: copyData,

      _copy_row_with_header: function() {
        $('.copy-with-header').toggleClass('visibility-hidden');
      },

      // This function will enable Paste button if data is copied in some other active session
      _copied_in_other_session: function(e, copiedWithHeaders) {
        pgAdmin.SqlEditor.copiedInOtherSessionWithHeaders = copiedWithHeaders;
        $('#btn-paste-row').prop('disabled', false);
      },

      // This function will paste the selected row.
      _paste_row: function() {
        var self = this;
        let rowsText = clipboard.getTextFromClipboard();
        let copied_rows = pgadminUtils.CSVToArray(rowsText, self.preferences.results_grid_field_separator, self.preferences.results_grid_quote_char);
        // Do not parse row if rows are copied with headers
        if(pgAdmin.SqlEditor.copiedInOtherSessionWithHeaders) {
          copied_rows = copied_rows.slice(1);
        }
        copied_rows = copied_rows.reduce((partial, values) => {
          // split each row with field separator character
          let row = {};
          for (let col in self.columns) {
            let v = values[col];

            // set value to default or null depending on column metadata
            if(v === '') {
              if(self.columns[col].has_default_val) {
                v = undefined;
              } else {
                v = null;
              }
            }
            row[self.columns[col].name] = v;
          }
          partial.push(row);
          return partial;
        }, []);

        // If there are rows to paste?
        if (copied_rows.length > 0) {
          // Enable save button so that user can
          // save newly pasted rows on server
          $('#btn-save-data').prop('disabled', false);

          var grid = self.slickgrid,
            dataView = grid.getData(),
            count = dataView.getLength(),
            array_types = [];
          // for quick look up create list of array data types
          for (var k in self.columns) {
            if (self.columns[k].is_array) {
              array_types.push(self.columns[k].name);
            }
          }

          var arr_to_object = function (arr) {
            var obj = {};

            _.each(arr, function (val, i) {
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
          _.each(copied_rows, function (row) {
            var new_row = arr_to_object(row),
              _key = (self.gridView.client_primary_key_counter++).toString();
            new_row.is_row_copied = true;
            self.temp_new_rows.push(count);
            new_row[self.client_primary_key] = _key;
            if (self.has_oids && new_row.oid) {
              new_row.oid = null;
            }

            dataView.addItem(new_row);
            self.data_store.added[_key] = {
              'err': false,
              'data': new_row,
            };
            self.data_store.added_index[count] = _key;
            count++;
          });
          dataView.endUpdate();
          grid.invalidateRow(grid.getSelectedRows());
          grid.updateRowCount();
          grid.render();
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
                } else {
                  alertify.alert(gettext('Change limit Error'), res.data.result);
                }
              }, 10
            );
          })
          .fail(function(e) {
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, e, '_set_limit', [], true
            );
            if (msg)
              alertify.alert(gettext('Change limit Error'), msg);
          });
      },

      // This function is used to enable/disable buttons
      disable_tool_buttons: function(disabled, disable_cancel=null) {
        let mode_disabled = disabled;

        /* Buttons be always disabled in view/edit mode */
        if(!this.is_query_tool) {
          mode_disabled = true;
        }

        $('#btn-explain').prop('disabled', mode_disabled);
        $('#btn-explain-analyze').prop('disabled', mode_disabled);
        $('#btn-explain-options-dropdown').prop('disabled', mode_disabled);
        $('#btn-edit-dropdown').prop('disabled', mode_disabled);
        $('#btn-load-file').prop('disabled', mode_disabled);
        $('#btn-save-file').prop('disabled', mode_disabled);
        $('#btn-file-menu-dropdown').prop('disabled', mode_disabled);
        $('#btn-find').prop('disabled', mode_disabled);
        $('#btn-find-menu-dropdown').prop('disabled', mode_disabled);
        $('#btn-macro-dropdown').prop('disabled', mode_disabled);

        if (this.is_query_tool) {

          if(disable_cancel !== null)
            $('#btn-cancel-query').prop('disabled', disable_cancel);
          // Cancel query tool needs opposite behaviour if not explicitly given
          else
            $('#btn-cancel-query').prop('disabled', !disabled);

          if(this.is_transaction_buttons_disabled) {
            $('#btn-query-dropdown').prop('disabled', disabled);
          } else {
            $('#btn-query-dropdown').prop('disabled', true);
          }
        } else {
          $('#btn-query-dropdown').prop('disabled', mode_disabled);
        }
      },

      // This function is used to enable/disable commit/rollback buttons
      disable_transaction_buttons: function(disabled) {
        this.is_transaction_buttons_disabled = disabled;
        if (this.is_query_tool) {
          $('#btn-commit').prop('disabled', disabled);
          $('#btn-rollback').prop('disabled', disabled);
        }
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
            if(!_.isUndefined(self.download_csv_obj)) {
              self.download_csv_obj.abort();
              $('#btn-flash').prop('disabled', false);
              $('#btn-download').prop('disabled', false);
              self.trigger(
                'pgadmin-sqleditor:loading-icon:hide');
            }
            setTimeout(() => { self.gridView.query_tool_obj.focus(); }, 200);
          })
          .fail(function(e) {
            self.disable_tool_buttons(false);

            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, e, '_cancel_query', [], false
            );
            if (msg)
              alertify.alert(gettext('Cancel Query Error'), msg);
          });
      },

      // Trigger query result download to csv.
      trigger_csv_download: function(query, filename) {
        var self = this,
          url = url_for('sqleditor.query_tool_download', {
            'trans_id': self.transId,
          }),
          data = { query: query, filename: filename };

        // Disable the Execute button
        $('#btn-flash').prop('disabled', true);
        $('#btn-download').prop('disabled', true);
        self.disable_tool_buttons(true);
        self.set_sql_message('');
        self.trigger(
          'pgadmin-sqleditor:loading-icon:show',
          gettext('Downloading CSV...')
        );

        // Get the CSV file
        self.download_csv_obj = $.ajax({
          type: 'POST',
          url: url,
          data: data,
          cache: false,
        }).done(function(response) {
          // if response.data present, extract the message
          if(!_.isUndefined(response.data)) {
            if(!response.status) {
              self._highlight_error(response.data.result);
              self.set_sql_message(response.data.result);
            }
          } else {
            let respBlob = new Blob([response], {type : 'text/csv'}),
              urlCreator = window.URL || window.webkitURL,
              download_url = urlCreator.createObjectURL(respBlob),
              current_browser = pgAdmin.Browser.get_browser(),
              link = document.createElement('a');

            document.body.appendChild(link);

            if (current_browser.name === 'IE' && window.navigator.msSaveBlob) {
            // IE10+ : (has Blob, but not a[download] or URL)
              window.navigator.msSaveBlob(respBlob, filename);
            } else {
              link.setAttribute('href', download_url);
              link.setAttribute('download', filename);
              link.click();
            }

            document.body.removeChild(link);
            self.download_csv_obj = undefined;
          }

          // Enable the execute button
          $('#btn-flash').prop('disabled', false);
          $('#btn-download').prop('disabled', false);
          self.disable_tool_buttons(false);
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
        }).fail(function(err) {
          let msg = '';
          // Enable the execute button
          $('#btn-flash').prop('disabled', false);
          $('#btn-download').prop('disabled', false);
          self.disable_tool_buttons(false);
          self.trigger('pgadmin-sqleditor:loading-icon:hide');


          if (err.statusText == 'abort') {
            msg = gettext('CSV Download cancelled.');
          } else {
            msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, err, 'trigger_csv_download', [], true
            );
          }
          // Check if error message is present
          if (msg)
            alertify.alert(gettext('Download CSV error'), msg);
        });
      },

      call_cache_preferences: function() {
        let browser = pgWindow.default.pgAdmin.Browser;
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
          })
          .fail(function(e) {

            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, e, '_auto_rollback', [], true
            );
            if (msg)
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
          })
          .fail(function(e) {
            let msg = httpErrorHandler.handleQueryToolAjaxError(
              pgAdmin, self, e, '_auto_commit', [], true
            );
            if (msg)
              alertify.alert(gettext('Auto Commit Error'), msg);
          });

      },

      _toggle_explain_option: function(type) {
        let selector = `.explain-${type}`;
        $(selector).toggleClass('visibility-hidden');
      },

      // This function will toggle "verbose" option in explain
      _explain_verbose: function() {
        this._toggle_explain_option('verbose');
      },

      // This function will toggle "costs" option in explain
      _explain_costs: function() {
        this._toggle_explain_option('costs');
      },

      // This function will toggle "buffers" option in explain
      _explain_buffers: function() {
        this._toggle_explain_option('buffers');
      },

      // This function will toggle "timing" option in explain
      _explain_timing: function() {
        this._toggle_explain_option('timing');
      },

      _explain_summary: function() {
        this._toggle_explain_option('summary');
      },

      _explain_settings: function() {
        this._toggle_explain_option('settings');
      },

      _show_query_tool: function() {
        var self = this;
        var open_new_tab = self.browser_preferences.new_browser_tab_open;
        if (open_new_tab && open_new_tab.includes('qt')) {
          is_main_window_alive();
        }
        this._open_query_tool(self);
      },

      _open_query_tool: function(that) {

        const transId = pgadminUtils.getRandomInt(1, 9999999);

        let url_endpoint = url_for('datagrid.panel', {
          'trans_id': transId,
        });

        url_endpoint += `?is_query_tool=${true}`
          +`&sgid=${that.url_params.sgid}`
          +`&sid=${that.url_params.sid}`
          +`&server_type=${that.url_params.server_type}`;

        if(that.url_params.did) {
          url_endpoint += `&did=${that.url_params.did}`;
        }

        let panel_title = that.url_params.title;
        if(that.url_params.is_query_tool == 'false') {//check whether query tool is hit from View/Edit
          var split_title = that.url_params.title.split('/');
          if(split_title.length > 2) {
            panel_title = split_title[split_title.length-2] + '/' + split_title[split_title.length-1];
          }
        }

        launchDataGrid(pgWindow.default.pgAdmin.DataGrid, transId, url_endpoint, panel_title, '', alertify);
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

      /*
       * This function will format the SQL
       */
      _format_sql: function() {
        var self = this,
          editor = self.gridView.query_tool_obj,
          selection = true,
          sql = '';

        sql = editor.getSelection();

        if (sql == '') {
          sql = editor.getValue();
          selection = false;
        }

        $.ajax({
          url: url_for('sql.format'),
          data: JSON.stringify({'sql': sql}),
          method: 'POST',
          contentType: 'application/json',
          dataType: 'json',
        })
          .done(function(res) {
            if (selection === true) {
              editor.replaceSelection(res.data.sql, 'around');
            } else {
              editor.setValue(res.data.sql);
            }
          })
          .fail(function() {
          /* failure should be ignored */
          });
      },

      // This function will open the manage macro dialog
      _manage_macros: function() {
        let self = this;

        /* When server is disconnected and connected, connection is lost,
         * To reconnect pass true
         */
        MacroHandler.dialog(self);
      },

      // This function will open the manage macro dialog
      _execute_macro: function() {

        queryToolActions.executeMacro(this.handler);

      },


      isQueryRunning: function() {
        return is_query_running;
      },

      setIsQueryRunning: function(value) {
        is_query_running = value;
      },

      /* Checks if there is any unsaved data changes, unsaved changes in the query
      or uncommitted transactions before closing a panel */
      check_needed_confirmations_before_closing_panel: function(is_close_event_call = false) {
        var self = this, msg;

        /*
         is_close_event_call = true only when the function is called when the
         close panel event is triggered, otherwise (on recursive calls) it is false
        */
        if(!self.ignore_on_close || is_close_event_call)
          self.ignore_on_close = {
            unsaved_data: false,
            unsaved_query: false,
          };

        var ignore_unsaved_data = self.ignore_on_close.unsaved_data,
          ignore_unsaved_query = self.ignore_on_close.unsaved_query;

        // If there is unsaved data changes in the grid
        if (!ignore_unsaved_data && self.can_edit
            && self.preferences.prompt_save_data_changes &&
            self.data_store &&
             (_.size(self.data_store.added) ||
              _.size(self.data_store.updated) ||
              _.size(self.data_store.deleted))) {
          msg = gettext('The data has changed. Do you want to save changes?');
          self.unsaved_changes_user_confirmation(msg, true);
        } // If there is unsaved query changes in the query editor
        else if (!ignore_unsaved_query && self.is_query_tool
                   && self.is_query_changed
                   && self.preferences.prompt_save_query_changes) {
          msg = gettext('The text has changed. Do you want to save changes?');
          self.unsaved_changes_user_confirmation(msg, false);
        } // If a transaction is currently ongoing
        else if (self.preferences.prompt_commit_transaction
                 && (self.last_transaction_status === queryTxnStatus.TRANSACTION_STATUS_INTRANS
                    || self.last_transaction_status === queryTxnStatus.TRANSACTION_STATUS_INERROR)) {
          var is_commit_disabled = self.last_transaction_status == queryTxnStatus.TRANSACTION_STATUS_INERROR;
          self.uncommitted_transaction_user_confirmation(is_commit_disabled);
        }
        else {
          // No other function should call close() except through this function
          // in order to perform necessary checks
          self.ignore_on_close = undefined;
          self.close();
        }
        // Return false so that the panel does not close unless close()
        // is called explicitly (when all needed prompts are issued).
        return false;
      },

      /* To prompt the user for uncommitted transaction */
      uncommitted_transaction_user_confirmation: function(is_commit_disabled = false) {
        var self = this;

        alertify.confirmCommit || alertify.dialog('confirmCommit', function() {
          return {
            main: function(title, message, is_commit_disabled_arg) {
              this.is_commit_disabled = is_commit_disabled_arg;
              this.setHeader(title);
              this.setContent(message);
            },
            setup: function() {
              return {
                buttons: [{
                  text: gettext('Cancel'),
                  key: 27, // ESC
                  invokeOnClose: true,
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                }, {
                  text: gettext('Rollback'),
                  className: 'btn btn-primary fa fa-lg pg-alertify-button',
                }, {
                  text: gettext('Commit'),
                  className: 'btn btn-primary fa fa-lg pg-alertify-button',
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
            prepare: function() {
              // Disable commit button if needed
              if(this.is_commit_disabled)
                this.__internal.buttons[2].element.disabled = true;
              else
                this.__internal.buttons[2].element.disabled = false;
            },
            callback: function(closeEvent) {
              switch (closeEvent.index) {
              case 0: // Cancel
                //Do nothing.
                break;
              case 1: // Rollback
                self.close_on_idle_transaction = true;
                queryToolActions.executeRollback(self);
                break;
              case 2: // Commit
                self.close_on_idle_transaction = true;
                queryToolActions.executeCommit(self);
                break;
              }
            },
          };
        });

        let msg = gettext('The current transaction is not commited to the database. '
                           + 'Do you want to commit or rollback the transaction?');

        alertify.confirmCommit(gettext('Commit transaction?'), msg, is_commit_disabled);
      },

      /* To prompt user for unsaved changes */
      unsaved_changes_user_confirmation: function(msg, is_unsaved_data) {
        // If there is anything to save then prompt user
        var self = this;

        alertify.confirmSave || alertify.dialog('confirmSave', function() {
          return {
            main: function(title, message, is_unsaved_data_arg) {
              this.is_unsaved_data = is_unsaved_data_arg;
              this.setHeader(title);
              this.setContent(message);
            },
            setup: function() {
              return {
                buttons: [{
                  text: gettext('Cancel'),
                  key: 27, // ESC
                  invokeOnClose: true,
                  className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
                }, {
                  text: gettext('Don\'t save'),
                  className: 'btn btn-secondary fa fa-lg fa-trash-alt pg-alertify-button',
                }, {
                  text: gettext('Save'),
                  className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button',
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
              case 0: // Cancel
                //Do nothing.
                break;
              case 1: // Don't Save
                self.close_on_save = false;
                if(this.is_unsaved_data)
                  self.ignore_on_close.unsaved_data = true;
                else
                  self.ignore_on_close.unsaved_query = true;
                // Go back to check for any other needed confirmations before closing
                if (!self.check_needed_confirmations_before_closing_panel()){
                  closeEvent.cancel = true;
                }
                break;
              case 2: //Save
                self.close_on_save = true;
                if(this.is_unsaved_data) {
                  self.save_data();
                }
                else {
                  self._save_file();
                }
                break;
              }
            },
          };
        });
        alertify.confirmSave(gettext('Save changes?'), msg, is_unsaved_data);
      },

      close: function() {
        var self = this;

        pgBrowser.Events.off('pgadmin:user:logged-in', this.initTransaction);
        _.each(pgWindow.default.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(panel) {
          if (panel.isVisible()) {
            window.onbeforeunload = null;
            panel.off(wcDocker.EVENT.CLOSING);
            // remove col_size object on panel close
            if (!_.isUndefined(self.col_size)) {
              delete self.col_size;
            }
            pgWindow.default.pgAdmin.Browser.docker.removePanel(panel);
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
  };

  return pgAdmin.SqlEditor;
});
