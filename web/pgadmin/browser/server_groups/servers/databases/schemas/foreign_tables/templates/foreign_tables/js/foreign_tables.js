/* Create and Register Foreign Table Collection and Node. */
define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {

  if (!pgBrowser.Nodes['coll-foreign-table']) {
    var foreigntable = pgBrowser.Nodes['coll-foreign-table'] =
      pgBrowser.Collection.extend({
        node: 'foreign-table',
        label: '{{ _('Foreign Tables') }}',
        type: 'coll-foreign-table',
        columns: ['name', 'owner', 'description']
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


  // Options Model
  var ColumnOptionsModel = pgBrowser.Node.Model.extend({
    idAttribute: 'option',
    defaults: {
      option: undefined,
      value: undefined
    },
    schema: [
      {id: 'option', label:'Option', type:'text', editable: true, cellHeaderClasses: 'width_percent_30'},
      {
        id: 'value', label:'Value', type: 'text', editable: true, cellHeaderClasses: 'width_percent_50'
      }
    ],
    validate: function() {
      if (_.isUndefined(this.get('value')) ||
          _.isNull(this.get('value')) ||
          String(this.get('value')).replace(/^\s+|\s+$/g, '') == '') {
        var msg = 'Please enter a value.';

        this.errorModel.set('value', msg);

        return msg;
      } else {
        this.errorModel.unset('value');
      }

      return null;
    }
  });

  // Columns Model
  var ColumnsModel = pgBrowser.Node.Model.extend({
    idAttribute: 'attnum',
    defaults: {
      attname: undefined,
      datatype: undefined,
      typlen: undefined,
      precision: undefined,
      typdefault: undefined,
      attnotnull: undefined,
      collname: undefined,
      attnum: undefined,
      inheritedfrom: undefined,
      inheritedid: undefined,
      attstattarget: undefined,
      coloptions: []
    },
    type_options: undefined,
    schema: [{
        id: 'attname', label:'{{ _('Name') }}', cell: 'string', type: 'text',
        editable: 'is_editable_column', cellHeaderClasses: 'width_percent_40'
      },{
        id: 'datatype', label:'{{ _('Data Type') }}', cell: 'node-ajax-options',
        control: 'node-ajax-options', type: 'text', url: 'get_types',
        editable: 'is_editable_column', cellHeaderClasses: 'width_percent_0',
        group: '{{ _('Definition') }}',
        transform: function(d, self){
            self.model.type_options = d;
            return d;
          }
      },{
        id: 'typlen', label:'{{ _('Length') }}',
        cell: 'string', group: '{{ _('Definition') }}',
        type: 'int', deps: ['datatype'],
        disabled: function(m) {
        // We will store type from selected from combobox
          if(!(_.isUndefined(m.get('inheritedid'))
            || _.isNull(m.get('inheritedid'))
            || _.isUndefined(m.get('inheritedfrom'))
            || _.isNull(m.get('inheritedfrom')))) { return true; }

        var of_type = m.get('datatype');
        if(m.type_options) {
          m.set('is_tlength', false, {silent: true});

          // iterating over all the types
          _.each(m.type_options, function(o) {
            // if type from selected from combobox matches in options
            if ( of_type == o.value ) {
                 m.set('typlen', undefined);
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
          return !(m.get('is_tlength'));
        }
        return true;
        },
        cellHeaderClasses: 'width_percent_10'
      },{
        id: 'precision', label:'{{ _('Precision') }}',
        type: 'int', deps: ['datatype'],
        cell: 'string', group: '{{ _('Definition') }}',
        disabled: function(m) {
          if(!(_.isUndefined(m.get('inheritedid'))
            || _.isNull(m.get('inheritedid'))
            || _.isUndefined(m.get('inheritedfrom'))
            || _.isNull(m.get('inheritedfrom')))) { return true; }

          var of_type = m.get('datatype');
          if(m.type_options) {
             m.set('is_precision', false, {silent: true});
            // iterating over all the types
            _.each(m.type_options, function(o) {
              // if type from selected from combobox matches in options
              if ( of_type == o.value ) {
                m.set('precision', undefined);
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
          return !(m.get('is_precision'));
        }
        return true;
        }, cellHeaderClasses: 'width_percent_10'
      },{
        id: 'typdefault', label:'{{ _('Default') }}', type: 'text',
        cell: 'string', min_version: 90300, group: '{{ _('Definition') }}',
        placeholder: "Enter an expression or a value.",
        cellHeaderClasses: 'width_percent_10',
        editable: function(m) {
          if(!(_.isUndefined(m.get('inheritedid'))
            || _.isNull(m.get('inheritedid'))
            || _.isUndefined(m.get('inheritedfrom'))
            || _.isNull(m.get('inheritedfrom')))) { return false; }
          if (this.get('node_info').server.version < 90300){
            return false;
          }
          return true;
        }
      },{
        id: 'attnotnull', label:'{{ _('Not Null') }}',
        cell: 'boolean',type: 'switch', editable: 'is_editable_column',
        cellHeaderClasses: 'width_percent_10', group: '{{ _('Definition') }}'
      },{
        id: 'attstattarget', label:'{{ _('Statistics') }}', min_version: 90200,
        cell: 'integer', type: 'int', group: '{{ _('Definition') }}',
        editable: function(m) {
         if (_.isUndefined(m.isNew) || m.isNew()) { return false; }
         if (this.get('node_info').server.version < 90200){
            return false;
         }
         return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
          || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false
        }, cellHeaderClasses: 'width_percent_10'
      },{
        id: 'collname', label:'{{ _('Collation') }}', cell: 'node-ajax-options',
        control: 'node-ajax-options', type: 'text', url: 'get_collations',
        min_version: 90300, editable: function(m) {
          if (!(_.isUndefined(m.isNew)) && !m.isNew()) { return false; }
          return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
           || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false
        },
        cellHeaderClasses: 'width_percent_20', group: '{{ _('Definition') }}'
      },{
        id: 'attnum', cell: 'string',type: 'text', visible: false
      },{
        id: 'inheritedfrom', label:'{{ _('Inherited From') }}', cell: 'string',
        type: 'text', visible: false, mode: ['properties', 'edit'],
        cellHeaderClasses: 'width_percent_10'
      },{
          id: 'coloptions', label:'{{ _('Options') }}', cell: 'string',
          type: 'collection', group: 'Options', mode: ['edit', 'create'],
          model: ColumnOptionsModel, canAdd: true, canDelete: true, canEdit: false,
          control: Backform.UniqueColCollectionControl, uniqueCol : ['option'],
          min_version: 90200
      }],
    validate: function() {
      var err = {},
      errmsg;

      if (_.isUndefined(this.get('attname')) || String(this.get('attname')).replace(/^\s+|\s+$/g, '') == '') {
        err['name'] = '{{ _('Column Name can not be empty!') }}';
        errmsg = errmsg || err['attname'];
      }

      if (_.isUndefined(this.get('datatype')) || String(this.get('datatype'))
      .replace(/^\s+|\s+$/g, '') == '') {
        err['basensp'] = '{{ _('Column Datatype can not be empty!') }}';
        errmsg = errmsg || err['datatype'];
      }

      this.errorModel.clear().set(err);

      return errmsg;
    },
    is_editable_column: function(m) {
      return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
       || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false
    },
    toJSON: Backbone.Model.prototype.toJSON
  });


  /* NodeAjaxOptionsMultipleControl is for multiple selection of Combobox.
  *  This control is used to select Multiple Parent Tables to be inherited.
  *  It also populates/vacates Columns on selection/deselection of the option (i.e. table name).
  *  To populates the column, it calls the server and fetch the columns data
  *  for the selected table.
  */
  var NodeAjaxOptionsMultipleControl = Backform.NodeAjaxOptionsControl.extend({
    onChange: function(e) {
      var model = this.model,
          $el = $(e.target),
          attrArr = this.field.get("name").split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          value = this.getValueFromDOM(),
          changes = {},
          columns = model.get('columns'),
          inherits = model.get(name);

      if (this.model.errorModel instanceof Backbone.Model) {
        if (_.isEmpty(path)) {
          this.model.errorModel.unset(name);
        } else {
          var nestedError = this.model.errorModel.get(name);
          if (nestedError) {
            this.keyPathSetter(nestedError, path, null);
            this.model.errorModel.set(name, nestedError);
          }
        }
      }

      var self = this;

      if (typeof(inherits)  == "string"){ inherits = JSON.parse(inherits); }

      // Remove Columns if inherit option is deselected from the combobox
      if(_.size(value) < _.size(inherits)) {
        var dif =  _.difference(inherits, value);
        var rmv_columns = columns.where({inheritedid: parseInt(dif[0])});
        columns.remove(rmv_columns);
      }
      else
      {
        _.each(value, function(i) {
          // Fetch Columns from server
          var fnd_columns = columns.where({inheritedid: parseInt(i)});
          if (fnd_columns && fnd_columns.length <= 0) {
            inhted_columns = self.fetchColumns(i);
            columns.add(inhted_columns);
          }
        });
      }

      changes[name] = _.isEmpty(path) ? value : _.clone(model.get(name)) || {};
      this.stopListening(this.model, "change:" + name, this.render);
      model.set(changes);
      this.listenTo(this.model, "change:" + name, this.render);
    },
    fetchColumns: function(table_id){
      var self = this,
          url = 'get_columns',
          m = self.model.top || self.model;

      if (url) {
        var node = this.field.get('schema_node'),
            node_info = this.field.get('node_info'),
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'),
                this.field.get('url_with_id') || false, node_info
              ]),
            cache_level = this.field.get('cache_level') || node.type,
            cache_node = this.field.get('cache_node');

        cache_node = (cache_node && pgBrowser.Nodes['cache_node']) || node;

        m.trigger('pgadmin:view:fetching', m, self.field);
        data = {attrelid: table_id}

        // Fetching Columns data for the selected table.
        $.ajax({
          async: false,
          url: full_url,
          data: data,
          success: function(res) {
            /*
             * We will cache this data for short period of time for avoiding
             * same calls.
             */
            data = cache_node.cache(url, node_info, cache_level, res.data);

          },
          error: function() {
            m.trigger('pgadmin:view:fetch:error', m, self.field);
          }
        });
        m.trigger('pgadmin:view:fetched', m, self.field);

        // To fetch only options from cache, we do not need time from 'at'
        // attribute but only options.
        //
        // It is feasible that the data may not have been fetched.
        data = (data && data.data) || [];
        return data;
      }
    },
  });


  // Constraints Model
  var ConstraintModel = pgBrowser.Node.Model.extend({
    idAttribute: 'conoid',
    initialize: function(attrs, args) {
      var isNew = (_.size(attrs) === 0);
      if (!isNew) {
        this.convalidated_default = this.get('convalidated')
      }
      pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
    },
    defaults: {
      conoid: undefined,
      conname: undefined,
      consrc: undefined,
      connoinherit: undefined,
      convalidated: true,
      conislocal: undefined
    },
    convalidated_default: true,
    schema: [{
      id: 'conoid', type: 'text', cell: 'string', visible: false
    },{
      id: 'conname', label:'{{ _('Name') }}', type: 'text', cell: 'string',
      editable: 'is_editable', cellHeaderClasses: 'width_percent_30'
    },{
      id: 'consrc', label:'{{ _('Check') }}', type: 'multiline',
      editable: 'is_editable', cell: Backgrid.Extension.TextareaCell,
      cellHeaderClasses: 'width_percent_30'
    },{
      id: 'connoinherit', label:'{{ _('No Inherit') }}', type: 'switch',
      cell: 'boolean', editable: 'is_editable',
      cellHeaderClasses: 'width_percent_20'
    },{
      id: 'convalidated', label:'{{ _('Validate?') }}', type: 'switch',
      cell: 'boolean', cellHeaderClasses: 'width_percent_20',
      editable: function(m) {
        var server = this.get('node_info').server;
        if (_.isUndefined(m.isNew)) { return true; }
        if (!m.isNew()) {
          if(m.get('convalidated') && m.convalidated_default) {
            return false;
          }
          return true;
        }
        return true;
      }
     }
    ],
    validate: function() {
      var err = {},
      errmsg;

      if (_.isUndefined(this.get('conname')) || String(this.get('conname')).replace(/^\s+|\s+$/g, '') == '') {
        err['conname'] = '{{ _('Constraint Name can not be empty!') }}';
        errmsg = errmsg || err['conname'];
      }

      if (_.isUndefined(this.get('consrc')) || String(this.get('consrc'))
      .replace(/^\s+|\s+$/g, '') == '') {
        err['consrc'] = '{{ _('Constraint Check can not be empty!') }}';
        errmsg = errmsg || err['consrc'];
      }

      this.errorModel.clear().set(err);

      return errmsg;
    },
    is_editable: function(m) {
        return _.isUndefined(m.isNew) ? true : m.isNew();
    },
    toJSON: Backbone.Model.prototype.toJSON
  });


  // Options Model
  var OptionsModel = pgBrowser.Node.Model.extend({
    defaults: {
      option: undefined,
      value: undefined
    },
    schema: [{
      id: 'option', label:'{{ _('Option') }}', cell: 'string', type: 'text',
      editable: true, cellHeaderClasses:'width_percent_50'
    },{
      id: 'value', label:'{{ _('Value') }}', cell: 'string',type: 'text',
      editable: true, cellHeaderClasses:'width_percent_50'
    }
    ],
    validate: function() {
      // TODO: Add validation here
    },
    toJSON: Backbone.Model.prototype.toJSON
  });


  if (!pgBrowser.Nodes['foreign-table']) {
    pgBrowser.Nodes['foreign-table'] = pgBrowser.Node.extend({
      type: 'foreign-table',
      sqlAlterHelp: 'sql-alterforeigntable.html',
      sqlCreateHelp: 'sql-createforeigntable.html',
      label: '{{ _('Foreign Table') }}',
      collection_type: 'coll-foreign-table',
      hasSQL: true,
      hasDepends: true,
      hasScriptTypes: ['create', 'select', 'insert', 'update', 'delete'],
      parent_type: ['schema'],
      Init: function() {
        /* Avoid multiple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_foreign-table_on_coll', node: 'coll-foreign-table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Table...') }}',
          icon: 'wcTabIcon icon-foreign-table', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_foreign-table', node: 'foreign-table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Table...') }}',
          icon: 'wcTabIcon icon-foreign-table', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_foreign-table', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Foreign Table...') }}',
          icon: 'wcTabIcon icon-foreign-table', data: {action: 'create', check: false},
          enable: 'canCreate'
        }
        ]);

      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var schema = args.node_info.schema._label,
                userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            // Set Selected Schema and Current User
            this.set({
              'basensp': schema, 'owner': userInfo.name
            }, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          name: undefined,
          oid: undefined,
          owner: undefined,
          basensp: undefined,
          description: undefined,
          ftsrvname: undefined,
          strftoptions: undefined,
          inherits: [],
          columns: [],
          constraints: [],
          ftoptions: [],
          relacl: [],
          stracl: [],
          seclabels: []
        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit']
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'text' , mode: ['properties']
        },{
          id: 'owner', label:'{{ _('Owner') }}', cell: 'string',
          control: Backform.NodeListByNameControl,
          node: 'role',  type: 'text', select2: { allowClear: false }
        },{
          id: 'basensp', label:'{{ _('Schema') }}', cell: 'node-list-by-name',
           control: 'node-list-by-name', cache_level: 'database', type: 'text',
           node: 'schema', mode:['create', 'edit']
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline'
        },{
          id: 'ftsrvname', label:'{{ _('Foreign server') }}', cell: 'string', control: 'node-ajax-options',
          type: 'text', group: 'Definition', url: 'get_foreign_servers', disabled: function(m) { return !m.isNew(); }
        },{
          id: 'inherits', label:'{{ _('Inherits') }}', group: 'Definition',
          type: 'array', min_version: 90500, control: NodeAjaxOptionsMultipleControl,
          url: 'get_tables', select2: {multiple: true},
          'cache_level': 'database',
          transform: function(d, self){
            if (this.field.get('mode') == 'edit') {
              oid = this.model.get('oid');
              s = _.findWhere(d, {'id': oid});
              if (s) {
                d = _.reject(d, s);
              }
            }
            return d;
          }
        },{
          id: 'columns', label:'{{ _('Columns') }}', cell: 'string',
          type: 'collection', group: 'Columns', visible: false, mode: ['edit', 'create'],
          model: ColumnsModel, canAdd: true, canDelete: true, canEdit: true,
          columns: ['attname', 'datatype', 'inheritedfrom'],
          canDeleteRow: function(m) {
            return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
              || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false
          },
          canEditRow: function(m) {
            return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
              || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false
          }
        },
        {
          id: 'constraints', label:'{{ _('Constraints') }}', cell: 'string',
          type: 'collection', group: 'Constraints', visible: false, mode: ['edit', 'create'],
          model: ConstraintModel, canAdd: true, canDelete: true, columns: ['conname','consrc', 'connoinherit', 'convalidated'],
          canEdit: function(o) {
            if (o instanceof Backbone.Model) {
              if (o instanceof ConstraintModel) {
                return o.isNew();
              }
            }
            return true;
          }, min_version: 90500, canDeleteRow: function(m) {
            return (m.get('conislocal') == true || _.isUndefined(m.get('conislocal'))) ? true : false
          }
        },{
          id: 'strftoptions', label:'{{ _('Options') }}', cell: 'string',
          type: 'text', group: 'Definition', mode: ['properties']
        },{
          id: 'ftoptions', label:'{{ _('Options') }}', cell: 'string',
          type: 'collection', group: 'Options', mode: ['edit', 'create'],
          model: OptionsModel, canAdd: true, canDelete: true, canEdit: false,
          control: 'unique-col-collection', uniqueCol : ['option']
        },{
          id: 'relacl', label: '{{ _('Privileges') }}', cell: 'string',
          type: 'text', group: '{{ _('Security') }}',
          mode: ['properties'], min_version: 90200
        }, pgBrowser.SecurityGroupUnderSchema, {
          id: 'acl', label: '{{ _('Privileges') }}', model: pgAdmin
          .Browser.Node.PrivilegeRoleModel.extend(
          {privileges: ['a','r','w','x']}), uniqueCol : ['grantee', 'grantor'],
          editable: false, type: 'collection', group: 'security',
          mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
          min_version: 90200
        },{
          id: 'seclabels', label: '{{ _('Security Labels') }}',
          model: pgBrowser.SecLabelModel, type: 'collection',
          group: 'security', mode: ['edit', 'create'],
          min_version: 90100, canAdd: true,
          canEdit: false, canDelete: true,
          control: 'unique-col-collection', uniqueCol : ['provider']
        }
        ],
        validate: function()
        {
          var err = {},
              errmsg,
              seclabels = this.get('seclabels');

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = '{{ _('Name cannot be empty.') }}';
            errmsg = errmsg || err['name'];
          }

          if (_.isUndefined(this.get('basensp')) || String(this.get('basensp'))
          .replace(/^\s+|\s+$/g, '') == '') {
            err['basensp'] = '{{ _('Schema cannot be empty.') }}';
            errmsg = errmsg || err['basensp'];
          }

          if (_.isUndefined(this.get('ftsrvname')) || String(this.get('ftsrvname')).replace(/^\s+|\s+$/g, '') == '') {
            err['ftsrvname'] = '{{ _('Foreign server cannot be empty.') }}';
            errmsg = errmsg || err['ftsrvname'];
          }

          this.errorModel.clear().set(err);

          return null;
        }
      }),
      canCreate: function(itemData, item, data) {
        //If check is false then , we will allow create menu
        if (data && data.check == false)
          return true;

        var t = pgBrowser.tree, i = item, d = itemData;
        // To iterate over tree to check parent node
        while (i) {
          // If it is schema then allow user to create foreign table
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-foreign-table' == d._type) {
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

  return pgBrowser.Nodes['foreign-table'];
});
