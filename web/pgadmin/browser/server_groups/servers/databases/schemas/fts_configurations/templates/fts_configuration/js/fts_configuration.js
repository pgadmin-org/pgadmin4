define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin',
         'pgadmin.browser', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, alertify) {


// Model for tokens control
  var TokenModel = pgAdmin.Browser.Node.Model.extend({
        defaults: {
          token: undefined,
          dictname: undefined
        },
        keys: ['token'],
        // Define the schema for the token/dictionary list
        schema: [{
          id: 'token', label:'Token', type:'text', group: null,
          cellHeaderClasses:'width_percent_50', editable: true,
          editable: false, cell: 'string', url: 'tokens'
        },{
          id: 'dictname', label: 'Dictionaries', type: 'text', group:null,
          cellHeaderClasses:'width_percent_50', editable: true,
          cell:Backgrid.Extension.MultiSelectAjaxCell, url: 'dictionaries'
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
            msg = '{{ _('Token can not be empty!') }}';
            this.errorModel.set('token',msg);
            return msg;
          }

          if (_.isNull(dictionary) ||
              _.isUndefined(dictionary) ||
              String(dictionary).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Dictionary name can not be empty!') }}';
            this.errorModel.set('dictname',msg);
            return msg;
          }
          return null;
        }
  });

// Customized control for token control
  var TokenControl =  Backform.TokenControl =
    Backform.UniqueColCollectionControl.extend({

    initialize: function(opts) {
      Backform.UniqueColCollectionControl.prototype.initialize.apply(
        this, arguments
      );

      var self = that = this,
          node = 'fts_configuration',
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
                var self = this,
                  url = self.field.get('url') || self.defaults.url,
                  m = self.model.top || self.model;

                /* Fetch the tokens/dict list from 'that' node.
                 * Here 'that' refers to unique collection control where
                 * 'self' refers to nodeAjaxOptions control for dictionary
                 */
                var cfgid = that.model.get('oid');
                if (url) {
                  var node = this.field.get('schema_node'),
                    node_info = this.field.get('node_info'),
                    full_url = node.generate_url.apply(
                      node, [
                        null, url, this.field.get('node_data'),
                        this.field.get('url_with_id') || false,
                        node_info
                      ]),
                    cache_level = this.field.get('cache_level') || node.type,
                    cache_node = this.field.get('cache_node');

                  cache_node = (cache_node &&
                                    pgAdmin.Browser.Nodes['cache_node'])
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
                    m.trigger('pgadmin:view:fetching', m, self.field);
                    $.ajax({
                      async: false,
                      url: full_url,
                      success: function(res) {
                      /*
                       * We will cache this data for short period of time for
                       * avoiding same calls.
                       */
                        data = cache_node.cache(url,
                                 node_info,
                                 cache_level,
                                 res.data
                               );
                      },
                      error: function() {
                        m.trigger('pgadmin:view:fetch:error', m, self.field);
                      }
                    });
                    m.trigger('pgadmin:view:fetched', m, self.field);
                  }

                  // It is feasible that the data may not have been fetched.
                  data = (data && data.data) || [];

                  /*
                   * Transform the data
                   */
                  transform = (this.field.get('transform')
                                || self.defaults.transform);
                  if (transform && _.isFunction(transform)) {
                    self.field.set('options', transform.bind(self, data));
                  } else {
                    self.field.set('options', data);
                  }
                }
              }
            }),
            // Select2 control for adding new tokens
            select2: {
              allowClear: true, width: 'style',
              placeholder: '{{ _('Select token') }}'
            },
            first_empty: true,
            disabled: function(m) {
              return _.isUndefined(self.model.get('oid'));
            }
          }],
          headerDefaults = {token: null},
          // Grid columns backgrid
          gridCols = ['token', 'dictname'];

      // Creating model for header control which is used to add new tokens
      self.headerData = new (Backbone.Model.extend({
        defaults: headerDefaults,
        schema: headerSchema
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
      self.listenTo(self.headerData, "change", self.headerDataChanged);
      self.listenTo(self.headerData, "select2", self.headerDataChanged);
      self.listenTo(self.collection, "add", self.onAddorRemoveTokens);
      self.listenTo(self.collection, "remove", self.onAddorRemoveTokens);
    },

    // Template for creating header view
    generateHeader: function(data) {
      var header = [
        '<div class="subnode-header-form">',
        ' <div class="container-fluid">',
        '  <div class="row">',
        '   <div class="col-xs-3">',
        '    <label class="control-label"><%-token_label%></label>',
        '   </div>',
        '   <div class="col-xs-6" header="token"></div>',
        '   <div class="col-xs-2">',
        '     <button class="btn-sm btn-default add fa fa-plus" <%=canAdd ? "" : "disabled=\'disabled\'"%> ></button>',
        '   </div>',
        '  </div>',
        ' </div>',
        '</div>',].join("\n")

      _.extend(data, {
        token_label: '{{ _('Tokens') }}'
      });

      var self = this,
          headerTmpl = _.template(header),
          $header = $(headerTmpl(data)),
          controls = this.controls;

      self.headerFields.each(function(field) {
        var control = new (field.get("control"))({
          field: field,
          model: self.headerData
        });

        $header.find('div[header="' + field.get('name') + '"]').append(
          control.render().$el
        );

        control.$el.find('.control-label').remove();
        controls.push(control);
      });

      // We should not show add button in properties mode
      if (data.mode == 'properties') {
        $header.find("button.add").remove();
      }

      // Disable add button in token control in create mode
      if(data.mode == 'create') {
        $header.find("button.add").attr('disabled', true);
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
          titleTmpl = _.template("<div class='subnode-header'></div>"),
          $gridBody = $("<div></div>", {
            class:'pgadmin-control-group backgrid form-group col-xs-12 object subnode'
          }).append(
               titleTmpl({label: data.label})
          );

      $gridBody.append(self.generateHeader(data));

      var gridColumns = _.clone(this.gridSchema.columns);

      // Insert Delete Cell into Grid
      if (data.disabled == false && data.canDelete) {
          gridColumns.unshift({
            name: "pg-backform-delete", label: "",
            cell: Backgrid.Extension.DeleteCell,
            editable: false, cell_priority: -1
          });
      }

      if (self.grid) {
        self.grid.remove();
        self.grid.null;
      }
      // Initialize a new Grid instance
      var grid = self.grid = new Backgrid.Grid({
        columns: gridColumns,
        collection: self.collection,
        className: "backgrid table-bordered"
      });
      self.$grid = grid.render().$el;

      $gridBody.append(self.$grid);

      // Find selected dictionaries in grid and show it all together
      setTimeout(function() {
        self.headerData.set({
          'token': self.$header.find(
            'div[header="token"] select'
            ).val()
            }, {silent:true}
          );
      }, 10);

      // Render node grid
      return $gridBody;
    },

    // When user change the header control to add a new token
    headerDataChanged: function() {
      var self = this, val,
          data = this.headerData.toJSON(),
          inSelected = (_.isEmpty(data) || _.isUndefined(data)),
          checkVars = ['token'];

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
                  collection: coll, handler: coll
                }),
          checkVars = ['token'],
          idx = -1;

      // Find if token exists in grid
      self.collection.each(function(m) {
        _.each(checkVars, function(v) {
          val = m.get(v);
          if(val == token) {
            idx = coll.indexOf(m);
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
      newRow.addClass("new");
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
      this.stopListening(this.headerData, "change", this.headerDataChanged);
      this.listenTo(this.headerData, "select2", this.headerDataChanged);
      this.listenTo(this.collection, "remove", this.onAddorRemoveTokens);

      // Remove header controls.
      _.each(this.controls, function(control) {
        control.remove();
      });
      TokenControl.__super__.remove.apply(this, arguments);

      // Remove the header model
      delete (this.headerData);

    }
  });


  // Extend the collection class for FTS Configuration
  if (!pgBrowser.Nodes['coll-fts_configuration']) {
    var fts_configurations = pgAdmin.Browser.Nodes['coll-fts_configuration'] =
      pgAdmin.Browser.Collection.extend({
        node: 'fts_configuration',
        label: '{{ _('FTS Configurations') }}',
        type: 'coll-fts_configuration',
        columns: ['name', 'description']
      });
  };

  // Extend the node class for FTS Configuration
  if (!pgBrowser.Nodes['fts_configuration']) {
    pgAdmin.Browser.Nodes['fts_configuration'] = pgAdmin.Browser.Node.extend({
      parent_type: ['schema', 'catalog'],
      type: 'fts_configuration',
      sqlAlterHelp: 'sql-altertsconfig.html',
      sqlCreateHelp: 'sql-createtsconfig.html',
      dialogHelp: '{{ url_for('help.static', filename='fts_configuration_dialog.html') }}',
      canDrop: true,
      canDropCascade: true,
      label: '{{ _('FTS Configuration') }}',
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
          label: '{{_('FTS Configuration...')}}',
          icon: 'wcTabIcon icon-fts_configuration', data: {action: 'create'},
          enable: 'canCreate'
          },{
          name: 'create_fts_configuration_on_coll', module: this, priority: 4,
          node: 'coll-fts_configuration', applies: ['object', 'context'],
          callback: 'show_obj_properties', category: 'create',
          label: '{{ _('FTS Configuration...') }}', data: {action: 'create'},
          icon: 'wcTabIcon icon-fts_configuration', enable: 'canCreate'
          },{
          name: 'create_fts_configuration', node: 'fts_configuration',
          module: this, applies: ['object', 'context'],
          callback: 'show_obj_properties', category: 'create', priority: 4,
          label: '{{_('FTS Configuration...')}}', data: {action: 'create'},
          icon: 'wcTabIcon icon-fts_configuration', enable: 'canCreate'
          }]);
      },

      // Defining model for FTS Configuration node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,        // FTS Configuration name
          owner: undefined,       // FTS Configuration owner
          description: undefined, // Comment on FTS Configuration
          schema: undefined,      // Schema name FTS Configuration belongs to
          prsname: undefined,    // FTS parser list for FTS Configuration node
          copy_config: undefined, // FTS configuration list to copy from
          tokens: undefined      // token/dictionary pair list for node
        },
        initialize: function(attrs, opts) {
          var isNew = (_.size(attrs) === 0);
          pgAdmin.Browser.Node.Model.prototype.initialize.apply(this, arguments);

          if (isNew) {
            var user = pgBrowser.serverInfo[opts.node_info.server._id].user;
            this.set({
              'owner': user.name,
              'schema': opts.node_info.schema._id
            }, {silent: true});
          }
        },
        // Defining schema for FTS Configuration
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', cellHeaderClasses: 'width_percent_50'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          editable: false, type: 'text', disabled: true, mode:['properties']
        },{
          id: 'owner', label:'{{ _('Owner') }}', cell: 'string',
          type: 'text', mode: ['properties', 'edit','create'], node: 'role',
          control: Backform.NodeListByNameControl, select2: { allowClear: false }
        },{
          id: 'schema', label: '{{ _('Schema')}}', cell: 'string',
          type: 'text', mode: ['create','edit'], node: 'schema',
          control: 'node-list-by-id', cache_node: 'database',
          cache_level: 'database'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', cellHeaderClasses: 'width_percent_50'
        },{
          id: 'prsname', label: '{{ _('Parser')}}',type: 'text',
          url: 'parsers', first_empty: true,
          group: '{{ _('Definition') }}', control: 'node-ajax-options',
          deps: ['copy_config'],
          //disable parser when user select copy_config manually and vica-versa
          disabled: function(m) {
            var copy_config = m.get('copy_config');
            return m.isNew() &&
                    (_.isNull(copy_config) ||
                    _.isUndefined(copy_config) ||
                    copy_config === '') ? false : true;
          }
        },{
          id: 'copy_config', label: '{{ _('Copy Config')}}',type: 'text',
          mode: ['create'], group: '{{ _('Definition') }}',
          control: 'node-ajax-options', url: 'copyConfig', deps: ['prsname'],

          //disable copy_config when user select parser manually and vica-versa
          disabled: function(m) {
            var parser = m.get('prsname');
            return m.isNew() &&
                    (_.isNull(parser) ||
                    _.isUndefined(parser) ||
                    parser === '') ? false : true;
          }
        },{
          id: 'tokens', label: '{{ _('Tokens') }}', type: 'collection',
          group: '{{ _('Tokens') }}', control: TokenControl,
          model: TokenModel, columns: ['token', 'dictionary'],
          uniqueCol : ['token'], mode: ['create','edit'],
          canAdd: true, canEdit: false, canDelete: true
         }],

        /*
         * Triggers control specific error messages for name,
         * copy_config/parser and schema, if any one of them is not specified
         * while creating new fts configuration
         */
        validate: function(keys){
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
            msg = '{{ _('Name must be specified!') }}';
            this.errorModel.set('name', msg);
            return msg;
          }

          // Validate parser or copy_config
          else if (_.isUndefined(copy_config_or_parser) ||
                   _.isNull(copy_config_or_parser) ||
                   String(copy_config_or_parser).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Select parser or configuration to copy!') }}';
            this.errorModel.set('parser', msg);
            return msg;
          }

          // Validate schema
          else if (_.isUndefined(schema) ||
                   _.isNull(schema) ||
                   String(schema).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Schema must be selected!') }}';
            this.errorModel.set('schema', msg);
            return msg;
          }

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
          // If it is schema then allow user to create fts configuration
          if (_.indexOf(['schema'], d._type) > -1)
            return true;

          if ('coll-fts_configuration' == d._type) {
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

return pgBrowser.Nodes['coll-fts_configuration'];
});
