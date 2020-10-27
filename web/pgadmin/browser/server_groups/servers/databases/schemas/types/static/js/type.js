/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.type', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.backgrid', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node', 'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, pgAdmin, pgBrowser, Backform, Backgrid,
  schemaChild, schemaChildTreeNode
) {

  if (!pgBrowser.Nodes['coll-type']) {
    pgBrowser.Nodes['coll-type'] =
      pgBrowser.Collection.extend({
        node: 'type',
        label: gettext('Types'),
        type: 'coll-type',
        columns: ['name', 'typeowner', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Integer Cell for Columns Length and Precision
  var IntegerDepCell = Backgrid.IntegerCell.extend({
    initialize: function() {
      Backgrid.NumberCell.prototype.initialize.apply(this, arguments);
      Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
    },
    dependentChanged: function () {
      this.model.set(this.column.get('name'), null);
      this.render();
      return this;
    },
    remove: Backgrid.Extension.DependentCell.prototype.remove,
  });

  // Node-Ajax-Cell with Deps
  var NodeAjaxOptionsDepsCell = Backgrid.Extension.NodeAjaxOptionsCell.extend({
    initialize: function() {
      Backgrid.Extension.NodeAjaxOptionsCell.prototype.initialize.apply(this, arguments);
      Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
    },
    dependentChanged: function () {
      var model = this.model,
        column = this.column,
        editable = this.column.get('editable'),
        input = this.$el.find('select').first();

      var is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
      if (is_editable) {
        this.$el.addClass('editable');
        input.prop('disabled', false);
      } else {
        this.$el.removeClass('editable');
        input.prop('disabled', true);
      }

      this.delegateEvents();
      return this;
    },
    remove: Backgrid.Extension.DependentCell.prototype.remove,
  });

  // Composite type model declaration
  var CompositeModel = Backform.CompositeModel = pgBrowser.Node.Model.extend({
    idAttribute: 'attnum',
    defaults: {
      attnum: undefined,
      member_name: undefined,
      type: undefined,
      tlength: undefined,
      is_tlength: false,
      precision: undefined,
      is_precision: false,
      collation: undefined,
      min_val: undefined,
      max_val: undefined,
    },
    type_options: undefined,
    subtypes: undefined,
    schema: [{
      id: 'member_name', label: gettext('Member Name'),
      type: 'text',  disabled: false, editable: true,
    },{
      id: 'type', label: gettext('Type'), control: 'node-ajax-options',
      type: 'text', url: 'get_types', disabled: false, node: 'type',
      cache_node: 'domain', editable: true,
      cell: 'node-ajax-options', select2: {allowClear: false},
      transform: function(d, control){
        control.model.type_options =  d;
        return d;
      },
    },{
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'tlength', label: gettext('Length/Precision'), deps: ['type'], type: 'text',
      disabled: false, cell: IntegerDepCell,
      editable: function(m) {
        // We will store type from selected from combobox
        var of_type = m.get('type');
        if(m.type_options) {
          // iterating over all the types
          _.each(m.type_options, function(o) {
            // if type from selected from combobox matches in options
            if ( of_type == o.value ) {
              // if length is allowed for selected type
              if(o.length)
              {
                // set the values in model
                m.set('is_tlength', true, {silent: true});
                m.set('min_val', o.min_val, {silent: true});
                m.set('max_val', o.max_val, {silent: true});
              } else {
                // set the values in model
                m.set('is_tlength', false, {silent: true});
              }
            }
          });
        }
        return m.get('is_tlength');
      },
    },{
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'precision', label: gettext('Scale'), deps: ['type'],
      type: 'text', disabled: false, cell: IntegerDepCell,
      editable: function(m) {
        // We will store type from selected from combobox
        var of_type = m.get('type');
        if(m.type_options) {
          // iterating over all the types
          _.each(m.type_options, function(o) {
            // if type from selected from combobox matches in options
            if ( of_type == o.value ) {
              // if precession is allowed for selected type
              if(o.precision)
              {
                // set the values in model
                m.set('is_precision', true, {silent: true});
                m.set('min_val', o.min_val, {silent: true});
                m.set('max_val', o.max_val, {silent: true});
              } else {
                // set the values in model
                m.set('is_precision', false, {silent: true});
              }
            }
          });
        }
        return m.get('is_precision');
      },
    },{
      id: 'collation', label: gettext('Collation'),
      cell: NodeAjaxOptionsDepsCell, deps: ['type'],
      select2: {allowClear: false},
      control: 'node-ajax-options', editable: function(m) {
        var of_type = m.get('type'),
          flag = false;
        if(m.type_options) {
          _.each(m.type_options, function(o) {
            if ( of_type == o.value ) {
              if(o.is_collatable)
              {
                flag = true;
              }
            }
          });
        }

        if (flag) {
          setTimeout(function(){
            m.set('collspcname', '', {silent: true});
          }, 10);
        }
        return flag;
      },
      type: 'text', disabled: false, url: 'get_collations', node: 'type',
    }],
    validate: function() {
      var errmsg = null;

      // Clearing previous errors first.
      this.errorModel.clear();
      // Validation for member name
      if ( _.isUndefined(this.get('member_name')) ||
        _.isNull(this.get('member_name')) ||
          String(this.get('member_name')).replace(/^\s+|\s+$/g, '') == '') {
        errmsg = gettext('Please specify the value for member name.');
        this.errorModel.set('member_name', errmsg);
        return errmsg;
      }
      else if ( _.isUndefined(this.get('type')) ||
        _.isNull(this.get('type')) ||
          String(this.get('type')).replace(/^\s+|\s+$/g, '') == '') {
        errmsg = gettext('Please specify the type.');
        this.errorModel.set('type', errmsg);
        return errmsg;
      }
      // Validation for Length/Precision field (see comments above if confused about the naming!)
      else if (this.get('is_tlength')
        && !_.isUndefined(this.get('tlength'))) {
        if (this.get('tlength') < this.get('min_val'))
          errmsg = gettext('Length/Precision should not be less than %s.', this.get('min_val'));
        if (this.get('tlength') > this.get('max_val') )
          errmsg = gettext('Length/Precision should not be greater than %s.', this.get('max_val'));
          // If we have any error set then throw it to user
        if(errmsg) {
          this.errorModel.set('tlength', errmsg);
          return errmsg;
        }
      }
      // Validation for scale field (see comments above if confused about the naming!)
      else if (this.get('is_precision')
        && !_.isUndefined(this.get('precision'))) {
        if (this.get('precision') < this.get('min_val'))
          errmsg = gettext('Scale should not be less than %s.', this.get('min_val'));
        if (this.get('precision') > this.get('max_val'))
          errmsg = gettext('Scale should not be greater than %s.', this.get('max_val'));
          // If we have any error set then throw it to user
        if(errmsg) {
          this.errorModel.set('precision', errmsg);
          return errmsg;
        }
      }
      return null;
    },
  });

  var EnumModel = Backform.EnumModel = pgBrowser.Node.Model.extend({
    defaults: {
      label: undefined,
    },
    schema: [{
      id: 'label', label: gettext('Label'),type: 'text', disabled: false,
      cellHeaderClasses: 'width_percent_99', editable: function(m) {
        return _.isUndefined(m.get('label'));
      },
    }],
    validate: function() {
      return null;
    },
  });

  if (!pgBrowser.Nodes['type']) {
    pgBrowser.Nodes['type'] = schemaChild.SchemaChildNode.extend({
      type: 'type',
      sqlAlterHelp: 'sql-altertype.html',
      sqlCreateHelp: 'sql-createtype.html',
      dialogHelp: url_for('help.static', {'filename': 'type_dialog.html'}),
      label: gettext('Type'),
      collection_type: 'coll-type',
      hasSQL: true,
      hasDepends: true,
      width: pgBrowser.stdW.md + 'px',
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_type_on_coll', node: 'coll-type', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Type...'),
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_type', node: 'type', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Type...'),
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_type', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Type...'),
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      ext_funcs: undefined,
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          is_sys_type: false,
          typtype: undefined,
        },

        // Default values!
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user,
              schemaInfo = args.node_info.schema;

            this.set({
              'typeowner': userInfo.name, 'schema': schemaInfo._label,
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'schemaCheck',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'typeowner', label: gettext('Owner'), cell: 'string',
          control: 'node-list-by-name',
          type: 'text', mode: ['properties', 'create', 'edit'], node: 'role',
          disabled: 'inSchema', select2: {allowClear: false},
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          type: 'text', mode: ['create', 'edit'], node: 'schema',
          disabled: 'schemaCheck', filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database',
          control: 'node-list-by-name', select2: {allowClear: false},
        },{
          id: 'typtype', label: gettext('Type'),
          mode: ['create','edit'], disabled: 'inSchema', readonly: 'inEditMode',
          group: gettext('Definition'),
          select2: { allowClear: false },
          options: function() {
            return [
              {label: gettext('Composite'), value: 'c'},
              {label: gettext('Enumeration'), value: 'e'},
              {label: gettext('External'), value: 'b'},
              {label: gettext('Range'), value: 'r'},
              {label: gettext('Shell'), value: 'p'},
            ];
          },
          // If create mode then by default open composite type
          control: Backform.Select2Control.extend({
            render: function(){
              // Initialize parent's render method
              Backform.Select2Control.prototype.render.apply(this, arguments);
              if(this.model.isNew()) {
                this.model.set({'typtype': 'c'});
              }
              return this;
            },
          }),
        },{
          id: 'composite', label: gettext('Composite Type'),
          model: CompositeModel, editable: true, type: 'collection',
          group: gettext('Definition'), mode: ['edit', 'create'],
          control: 'unique-col-collection', uniqueCol : ['member_name'],
          canAdd: true, canEdit: false, canDelete: true, disabled: 'inSchema',
          deps: ['typtype'],
          visible: function(m) {
            return m.get('typtype') === 'c';
          },
        },{
          id: 'enum', label: gettext('Enumeration type'),
          model: EnumModel, editable: true, type: 'collection',
          group: gettext('Definition'), mode: ['edit', 'create'],
          canAdd: true, canEdit: false, canDelete: function(m) {
            // We will disable it if it's in 'edit' mode
            return m.isNew();
          },
          disabled: 'inSchema', deps: ['typtype'],
          control: 'unique-col-collection', uniqueCol : ['label'],
          visible: function(m) {
            return m.get('typtype') === 'e';
          },
        },{
          // We will disable range type control in edit mode
          type: 'nested', control: 'plain-fieldset', group: gettext('Definition'),
          mode: ['edit', 'create'],
          visible: function(m) {
            return m.get('typtype') === 'r';
          }, deps: ['typtype'], label: '',
          schema:[{
            id: 'typname', label: gettext('Subtype'), cell: 'string',
            control: 'node-ajax-options',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            url: 'get_stypes', type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Range Type'), disabled: 'inSchema',
            readonly: 'inEditMode',
            transform: function(d, self){
              self.model.subtypes =  d;
              return d;
            },
          },{
            id: 'opcname', label: gettext('Subtype operator class'), cell: 'string',
            mode: ['properties', 'create', 'edit'], group: gettext('Range Type'),
            disabled: 'inSchema', readonly: 'inEditMode', deps: ['typname'],
            control: 'select', options: function() {
              var l_typname = this.model.get('typname'),
                self = this,
                result = [];
              if(!_.isUndefined(l_typname) && l_typname != '')
              {
                var node = this.field.get('schema_node'),
                  _url = node.generate_url.apply(
                    node, [
                      null, 'get_subopclass', this.field.get('node_data'), false,
                      this.field.get('node_info'),
                    ]);
                $.ajax({
                  async: false,
                  url: _url,
                  cache: false,
                  data: {'typname' : l_typname},
                })
                  .done(function(res) {
                    result = res.data;
                  })
                  .fail(function() {
                    self.model.trigger('pgadmin:view:fetch:error', self.model, self.field);
                  });
                //
              }
              return result;
            },
          },{
            id: 'collname', label: gettext('Collation'), cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Range Type'),
            deps: ['typname'], control: 'node-ajax-options', url: 'get_collations',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            disabled: function(m) {
              if(this.node_info &&  'catalog' in this.node_info)
              {
                return true;
              }

              // Disbale in edit mode
              if (!m.isNew()) {
                return true;
              }

              // To check if collation is allowed?
              var of_subtype = m.get('typname'),
                is_collate = undefined;
              if(!_.isUndefined(of_subtype)) {
                // iterating over all the types
                _.each(m.subtypes, function(s) {
                  // if subtype from selected from combobox matches
                  if ( of_subtype === s.label ) {
                    // if collation is allowed for selected subtype
                    // then enable it else disable it
                    is_collate = s.is_collate;
                  }
                });
              }
              // If is_collate is true then do not disable
              return is_collate ? false : true;
            },
          },{
            id: 'rngcanonical', label: gettext('Canonical function'), cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Range Type'),
            disabled: 'inSchema', readonly: 'inEditMode', deps: ['name', 'typname'],
            control: 'select', options: function() {
              var name = this.model.get('name'),
                self = this,
                result = [];

              if(!_.isUndefined(name) && name != '')
              {
                var node = this.field.get('schema_node'),
                  _url = node.generate_url.apply(
                    node, [
                      null, 'get_canonical', this.field.get('node_data'), false,
                      this.field.get('node_info'),
                    ]);
                $.ajax({
                  async: false,
                  url: _url,
                  cache: false,
                  data: {'name' : name},
                })
                  .done(function(res) {
                    result = res.data;
                  })
                  .fail(function() {
                    self.model.trigger('pgadmin:view:fetch:error',
                      self.model, self.field);
                  });
              }
              return result;
            },
          },{
            id: 'rngsubdiff', label: gettext('Subtype diff function'), cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Range Type'),
            disabled: 'inSchema', readonly: 'inEditMode', deps: ['opcname'],
            control: 'select', options: function() {
              var l_typname = this.model.get('typname'),
                l_opcname = this.model.get('opcname'),
                self = this,
                result = [];

              if(!_.isUndefined(l_typname) && l_typname != '' &&
                !_.isUndefined(l_opcname) && l_opcname != '') {
                var node = this.field.get('schema_node'),
                  _url = node.generate_url.apply(
                    node, [
                      null, 'get_stypediff',
                      this.field.get('node_data'), false,
                      this.field.get('node_info'),
                    ]);
                $.ajax({
                  async: false,
                  url: _url,
                  cache: false,
                  data: {'typname' : l_typname, 'opcname': l_opcname},
                })
                  .done(function(res) {
                    result = res.data;
                  })
                  .fail(function() {
                    self.model.trigger('pgadmin:view:fetch:error',
                      self.model, self.field);
                  });
              }
              return result;
            },
          }],
        },{
          type: 'nested', control: 'tab', group: gettext('Definition'),
          label: gettext('External Type'), deps: ['typtype'],
          mode: ['create', 'edit'], tabPanelExtraClasses:'inline-tab-panel-padded',
          visible: function(m) {
            return m.get('typtype') === 'b';
          },
          schema:[{
            id: 'spacer_ctrl', group: gettext('Required'), mode: ['edit', 'create'], type: 'spacer',
          },{
            id: 'typinput', label: gettext('Input function'),
            cell: 'string',type: 'text',
            mode: ['properties', 'create', 'edit'], group: gettext('Required'),
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: '', width: '100%' },
          },{
            id: 'typoutput', label: gettext('Output function'),
            cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Required'),
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: '', width: '100%' },
          },{
            id: 'spacer_ctrl_optional_1', group: gettext('Optional-1'), mode: ['edit', 'create'], type: 'spacer',
          },{
            id: 'typreceive', label: gettext('Receive function'),
            cell: 'string', type: 'text', group: gettext('Optional-1'),
            mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: '', width: '100%' },
          },{
            id: 'typsend', label: gettext('Send function'),
            cell: 'string', group: gettext('Optional-1'),
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: '', width: '100%' },
          },{
            id: 'typmodin', label: gettext('Typmod in function'),
            cell: 'string', type: 'text',
            mode: ['properties', 'create', 'edit'], group: gettext('Optional-1'),
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            transform: function(d) {
              var result = [{label :'', value : ''}];
              _.each(d, function(item) {
                // if type from selected from combobox matches in options
                if ( item.cbtype === 'typmodin' || item.cbtype === 'all') {
                  result.push(item);
                }
              });
              return result;
            },
          },{
            id: 'typmodout', label: gettext('Typmod out function'),
            cell: 'string', group: gettext('Optional-1'),
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            transform: function(d) {
              var result = [{label :'', value : ''}];
              _.each(d, function(item) {
                // if type from selected from combobox matches in options
                if ( item.cbtype === 'typmodout' || item.cbtype === 'all') {
                  result.push(item);
                }
              });
              return result;
            },
          },{
            id: 'typlen', label: gettext('Internal length'),
            cell: 'integer', group: gettext('Optional-1'),
            type: 'int', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
          },{
            id: 'variable', label: gettext('Variable?'), cell: 'switch',
            group: gettext('Optional-1'), type: 'switch',
            mode: ['create','edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
          },{
            id: 'typdefault', label: gettext('Default?'),
            cell: 'string', group: gettext('Optional-1'),
            type: 'text', mode: ['properties', 'create','edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
          },{
            id: 'typanalyze', label: gettext('Analyze function'),
            cell: 'string', group: gettext('Optional-1'),
            type: 'text', mode: ['properties', 'create','edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
            control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: '', width: '100%' },
          },{
            id: 'typcategory', label: gettext('Category type'),
            cell: 'string', group: gettext('Optional-1'),
            type: 'text', mode: ['properties', 'create','edit'],
            disabled: 'inSchema', readonly: 'inEditMode', control: 'select2',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            options: [
              {label :'', value : ''},
              {label :'Array types', value : 'A'},
              {label :'Boolean types', value : 'B'},
              {label :'Composite types', value : 'C'},
              {label :'Date/time types', value : 'D'},
              {label :'Enum types', value : 'E'},
              {label :'Geometric types', value : 'G'},
              {label :'Network address types', value : 'I'},
              {label :'Numeric types', value : 'N'},
              {label :'Pseudo-types', value : 'P'},
              {label :'String types', value : 'S'},
              {label :'Timespan types', value : 'T'},
              {label :'User-defined types', value : 'U'},
              {label :'Bit-string types', value : 'V'},
              {label :'unknown type', value : 'X'},
            ],
          },{
            id: 'typispreferred', label: gettext('Preferred?'), cell: 'switch',
            type: 'switch', mode: ['properties', 'create','edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
            group: gettext('Optional-1'),
          },{
            id: 'spacer_ctrl_optional_2', group: gettext('Optional-2'), mode: ['edit', 'create'], type: 'spacer',
          },{
            id: 'element', label: gettext('Element type'), cell: 'string',
            control: 'node-ajax-options', group: gettext('Optional-2'),
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode', url: 'get_types',
          },{
            id: 'typdelim', label: gettext('Delimiter'), cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Optional-2'), disabled: 'inSchema',
            readonly: 'inEditMode',
          },{
            id: 'typalign', label: gettext('Alignment type'),
            cell: 'string', group: gettext('Optional-2'),
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode', control: 'select2',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            options: [
              {label :'', value : ''},
              {label: 'char', value: 'c'},
              {label: 'int2', value: 's'},
              {label: 'int4', value: 'i'},
              {label: 'double', value: 'd'},
            ],
          },{
            id: 'typstorage', label: gettext('Storage type'),
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: gettext('Optional-2'), cell: 'string',
            disabled: 'inSchema', readonly: 'inEditMode', control: 'select2',
            select2: { allowClear: true, placeholder: '', width: '100%' },
            options: [
              {label :'', value : ''},
              {label: 'PLAIN', value: 'p'},
              {label: 'EXTERNAL', value: 'e'},
              {label: 'MAIN', value: 'm'},
              {label: 'EXTENDED', value: 'x'},
            ],
          },{
            id: 'typbyval', label: gettext('Passed by value?'),
            cell: 'switch',
            type: 'switch', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode', group: gettext('Optional-2'),
          },{
            id: 'is_collatable', label: gettext('Collatable?'),
            cell: 'switch',  min_version: 90100, group: gettext('Optional-2'),
            type: 'switch', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchema', readonly: 'inEditMode',
            // End of extension tab
          }],
        },{
          id: 'alias', label: gettext('Alias'), cell: 'string',
          type: 'text', mode: ['properties'],
          disabled: 'inSchema',
        }, pgBrowser.SecurityGroupSchema,{
          id: 'type_acl', label: gettext('Privileges'), cell: 'string',
          type: 'text', mode: ['properties'], group: 'security',
          disabled: 'inSchema',
        },{
          id: 'member_list', label: gettext('Members'), cell: 'string',
          type: 'text', mode: ['properties'], group: gettext('Definition'),
          disabled: 'inSchema', visible: function(m) {
            if(m.get('typtype') === 'c') {
              return true;
            }
            return false;
          },
        },{
          id: 'enum_list', label: gettext('Labels'), cell: 'string',
          type: 'text', mode: ['properties'], group: gettext('Definition'),
          disabled: 'inSchema', visible: function(m) {
            if(m.get('typtype') === 'e') {
              return true;
            }
            return false;
          },
        },{
          id: 'is_sys_type', label: gettext('System type?'), cell: 'switch',
          type: 'switch', mode: ['properties'],
          disabled: 'inSchema',
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema',
        },{
          id: 'typacl', label: gettext('Privileges'), type: 'collection',
          group: 'security', control: 'unique-col-collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['U'],
          }),
          mode: ['edit', 'create'], canDelete: true,
          uniqueCol : ['grantee'], deps: ['typtype'],
          canAdd: function(m) {
            // Do not allow to add when shell type is selected
            // Clear acl & security label collections as well
            if (m.get('typtype') === 'p') {
              var acl = m.get('typacl');
              if(acl.length > 0)
                acl.reset();
            }
            return (m.get('typtype') !== 'p');
          },
        },{
          id: 'seclabels', label: gettext('Security labels'),
          model: pgBrowser.SecLabelModel, editable: false, type: 'collection',
          group: 'security', mode: ['edit', 'create'],
          min_version: 90100, canEdit: false, canDelete: true,
          control: 'unique-col-collection', deps: ['typtype'],
          canAdd: function(m) {
            // Do not allow to add when shell type is selected
            // Clear acl & security label collections as well
            if (m.get('typtype') === 'p') {
              var secLabs = m.get('seclabels');
              if(secLabs.length > 0)
                secLabs.reset();
            }
            return (m.get('typtype') !== 'p');
          },
        }],
        validate: function() {
          // Validation code for required fields
          var msg;

          this.errorModel.clear();

          if (
            _.isUndefined(this.get('name')) ||
              _.isNull(this.get('name')) ||
              String(this.get('name')).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Name cannot be empty.');
            this.errorModel.set('name', msg);
            return msg;
          }

          if (
            _.isUndefined(this.get('schema')) ||
              _.isNull(this.get('schema')) ||
              String(this.get('schema')).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Schema cannot be empty.');
            this.errorModel.set('schema', msg);
            return msg;
          }

          if (
            _.isUndefined(this.get('typtype')) ||
              _.isNull(this.get('typtype')) ||
              String(this.get('typtype')).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Type cannot be empty.');
            this.errorModel.set('typtype', msg);
            return msg;
          }

          // For Range
          if(this.get('typtype') == 'r') {
            if (
              _.isUndefined(this.get('typname')) ||
                _.isNull(this.get('typname')) ||
                String(this.get('typname')).replace(/^\s+|\s+$/g, '') == ''
            ) {
              msg = gettext('Subtype name cannot be empty.');
              this.errorModel.set('typname', msg);
              return msg;
            }
          }

          // For External
          if(this.get('typtype') == 'b') {
            if (
              _.isUndefined(this.get('typinput')) ||
                _.isNull(this.get('typinput')) ||
                String(this.get('typinput')).replace(/^\s+|\s+$/g, '') == ''
            ) {
              msg = gettext('Input function cannot be empty.');
              this.errorModel.set('typinput', msg);
              return msg;
            }
            if (
              _.isUndefined(this.get('typoutput')) ||
                _.isNull(this.get('typoutput')) ||
                String(this.get('typoutput')).replace(/^\s+|\s+$/g, '') == ''
            ) {
              msg = gettext('Output function cannot be empty.');
              this.errorModel.set('typoutput', msg);
              return msg;
            }
          }

          return null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
        },
        inEditMode: function(m) {
          return !m.isNew();
        },
        schemaCheck: function(m) {
          if(this.node_info && 'schema' in this.node_info)
          {
            if (m.isNew()) {
              return false;
            } else {
              return m.get('typtype') === 'p';
            }
          }
          return true;
        },
        // Function will help us to fill combobox
        external_func_combo: function(d) {
          var result = [];
          _.each(d, function(item) {
            // if type from selected from combobox matches in options
            if ( item.cbtype == 'all' ) {
              result.push(item);
            }
          });
          return result;
        },
      }),
    });
  }
  return pgBrowser.Nodes['type'];
});
