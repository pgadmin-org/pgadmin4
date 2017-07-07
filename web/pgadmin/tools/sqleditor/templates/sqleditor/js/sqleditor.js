define([
    'sources/gettext','sources/url_for', 'jquery', 'underscore', 'underscore.string', 'alertify',
    'pgadmin', 'backbone', 'backgrid', 'codemirror', 'pgadmin.misc.explain',
    'sources/selection/grid_selector',
    'sources/selection/active_cell_capture',
    'sources/selection/clipboard',
    'sources/selection/copy_data',
    'sources/selection/range_selection_helper',
    'sources/slickgrid/event_handlers/handle_query_output_keyboard_event',
    'sources/selection/xcell_selection_model',
    'sources/selection/set_staged_rows',
    'sources/sqleditor_utils',
    'sources/alerts/alertify_wrapper',

    'sources/generated/history',
    'sources/generated/reactComponents',

    'slickgrid', 'bootstrap', 'pgadmin.browser', 'wcdocker',
    'codemirror/mode/sql/sql', 'codemirror/addon/selection/mark-selection',
    'codemirror/addon/selection/active-line', 'codemirror/addon/fold/foldcode',
    'codemirror/addon/fold/foldgutter', 'codemirror/addon/hint/show-hint',
    'codemirror/addon/hint/sql-hint', 'pgadmin.file_manager',
    'pgadmin-sqlfoldcode',
    'codemirror/addon/scroll/simplescrollbars',
    'codemirror/addon/dialog/dialog',
    'codemirror/addon/search/search',
    'codemirror/addon/search/searchcursor',
    'codemirror/addon/search/jump-to-line',
    'codemirror/addon/edit/matchbrackets',
    'codemirror/addon/edit/closebrackets',

    'backgrid.sizeable.columns',
    'slick.pgadmin.formatters',
    'slick.pgadmin.editors',
], function(
  gettext, url_for, $, _, S, alertify, pgAdmin, Backbone, Backgrid, CodeMirror,
  pgExplain, GridSelector, ActiveCellCapture, clipboard, copyData, RangeSelectionHelper, handleQueryOutputKeyboardEvent,
    XCellSelectionModel, setStagedRows,  SqlEditorUtils, AlertifyWrapper, HistoryBundle, reactComponents
) {
    /* Return back, this has been called more than once */
    if (pgAdmin.SqlEditor)
      return pgAdmin.SqlEditor;

    // Some scripts do export their object in the window only.
    // Generally the one, which do no have AMD support.
    var wcDocker = window.wcDocker,
        pgBrowser = pgAdmin.Browser,
        Slick = window.Slick;

    // Define key codes for shortcut keys
    var F5_KEY = 116,
        F7_KEY = 118,
        F8_KEY = 119;

    var is_query_running = false;

    // Defining Backbone view for the sql grid.
    var SQLEditorView = Backbone.View.extend({
      initialize: function(opts) {
        this.$el = opts.el;
        this.handler = opts.handler;
        this.handler['col_size'] = {};
      },

      // Bind all the events
      events: {
        "click .btn-load-file": "on_file_load",
        "click #btn-save": "on_save",
        "click #btn-file-menu-save": "on_save",
        "click #btn-file-menu-save-as": "on_save_as",
        "click #btn-find": "on_find",
        "click #btn-find-menu-find": "on_find",
        "click #btn-find-menu-find-next": "on_find_next",
        "click #btn-find-menu-find-previous": "on_find_previous",
        "click #btn-find-menu-replace": "on_replace",
        "click #btn-find-menu-replace-all": "on_replace_all",
        "click #btn-find-menu-find-persistent": "on_find_persistent",
        "click #btn-find-menu-jump": "on_jump",
        "click #btn-delete-row": "on_delete",
        "click #btn-filter": "on_show_filter",
        "click #btn-filter-menu": "on_show_filter",
        "click #btn-include-filter": "on_include_filter",
        "click #btn-exclude-filter": "on_exclude_filter",
        "click #btn-remove-filter": "on_remove_filter",
        "click #btn-apply": "on_apply",
        "click #btn-cancel": "on_cancel",
        "click #btn-copy-row": "on_copy_row",
        "click #btn-paste-row": "on_paste_row",
        "click #btn-flash": "on_flash",
        "click #btn-flash-menu": "on_flash",
        "click #btn-cancel-query": "on_cancel_query",
        "click #btn-download": "on_download",
        "click #btn-edit": "on_clear",
        "click #btn-clear": "on_clear",
        "click #btn-auto-commit": "on_auto_commit",
        "click #btn-auto-rollback": "on_auto_rollback",
        "click #btn-clear-history": "on_clear_history",
        "click .noclose": 'do_not_close_menu',
        "click #btn-explain": "on_explain",
        "click #btn-explain-analyze": "on_explain_analyze",
        "click #btn-explain-verbose": "on_explain_verbose",
        "click #btn-explain-costs": "on_explain_costs",
        "click #btn-explain-buffers": "on_explain_buffers",
        "click #btn-explain-timing": "on_explain_timing",
        "change .limit": "on_limit_change",
        "keydown": "keyAction"
      },

      // This function is used to render the template.
      render: function() {
        var self = this,
          filter = self.$el.find('#sql_filter');

        $('.editor-title').text(_.unescape(self.editor_title));
        self.filter_obj = CodeMirror.fromTextArea(filter.get(0), {
            lineNumbers: true,
            indentUnit: 4,
            mode: "text/x-pgsql",
            foldOptions: {
              widget: "\u2026"
            },
            foldGutter: {
              rangeFinder: CodeMirror.fold.combine(CodeMirror.pgadminBeginRangeFinder, CodeMirror.pgadminIfRangeFinder,
                                CodeMirror.pgadminLoopRangeFinder, CodeMirror.pgadminCaseRangeFinder)
            },
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: pgBrowser.editor_shortcut_keys,
            tabSize: pgAdmin.Browser.editor_options.tabSize,
            lineWrapping: pgAdmin.Browser.editor_options.wrapCode,
            autoCloseBrackets: pgAdmin.Browser.editor_options.insert_pair_brackets,
            matchBrackets: pgAdmin.Browser.editor_options.brace_matching
        });

        // Create main wcDocker instance
        var main_docker = new wcDocker(
          '#editor-panel', {
          allowContextMenu: false,
          allowCollapse: false,
          themePath: url_for('static', {'filename': 'css'}),
          theme: 'webcabin.overrides.css'
        });

        var sql_panel = new pgAdmin.Browser.Panel({
          name: 'sql_panel',
          title: false,
          width: '100%',
          height:'20%',
          isCloseable: false,
          isPrivate: true
        });

        sql_panel.load(main_docker);
        var sql_panel_obj = main_docker.addPanel('sql_panel', wcDocker.DOCK.TOP);

        var text_container = $('<textarea id="sql_query_tool"></textarea>');
        var output_container = $('<div id="output-panel"></div>').append(text_container);
        sql_panel_obj.$container.find('.pg-panel-content').append(output_container);

        self.query_tool_obj = CodeMirror.fromTextArea(text_container.get(0), {
            lineNumbers: true,
            indentUnit: 4,
            styleSelectedText: true,
            mode: "text/x-pgsql",
            foldOptions: {
              widget: "\u2026"
            },
            foldGutter: {
              rangeFinder: CodeMirror.fold.combine(CodeMirror.pgadminBeginRangeFinder, CodeMirror.pgadminIfRangeFinder,
                                CodeMirror.pgadminLoopRangeFinder, CodeMirror.pgadminCaseRangeFinder)
            },
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: pgBrowser.editor_shortcut_keys,
            tabSize: pgAdmin.Browser.editor_options.tabSize,
            lineWrapping: pgAdmin.Browser.editor_options.wrapCode,
            scrollbarStyle: 'simple',
            autoCloseBrackets: pgAdmin.Browser.editor_options.insert_pair_brackets,
            matchBrackets: pgAdmin.Browser.editor_options.brace_matching
        });

        // Refresh Code mirror on SQL panel resize to
        // display its value properly
        sql_panel_obj.on(wcDocker.EVENT.RESIZE_ENDED, function() {
          setTimeout(function() {
            if(self && self.query_tool_obj) {
              self.query_tool_obj.refresh();
            }
          }, 200);
        });

        // Create panels for 'Data Output', 'Explain', 'Messages' and 'History'
        var data_output = new pgAdmin.Browser.Panel({
          name: 'data_output',
          title: gettext("Data Output"),
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div id ="datagrid" class="sql-editor-grid-container text-12"></div>'
        })

        var explain = new pgAdmin.Browser.Panel({
          name: 'explain',
          title: gettext("Explain"),
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div class="sql-editor-explain"></div>'
        })

        var messages = new pgAdmin.Browser.Panel({
          name: 'messages',
          title: gettext("Messages"),
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div class="sql-editor-message"></div>'
        })

        var history = new pgAdmin.Browser.Panel({
          name: 'history',
          title: gettext("History"),
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div id ="history_grid" class="sql-editor-history-container"></div>'
        })

        // Load all the created panels
        data_output.load(main_docker);
        explain.load(main_docker);
        messages.load(main_docker);
        history.load(main_docker);

        // Add all the panels to the docker
        self.data_output_panel = main_docker.addPanel('data_output', wcDocker.DOCK.BOTTOM, sql_panel_obj);
        self.explain_panel = main_docker.addPanel('explain', wcDocker.DOCK.STACKED, self.data_output_panel);
        self.messages_panel = main_docker.addPanel('messages', wcDocker.DOCK.STACKED, self.data_output_panel);
        self.history_panel = main_docker.addPanel('history', wcDocker.DOCK.STACKED, self.data_output_panel);

        self.render_history_grid();

        if (!self.handler.is_new_browser_tab) {
          // Listen on the panel closed event and notify user to save modifications.
          _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
            if(p.isVisible()) {
              p.on(wcDocker.EVENT.CLOSING, function() {
                // Only if we can edit data then perform this check
                var notify = false, msg;
                if(self.handler.can_edit) {
                  var data_store = self.handler.data_store;
                  if(data_store && (_.size(data_store.added) ||
                      _.size(data_store.updated))) {
                    msg = gettext("The data has changed. Do you want to save changes?");
                    notify = true;
                  }
                } else if(self.handler.is_query_tool && self.handler.is_query_changed) {
                  msg = gettext("The text has changed. Do you want to save changes?");
                  notify = true;
                }
                if(notify) {return self.user_confirmation(p, msg);}
                return true;
              });
              // Set focus on query tool of active panel
              p.on(wcDocker.EVENT.GAIN_FOCUS, function() {
                if (!$(p.$container).hasClass('wcPanelTabContentHidden')) {
                  setTimeout(function() {
                    self.handler.gridView.query_tool_obj.focus();
                  }, 200);
                }
              });
            }
          });
        }

        // set focus on query tool once loaded
        setTimeout(function() {
          self.query_tool_obj.focus();
        }, 500);

        /* We have override/register the hint function of CodeMirror
         * to provide our own hint logic.
         */
        CodeMirror.registerHelper("hint", "sql", function(editor, options) {
          var data = [],
              doc = editor.getDoc(),
              cur = doc.getCursor(),
              // Get the current cursor position
              current_cur = cur.ch,
              // function context
              ctx = {
                editor: editor,
                // URL for auto-complete
                url: url_for('sqleditor.autocomplete', {'trans_id': self.transId}),
                data: data,
                // Get the line number in the cursor position
                current_line: cur.line,
                /*
                 * Render function for hint to add our own class
                 * and icon as per the object type.
                 */
                hint_render: function(elt, data, cur) {
                  var el = document.createElement('span');

                  switch(cur.type) {
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
                }
              };

          data.push(doc.getValue());
          // Get the text from start to the current cursor position.
          data.push(
            doc.getRange(
              { line: 0, ch: 0 },
              { line: ctx.current_line, ch: current_cur }
            )
          );

          return {
            then: function(cb) {
              var self = this;
              // Make ajax call to find the autocomplete data
              $.ajax({
                url: self.url,
                method: 'POST',
                contentType: "application/json",
                data: JSON.stringify(self.data),
                success: function(res) {
                  var result = [];

                  _.each(res.data.result, function(obj, key) {
                    result.push({
                      text: key, type: obj.object_type,
                      render: self.hint_render
                    });
                  });

                  // Sort function to sort the suggestion's alphabetically.
                  result.sort(function(a, b){
                    var textA = a.text.toLowerCase(), textB = b.text.toLowerCase();
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
                  var token = self.editor.getTokenAt(cur), start, end, search;
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
                    search = "";
                  }

                  /*
                   * Added 1 in the start position if search string
                   * started with "." or "`" else auto complete of code mirror
                   * will remove the "." when user select any suggestion.
                   */
                  if (search.charAt(0) == "." || search.charAt(0) == "``")
                    start += 1;

                  cb({
                    list: result,
                    from: {line: self.current_line, ch: start },
                    to: { line: self.current_line, ch: end }
                  });
                }
              });
            }.bind(ctx)
          };
        });
      },

      /* To prompt user for unsaved changes */
      user_confirmation: function(panel, msg) {
        // If there is anything to save then prompt user
        var that = this;

        alertify.confirmSave || alertify.dialog('confirmSave', function() {
          return {
            main: function(title, message) {
                var content = '<div class="ajs-content">'
                + gettext('The text has changed. Do you want to save changes?')
                + '</div>';
              this.setHeader(title);
              this.setContent(message);
            },
            setup: function () {
              return {
                buttons: [
                    {
                      text: gettext('Save'),
                      className: 'btn btn-primary',
                    },{
                      text: gettext('Don\'t save'),
                      className: 'btn btn-danger',
                    },{
                      text: gettext('Cancel'),
                      key: 27, // ESC
                      invokeOnClose: true,
                      className: 'btn btn-warning',
                    }
                ],
                focus: {
                      element: 0,
                      select: false
                },
                options: {
                    maximizable: false,
                    resizable: false
                }
              };
            },
            callback: function (closeEvent) {
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
            }
          };
        });
        alertify.confirmSave(gettext("Save changes?"), msg);
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
          added_index: {}
        };

        // To store primary keys before they gets changed
        self.handler.primary_keys_data = {};

        self.client_primary_key = client_primary_key;

        self.client_primary_key_counter = 0;

        // Remove any existing grid first
        if (self.handler.slickgrid) {
            self.handler.slickgrid.destroy();
        }

        if(!_.isArray(collection) || !_.size(collection)) {
          collection = [];
        }

        var grid_columns = [],
          table_name;
        var column_size = self.handler['col_size'],
          query = self.handler.query,
          // Extract table name from query
          table_list = query.match(/select.*from\s+(\w+)/i);

        if (!table_list) {
          table_name = SqlEditorUtils.getHash(query);
        }
        else {
          table_name = table_list[1];
        }

        self.handler['table_name'] = table_name;
        column_size[table_name] = column_size[table_name] || {};

        var grid_width = $($('#editor-panel').find('.wcFrame')[1]).width();
        _.each(columns, function(c) {
            var options = {
              id: c.name,
              pos: c.pos,
              field: c.name,
              name: c.label,
              display_name: c.display_name,
              column_type: c.column_type,
              not_null: c.not_null,
              has_default_val: c.has_default_val
            };

            // Get the columns width based on longer string among data type or
            // column name.
            var column_type = c.column_type.trim();
            var label = c.name.length > column_type.length ? c.name : column_type;

            if (_.isUndefined(column_size[table_name][c.name])) {
              options['width'] = SqlEditorUtils.calculateColumnWidth(label);
              column_size[table_name][c.name] = options['width'];
            }
            else {
              options['width'] = column_size[table_name][c.name];
            }

            // If grid is editable then add editor else make it readonly
            if(c.cell == 'Json') {
              options['editor'] = is_editable ? Slick.Editors.JsonText
                                              : Slick.Editors.ReadOnlyJsonText;
              options['formatter'] = Slick.Formatters.JsonString;
            } else if(c.cell == 'number' ||
              $.inArray(c.type, ['oid', 'xid', 'real']) !== -1
            ) {
              options['editor'] = is_editable ? Slick.Editors.CustomNumber
                                              : Slick.Editors.ReadOnlyText;
              options['formatter'] = Slick.Formatters.Numbers;
            } else if(c.cell == 'boolean') {
              options['editor'] = is_editable ? Slick.Editors.Checkbox
                                              : Slick.Editors.ReadOnlyCheckbox;
              options['formatter'] = Slick.Formatters.Checkmark;
            } else {
              options['editor'] = is_editable ? Slick.Editors.pgText
                                                : Slick.Editors.ReadOnlypgText;
              options['formatter'] = Slick.Formatters.Text;
            }

           grid_columns.push(options)
        });

        var gridSelector = new GridSelector();
        grid_columns = self.grid_columns = gridSelector.getColumnDefinitions(grid_columns);

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
          autoEdit: false
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
          var res = {}, cssClass = '',
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
            _.indexOf(self.handler.rows_to_disable, i) !== -1
          ) {
            cssClass += ' disabled_row';
          }
          return {'cssClasses': cssClass};
        };

        grid.registerPlugin( new Slick.AutoTooltips({ enableForHeaderCells: false }) );
        grid.registerPlugin(new ActiveCellCapture());
        grid.setSelectionModel(new XCellSelectionModel());
        grid.registerPlugin(gridSelector);

        var editor_data = {
          keys: self.handler.primary_keys,
          vals: collection,
          columns: columns,
          grid: grid,
          selection: grid.getSelectionModel(),
          editor: self,
          client_primary_key: self.client_primary_key
        };

        self.handler.slickgrid = grid;

        // Listener function to watch selected rows from grid
        if (editor_data.selection) {
            editor_data.selection.onSelectedRangesChanged.subscribe(
                setStagedRows.bind(editor_data));
        }

        grid.onColumnsResized.subscribe(function (e, args) {
            var columns = this.getColumns();
            _.each(columns, function(col, key) {
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
        dataView.onRowCountChanged.subscribe(function (e, args) {
          grid.updateRowCount();
          grid.render();
        });

        // listen for rows change.
        dataView.onRowsChanged.subscribe(function (e, args) {
          grid.invalidateRows(args.rows);
          grid.render();
        });

        // Listener function which will be called before user updates existing cell
        // This will be used to collect primary key for that row
        grid.onBeforeEditCell.subscribe(function (e, args) {
            var before_data = args.item;

            // If newly added row is saved but grid is not refreshed,
            // then disable cell editing for that row
            if(self.handler.rows_to_disable &&
              _.contains(self.handler.rows_to_disable, args.row)) {
              return false;
            }

            if(self.handler.can_edit && before_data && self.client_primary_key in before_data) {
              var _pk = before_data[self.client_primary_key],
                _keys = self.handler.primary_keys,
                current_pk = {}, each_pk_key = {};

              // If already have primary key data then no need to go ahead
              if(_pk in self.handler.primary_keys_data) {
                return;
              }

              // Fetch primary keys for the row before they gets modified
              var _columns = self.handler.columns;
              _.each(_keys, function(value, key) {
                current_pk[key] = before_data[key];
              });
              // Place it in main variable for later use
              self.handler.primary_keys_data[_pk] = current_pk
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
        grid.onCellChange.subscribe(function (e, args) {
          // self.handler.data_store.updated will holds all the updated data
          var changed_column = args.grid.getColumns()[args.cell].field,
            updated_data = args.item[changed_column],                   // New value for current field
            _pk = args.item[self.client_primary_key] || null,                          // Unique key to identify row
            column_data = {},
            _type;

          // Access to row/cell value after a cell is changed.
          // The purpose is to remove row_id from temp_new_row
          // if new row has primary key instead of [default_value]
          // so that cell edit is enabled for that row.
          var grid = args.grid,
            row_data = grid.getDataItem(args.row),
            is_primary_key = _.all(
                _.values(
                  _.pick(
                      row_data, self.primary_keys
                  )
                ),
                function(val) {
                  return val != undefined
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

          if(_pk) {
            // Check if it is in newly added row by user?
            if(_pk in self.handler.data_store.added) {
              _.extend(
                self.handler.data_store.added[_pk]['data'],
                  column_data);
              //Find type for current column
              self.handler.data_store.added[_pk]['err'] = false
            // Check if it is updated data from existing rows?
            } else if(_pk in self.handler.data_store.updated) {
              _.extend(
                self.handler.data_store.updated[_pk]['data'],
                column_data
              );
              self.handler.data_store.updated[_pk]['err'] = false
            } else {
              // First updated data for this primary key
              self.handler.data_store.updated[_pk] = {
                'err': false, 'data': column_data,
                'primary_keys': self.handler.primary_keys_data[_pk]
              };
              self.handler.data_store.updated_index[args.row] = _pk;
            }
          }
          // Enable save button
          $("#btn-save").prop('disabled', false);
        }.bind(editor_data));

        // Listener function which will be called when user adds new rows
        grid.onAddNewRow.subscribe(function (e, args) {
          // self.handler.data_store.added will holds all the newly added rows/data
          var column = args.column,
            item = args.item, data_length = this.grid.getDataLength(),
            _key = (self.client_primary_key_counter++).toString(),
            dataView = this.grid.getData();

          // Add new row in list to keep track of it
          if (_.isUndefined(item[0])) {
            self.handler.temp_new_rows.push(data_length);
          }

          // If copied item has already primary key, use it.
          if(item) {
            item[self.client_primary_key] = _key;
          }

          dataView.addItem(item);
          self.handler.data_store.added[_key] = {'err': false, 'data': item};
          self.handler.data_store.added_index[data_length] = _key;
          // Fetch data type & add it for the column
          var temp = {};
          temp[column.name] = _.where(this.columns, {pos: column.pos})[0]['type'];
          grid.updateRowCount();
          grid.render();

          // Enable save button
          $("#btn-save").prop('disabled', false);
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
        })
        // Resize SlickGrid when window resize
        $( window ).resize( function() {
          // Resize grid only when 'Data Output' panel is visible.
          if(self.data_output_panel.isVisible()) {
            self.grid_resize(grid);
          }
        });

        // Resize SlickGrid when output Panel resize
        self.data_output_panel.on(wcDocker.EVENT.RESIZE_ENDED, function() {
          // Resize grid only when 'Data Output' panel is visible.
          if(self.data_output_panel.isVisible()) {
            self.grid_resize(grid);
          }
        });

        // Resize SlickGrid when output Panel gets focus
        self.data_output_panel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function() {
          // Resize grid only if output panel is visible
          if(self.data_output_panel.isVisible())
            self.grid_resize(grid);
        });

        for (var i = 0; i < collection.length; i++) {
          // Convert to dict from 2darray
          var item = {};
          for (var j = 1; j < grid_columns.length; j++) {
            item[grid_columns[j]['field']] = collection[i][grid_columns[j]['pos']]
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
        var self = this, url = '';

        // This will prevent fetch operation if previous fetch operation is
        // already in progress.
        self.handler.fetching_rows = true;

        $("#btn-flash").prop('disabled', true);

        if (fetch_all) {
          self.handler.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext('Fetching all records...')
          );
          url = url_for('sqleditor.fetch_all', {'trans_id': self.transId, 'fetch_all': 1});
        } else {
          url = url = url_for('sqleditor.fetch', {'trans_id': self.transId});
        }

        $.ajax({
          url: url,
          method: 'GET',
          success: function(res) {
            self.handler.has_more_rows = res.data.has_more_rows;
            $("#btn-flash").prop('disabled', false);
            self.handler.trigger('pgadmin-sqleditor:loading-icon:hide');
            self.update_grid_data(res.data.result);
            self.handler.fetching_rows = false;
            if (typeof cb == "function") {
              cb();
            }
          },
          error: function(e) {
            $("#btn-flash").prop('disabled', false);
            self.handler.trigger('pgadmin-sqleditor:loading-icon:hide');
            self.handler.has_more_rows = false;
            self.handler.fetching_rows = false;
            if (typeof cb == "function") {
              cb();
            }
            if (e.readyState == 0) {
              self.update_msg_history(false,
                gettext('Not connected to the server or the connection to the server has been closed.')
              );
              return;
            }
          }
        });
      },

      update_grid_data: function(data) {
        this.dataView.beginUpdate();

        for (var i = 0; i < data.length; i++) {
          // Convert 2darray to dict.
          var item = {};
          for (var j = 1; j < this.grid_columns.length; j++) {
            item[this.grid_columns[j]['field']] = data[i][this.grid_columns[j]['pos']]
          }

          item[this.client_primary_key] = (this.client_primary_key_counter++).toString();
          this.dataView.addItem(item);
        }

        this.dataView.endUpdate();
      },

      /* This function is responsible to render output grid */
      grid_resize: function(grid) {
        var h = $($('#editor-panel').find('.wcFrame')[1]).height() - 35;
        $('#datagrid').css({'height': h + 'px'});
        grid.resizeCanvas();
      },

      /* This function is responsible to create and render the
       * new backgrid for the history tab.
       */
      render_history_grid: function() {
        var self = this;

        self.history_collection = new HistoryBundle.HistoryCollection([]);

        var queryHistoryElement = reactComponents.React.createElement(
          reactComponents.QueryHistory, {historyCollection: self.history_collection});
        reactComponents.render(queryHistoryElement, $('#history_grid')[0]);
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
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("find");
      },

      // Callback function for the find next button click.
      on_find_next: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("findNext");
      },

      // Callback function for the find previous button click.
      on_find_previous: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("findPrev");
      },

      // Callback function for the replace button click.
      on_replace: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("replace");
      },

      // Callback function for the replace all button click.
      on_replace_all: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("replaceAll");
      },

      // Callback function for the find persistent button click.
      on_find_persistent: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("findPersistent");
      },

      // Callback function for the jump button click.
      on_jump: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        self.query_tool_obj.execCommand("jumpToLine");
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
        var self = this;

        // Trigger the flash signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:flash',
            self,
            self.handler
        );
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

      // Callback function for the download button click.
      on_download: function() {
        var self = this;

        // Trigger the download signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:download',
            self,
            self.handler
        );
      },

      // Callback function for the clear button click.
      on_clear: function(ev) {
        var self = this, sql;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        /* If is_query_changed flag is set to false then no need to
         * confirm with the user for unsaved changes.
         */
        if (self.handler.is_query_changed) {
          alertify.confirm(
            gettext("Unsaved changes"),
            gettext("Are you sure you wish to discard the current changes?"),
            function() {
              // Do nothing as user do not want to save, just continue
              self.query_tool_obj.setValue('');
            },
            function() {
              return true;
            }
          ).set('labels', {ok:'Yes', cancel:'No'});
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
        if(!self.history_collection.length()) { return; }

        alertify.confirm(gettext("Clear history"),
          gettext("Are you sure you wish to clear the history?"),
          function() {
            if (self.history_collection) {
              self.history_collection.reset();
            }
          },
          function() {
            return true;
          }
        ).set('labels', {ok:'Yes', cancel:'No'});
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
      on_explain: function(ev) {
        var self = this;

        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        // Trigger the explain signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:explain',
            self,
            self.handler
        );
      },

      // Callback function for explain analyze button click.
      on_explain_analyze: function(ev) {
        var self = this;

        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        // Trigger the explain analyze signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:explain-analyze',
            self,
            self.handler
        );
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

      /*
       * Callbacks for keyboard events bind to the
       * query tool buttons.
       * Following are the keyboard shortcuts:
       *  F5 - Execute query
       *  F7 - Explain query
       *  F8 - Download result as CSV
       *  Shift+F7 - Explain analyze query
       */
      keyAction: function(ev) {
        // return if query is running
        if (is_query_running) return;

        var keyCode = ev.which || ev.keyCode;
        if (ev.shiftKey && keyCode == F7_KEY) {
          // Explain analyze query.
          this.on_explain_analyze(ev);
          ev.preventDefault();
        } else if (keyCode == F5_KEY) {
          // Execute query.
          this.on_flash(ev);
          ev.preventDefault();
        } else if (keyCode == F7_KEY) {
          // Explain query.
          this.on_explain(ev);
          ev.preventDefault();
        } else if (keyCode == F8_KEY) {
          // Download query result as CSV.
          this.on_download(ev);
          ev.preventDefault();
        }
      }
    });

    /* Defining controller class for data grid, which actually
     * perform the operations like executing the sql query, poll the result,
     * render the data in the grid, Save/Refresh the data etc...
     */
    var SqlEditorController = function(container, options) {
      this.initialize.apply(this, arguments);
    };

    _.extend(
      SqlEditorController.prototype,
      Backbone.Events,
      {
        initialize: function(container, opts) {
          this.container = container;
        },

        /* This function is used to create instance of SQLEditorView,
         * call the render method of the grid view to render the backgrid
         * header and loading icon and start execution of the sql query.
         */
        start: function(is_query_tool, editor_title, script_sql, is_new_browser_tab) {
          var self = this;

          self.is_query_tool = is_query_tool;
          self.rows_affected = 0;
          self.marked_line_no = 0;
          self.explain_verbose = false;
          self.explain_costs = false;
          self.explain_buffers = false;
          self.explain_timing = false;
          self.is_new_browser_tab = is_new_browser_tab;
          self.has_more_rows = false;
          self.fetching_rows = false;
          self.close_on_save = false;

          // We do not allow to call the start multiple times.
          if (self.gridView)
            return;

          self.gridView = new SQLEditorView({
            el: self.container,
            handler: self
          });
          self.transId = self.gridView.transId = self.container.data('transId');

          self.gridView.editor_title = _.unescape(editor_title);
          self.gridView.current_file = undefined;

          // Render the header
          self.gridView.render();

          // Listen to the file manager button events
          pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:select_file', self._select_file_handler, self);
          pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:create_file', self._save_file_handler, self);

          // Listen to the codemirror on text change event
          // only in query editor tool
          if (self.is_query_tool) {
            self.get_preferences();
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
          self.on('pgadmin-sqleditor:button:flash', self._refresh, self);
          self.on('pgadmin-sqleditor:button:cancel-query', self._cancel_query, self);
          self.on('pgadmin-sqleditor:button:download', self._download, self);
          self.on('pgadmin-sqleditor:button:auto_rollback', self._auto_rollback, self);
          self.on('pgadmin-sqleditor:button:auto_commit', self._auto_commit, self);
          self.on('pgadmin-sqleditor:button:explain', self._explain, self);
          self.on('pgadmin-sqleditor:button:explain-analyze', self._explain_analyze, self);
          self.on('pgadmin-sqleditor:button:explain-verbose', self._explain_verbose, self);
          self.on('pgadmin-sqleditor:button:explain-costs', self._explain_costs, self);
          self.on('pgadmin-sqleditor:button:explain-buffers', self._explain_buffers, self);
          self.on('pgadmin-sqleditor:button:explain-timing', self._explain_timing, self);

          if (self.is_query_tool) {
            self.gridView.query_tool_obj.refresh();
            if(script_sql && script_sql !== '') {
              self.gridView.query_tool_obj.setValue(script_sql);
            }
          }
          else {
            // Disable codemirror by setting cursor to nocursor and background to dark.
            self.gridView.query_tool_obj.setOption("readOnly", 'nocursor');
            var cm = self.gridView.query_tool_obj.getWrapperElement();
            if (cm) {
              cm.className += ' bg-gray-1 opacity-5';
            }
            self.disable_tool_buttons(true);
            self._execute_data_query();
          }
        },

        // This function checks if there is any dirty data in the grid before
        // it executes the sql query
        _execute_data_query: function() {
          var self = this;

          // Check if the data grid has any changes before running query
          if(_.has(self, 'data_store') &&
                ( _.size(self.data_store.added) ||
                _.size(self.data_store.updated) ||
                _.size(self.data_store.deleted))
            ) {
                alertify.confirm(gettext("Unsaved changes"),
                  gettext("The data has been modified, but not saved. Are you sure you wish to discard the changes?"),
                  function(){
                    // Do nothing as user do not want to save, just continue
                    self._run_query();
                  },
                  function(){
                    // Stop, User wants to save
                    return true;
                  }
                ).set('labels', {ok:'Yes', cancel:'No'});
          } else {
            self._run_query();
          }
        },

        // This function makes the ajax call to execute the sql query.
        _run_query: function() {
          var self = this;
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
            gettext("Initializing query execution.")
          );

          $("#btn-flash").prop('disabled', true);

          self.trigger(
            'pgadmin-sqleditor:loading-icon:message',
            gettext("Waiting for the query execution to complete...")
          );

          $.ajax({
            url: url_for('sqleditor.view_data_start', {'trans_id': self.transId}),
            method: 'GET',
            success: function(res) {
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
                  $('#btn-filter').addClass('btn-warning');
                  $('#btn-filter-dropdown').addClass('btn-warning');
                }
                else {
                  $('#btn-filter').removeClass('btn-warning');
                  $('#btn-filter-dropdown').removeClass('btn-warning');
                  $('#btn-filter').addClass('btn-default');
                  $('#btn-filter-dropdown').addClass('btn-default');
                }
                $("#btn-save").prop('disabled', true);
                $("#btn-file-menu-dropdown").prop('disabled', true);
                $("#btn-copy-row").prop('disabled', true);
                $("#btn-paste-row").prop('disabled', true);

                // Set the combo box value
                $(".limit").val(res.data.limit);

                // If status is True then poll the result.
                self._poll();
              }
              else {
                self.trigger('pgadmin-sqleditor:loading-icon:hide');
                self.update_msg_history(false, res.data.result);
              }
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              if (e.readyState == 0) {
                self.update_msg_history(false,
                  gettext("Not connected to the server or the connection to the server has been closed.")
                );
                return;
              }

              var msg = e.responseText;
              if (e.responseJSON != undefined &&
                e.responseJSON.errormsg != undefined)
                msg = e.responseJSON.errormsg;

              self.update_msg_history(false, msg);
            }
          });
        },

        // This is a wrapper to call _render function
        // We need this because we have separated columns route & result route
        // We need to combine both result here in wrapper before rendering grid
        call_render_after_poll: function(res) {
          var self = this;
          self.query_end_time = new Date();
          self.rows_affected = res.rows_affected,
          self.has_more_rows = res.has_more_rows;

          /* If no column information is available it means query
             runs successfully with no result to display. In this
             case no need to call render function.
          */
          if (res.colinfo != null)
            self._render(res);
          else {
            // Show message in message and history tab in case of query tool
            self.total_time = self.get_query_run_time(self.query_start_time, self.query_end_time);
            var msg = S(gettext("Query returned successfully in %s.")).sprintf(self.total_time).value();
            res.result += "\n\n" + msg;
            self.update_msg_history(true, res.result, false);
            // Display the notifier if the timeout is set to >= 0
            if (self.info_notifier_timeout >= 0) {
              var alertifyWrapper = new AlertifyWrapper();
              alertifyWrapper.success(msg, self.info_notifier_timeout);
            }
          }

          // Enable/Disable query tool button only if is_query_tool is true.
          if (self.is_query_tool) {
            self.disable_tool_buttons(false);
            $("#btn-cancel-query").prop('disabled', true);
          }
          is_query_running = false;
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
        },


        /* This function makes the ajax call to poll the result,
         * if status is Busy then recursively call the poll function
         * till the status is 'Success' or 'NotConnected'. If status is
         * 'Success' then call the render method to render the data.
         */
        _poll: function() {
          var self = this;

          setTimeout(
            function() {
              $.ajax({
                url: url_for('sqleditor.poll', {'trans_id': self.transId}),
                method: 'GET',
                success: function(res) {
                  if (res.data.status === 'Success') {
                    self.trigger(
                      'pgadmin-sqleditor:loading-icon:message',
                      gettext("Loading data from the database server and rendering...")
                    );

                    self.call_render_after_poll(res.data);
                  }
                  else if (res.data.status === 'Busy') {
                    // If status is Busy then poll the result by recursive call to the poll function
                    self._poll();
                    is_query_running = true;
                    if (res.data.result) {
                      self.update_msg_history(res.data.status, res.data.result, false);
                    }
                  }
                  else if (res.data.status === 'NotConnected') {
                    self.trigger('pgadmin-sqleditor:loading-icon:hide');
                    // Enable/Disable query tool button only if is_query_tool is true.
                    if (self.is_query_tool) {
                      self.disable_tool_buttons(false);
                      $("#btn-cancel-query").prop('disabled', true);
                    }
                    self.update_msg_history(false, res.data.result, true);
                  }
                  else if (res.data.status === 'Cancel') {
                    self.trigger('pgadmin-sqleditor:loading-icon:hide');
                    self.update_msg_history(false, "Execution Cancelled!", true)
                  }
                },
                error: function(e) {
                  // Enable/Disable query tool button only if is_query_tool is true.
                  self.resetQueryHistoryObject(self);
                  self.trigger('pgadmin-sqleditor:loading-icon:hide');
                  if (self.is_query_tool) {
                    self.disable_tool_buttons(false);
                    $("#btn-cancel-query").prop('disabled', true);
                  }

                  if (e.readyState == 0) {
                    self.update_msg_history(false,
                      gettext("Not connected to the server or the connection to the server has been closed.")
                    );
                    return;
                  }

                  var msg = e.responseText;
                  if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                    msg = e.responseJSON.errormsg;

                  self.update_msg_history(false, msg);
                  // Highlight the error in the sql panel
                  self._highlight_error(msg);
                }
              });
          }, self.POLL_FALLBACK_TIME());
        },

        /* This function is used to create the backgrid columns,
         * create the Backbone PageableCollection and finally render
         * the data in the backgrid.
         */
        _render: function(data) {
          var self = this;
          self.colinfo = data.col_info;
          self.primary_keys = data.primary_keys;
          self.client_primary_key = data.client_primary_key;
          self.cell_selected = false;
          self.selected_model = null;
          self.changedModels = [];
          $('.sql-editor-explain').empty();

          /* If object don't have primary keys then set the
           * can_edit flag to false.
           */
          if (self.primary_keys === null || self.primary_keys === undefined
              || _.size(self.primary_keys) === 0)
            self.can_edit = false;
          else
            self.can_edit = true;

          /* If user can filter the data then we should enabled
           * Filter and Limit buttons.
           */
          if (self.can_filter) {
            $(".limit").prop('disabled', false);
            $(".limit").addClass('limit-enabled');
            $("#btn-filter").prop('disabled', false);
            $("#btn-filter-dropdown").prop('disabled', false);
          }

          // Initial settings for delete row, copy row and paste row buttons.
          $("#btn-delete-row").prop('disabled', true);
          // Do not disable save button in query tool
          if(!self.is_query_tool && !self.can_edit) {
            $("#btn-save").prop('disabled', true);
            $("#btn-file-menu-dropdown").prop('disabled', true);
          }
          if (!self.can_edit) {
            $("#btn-delete-row").prop('disabled', true);
            $("#btn-copy-row").prop('disabled', true);
            $("#btn-paste-row").prop('disabled', true);
          }

          // Fetch the columns metadata
          self._fetch_column_metadata.call(
            self, data, function() {
              var self = this;

              self.trigger(
                'pgadmin-sqleditor:loading-icon:message',
                gettext("Loading data from the database server and rendering..."),
                self
              );

              // Show message in message and history tab in case of query tool
              self.total_time = self.get_query_run_time(self.query_start_time, self.query_end_time);
              var msg1 = S(gettext("Successfully run. Total query runtime: %s.")).sprintf(self.total_time).value();
              var msg2 = S(gettext("%s rows affected.")).sprintf(self.rows_affected).value();

              // Display the notifier if the timeout is set to >= 0
              if (self.info_notifier_timeout >= 0) {
                var alertifyWrapper = new AlertifyWrapper();
                alertifyWrapper.success(msg1 + ' ' + msg2, self.info_notifier_timeout);
              }

              var _msg = msg1 + '\n' + msg2;

              self.update_msg_history(true, _msg, false);
              // If there is additional messages from server then add it to message
              if(!_.isNull(data.additional_messages) &&
                    !_.isUndefined(data.additional_messages)) {
                    _msg = data.additional_messages + '\n' + _msg;
              }

              $('.sql-editor-message').text(_msg);

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
              $("#btn-flash").prop('disabled', false);
            }.bind(self)
          );
        },

        // This function creates the columns as required by the backgrid
        _fetch_column_metadata: function(data, cb) {
          var colinfo = data.colinfo,
              primary_keys = data.primary_keys,
              result = data.result,
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
              _.each(primary_keys, function (value, key) {
                if (key === c.name)
                  is_primary_key = true;
              });
            }

            // To show column label and data type in multiline,
            // The elements should be put inside the div.
            // Create column label and type.
            var col_type = column_label = '';
            var type = pg_types[c.type_code] ?
                         pg_types[c.type_code][0] :
                         // This is the case where user might
                         // have use casting so we will use type
                         // returned by cast function
                         pg_types[pg_types.length - 1][0] ?
                           pg_types[pg_types.length - 1][0] : 'unknown';

            if (!is_primary_key)
              col_type += ' ' + type;
            else
              col_type += ' [PK] ' + type;

            if (c.precision && c.precision >= 0 && c.precision != 65535) {
              col_type += ' (' + c.precision;
              col_type += c.scale && c.scale != 65535 ?
                          ',' + c.scale + ')':
                          ')';
            }

            // Identify cell type of column.
            switch(type) {
              case "json":
              case "json[]":
              case "jsonb":
              case "jsonb[]":
                col_cell = 'Json';
                break;
              case "smallint":
              case "integer":
              case "bigint":
              case "decimal":
              case "numeric":
              case "real":
              case "double precision":
                col_cell = 'number';
                break;
              case "boolean":
                col_cell = 'boolean';
                break;
              case "character":
              case "character[]":
              case "character varying":
              case "character varying[]":
                if (c.internal_size && c.internal_size >= 0 && c.internal_size != 65535) {
                  // Update column type to display length on column header
                  col_type += ' (' + c.internal_size + ')';
                }
                col_cell = 'string';
                break;
              default:
                col_cell = 'string';
            }

            column_label = c.display_name + '<br>' + col_type;

            var col = {
              'name': c.name,
              'display_name': c.display_name,
              'column_type': col_type,
              'pos': c.pos,
              'label': column_label,
              'cell': col_cell,
              'can_edit': self.can_edit,
              'type': type,
              'not_null': c.not_null,
              'has_default_val': c.has_default_val
            };
            columns.push(col);
          });

          self.columns = columns;
          if (cb && typeof(cb) == 'function') {
            cb();
          }
        },

        resetQueryHistoryObject: function (history) {
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
            $('.sql-editor-message').append(msg);
          }

          // Scroll automatically when msgs appends to element
          setTimeout(function(){
            $(".sql-editor-message").scrollTop($(".sql-editor-message")[0].scrollHeight);;
          }, 10);

          if(status != 'Busy') {
            $("#btn-flash").prop('disabled', false);
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            self.gridView.history_collection.add({
              'status' : status,
              'start_time': self.query_start_time,
              'query': self.query,
              'row_affected': self.rows_affected,
              'total_time': self.total_time,
              'message':msg,
            });
          }
        },

        // This function will return the total query execution Time.
        get_query_run_time: function (start_time, end_time) {
          var self = this;

          // Calculate the difference in milliseconds
          var difference_ms, miliseconds;
          difference_ms = miliseconds = end_time.getTime() - start_time.getTime();
          //take out milliseconds
          difference_ms = difference_ms/1000;
          var seconds = Math.floor(difference_ms % 60);
          difference_ms = difference_ms/60;
          var minutes = Math.floor(difference_ms % 60);

          if (minutes > 0)
            return minutes + ' min';
          else if (seconds > 0) {
            return seconds + ' secs';
          }
          else
            return miliseconds + ' msec';
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
          var self = this, deleted_keys = [],
              dgrid = document.getElementById("datagrid"),
              is_added = _.size(self.data_store.added),
              is_updated = _.size(self.data_store.updated);

          // Remove newly added rows from staged rows as we don't want to send them on server
          if(is_added) {
            _.each(self.data_store.added, function(val, key) {
              if(key in self.data_store.staged_rows) {
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
          if(_.size(self.data_store.staged_rows) == 0) {
              var grid = self.slickgrid,
              dataView = grid.getData(),
              data = dataView.getItems(),
              idx = 0;

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
              $("#btn-delete-row").prop('disabled', true);
              $("#btn-copy-row").prop('disabled', true);
              if(_.size(self.data_store.added) || is_updated) {
                // Do not disable save button if there are
                // any other changes present in grid data
                $("#btn-save").prop('disabled', false);
              } else {
                $("#btn-save").prop('disabled', true);
              }
              var alertifyWrapper = new AlertifyWrapper();
              alertifyWrapper.success(gettext("Row(s) deleted"));
          } else {
            // There are other data to needs to be updated on server
            if(is_updated) {
              alertify.alert(gettext("Operation failed"),
                    gettext("There are unsaved changes in grid, Please save them first to avoid inconsistency in data")
                  );
              return;
            }
            alertify.confirm(gettext("Delete Row(s)"),
                  gettext("Are you sure you wish to delete selected row(s)?"),
              function() {
                $("#btn-delete-row").prop('disabled', true);
                $("#btn-copy-row").prop('disabled', true);
                // Change the state
                self.data_store.deleted = self.data_store.staged_rows;
                self.data_store.staged_rows = {};
                // Save the changes on server
                self._save();
              },
              function() {
                // Do nothing as user canceled the operation.
              }
            ).set('labels', {ok: gettext("Yes"), cancel:gettext("No")});
          }
        },

        /* This function will fetch the list of changed models and make
         * the ajax call to save the data into the database server.
         * and will open save file dialog conditionally.
         */
        _save: function(view, controller, save_as) {
          var self = this,
              data = [],
              save_data = true;

          // Open save file dialog if query tool
          if (self.is_query_tool) {
            var current_file = self.gridView.current_file;
            if (!_.isUndefined(current_file) && !save_as) {
              self._save_file_handler(current_file);
            }
            else {
              // provide custom option to save file dialog
              var params = {
                'supported_types': ["*", "sql"],
                'dialog_type': 'create_file',
                'dialog_title': 'Save File',
                'btn_primary': 'Save'
              }
              pgAdmin.FileManager.init();
              pgAdmin.FileManager.show_dialog(params);
            }
            return;
          }
          $("#btn-save").prop('disabled', true);
          $("#btn-file-menu-dropdown").prop('disabled', true);

          var is_added = _.size(self.data_store.added),
            is_updated = _.size(self.data_store.updated),
            is_deleted = _.size(self.data_store.deleted),
            is_primary_error = false;

          if( !is_added && !is_updated && !is_deleted ) {
            return;  // Nothing to save here
          }

          if (save_data) {

            self.trigger(
              'pgadmin-sqleditor:loading-icon:show',
              gettext("Saving the updated data...")
            );

            // Add the columns to the data so the server can remap the data
            req_data = self.data_store
            req_data.columns = view ? view.handler.columns : self.columns;

            // Make ajax call to save the data
            $.ajax({
              url: url_for('sqleditor.save', {'trans_id': self.transId}),
              method: 'POST',
              contentType: "application/json",
              data: JSON.stringify(req_data),
              success: function(res) {
                var grid = self.slickgrid,
                    dataView = grid.getData(),
                    data_length = dataView.getLength(),
                    data = [];
                if (res.data.status) {
                    // Remove flag is_row_copied from copied rows
                    _.each(data, function(row, idx) {
                      if (row.is_row_copied) {
                        delete row.is_row_copied;
                      }
                    });

                    // Remove 2d copied_rows array
                    if (grid.copied_rows) {
                      delete grid.copied_rows;
                    }

                    // Remove deleted rows from client as well
                    if(is_deleted) {
                      var rows = grid.getSelectedRows();
                      if(data_length == rows.length) {
                        // This means all the rows are selected, clear all data
                        data = [];
                        dataView.setItems(data, self.client_primary_key);
                      } else {
                        dataView.beginUpdate();
                        for (var i = 0; i < rows.length; i++) {
                          item = grid.getDataItem(rows[i]);
                          data.push(item);
                          dataView.deleteItem(item[self.client_primary_key]);
                        }
                        dataView.endUpdate();
                      }
                      self.rows_to_delete.apply(self, [data]);
                      grid.setSelectedRows([]);
                    }

                    // whether a cell is editable or not is decided in
                    // grid.onBeforeEditCell function (on cell click)
                    // but this function should do its job after save
                    // operation. So assign list of added rows to original
                    // rows_to_disable array.
                    if (is_added) {
                       self.rows_to_disable = _.clone(self.temp_new_rows);
                    }

                    grid.setSelectedRows([]);
                    // Reset data store
                    self.data_store = {
                      'added': {},
                      'updated': {},
                      'deleted': {},
                      'added_index': {},
                      'updated_index': {}
                    }

                    // Reset old primary key data now
                    self.primary_keys_data = {};

                    // Clear msgs after successful save
                    $('.sql-editor-message').html('');
                } else {
                  // Something went wrong while saving data on the db server
                  $("#btn-flash").prop('disabled', false);
                  $('.sql-editor-message').text(res.data.result);
                  var err_msg = S(gettext("%s.")).sprintf(res.data.result).value();
                  var alertifyWrapper = new AlertifyWrapper();
                  alertifyWrapper.error(err_msg, 20);
                  grid.setSelectedRows([]);
                  // To highlight the row at fault
                  if(_.has(res.data, '_rowid') &&
                      (!_.isUndefined(res.data._rowid)|| !_.isNull(res.data._rowid))) {
                    var _row_index = self._find_rowindex(res.data._rowid);
                    if(_row_index in self.data_store.added_index) {
                      // Remove new row index from temp_list if save operation
                      // fails
                      var index = self.handler.temp_new_rows.indexOf(_rowid);
                      if (index > -1) {
                         self.handler.temp_new_rows.splice(index, 1);
                      }
                     self.data_store.added[self.data_store.added_index[_row_index]].err = true
                    } else if (_row_index in self.data_store.updated_index) {
                     self.data_store.updated[self.data_store.updated_index[_row_index]].err = true
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
                var alertifyWrapper = new AlertifyWrapper();
                alertifyWrapper.success(gettext("Data saved successfully."));
                if (self.close_on_save) {
                  self.close();
                }
              },
              error: function(e) {
                if (e.readyState == 0) {
                  self.update_msg_history(false,
                    gettext("Not connected to the server or the connection to the server has been closed.")
                  );
                  return;
                }

                var msg = e.responseText;
                if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                  msg = e.responseJSON.errormsg;

                self.update_msg_history(false, msg);
              }
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
          if(_.isObject(rowid)) {
              _rowid = rowid;
          } else if (_.isString(rowid)) { // Insert operation
            var rowid = {};
            rowid[self.client_primary_key]= rowid;
            _rowid = rowid;
          } else {
            // Something is wrong with unique id
            return _idx;
          }

          _.find(data, function(d) {
            // search for unique id in row data if found than its the row
            // which error out on server side
            var tmp = [];  //_.findWhere needs array of object to work
            tmp.push(d);
            if(_.findWhere(tmp, _rowid)) {
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
        setTitle: function(title) {
          var self = this;

          if (self.is_new_browser_tab) {
            window.document.title = title;
          } else {
            _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
              if(p.isVisible()) {
                p.title(decodeURIComponent(title));
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
            alertify.confirm(gettext("Unsaved changes"),
              gettext("Are you sure you wish to discard the current changes?"),
              function() {
                // User do not want to save, just continue
                self._open_select_file_manager();
              },
              function() {
                return true;
              }
            ).set('labels', {ok:'Yes', cancel:'No'});
          } else {
            self._open_select_file_manager();
          }

        },

        // Open FileManager
        _open_select_file_manager: function() {
          var params = {
            'supported_types': ["sql"], // file types allowed
            'dialog_type': 'select_file' // open select file dialog
          }
          pgAdmin.FileManager.init();
          pgAdmin.FileManager.show_dialog(params);
        },

        // read file data and return as response
        _select_file_handler: function(e) {
          var self = this,
              data = {
                'file_name': decodeURI(e)
              };

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Loading the file...")
          );
          // set cursor to progress before file load
          var $busy_icon_div = $('.sql-editor-busy-fetching');
          $busy_icon_div.addClass('show_progress');

          // Make ajax call to load the data from file
          $.ajax({
            url: url_for('sqleditor.load_file'),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                self.gridView.query_tool_obj.setValue(res.data.result);
                self.gridView.current_file = e;
                self.setTitle(self.gridView.current_file.split('\\').pop().split('/').pop());
              }
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              // hide cursor
              $busy_icon_div.removeClass('show_progress');

              // disable save button on file save
              $("#btn-save").prop('disabled', true);
              $("#btn-file-menu-save").css('display', 'none');

              // Update the flag as new content is just loaded.
              self.is_query_changed = false;
            },
            error: function(e) {
              var errmsg = $.parseJSON(e.responseText).errormsg;
              var alertifyWrapper = new AlertifyWrapper();
              alertifyWrapper.error(errmsg);
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              // hide cursor
              $busy_icon_div.removeClass('show_progress');
            }
          });
        },

        // read data from codemirror and write to file
        _save_file_handler: function(e) {
          var self = this;
          data = {
            'file_name': decodeURI(e),
            'file_content': self.gridView.query_tool_obj.getValue()
          }
          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Saving the queries in the file...")
          );

          // Make ajax call to save the data to file
          $.ajax({
            url: url_for('sqleditor.save_file'),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                var alertifyWrapper = new AlertifyWrapper();
                alertifyWrapper.success(gettext("File saved successfully."));
                self.gridView.current_file = e;
                self.setTitle(self.gridView.current_file.replace(/^.*[\\\/]/g, ''));
                // disable save button on file save
                $("#btn-save").prop('disabled', true);
                $("#btn-file-menu-save").css('display', 'none');

                // Update the flag as query is already saved.
                self.is_query_changed = false;
              }
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              if (self.close_on_save) {
                self.close()
              }
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');

              var errmsg = $.parseJSON(e.responseText).errormsg;
              setTimeout(
                function() {
                  var alertifyWrapper = new AlertifyWrapper();
                  alertifyWrapper.error(errmsg);
                }, 10
              );
            },
          });
        },

        // codemirror text change event
        _on_query_change: function(query_tool_obj) {
          var self = this;

          if (!self.is_query_changed) {
            // Update the flag as query is going to changed.
            self.is_query_changed = true;

            if(self.gridView.current_file) {
              var title = self.gridView.current_file.replace(/^.*[\\\/]/g, '') + ' *'
              self.setTitle(title);
            } else {
              var title = '';

              if (self.is_new_browser_tab) {
                title = window.document.title + ' *';
              } else {
                // Find the title of the visible panel
                _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
                  if(p.isVisible()) {
                    self.gridView.panel_title = p._title;
                  }
                });

                title = self.gridView.panel_title + ' *';
              }
              self.setTitle(title);
            }

            $("#btn-save").prop('disabled', false);
            $("#btn-file-menu-save").css('display', 'block');
            $("#btn-file-menu-dropdown").prop('disabled', false);
          }
        },


        // This function will run the SQL query and refresh the data in the backgrid.
        _refresh: function() {
          var self = this;

          // Start execution of the query.
          if (self.is_query_tool) {
            $('.sql-editor-message').html('');
            self._execute();
          } else {
            self._execute_data_query();
          }
        },

        // This function will set the required flag for polling response data
        _init_polling_flags: function() {
          var self = this;

          // To get a timeout for polling fallback timer in seconds in
          // regards to elapsed time
          self.POLL_FALLBACK_TIME = function() {
            var seconds = parseInt((Date.now() - self.query_start_time.getTime())/1000);
            // calculate & return fall back polling timeout
            if(seconds >= 10 && seconds < 30) {
              return 500;
            }
            else if(seconds >= 30 && seconds < 60) {
              return 1000;
            }
            else if(seconds >= 60 && seconds < 90) {
              return 2000;
            }
            else if(seconds >= 90) {
              return 5000;
            }
            else
              return 1;
          }
        },

        // This function will show the filter in the text area.
        _show_filter: function() {
          var self = this;

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Loading the existing filter options...")
          );
          $.ajax({
            url: url_for('sqleditor.get_filter', {'trans_id': self.transId}),
            method: 'GET',
            success: function(res) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              if (res.data.status) {
                $('#filter').removeClass('hidden');
                $('#editor-panel').addClass('sql-editor-busy-fetching');
                self.gridView.filter_obj.refresh();

                if (res.data.result == null)
                  self.gridView.filter_obj.setValue('');
                else
                  self.gridView.filter_obj.setValue(res.data.result);
              } else {
                setTimeout(
                  function() {
                    alertify.alert('Get Filter Error', res.data.result);
                  }, 10
                );
              }
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');

              var msg;
              if (e.readyState == 0) {
                msg =
                  gettext("Not connected to the server or the connection to the server has been closed.")
              } else {
                msg = e.responseText;
                if (e.responseJSON != undefined &&
                  e.responseJSON.errormsg != undefined)
                  msg = e.responseJSON.errormsg;
              }
              setTimeout(
                function() {
                  alertify.alert('Get Filter Error', msg);
                }, 10
              );
            }
          });
        },

        // This function will include the filter by selection.
        _include_filter: function () {
          var self = this,
              data = {}, grid, active_column, column_info, _values;

         grid = self.slickgrid;
         active_column = grid.getActiveCell();

          // If no cell is selected then return from the function
          if (_.isNull(active_column) || _.isUndefined(active_column))
            return;

          column_info = grid.getColumns()[active_column.cell]

          // Fetch current row data from grid
          _values = grid.getDataItem(active_column.row, active_column.cell)
          if (_.isNull(_values) || _.isUndefined(_values))
            return;

          // Add column position and it's value to data
          data[column_info.field] = _values[column_info.field] || '';

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Applying the new filter...")
          );

          // Make ajax call to include the filter by selection
          $.ajax({
            url: url_for('sqleditor.inclusive_filter', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (res.data.status) {
                    // Refresh the sql grid
                    self._refresh();
                  }
                  else {
                    alertify.alert('Filter By Selection Error', res.data.result);
                  }
                }
              );
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (e.readyState == 0) {
                    alertify.alert('Filter By Selection Error',
                      gettext("Not connected to the server or the connection to the server has been closed.")
                    );
                    return;
                  }

                  var msg = e.responseText;
                  if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                    msg = e.responseJSON.errormsg;

                  alertify.alert('Filter By Selection Error', msg);
                }, 10
              );
            }
          });
        },

        // This function will exclude the filter by selection.
        _exclude_filter: function () {
           var self = this,
              data = {}, grid, active_column, column_info, _values;

         grid = self.slickgrid;
         active_column = grid.getActiveCell();

          // If no cell is selected then return from the function
          if (_.isNull(active_column) || _.isUndefined(active_column))
            return;

          column_info = grid.getColumns()[active_column.cell]

          // Fetch current row data from grid
          _values = grid.getDataItem(active_column.row, active_column.cell)
          if (_.isNull(_values) || _.isUndefined(_values))
            return;

          // Add column position and it's value to data
          data[column_info.field] = _values[column_info.field] || '';

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Applying the new filter...")
          );

          // Make ajax call to exclude the filter by selection.
          $.ajax({
            url: url_for('sqleditor.exclusive_filter', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (res.data.status) {
                    // Refresh the sql grid
                    self._refresh();
                  }
                  else {
                    alertify.alert('Filter Exclude Selection Error', res.data.result);
                  }
                }, 10
              );
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');

              setTimeout(
                function() {
                  if (e.readyState == 0) {
                    alertify.alert('Filter Exclude Selection Error',
                      gettext("Not connected to the server or the connection to the server has been closed.")
                    );
                    return;
                  }

                  var msg = e.responseText;
                  if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                    msg = e.responseJSON.errormsg;

                  alertify.alert('Filter Exclude Selection Error', msg);
                }, 10
              );
            }
          });
        },

        // This function will remove the filter.
        _remove_filter: function () {
          var self = this;

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Removing the filter...")
          );

          // Make ajax call to exclude the filter by selection.
          $.ajax({
            url: url_for('sqleditor.remove_filter', {'trans_id': self.transId}),
            method: 'POST',
            success: function(res) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (res.data.status) {
                    // Refresh the sql grid
                    self._refresh();
                  }
                  else {
                    alertify.alert('Remove Filter Error', res.data.result);
                  }
                }
              );
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (e.readyState == 0) {
                    alertify.alert('Remove Filter Error',
                      gettext("Not connected to the server or the connection to the server has been closed.")
                    );
                    return;
                  }

                  var msg = e.responseText;
                  if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                    msg = e.responseJSON.errormsg;

                  alertify.alert('Remove Filter Error', msg);
                }
              );
            }
          });
        },

        // This function will apply the filter.
        _apply_filter: function() {
          var self = this;
              sql = self.gridView.filter_obj.getValue();

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Applying the filter...")
          );

          // Make ajax call to include the filter by selection
          $.ajax({
            url: url_for('sqleditor.apply_filter', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(sql),
            success: function(res) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (res.data.status) {
                    $('#filter').addClass('hidden');
                    $('#editor-panel').removeClass('sql-editor-busy-fetching');
                    // Refresh the sql grid
                    self._refresh();
                  }
                  else {
                    alertify.alert('Apply Filter Error',res.data.result);
                  }
                }, 10
              );
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (e.readyState == 0) {
                    alertify.alert('Apply Filter Error',
                      gettext("Not connected to the server or the connection to the server has been closed.")
                    );
                    return;
                  }

                  var msg = e.responseText;
                  if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                    msg = e.responseJSON.errormsg;

                  alertify.alert('Apply Filter Error', msg);
                }, 10
              );
            }
          });
        },

        // This function will copy the selected row.
        _copy_row: copyData,

        // This function will paste the selected row.
        _paste_row: function() {
          var self = this, col_info = {},
            grid = self.slickgrid,
            dataView = grid.getData(),
            data = dataView.getItems(),
            count = dataView.getLength(),
            rows = grid.getSelectedRows().sort(
              function (a, b) { return a - b; }
            ),
            copied_rows = rows.map(function (rowIndex) {
              return data[rowIndex];
            });

            rows = rows.length == 0 ? self.last_copied_rows : rows

            self.last_copied_rows = rows;

            // If there are rows to paste?
            if(copied_rows.length > 0) {
              // Enable save button so that user can
              // save newly pasted rows on server
              $("#btn-save").prop('disabled', false);

              var arr_to_object = function (arr) {
                var obj = {},
                  count = typeof(arr) == 'object' ?
                            Object.keys(arr).length: arr.length

                _.each(arr, function(val, i){
                  if (arr[i] !== undefined) {
                    if(_.isObject(arr[i])) {
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
                  self.data_store.added[_key] = {'err': false, 'data': new_row};
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
          var self = this;
              limit = parseInt($(".limit").val());

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Setting the limit on the result...")
          );
          // Make ajax call to change the limit
          $.ajax({
            url: url_for('sqleditor.set_limit', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(limit),
            success: function(res) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (res.data.status) {
                    // Refresh the sql grid
                    self._refresh();
                  }
                  else
                    alertify.alert('Change limit Error', res.data.result);
                }, 10
              );
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              setTimeout(
                function() {
                  if (e.readyState == 0) {
                    alertify.alert('Change limit Error',
                      gettext("Not connected to the server or the connection to the server has been closed.")
                    );
                    return;
                  }

                  var msg = e.responseText;
                  if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                    msg = e.responseJSON.errormsg;

                  alertify.alert('Change limit Error', msg);
                }, 10
              );
            }
          });
        },

        // This function is used to enable/disable buttons
        disable_tool_buttons: function(disabled) {
          $("#btn-clear").prop('disabled', disabled);
          $("#btn-query-dropdown").prop('disabled', disabled);
          $("#btn-edit-dropdown").prop('disabled', disabled);
          $("#btn-edit").prop('disabled', disabled);
          $('#btn-load-file').prop('disabled', disabled);
        },

        // This function will fetch the sql query from the text box
        // and execute the query.
        _execute: function (explain_prefix) {
          var self = this,
              sql = '',
              history_msg = '';

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

          // If it is an empty query, do nothing.
          if (sql.length <= 0) return;

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            gettext("Initializing the query execution!")
          );

          $("#btn-flash").prop('disabled', true);

          if (explain_prefix != undefined &&
                !S.startsWith(sql.trim().toUpperCase(), "EXPLAIN")) {
            sql = explain_prefix + ' ' + sql;
          }

          self.query_start_time = new Date();
          self.query = sql;
          self.rows_affected = 0;
          self._init_polling_flags();
          self.disable_tool_buttons(true);
          $("#btn-cancel-query").prop('disabled', false);

          $.ajax({
            url: url_for('sqleditor.query_tool_start', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(sql),
            success: function(res) {
              // Remove marker
              if (self.gridView.marker) {
                self.gridView.marker.clear();
                delete self.gridView.marker;
                self.gridView.marker = null;

                // Remove already existing marker
                self.gridView.query_tool_obj.removeLineClass(self.marked_line_no, 'wrap', 'CodeMirror-activeline-background');
              }

              if (res.data.status) {
                self.trigger(
                  'pgadmin-sqleditor:loading-icon:message',
                  gettext("Waiting for the query execution to complete...")
                );

                self.can_edit = res.data.can_edit;
                self.can_filter = res.data.can_filter;
                self.info_notifier_timeout = res.data.info_notifier_timeout;

                // If status is True then poll the result.
                self._poll();
              }
              else {
                self.trigger('pgadmin-sqleditor:loading-icon:hide');
                self.disable_tool_buttons(false);
                $("#btn-cancel-query").prop('disabled', true);
                self.update_msg_history(false, res.data.result);

                // Highlight the error in the sql panel
                self._highlight_error(res.data.result);
              }
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              self.disable_tool_buttons(false);
              $("#btn-cancel-query").prop('disabled', true);

              if (e.readyState == 0) {
                self.update_msg_history(false,
                  gettext("Not connected to the server or the connection to the server has been closed.")
                );
                return;
              }

              var msg = e.responseText;
              if (e.responseJSON != undefined &&
                  e.responseJSON.errormsg != undefined)
                msg = e.responseJSON.errormsg;

              self.update_msg_history(false, msg);
            }
          });
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
            self.gridView.marker = self.gridView.query_tool_obj.markText(
              {line: error_line_no, ch: start_marker},
              {line: error_line_no, ch: end_marker},
              {className: "sql-editor-mark"}
            );

            self.gridView.query_tool_obj.addLineClass(self.marked_line_no, 'wrap', 'CodeMirror-activeline-background');
          }
        },

        // This function will cancel the running query.
        _cancel_query: function() {
          var self = this;

          $("#btn-cancel-query").prop('disabled', true);
          $.ajax({
            url: url_for('sqleditor.cancel_transaction', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            success: function(res) {
              if (res.data.status) {
                self.disable_tool_buttons(false);
              }
              else {
                self.disable_tool_buttons(false);
                alertify.alert('Cancel Query Error', res.data.result);
              }
            },
            error: function(e) {
              self.disable_tool_buttons(false);

              if (e.readyState == 0) {
                alertify.alert('Cancel Query Error',
                  gettext("Not connected to the server or the connection to the server has been closed.")
                );
                return;
              }

              var msg = e.responseText;
              if (e.responseJSON != undefined &&
                  e.responseJSON.errormsg != undefined)
                msg = e.responseJSON.errormsg;

              alertify.alert('Cancel Query Error', msg);
            }
          });
        },

        // This function will download the grid data as CSV file.
        _download: function() {
          var self = this,
          selected_code = self.gridView.query_tool_obj.getSelection(),
          sql = "";

          if (selected_code.length > 0)
            sql = selected_code;
          else
            sql = self.gridView.query_tool_obj.getValue();

          // If it is an empty query, do nothing.
          if (sql.length <= 0) return;

          /* If download is from view data then file name should be
           * the object name for which data is to be displayed.
           */
          if (!self.is_query_tool) {
            $.ajax({
              url: url_for('sqleditor.get_object_name', {'trans_id': self.transId}),
              method: 'GET',
              success: function(res) {
                if (res.data.status) {
                  filename = res.data.result + '.csv';
                  self._trigger_csv_download(sql, filename);
                 }
              },
              error: function(e) {
                if (e.readyState == 0) {
                  alertify.alert('Get Object Name Error',
                    gettext("Not connected to the server or the connection to the server has been closed.")
                  );
                  return;
                }

                var msg = e.responseText;
                if (e.responseJSON != undefined &&
                    e.responseJSON.errormsg != undefined)
                  msg = e.responseJSON.errormsg;

                alertify.alert('Get Object Name Error', msg);
              }
            });
          } else {
            var cur_time = new Date();
            var filename = 'data-' + cur_time.getTime() + '.csv';
            self._trigger_csv_download(sql, filename);
          }
        },
        // Trigger query result download to csv.
        _trigger_csv_download: function(query, filename) {
          var self = this,
            link = $(this.container).find("#download-csv"),
            url = url_for('sqleditor.query_tool_download', {'trans_id': self.transId});

          url +="?" + $.param({query:query, filename:filename});
          link.attr("src", url);
        },

        _auto_rollback: function() {
          var self = this;
              auto_rollback = true;

          if ($('.auto-rollback').hasClass('visibility-hidden') === true)
            $('.auto-rollback').removeClass('visibility-hidden');
          else {
            $('.auto-rollback').addClass('visibility-hidden');
            auto_rollback = false;
          }

          // Make ajax call to change the limit
          $.ajax({
            url: url_for('sqleditor.auto_rollback', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(auto_rollback),
            success: function(res) {
              if (!res.data.status)
                alertify.alert('Auto Rollback Error', res.data.result);
            },
            error: function(e) {
              if (e.readyState == 0) {
                alertify.alert('Auto Rollback Error',
                  gettext("Not connected to the server or the connection to the server has been closed.")
                );
                return;
              }

              var msg = e.responseText;
              if (e.responseJSON != undefined &&
                  e.responseJSON.errormsg != undefined)
                msg = e.responseJSON.errormsg;

              alertify.alert('Auto Rollback Error', msg);
            }
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

          // Make ajax call to change the limit
          $.ajax({
            url: url_for('sqleditor.auto_commit', {'trans_id': self.transId}),
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(auto_commit),
            success: function(res) {
              if (!res.data.status)
                alertify.alert('Auto Commit Error', res.data.result);
            },
            error: function(e) {
              if (e.readyState == 0) {
                alertify.alert('Auto Commit Error',
                  gettext("Not connected to the server or the connection to the server has been closed.")
                );
                return;
              }

              var msg = e.responseText;
              if (e.responseJSON != undefined &&
                  e.responseJSON.errormsg != undefined)
                msg = e.responseJSON.errormsg;

              alertify.alert('Auto Commit Error', msg);
            }
          });
        },

        // This function will
        _explain: function() {
          var self = this;
          var verbose = $('.explain-verbose').hasClass('visibility-hidden') ? 'OFF' : 'ON';
          var costs = $('.explain-costs').hasClass('visibility-hidden') ? 'OFF' : 'ON';

          // No need to check for buffers and timing option value in explain
          var explain_query = 'EXPLAIN (FORMAT JSON, ANALYZE OFF, VERBOSE %s, COSTS %s, BUFFERS OFF, TIMING OFF) ';
          explain_query = S(explain_query).sprintf(verbose, costs).value();
          self._execute(explain_query);
        },

        // This function will
        _explain_analyze: function() {
          var self = this;
          var verbose = $('.explain-verbose').hasClass('visibility-hidden') ? 'OFF' : 'ON';
          var costs = $('.explain-costs').hasClass('visibility-hidden') ? 'OFF' : 'ON';
          var buffers = $('.explain-buffers').hasClass('visibility-hidden') ? 'OFF' : 'ON';
          var timing = $('.explain-timing').hasClass('visibility-hidden') ? 'OFF' : 'ON';

          var explain_query = 'Explain (FORMAT JSON, ANALYZE ON, VERBOSE %s, COSTS %s, BUFFERS %s, TIMING %s) ';
          explain_query = S(explain_query).sprintf(verbose, costs, buffers, timing).value();
          self._execute(explain_query);
        },

        // This function will toggle "verbose" option in explain
        _explain_verbose: function() {
          var self = this;
          if ($('.explain-verbose').hasClass('visibility-hidden') === true) {
            $('.explain-verbose').removeClass('visibility-hidden');
            self.explain_verbose = true;
          }
          else {
            $('.explain-verbose').addClass('visibility-hidden');
            self.explain_verbose = false;
          }

          // Set this option in preferences
          var data = {
            'explain_verbose': self.explain_verbose
          };

          $.ajax({
            url: url_for('sqleditor.query_tool_preferences', {'trans_id': self.transId}),
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  gettext("Error occurred while setting verbose option in explain")
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                gettext("Error occurred while setting verbose option in explain")
              );
              return;
            }
          });
        },

        // This function will toggle "costs" option in explain
        _explain_costs: function() {
          var self = this;
          if ($('.explain-costs').hasClass('visibility-hidden') === true) {
            $('.explain-costs').removeClass('visibility-hidden');
            self.explain_costs = true;
          }
          else {
            $('.explain-costs').addClass('visibility-hidden');
            self.explain_costs = false;
          }

          // Set this option in preferences
          var data = {
            'explain_costs': self.explain_costs
          };

          $.ajax({
            url: url_for('sqleditor.query_tool_preferences', {'trans_id': self.transId}),
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  gettext("Error occurred while setting costs option in explain")
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                gettext("Error occurred while setting costs option in explain")
              );
            }
          });
        },

        // This function will toggle "buffers" option in explain
        _explain_buffers: function() {
          var self = this;
          if ($('.explain-buffers').hasClass('visibility-hidden') === true) {
            $('.explain-buffers').removeClass('visibility-hidden');
            self.explain_buffers = true;
          }
          else {
            $('.explain-buffers').addClass('visibility-hidden');
            self.explain_buffers = false;
          }

          // Set this option in preferences
          var data = {
            'explain_buffers': self.explain_buffers
          };

          $.ajax({
            url: url_for('sqleditor.query_tool_preferences', {'trans_id': self.transId}),
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  gettext("Error occurred while setting buffers option in explain")
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                gettext("Error occurred while setting buffers option in explain")
              );
            }
          });
        },

        // This function will toggle "timing" option in explain
        _explain_timing: function() {
          var self = this;
          if ($('.explain-timing').hasClass('visibility-hidden') === true) {
            $('.explain-timing').removeClass('visibility-hidden');
            self.explain_timing = true;
          }
          else {
            $('.explain-timing').addClass('visibility-hidden');
            self.explain_timing = false;
          }
          // Set this option in preferences
          var data = {
            'explain_timing': self.explain_timing
          };

          $.ajax({
            url: url_for('sqleditor.query_tool_preferences', {'trans_id': self.transId}),
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  gettext("Error occurred while setting timing option in explain")
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                gettext("Error occurred while setting timing option in explain")
              );
            }
          });
        },

        /*
         * This function get explain options and auto rollback/auto commit
         * values from preferences
         */
        get_preferences: function() {
          var self = this,
              explain_verbose = false,
              explain_costs = false,
              explain_buffers = false,
              explain_timing = false,
              auto_commit = true,
              auto_rollback = false,
              updateUI = function() {
                // Set Auto-commit and auto-rollback on query editor
                if (auto_commit &&
                  $('.auto-commit').hasClass('visibility-hidden') === true)
                  $('.auto-commit').removeClass('visibility-hidden');
                else {
                  $('.auto-commit').addClass('visibility-hidden');
                }
                if (auto_rollback &&
                  $('.auto-rollback').hasClass('visibility-hidden') === true)
                  $('.auto-rollback').removeClass('visibility-hidden');
                else {
                  $('.auto-rollback').addClass('visibility-hidden');
                }

                // Set explain options on query editor
                if (explain_verbose &&
                  $('.explain-verbose').hasClass('visibility-hidden') === true)
                  $('.explain-verbose').removeClass('visibility-hidden');
                else {
                  $('.explain-verbose').addClass('visibility-hidden');
                }
                if (explain_costs &&
                  $('.explain-costs').hasClass('visibility-hidden') === true)
                  $('.explain-costs').removeClass('visibility-hidden');
                else {
                  $('.explain-costs').addClass('visibility-hidden');
                }
                if (explain_buffers &&
                  $('.explain-buffers').hasClass('visibility-hidden') === true)
                  $('.explain-buffers').removeClass('visibility-hidden');
                else {
                  $('.explain-buffers').addClass('visibility-hidden');
                }
                if (explain_timing &&
                  $('.explain-timing').hasClass('visibility-hidden') === true)
                  $('.explain-timing').removeClass('visibility-hidden');
                else {
                  $('.explain-timing').addClass('visibility-hidden');
                }
              };

          $.ajax({
            url: url_for('sqleditor.query_tool_preferences', {'trans_id': self.transId}),
            method: 'GET',
            success: function(res) {
              if (res.data) {
                explain_verbose = res.data.explain_verbose;
                explain_costs = res.data.explain_costs;
                explain_buffers = res.data.explain_buffers;
                explain_timing = res.data.explain_timing;
                auto_commit = res.data.auto_commit;
                auto_rollback = res.data.auto_rollback;

                updateUI();
              }
            },
            error: function(e) {
              updateUI();
              alertify.alert('Get Preferences error',
                gettext("Error occurred while getting query tool options ")
              );
            }
          });
        },
        close: function() {
          var self= this;
          _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(panel) {
            if(panel.isVisible()) {
              window.onbeforeunload = null;
              panel.off(wcDocker.EVENT.CLOSING);
              // remove col_size object on panel close
              if (!_.isUndefined(self.col_size)) {
                delete self.col_size;
              }
              window.top.pgAdmin.Browser.docker.removePanel(panel);
            }
          });
        }
      }
    );

    pgAdmin.SqlEditor = {
      // This function is used to create and return the object of grid controller.
      create: function(container) {
        return new SqlEditorController(container);
      }
    };

    return pgAdmin.SqlEditor;
  });
