define('pgadmin.node.foreign_key', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.alertifyjs',
  'pgadmin.backform', 'pgadmin.backgrid', 'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Alertify, Backform,
  Backgrid
) {

  var formatNode = function(opt) {
      if (!opt.id) {
        return opt.text;
      }

      var optimage = $(opt.element).data('image');

      if(!optimage) {
        return opt.text;
      } else {
        return $(
        '<span><span class="wcTabIcon ' + optimage + '"/>' + opt.text + '</span>'
      );
      }
    },
    headerSelectControlTemplate = _.template([
      '<div class="<%=Backform.controlsClassName%> <%=extraClasses.join(\' \')%>">',
      '  <select class="pgadmin-node-select form-control" name="<%=name%>" style="width:100%;" value="<%-value%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> >',
      '    <%=select2.first_empty ? " <option></option>" : ""%>',
      '    <% for (var i=0; i < options.length; i++) { %>',
      '    <% var option = options[i]; %>',
      '    <option <% if (option.image) { %> data-image=<%= option.image %> <% } %> value=<%= formatter.fromRaw(option.value) %> <%=option.value === rawValue ? "selected=\'selected\'" : "" %>><%-option.label%></option>',
      '    <% } %>',
      '  </select>',
      '</div>'].join('\n')
    );

  var ForeignKeyColumnModel = pgBrowser.Node.Model.extend({
    defaults: {
      local_column: undefined,
      references: undefined,
      referenced: undefined,
    },
    schema: [{
      id: 'local_column', label: gettext('Local'), type:'text', editable: false,
      cellHeaderClasses: 'width_percent_50', cell:'string',
      headerCell: Backgrid.Extension.CustomHeaderCell,
    },{
      id: 'referenced', label: gettext('Referenced'), type: 'text', editable: false,
      cell:'string', cellHeaderClasses: 'width_percent_50',
      headerCell: Backgrid.Extension.CustomHeaderCell,
    }],
  });

  var ForeignKeyColumnControl =  Backform.ForeignKeyColumnControl =
    Backform.UniqueColCollectionControl.extend({

      initialize: function() {
        Backform.UniqueColCollectionControl.prototype.initialize.apply(
          this, arguments
        );

        var self = this,
          node = 'foreign_key',
          headerSchema = [{
            id: 'local_column', label:'', type:'text',
            node: 'column', control: Backform.NodeListByNameControl.extend({
              initialize: function() {
                // Here we will decide if we need to call URL
                // Or fetch the data from parent columns collection
                if(self.model.handler) {
                  Backform.Select2Control.prototype.initialize.apply(this, arguments);
                  // Do not listen for any event(s) for existing constraint.
                  if (_.isUndefined(self.model.get('oid'))) {
                    var tableCols = self.model.top.get('columns');
                    this.listenTo(tableCols, 'remove' , this.removeColumn);
                    this.listenTo(tableCols, 'change:name', this.resetColOptions);
                  }

                  this.custom_options();
                } else {
                  Backform.NodeListByNameControl.prototype.initialize.apply(this, arguments);
                }
              },
              removeColumn: function () {
                var that = this;
                setTimeout(function   () {
                  that.custom_options();
                  that.render.apply(that);
                }, 50);
              },
              resetColOptions: function(m) {
                var that = this;

                if (m.previous('name') ==  self.headerData.get('local_column')) {
                  /*
                   * Table column name has changed so update
                   * column name in foreign key as well.
                   */
                  self.headerData.set(
                    {'local_column': m.get('name')});
                  self.headerDataChanged();
                }

                setTimeout(function () {
                  that.custom_options();
                  that.render.apply(that);
                }, 50);
              },
              custom_options: function() {
                // We will add all the columns entered by user in table model
                var columns = self.model.top.get('columns'),
                  added_columns_from_tables = [];

                if (columns.length > 0) {
                  _.each(columns.models, function(m) {
                    var col = m.get('name');
                    if(!_.isUndefined(col) && !_.isNull(col)) {
                      added_columns_from_tables.push(
                        {label: col, value: col, image:'icon-column'}
                      );
                    }
                  });
                }
                // Set the values in to options so that user can select
                this.field.set('options', added_columns_from_tables);
              },
              template: headerSelectControlTemplate,
              remove: function () {
                if(self.model.handler) {
                  var tableCols = self.model.top.get('columns');
                  this.stopListening(tableCols, 'remove' , this.removeColumn);
                  this.stopListening(tableCols, 'change:name' , this.resetColOptions);

                  Backform.Select2Control.prototype.remove.apply(this, arguments);

                } else {
                  Backform.NodeListByNameControl.prototype.remove.apply(this, arguments);
                }
              },
            }),
            select2: {
              allowClear: false, width: 'style',
              placeholder: gettext('Select column'),
              first_empty: !_.isUndefined(self.model.get('oid')),
            },
            version_compatible: self.field.get('version_compatible'),
            disabled: function() {
              return !_.isUndefined(self.model.get('oid'));
            },
          },{
            id: 'references', label:'', type: 'text', cache_level: 'server',
            select2: {
              allowClear: false, width: 'style',
              placeholder: 'Select foreign table',
            }, first_empty: true,
            control: Backform.NodeListByNameControl.extend({
              formatter: Backform.ControlFormatter,
              template: headerSelectControlTemplate,
            }),
            url: 'all_tables', node: 'table',
            version_compatible: self.field.get('version_compatible'),
            disabled: function() {
              return !_.isUndefined(self.model.get('oid'));
            },
            transform: function(rows) {
              var res = [];
              _.each(rows, function(r) {
                res.push({
                  'value': r.value,
                  'image': 'icon-table',
                  'label': r.label,
                });
              });
              return res;
            },
          },{
            id: 'referenced', label:'', type: 'text', cache_level: 'server',
            transform: function(rows) {
              var res = [];
              _.each(rows, function(r) {
                res.push({
                  'value': r.name,
                  'image': 'icon-column',
                  'label': r.name,
                });
              });
              return res;
            },
            control: Backform.Select2Control.extend({
              formatter: Backform.ControlFormatter,
              template: headerSelectControlTemplate,
              render: function() {
                var self = this,
                  url = self.field.get('url') || self.defaults.url,
                  m = self.model,
                  tid = m.get('references');

                // Clear any existing value before setting new options.
                m.set(self.field.get('name'), null, {silent: true});

                if (url && !_.isUndefined(tid) && !_.isNull(tid) && tid != '') {
                  var node = this.field.get('schema_node'),
                    node_info = this.field.get('node_info'),
                    full_url = node.generate_url.apply(
                      node, [
                        null, url, this.field.get('node_data'),
                        this.field.get('url_with_id') || false, node_info,
                      ]),
                    data = [];

                  if (this.field.get('version_compatible')) {
                    m.trigger('pgadmin:view:fetching', m, self.field);
                    $.ajax({
                      async: false,
                      data : {tid:tid},
                      url: full_url,
                    })
                    .done(function(res) {
                      data = res.data;
                    })
                    .fail(function() {
                      m.trigger('pgadmin:view:fetch:error', m, self.field);
                    });
                    m.trigger('pgadmin:view:fetched', m, self.field);
                  }
                    /*
                     * Transform the data
                     */
                  var transform = this.field.get('transform') || self.defaults.transform;
                  if (transform && _.isFunction(transform)) {
                    // We will transform the data later, when rendering.
                    // It will allow us to generate different data based on the
                    // dependencies.
                    self.field.set('options', transform.bind(self, data));
                  } else {
                    self.field.set('options', data);
                  }
                } else {
                  self.field.set('options', []);
                }
                Backform.Select2Control.prototype.render.apply(this, arguments);
                return this;
              },
            }), url: 'get_columns',
            select2: {
              allowClear: false,
              width: 'style',
              placeholder: gettext('Select column'),
              templateResult: formatNode,
              templateSelection: formatNode,
            },
            deps:['references'],  node: 'table',
            version_compatible: self.field.get('version_compatible'),
            disabled: function() {
              return !_.isUndefined(self.model.get('oid'));
            },
          }],
          headerDefaults = {local_column: null,
            references: null,
            referenced:null},
          gridCols = ['local_column', 'references', 'referenced'];

        if ((!self.model.isNew() && _.isUndefined(self.model.handler)) ||
          (_.has(self.model, 'handler') &&
            !_.isUndefined(self.model.handler) &&
              !_.isUndefined(self.model.get('oid')))) {
          var column = self.collection.first();
          if (column) {
            headerDefaults['references'] = column.get('references');
          }
        }

        self.headerData = new (Backbone.Model.extend({
          defaults: headerDefaults,
          schema: headerSchema,
        }))({});

        var headerGroups = Backform.generateViewSchema(
          self.field.get('node_info'), self.headerData, 'create',
          node, self.field.get('node_data')
        ),
          fields = [];

        _.each(headerGroups, function(o) {
          fields = fields.concat(o.fields);
        });

        self.headerFields = new Backform.Fields(fields);
        self.gridSchema = Backform.generateGridColumnsFromModel(
          //null, ForeignKeyColumnModel, 'edit', gridCols
          self.field.get('node_info'), self.field.get('model'), 'edit',
          gridCols, self.field.get('schema_node')
        );

        self.controls = [];
        self.listenTo(self.headerData, 'change', self.headerDataChanged);
        self.listenTo(self.headerData, 'select2', self.headerDataChanged);
        self.listenTo(self.collection, 'add', self.onAddorRemoveColumns);
        self.listenTo(self.collection, 'remove', self.onAddorRemoveColumns);
      },

      generateHeader: function(data) {
        var header = [
          '<div class="subnode-header-form">',
          ' <div class="container-fluid">',
          '  <div class="row">',
          '   <div class="col-md-4">',
          '    <label class="control-label"><%-column_label%></label>',
          '   </div>',
          '   <div class="col-md-6" header="local_column"></div>',
          '   <div class="col-md-2">',
          '     <button class="btn-sm btn-default add fa fa-plus" <%=canAdd ? "" : "disabled=\'disabled\'"%> ></button>',
          '   </div>',
          '  </div>',
          '  <div class="row">',
          '   <div class="col-md-4">',
          '    <label class="control-label"><%-references_label%></label>',
          '   </div>',
          '   <div class="col-md-6" header="references"></div>',
          '  </div>',
          '  <div class="row">',
          '   <div class="col-md-4">',
          '    <label class="control-label"><%-referenced_label%></label>',
          '   </div>',
          '   <div class="col-md-6" header="referenced"></div>',
          '  </div>',
          ' </div>',
          '</div>'].join('\n');

        _.extend(data, {
          column_label: gettext('Local column'),
          references_label: gettext('References'),
          referenced_label: gettext('Referencing'),
        });

        var self = this,
          headerTmpl = _.template(header),
          $header = $(headerTmpl(data)),
          controls = this.controls;

        this.headerFields.each(function(field) {
          var control = new (field.get('control'))({
            field: field,
            model: self.headerData,
          });

          $header.find('div[header="' + field.get('name') + '"]').append(
            control.render().$el
          );

          controls.push(control);
        });

        // We should not show add but in properties mode
        if (data.mode == 'properties') {
          $header.html('');
        }

        self.$header = $header;

        return $header;
      },

      events: _.extend(
        {}, Backform.UniqueColCollectionControl.prototype.events,
        {'click button.add': 'addColumns'}
      ),

      showGridControl: function(data) {

        var self = this,
          titleTmpl = _.template([
            '<div class=\'subnode-header\'>',
            '<label class=\'control-label\'><%-label%></label>',
            '</div>'].join('\n')),
          $gridBody =
          $('<div class=\'pgadmin-control-group backgrid form-group col-xs-12 object subnode\'></div>').append(
            // Append titleTmpl only if create/edit mode
            data.mode !== 'properties' ? titleTmpl({label: data.label}) : ''
          );

        // Clean up existing grid if any (in case of re-render)
        if (self.grid) {
          self.grid.remove();
        }

        $gridBody.append(self.generateHeader(data));

        var gridSchema = _.clone(this.gridSchema);

        // Insert Delete Cell into Grid
        if (data.disabled == false && data.canDelete) {
          gridSchema.columns.unshift({
            name: 'pg-backform-delete', label: '',
            cell: Backgrid.Extension.DeleteCell,
            editable: false, cell_priority: -1,
          });
        }

        // Initialize a new Grid instance
        var grid = self.grid = new Backgrid.Grid({
          columns: gridSchema.columns,
          collection: self.collection,
          className: 'backgrid table-bordered',
        });
        self.$grid = grid.render().$el;

        $gridBody.append(self.$grid);

        setTimeout(function() {
          self.headerData.set({
            'local_column':
              self.$header.find(
                'div[header="local_column"] select option:first'
              ).val(),
            'referenced':
              self.$header.find(
                'div[header="referenced"] select option:first'
              ).val(),
            'references':
              self.$header.find(
                'div[header="references"] select option:first'
              ).val(),
          }, {silent:true}
          );
        }, 10);

        // Remove unwanted class from grid to display it properly
        if(data.mode === 'properties')
          $gridBody.find('.subnode-header-form').removeClass('subnode-header-form');

        // Render node grid
        return $gridBody;
      },

      headerDataChanged: function() {
        var self = this, val,
          data = this.headerData.toJSON(),
          inSelected = false,
          checkVars = ['local_column', 'referenced'];

        if (!self.$header) {
          return;
        }

        if (self.control_data.canAdd) {
          self.collection.each(function(m) {
            if (!inSelected) {
              _.each(checkVars, function(v) {
                if (!inSelected) {
                  val = m.get(v);
                  inSelected = ((
                    (_.isUndefined(val) || _.isNull(val)) &&
                      (_.isUndefined(data[v]) || _.isNull(data[v]))
                  ) ||
                      (val == data[v]));
                }
              });
            }
          });
        }
        else {
          inSelected = true;
        }

        self.$header.find('button.add').prop('disabled', inSelected);
      },

      addColumns: function(ev) {
        ev.preventDefault();
        var self = this,
          local_column = self.headerData.get('local_column'),
          referenced = self.headerData.get('referenced');

        if (!local_column || local_column == '' ||
          !referenced || referenced  =='') {
          return false;
        }

        var m = new (self.field.get('model'))(
          self.headerData.toJSON()),
          coll = self.model.get(self.field.get('name'));

        coll.add(m);

        var idx = coll.indexOf(m);

        // idx may not be always > -1 because our UniqueColCollection may
        // remove 'm' if duplicate value found.
        if (idx > -1) {
          self.$grid.find('.new').removeClass('new');

          var newRow = self.grid.body.rows[idx].$el;

          newRow.addClass('new');
          $(newRow).pgMakeVisible('backform-tab');
        } else {
          //delete m;
        }

        return false;
      },

      onAddorRemoveColumns: function() {
        var self = this;

        // Wait for collection to be updated before checking for the button to be
        // enabled, or not.
        setTimeout(function() {
          if (self.collection.length > 0) {
            self.$header.find(
              'div[header="references"] select'
            ).prop('disabled', true);
          } else {
            self.$header.find(
              'div[header="references"] select'
            ).prop('disabled', false);
          }

          self.collection.trigger('pgadmin:columns:updated', self.collection);

          self.headerDataChanged();

          if ((!_.has(self.model, 'handler') || (_.has(self.model, 'handler') &&
            _.isUndefined(self.model.handler))) ||
              (_.has(self.model, 'handler') && !_.isUndefined(self.model.handler) &&
                !_.isUndefined(self.model.handler.get('oid')))) {
            self.getCoveringIndex();
          }

        }, 10);
      },

      getCoveringIndex: function() {

        var self = this,
          url = 'get_coveringindex',
          m = self.model,
          cols = [],
          coveringindex = null;

        self.collection.each(function(m){
          cols.push(m.get('local_column'));
        });

        if (cols.length > 0) {
          var node = this.field.get('schema_node'),
            node_info = this.field.get('node_info'),
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'),
                this.field.get('url_with_id') || false, node_info,
              ]);

          if (this.field.get('version_compatible')) {
            m.trigger('pgadmin:view:fetching', m, self.field);
            $.ajax({
              async: false,
              data : {cols:JSON.stringify(cols)},
              url: full_url,
            })
            .done(function(res) {
              coveringindex = res.data;
            })
            .fail(function() {
              m.trigger('pgadmin:view:fetch:error', m, self.field);
            });
            m.trigger('pgadmin:view:fetched', m, self.field);
          }
        }

        if (coveringindex) {
          m.set('hasindex', true);
          m.set('autoindex', false);
          m.set('coveringindex', coveringindex);
        } else {
          m.set('coveringindex', null);
          m.set('autoindex', true);
          m.set('hasindex', false);
        }
      },

      remove: function() {
        /*
         * Stop listening the events registered by this control.
         */
        this.stopListening(this.headerData, 'change', this.headerDataChanged);
        this.listenTo(this.headerData, 'select2', this.headerDataChanged);
        this.listenTo(this.collection, 'remove', this.onRemoveVariable);
        // Remove header controls.
        _.each(this.controls, function(controls) {
          controls.remove();
        });

        ForeignKeyColumnControl.__super__.remove.apply(this, arguments);

        // Remove the header model
        delete (this.headerData);

      },
    });

  // Extend the browser's node class for foreign key node
  if (!pgBrowser.Nodes['foreign_key']) {
    pgAdmin.Browser.Nodes['foreign_key'] = pgBrowser.Node.extend({
      type: 'foreign_key',
      label: gettext('Foreign key'),
      collection_type: 'coll-constraints',
      sqlAlterHelp: 'ddl-alter.html',
      sqlCreateHelp: 'ddl-constraints.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_key_dialog.html'}),
      hasSQL: true,
      parent_type: ['table','partition'],
      canDrop: true,
      canDropCascade: true,
      hasDepends: true,
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_foreign_key_on_coll', node: 'coll-constraints', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign key...'),
          icon: 'wcTabIcon icon-foreign_key', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'validate_foreign_key', node: 'foreign_key', module: this,
          applies: ['object', 'context'], callback: 'validate_foreign_key',
          category: 'validate', priority: 4, label: gettext('Validate foreign key'),
          icon: 'fa fa-link', enable : 'is_not_valid',
        },
        ]);
      },
      is_not_valid: function(node) {
        return (node && !node.valid);
      },
      callbacks: {
        validate_foreign_key: function(args) {
          var input = args || {},
            obj = this,
            t = pgBrowser.tree,
            i = input.item || t.selected(),
            d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d) {
            return false;
          }
          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'validate', d, true),
            type:'GET',
          })
          .done(function(res) {
            if (res.success == 1) {
              Alertify.success(res.info);
              t.removeIcon(i);
              data.valid = true;
              data.icon = 'icon-foreign_key';
              t.addIcon(i, {icon: data.icon});
              setTimeout(function() {t.deselect(i);}, 10);
              setTimeout(function() {t.select(i);}, 100);
            }
          })
          .fail(function(xhr, status, error) {
            Alertify.pgRespErrorNotify(xhr, error);
            t.unload(i);
          });

          return false;
        },
      },
      // Define the model for foreign key node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',

        defaults: {
          name: undefined,
          oid: undefined,
          comment: undefined,
          condeferrable: undefined,
          condeferred: undefined,
          confmatchtype: undefined,
          convalidated: undefined,
          columns: undefined,
          confupdtype: 'a',
          confdeltype: 'a',
          autoindex: true,
          coveringindex: undefined,
          hasindex:undefined,
        },
        toJSON: function () {
          var d = pgAdmin.Browser.Node.Model.prototype.toJSON.apply(this, arguments);
          delete d.hasindex;
          return d;
        },
        // Define the schema for the foreign key node
        schema: [{
          id: 'name', label: gettext('Name'), type: 'text',
          mode: ['properties', 'create', 'edit'], editable:true,
          headerCell: Backgrid.Extension.CustomHeaderCell, cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'comment', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          deps:['name'], disabled:function(m) {
            var name = m.get('name');
            if (!(name && name != '')) {
              setTimeout(function(){
                if(m.get('comment') && m.get('comment') !== '')
                  m.set('comment', null);
              },10);
              return true;
            } else {
              return false;
            }
          },
        },{
          id: 'condeferrable', label: gettext('Deferrable?'),
          type: 'switch', group: gettext('Definition'),
          disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
              // If OID is undefined then user is trying to add
              // new constraint which should allowed for Unique
              return !_.isUndefined(m.get('oid'));
            }
            // We can't update condeferrable of existing foreign key.
            return !m.isNew();
          },
        },{
          id: 'condeferred', label: gettext('Deferred?'),
          type: 'switch', group: gettext('Definition'),
          deps: ['condeferrable'],
          disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
              // If OID is undefined then user is trying to add
              // new constraint which should allowed for Unique
              return !_.isUndefined(m.get('oid'));
            } else if(!m.isNew()) {
              return true;
            }
            // Disable if condeferred is false or unselected.
            if(m.get('condeferrable') == true) {
              return false;
            } else {
              setTimeout(function(){
                if(m.get('condeferred'))
                  m.set('condeferred', false);
              },10);
              return true;
            }
          },
        },{
          id: 'confmatchtype', label: gettext('Match type'),
          type: 'switch', group: gettext('Definition'),
          options: {
            onText: 'FULL',
            offText: 'SIMPLE',
          },disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
              // If OID is undefined then user is trying to add
              // new constraint which should allowed for Unique
              return !_.isUndefined(m.get('oid'));
            }
            // We can't update condeferred of existing foreign key.
            return !m.isNew();
          },
        },{
          id: 'convalidated', label: gettext('Validated?'),
          type: 'switch', group: gettext('Definition'),
          options: {
            onText: gettext('Yes'),
            offText: gettext('No'),
          },disabled: function(m) {
            // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
              // If OID is undefined then user is trying to add
              // new constraint which should allowed
              return !(_.isUndefined(m.get('oid')) || m.get('convalidated'));
            }
            // We can't update condeferred of existing foreign key.
            return !(m.isNew() || m.get('convalidated'));
          },
        },{
          id: 'autoindex', label: gettext('Auto FK index?'),
          type: 'switch', group: gettext('Definition'),
          deps: ['name', 'hasindex'],
          options: {
            onText: gettext('Yes'),
            offText: gettext('No'),
          },disabled: function(m) {
            var index = m.get('coveringindex'),
              autoindex = m.get('autoindex'),
              setIndexName = function() {
                var name = m.get('name'),
                  oldindex = 'fki_'+m.previous ('name');

                if (m.get('hasindex')) {
                  return true;
                } else if (m.get('autoindex') && !_.isUndefined(name) && !_.isNull(name) &&
                name != '' && (_.isUndefined(index) || _.isNull(index) ||
                  index == '' || index == oldindex)) {
                  var newIndex = 'fki_' + name;
                  m.set('coveringindex', newIndex);
                  return false;
                } else {
                  return false;
                }
              };
            // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
              // If OID is undefined then user is trying to add
              // new constraint which should allowed for Unique
              if(_.isUndefined(m.get('oid')) && _.isUndefined(m.handler.get('oid'))) {
                setTimeout(function () {
                  if(m.get('autoindex'))
                    m.set('autoindex', false);
                }, 10);
                return true;
              } else {
                return setIndexName();
              }
            } else {
              if(!m.isNew() && autoindex && !_.isUndefined(index) &&
                !_.isNull(index) && index != '' && m.get('hasindex')) {
                return true;
              } else {
                return setIndexName();
              }
            }
          },
        },{
          id: 'coveringindex', label: gettext('Covering index'), type: 'text',
          mode: ['properties', 'create', 'edit'], group: gettext('Definition'),
          deps:['autoindex', 'hasindex'],
          disabled: function(m) {
            var index = m.get('coveringindex'),
              setIndexName = function() {
                if (m.get('hasindex')) {
                  return true;
                } else if (!m.get('autoindex')) {
                  setTimeout(function () {
                    m.set('coveringindex', null);
                  });
                  return true;
                } else {
                  setTimeout(function () {
                    var name = m.get('name'),
                      newIndex = 'fki_' + name;

                    if (m.get('autoindex') && !_.isUndefined(name) && !_.isNull(name) &&
                      name != '') {
                      m.set('coveringindex', newIndex);
                    }
                  });

                  return false;
                }
              };

            // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
              // If OID is undefined then user is trying to add
              // new constraint which should allowed for Unique
              if (_.isUndefined(m.get('oid')) && _.isUndefined(m.handler.get('oid'))) {
                return true;
              } else {
                return setIndexName();
              }

            } else if (!m.isNew() && m.get('autoindex') && !_.isUndefined(index)
              && _.isNull(index) && index == '') {
              return true;
            }

            return setIndexName();
          },
        },{
          id: 'columns', label: gettext('Columns'),
          type: 'collection', group: gettext('Columns'),
          node: 'foreign_key', editable: false, headerCell: Backgrid.Extension.CustomHeaderCell,
          cellHeaderClasses: 'width_percent_50',
          cell: Backgrid.StringCell.extend({
            initialize: function() {
              Backgrid.StringCell.prototype.initialize.apply(this, arguments);
              var self = this,
                collection = this.model.get('columns');
              // Do not listen for any event(s) for existing constraint.
              if (_.isUndefined(self.model.get('oid'))) {
                var tableCols = self.model.top.get('columns');
                self.listenTo(tableCols, 'remove' , self.removeColumn);
                self.listenTo(tableCols, 'change:name', self.resetColOptions);
              }

              self.model.get('columns').on('pgadmin:columns:updated', function() {
                self.render.apply(self);
              });
              self.listenTo(collection, 'add', self.render);
              self.listenTo(collection, 'remove', self.render);
            },
            removeColumn: function(m){
              var self = this,
                removedCols = self.model.get('columns').where(
                  {local_column: m.get('name')}
                );

              self.model.get('columns').remove(removedCols);
              setTimeout(function () {
                self.render();
              }, 10);

              setTimeout(function () {
                var constraints = self.model.top.get('foreign_key');
                var removed = [];
                constraints.each(function(constraint) {
                  if (constraint.get('columns').length == 0) {
                    removed.push(constraint);
                  }
                });
                constraints.remove(removed);
              },100);
            },
            resetColOptions : function(m) {
              var self = this,
                updatedCols = self.model.get('columns').where(
                  {'local_column': m.previous('name')}
                );
              if (updatedCols.length > 0) {
                /*
                 * Table column name has changed so update
                 * column name in foreign key as well.
                 */
                updatedCols[0].set(
                  {'local_column': m.get('name')});
              }

              setTimeout(function () { self.render(); }, 10);
            },
            formatter: {
              fromRaw: function (rawValue) {
                var cols = [],
                  remote_cols = [];
                if (rawValue.length > 0) {
                  rawValue.each(function(col){
                    cols.push(col.get('local_column'));
                    remote_cols.push(col.get('referenced'));
                  });
                  return '('+cols.join(', ')+') -> ('+ remote_cols.join(', ')+')';
                }
                return '';
              },
              toRaw: function (val) { return val; },
            },
            render: function() {
              return Backgrid.StringCell.prototype.render.apply(this, arguments);
            },
            remove: function() {
              var tableCols = this.model.top.get('columns');

              this.stopListening(tableCols, 'remove' , self.removeColumn);
              this.stopListening(tableCols, 'change:name' , self.resetColOptions);

              Backgrid.StringCell.prototype.remove.apply(this, arguments);
            },
          }),
          canAdd: function(m) {
              // We can't update columns of existing foreign key.
            return m.isNew();
          }, canDelete: true,
          control: ForeignKeyColumnControl,
          model: ForeignKeyColumnModel,
          disabled: function(m) {
              // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
                // If OID is undefined then user is trying to add
                // new constraint which should allowed for Unique
              return !_.isUndefined(m.get('oid'));
            }
              // We can't update columns of existing foreign key.
            return !m.isNew();
          },
        },{
          id: 'confupdtype', label: gettext('On update'),
          type:'select2', group: gettext('Action'), mode: ['edit','create'],
          select2:{width:'50%', allowClear: false},
          options: [
              {label: 'NO ACTION', value: 'a'},
              {label: 'RESTRICT', value: 'r'},
              {label: 'CASCADE', value: 'c'},
              {label: 'SET NULL', value: 'n'},
              {label: 'SET DEFAULT', value: 'd'},
          ],disabled: function(m) {
              // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
                // If OID is undefined then user is trying to add
                // new constraint which should allowed for Unique
              return !_.isUndefined(m.get('oid'));
            }
              // We can't update confupdtype of existing foreign key.
            return !m.isNew();
          },
        },{
          id: 'confdeltype', label: gettext('On delete'),
          type:'select2', group: gettext('Action'), mode: ['edit','create'],
          select2:{width:'50%', allowClear: false},
          options: [
              {label: 'NO ACTION', value: 'a'},
              {label: 'RESTRICT', value: 'r'},
              {label: 'CASCADE', value: 'c'},
              {label: 'SET NULL', value: 'n'},
              {label: 'SET DEFAULT', value: 'd'},
          ],disabled: function(m) {
              // If we are in table edit mode then
            if (_.has(m, 'handler') && !_.isUndefined(m.handler)) {
                // If OID is undefined then user is trying to add
                // new constraint which should allowed for Unique
              return !_.isUndefined(m.get('oid'));
            }
              // We can't update confdeltype of existing foreign key.
            return !m.isNew();
          },
        },
        ],
        validate: function() {
          var columns = this.get('columns'),
            msg;

          this.errorModel.clear();

          if ((_.isUndefined(columns) || _.isNull(columns) || columns.length < 1)) {
            msg = gettext('Please specify columns for Foreign key.');
            this.errorModel.set('columns', msg);
            return msg;
          }

          var coveringindex = this.get('coveringindex'),
            autoindex = this.get('autoindex');
          if (autoindex && (_.isUndefined(coveringindex) || _.isNull(coveringindex) ||
              String(coveringindex).replace(/^\s+|\s+$/g, '') == '')) {
            msg = gettext('Please specify covering index name.');
            this.errorModel.set('coveringindex', msg);
            return msg;
          }

          return null;
        },
      }),

      canCreate: function(itemData, item, data) {
          // If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData, parents = [],
          immediate_parent_table_found = false,
          is_immediate_parent_table_partitioned = false,
          s_version = this.getTreeNodeHierarchy(i).server.version;

          // To iterate over tree to check parent node
        while (i) {
            // If table is partitioned table then return false
          if (!immediate_parent_table_found && (d._type == 'table' || d._type == 'partition')) {
            immediate_parent_table_found = true;
            if ('is_partitioned' in d && d.is_partitioned && s_version < 110000) {
              is_immediate_parent_table_partitioned = true;
            }
          }

            // If it is schema then allow user to c reate table
          if (_.indexOf(['schema'], d._type) > -1)
            return !is_immediate_parent_table_partitioned;
          parents.push(d._type);
          i = t.hasParent(i) ? t.parent(i) : null;
          d = i ? t.itemData(i) : null;
        }
          // If node is under catalog then do not allow 'create' menu
        if (_.indexOf(parents, 'catalog') > -1) {
          return false;
        } else {
          return !is_immediate_parent_table_partitioned;
        }
      },
    });
  }

  return pgBrowser.Nodes['foreign_key'];
});
