define(
  ['jquery', 'underscore', 'alertify', 'pgadmin', 'backbone', 'backgrid', 'codemirror',
   'codemirror/mode/sql/sql', 'codemirror/addon/selection/mark-selection', 'codemirror/addon/selection/active-line',
   'backgrid.select.all', 'backbone.paginator', 'backgrid.paginator', 'backgrid.filter',
   'bootstrap', 'pgadmin.browser', 'wcdocker'],
  function($, _, alertify, pgAdmin, Backbone, Backgrid, CodeMirror) {

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
        "click #btn-save": "on_save",
        "click #btn-add-row": "on_add",
        "click #btn-filter": "on_show_filter",
        "click #btn-include-filter": "on_include_filter",
        "click #btn-exclude-filter": "on_exclude_filter",
        "click #btn-remove-filter": "on_remove_filter",
        "click #btn-apply": "on_apply",
        "click #btn-cancel": "on_cancel",
        "click #btn-copy": "on_copy",
        "click #btn-paste": "on_paste",
        "click #btn-flash": "on_flash",
        "click #btn-cancel-query": "on_cancel_query",
        "click #btn-download": "on_download",
        "click #btn-clear": "on_clear",
        "click #btn-auto-commit": "on_auto_commit",
        "click #btn-auto-rollback": "on_auto_rollback",
        "click #btn-clear-history": "on_clear_history",
        "change .limit": "on_limit_change"
      },

      /* Defining the template to create buttons and div to render
       * the backgrid inside this div.
       */
      template: _.template([
        '<div id="btn-toolbar" class="pg-prop-btn-group" role="toolbar" aria-label="">',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-save" type="button" class="btn btn-default" title="{{ _('Save') }}" disabled>',
              '<i class="fa fa-floppy-o" aria-hidden="true"></i>',
            '</button>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-copy" type="button" class="btn btn-default" title="{{ _('Copy Row') }}" disabled>',
              '<i class="fa fa-files-o" aria-hidden="true"></i>',
            '</button>',
            '<button id="btn-paste" type="button" class="btn btn-default" title="{{ _('Paste Row') }}" disabled>',
              '<i class="fa fa-clipboard" aria-hidden="true"></i>',
            '</button>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-add-row" type="button" class="btn btn-default" title="{{ _('Add New Row') }}" disabled>',
              '<i class="fa fa-plus" aria-hidden="true"></i>',
            '</button>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-filter" type="button" class="btn btn-default" title="{{ _('Filter') }}" disabled>',
              '<i class="fa fa-filter" aria-hidden="true"></i>',
            '</button>',
            '<button id="btn-filter-dropdown" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" disabled>',
              '<span class="caret"></span> <span class="sr-only">Toggle Dropdown</span>',
            '</button>',
            '<ul class="dropdown-menu dropdown-menu-right">',
              '<li>',
                '<a id="btn-remove-filter" href="#">{{ _('Remove') }}</a>',
                '<a id="btn-include-filter" href="#">{{ _('By selection') }}</a>',
                '<a id="btn-exclude-filter" href="#">{{ _('Exclude selection') }}</a>',
              '</li>',
            '</ul>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<select class="limit" style="height: 30px; width: 90px;" disabled>',
              '<option value="-1">No limit</option>',
              '<option value="1000">1000 rows</option>',
              '<option value="500">500 rows</option>',
              '<option value="100">100 rows</option>',
            '</select>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-flash" type="button" class="btn btn-default" style="width: 40px;" title="{{ _('Execute/Refresh') }}">',
              '<i class="fa fa-bolt" aria-hidden="true"></i>',
            '</button>',
            '<button id="btn-query-dropdown" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">',
              '<span class="caret"></span> <span class="sr-only">Toggle Dropdown</span>',
            '</button>',
            '<ul class="dropdown-menu dropdown-menu">',
              '<li>',
                '<a id="btn-auto-commit" href="#">',
                    '<i class="auto-commit fa fa-check" aria-hidden="true"></i>',
                    '<span> {{ _('Auto-Commit') }} </span>',
                '</a>',
                '<a id="btn-auto-rollback" href="#">',
                    '<i class="auto-rollback fa fa-check visibility-hidden" aria-hidden="true"></i>',
                    '<span> {{ _('Auto-Rollback') }} </span>',
                '</a>',
              '</li>',
            '</ul>',
            '<button id="btn-cancel-query" type="button" class="btn btn-default" title="{{ _('Cancel query') }}" disabled>',
              '<i class="fa fa-stop" aria-hidden="true"></i>',
            '</button>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-edit" type="button" class="btn btn-default" title="{{ _('Edit') }}">',
              '<i class="fa fa-pencil-square-o" aria-hidden="true"></i>',
            '</button>',
            '<button id="btn-edit-dropdown" type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">',
              '<span class="caret"></span> <span class="sr-only">Toggle Dropdown</span>',
            '</button>',
            '<ul class="dropdown-menu dropdown-menu">',
              '<li>',
                '<a id="btn-clear" href="#">',
                    '<i class="fa fa-eraser" aria-hidden="true"></i>',
                    '<span> {{ _('Clear query window') }} </span>',
                '</a>',
                '<a id="btn-clear-history" href="#">',
                    '<i class="fa fa-eraser" aria-hidden="true"></i>',
                    '<span> {{ _('Clear history') }} </span>',
                '</a>',
              '</li>',
            '</ul>',
          '</div>',
          '<div class="btn-group" role="group" aria-label="">',
            '<button id="btn-download" type="button" class="btn btn-default" title="{{ _('Download as CSV') }}">',
              '<i class="fa fa-download" aria-hidden="true"></i>',
            '</button>',
          '</div>',
        '</div>',
        '<div class="editor-title"></div>',
        '<div id="filter" class="filter-container hidden">',
          '<div class="filter-title">Filter</div>',
          '<div class="sql-textarea">',
            '<textarea id="sql_filter" row="5"></textarea>',
          '</div>',
          '<div class="btn-group">',
            '<button id="btn-cancel" type="button" class="btn btn-danger" title="{{ _('Cancel') }}">',
              '<i class="fa fa-times" aria-hidden="true"></i> {{ _('Cancel') }}',
            '</button>',
          '</div>',
          '<div class="btn-group">',
            '<button id="btn-apply" type="button" class="btn btn-primary" title="{{ _('Apply') }}">',
              '<i class="fa fa-check" aria-hidden="true"></i> {{ _('Apply') }}',
            '</button>',
          '</div>',
        '</div>',
        '<div id="editor-panel"></div>'
        ].join("\n")),

      // This function is used to render the template.
      render: function() {
        var self = this;

        // Render header only.
        self.$el.empty();
        self.$el.html(self.template());

        $('.editor-title').text(self.editor_title);

        var filter = self.$el.find('#sql_filter');

        self.filter_obj = CodeMirror.fromTextArea(filter.get(0), {
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            indentUnit: 4,
            mode: "text/x-pgsql"
        });

        // Create main wcDocker instance
        var main_docker = new wcDocker(
          '#editor-panel', {
          allowContextMenu: false,
          allowCollapse: false,
          themePath: '{{ url_for('static', filename='css/wcDocker/Themes') }}',
          theme: 'pgadmin'
        });

        var sub_panel = new pgAdmin.Browser.Panel({
          name: 'sub_panel',
          title: false,
          width: '100%',
          height:'100%',
          isCloseable: false,
          isPrivate: true
        });

        sub_panel.load(main_docker);
        panel = main_docker.addPanel('sub_panel', wcDocker.DOCK.LEFT);

        // Create a Splitter to divide sql code and data output
        var hSplitter = new wcSplitter(
          "#editor-panel", panel,
          wcDocker.ORIENTATION.VERTICAL
        );
        hSplitter.scrollable(0, false, false);
        hSplitter.scrollable(1, true, true);

        // Initialize this splitter with a layout in each pane.
        hSplitter.initLayouts(wcDocker.LAYOUT.SIMPLE, wcDocker.LAYOUT.SIMPLE);

        // By default, the splitter splits down the middle, we split the main panel by 80%.
        hSplitter.pos(0.25);

        var text_container = $('<textarea id="sql_query_tool" row="5"></textarea>');

        // Add text_container at the top half of the splitter
        hSplitter.left().addItem(text_container);

        // Add data output panel at the bottom half of the splitter
        var output_container = $('<div id="output-panel"></div>');
        hSplitter.right().addItem(output_container);

        self.query_tool_obj = CodeMirror.fromTextArea(text_container.get(0), {
            lineNumbers: true,
            lineWrapping: true,
            matchBrackets: true,
            indentUnit: 4,
            styleSelectedText: true,
            mode: "text/x-sql"
        });

        // Create wcDocker for tab set.
        var docker = new wcDocker(
          '#output-panel', {
          allowContextMenu: false,
          allowCollapse: false,
          themePath: '{{ url_for('static', filename='css/wcDocker/Themes') }}',
          theme: 'pgadmin'
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
          content: '<div class="sql-editor-explian"></div>'
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
        data_output.load(docker);
        explain.load(docker);
        messages.load(docker);
        history.load(docker);

        // Add all the panels to the docker
        self.data_output_panel = docker.addPanel('data_output', wcDocker.DOCK.LEFT);
        self.explain_panel = docker.addPanel('explain', wcDocker.DOCK.STACKED, self.data_output_panel);
        self.messages_panel = docker.addPanel('messages', wcDocker.DOCK.STACKED, self.data_output_panel);
        self.history_panel = docker.addPanel('history', wcDocker.DOCK.STACKED, self.data_output_panel);

        self.render_history_grid();
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

        var grid = self.grid = new Backgrid.Grid({
            columns: columns,
            collection: collection,
            className: "backgrid table-bordered",
            row: SqlEditorCustomRow
          }),
          paginator = self.paginator = new Backgrid.Extension.Paginator({
            goBackFirstOnSort: false,
            collection: collection
          }),
          clientSideFilter = self.clientSideFilter = new Backgrid.Extension.ClientSideFilter({
                 collection: collection,
                 placeholder: _('Search'),
                 // The model fields to search for matches
                 fields: filter_array,
                 // How long to wait after typing has stopped before searching can start
                 wait: 150
          });

        // Render the grid
        self.$el.find('#datagrid').append(self.grid.render().$el);

        // Render the paginator
        self.$el.find('#datagrid-paginator').append(paginator.render().el);

        // Render the client side filter
        self.$el.find('.pg-prop-btn-group').append(clientSideFilter.render().el);

        // Forcefully sorting by the first column.
        if (columns.length > 1) {
            collection.setSorting(columns[1].name);
            collection.fullCollection.sort();
        }
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
            editable: false
          }, {
            name: "query",
            label: "Query",
            cell: "string",
            editable: false
          }, {
            name: "row_affected",
            label: "Rows affected",
            cell: "integer",
            editable: false
          }, {
            name: "total_time",
            label: "Total Time",
            cell: "string",
            editable: false
          }, {
            name: "message",
            label: "Message",
            cell: "string",
            editable: false
        }];

        var grid = self.history_grid = new Backgrid.Grid({
            columns: columns,
            collection: history_collection,
            className: "backgrid table-bordered"
        });

        // Render the grid
        self.$el.find('#history_grid').append(self.history_grid.render().$el);
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

      // Callback function for Save button click.
      on_save: function() {
        var self = this;

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
      on_include_filter: function() {
        var self = this;

        // Trigger the include_filter signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:include_filter',
            self,
            self.handler
        );
      },

      // Callback function for exclude filter button click.
      on_exclude_filter: function() {
        var self = this;

        // Trigger the exclude_filter signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:exclude_filter',
            self,
            self.handler
        );
      },

      // Callback function for remove filter button click.
      on_remove_filter: function() {
        var self = this;

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
      on_copy: function() {
        var self = this;

        // Trigger the copy signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:copy',
            self,
            self.handler
        );
      },

      // Callback function for paste button click.
      on_paste: function() {
        var self = this;

        // Trigger the paste signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:paste',
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
      on_clear: function() {
        var self = this;
        self.query_tool_obj.setValue('');
      },

      // Callback function for the clear history button click.
      on_clear_history: function() {
        var self = this;

        // Remove any existing grid first
        if (self.history_grid) {
            self.history_collection.reset();
        }
      },

      // Callback function for the auto commit button click.
      on_auto_commit: function() {
        var self = this;

        // Trigger the auto-commit signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:auto_commit',
            self,
            self.handler
        );
      },

      // Callback function for the auto rollback button click.
      on_auto_rollback: function() {
        var self = this;

        // Trigger the download signal to the SqlEditorController class
        self.handler.trigger(
            'pgadmin-sqleditor:button:auto_rollback',
            self,
            self.handler
        );
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
        start: function(is_query_tool, editor_title) {
          var self = this;

          self.is_query_tool = is_query_tool;
          self.items_per_page = 25;
          self.rows_affected = 0;
          self.marked_line_no = 0;

          // We do not allow to call the start multiple times.
          if (self.gridView)
            return;

          self.gridView = new SQLEditorView({
            el: self.container,
            handler: self
          });
          self.transId = self.container.data('transId');

          self.gridView.editor_title = editor_title;

          // Render the header
          self.gridView.render();

          // Listen on events come from SQLEditorView for the button clicked.
          self.on('pgadmin-sqleditor:button:save', self._save, self);
          self.on('pgadmin-sqleditor:button:addrow', self._add, self);
          self.on('pgadmin-sqleditor:button:show_filter', self._show_filter, self);
          self.on('pgadmin-sqleditor:button:include_filter', self._include_filter, self);
          self.on('pgadmin-sqleditor:button:exclude_filter', self._exclude_filter, self);
          self.on('pgadmin-sqleditor:button:remove_filter', self._remove_filter, self);
          self.on('pgadmin-sqleditor:button:apply_filter', self._apply_filter, self);
          self.on('pgadmin-sqleditor:button:copy', self._copy, self);
          self.on('pgadmin-sqleditor:button:paste', self._paste, self);
          self.on('pgadmin-sqleditor:button:limit', self._set_limit, self);
          self.on('pgadmin-sqleditor:button:flash', self._refresh, self);
          self.on('pgadmin-sqleditor:button:cancel-query', self._cancel_query, self);
          self.on('pgadmin-sqleditor:button:download', self._download, self);
          self.on('pgadmin-sqleditor:button:auto_rollback', self._auto_rollback, self);
          self.on('pgadmin-sqleditor:button:auto_commit', self._auto_commit, self);

          if (self.is_query_tool) {
            self.gridView.query_tool_obj.refresh();
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
            '{{ _('Initializing the query execution!') }}'
          );

          $.ajax({
            url: "{{ url_for('sqleditor.index') }}" + "view_data/start/" + self.transId,
            method: 'GET',
            success: function(res) {
              if (res.data.status) {
                self.trigger(
                  'pgadmin-sqleditor:loading-icon:message',
                   '{{ _('Waiting for the query execution to complete...') }}'
                );

                self.can_edit = res.data.can_edit;
                self.can_filter = res.data.can_filter;
                self.items_per_page = res.data.items_per_page;

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
                  '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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
                      '{{ _('Loading the data from the database server, and rendering into the grid...') }}'
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
                      '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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

          /* If user can edit the data then we should enabled
           * Copy Row, Paste Row and 'Add New Row' buttons.
           */
          if (self.can_edit) {
            $("#btn-add-row").prop('disabled', false);
            $("#btn-copy").prop('disabled', false);
            $("#btn-paste").prop('disabled', false);
          }

          /* If user can filter the data then we should enabled
           * Filter and Limit buttons.
           */
          if (self.can_filter) {
            $(".limit").prop('disabled', false);
            $(".limit").addClass('limit-enabled');
            $("#btn-filter").prop('disabled', false);
            $("#btn-filter-dropdown").prop('disabled', false);
          }

          // Fetch the columns metadata
          self.columns = self._fetch_column_metadata(data);

          self.trigger(
            'pgadmin-sqleditor:loading-icon:message',
            '{{ _('Loading the data from the database server, and rendering into the grid...') }}',
            self
          );

          // Defining backbone's pageable collection.
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

          // Add the data to the collection and render the grid.
          self.collection.add(data.result, {parse: true});
          self.gridView.render_grid(self.collection, self.columns);
          self.gridView.data_output_panel.focus();

          // Hide the loading icon
          self.trigger('pgadmin-sqleditor:loading-icon:hide');
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
            '{{ _('Fetching the information about the columns returned...') }}'
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

                  // Create column label.
                  var type = pg_types[c.type_code][0];
                  var col_label = c.name;
                  if (!is_primary_key)
                    col_label += ' ' + type;
                  else
                    col_label += ' [PK] ' + type;

                  if (c.precision == null) {
                    if (c.internal_size > 0)
                      col_label += '(' + c.internal_size + ')';
                  }
                  else
                    col_label += '(' + c.precision + ',' + c.scale + ')';

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
                    default:
                      col_cell = 'string';
                  }

                  var col = {
                    name : c.name,
                    label: col_label,
                    cell: col_cell,
                    can_edit: self.can_edit,
                    editable: self.is_editable
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
          self.collection.add(empty_model);
        },

        /* This function will fetch the list of changed models and make
         * the ajax call to save the data into the database server.
         */
        _save: function() {
          var self = this,
              data = [],
              save_data = true;

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
                    '{{ _('Primary key columns can not be null.') }}'
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
                    '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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
                  '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
                  '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
                  '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
                  '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
                  '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
        _copy: function() {
          var self = this;

          // Save the selected model as copied model for future use
          if ('selected_model' in self)
            self.copied_model = self.selected_model;
        },

        // This function will paste the selected row.
        _paste: function() {
          var self = this;
              new_model = null;
          if ('copied_model' in self && self.copied_model != null) {
            $("#btn-save").prop('disabled', false);

            /* Find the model to be copied in the collection
             * if found then we need to clone the object, so
             * that it's cid/id gets changed.
             */
            if (self.collection.get(self.copied_model.cid) === undefined)
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
                  '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
        },

        // This function will fetch the sql query from the text box
        // and execute the query.
        _execute: function () {
          var self = this,
              sql = '',
              history_msg = '';

          self.trigger(
            'pgadmin-sqleditor:loading-icon:show',
            '{{ _('Initializing the query execution!') }}'
          );

          /* If code is selected in the code mirror then execute
           * the selected part else execute the complete code.
           */
          var selected_code = self.gridView.query_tool_obj.getSelection();
          if (selected_code.length > 0)
            sql = selected_code;
          else
            sql = self.gridView.query_tool_obj.getValue();

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
                  '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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
                  '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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

          if (self.columns != undefined &&
              self.collection != undefined &&
              self.collection.fullCollection != undefined &&
              self.collection.fullCollection.length > 0)
          {
            var csv_col = _.indexBy(self.columns, 'name'),
                labels = _.pluck(self.columns, 'label'),
                keys = _.pluck(self.columns, 'name');

            // Fetch the items from fullCollection and convert it as csv format
            var csv = labels.join(',') + '\n';
            csv += self.collection.fullCollection.map(function(item) {
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
                     '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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
                 '{{ _('Not connected to server or connection with the server has been closed.') }}'
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
                 '{{ _('Not connected to server Or connection with the server has been closed.') }}'
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
