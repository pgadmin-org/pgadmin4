define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
         'pgadmin.browser', 'alertify', 'backgrid', 'pgadmin.backgrid',
          'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify, Backgrid) {

  if (!pgBrowser.Nodes['coll-type']) {
    var databases = pgBrowser.Nodes['coll-type'] =
      pgBrowser.Collection.extend({
        node: 'type',
        label: '{{ _('Types') }}',
        type: 'coll-type',
        columns: ['name', 'typeowner', 'description']
      });
  };

  // Integer Cell for Columns Length and Precision
  var IntegerDepCell = Backgrid.IntegerCell.extend({
      initialize: function() {
        Backgrid.NumberCell.prototype.initialize.apply(this, arguments);
        Backgrid.Extension.DependentCell.prototype.initialize.apply(this, arguments);
      },
      dependentChanged: function () {
        this.$el.empty();
        var model = this.model;
        var column = this.column;
        editable = this.column.get("editable");

        is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
        if (is_editable){ this.$el.addClass("editable"); }
        else { this.$el.removeClass("editable"); }

        this.delegateEvents();
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove
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
          editable = this.column.get("editable"),
          input = this.$el.find('select').first();

        is_editable = _.isFunction(editable) ? !!editable.apply(column, [model]) : !!editable;
        if (is_editable) {
           this.$el.addClass("editable");
           input.prop('disabled', false);
         } else {
           this.$el.removeClass("editable");
           input.prop('disabled', true);
         }

        this.delegateEvents();
        return this;
      },
      remove: Backgrid.Extension.DependentCell.prototype.remove
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
      id: 'member_name', label: '{{ _('Member Name') }}',
      type: 'text',  disabled: false, editable: true
    },{
      id: 'type', label: '{{ _('Type') }}', control: 'node-ajax-options',
      type: 'text', url: 'get_types', disabled: false, node: 'type',
      cell: 'node-ajax-options', select2: {allowClear: false},
      editable: true,
      transform: function(d, control){
        control.model.type_options =  d;
        return d;
      }
    },{
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'tlength', label: '{{ _('Length/precision') }}', deps: ['type'], type: 'text',
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
                }
            }
          });
        }
        return m.get('is_tlength');
      }
    },{
      // Note: There are ambiguities in the PG catalogs and docs between
      // precision and scale. In the UI, we try to follow the docs as
      // closely as possible, therefore we use Length/Precision and Scale
      id: 'precision', label: '{{ _('Scale') }}', deps: ['type'],
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
                }
            }
          });
        }
        return m.get('is_precision');
      }
    },{
      id: 'collation', label: '{{ _('Collation') }}',
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
             m.set('collspcname', "");
           }, 10);
         }
         return flag;
      },
      type: 'text', disabled: false, url: 'get_collations', node: 'type'
    }],
    validate: function() {
      var err = {},
          errmsg = null,
          changedAttrs = this.sessAttrs;
      // Clearing previous errors first.
      this.errorModel.clear();
      // Validation for member name
      if ( _.isUndefined(this.get('member_name')) ||
        _.isNull(this.get('member_name')) ||
        String(this.get('member_name')).replace(/^\s+|\s+$/g, '') == '') {
          errmsg = '{{ _('Please specify the value for member name.') }}';
          this.errorModel.set('member_name', errmsg)
          return errmsg;
      }
      else if ( _.isUndefined(this.get('type')) ||
        _.isNull(this.get('type')) ||
        String(this.get('type')).replace(/^\s+|\s+$/g, '') == '') {
          errmsg = '{{ _('Please specify the type.') }}';
          this.errorModel.set('type', errmsg)
          return errmsg;
      }
      // Validation for Length/precision field (see comments above if confused about the naming!)
      else if (this.get('is_tlength')
        && !_.isUndefined(this.get('tlength'))) {
        if (this.get('tlength') < this.get('min_val'))
          errmsg = '{{ _('Length/precision should not be less than ') }}'  + this.get('min_val');
        if (this.get('tlength') > this.get('max_val') )
          errmsg = '{{ _('Length/precision should not be greater than ') }}' + this.get('max_val');
        // If we have any error set then throw it to user
        if(errmsg) {
          this.errorModel.set('tlength', errmsg)
          return errmsg;
        }
      }
      // Validation for scale field (see comments above if confused about the naming!)
      else if (this.get('is_precision')
        && !_.isUndefined(this.get('precision'))) {
        if (this.get('precision') < this.get('min_val'))
          errmsg = '{{ _('Scale should not be less than ') }}' + this.get('min_val');
        if (this.get('precision') > this.get('max_val'))
          errmsg = '{{ _('Scale should not be greater than ') }}' + this.get('max_val');
        // If we have any error set then throw it to user
        if(errmsg) {
          this.errorModel.set('precision', errmsg)
          return errmsg;
        }
      }
      return null;
    }
  });

  var EnumModel = Backform.EnumModel = pgBrowser.Node.Model.extend({
    defaults: {
      label: undefined,
    },
    schema: [{
      id: 'label', label: '{{ _('Label') }}',type: 'text', disabled: false,
      cellHeaderClasses: 'width_percent_99', editable: function(m) {
        return _.isUndefined(m.get('label'));
      }
    }],
    validate: function() {
      var err = {},
          errmsg = null;

      if (_.isUndefined(this.get('label') ||
        _.isNull(this.get('label')) ||
        String(this.get('label')).replace(/^\s+|\s+$/g, '') == '')) {
          errmsg = '{{ _('Please specify the value for label.') }}';
          this.errorModel.set('label', errmsg)
          return errmsg;
      } else {
        this.errorModel.unset('label');
      }
      return null;
    }
  });

  if (!pgBrowser.Nodes['type']) {
    pgBrowser.Nodes['type'] = pgBrowser.Node.extend({
      type: 'type',
      sqlAlterHelp: 'sql-altertype.html',
      sqlCreateHelp: 'sql-createtype.html',
      dialogHelp: '{{ url_for('help.static', filename='type_dialog.html') }}',
      label: '{{ _('Type') }}',
      collection_type: 'coll-type',
      hasSQL: true,
      hasDepends: true,
      parent_type: ['schema', 'catalog'],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_type_on_coll', node: 'coll-type', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Type...') }}',
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_type', node: 'type', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Type...') }}',
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_type', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Type...') }}',
          icon: 'wcTabIcon icon-type', data: {action: 'create', check: false},
          enable: 'canCreate'
        }
        ]);

      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      ext_funcs: undefined,
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          oid: undefined,
          is_sys_type: false,
          typtype: undefined
       },

        // Default values!
        initialize: function(attrs, args) {
          if (_.size(attrs) === 0) {
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user,
                schemaInfo = args.node_info.schema;

            this.set({
              'typeowner': userInfo.name, 'schema': schemaInfo._label
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },

        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'schemaCheck'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text' , mode: ['properties'], disabled: true
        },{
          id: 'typeowner', label:'{{ _('Owner') }}', cell: 'string',
          control: 'node-list-by-name',
          type: 'text', mode: ['properties', 'create', 'edit'], node: 'role',
          disabled: 'inSchema', select2: {allowClear: false}
        },{
          id: 'schema', label:'{{ _('Schema') }}', cell: 'string',
          type: 'text', mode: ['create', 'edit'], node: 'schema',
          disabled: 'schemaCheck', filter: function(d) {
            // If schema name start with pg_* then we need to exclude them
            if(d && d.label.match(/^pg_/))
            {
              return false;
            }
            return true;
          }, cache_node: 'database', cache_level: 'database',
          control: 'node-list-by-name', select2: {allowClear: false}
        },{
          id: 'typtype', label:'{{ _('Type') }}',
          mode: ['create','edit'], disabled: 'inSchemaWithModelCheck',
          group: '{{ _('Definition') }}',
          mode: ['edit', 'create'],
          select2: { width: "50%", allowClear: false },
          options: function(obj) {
              return [
                {label: "Composite", value: "c"},
                {label: "Enumeration", value: "e"},
                {label: "External", value: "b"},
                {label: "Range", value: "r"},
                {label: "Shell", value: "p"}
              ]
           },
          disabled: 'inSchemaWithModelCheck',
          // If create mode then by default open composite type
          control: Backform.Select2Control.extend({
            render: function(){
              // Initialize parent's render method
              Backform.Select2Control.prototype.render.apply(this, arguments);
              if(this.model.isNew()) {
                this.model.set({'typtype': 'c'});
              }
              return this;
            }
          })
        },{
          id: 'composite', label: '{{ _('Composite Type') }}',
          model: CompositeModel, editable: true, type: 'collection',
          group: '{{ _('Definition') }}', mode: ['edit', 'create'],
          control: 'unique-col-collection', uniqueCol : ['member_name'],
          canAdd: true, canEdit: false, canDelete: true, disabled: 'inSchema',
          deps: ['typtype'],
          visible: function(m) {
           return m.get('typtype') === 'c';
          }
        },{
          id: 'enum', label: '{{ _('Enumeration Type') }}',
          model: EnumModel, editable: true, type: 'collection',
          group: '{{ _('Definition') }}', mode: ['edit', 'create'],
          canAdd: true, canEdit: false, canDelete: function(m) {
              // We will disable it if it's in 'edit' mode
              if (m.isNew()) {
                  return true;
              } else {
                  return false;
            }
          },
          disabled: 'inSchema', deps: ['typtype'],
          control: 'unique-col-collection', uniqueCol : ['label'],
          visible: function(m) {
           return m.get('typtype') === 'e';
          }
        },{
          // We will disable range type control in edit mode
          type: 'nested', control: 'plain-fieldset', group: '{{ _('Definition') }}',
          mode: ['edit', 'create'],
          visible: function(m) {
            return m.get('typtype') === 'r';
          }, deps: ['typtype'], label: '',
          schema:[{
            id: 'typname', label:'{{ _('Sub-type') }}', cell: 'string',
            control: 'node-ajax-options',
            select2: { allowClear: true, placeholder: "", width: "100%" },
            url: 'get_stypes', type: 'text', mode: ['properties', 'create', 'edit'],
            group: '{{ _('Range Type') }}', disabled: 'inSchemaWithModelCheck',
            transform: function(d, self){
              self.model.subtypes =  d;
              return d;
            }
          },{
              id: 'opcname', label:'{{ _('Sub-type operator class') }}', cell: 'string',
              mode: ['properties', 'create', 'edit'], group: '{{ _('Range Type') }}',
              disabled: 'inSchemaWithModelCheck', deps: ['typname'],
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
                            this.field.get('node_info')
                    ]);
                  $.ajax({
                    async: false,
                    url: _url,
                    cache: false,
                    data: {'typname' : l_typname},
                    success: function(res) {
                      result = res.data;
                    },
                    error: function() {
                      self.model.trigger('pgadmin:view:fetch:error', self.model, self.field);
                    }
                    });
                  //
                }
                return result;
              }
            },{
              id: 'collname', label:'{{ _('Collation') }}', cell: 'string',
              type: 'text', mode: ['properties', 'create', 'edit'],
              group: '{{ _('Range Type') }}',
              deps: ['typname'], control: 'node-ajax-options', url: 'get_collations',
              select2: { allowClear: true, placeholder: "", width: "100%" },
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
              }
            },{
              id: 'rngcanonical', label:'{{ _('Canonical function') }}', cell: 'string',
              type: 'text', mode: ['properties', 'create', 'edit'],
              group: '{{ _('Range Type') }}',
              disabled: 'inSchemaWithModelCheck', deps: ['name', 'typname'],
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
                            this.field.get('node_info')
                    ]);
                  $.ajax({
                    async: false,
                    url: _url,
                    cache: false,
                    data: {"name" : name},
                    success: function(res) {
                      result = res.data;
                    },
                    error: function() {
                      self.model.trigger('pgadmin:view:fetch:error',
                      self.model, self.field);
                    }
                    });
                }
              return result;
            }
            },{
              id: 'rngsubdiff', label:'{{ _('Sub-type diff function') }}', cell: 'string',
              type: 'text', mode: ['properties', 'create', 'edit'],
              group: '{{ _('Range Type') }}',
              disabled: 'inSchemaWithModelCheck', deps: ['opcname'],
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
                            this.field.get('node_info')
                    ]);
                  $.ajax({
                    async: false,
                    url: _url,
                    cache: false,
                    data: {'typname' : l_typname, 'opcname': l_opcname},
                    success: function(res) {
                      result = res.data;
                    },
                    error: function() {
                      self.model.trigger('pgadmin:view:fetch:error',
                      self.model, self.field);
                    }
                    });
                }
              return result;
            }
          }]
        },{
          type: 'nested', control: 'tab', group: '{{ _('Definition') }}',
          label: '{{ _('External Type') }}', deps: ['typtype'],
          mode: ['create', 'edit'],
          visible: function(m) {
            return m.get('typtype') === 'b';
          },
          schema:[{
            id: 'typinput', label:'{{ _('Input function') }}',
            cell: 'string',type: 'text',
            mode: ['properties', 'create', 'edit'], group: 'Required',
            disabled: 'inSchemaWithModelCheck',
            control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: "", width: "100%" }
          },{
            id: 'typoutput', label:'{{ _('Output function') }}',
            cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: 'Required',
            disabled: 'inSchemaWithModelCheck'
            ,control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: "", width: "100%" }
          },{
            id: 'typreceive', label:'{{ _('Receive function') }}',
            cell: 'string', type: 'text', group: 'Optional-1',
            mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck'
            ,control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: "", width: "100%" }
          },{
            id: 'typsend', label:'{{ _('Send function') }}',
            cell: 'string', group: 'Optional-1',
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck'
            ,control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: "", width: "100%" }
          },{
            id: 'typmodin', label:'{{ _('Typmod in function') }}',
            cell: 'string', type: 'text',
            mode: ['properties', 'create', 'edit'], group: 'Optional-1',
            disabled: 'inSchemaWithModelCheck',
            control: 'node-ajax-options', url: 'get_external_functions',
            select2: { allowClear: true, placeholder: "", width: "100%" },
            transform: function(d) {
              var result = [{label :"", value : ""}];
              _.each(d, function(item) {
              // if type from selected from combobox matches in options
              if ( item.cbtype === 'typmodin' || item.cbtype === 'all') {
                result.push(item);
              }
             });
             return result;
            }
          },{
            id: 'typmodout', label:'{{ _('Typmod out function') }}',
            cell: 'string', group: 'Optional-1',
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck',
            control: 'node-ajax-options', url: 'get_external_functions',
            select2: { allowClear: true, placeholder: "", width: "100%" },
            transform: function(d) {
              var result = [{label :"", value : ""}];
              _.each(d, function(item) {
              // if type from selected from combobox matches in options
              if ( item.cbtype === 'typmodout' || item.cbtype === 'all') {
                result.push(item);
              }
             });
             return result;
            }
          },{
            id: 'typlen', label:'{{ _('Internal length') }}',
            cell: 'integer', group: 'Optional-1',
            type: 'int', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck'
          },{
            id: 'variable', label:'{{ _('Variable?') }}', cell: 'switch',
            group: 'Optional-1', type: 'switch',
            mode: ['create','edit'],
            disabled: 'inSchemaWithModelCheck'
          },{
            id: 'typdefault', label:'{{ _('Default?') }}',
            cell: 'string', group: 'Optional-1',
            type: 'text', mode: ['properties', 'create','edit'],
            disabled: 'inSchemaWithModelCheck'
          },{
            id: 'typanalyze', label:'{{ _('Analyze function') }}',
            cell: 'string', group: 'Optional-1',
            type: 'text', mode: ['properties', 'create','edit'],
            disabled: 'inSchemaWithModelCheck'
            ,control: 'node-ajax-options', url: 'get_external_functions',
            transform: 'external_func_combo',
            select2: { allowClear: true, placeholder: "", width: "100%" }
          },{
            id: 'typcategory', label:'{{ _('Category type') }}',
            cell: 'string', group: 'Optional-1',
            type: 'text', mode: ['properties', 'create','edit'],
            disabled: 'inSchemaWithModelCheck', control: 'select2',
            select2: { allowClear: true, placeholder: "", width: "100%" },
            options: [
              {label :"", value : ""},
              {label :"Array types", value : "A"},
              {label :"Boolean types", value : "B"},
              {label :"Composite types", value : "C"},
              {label :"Date/time types", value : "D"},
              {label :"Enum types", value : "E"},
              {label :"Geometric types", value : "G"},
              {label :"Network address types", value : "I"},
              {label :"Numeric types", value : "N"},
              {label :"Pseudo-types", value : "P"},
              {label :"String types", value : "S"},
              {label :"Timespan types", value : "T"},
              {label :"User-defined types", value : "U"},
              {label :"Bit-string types", value : "V"},
              {label :"unknown type", value : "X"}
            ]
          },{
            id: 'typispreferred', label:'{{ _('Preferred?') }}', cell: 'switch',
            type: 'switch', mode: ['properties', 'create','edit'],
            disabled: 'inSchemaWithModelCheck',
            group: 'Optional-1'
          },{
            id: 'element', label:'{{ _('Element type') }}', cell: 'string',
            control: 'node-ajax-options', group: 'Optional-2',
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck', url: 'get_types'
          },{
            id: 'typdelim', label:'{{ _('Delimiter') }}', cell: 'string',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: 'Optional-2', disabled: 'inSchemaWithModelCheck'
          },{
            id: 'typalign', label:'{{ _('Alignment type') }}',
            cell: 'string', group: 'Optional-2',
            type: 'text', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck', control: 'select2',
            select2: { allowClear: true, placeholder: "", width: "100%" },
            options: [
              {label :"", value : ""},
              {label: "char", value: "c"},
              {label: "int2", value: "s"},
              {label: "int4", value: "i"},
              {label: "double", value: "d"},
            ]
          },{
            id: 'typstorage', label:'{{ _('Storage type') }}',
            type: 'text', mode: ['properties', 'create', 'edit'],
            group: 'Optional-2', cell: 'string',
            disabled: 'inSchemaWithModelCheck', control: 'select2',
            select2: { allowClear: true, placeholder: "", width: "100%" },
            options: [
              {label :"", value : ""},
              {label: "PLAIN", value: "p"},
              {label: "EXTERNAL", value: "e"},
              {label: "MAIN", value: "m"},
              {label: "EXTENDED", value: "x"},
             ]
          },{
            id: 'typbyval', label:'{{ _('Passed by value?') }}',
            cell: 'switch',
            type: 'switch', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck', group: 'Optional-2',
          },{
            id: 'is_collatable', label:'{{ _('Collatable?') }}',
            cell: 'switch',  min_version: 90100, group: 'Optional-2',
            type: 'switch', mode: ['properties', 'create', 'edit'],
            disabled: 'inSchemaWithModelCheck'
          // End of extension tab
        }]
        },{
          id: 'alias', label:'{{ _('Alias') }}', cell: 'string',
          type: 'text', mode: ['properties'],
          disabled: 'inSchema'
        }, pgBrowser.SecurityGroupUnderSchema,{
          id: 'type_acl', label:'{{ _('Privileges') }}', cell: 'string',
          type: 'text', mode: ['properties'], group: 'security',
          disabled: 'inSchema'
        },{
          id: 'member_list', label:'{{ _('Members') }}', cell: 'string',
          type: 'text', mode: ['properties'], group: '{{ _('Definition') }}',
          disabled: 'inSchema', visible: function(m) {
            if(m.get('typtype') === 'c') {
              return true;
            }
            return false;
          }
        },{
          id: 'enum_list', label:'{{ _('Labels') }}', cell: 'string',
          type: 'text', mode: ['properties'], group: '{{ _('Definition') }}',
          disabled: 'inSchema', visible: function(m) {
            if(m.get('typtype') === 'e') {
              return true;
            }
            return false;
          }
        },{
          id: 'is_sys_type', label:'{{ _('System type?') }}', cell: 'switch',
          type: 'switch', mode: ['properties'],
          disabled: 'inSchema'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema'
        },{
          id: 'typacl', label:'{{ _('Privileges') }}', type: 'collection',
          group: 'security', control: 'unique-col-collection',
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['U']
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
            return !(m.get('typtype') === 'p');
          }
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
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
            return !(m.get('typtype') === 'p');
          }
        }],
        validate: function() {
        // Validation code for required fields
          var changedAttrs = this.sessAttrs,
              msg = undefined;

          this.errorModel.clear();

          if (_.has(changedAttrs, 'name') &&
                (_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '')) {
            msg = '{{ _('Name cannot be empty.') }}';
            this.errorModel.set('name', msg);
          } else if (_.has(changedAttrs, 'schema') &&
                (_.isUndefined(this.get('schema'))
              || String(this.get('schema')).replace(/^\s+|\s+$/g, '') == '')) {
            msg = '{{ _('Schema cannot be empty.') }}';
            this.errorModel.set('schema', msg);
          } else if (_.has(changedAttrs, 'typtype') &&
                (_.isUndefined(this.get('typtype'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '')) {
            msg = '{{ _('Type can not be empty.') }}';
            this.errorModel.set('typtype', msg);
          } else if (this.get('typtype') == 'r' &&
                _.has(changedAttrs, 'typname')
              && (_.isUndefined(this.get('typname'))
              || String(this.get('typname')).replace(/^\s+|\s+$/g, '') == '')) {
            msg = '{{ _('Subtype name cannot be empty.') }}';
            this.errorModel.set('typname', msg);
          } else if (this.get('typtype') == 'x' &&
                _.has(changedAttrs, 'typinput')
              && (_.isUndefined(this.get('typinput'))
              || String(this.get('typinput')).replace(/^\s+|\s+$/g, '') == '')) {
            msg = '{{ _('Input function can not be empty.') }}';
            this.errorModel.set('typinput', msg);
          } else if (this.get('typtype') == 'x' &&
                _.has(changedAttrs, 'typoutput')
              && (_.isUndefined(this.get('typoutput'))
              || String(this.get('typoutput')).replace(/^\s+|\s+$/g, '') == '')) {
            msg = '{{ _('Output function can not be empty.') }}';
            this.errorModel.set('typoutput', msg);
          }

          return msg ? msg : null;
        },
        // We will disable everything if we are under catalog node
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info)
          {
            return true;
          }
          return false;
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
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info)
          {
            // We will disbale control if it's in 'edit' mode
            if (m.isNew()) {
              return false;
            } else {
              return true;
            }

          }
          return true;
        },
        // We want to enable only in edit mode
        inSchemaWithEditMode: function(m) {
          if(this.node_info &&  'schema' in this.node_info)
          {
            // We will disbale control if it's in 'edit' mode
            if (m.isNew()) {
              return true;
            } else {
              return false;
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
        }
      }),
      canCreate: function(itemData, item, data) {
          //If check is false then , we will allow create menu
          if (data && data.check == false)
            return true;

          var t = pgBrowser.tree, i = item, d = itemData;
          // To iterate over tree to check parent node
          while (i) {
            // If it is schema then allow user to create table
            if (_.indexOf(['schema'], d._type) > -1)
              return true;

            if ('coll-type' == d._type) {
              //Check if we are not child of catalog
              prev_i = t.hasParent(i) ? t.parent(i) : null;
              prev_d = prev_i ? t.itemData(prev_i) : null;
              if( prev_d._type == 'catalog') {
                return false;
              } else {
                return true;
              }
            }
            i = t.hasParent(i) ? t.parent(i) : null;
            d = i ? t.itemData(i) : null;
          }
          // by default we do not want to allow create menu
          return true;
      }
  });
  }
  return pgBrowser.Nodes['type'];
});
