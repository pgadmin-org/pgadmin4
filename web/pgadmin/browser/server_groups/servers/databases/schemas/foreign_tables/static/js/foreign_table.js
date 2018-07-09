/* Create and Register Foreign Table Collection and Node. */
define('pgadmin.node.foreign_table', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/child', 'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, Backgrid,
  schemaChild
) {

  if (!pgBrowser.Nodes['coll-foreign_table']) {
    pgBrowser.Nodes['coll-foreign_table'] =
      pgBrowser.Collection.extend({
        node: 'foreign_table',
        label: gettext('Foreign Tables'),
        type: 'coll-foreign_table',
        columns: ['name', 'owner', 'description'],
      });
  }

  // Options Model
  var ColumnOptionsModel = pgBrowser.Node.Model.extend({
    idAttribute: 'option',
    defaults: {
      option: undefined,
      value: undefined,
    },
    schema: [
      {id: 'option', label: gettext('Option'), type:'text', editable: true, cellHeaderClasses: 'width_percent_30'},
      {
        id: 'value', label: gettext('Value'), type: 'text', editable: true, cellHeaderClasses: 'width_percent_50',
      },
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
    },
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
      coloptions: [],
    },
    type_options: undefined,
    schema: [{
      id: 'attname', label: gettext('Name'), cell: 'string', type: 'text',
      editable: 'is_editable_column', cellHeaderClasses: 'width_percent_40',
    },{
      id: 'datatype', label: gettext('Data Type'), cell: 'node-ajax-options',
      control: 'node-ajax-options', type: 'text', url: 'get_types',
      editable: 'is_editable_column', cellHeaderClasses: 'width_percent_0',
      group: gettext('Definition'),
      transform: function(d, self){
        self.model.type_options = d;
        return d;
      },
    },{
      id: 'typlen', label: gettext('Length'),
      cell: 'string', group: gettext('Definition'),
      type: 'int', deps: ['datatype'],
      disabled: function(m) {
        var val = m.get('typlen');
          // We will store type from selected from combobox
        if(!(_.isUndefined(m.get('inheritedid'))
            || _.isNull(m.get('inheritedid'))
            || _.isUndefined(m.get('inheritedfrom'))
            || _.isNull(m.get('inheritedfrom')))) {

          if (!_.isUndefined(val)) {
            setTimeout(function() {
              m.set('typlen', undefined);
            }, 10);
          }
          return true;
        }

        var of_type = m.get('datatype'),
          has_length = false;
        if(m.type_options) {
          m.set('is_tlength', false, {silent: true});

            // iterating over all the types
          _.each(m.type_options, function(o) {
              // if type from selected from combobox matches in options
            if ( of_type == o.value ) {
                // if length is allowed for selected type
              if(o.length)
                {
                  // set the values in model
                has_length = true;
                m.set('is_tlength', true, {silent: true});
                m.set('min_val', o.min_val, {silent: true});
                m.set('max_val', o.max_val, {silent: true});
              }
            }
          });

          if (!has_length && !_.isUndefined(val)) {
            setTimeout(function() {
              m.set('typlen', undefined);
            }, 10);
          }

          return !(m.get('is_tlength'));
        }
        if (!has_length && !_.isUndefined(val)) {
          setTimeout(function() {
            m.set('typlen', undefined);
          }, 10);
        }
        return true;
      },
      cellHeaderClasses: 'width_percent_10',
    },{
      id: 'precision', label: gettext('Precision'),
      type: 'int', deps: ['datatype'],
      cell: 'string', group: gettext('Definition'),
      disabled: function(m) {
        var val = m.get('precision');
        if(!(_.isUndefined(m.get('inheritedid'))
            || _.isNull(m.get('inheritedid'))
            || _.isUndefined(m.get('inheritedfrom'))
            || _.isNull(m.get('inheritedfrom')))) {

          if (!_.isUndefined(val)) {
            setTimeout(function() {
              m.set('precision', undefined);
            }, 10);
          }
          return true;
        }

        var of_type = m.get('datatype'),
          has_precision = false;

        if(m.type_options) {
          m.set('is_precision', false, {silent: true});
            // iterating over all the types
          _.each(m.type_options, function(o) {
              // if type from selected from combobox matches in options
            if ( of_type == o.value ) {
                // if precession is allowed for selected type
              if(o.precision)
                {
                has_precision = true;
                  // set the values in model
                m.set('is_precision', true, {silent: true});
                m.set('min_val', o.min_val, {silent: true});
                m.set('max_val', o.max_val, {silent: true});
              }
            }
          });
          if (!has_precision && !_.isUndefined(val)) {
            setTimeout(function() {
              m.set('precision', undefined);
            }, 10);
          }
          return !(m.get('is_precision'));
        }
        if (!has_precision && !_.isUndefined(val)) {
          setTimeout(function() {
            m.set('precision', undefined);
          }, 10);
        }
        return true;
      }, cellHeaderClasses: 'width_percent_10',
    },{
      id: 'typdefault', label: gettext('Default'), type: 'text',
      cell: 'string', min_version: 90300, group: gettext('Definition'),
      placeholder: 'Enter an expression or a value.',
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
      },
    },{
      id: 'attnotnull', label: gettext('Not Null'),
      cell: 'boolean',type: 'switch', editable: 'is_editable_column',
      cellHeaderClasses: 'width_percent_10', group: gettext('Definition'),
    },{
      id: 'attstattarget', label: gettext('Statistics'), min_version: 90200,
      cell: 'integer', type: 'int', group: gettext('Definition'),
      editable: function(m) {
        if (_.isUndefined(m.isNew) || m.isNew()) { return false; }
        if (this.get('node_info').server.version < 90200){
          return false;
        }
        return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
          || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false;
      }, cellHeaderClasses: 'width_percent_10',
    },{
      id: 'collname', label: gettext('Collation'), cell: 'node-ajax-options',
      control: 'node-ajax-options', type: 'text', url: 'get_collations',
      min_version: 90300, editable: function(m) {
        if (!(_.isUndefined(m.isNew)) && !m.isNew()) { return false; }
        return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
           || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false;
      },
      cellHeaderClasses: 'width_percent_20', group: gettext('Definition'),
    },{
      id: 'attnum', cell: 'string',type: 'text', visible: false,
    },{
      id: 'inheritedfrom', label: gettext('Inherited From'), cell: 'string',
      type: 'text', visible: false, mode: ['properties', 'edit'],
      cellHeaderClasses: 'width_percent_10',
    },{
      id: 'coloptions', label: gettext('Options'), cell: 'string',
      type: 'collection', group: gettext('Options'), mode: ['edit', 'create'],
      model: ColumnOptionsModel, canAdd: true, canDelete: true, canEdit: false,
      control: Backform.UniqueColCollectionControl, uniqueCol : ['option'],
      min_version: 90200,
    }],
    validate: function() {
      var errmsg = null;

      if (_.isUndefined(this.get('attname')) || String(this.get('attname')).replace(/^\s+|\s+$/g, '') == '') {
        errmsg = gettext('Column Name cannot be empty.');
        this.errorModel.set('attname', errmsg);
      } else {
        this.errorModel.unset('attname');
      }

      if (_.isUndefined(this.get('datatype')) || String(this.get('datatype'))
      .replace(/^\s+|\s+$/g, '') == '') {
        errmsg = gettext('Column Datatype cannot be empty.');
        this.errorModel.set('datatype', errmsg);
      } else {
        this.errorModel.unset('datatype');
      }

      return errmsg;
    },
    is_editable_column: function(m) {
      return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
       || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false;
    },
    toJSON: Backbone.Model.prototype.toJSON,
  });


  /* NodeAjaxOptionsMultipleControl is for multiple selection of Combobox.
  *  This control is used to select Multiple Parent Tables to be inherited.
  *  It also populates/vacates Columns on selection/deselection of the option (i.e. table name).
  *  To populates the column, it calls the server and fetch the columns data
  *  for the selected table.
  */
  var NodeAjaxOptionsMultipleControl = Backform.NodeAjaxOptionsControl.extend({
    onChange: function() {
      var model = this.model,
        attrArr = this.field.get('name').split('.'),
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

      if (typeof(inherits)  == 'string'){ inherits = JSON.parse(inherits); }

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
            var inhted_columns = self.fetchColumns(i);
            columns.add(inhted_columns);
          }
        });
      }

      changes[name] = _.isEmpty(path) ? value : _.clone(model.get(name)) || {};
      this.stopListening(this.model, 'change:' + name, this.render);
      model.set(changes);
      this.listenTo(this.model, 'change:' + name, this.render);
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
                this.field.get('url_with_id') || false, node_info,
              ]),
          cache_level = this.field.get('cache_level') || node.type,
          cache_node = this.field.get('cache_node');

        cache_node = (cache_node && pgBrowser.Nodes['cache_node']) || node;

        m.trigger('pgadmin:view:fetching', m, self.field);
        var data = {attrelid: table_id};

        // Fetching Columns data for the selected table.
        $.ajax({
          async: false,
          url: full_url,
          data: data,
        })
        .done(function(res) {
          /*
           * We will cache this data for short period of time for avoiding
           * same calls.
           */
          data = cache_node.cache(url, node_info, cache_level, res.data);

        })
        .fail(function() {
          m.trigger('pgadmin:view:fetch:error', m, self.field);
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
    initialize: function(attrs) {
      var isNew = (_.size(attrs) === 0);
      if (!isNew) {
        this.convalidated_default = this.get('convalidated');
      }
      pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
    },
    defaults: {
      conoid: undefined,
      conname: undefined,
      consrc: undefined,
      connoinherit: undefined,
      convalidated: true,
      conislocal: undefined,
    },
    convalidated_default: true,
    schema: [{
      id: 'conoid', type: 'text', cell: 'string', visible: false,
    },{
      id: 'conname', label: gettext('Name'), type: 'text', cell: 'string',
      editable: 'is_editable', cellHeaderClasses: 'width_percent_30',
    },{
      id: 'consrc', label: gettext('Check'), type: 'multiline',
      editable: 'is_editable', cell: Backgrid.Extension.TextareaCell,
      cellHeaderClasses: 'width_percent_30',
    },{
      id: 'connoinherit', label: gettext('No Inherit'), type: 'switch',
      cell: 'boolean', editable: 'is_editable',
      cellHeaderClasses: 'width_percent_20',
    },{
      id: 'convalidated', label: gettext('Validate?'), type: 'switch',
      cell: 'boolean', cellHeaderClasses: 'width_percent_20',
      editable: function(m) {
        if (_.isUndefined(m.isNew)) { return true; }
        if (!m.isNew()) {
          if(m.get('convalidated') && m.convalidated_default) {
            return false;
          }
          return true;
        }
        return true;
      },
    },
    ],
    validate: function() {
      var err = {},
        errmsg;

      if (_.isUndefined(this.get('conname')) || String(this.get('conname')).replace(/^\s+|\s+$/g, '') == '') {
        err['conname'] = gettext('Constraint Name cannot be empty.');
        errmsg = errmsg || err['conname'];
      }

      if (_.isUndefined(this.get('consrc')) || String(this.get('consrc'))
      .replace(/^\s+|\s+$/g, '') == '') {
        err['consrc'] = gettext('Constraint Check cannot be empty.');
        errmsg = errmsg || err['consrc'];
      }

      this.errorModel.clear().set(err);

      return errmsg;
    },
    is_editable: function(m) {
      return _.isUndefined(m.isNew) ? true : m.isNew();
    },
    toJSON: Backbone.Model.prototype.toJSON,
  });


  // Options Model
  var OptionsModel = pgBrowser.Node.Model.extend({
    defaults: {
      option: undefined,
      value: undefined,
    },
    schema: [{
      id: 'option', label: gettext('Option'), cell: 'string', type: 'text',
      editable: true, cellHeaderClasses:'width_percent_50',
    },{
      id: 'value', label: gettext('Value'), cell: 'string',type: 'text',
      editable: true, cellHeaderClasses:'width_percent_50',
    },
    ],
    validate: function() {
      // TODO: Add validation here
    },
    toJSON: Backbone.Model.prototype.toJSON,
  });


  if (!pgBrowser.Nodes['foreign_table']) {
    pgBrowser.Nodes['foreign_table'] = schemaChild.SchemaChildNode.extend({
      type: 'foreign_table',
      sqlAlterHelp: 'sql-alterforeigntable.html',
      sqlCreateHelp: 'sql-createforeigntable.html',
      dialogHelp: url_for('help.static', {'filename': 'foreign_table_dialog.html'}),
      label: gettext('Foreign Table'),
      collection_type: 'coll-foreign_table',
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
          name: 'create_foreign_table_on_coll', node: 'coll-foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          icon: 'wcTabIcon icon-foreign_table', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_foreign_table', node: 'foreign_table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          icon: 'wcTabIcon icon-foreign_table', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_foreign_table', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Foreign Table...'),
          icon: 'wcTabIcon icon-foreign_table', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            var schema = args.node_info.schema._label,
              userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;

            // Set Selected Schema and Current User
            this.set({
              'basensp': schema, 'owner': userInfo.name,
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
          seclabels: [],
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          control: Backform.NodeListByNameControl,
          node: 'role',  type: 'text', select2: { allowClear: false },
        },{
          id: 'basensp', label: gettext('Schema'), cell: 'node-list-by-name',
          control: 'node-list-by-name', cache_level: 'database', type: 'text',
          node: 'schema', mode:['create', 'edit'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline',
        },{
          id: 'ftsrvname', label: gettext('Foreign server'), cell: 'string', control: 'node-ajax-options',
          type: 'text', group: gettext('Definition'), url: 'get_foreign_servers', disabled: function(m) { return !m.isNew(); },
        },{
          id: 'inherits', label: gettext('Inherits'), group: gettext('Definition'),
          type: 'array', min_version: 90500, control: NodeAjaxOptionsMultipleControl,
          url: 'get_tables', select2: {multiple: true},
          'cache_level': 'database',
          transform: function(d) {
            if (this.field.get('mode') == 'edit') {
              var oid = this.model.get('oid');
              var s = _.findWhere(d, {'id': oid});
              if (s) {
                d = _.reject(d, s);
              }
            }
            return d;
          },
        },{
          id: 'columns', label: gettext('Columns'), cell: 'string',
          type: 'collection', group: gettext('Columns'), mode: ['edit', 'create'],
          model: ColumnsModel, canAdd: true, canDelete: true, canEdit: true,
          columns: ['attname', 'datatype', 'inheritedfrom'],
          canDeleteRow: function(m) {
            return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
              || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false;
          },
          canEditRow: function(m) {
            return (_.isUndefined(m.get('inheritedid')) || _.isNull(m.get('inheritedid'))
              || _.isUndefined(m.get('inheritedfrom')) || _.isNull(m.get('inheritedfrom'))) ? true : false;
          },
        },
        {
          id: 'constraints', label: gettext('Constraints'), cell: 'string',
          type: 'collection', group: gettext('Constraints'), mode: ['edit', 'create'],
          model: ConstraintModel, canAdd: true, canDelete: true, columns: ['conname','consrc', 'connoinherit', 'convalidated'],
          canEdit: function(o) {
            if (o instanceof Backbone.Model) {
              if (o instanceof ConstraintModel) {
                return o.isNew();
              }
            }
            return true;
          }, min_version: 90500, canDeleteRow: function(m) {
            return (m.get('conislocal') == true || _.isUndefined(m.get('conislocal'))) ? true : false;
          },
        },{
          id: 'strftoptions', label: gettext('Options'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties'],
        },{
          id: 'ftoptions', label: gettext('Options'), cell: 'string',
          type: 'collection', group: gettext('Options'), mode: ['edit', 'create'],
          model: OptionsModel, canAdd: true, canDelete: true, canEdit: false,
          control: 'unique-col-collection', uniqueCol : ['option'],
        },{
          id: 'relacl', label: gettext('Privileges'), cell: 'string',
          type: 'text', group: gettext('Security'),
          mode: ['properties'], min_version: 90200,
        }, pgBrowser.SecurityGroupSchema, {
          id: 'acl', label: gettext('Privileges'), model: pgAdmin
          .Browser.Node.PrivilegeRoleModel.extend(
          {privileges: ['a','r','w','x']}), uniqueCol : ['grantee', 'grantor'],
          editable: false, type: 'collection', group: 'security',
          mode: ['edit', 'create'],
          canAdd: true, canDelete: true, control: 'unique-col-collection',
          min_version: 90200,
        },{
          id: 'seclabels', label: gettext('Security Labels'),
          model: pgBrowser.SecLabelModel, type: 'collection',
          group: 'security', mode: ['edit', 'create'],
          min_version: 90100, canAdd: true,
          canEdit: false, canDelete: true,
          control: 'unique-col-collection', uniqueCol : ['provider'],
        },
        ],
        validate: function()
        {
          var err = {},
            errmsg = null;

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = errmsg || err['name'];
          }

          if (_.isUndefined(this.get('basensp')) || String(this.get('basensp'))
          .replace(/^\s+|\s+$/g, '') == '') {
            err['basensp'] = gettext('Schema cannot be empty.');
            errmsg = errmsg || err['basensp'];
          }

          if (_.isUndefined(this.get('ftsrvname')) || String(this.get('ftsrvname')).replace(/^\s+|\s+$/g, '') == '') {
            err['ftsrvname'] = gettext('Foreign server cannot be empty.');
            errmsg = errmsg || err['ftsrvname'];
          }

          this.errorModel.clear().set(err);

          return errmsg;
        },
      }),
    });

  }

  return pgBrowser.Nodes['foreign_table'];
});
