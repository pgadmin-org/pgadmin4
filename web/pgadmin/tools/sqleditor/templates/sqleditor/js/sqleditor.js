define(
  [
    'jquery', 'underscore', 'underscore.string', 'alertify', 'pgadmin',
    'backbone', 'backgrid', 'codemirror', 'pgadmin.misc.explain', 'slickgrid',
    'bootstrap', 'pgadmin.browser', 'wcdocker',
    'codemirror/mode/sql/sql', 'codemirror/addon/selection/mark-selection',
    'codemirror/addon/selection/active-line', 'codemirror/addon/fold/foldcode',
    'codemirror/addon/fold/foldgutter', 'codemirror/addon/hint/show-hint',
    'codemirror/addon/hint/sql-hint', 'pgadmin.file_manager',
    'codemirror/addon/fold/pgadmin-sqlfoldcode',
    'codemirror/addon/scroll/simplescrollbars',
    'backgrid.sizeable.columns', 'slickgrid/slick.formatters',
    'slickgrid/slick.pgadmin.formatters', 'slickgrid/slick.editors',
    'slickgrid/slick.pgadmin.editors', 'slickgrid/plugins/slick.autotooltips',
    'slickgrid/plugins/slick.cellrangedecorator',
    'slickgrid/plugins/slick.cellrangeselector',
    'slickgrid/plugins/slick.cellselectionmodel',
    'slickgrid/plugins/slick.checkboxselectcolumn',
    'slickgrid/plugins/slick.cellcopymanager',
    'slickgrid/plugins/slick.rowselectionmodel',
    'slickgrid/slick.grid'
  ],
  function(
    $, _, S, alertify, pgAdmin, Backbone, Backgrid, CodeMirror, pgExplain
  ) {
    /* Return back, this has been called more than once */
    if (pgAdmin.SqlEditor)
      return pgAdmin.SqlEditor;

    // Some scripts do export their object in the window only.
    // Generally the one, which do no have AMD support.
    var wcDocker = window.wcDocker,
        pgBrowser = pgAdmin.Browser,
        Slick = window.Slick;

    /* Get the function definition from
     * http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript/35302975#35302975
     */
    function epicRandomString(b){for(var a=(Math.random()*eval("1e"+~~(50*Math.random()+50))).toString(36).split(""),c=3;c<a.length;c++)c==~~(Math.random()*c)+1&&a[c].match(/[a-z]/)&&(a[c]=a[c].toUpperCase());a=a.join("");a=a.substr(~~(Math.random()*~~(a.length/3)),~~(Math.random()*(a.length-~~(a.length/3*2)+1))+~~(a.length/3*2));if(24>b)return b?a.substr(a,b):a;a=a.substr(a,b);if(a.length==b)return a;for(;a.length<b;)a+=epicRandomString();return a.substr(0,b)};

    // Define key codes for shortcut keys
    var F5_KEY = 116,
        F7_KEY = 118,
        F8_KEY = 119;

    var is_query_running = false;

    // Defining the backbone model for the sql grid
    var sqlEditorViewModel = Backbone.Model.extend({

      /* Keep track of values for the original primary keys for later reference,
       * to allow to change the value of primary keys in the model, which will be
       * required to identify the value of any row in the datagrid for the relation.
       */
      parse: function(data) {
        var self = this;
        self.grid_keys = {};
        self.changed_data = false;

        if (data && 'primary_keys' in self && self.primary_keys && _.size(self.primary_keys) > 0) {
          _.each(self.primary_keys, function (value, key) {
            // Assumption - the data, which are coming will always have data for primary_keys
            self.grid_keys[key] = data[key];
          });
        }

        return data;
      },
      /* We also need primary key along with the original data,
       * which is required to identify this row in the database for modification.
       */
      toJSON: function(overridden, keys_only) {
        var res = Backbone.Model.prototype.toJSON.apply(this, arguments);
        if (!overridden) {
          return res;
        }

        if (keys_only)
          return this.grid_keys;

        return {
          'keys': this.grid_keys,
          'data': res
        };
      },

      // This function updates the primary key if changed.
      update_keys: function() {
        var self = this;

        /* If 'grid_keys' present in the changed object
         * then it is an update else insert.
         */
        if ('grid_keys' in self) {
          /* Iterate through primary keys and check if the key
           * is updated or not. If it is updated we need to update
           * the grid_keys of the model as well.
           */
          _.each(self.primary_keys, function (value, key) {
            if (self.grid_keys[key] != self.attributes[key])
                self.grid_keys[key] = self.attributes[key]
          });
        }
        else {
          self.grid_keys = {};
          /* Iterate through primary keys and insert
           * the values in models grid_keys.
           */
          _.each(self.primary_keys, function (value, key) {
            self.grid_keys[key] = self.attributes[key]
          });
        }
      }
    });

    // Defining Backbone view for the sql grid.
    var SQLEditorView = Backbone.View.extend({
      initialize: function(opts) {
        this.$el = opts.el;
        this.handler = opts.handler;
      },

      // Bind all the events
      events: {
        "click .btn-load-file": "on_file_load",
        "click #btn-save": "on_save",
        "click #btn-file-menu-save": "on_save",
        "click #btn-file-menu-save-as": "on_save_as",
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
        var self = this;

        $('.editor-title').text(_.unescape(self.editor_title));

        var filter = self.$el.find('#sql_filter');

        self.filter_obj = CodeMirror.fromTextArea(filter.get(0), {
            lineNumbers: true,
            matchBrackets: true,
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
            tabSize: pgAdmin.Browser.editor_options.tabSize
        });

        // Create main wcDocker instance
        var main_docker = new wcDocker(
          '#editor-panel', {
          allowContextMenu: false,
          allowCollapse: false,
          themePath: '{{ url_for('static', filename='css/wcDocker/Themes') }}',
          theme: 'pgadmin'
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
            matchBrackets: true,
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
            scrollbarStyle: 'simple'
        });

        // Create panels for 'Data Output', 'Explain', 'Messages' and 'History'
        var data_output = new pgAdmin.Browser.Panel({
          name: 'data_output',
          title: '{{ _('Data Output') }}',
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div id ="datagrid" class="sql-editor-grid-container"></div>'
        })

        var explain = new pgAdmin.Browser.Panel({
          name: 'explain',
          title: '{{ _('Explain') }}',
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div class="sql-editor-explain"></div>'
        })

        var messages = new pgAdmin.Browser.Panel({
          name: 'messages',
          title: '{{ _('Messages') }}',
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div class="sql-editor-message"></div>'
        })

        var history = new pgAdmin.Browser.Panel({
          name: 'history',
          title: '{{ _('History') }}',
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
                  msg = '{{ _('The data has been modified, but not saved. Are you sure you wish to discard the changes?') }}';
                  notify = true;
                }
              } else if(self.handler.is_query_tool) {
                // We will check for modified sql content
                var sql = self.handler.gridView.query_tool_obj.getValue();
                sql = sql.replace(/\s+/g, '');
                // If it is an empty query, do nothing.
                if (sql.length > 0) {
                  msg = '{{ _('The query has been modified, but not saved. Are you sure you wish to discard the changes?') }}';
                  notify = true;
                }
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
                url: "{{ url_for('sqleditor.index') }}" + "autocomplete/" +
                  self.transId,
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
        alertify.confirm('{{ _('Unsaved changes') }}', msg,
          function() {
            // Do nothing as user do not want to save, just continue
            window.onbeforeunload = null;
            panel.off(wcDocker.EVENT.CLOSING);
            window.top.pgAdmin.Browser.docker.removePanel(panel);
          },
          function() {
            // Stop, User wants to save
            // false value will prevent from panel to close
            return true;
          }
        ).set('labels', {ok:'Yes', cancel:'No'});
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
           This will hold all the data which user delets in grid

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
      render_grid: function(collection, columns, is_editable) {
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

        // Remove any existing grid first
        if (self.handler.slickgrid) {
            self.handler.slickgrid.destroy();
        }

        if(!_.isArray(collection) || !_.size(collection)) {
          collection = [];
        }

        var grid_columns = new Array(),
          checkboxSelector;

          checkboxSelector = new Slick.CheckboxSelectColumn({
            cssClass: "slick-cell-checkboxsel"
          });

          grid_columns.push(checkboxSelector.getColumnDefinition());

        _.each(columns, function(c) {
            var options = {
              id: c.name,
              field: c.name,
              name: c.label
            };

            // If grid is editable then add editor else make it readonly
            if(c.cell == 'Json') {
              options['editor'] = is_editable ? Slick.Editors.JsonText
                                              : Slick.Editors.ReadOnlyJsonText;
              options['formatter'] = Slick.Formatters.JsonString;
            } else if(c.cell == 'number') {
              options['editor'] = is_editable ? Slick.Editors.Text
                                              : Slick.Editors.ReadOnlyText;
              options['formatter'] = Slick.Formatters.Numbers;
            } else if(c.cell == 'boolean') {
              options['editor'] = is_editable ? Slick.Editors.Checkbox
                                              : Slick.Editors.ReadOnlyCheckbox;
              options['formatter'] = Slick.Formatters.Checkmark;
            } else {
              options['editor'] = is_editable ? Slick.Editors.pgText
                                              : Slick.Editors.ReadOnlypgText;
            }

           grid_columns.push(options)
        });

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

        // Add our own custom primary key to keep track of changes
        _.each(collection, function(row){
          row['__temp_PK'] = epicRandomString(15);
        });

        // Add-on function which allow us to identify the faulty row after insert/update
        // and apply css accordingly
        collection.getItemMetadata = function(i) {
          var res = {}, cssClass = 'normal_row';
          if (_.has(self.handler, 'data_store')) {
            if (i in self.handler.data_store.added_index) {
              cssClass = 'new_row';
              if (self.handler.data_store.added[self.handler.data_store.added_index[i]].err) {
                cssClass += ' error';
              }
            } else if (i in self.handler.data_store.updated_index) {
              cssClass = 'updated_row';
              if (self.handler.data_store.updated[self.handler.data_store.updated_index[i]].err) {
                cssClass += ' error';
              }
            }
          }
          return {'cssClasses': cssClass};
        }

        var grid = new Slick.Grid($data_grid, collection, grid_columns, grid_options);
        grid.registerPlugin( new Slick.AutoTooltips({ enableForHeaderCells: false }) );
        grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: false}));
        grid.registerPlugin(checkboxSelector);

        var editor_data = {
          keys: self.handler.primary_keys,
          vals: collection,
          columns: columns,
          grid: grid,
          selection: grid.getSelectionModel(),
          editor: self
        };

        self.handler.slickgrid = grid;

        // Listener function to watch selected rows from grid
        if (editor_data.selection) {
           editor_data.selection.onSelectedRangesChanged.subscribe(function(e, args) {
             var collection = this.grid.getData(),
               _pk = _.keys(this.keys),
               rows_for_stage = {}, selected_rows_list = [];
               // Only if entire row(s) are selected via check box
               if(_.has(this.selection, 'getSelectedRows')) {
                 selected_rows_list = this.selection.getSelectedRows();
               }

              // If any row(s) selected ?
              if(selected_rows_list.length) {
                if(this.editor.handler.can_edit)
                  // Enable delete rows button
                  $("#btn-delete-row").prop('disabled', false);
                // Enable copy rows button
                $("#btn-copy-row").prop('disabled', false);
                // Collect primary key data from collection as needed for stage row
                _.each(selected_rows_list, function(row_index) {
                  var row_data = collection[row_index], _selected = {};
                  rows_for_stage[row_data.__temp_PK] = _.pick(row_data, _pk);
                });
              } else {
                // Clear the object as no rows to delete
                rows_for_stage = {};
                // Disable delete/copy rows button
                $("#btn-delete-row").prop('disabled', true);
                $("#btn-copy-row").prop('disabled', true);
              }

             // Update main data store
            this.editor.handler.data_store.staged_rows = rows_for_stage;
           }.bind(editor_data));
        }


        // Listener function which will be called before user updates existing cell
        // This will be used to collect primary key for that row
        grid.onBeforeEditCell.subscribe(function (e, args) {
            var before_data = args.item;
            if(before_data && '__temp_PK' in before_data) {
              var _pk = before_data.__temp_PK,
                _keys = self.handler.primary_keys,
                current_pk = {}, each_pk_key = {};

              // If already have primary key data then no need to go ahead
              if(_pk in self.handler.primary_keys_data) {
                return;
              }

              // Fetch primary keys for the row before they gets modified
              _.each(_keys, function(value, key) {
                current_pk[key] = before_data[key];
              });
              // Place it in main variable for later use
              self.handler.primary_keys_data[_pk] = current_pk
            }
        });

        // Listener function for COPY/PASTE operation on grid
        grid.onKeyDown.subscribe(function (e, args) {
          var c = e.keyCode,
            ctrlDown = e.ctrlKey||e.metaKey; // Mac support

          //    (ctrlDown && c==67) return false // c
          //    (ctrlDown && c==86) return false // v
          //    (ctrlDown && c==88) return false // x


          if (!ctrlDown && !(c==67 || c==86 || c==88)) {
            return;  // Not a copy paste opration
          }

          var grid = args.grid, column_info, column_values, value,
            cell = args.cell, row = args.row, selected_rows,
            self = this.editor.handler;

          // Copy operation (Only when if there is no row selected)
          // When user press `Ctrl + c` on selected cell
          if(ctrlDown && c==67) {
            // May be single cell is selected
            column_info = grid.getColumns()[cell]
            // Fetch current row data from grid
            column_values = grid.getDataItem(row, cell)
            //  Get the value from cell
            value = column_values[column_info.field] || '';
            //Copy this value to Clipborad
            if(value)
              this.editor.handler.copyTextToClipboard(value);
            // Go to cell again
            grid.gotoCell(row, cell, false);
          }

        }.bind(editor_data));


        // Listener function which will be called when user updates existing rows
        grid.onCellChange.subscribe(function (e, args) {
          // self.handler.data_store.updated will holds all the updated data
          var changed_column = args.grid.getColumns()[args.cell].field, // Current filed name
            updated_data = args.item[changed_column],                   // New value for current field
            _pk = args.item.__temp_PK || null,                          // Unique key to identify row
            column_data = {},
            _type;

           column_data[changed_column] = updated_data;

          if(_pk) {
            // Check if it is in newly added row by user?
            if(_pk in self.handler.data_store.added) {
              _.extend(
                self.handler.data_store.added[_pk]['data'],
                  column_data);
              //Find type for current column
              self.handler.data_store.added[_pk]['err'] = false
              self.handler.data_store.added[_pk]['data_type'][changed_column] = _.where(this.columns, {name: changed_column})[0]['type'];
            // Check if it is updated data from existing rows?
            } else if(_pk in self.handler.data_store.updated) {
              _.extend(
                self.handler.data_store.updated[_pk], {
                  'data': column_data,
                  'err': false
                }
              );
             //Find type for current column
             self.handler.data_store.updated[_pk]['data_type'][changed_column] = _.where(this.columns, {name: changed_column})[0]['type'];
            } else {
              // First updated data for this primary key
              self.handler.data_store.updated[_pk] = {
                'err': false, 'data': column_data,
                'primary_keys': self.handler.primary_keys_data[_pk]
              };
              self.handler.data_store.updated_index[args.row] = _pk;
              // Find & add column data type for current changed column
              var temp = {};
              temp[changed_column] = _.where(this.columns, {name: changed_column})[0]['type'];
              self.handler.data_store.updated[_pk]['data_type'] = temp;
            }
          }
          // Enable save button
          $("#btn-save").prop('disabled', false);
        }.bind(editor_data));

        // Listener function which will be called when user adds new rows
        grid.onAddNewRow.subscribe(function (e, args) {
          // self.handler.data_store.added will holds all the newly added rows/data
          var _key = epicRandomString(10),
            column = args.column,
            item = args.item, data_length = this.grid.getDataLength();

          if(item) {
            item.__temp_PK = _key;
          }
          collection.push(item);
          self.handler.data_store.added[_key] = {'err': false, 'data': item};
          self.handler.data_store.added_index[data_length] = _key;
          // Fetch data type & add it for the column
          var temp = {};
          temp[column.field] = _.where(this.columns, {name: column.field})[0]['type'];
          self.handler.data_store.added[_key]['data_type'] =  temp;
          grid.invalidateRows([collection.length - 1]);
          grid.updateRowCount();
          grid.render();
          // Enable save button
          $("#btn-save").prop('disabled', false);
        }.bind(editor_data));

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

        // Remove any existing grid first
        if (self.history_grid) {
            self.history_grid.remove();
        }

        var history_model = Backbone.Model.extend({
          defaults: {
            status: undefined,
            start_time: undefined,
            query: undefined,
            row_affected: 0,
            row_retrieved: 0,
            total_time: undefined,
            message: ''
          }
        });

        var history_collection = self.history_collection = new (Backbone.Collection.extend({
            model: history_model,
            // comparator to sort the history in reverse order of the start_time
            comparator: function(a, b) {
              return -a.get('start_time').localeCompare(b.get('start_time'));
            }
        }));
        var columns = [{
            name: "status",
            label: "",
            cell: Backgrid.Cell.extend({
              class: 'sql-status-cell',
              render: function() {
                this.$el.empty();
                var $btn = $('<button></button>', {
                  class: 'btn btn-circle'
                }).appendTo(this.$el);
                var $circleDiv = $('<i></i>', {class: 'fa'}).appendTo($btn);
                if (this.model.get('status')) {
                  $btn.addClass('btn-success');
                  $circleDiv.addClass('fa-check');
                } else {
                  $btn.addClass('btn-danger');
                  $circleDiv.addClass('fa-times');
                }

                return this;
              },
              editable: false
            }),
            editable: false
          }, {
            name: "start_time",
            label: "Date",
            cell: "string",
            editable: false,
            resizeable: true
          }, {
            name: "query",
            label: "Query",
            cell: "string",
            editable: false,
            resizeable: true
          }, {
            name: "row_affected",
            label: "Rows affected",
            cell: "integer",
            editable: false,
            resizeable: true
          }, {
            name: "total_time",
            label: "Total Time",
            cell: "string",
            editable: false,
            resizeable: true
          }, {
            name: "message",
            label: "Message",
            cell: "string",
            editable: false,
            resizeable: true
        }];


        // Create Collection of Backgrid columns
        var columnsColl = new Backgrid.Columns(columns);
        var $history_grid = self.$el.find('#history_grid');

        var grid = self.history_grid = new Backgrid.Grid({
            columns: columnsColl,
            collection: history_collection,
            className: "backgrid table-bordered"
        });

        // Render the grid
        $history_grid.append(grid.render().$el);

        var sizeAbleCol = new Backgrid.Extension.SizeAbleColumns({
          collection: history_collection,
          columns: columnsColl,
          grid: self.history_grid
        });

        $history_grid.find('thead').before(sizeAbleCol.render().el);

        // Add resize handlers
        var sizeHandler = new Backgrid.Extension.SizeAbleColumnsHandlers({
          sizeAbleColumns: sizeAbleCol,
          grid: self.history_grid,
          saveColumnWidth: true
        });

        // sizeHandler should render only when table grid loaded completely.
        setTimeout(function() {
          $history_grid.find('thead').before(sizeHandler.render().el);
        }, 1000);

        // re render sizeHandler whenever history panel tab becomes visible
        self.history_panel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function(ev) {
          $history_grid.find('thead').before(sizeHandler.render().el);
        });

        // Initialized table width 0 still not calculated
        var table_width = 0;
        // Listen to resize events
        columnsColl.on('resize',
          function(columnModel, newWidth, oldWidth, offset) {
            var $grid_el = $history_grid.find('table'),
                tbl_orig_width = $grid_el.width(),
                offset = oldWidth - newWidth,
                tbl_new_width = tbl_orig_width - offset;

            if (table_width == 0) {
              table_width = tbl_orig_width
            }
            // Table new width cannot be less than original width
            if (tbl_new_width >= table_width) {
              $($grid_el).css('width', tbl_new_width + 'px');
            }
            else {
              // reset if calculated tbl_new_width is less than original
              // table width
              tbl_new_width = table_width;
              $($grid_el).css('width', tbl_new_width + 'px');
            }
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

        // Trigger the save signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:save',
            self,
            self.handler,
            true
        );
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

        // We will check for modified sql content
        sql = self.query_tool_obj.getValue();
        sql = sql.replace(/\s+/g, '');
        // If there is nothing to save, clear it.
        if (!sql.length) { self.query_tool_obj.setValue('');  return; }

        alertify.confirm(
          '{{ _('Unsaved changes') }}',
          '{{ _('Are you sure you wish to discard the current changes?') }}',
          function() {
            // Do nothing as user do not want to save, just continue
            self.query_tool_obj.setValue('');
          },
          function() {
            return true;
          }
        ).set('labels', {ok:'Yes', cancel:'No'});
      },

      // Callback function for the clear history button click.
      on_clear_history: function(ev) {
        var self = this;
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);
        // ask for confirmation only if anything to clear
        if(!self.history_collection.length) { return; }

        alertify.confirm('{{ _('Clear history') }}',
          '{{ _('Are you sure you wish to clear the history?') }}',
          function() {
            // Remove any existing grid first
            if (self.history_grid) {
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
        start: function(is_query_tool, editor_title, script_sql) {
          var self = this;

          self.is_query_tool = is_query_tool;
          self.items_per_page = 25;
          self.rows_affected = 0;
          self.marked_line_no = 0;
          self.explain_verbose = false;
          self.explain_costs = false;
          self.explain_buffers = false;
          self.explain_timing = false;

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
          self.gridView.items_per_page = self.items_per_page

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
              cm.className += ' cm_disabled';
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
                alertify.confirm('{{ _('Unsaved changes') }}',
                  '{{ _('The data has been modified, but not saved. Are you sure you wish to discard the changes?') }}',
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

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Initializing query execution.') }}'
          );

          $("#btn-flash").prop('disabled', true);

          self.trigger(
            'pgadmin-sqleditor:loading-icon:message',
              '{{ _('Waiting for the query execution to complete...') }}'
          );

          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "view_data/start/" + self.transId,
            method: 'GET',
            success: function(res) {
              if (res.data.status) {

                self.can_edit = res.data.can_edit;
                self.can_filter = res.data.can_filter;
                self.items_per_page = res.data.items_per_page;
                self.gridView.items_per_page = self.items_per_page;
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
                  '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
                url: "{{ url_for('sqleditor.index') }}" + "poll/" + self.transId,
                method: 'GET',
                success: function(res) {
                  if (res.data.status === 'Success') {
                    self.trigger(
                      'pgadmin-sqleditor:loading-icon:message',
                      '{{ _('Loading data from the database server and rendering...') }}'
                    );

                    self.query_end_time = new Date();
                    self.rows_affected = res.data.rows_affected;

                    /* If no column information is available it means query
                       runs successfully with no result to display. In this
                       case no need to call render function.
                     */
                    if (res.data.colinfo != null)
                      self._render(res.data);
                    else {
                      // Show message in message and history tab in case of query tool
                      self.total_time = self.get_query_run_time(self.query_start_time, self.query_end_time);
                      var msg = S('{{ _('Query returned successfully in %s.') }}').sprintf(self.total_time).value();
                      res.data.result += "\n\n" + msg;
                      self.update_msg_history(true, res.data.result, false);
                      // Display the notifier if the timeout is set to >= 0
                      if (self.info_notifier_timeout >= 0) {
                          alertify.success(msg, self.info_notifier_timeout);
                      }
                    }

                    // Enable/Disable query tool button only if is_query_tool is true.
                    if (self.is_query_tool) {
                      self.disable_tool_buttons(false);
                      $("#btn-cancel-query").prop('disabled', true);
                    }
                    is_query_running = false;
                    self.trigger('pgadmin-sqleditor:loading-icon:hide');
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
                  self.trigger('pgadmin-sqleditor:loading-icon:hide');
                  if (self.is_query_tool) {
                    self.disable_tool_buttons(false);
                    $("#btn-cancel-query").prop('disabled', true);
                  }

                  if (e.readyState == 0) {
                    self.update_msg_history(false,
                      '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
          }, 1);
        },

        /* This function is used to create the backgrid columns,
         * create the Backbone PageableCollection and finally render
         * the data in the backgrid.
         */
        _render: function(data) {
          var self = this;
          self.colinfo = data.col_info;
          self.primary_keys = data.primary_keys;
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
                '{{ _('Loading data from the database server and rendering...') }}',
                self
              );

              // Show message in message and history tab in case of query tool
              self.total_time = self.get_query_run_time(self.query_start_time, self.query_end_time);
              self.update_msg_history(true, "", false);
              var msg1 = S('{{ _('Total query runtime: %s.') }}').sprintf(self.total_time).value();
              var msg2 = S('{{ _('%s rows retrieved.') }}').sprintf(self.rows_affected).value();

              // Display the notifier if the timeout is set to >= 0
              if (self.info_notifier_timeout >= 0) {
                alertify.success(msg1 + '<br />' + msg2, self.info_notifier_timeout);
              }

              $('.sql-editor-message').text(msg1 + '\n' + msg2);

                /* Add the data to the collection and render the grid.
                 * In case of Explain draw the graph on explain panel
                 * and add json formatted data to collection and render.
                 */
              var explain_data_array = [];
              if(
                data.result && data.result.length >= 1 &&
                  data.result[0] && data.result[0].hasOwnProperty(
                    'QUERY PLAN'
                  ) && _.isObject(data.result[0]['QUERY PLAN'])
              ) {
                var explain_data = {'QUERY PLAN' : JSON.stringify(data.result[0]['QUERY PLAN'], null, 2)};
                explain_data_array.push(explain_data);
                // Make sure - the 'Data Output' panel is visible, before - we
                // start rendering the grid.
                self.gridView.data_output_panel.focus();
                setTimeout(
                  function() {
                    self.gridView.render_grid(
                      explain_data_array, self.columns, self.can_edit
                    );
                    // Make sure - the 'Explain' panel is visible, before - we
                    // start rendering the grid.
                    self.gridView.explain_panel.focus();
                    pgExplain.DrawJSONPlan(
                      $('.sql-editor-explain'), data.result[0]['QUERY PLAN']
                    );
                  }, 10
                );
              } else {
                // Make sure - the 'Data Output' panel is visible, before - we
                // start rendering the grid.
                self.gridView.data_output_panel.focus();
                setTimeout(
                  function() {
                    self.gridView.render_grid(data.result, self.columns, self.can_edit);
                  }, 10
                );
              }

              // Hide the loading icon
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              $("#btn-flash").prop('disabled', false);
            }.bind(self),
            function() {
              this.trigger('pgadmin-sqleditor:loading-icon:hide');
              $("#btn-flash").prop('disabled', false);
            }.bind(self)
          );
        },

        // This function creates the columns as required by the backgrid
        _fetch_column_metadata: function(data, cb, _fail) {
          var colinfo = data.colinfo,
              primary_keys = data.primary_keys,
              result = data.result,
              columns = [],
              self = this;

          self.trigger(
            'pgadmin-sqleditor:loading-icon:message',
            '{{ _('Retrieving information about the columns returned...') }}'
          );

          // Make ajax call to fetch the pg types to map numeric data type
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "fetch/types/" + self.transId,
            method: 'GET',
            success: function(res) {
              if (res.data.status) {
                // Store pg_types in an array
                var pg_types = new Array();
                _.each(res.data.result.rows, function(r) {
                  pg_types[r.oid] = [r.typname];
                });

                // Create columns required by backgrid to render
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

                  if (c.precision && c.precision != 65535) {
                    col_type += ' (' + c.precision;
                    col_type += c.scale && c.scale != 65535 ?
                                ',' + c.scale + ')':
                                ')';
                  }

                  column_label = c.display_name + '<br>' + col_type;

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
                    default:
                      col_cell = 'string';
                  }

                  var col = {
                    'name': c.name,
                    'label': column_label,
                    'cell': col_cell,
                    'can_edit': self.can_edit,
                    'type': type
                  };
                  columns.push(col);
                });
              }
              else {
               alertify.alert('Fetching Type Error', res.data.result);
              }
              self.columns = columns;
              if (cb && typeof(cb) == 'function') {
                cb();
              }
            },
            fail: _fail
          });
        },

        // This function is used to raise appropriate message.
        update_msg_history: function(status, msg, clear_grid) {
          var self = this;
          if (clear_grid === undefined)
            clear_grid = true;

          self.gridView.messages_panel.focus();

          if (self.is_query_tool) {
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
          }
          // Scroll automatically when msgs appends to element
          setTimeout(function(){
            $(".sql-editor-message").scrollTop($(".sql-editor-message")[0].scrollHeight);;
          }, 10);

          if(status != 'Busy') {
            $("#btn-flash").prop('disabled', false);
            self.trigger('pgadmin-sqleditor:loading-icon:hide');
            self.gridView.history_collection.add({
              'status' : status, 'start_time': self.query_start_time.toString(),
              'query': self.query, 'row_affected': self.rows_affected,
              'total_time': self.total_time, 'message':msg
            });
            self.gridView.history_collection.sort();
          }
        },

        // This function will return the total query execution Time.
        get_query_run_time: function (start_time, end_time) {
          var self = this;

          // Calculate the difference in milliseconds
          var difference_ms = miliseconds = end_time.getTime() - start_time.getTime();
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
                      delete self.data_store.added[key]
                    }
                  });
              }

              // If only newly rows to delete and no data is there to send on server
              // then just re-render the grid
              if(_.size(self.data_store.staged_rows) == 0) {
                var grid = self.slickgrid, data = grid.getData(), idx = 0;
                  if(deleted_keys.length){
                    // Remove new rows from grid data using deleted keys
                   data = _.reject(data, function(d){
                     return (d && _.indexOf(deleted_keys, d.__temp_PK) > -1)
                   });
                  }
                  grid.resetActiveCell();
                  grid.setData(data, true);
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
                  alertify.success('{{ _('Row(s) deleted') }}');
              } else {
                // There are other data to needs to be updated on server
                if(is_updated) {
                  alertify.alert('{{ _('Operation failed') }}',
                    '{{ _('There are unsaved changes in grid, Please save them first to avoid inconsistency in data') }}'
                  );
                  return;
                }
                alertify.confirm('{{ _('Delete Row(s)') }}',
                  '{{ _('Are you sure you wish to delete selected row(s)?') }}',
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
                ).set('labels', {ok:'Yes', cancel:'No'});
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
              '{{ _('Saving the updated data...') }}'
            );

            // Make ajax call to save the data
            $.ajax({
              url: "{{ url_for('sqleditor.index') }}" + "save/" + self.transId,
              method: 'POST',
              contentType: "application/json",
              data: JSON.stringify(self.data_store),
              success: function(res) {
                var grid = self.slickgrid,
                  data = grid.getData();
                if (res.data.status) {
                    // Remove deleted rows from client as well
                    if(is_deleted) {
                      var rows = grid.getSelectedRows();
                      /* In JavaScript sorting by default is lexical,
                       * To make sorting numerical we need to pass function
                       * After that we will Reverse the order of sorted array
                       * so that when we remove it does not affect array index
                       */
                      if(data.length == rows.length) {
                        // This means all the rows are selected, clear all data
                        data = [];
                      } else {
                        rows = rows.sort(function(a,b){return a - b}).reverse();
                        rows.forEach(function(idx) {
                          data.splice(idx, 1);
                        });
                      }
                      grid.setData(data, true);
                      grid.setSelectedRows([]);
                    }

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
                  var err_msg = S('{{ _('%s.') }}').sprintf(res.data.result).value();
                  alertify.notify(err_msg, 'error', 20);

                  // To highlight the row at fault
                  if(_.has(res.data, '_rowid') &&
                      (!_.isUndefined(res.data._rowid)|| !_.isNull(res.data._rowid))) {
                    var _row_index = self._find_rowindex(res.data._rowid);
                    if(_row_index in self.data_store.added_index) {
                     self.data_store.added[self.data_store.added_index[_row_index]].err = true
                    } else if (_row_index in self.data_store.updated_index) {
                     self.data_store.updated[self.data_store.updated_index[_row_index]].err = true
                    }
                  }
                  grid.gotoCell(_row_index, 1);
                }

                // Update the sql results in history tab
                _.each(res.data.query_result, function(r) {
                  self.gridView.history_collection.add(
                    {'status' : r.status, 'start_time': self.query_start_time.toString(),
                    'query': r.sql, 'row_affected': r.rows_affected,
                    'total_time': self.total_time, 'message': r.result
                  });
                });
                self.trigger('pgadmin-sqleditor:loading-icon:hide');

                grid.invalidate();
              },
              error: function(e) {
                if (e.readyState == 0) {
                  self.update_msg_history(false,
                    '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
          var self = this;
          var grid = self.slickgrid,
            data = grid.getData(), _rowid, count = 0, _idx = -1;
          // If _rowid is object then it's update/delete operation
          if(_.isObject(rowid)) {
              _rowid = rowid;
          } else if (_.isString(rowid)) { // Insert opration
            _rowid = { '__temp_PK': rowid };
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
          _.each(window.top.pgAdmin.Browser.docker.findPanels('frm_datagrid'), function(p) {
            if(p.isVisible()) {
              p.title(title);
            }
          });
        },

        // load select file dialog
        _load_file: function() {
          var self = this;
          // We will check for modified sql content
          sql = self.gridView.query_tool_obj.getValue()
          sql = sql.replace(/\s+/g, '');
          // If there is nothing to save, open file manager.
          if (!sql.length) { self._open_select_file_manager(); return; }

          alertify.confirm('{{ _('Unsaved changes') }}',
            '{{ _('Are you sure you wish to discard the current changes?') }}',
            function() {
              // User do not want to save, just continue
              self._open_select_file_manager();
           },
            function() {
              return true;
            }
          ).set('labels', {ok:'Yes', cancel:'No'});
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
                'file_name': e
              };

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Loading the file...') }}'
          );
          // set cursor to progress before file load
          var $busy_icon_div = $('.sql-editor-busy-fetching');
          $busy_icon_div.addClass('show_progress');

          // Make ajax call to load the data from file
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "load_file/",
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                self.gridView.query_tool_obj.setValue(res.data.result);
                self.gridView.current_file = e;
                self.setTitle(self.gridView.current_file.replace(/^\/|\/$/g, ''));
              }
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
              // hide cursor
              $busy_icon_div.removeClass('show_progress');
            },
            error: function(e) {
              var errmsg = $.parseJSON(e.responseText).errormsg;
              alertify.error(errmsg);
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
            'file_name': e,
            'file_content': self.gridView.query_tool_obj.getValue()
          }
          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Saving the queries in the file...') }}'
          );

          // Make ajax call to save the data to file
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "save_file/",
            method: 'POST',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                alertify.success('{{ _('File saved successfully.') }}');
                self.gridView.current_file = e;
                self.setTitle(self.gridView.current_file.replace(/^\/|\/$/g, ''));
                // disable save button on file save
                $("#btn-save").prop('disabled', true);
                $("#btn-file-menu-save").css('display', 'none');
              }
              self.trigger('pgadmin-sqleditor:loading-icon:hide');
            },
            error: function(e) {
              self.trigger('pgadmin-sqleditor:loading-icon:hide');

              var errmsg = $.parseJSON(e.responseText).errormsg;
              setTimeout(
                function() {
                  alertify.error(errmsg);
                }, 10
              );
            },
          });
        },

        // codemirror text change event
        _on_query_change: function(query_tool_obj) {
          var self = this;
          if(query_tool_obj.getValue().length == 0) {
            $("#btn-save").prop('disabled', true);
            $("#btn-file-menu-save").css('display', 'none');
            $("#btn-file-menu-dropdown").prop('disabled', true);
          } else {
            if(self.gridView.current_file) {
              var title = self.gridView.current_file.replace(/^\/|\/$/g, '') + ' *'
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

        // This function will show the filter in the text area.
        _show_filter: function() {
          var self = this;

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Loading the existing filter options...') }}'
          );
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/get/" + self.transId,
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
                  '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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

          // Add column name and it's' value to data
          data[column_info.field] = _values[column_info.field] || '';

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Applying the new filter...') }}'
          );

          // Make ajax call to include the filter by selection
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/inclusive/" + self.transId,
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
                      '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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

          // Add column name and it's' value to data
          data[column_info.field] = _values[column_info.field] || '';

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Applying the new filter...') }}'
          );

          // Make ajax call to exclude the filter by selection.
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/exclusive/" + self.transId,
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
                      '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            '{{ _('Removing the filter...') }}'
          );

          // Make ajax call to exclude the filter by selection.
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/remove/" + self.transId,
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
                      '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            '{{ _('Applying the filter...') }}'
          );

          // Make ajax call to include the filter by selection
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/apply/" + self.transId,
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
                      '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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

        // This function will copy the selected rows(s) in Clipboard.
        copyTextToClipboard: function (text) {
          var textArea = document.createElement("textarea");

          //
          // *** This styling is an extra step which is likely not required. ***
          //
          // Why is it here? To ensure:
          // 1. the element is able to have focus and selection.
          // 2. if element was to flash render it has minimal visual impact.
          // 3. less flakyness with selection and copying which **might** occur if
          //    the textarea element is not visible.
          //
          // The likelihood is the element won't even render, not even a flash,
          // so some of these are just precautions. However in IE the element
          // is visible whilst the popup box asking the user for permission for
          // the web page to copy to the clipboard.
          //

          // Place in top-left corner of screen regardless of scroll position.
          textArea.style.position = 'fixed';
          textArea.style.top = 0;
          textArea.style.left = 0;

          // Ensure it has a small width and height. Setting to 1px / 1em
          // doesn't work as this gives a negative w/h on some browsers.
          textArea.style.width = '2em';
          textArea.style.height = '2em';

          // We don't need padding, reducing the size if it does flash render.
          textArea.style.padding = 0;

          // Clean up any borders.
          textArea.style.border = 'none';
          textArea.style.outline = 'none';
          textArea.style.boxShadow = 'none';

          // Avoid flash of white box if rendered for any reason.
          textArea.style.background = 'transparent';


          textArea.value = text;

          document.body.appendChild(textArea);

          textArea.select();

          try {
            document.execCommand('copy');
          } catch (err) {
            alertify.alert('{{ _('Error') }}',
                           '{{ _('Oops, unable to copy to clipboard') }}');
          }

          document.body.removeChild(textArea);
        },

        // This function will copy the selected row.
        _copy_row: function() {
          var self = this, grid, data, rows, copied_text = '';

          self.copied_rows = [];

          // Disable copy button
          $("#btn-copy-row").prop('disabled', true);
          // Enable paste button
          if(self.can_edit) {
            $("#btn-paste-row").prop('disabled', false);
          }

          grid = self.slickgrid;
          data = grid.getData();
          rows = grid.getSelectedRows();
          // Iterate over all the selected rows & fetch data
          for (var i = 0; i < rows.length; i += 1) {
            var idx = rows[i],
              _rowData = data[idx],
              _values = [];
            self.copied_rows.push(_rowData);
            // Convert it as CSV for clipboard
            for (var j = 0; j < self.columns.length; j += 1) {
               var val = _rowData[self.columns[j].name];
               if(val && _.isObject(val))
                 val = "'" + JSON.stringify(val) + "'";
               else if(val && typeof val != "number")
                 val = "'" + val.toString() + "'";
               else if (_.isNull(val) || _.isUndefined(val))
                 val = '';
                _values.push(val);
            }
            // Append to main text string
            if(_values.length > 0)
              copied_text += _values.toString() + "\n";
          }
          // If there is something to set into clipboard
          if(copied_text)
            self.copyTextToClipboard(copied_text);
        },

        // This function will paste the selected row.
        _paste_row: function() {
          var self = this, col_info = {},
            grid = self.slickgrid,
            data = grid.getData();
            // Deep copy
            var copied_rows = $.extend(true, [], self.copied_rows);

            // If there are rows to paste?
            if(copied_rows.length > 0) {
              // Enable save button so that user can
              // save newly pasted rows on server
              $("#btn-save").prop('disabled', false);
              // Generate Unique key for each pasted row(s)
              _.each(copied_rows, function(row) {
                  var _pk = epicRandomString(8);
                  row.__temp_PK = _pk;
              });
              data = data.concat(copied_rows);
              grid.setData(data, true);
              grid.updateRowCount();
              grid.setSelectedRows([]);
              grid.invalidateAllRows();
              grid.render();

              // Fetch column name & its data type
              _.each(self.columns, function(c) {
                col_info[c.name] = c.type;
              });

              // insert these data in data_store as well to save them on server
              for (var j = 0; j < copied_rows.length; j += 1) {
                self.data_store.added[copied_rows[j].__temp_PK] = {
                  'data_type': {},
                  'data': {}
                };
                self.data_store.added[copied_rows[j].__temp_PK]['data_type'] = col_info;
                _.each(copied_rows[j], function(val, key) {
                  // If value is array then convert it to string
                  if(_.isArray(val)) {
                    copied_rows[j][key] = val.toString();
                  // If value is object then stringify it
                  } else if(_.isObject(val)) {
                    copied_rows[j][key] = JSON.stringify(val);
                  }
                });
                self.data_store.added[copied_rows[j].__temp_PK]['data'] = copied_rows[j];
              }
            }
        },

        // This function will set the limit for SQL query
        _set_limit: function() {
          var self = this;
              limit = parseInt($(".limit").val());

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Setting the limit on the result...') }}'
          );
          // Make ajax call to change the limit
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "limit/" + self.transId,
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
                      '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            '{{ _('Initializing the query execution!') }}'
          );

          $("#btn-flash").prop('disabled', true);

          if (explain_prefix != undefined)
            sql = explain_prefix + ' ' + sql;

          self.query_start_time = new Date();
          self.query = sql;
          self.rows_affected = 0;

          self.disable_tool_buttons(true);
          $("#btn-cancel-query").prop('disabled', false);

          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/start/" + self.transId,
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
                   '{{ _('Waiting for the query execution to complete...') }}'
                );

                self.can_edit = res.data.can_edit;
                self.can_filter = res.data.can_filter;
                self.items_per_page = res.data.items_per_page;
                self.gridView.items_per_page = self.items_per_page;
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
                  '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "cancel/" + self.transId,
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
                  '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
              url: "{{ url_for('sqleditor.index') }}" + "object/get/" + self.transId,
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
                   '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            url = "{{ url_for('sqleditor.index') }}" + "query_tool/download/" + self.transId;

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
            url: "{{ url_for('sqleditor.index') }}" + "auto_rollback/" + self.transId,
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
                 '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "auto_commit/" + self.transId,
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
                 '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/preferences/" + self.transId ,
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  '{{ _('Error occurred while setting verbose option in explain') }}'
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                  '{{ _('Error occurred while setting verbose option in explain') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/preferences/" + self.transId ,
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  '{{ _('Error occurred while setting costs option in explain') }}'
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                  '{{ _('Error occurred while setting costs option in explain') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/preferences/" + self.transId ,
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  '{{ _('Error occurred while setting buffers option in explain') }}'
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                '{{ _('Error occurred while setting buffers option in explain') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/preferences/" + self.transId ,
            method: 'PUT',
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if(res.success == undefined || !res.success) {
                alertify.alert('Explain options error',
                  '{{ _('Error occurred while setting timing option in explain') }}'
                );
              }
            },
            error: function(e) {
              alertify.alert('Explain options error',
                '{{ _('Error occurred while setting timing option in explain') }}'
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
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/preferences/" + self.transId ,
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
                '{{ _('Error occurred while getting query tool options ') }}'
              );
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
