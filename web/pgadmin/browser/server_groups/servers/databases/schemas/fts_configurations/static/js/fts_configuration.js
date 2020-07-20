/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.node.fts_configuration', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'sources/pgadmin', 'pgadmin.browser', 'pgadmin.backform', 'pgadmin.backgrid',
  'pgadmin.node.schema.dir/child', 'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection',
], function(
  gettext, url_for, $, _, Backbone, pgAdmin, pgBrowser, Backform, Backgrid,
  schemaChild, schemaChildTreeNode
) {

  // Model for tokens control
  var TokenModel = pgAdmin.Browser.Node.Model.extend({
    idAttribute: 'token',
    defaults: {
      token: undefined,
      dictname: undefined,
    },
    keys: ['token'],
    // Define the schema for the token/dictionary list
    schema: [{
      id: 'token', label: gettext('Token'), type:'text', group: null,
      cellHeaderClasses:'width_percent_50',
      editable: false, cell: 'string', url: 'tokens',
    },{
      id: 'dictname', label: gettext('Dictionaries'), type: 'text', group:null,
      cellHeaderClasses:'width_percent_50', editable: true,
      cell:Backgrid.Extension.MultiSelectAjaxCell, url: 'dictionaries',
    }],
    // Validation for token and dictionary list
    validate: function() {
      // Clear any existing errors.
      var msg;
      this.errorModel.clear();
      var token = this.get('token');
      var dictionary = this.get('dictname');

      if (_.isNull(token) ||
              _.isUndefined(token) ||
              String(token).replace(/^\s+|\s+$/g, '') == '') {
        msg = gettext('Token cannot be empty.');
        this.errorModel.set('token',msg);
        return msg;
      }

      if (_.isNull(dictionary) ||
              _.isUndefined(dictionary) ||
              String(dictionary).replace(/^\s+|\s+$/g, '') == '') {
        msg = gettext('Dictionary name cannot be empty.');
        this.errorModel.set('dictname',msg);
        return msg;
      }
      return null;
    },
  });

  // Customized control for token control
  var TokenControl =  Backform.TokenControl =
    Backform.UniqueColCollectionControl.extend({

      initialize: function() {
        Backform.UniqueColCollectionControl.prototype.initialize.apply(
          this, arguments
        );

        var self = this,
          headerSchema = [{
            id: 'token', label:'', type:'text', url: 'tokens',
            node:'fts_configuration', canAdd: true, 'url_with_id': true,

            // Defining control for tokens dropdown control in header
            control: Backform.NodeAjaxOptionsControl.extend({
              formatter: Backform.NodeAjaxOptionsControl.prototype.formatter,
              initialize: function() {
                Backform.NodeAjaxOptionsControl.prototype.initialize.apply(
                  this,
                  arguments
                );
                var _self = this,
                  url = _self.field.get('url') || _self.defaults.url,
                  m = _self.model.top || _self.model;

                /* Fetch the tokens/dict list from '_self' node.
                 * Here '_self' refers to unique collection control where
                 * '_self' refers to nodeAjaxOptions control for dictionary
                 */
                if (url) {
                  var node = this.field.get('schema_node'),
                    node_info = this.field.get('node_info'),
                    full_url = node.generate_url.apply(
                      node, [
                        null, url, this.field.get('node_data'),
                        this.field.get('url_with_id') || false,
                        node_info,
                      ]),
                    cache_level = this.field.get('cache_level') || node.type,
                    cache_node = this.field.get('cache_node');

                  cache_node = (cache_node &&
                                    pgAdmin.Browser.Nodes[cache_node])
                               || node;

                  /*
                   * We needs to check, if we have already cached data
                   * for this url. If yes - use it, and do not bother about
                   * fetching it again.
                   */
                  var data = cache_node.cache(url, node_info, cache_level);

                  // Fetch token/dictionary list
                  if (this.field.get('version_compatible') &&
                    (_.isUndefined(data) || _.isNull(data))) {
                    m.trigger('pgadmin:view:fetching', m, _self.field);
                    $.ajax({
                      async: false,
                      url: full_url,
                    })
                      .done(function(res) {
                        /*
                     * We will cache this data for short period of time for
                     * avoiding same calls.
                     */
                        data = cache_node.cache(url,
                          node_info,
                          cache_level,
                          res.data
                        );
                      })
                      .fail(function() {
                        m.trigger('pgadmin:view:fetch:error', m, _self.field);
                      });
                    m.trigger('pgadmin:view:fetched', m, _self.field);
                  }

                  // It is feasible that the data may not have been fetched.
                  data = (data && data.data) || [];

                  /*
                   * Transform the data
                   */
                  var transform = (this.field.get('transform')
                                || _self.defaults.transform);
                  if (transform && _.isFunction(transform)) {
                    _self.field.set('options', transform.bind(_self, data));
                  } else {
                    _self.field.set('options', data);
                  }
                }
              },
            }),
            // Select2 control for adding new tokens
            select2: {
              allowClear: true, width: 'style',
              placeholder: gettext('Select token'),
            },
            first_empty: true,
            disabled: function() {
              return _.isUndefined(self.model.get('oid'));
            },
          }],
          headerDefaults = {token: null},
          // Grid columns backgrid
          gridCols = ['token', 'dictname'];

        // Creating model for header control which is used to add new tokens
        self.headerData = new (Backbone.Model.extend({
          defaults: headerDefaults,
          schema: headerSchema,
        }))({});

        // Creating view from header schema in tokens control
        var headerGroups = Backform.generateViewSchema(
            self.field.get('node_info'), self.headerData, 'create',
            self.field.get('schema_node'), self.field.get('node_data')
          ),
          fields = [];

        _.each(headerGroups, function(o) {
          fields = fields.concat(o.fields);
        });
        self.headerFields = new Backform.Fields(fields);

        // creating grid using grid columns
        self.gridSchema = Backform.generateGridColumnsFromModel(
          self.field.get('node_info'), self.field.get('model'),
          'edit', gridCols, self.field.get('schema_node')
        );

        // Providing behaviour control functions to header and grid control
        self.controls = [];
        self.listenTo(self.headerData, 'change', self.headerDataChanged);
        self.listenTo(self.headerData, 'select2', self.headerDataChanged);
        self.listenTo(self.collection, 'add', self.onAddorRemoveTokens);
        self.listenTo(self.collection, 'remove', self.onAddorRemoveTokens);
      },

      // Template for creating header view
      generateHeader: function(data) {
        var header = [
          '<div class="subnode-header-form">',
          ' <div class="container-fluid">',
          '  <div class="row">',
          '   <div class="col-3">',
          '    <label class="control-label"><%-token_label%></label>',
          '   </div>',
          '   <div class="col-6" header="token"></div>',
          '   <div class="col-2">',
          '     <button class="btn btn-sm-sq btn-primary-icon add fa fa-plus" <%=canAdd ? "" : "disabled=\'disabled\'"%> ><span class="sr-only">' + gettext('Add Token') + '</span></button>',
          '   </div>',
          '  </div>',
          ' </div>',
          '</div>'].join('\n');

        _.extend(data, {
          token_label: gettext('Tokens'),
        });

        var self = this,
          headerTmpl = _.template(header),
          $header = $(headerTmpl(data)),
          controls = this.controls;

        self.headerFields.each(function(field) {
          var control = new (field.get('control'))({
            field: field,
            model: self.headerData,
          });

          $header.find('div[header="' + field.get('name') + '"]').append(
            control.render().$el
          );

          control.$el.find('.control-label').remove();
          controls.push(control);
        });

        // We should not show add button in properties mode
        if (data.mode == 'properties') {
          $header.find('button.add').remove();
        }

        // Disable add button in token control in create mode
        if(data.mode == 'create') {
          $header.find('button.add').attr('disabled', true);
        }

        self.$header = $header;
        return $header;
      },

      // Providing event handler for add button in header
      events: _.extend(
        {}, Backform.UniqueColCollectionControl.prototype.events,
        {'click button.add': 'addTokens'}
      ),

      // Show token/dictionary grid
      showGridControl: function(data) {

        var self = this,
          titleTmpl = _.template('<div class=\'subnode-header\'></div>'),
          $gridBody = $('<div></div>', {
            class:'pgadmin-control-group backgrid form-group col-12 object subnode',
          }).append(
            titleTmpl({label: data.label})
          );

        $gridBody.append(self.generateHeader(data));

        var gridColumns = _.clone(this.gridSchema.columns);

        // Insert Delete Cell into Grid
        if (data.disabled == false && data.canDelete) {
          gridColumns.unshift({
            name: 'pg-backform-delete', label: '',
            cell: Backgrid.Extension.DeleteCell,
            editable: false, cell_priority: -1,
          });
        }

        if (self.grid) {
          self.grid.remove();
          self.grid = null;
        }
        // Initialize a new Grid instance
        var grid = self.grid = new Backgrid.Grid({
          columns: gridColumns,
          collection: self.collection,
          className: 'backgrid table-bordered',
        });
        self.$grid = grid.render().$el;

        $gridBody.append(self.$grid);

        // Find selected dictionaries in grid and show it all together
        setTimeout(function() {
          self.headerData.set({
            'token': self.$header.find(
              'div[header="token"] select'
            ).val(),
          }, {silent:true}
          );
        }, 10);

        // Render node grid
        return $gridBody;
      },

      // When user change the header control to add a new token
      headerDataChanged: function() {
        var self = this,
          data = this.headerData.toJSON(),
          inSelected = (_.isEmpty(data) || _.isUndefined(data));

        if (!self.$header) {
          return;
        }

        self.$header.find('button.add').prop('disabled', inSelected);
      },

      // Get called when user click on add button header
      addTokens: function(ev) {
        ev.preventDefault();
        var self = this,
          token = self.headerData.get('token');

        if (!token || token == '') {
          return false;
        }

        var coll = self.model.get(self.field.get('name')),
          m = new (self.field.get('model'))(
            self.headerData.toJSON(), {
              silent: true, top: self.model.top,
              collection: coll, handler: coll,
            }),
          checkVars = ['token'],
          idx = -1;

        // Find if token exists in grid
        self.collection.each(function(local_model) {
          _.each(checkVars, function(v) {
            var val = local_model.get(v);
            if(val == token) {
              idx = coll.indexOf(local_model);
            }
          });
        });



        // remove 'm' if duplicate value found.
        if (idx == -1) {
          coll.add(m);
          idx = coll.indexOf(m);
        }
        self.$grid.find('.new').removeClass('new');
        var newRow = self.grid.body.rows[idx].$el;
        newRow.addClass('new');
        //$(newRow).pgMakeVisible('table-bordered');
        $(newRow).pgMakeVisible('backform-tab');


        return false;
      },

      // When user delete token/dictionary entry from grid
      onAddorRemoveTokens: function() {
        var self = this;

        /*
       * Wait for collection to be updated before checking for the button to
       * be enabled, or not.
       */
        setTimeout(function() {
          self.collection.trigger('pgadmin:tokens:updated', self.collection);
          self.headerDataChanged();
        }, 10);
      },

      // When control is about to destroy
      remove: function() {
      /*
       * Stop listening the events registered by this control.
       */
        this.stopListening(this.headerData, 'change', this.headerDataChanged);
        this.listenTo(this.headerData, 'select2', this.headerDataChanged);
        this.listenTo(this.collection, 'remove', this.onAddorRemoveTokens);

        // Remove header controls.
        _.each(this.controls, function(control) {
          control.remove();
        });
        TokenControl.__super__.remove.apply(this, arguments);

        // Remove the header model
        delete (this.headerData);

      },
    });


  // Extend the collection class for FTS Configuration
  if (!pgBrowser.Nodes['coll-fts_configuration']) {
    pgAdmin.Browser.Nodes['coll-fts_configuration'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_configuration',
        label: gettext('FTS Configurations'),
        type: 'coll-fts_configuration',
        columns: ['name', 'description'],
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Extend the node class for FTS Configuration
  if (!pgBrowser.Nodes['fts_configuration']) {
    pgAdmin.Browser.Nodes['fts_configuration'] = schemaChild.SchemaChildNode.extend({
      type: 'fts_configuration',
      sqlAlterHelp: 'sql-altertsconfig.html',
      sqlCreateHelp: 'sql-createtsconfig.html',
      dialogHelp: url_for('help.static', {'filename': 'fts_configuration_dialog.html'}),
      label: gettext('FTS Configuration'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

        // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

        // Add context menus for FTS Configuration
        pgBrowser.add_menus([{
          name: 'create_fts_configuration_on_schema', node: 'schema',
          module: this, category: 'create', priority: 4,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          label: gettext('FTS Configuration...'),
          icon: 'wcTabIcon icon-fts_configuration', data: {action: 'create'},
          enable: 'canCreate',
        },{
          name: 'create_fts_configuration_on_coll', module: this, priority: 4,
          node: 'coll-fts_configuration', applies: ['object', 'context'],
          callback: 'show_obj_properties', category: 'create',
          label: gettext('FTS Configuration...'), data: {action: 'create'},
          icon: 'wcTabIcon icon-fts_configuration', enable: 'canCreate',
        },{
          name: 'create_fts_configuration', node: 'fts_configuration',
          module: this, applies: ['object', 'context'],
          callback: 'show_obj_properties', category: 'create', priority: 4,
          label: gettext('FTS Configuration...'), data: {action: 'create'},
          icon: 'wcTabIcon icon-fts_configuration', enable: 'canCreate',
        }]);
      },

      // Defining model for FTS Configuration node
      model: pgAdmin.Browser.Node.Model.extend({
        idAttribute: 'oid',
        defaults: {
          name: undefined,        // FTS Configuration name
          owner: undefined,       // FTS Configuration owner
          is_sys_obj: undefined,  // Is system object
          description: undefined, // Comment on FTS Configuration
          schema: undefined,      // Schema name FTS Configuration belongs to
          prsname: undefined,    // FTS parser list for FTS Configuration node
          copy_config: undefined, // FTS configuration list to copy from
          tokens: undefined,      // token/dictionary pair list for node
        },
        initialize: function(attrs, opts) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);

          if (isNew) {
            var user = pgBrowser.serverInfo[opts.node_info.server._id].user;
            this.set({
              'owner': user.name,
              'schema': opts.node_info.schema._id,
            }, {silent: true});
          }
        },
        // Defining schema for FTS Configuration
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          type: 'text', cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          editable: false, type: 'text', mode:['properties'],
        },{
          id: 'owner', label: gettext('Owner'), cell: 'string',
          type: 'text', mode: ['properties', 'edit','create'], node: 'role',
          control: Backform.NodeListByNameControl, select2: { allowClear: false },
        },{
          id: 'schema', label: gettext('Schema'), cell: 'string',
          type: 'text', mode: ['create','edit'], node: 'schema',
          control: 'node-list-by-id', cache_node: 'database',
          cache_level: 'database',
        },{
          id: 'is_sys_obj', label: gettext('System FTS configuration?'),
          cell:'boolean', type: 'switch', mode: ['properties'],
        },{
          id: 'description', label: gettext('Comment'), cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50',
        },{
          id: 'prsname', label: gettext('Parser'),type: 'text',
          url: 'parsers', first_empty: true,
          group: gettext('Definition'), control: 'node-ajax-options',
          deps: ['copy_config'],
          //disable parser when user select copy_config manually and vica-versa
          disabled: function(m) {
            var copy_config = m.get('copy_config');
            return (_.isNull(copy_config) ||
                    _.isUndefined(copy_config) ||
                    copy_config === '') ? false : true;
          },
          readonly: function(m) {return !m.isNew();},
        },{
          id: 'copy_config', label: gettext('Copy config'),type: 'text',
          mode: ['create'], group: gettext('Definition'),
          control: 'node-ajax-options', url: 'copyConfig', deps: ['prsname'],

          //disable copy_config when user select parser manually and vica-versa
          disabled: function(m) {
            var parser = m.get('prsname');
            return (_.isNull(parser) ||
                    _.isUndefined(parser) ||
                    parser === '') ? false : true;
          },
          readonly: function(m) {return !m.isNew();},
        },{
          id: 'tokens', label: gettext('Tokens'), type: 'collection',
          group: gettext('Tokens'), control: TokenControl,
          model: TokenModel, columns: ['token', 'dictionary'],
          uniqueCol : ['token'], mode: ['create','edit'],
          canAdd: true, canEdit: false, canDelete: true,
        }],

        /*
         * Triggers control specific error messages for name,
         * copy_config/parser and schema, if any one of them is not specified
         * while creating new fts configuration
         */
        validate: function() {
          var msg;
          var name = this.get('name');
          var parser = this.get('prsname');
          var copy_config_or_parser = !(parser === '' ||
                                        _.isUndefined(parser) ||
                                        _.isNull(parser)) ?
            this.get('prsname') : this.get('copy_config');
          var schema = this.get('schema');

          // Clear the existing error model
          this.errorModel.clear();
          this.trigger('on-status-clear');

          // Validate the name
          if (_.isUndefined(name) ||
              _.isNull(name) ||
              String(name).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Name must be specified.');
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate parser or copy_config
          else if (_.isUndefined(copy_config_or_parser) ||
                   _.isNull(copy_config_or_parser) ||
                   String(copy_config_or_parser).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Select parser or configuration to copy.');
            this.errorModel.set('parser', msg);
            return msg;
          }

          // Validate schema
          else if (_.isUndefined(schema) ||
                   _.isNull(schema) ||
                   String(schema).replace(/^\s+|\s+$/g, '') == '') {
            msg = gettext('Schema must be selected.');
            this.errorModel.set('schema', msg);
            return msg;
          }

          return null;
        },
      }),
    });
  }

  return pgBrowser.Nodes['coll-fts_configuration'];
});
