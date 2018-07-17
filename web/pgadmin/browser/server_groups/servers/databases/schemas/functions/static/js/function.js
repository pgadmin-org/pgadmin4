/* Create and Register Function Collection and Node. */
define('pgadmin.node.function', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform',
  'pgadmin.node.schema.dir/child', 'pgadmin.browser.collection',
  'pgadmin.browser.server.privilege',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, schemaChild
) {

  if (!pgBrowser.Nodes['coll-function']) {
    pgBrowser.Nodes['coll-function'] =
      pgBrowser.Collection.extend({
        node: 'function',
        label: gettext('Functions'),
        type: 'coll-function',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
      });
  }

  // Argument Model
  var ArgumentModel = pgBrowser.Node.Model.extend({
    idAttribute: 'argid',
    defaults: {
      argid: undefined,
      argtype: undefined,
      argmode: undefined,
      argname: undefined,
      argdefval: undefined,
    },
    schema: [{
      id: 'argid', visible: false, type: 'text',
      mode: ['properties', 'edit','create'],
    },{
      id: 'argtype', label: gettext('Data Type'), cell:
        'node-ajax-options', cellHeaderClasses: 'width_percent_30',
      control: 'node-ajax-options', type: 'text', url: 'get_types',
      editable: function(m) {
        var node_info = this.get('node_info');
        if(node_info && 'catalog' in node_info) {
          return false;
        }
        return _.isUndefined(m.isNew) ? true : m.isNew();
      }, first_empty: true,
    },{
      id: 'argmode', label: gettext('Mode'), type: 'options',
      control: 'node-ajax-options', cellHeaderClasses:'width_percent_20',
      options:[
          {'label': 'IN', 'value': 'IN'},
          {'label': 'OUT', 'value': 'OUT'},
          {'label': 'INOUT', 'value': 'INOUT'},
          {'label': 'VARIADIC', 'value': 'VARIADIC'},
      ], editable: function(m) {
        var node_info = this.get('node_info');
        if(node_info && 'catalog' in node_info) {
          return false;
        }
        return _.isUndefined(m.isNew) ? true : m.isNew();
      },
    },{
      id: 'argname', label: gettext('Argument Name'), type: 'text',
      cell: 'string', editable: 'isInCatalog', cellHeaderClasses:'width_percent_30',
    },{
      id: 'argdefval', label: gettext('Default Value'), type: 'text',
      cell: 'string', editable: 'isInCatalog',  cellHeaderClasses:'width_percent_20',
    },
    ],
    toJSON: Backbone.Model.prototype.toJSON,
    isInCatalog: function(m){
      var node_info = this.get('node_info');
      if(node_info && 'catalog' in node_info) {
        return false;
      }
      // Below will disable default value cell if argument mode is 'INOUT' or 'OUT' as
      // user cannot set default value for out parameters.
      if(!_.isUndefined(m.get('argmode')) && !_.isUndefined(this.get('name')) &&
         this.get('name') == 'argdefval' &&
         (m.get('argmode') == 'INOUT' || m.get('argmode') == 'OUT')) {
        return false;
      }
      return true;
    },
    validate: function() {
    },
  });

  if (!pgBrowser.Nodes['function']) {

    pgBrowser.Nodes['function'] = schemaChild.SchemaChildNode.extend({
      type: 'function',
      sqlAlterHelp: 'sql-alterfunction.html',
      sqlCreateHelp: 'sql-createfunction.html',
      dialogHelp: url_for('help.static', {'filename': 'function_dialog.html'}),
      label: gettext('Function'),
      collection_type: 'coll-function',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: (treeInformation) => {
        return treeInformation.server.server_type !== 'gpdb';
      },
      hasScriptTypes: ['create', 'select'],
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
          return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_function_on_coll', node: 'coll-function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          icon: 'wcTabIcon icon-function', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_function', node: 'function', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          icon: 'wcTabIcon icon-function', data: {action: 'create', check: true},
          enable: 'canCreate',
        },{
          name: 'create_function', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Function...'),
          icon: 'wcTabIcon icon-function', data: {action: 'create', check: false},
          enable: 'canCreate',
        },
        ]);

      },
      model: pgBrowser.Node.Model.extend({
        initialize: function(attrs, args) {
          var isNew = (_.size(attrs) === 0);
          if (isNew) {
            // Set Selected Schema
            var schema_id = args.node_info.schema._id;
            this.set({'pronamespace': schema_id}, {silent: true});

            // Set Current User
            var userInfo = pgBrowser.serverInfo[args.node_info.server._id].user;
            this.set({'funcowner': userInfo.name}, {silent: true});
          }
          pgBrowser.Node.Model.prototype.initialize.apply(this, arguments);
        },
        defaults: {
          name: undefined,
          oid: undefined,
          xmin: undefined,
          funcowner: undefined,
          pronamespace: undefined,
          description: undefined,
          pronargs: undefined, /* Argument Count */
          proargs: undefined, /* Arguments */
          proargtypenames: undefined, /* Argument Signature */
          prorettypename: undefined, /* Return Type */
          lanname: 'sql', /* Language Name in which function is being written */
          provolatile: undefined, /* Volatility */
          proretset: undefined, /* Return Set */
          proisstrict: undefined,
          prosecdef: undefined, /* Security of definer */
          proiswindow: undefined, /* Window Function ? */
          proparallel: undefined, /* Parallel mode */
          procost: undefined, /* Estimated execution Cost */
          prorows: undefined, /* Estimated number of rows */
          proleakproof: undefined,
          arguments: [],
          prosrc: undefined,
          prosrc_c: undefined,
          probin: '$libdir/',
          options: [],
          variables: [],
          proacl: undefined,
          seclabels: [],
          acl: [],
          sysfunc: undefined,
          sysproc: undefined,
        },
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          disabled: 'isDisabled',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          type: 'text' , mode: ['properties'],
        },{
          id: 'funcowner', label: gettext('Owner'), cell: 'string',
          control: Backform.NodeListByNameControl, node: 'role',  type:
          'text', disabled: 'isDisabled',
        },{
          id: 'pronamespace', label: gettext('Schema'), cell: 'string',
          control: 'node-list-by-id', type: 'text', cache_level: 'database',
          node: 'schema', disabled: 'isDisabled', mode: ['create', 'edit'],
        },{
          id: 'sysfunc', label: gettext('System function?'),
          cell:'boolean', type: 'switch',
          mode: ['properties'], visible: 'isVisible',
        },{
          id: 'sysproc', label: gettext('System procedure?'),
          cell:'boolean', type: 'switch',
          mode: ['properties'], visible: 'isVisible',
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', disabled: 'isDisabled',
        },{
          id: 'pronargs', label: gettext('Argument count'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties'],
        },{
          id: 'proargs', label: gettext('Arguments'), cell: 'string',
          type: 'text', group: gettext('Definition'), mode: ['properties', 'edit'],
          disabled: 'isDisabled',
        },{
          id: 'proargtypenames', label: gettext('Signature arguments'), cell:
          'string', type: 'text', group: gettext('Definition'), mode: ['properties'],
          disabled: 'isDisabled',
        },{
          id: 'prorettypename', label: gettext('Return type'), cell: 'string',
          control: 'node-ajax-options', type: 'text', group: gettext('Definition'),
          url: 'get_types', disabled: 'isDisabled', first_empty: true,
          mode: ['create'], visible: 'isVisible',
        },{
          id: 'prorettypename', label: gettext('Return type'), cell: 'string',
          type: 'text', group: gettext('Definition'),
          mode: ['properties', 'edit'], disabled: 'isDisabled', visible: 'isVisible',
        },  {
          id: 'lanname', label: gettext('Language'), cell: 'string',
          control: 'node-ajax-options', type: 'text', group: gettext('Definition'),
          url: 'get_languages', disabled: 'isDisabled',
        },{
          id: 'prosrc', label: gettext('Code'), cell: 'string',
          type: 'text', mode: ['properties', 'create', 'edit'],
          group: gettext('Definition'), deps: ['lanname'],
          control: Backform.SqlFieldControl,
          extraClasses:['custom_height_css_class'],
          visible: function(m) {
            if (m.get('lanname') == 'c') {
              return false;
            }
            return true;
          }, disabled: 'isDisabled',
        },{
          id: 'probin', label: gettext('Object file'), cell: 'string',
          type: 'text', group: gettext('Definition'), deps: ['lanname'], visible:
          function(m) {
            if (m.get('lanname') == 'c') { return true; }
            return false;
          }, disabled: 'isDisabled',
        },{
          id: 'prosrc_c', label: gettext('Link symbol'), cell: 'string',
          type: 'text', group: gettext('Definition'),  deps: ['lanname'], visible:
          function(m) {
            if (m.get('lanname') == 'c') { return true; }
            return false;
          }, disabled: 'isDisabled',
        },{
          id: 'provolatile', label: gettext('Volatility'), cell: 'string',
          control: 'node-ajax-options', type: 'text', group: gettext('Options'),
          deps: ['lanname'],
          options:[
            {'label': 'VOLATILE', 'value': 'v'},
            {'label': 'STABLE', 'value': 's'},
            {'label': 'IMMUTABLE', 'value': 'i'},
          ], disabled: 'isDisabled', select2: {allowClear: false},
        },{
          id: 'proretset', label: gettext('Returns a set?'), type: 'switch',
          disabled: 'isDisabled', group: gettext('Options'),
          visible: 'isVisible',
        },{
          id: 'proisstrict', label: gettext('Strict?'), type: 'switch',
          group: gettext('Options'), disabled: 'isDisabled',
          deps: ['lanname'],
          options: {
            'onText': gettext('Yes'), 'offText': gettext('No'),
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small',
          },
        },{
          id: 'prosecdef', label: gettext('Security of definer?'),
          group: gettext('Options'), type: 'switch',
          disabled: 'isDisabled',
        },{
          id: 'proiswindow', label: gettext('Window?'),
          group: gettext('Options'), cell:'boolean', type: 'switch',
          disabled: 'isDisabled', visible: 'isVisible',
        },{
          id: 'proparallel', label: gettext('Parallel'), cell: 'string',
          control: 'node-ajax-options', type: 'text', group: gettext('Options'),
          deps: ['lanname'],
          options:[
            {'label': 'UNSAFE', 'value': 'u'},
            {'label': 'RESTRICTED', 'value': 'r'},
            {'label': 'SAFE', 'value': 's'},
          ], disabled: 'isDisabled', min_version: 90600,
          select2: {allowClear: false},
        },{
          id: 'procost', label: gettext('Estimated cost'), group: gettext('Options'),
          cell:'string', type: 'text', disabled: 'isDisabled', deps: ['lanname'],
        },{
          id: 'prorows', label: gettext('Estimated rows'), type: 'text',
          deps: ['proretset'], visible: 'isVisible', disabled: 'isDisabled',
          group: gettext('Options'),
        },{
          id: 'proleakproof', label: gettext('Leak proof?'),
          group: gettext('Options'), cell:'boolean', type: 'switch', min_version: 90200,
          disabled: 'isDisabled', deps: ['lanname'],
        },{
          id: 'proacl', label: gettext('Privileges'), type: 'text',
          mode: ['properties'], group: gettext('Security'),
        },{
          id: 'arguments', label: gettext('Arguments'), cell: 'string',
          group: gettext('Arguments'), type: 'collection', canAdd: function(m){
            return m.isNew();
          },
          canDelete: true, model: ArgumentModel, mode: ['create', 'edit'],
          columns: ['argtype', 'argmode', 'argname', 'argdefval'],
          disabled: 'isDisabled', canDeleteRow: function(m) {
            return m.isNew();
          },
        },{
          id: 'variables', label: gettext('Parameters'), type: 'collection',
          group: gettext('Parameters'), control: 'variable-collection',
          model: pgBrowser.Node.VariableModel,
          mode: ['edit', 'create'], canAdd: 'canVarAdd', canEdit: false,
          canDelete: true, disabled: 'isDisabled',
        }, pgBrowser.SecurityGroupSchema, {
          id: 'acl', label: gettext('Privileges'), editable: false,
          model: pgBrowser.Node.PrivilegeRoleModel.extend({
            privileges: ['X'],
          }), uniqueCol : ['grantee', 'grantor'], type: 'collection',
          group: 'security', mode: ['edit', 'create'], canAdd: true,
          canDelete: true, control: 'unique-col-collection',
          disabled: 'isDisabled',
        },{
          id: 'seclabels', label: gettext('Security Labels'), canAdd: true,
          model: pgBrowser.SecLabelModel, type: 'collection',
          min_version: 90100, group: 'security', mode: ['edit', 'create'],
          canEdit: false, canDelete: true, uniqueCol : ['provider'],
          disabled: 'isDisabled', control: 'unique-col-collection',
          visible: function() {
            return this.node && this.node.type != 'procedure';
          },
        },
        ],
        validate: function()
        {
          var err = {},
            errmsg,
            seclabels = this.get('seclabels');

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = errmsg || err['name'];
          }

          if (_.isUndefined(this.get('funcowner')) || String(this.get('funcowner')).replace(/^\s+|\s+$/g, '') == '') {
            err['funcowner'] = gettext('Owner cannot be empty.');
            errmsg = errmsg || err['funcowner'];
          }

          if (_.isUndefined(this.get('pronamespace')) || String(this.get('pronamespace')).replace(/^\s+|\s+$/g, '') == '') {
            err['pronamespace'] = gettext('Schema cannot be empty.');
            errmsg = errmsg || err['pronamespace'];
          }

          if (_.isUndefined(this.get('prorettypename')) || String(this.get('prorettypename')).replace(/^\s+|\s+$/g, '') == '') {
            err['prorettypename'] = gettext('Return type cannot be empty.');
            errmsg = errmsg || err['prorettypename'];
          }

          if (_.isUndefined(this.get('lanname')) || String(this.get('lanname')).replace(/^\s+|\s+$/g, '') == '') {
            err['lanname'] = gettext('Language cannot be empty.');
            errmsg = errmsg || err['lanname'];
          }

          if (String(this.get('lanname')) == 'c') {
            if (_.isUndefined(this.get('probin')) || String(this.get('probin'))
              .replace(/^\s+|\s+$/g, '') == '') {
              err['probin'] = gettext('Object File cannot be empty.');
              errmsg = errmsg || err['probin'];
            }

            if (_.isUndefined(this.get('prosrc_c')) || String(this.get('prosrc_c')).replace(/^\s+|\s+$/g, '') == '') {
              err['prosrc_c'] = gettext('Link Symbol cannot be empty.');
              errmsg = errmsg || err['prosrc_c'];
            }
          }
          else {
            if (_.isUndefined(this.get('prosrc')) || String(this.get('prosrc')).replace(/^\s+|\s+$/g, '') == '') {
              err['prosrc'] = gettext('Code cannot be empty.');
              errmsg = errmsg || err['prosrc'];
            }
          }

          if (seclabels) {
            var secLabelsErr;
            for (var i = 0; i < seclabels.models.length && !secLabelsErr; i++) {
              secLabelsErr = (seclabels.models[i]).validate.apply(seclabels.models[i]);
              if (secLabelsErr) {
                err['seclabels'] = secLabelsErr;
                errmsg = errmsg || secLabelsErr;
              }
            }
          }

          this.errorModel.clear().set(err);

          if (_.size(err)) {
            this.trigger('on-status', {msg: errmsg});
            return errmsg;
          }

          return null;
        },
        isVisible: function() {
          if (this.name == 'sysproc') { return false; }
          return true;
        },
        isDisabled: function(m) {
          if(this.node_info && 'catalog' in this.node_info) {
            return true;
          }
          switch(this.name){
          case 'proargs':
          case 'proargtypenames':
          case 'prorettypename':
          case 'proretset':
          case 'proiswindow':
            return !m.isNew();
          case 'prorows':
            if(m.get('proretset') == true) {
              return false;
            }
            return true;
          default:
            return false;
          }
        },
        canVarAdd: function() {
          if(this.node_info &&  'catalog' in this.node_info) {
            return false;
          }
          return true;
        },
      }),
    });

  }

  return pgBrowser.Nodes['function'];
});
