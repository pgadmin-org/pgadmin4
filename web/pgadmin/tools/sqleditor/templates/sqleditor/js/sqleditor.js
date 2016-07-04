define(
  [
    'jquery', 'underscore', 'underscore.string', 'alertify', 'pgadmin',
    'backbone', 'backgrid', 'codemirror', 'pgadmin.misc.explain',
    'backgrid.select.all', 'backgrid.filter', 'bootstrap', 'pgadmin.browser',
    'codemirror/mode/sql/sql', 'codemirror/addon/selection/mark-selection',
    'codemirror/addon/selection/active-line', 'backbone.paginator',
    'codemirror/addon/fold/foldgutter', 'codemirror/addon/fold/foldcode',
    'codemirror/addon/hint/show-hint', 'codemirror/addon/hint/sql-hint',
    'codemirror/addon/fold/pgadmin-sqlfoldcode', 'backgrid.paginator',
    'backgrid.sizeable.columns', 'wcdocker', 'pgadmin.file_manager'
  ],
  function(
    $, _, S, alertify, pgAdmin, Backbone, Backgrid, CodeMirror, pgExplain
  ) {
    // Some scripts do export their object in the window only.
    // Generally the one, which do no have AMD support.
    var wcDocker = window.wcDocker,
      pgBrowser = pgAdmin.Browser;

    /* Return back, this has been called more than once */
    if (pgAdmin.SqlEditor)
      return pgAdmin.SqlEditor;

    /* Get the function definition from
     * http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript/35302975#35302975
     */
    function epicRandomString(b){for(var a=(Math.random()*eval("1e"+~~(50*Math.random()+50))).toString(36).split(""),c=3;c<a.length;c++)c==~~(Math.random()*c)+1&&a[c].match(/[a-z]/)&&(a[c]=a[c].toUpperCase());a=a.join("");a=a.substr(~~(Math.random()*~~(a.length/3)),~~(Math.random()*(a.length-~~(a.length/3*2)+1))+~~(a.length/3*2));if(24>b)return b?a.substr(a,b):a;a=a.substr(a,b);if(a.length==b)return a;for(;a.length<b;)a+=epicRandomString();return a.substr(0,b)};

    // Defining the backbone model for the sql grid
    var sqlEditorViewModel = Backbone.Model.extend({

      /* Keep track of values for the original primary keys for later reference,
       * to allow to change the value of primary keys in the model, which will be
       * required to identify the value of any row in the datagrid for the relation.
       */
      parse: function(data) {
        var self = this;
        self.grid_keys = {};
        self.marked_for_deletion = false;
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
          'data': res,
          'marked_for_deletion': this.marked_for_deletion
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

    // Suppose you want to highlight the entire row when an editable field is focused
    var FocusableRow = Backgrid.Row.extend({
      highlightColor: "#D9EDF7",
      events: {
        focusin: "rowFocused",
        focusout: "rowLostFocus"
      },
      rowFocused: function() {
        this.model.trigger('backgrid:row:selected', this);
        this.el.style.backgroundColor = this.highlightColor;
      },
      rowLostFocus: function() {
        this.model.trigger('backgrid:row:deselected', this);
      }
    });

    /*
     * Extend the FocusableRow row used when user marked
     * the row for deletion.
     */
    var SqlEditorCustomRow = FocusableRow.extend({
      initialize: function() {
        Backgrid.Row.prototype.initialize.apply(this, arguments);
        _.bindAll(this, 'render');

        // Listen for the mark for deletion event and call render method.
        this.model.on('backgrid:row:mark:deletion', this.render);
      },
      remove: function() {
        this.model.off('backgrid:row:mark:deletion', this.render);
        Backgrid.Row.prototype.remove.apply(this, arguments);
      },
      render: function() {
        var res = Backgrid.Row.prototype.render.apply(this, arguments);

        if (this.model.marked_for_deletion)
          this.$el.addClass('pgadmin-row-deleted');
        else
          this.$el.removeClass('pgadmin-row-deleted');

        return res;
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
        "click #btn-add-row": "on_add",
        "click #btn-filter": "on_show_filter",
        "click #btn-include-filter": "on_include_filter",
        "click #btn-exclude-filter": "on_exclude_filter",
        "click #btn-remove-filter": "on_remove_filter",
        "click #btn-apply": "on_apply",
        "click #btn-cancel": "on_cancel",
        "click #btn-copy-row": "on_copy_row",
        "click #btn-paste-row": "on_paste_row",
        "click #btn-flash": "on_flash",
        "click #btn-cancel-query": "on_cancel_query",
        "click #btn-download": "on_download",
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

        $('.editor-title').text(self.editor_title);

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
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
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

        var output_container = $('<div id="output-panel"></div>');
        var text_container = $('<textarea id="sql_query_tool"></textarea>').append(output_container);
        sql_panel_obj.layout().addItem(text_container);

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
            extraKeys: {"Ctrl-Space": "autocomplete"}
        });

        // Create panels for 'Data Output', 'Explain', 'Messages' and 'History'
        var data_output = new pgAdmin.Browser.Panel({
          name: 'data_output',
          title: '{{ _('Data Output') }}',
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true,
          content: '<div id ="datagrid" class="sql-editor-grid-container"></div><div id ="datagrid-paginator"></div>'
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

        /* We have override/register the hint function of CodeMirror
         * to provide our own hint logic.
         */
        CodeMirror.registerHelper("hint", "sql", function(editor, options) {
          var data = [],
              result = [];
          var doc = editor.getDoc();
          var cur = doc.getCursor();
          var current_line = cur.line; // gets the line number in the cursor position
          var current_cur = cur.ch;  // get the current cursor position

          /* Render function for hint to add our own class
           * and icon as per the object type.
           */
          var hint_render = function(elt, data, cur) {
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
          };

          var full_text = doc.getValue();
          // Get the text from start to the current cursor position.
          var text_before_cursor = doc.getRange({ line: 0, ch: 0 },
                    { line: current_line, ch: current_cur });

          data.push(full_text);
          data.push(text_before_cursor);

          // Make ajax call to find the autocomplete data
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "autocomplete/" + self.transId,
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              _.each(res.data.result, function(obj, key) {
                 result.push({
                     text: key, type: obj.object_type,
                     render: hint_render
                 });
              });

              // Sort function to sort the suggestion's alphabetically.
              result.sort(function(a, b){
                var textA = a.text.toLowerCase(), textB = b.text.toLowerCase()
                if (textA < textB) //sort string ascending
                    return -1
                if (textA > textB)
                    return 1
                return 0 //default return value (no sorting)
              })
            }
          });

          /* Below logic find the start and end point
           * to replace the selected auto complete suggestion.
           */
          var token = editor.getTokenAt(cur), start, end, search;
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

          /* Added 1 in the start position if search string
           * started with "." or "`" else auto complete of code mirror
           * will remove the "." when user select any suggestion.
           */
          if (search.charAt(0) == "." || search.charAt(0) == "``")
            start += 1;

          return {list: result, from: {line: current_line, ch: start }, to: { line: current_line, ch: end }};
        });
      },

      /* This function is responsible to create and render the
       * new backgrid and paginator.
       */
      render_grid: function(collection, columns) {
        var self = this;

        // Remove any existing grid first
        if (self.grid) {
            self.grid.remove();
        }

        // Remove any existing paginator
        if (self.paginator) {
            self.paginator.remove();
        }

        // Remove any existing client side filter
        if (self.clientSideFilter) {
            self.clientSideFilter.remove();
        }

        // Create an array for client filter
        var filter_array = new Array()
        _.each(columns, function(c) {
            filter_array.push(c.name);
        });

        // Create Collection of Backgrid columns
        var columnsColl = new Backgrid.Columns(columns);
        var $data_grid = self.$el.find('#datagrid');

        var grid = self.grid = new Backgrid.Grid({
            columns: columnsColl,
            collection: collection,
            className: "backgrid table-bordered",
            row: SqlEditorCustomRow
          }),
          clientSideFilter = self.clientSideFilter = new Backgrid.Extension.ClientSideFilter({
                 collection: collection,
                 placeholder: _('Search'),
                 // The model fields to search for matches
                 fields: filter_array,
                 // How long to wait after typing has stopped before searching can start
                 wait: 150
          });

        // Render the paginator if items_per_page is greater than zero.
        if (self.items_per_page > 0) {
          if ($data_grid.hasClass('has-no-footer'))
            $data_grid.removeClass('has-no-footer');

          // Render the grid
          $data_grid.append(self.grid.render().$el);

          var paginator = self.paginator = new Backgrid.Extension.Paginator({
            goBackFirstOnSort: false,
            collection: collection
          })

          // Render the paginator
          self.$el.find('#datagrid-paginator').append(paginator.render().el);
        }
        else {
          if (!$data_grid.hasClass('has-no-footer'))
            $data_grid.addClass('has-no-footer');

          // Render the grid
          $data_grid.append(self.grid.render().$el);
        }

        // Render the client side filter
        self.$el.find('.pg-prop-btn-group').append(clientSideFilter.render().el);

        var sizeAbleCol = new Backgrid.Extension.SizeAbleColumns({
          collection: collection,
          columns: columnsColl,
          grid: self.grid
        });

        $data_grid.find('thead').before(sizeAbleCol.render().el);

        // Add resize handlers
        var sizeHandler = new Backgrid.Extension.SizeAbleColumnsHandlers({
          sizeAbleColumns: sizeAbleCol,
          grid: self.grid,
          saveColumnWidth: true
        });

        // sizeHandler should render only when table grid loaded completely.
        setTimeout(function() {
          $data_grid.find('thead').before(sizeHandler.render().el);
        }, 1000);

        // Initialized table width 0 still not calculated
        var table_width = 0;
        // Listen to resize events
        columnsColl.on('resize',
          function(columnModel, newWidth, oldWidth, offset) {
            var $grid_el = $data_grid.find('table'),
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
      on_add: function() {
        var self = this;

        // Trigger the addrow signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:addrow',
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
        ev = ev || window.event;
        ev.cancelBubble = true;
        ev.stopPropagation();

        this.query_tool_obj.setValue('');
      },

      // Callback function for the clear history button click.
      on_clear_history: function(ev) {
        this._stopEventPropogation(ev);
        this._closeDropDown(ev);

        // Remove any existing grid first
        if (this.history_grid) {
            this.history_collection.reset();
        }
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

      // Callback for keyboard event
      keyAction: function(ev) {
        if(ev.ctrlKey && ev.shiftKey) {
          if(ev.keyCode == 69) {
            // char e/E
            // Execute query.
            this.on_flash(ev);
          } else if(ev.keyCode == 88) {
            // char x/X
            // Explain query.
            this.on_explain(ev);
          } else if(ev.keyCode == 78) {
            // char n/N
            // Explain analyze query.
            this.on_explain_analyze(ev);
          }
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

          self.gridView.editor_title = editor_title;
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
            self.gridView.query_tool_obj.on('change', self._on_query_change, self);
          }

          // Listen on events come from SQLEditorView for the button clicked.
          self.on('pgadmin-sqleditor:button:load_file', self._load_file, self);
          self.on('pgadmin-sqleditor:button:save', self._save, self);
          self.on('pgadmin-sqleditor:button:addrow', self._add, self);
          self.on('pgadmin-sqleditor:button:show_filter', self._show_filter, self);
          self.on('pgadmin-sqleditor:button:include_filter', self._include_filter, self);
          self.on('pgadmin-sqleditor:button:exclude_filter', self._exclude_filter, self);
          self.on('pgadmin-sqleditor:button:remove_filter', self._remove_filter, self);
          self.on('pgadmin-sqleditor:button:apply_filter', self._apply_filter, self);
          self.on('pgadmin-sqleditor:button:copy_row', self._copy_row, self);
          self.on('pgadmin-sqleditor:button:paste_row', self._paste_row_callback, self);
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
            self.gridView.query_tool_obj.setOption("readOnly",true);
            self.disable_tool_buttons(true);
            self._execute_data_query();
          }
        },

        // This function makes the ajax call to execute the sql query.
        _execute_data_query: function() {
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
                self.gridView.items_per_page = self.items_per_page

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
                $("#btn-copy-row").prop('disabled', true);
                $("#btn-paste-row").prop('disabled', true);

                // Set the combo box value
                $(".limit").val(res.data.limit);

                // If status is True then poll the result.
                self._poll();
              }
              else {
                self.update_msg_history(false, res.data.result);
              }
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
                      self.update_msg_history(true, res.data.result);
                    }

                    // Enable/Disable query tool button only if is_query_tool is true.
                    if (self.is_query_tool) {
                      self.disable_tool_buttons(false);
                      $("#btn-cancel-query").prop('disabled', true);
                    }
                  }
                  else if (res.data.status === 'Busy') {
                    // If status is Busy then poll the result by recursive call to the poll function
                    self._poll();
                  }
                  else if (res.data.status === 'NotConnected') {

                    // Enable/Disable query tool button only if is_query_tool is true.
                    if (self.is_query_tool) {
                      self.disable_tool_buttons(false);
                      $("#btn-cancel-query").prop('disabled', true);
                    }
                    self.update_msg_history(false, res.data.result);
                  }
                  else if (res.data.status === 'Cancel') {
                    self.update_msg_history(false, "Execution Cancelled!")
                  }
                },
                error: function(e) {
                  // Enable/Disable query tool button only if is_query_tool is true.
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

          // Stop listening to all the events
          if (self.collection) {
            self.collection.off('change', self.on_model_change, self);
            self.collection.off('backgrid:selected', self.on_backgrid_selected, self);
            self.collection.off('backgrid:editing', self.on_cell_editing, self);
          }

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

          /* If user can edit the data then we should enabled
           * add row, copy row and paste row buttons.
           */
          if (self.can_edit) {
            $("#btn-add-row").prop('disabled', false);
          }
          else {
            $("#btn-save").prop('disabled', true);
            $("#btn-add-row").prop('disabled', true);
            $("#btn-copy-row").prop('disabled', true);
            $("#btn-paste-row").prop('disabled', true);
          }

          // Fetch the columns metadata
          self.columns = self._fetch_column_metadata(data);

          self.trigger(
            'pgadmin-sqleditor:loading-icon:message',
            '{{ _('Loading data from the database server and rendering...') }}',
            self
          );

          /* Defining backbone's pageable collection if items per page
           * is greater than zero else define backbone collection.
           */
          if (self.items_per_page > 0) {
            self.collection = new (Backbone.PageableCollection.extend({
              mode: "client",
              state: {
                pageSize: self.items_per_page,
                order: -1
              },
              model: sqlEditorViewModel.extend({
                primary_keys: self.primary_keys,

                /* Change the idAttribute to random string
                 * so that it won't clash with id column of
                 * the table.
                 */
                idAttribute: epicRandomString(10)
              })
            }));
          }
          else {
            self.collection = new (Backbone.Collection.extend({
              model: sqlEditorViewModel.extend({
                primary_keys: self.primary_keys,

                /* Change the idAttribute to random string
                 * so that it won't clash with id column of
                 * the table.
                 */
                idAttribute: epicRandomString(10)
              })
            }));
          }

          // Listen on backgrid events
          self.collection.on('change', self.on_model_change, self);
          self.collection.on('backgrid:selected', self.on_backgrid_selected, self);
          self.collection.on('backgrid:editing', self.on_cell_editing, self);
          self.collection.on('backgrid:row:selected', self.on_row_selected, self);
          self.collection.on('backgrid:row:deselected', self.on_row_deselected, self);

          // Show message in message and history tab in case of query tool
          self.total_time = self.get_query_run_time(self.query_start_time, self.query_end_time);
          self.update_msg_history(true, "", false);
          var message = 'Total query runtime: ' + self.total_time + '\n' + self.rows_affected + ' rows retrieved.';
          $('.sql-editor-message').text(message);

          /* Add the data to the collection and render the grid.
           * In case of Explain draw the graph on explain panel
           * and add json formatted data to collection and render.
           */
          var explain_data_array = [];
          if(data.result &&
              'QUERY PLAN' in data.result[0] &&
              _.isObject(data.result[0]['QUERY PLAN'])) {
              var explain_data = {'QUERY PLAN' : JSON.stringify(data.result[0]['QUERY PLAN'], null, 2)};
              explain_data_array.push(explain_data);
              self.gridView.explain_panel.focus();
              pgExplain.DrawJSONPlan($('.sql-editor-explain'), data.result[0]['QUERY PLAN']);
              self.collection.add(explain_data_array, {parse: true});
              self.gridView.render_grid(self.collection, self.columns);
          }
          else {
            self.collection.add(data.result, {parse: true});
            self.gridView.render_grid(self.collection, self.columns);
            self.gridView.data_output_panel.focus();
          }

          // Hide the loading icon
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          $("#btn-flash").prop('disabled', false);
        },

        // This function creates the columns as required by the backgrid
        _fetch_column_metadata: function(data) {
          var colinfo = data.colinfo,
              primary_keys = data.primary_keys,
              result = data.result,
              self = this,
              columns = [{
                // name is a required parameter, but you don't really want one on a select all column
                name: "",

                /* Extend Backgrid.Extension.SelectRowCell to create
                 * a custom checkbox where we change the icon when user
                 * click on checkbox.
                 */
                cell: Backgrid.Extension.SelectRowCell.extend({
                  render: function() {
                    var self = this,
                        id = _.uniqueId('sql_grid_deletable_');
                    Backgrid.Extension.SelectRowCell.prototype.render.apply(this, arguments);

                    // Find the input control and add sqleditor-checkbox class
                    this.$el.find('input').attr('id', id).addClass(
                        'sqleditor-checkbox'
                        ).prop('checked', this.model.marked_for_deletion);

                    // Append the label and add class to change the icon and color using css
                    this.$el.append(
                        $('<label>', {
                            for: id, class: 'deletable'
                        }).append($('<span>')));

                    this.delegateEvents();
                    return this;
                  }
                }),

                // Backgrid.Extension.SelectAllHeaderCell lets you select all the row on a page
                headerCell: "select-all"
              }];

          /* If user will not be able to edit data
           * then no need to show 'select-all' column.
           */
          if (!self.can_edit) {
            columns = [];
            $('#datagrid').removeClass('has-select-all');
          }
          else {
            if ($('#datagrid').hasClass('has-select-all') === false)
                $('#datagrid').addClass('has-select-all');
          }

          self.trigger(
            'pgadmin-sqleditor:loading-icon:message',
            '{{ _('Retrieving information about the columns returned...') }}'
          );

          // Make ajax call to fetch the pg types to map numeric data type
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "fetch/types/" + self.transId,
            method: 'GET',
            async: false,
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
                  var column_label = document.createElement('div'),
                      label_text = document.createElement('div'),
                      column_type = document.createElement('span'),
                      col_label = '',
                      col_type = '';
                  label_text.innerText = c.name;

                  var type = pg_types[c.type_code][0];
                  if (!is_primary_key)
                    col_type += ' ' + type;
                  else
                    col_type += ' [PK] ' + type;

                  if (c.precision == null) {
                    if (c.internal_size > 0)
                      col_type += ' (' + c.internal_size + ')';
                  }
                  else
                    col_type += ' (' + c.precision + ',' + c.scale + ')';

                  column_type.innerText = col_type;

                  // Set values of column label and its type
                  column_label.appendChild(label_text);
                  column_label.appendChild(column_type);

                  // Identify cell type of column.
                  switch(type) {
                    case "integer":
                      col_cell = 'integer';
                      break;
                    case "boolean":
                      col_cell = 'boolean';
                      break;
                    case "numeric":
                      col_cell = 'number';
                      break;
                    case "timestamp without time zone":
                    case "timestamp with time zone":
                      col_cell = 'datetime';
                      break;
                    case "json":
                    case "json[]":
                    case "jsonb":
                    case "jsonb[]":
                      col_cell = Backgrid.Extension.JSONBCell;
                      break;
                    default:
                      col_cell = 'string';
                  }

                  var col = {
                    name : c.name,
                    label: column_label.innerHTML,
                    cell: col_cell,
                    can_edit: self.can_edit,
                    editable: self.is_editable,
                    resizeable: true,
                    headerCell: Backgrid.HeaderCell.extend({
                      render: function () {
                        // Add support for HTML element in column title
                        this.$el.empty();
                        var column = this.column,
                            sortable = Backgrid.callByNeed(column.sortable(), column, this.collection),
                            label;
                        if(sortable){
                          label = $("<a>").append(column.get("label")).append("<b class='sort-caret'></b>");
                        } else {
                          var header_column = document.createElement('div');
                          label = header_column.appendChild(column.get("label"));
                        }

                        this.$el.append(label);
                        this.$el.addClass(column.get("name"));
                        this.$el.addClass(column.get("direction"));
                        this.delegateEvents();
                        return this;
                      }
                    })
                  };
                  columns.push(col);
                });
              }
              else {
               alertify.alert('Fetching Type Error', res.data.result);
              }
            }
          });

          return columns;
        },

        // This function is used to raise appropriate message.
        update_msg_history: function(status, msg, clear_grid) {
          var self = this;

          if (clear_grid === undefined)
            clear_grid = true;

          self.trigger('pgadmin-sqleditor:loading-icon:hide');
          $("#btn-flash").prop('disabled', false);

          $('.sql-editor-message').text(msg);
          self.gridView.messages_panel.focus();

          if (self.is_query_tool && clear_grid) {
            // Delete grid and paginator
            if (self.gridView.grid) {
              self.gridView.grid.remove();
              self.columns = undefined;
              self.collection = undefined;
            }

            if (self.gridView.paginator)
             self.gridView.paginator.remove();
          }

          self.gridView.history_collection.add(
            {'status' : status, 'start_time': self.query_start_time.toString(),
             'query': self.query, 'row_affected': self.rows_affected,
             'total_time': self.total_time, 'message':msg
          });

          self.gridView.history_collection.sort();
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
         * and marked_for_deletion flag
         */
        is_editable: function(obj) {
          var self = this;
          if (obj instanceof Backbone.Collection)
            return false;
          return (self.get('can_edit') && !obj.marked_for_deletion);
        },

        /* This is a callback function when there is any change
         * in the model and stores the unique id (cid) to the changedModels
         * array which will be used when Save button is clicked.
         */
        on_model_change: function(model) {
          $("#btn-save").prop('disabled', false);
          var self = this;
          model.changed_data = true;
          if (_.indexOf(self.changedModels, model.cid) == -1) {
            self.changedModels.push(model.cid);
          }
          return;
        },

        // This is a callback function when backgrid is selected
        on_backgrid_selected: function (model, selected) {
          var self = this,
              item_idx = _.indexOf(self.changedModels, model.cid);

          // If data can't be edited then no need to marked for deletion.
          if (!self.can_edit)
           return;

          if (selected) {
            /* Check whether it is a new row, not inserted
             * yet to the database. If yes then remove the row
             * immediately. If not then marked the row for deletion.
             */
            if ('grid_keys' in model) {
              model.marked_for_deletion = true;

              // Push the model if not already exist and if exists then update the flag
              if (item_idx == -1)
                self.changedModels.push(model.cid);

            }
            else {
               // Pop the model from changed model list if already exist
              if (item_idx != -1)
                self.changedModels.splice(item_idx, 1);

              self.collection.remove(model);
            }
          }
          else {
            if (item_idx != -1) {
              model.marked_for_deletion = false;
              /* In case of deselected we check whether data is updated
               * for this model, if not updated then delete it from
               * changed list.
               */
              if (!model.changed_data)
                self.changedModels.splice(item_idx, 1);
            }
          }

          // Trigger the mark for deletion event where SqlEditorCustomRow is listening
          model.trigger('backgrid:row:mark:deletion', model);

          // Enable/Disable Save button
          if (self.changedModels.length > 0)
            $("#btn-save").prop('disabled', false);
          else
            $("#btn-save").prop('disabled', true);
        },

        /* This is a callback function when backgrid cell
         * is selected we need this event for filter by selection
         * or filter exclude selection.
         */
        on_cell_editing: function (model, column) {
          var self = this;

          self.cell_selected = true;
          self.column_name = column.attributes.name;
          self.column_value = model.attributes[self.column_name]
        },

        /* This is a callback function when backgrid row
         * is selected. This function will change the color
         * of the backgrid row and saved the selected model.
         */
        on_row_selected: function(row) {
          var self = this;
          if (self.selected_row && self.selected_row.cid != row.cid) {
            self.selected_row.el.style.backgroundColor = '';
          }
          self.selected_row = row;
          self.selected_model = row.model;

          if (self.can_edit) {
            $("#btn-copy-row").prop('disabled', false);
          }
        },

        /* This is a callback function when backgrid row
         * is deselected. This function will clear the background
         * color and reset the selected model.
         */
        on_row_deselected: function(row) {
          var self = this;
          setTimeout(
            function() {
              if (self.selected_row.cid != row.cid) {
                row.el.style.backgroundColor = '';
                self.cell_selected = false;
                self.selected_model = null;
              }
            }, 200
          );
        },

        // This function will add a new row to the backgrid.
        _add: function() {
          var self = this,
              empty_model = new (self.collection.model);

          // If items_per_page is zero then no pagination.
          if (self.items_per_page === 0) {
            self.collection.add(empty_model);
          }
          else {
            // If current page is not the last page then confirm from the user
            if (self.collection.state.currentPage != self.collection.state.lastPage) {
              alertify.confirm('{{ _('Add New Row') }}',
                '{{ _('The result set display will move to the last page. Do you wish to continue?') }}',
                function() {
                  self.collection.getLastPage();
                  self.collection.add(empty_model);
                },
                function() {
                  // Do nothing as user canceled the operation.
                }
              ).set('labels', {ok:'Yes', cancel:'No'});
            }
            else {
              self.collection.add(empty_model);

              /* If no of items on the page exceeds the page size limit then
               * advanced to the next page.
               */
              var current_page = self.collection.getPage(self.collection.state.currentPage);
              if (current_page.length >= current_page.state.pageSize)
                self.collection.getLastPage();
            }
          }
        },

        /* This function will fetch the list of changed models and make
         * the ajax call to save the data into the database server.
         * and will open save file dialog conditionally.
         */
        _save: function() {
          var self = this,
              data = [],
              save_data = true;

          // Open save file dialog if query tool
          if (self.is_query_tool) {

            var current_file = self.gridView.current_file;
            if (!_.isUndefined(current_file)) {
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
          if (self.changedModels.length == 0)
            return;

          for (var i = 0; i < self.changedModels.length; i++) {
            if (self.collection) {
              var model = self.collection.get(self.changedModels[i]);
              /* Iterate through primary keys and check the key
               * is not null. If it is null then raise an error
               * and return from the function.
               */
              _.each(self.primary_keys, function (value, key) {
                if (model.attributes[key] === null ||
                    model.attributes[key] === undefined) {
                 alertify.alert(
                    'Save Error',
                    '{{ _('Primary key columns cannot be null.') }}'
                 );
                 save_data = false;

                 return;
                }
              });

              if (save_data)
                data.push(model.toJSON(true, false));
            }
          }

          if (save_data) {

            // Make ajax call to save the data
            $.ajax({
              url: "{{ url_for('sqleditor.index') }}" + "save/" + self.transId,
              method: 'POST',
              async: false,
              contentType: "application/json",
              data: JSON.stringify(data),
              success: function(res) {
                if (res.data.status) {
                  // Update the primary keys if changed in the model
                  for (var i = 0; i < self.changedModels.length; i++) {
                    if (self.collection) {
                      var model = self.collection.get(self.changedModels[i]);

                      /* if model is marked for deletion the destroy
                       * the model else update the primary keys if changed.
                       */
                      if (model.marked_for_deletion)
                        model.destroy();
                      else
                        model.update_keys();
                    }
                  }

                  self.changedModels.length = 0;
                }
                else {
                  self.trigger('pgadmin-sqleditor:loading-icon:hide');
                  $("#btn-flash").prop('disabled', false);
                  $('.sql-editor-message').text(res.data.result);
                  self.gridView.messages_panel.focus();
                }

                // Update the sql results in history tab
                _.each(res.data.query_result, function(r) {

                  self.gridView.history_collection.add(
                    {'status' : r.status, 'start_time': self.query_start_time.toString(),
                    'query': r.sql, 'row_affected': r.rows_affected,
                    'total_time': self.total_time, 'message': r.result
                  });
                });
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

        // load select file dialog
        _load_file: function() {
          var params = {
            'supported_types': ["sql"], // file types allowed
            'dialog_type': 'select_file' // open select file dialog
          }
          pgAdmin.FileManager.init();
          pgAdmin.FileManager.show_dialog(params);
        },

        // read file data and return as response
        _select_file_handler: function(e) {
          var self = this;

          data = {
            'file_name': e
          }

          // Make ajax call to load the data from file
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "load_file/",
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                self.gridView.query_tool_obj.setValue(res.data.result);
                self.gridView.current_file = e;
              }
            },
            error: function(e) {
              var errmsg = $.parseJSON(e.responseText).errormsg;
              alertify.error(errmsg);
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

          // Make ajax call to save the data to file
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "save_file/",
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                alertify.success('{{ _('File saved successfully.') }}');
                self.gridView.current_file = e;

                // disable save button on file save
                $("#btn-save").prop('disabled', true);
              }
            },
            error: function(e) {
              var errmsg = $.parseJSON(e.responseText).errormsg;
              alertify.error(errmsg);
            }
          });
        },

        // codemirror text change event
        _on_query_change: function(query_tool_obj) {

          if(query_tool_obj.getValue().length == 0) {
            $("#btn-save").prop('disabled', true);
          }
          else {
            $("#btn-save").prop('disabled', false);
          }
        },


        // This function will run the SQL query and refresh the data in the backgrid.
        _refresh: function() {
          var self = this;

          // Start execution of the query.
          if (self.is_query_tool)
            self._execute();
          else
            self._execute_data_query();
        },

        // This function will show the filter in the text area.
        _show_filter: function() {
          var self = this;

          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/get/" + self.transId,
            method: 'GET',
            success: function(res) {
              if (res.data.status) {
                $('#filter').removeClass('hidden');
                $('#editor-panel').addClass('sql-editor-busy-fetching');
                self.gridView.filter_obj.refresh();

                if (res.data.result == null)
                  self.gridView.filter_obj.setValue('');
                else
                  self.gridView.filter_obj.setValue(res.data.result);
              }
              else {
                alertify.alert('Get Filter Error', res.data.result);
              }
            },
            error: function(e) {
              if (e.readyState == 0) {
                alertify.alert('Get Filter Error',
                  '{{ _('Not connected to the server or the connection to the server has been closed.') }}'
                );
                return;
              }

              var msg = e.responseText;
              if (e.responseJSON != undefined &&
                  e.responseJSON.errormsg != undefined)
                msg = e.responseJSON.errormsg;

              alertify.alert('Get Filter Error', msg);
            }
          });
        },

        // This function will include the filter by selection.
        _include_filter: function () {
          var self = this,
              data = {};

          // If no cell is selected then return from the function
          if (self.cell_selected === false)
            return;

          // Add column name and their value to data
          data[self.column_name] = self.column_value;

          // Make ajax call to include the filter by selection
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/inclusive/" + self.transId,
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                // Refresh the sql grid
                self._refresh();
              }
              else {
                alertify.alert('Filter By Selection Error', res.data.result);
              }
            },
            error: function(e) {
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
            }
          });
        },

        // This function will exclude the filter by selection.
        _exclude_filter: function () {
          var self = this,
              data = {};

          // If no cell is selected then return from the function
          if (self.cell_selected === false)
            return;

          // Add column name and their value to data
          data[self.column_name] = self.column_value;

          // Make ajax call to exclude the filter by selection.
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/exclusive/" + self.transId,
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function(res) {
              if (res.data.status) {
                // Refresh the sql grid
                self._refresh();
              }
              else {
                alertify.alert('Filter Exclude Selection Error', res.data.result);
              }
            },
            error: function(e) {
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
            }
          });
        },

        // This function will remove the filter.
        _remove_filter: function () {
          var self = this;

          // Make ajax call to exclude the filter by selection.
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/remove/" + self.transId,
            method: 'POST',
            async: false,
            success: function(res) {
              if (res.data.status) {
                // Refresh the sql grid
                self._refresh();
              }
              else {
                alertify.alert('Remove Filter Error', res.data.result);
              }
            },
            error: function(e) {
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
          });
        },

        // This function will apply the filter.
        _apply_filter: function() {
          var self = this;
              sql = self.gridView.filter_obj.getValue();

          // Make ajax call to include the filter by selection
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "filter/apply/" + self.transId,
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(sql),
            success: function(res) {
              if (res.data.status) {
                $('#filter').addClass('hidden');
                $('#editor-panel').removeClass('sql-editor-busy-fetching');
                // Refresh the sql grid
                self._refresh();
              }
              else {
                alertify.alert('Apply Filter Error',res.data.result);
              }
            },
            error: function(e) {
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
            }
          });
        },

        // This function will copy the selected row.
        _copy_row: function() {
          var self = this;

          $("#btn-paste-row").prop('disabled', false);

          // Save the selected model as copied model for future use
          if ('selected_model' in self)
            self.copied_model = self.selected_model;
        },

        // This function will paste the selected row.
        _paste_row: function() {
          var self = this;
              new_model = null;
          if ('copied_model' in self && self.copied_model != null) {
            $("#btn-save").prop('disabled', false);

            // fullCollection is part of pageable collection
            var coll = self.collection.fullCollection === undefined ? self.collection : self.collection.fullCollection;

            /* Find the model to be copied in the collection
             * if found then we need to clone the object, so
             * that it's cid/id gets changed.
             */
            if (coll.get(self.copied_model.cid) === undefined)
              new_model = self.copied_model;
            else
              new_model = self.copied_model.clone();

            /* Add the model to the array of changedModels which
             * will be used when save button is clicked.
             */
            if (_.indexOf(self.changedModels, new_model.cid) == -1) {
                self.changedModels.push(new_model.cid);
            }

            // Add the copied model to collection
            self.collection.add(new_model);
          }
        },

        // This function is callback function for paste row.
        _paste_row_callback: function() {
          var self = this;

          // If items_per_page is zero then no pagination.
          if (self.items_per_page == 0) {
            self._paste_row();
          }
          else {
            // If current page is not the last page then confirm from the user
            if (self.collection.state.currentPage != self.collection.state.lastPage) {
              alertify.confirm('{{ _('Paste Row') }}',
                '{{ _('The result set display will move to the last page. Do you wish to continue?') }}',
                function() {
                  self.collection.getLastPage();
                  self._paste_row();
                },
                function() {
                  // Do nothing as user canceled the operation.
                }
              ).set('labels', {ok:'Yes', cancel:'No'});
            }
            else {
              self._paste_row();

              /* If no of items on the page exceeds the page size limit then
               * advanced to the next page.
               */
              var current_page = self.collection.getPage(self.collection.state.currentPage);
              if (current_page.length >= current_page.state.pageSize)
                self.collection.getLastPage();
            }
          }
        },

        // This function will set the limit for SQL query
        _set_limit: function() {
          var self = this;
              limit = parseInt($(".limit").val());

          // Make ajax call to change the limit
          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "limit/" + self.transId,
            method: 'POST',
            async: false,
            contentType: "application/json",
            data: JSON.stringify(limit),
            success: function(res) {
              if (res.data.status) {
                // Refresh the sql grid
                self._refresh();
              }
              else
                alertify.alert('Change limit Error', res.data.result);
            },
            error: function(e) {
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
            async: false,
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
                self.gridView.items_per_page = self.items_per_page

                // If status is True then poll the result.
                self._poll();
              }
              else {
                self.disable_tool_buttons(false);
                $("#btn-cancel-query").prop('disabled', true);
                self.update_msg_history(false, res.data.result);

                // Highlight the error in the sql panel
                self._highlight_error(res.data.result);
              }
            },
            error: function(e) {
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
            async: false,
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
          var self = this;
          var coll = self.collection.fullCollection === undefined ? self.collection : self.collection.fullCollection;

          if (self.columns != undefined &&
              coll != undefined &&
              coll.length > 0)
          {
            var csv_col = _.indexBy(self.columns, 'name'),
                labels = _.pluck(self.columns, 'label'),
                keys = _.pluck(self.columns, 'name');

            // Fetch the items from fullCollection and convert it as csv format
            var csv = labels.join(',') + '\n';
            csv += coll.map(function(item) {
                return _.map(keys, function(key) {
                  var cell = csv_col [key].cell,
                      // suppose you want to preserve custom formatters
                      formatter = cell.prototype && cell.prototype.formatter;

                  return formatter && formatter.fromRaw ?
                            formatter.fromRaw(item.get(key), item) : item.get(key);
                }).join(',');
            }).join('\n');

            // Download the file.
            var encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csv),
                    link = document.createElement('a');
            link.setAttribute('href', encodedUri);

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
                    link.setAttribute('download', filename);
                    link.click();
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
            }
            else {
              var cur_time = new Date();
              var filename = 'data-' + cur_time.getTime() + '.csv';
              link.setAttribute('download', filename);
              link.click();
            }
          }
          else {
            alertify.alert('Download Data', 'No data is available to download');
          }
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
            async: false,
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
            async: false,
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
              auto_rollback = false;

          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "query_tool/preferences/" + self.transId ,
            method: 'GET',
            async: false,
            success: function(res) {
              if (res.data) {
                explain_verbose = res.data.explain_verbose;
                explain_costs = res.data.explain_costs;
                explain_buffers = res.data.explain_buffers;
                explain_timing = res.data.explain_timing;
                auto_commit = res.data.auto_commit;
                auto_rollback = res.data.auto_rollback;
              }
            },
            error: function(e) {
              alertify.alert('Get Preferences error',
                '{{ _('Error occurred while getting query tool options ') }}'
              );
            }
          });

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
