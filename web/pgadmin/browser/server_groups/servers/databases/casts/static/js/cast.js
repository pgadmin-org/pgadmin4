define('pgadmin.node.cast', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'underscore.string', 'sources/pgadmin', 'pgadmin.browser',
  'pgadmin.alertifyjs', 'pgadmin.backform', 'pgadmin.browser.collection',
], function(gettext, url_for, $, _, S, pgAdmin, pgBrowser, alertify, Backform) {
    // Extend the collection class for cast
  if (!pgBrowser.Nodes['coll-cast']) {
    pgAdmin.Browser.Nodes['coll-cast'] =
      pgAdmin.Browser.Collection.extend({
        node: 'cast',
        label: gettext('Casts'),
        type: 'coll-cast',
        columns: ['name', 'description'],
      });
  }

    // Extend the node class for cast
  if (!pgBrowser.Nodes['cast']) {
    pgAdmin.Browser.Nodes['cast'] = pgAdmin.Browser.Node.extend({
      parent_type: 'database',
      type: 'cast',
      sqlAlterHelp: 'sql-altercast.html',
      sqlCreateHelp: 'sql-createcast.html',
      dialogHelp: url_for('help.static', {'filename': 'cast_dialog.html'}),
      canDrop: true,
      canDropCascade: true,
      label: gettext('Cast'),
      hasSQL: true,
      hasDepends: true,
      Init: function() {

          // Avoid multiple registration of menus
        if (this.initialized)
          return;

        this.initialized = true;

          // Add context menus for cast
        pgBrowser.add_menus([{
          name: 'create_cast_on_database', node: 'database', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          icon: 'wcTabIcon icon-cast', data: {action: 'create'},
          enable: pgBrowser.Nodes['database'].is_conn_allow,
        },{
          name: 'create_cast_on_coll', node: 'coll-cast', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          icon: 'wcTabIcon icon-cast', data: {action: 'create'},
        },{
          name: 'create_cast', node: 'cast', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Cast...'),
          icon: 'wcTabIcon icon-cast', data: {action: 'create'},
        }]);

      },

        // Define the backform model for cast node
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,            // Name of the cast
          encoding: 'UTF8',
          srctyp: undefined,          // Source type
          trgtyp: undefined,          // Target type
          proname: undefined,         // Function
          castcontext: undefined,     // Context (IMPLICIT/EXPLICIT/ASSIGNMENT)
          syscast: undefined,         // Is this cast is system object? Yes/No
          description: undefined,      // Comment on the cast
        },

          // Define the schema for cast
        schema: [{
          id: 'name', label: gettext('Name'), cell: 'string',
          editable: false, type: 'text', disabled: true, cellHeaderClasses: 'width_percent_50',
        },{
          id: 'oid', label: gettext('OID'), cell: 'string',
          editable: false, type: 'text', disabled: true, mode: ['properties'],
        },{
          id: 'srctyp', label: gettext('Source type'), url: 'get_type',
          type: 'text', group: gettext('Definition'), disabled: function(m) {
            return !m.isNew();
          }, mode: ['create'],

          transform: function(rows) {
            _.each(rows, function(r) {
              r['image'] = 'icon-cast';
            });
            return rows;
          },

            /*
             * Control is extended to create cast name from source type and destination type
             * once their values are changed
             */
          control: Backform.NodeAjaxOptionsControl.extend({

            onChange: function() {
              Backform.NodeAjaxOptionsControl.prototype.onChange.apply(
                    this, arguments
                    );

                 /*
                  * On source type change, check if both source type and
                  * target type are set, if yes then fetch values from both
                  * controls and generate cast name
                  */
              var srctype = this.model.get('srctyp');
              var trgtype = this.model.get('trgtyp');
              if(srctype != undefined && srctype != '' &&
                    trgtype != undefined && trgtype != '')
                this.model.set('name', srctype+'->'+trgtype);
              else
                   this.model.unset('name');
            },
          }),
        },

          /*
           * Text control for viewing source type in properties and
           * edit mode only
           */
        {
          id: 'srctyp', label: gettext('Source type'), type: 'text',
          group: gettext('Definition'), disabled: true, mode:['properties','edit'],
        },{
          id: 'trgtyp', label: gettext('Target type'), url: 'get_type',
          type: 'text', group: gettext('Definition'), disabled: function(m) {
            return !m.isNew();
          }, mode: ['create'],
          transform: function(rows) {
            _.each(rows, function(r) {
              r['image'] = 'icon-cast';
            });
            return rows;
          },

            /*
             * Control is extended to create cast name from source type and destination type
             * once their values are changed
             */
          control: Backform.NodeAjaxOptionsControl.extend({

            onChange: function() {
              Backform.NodeAjaxOptionsControl.prototype.onChange.apply(
                 this, arguments
                 );

                 /*
                  * on target type change, check if both source type and
                  * target type are set, if yes then fetch values from both
                  * controls and generate cast name
                  */
              var srcType = this.model.get('srctyp');
              var trgtype = this.model.get('trgtyp');
              if(srcType != undefined && srcType != '' &&
                  trgtype != undefined && trgtype != '')
                this.model.set('name', srcType+'->'+trgtype);
              else
                 this.model.unset('name');
            },
          }),
        },
          /*
           * Text control for viewing target type in properties and
           * edit mode only
           */
        {
          id: 'trgtyp', label: gettext('Target type'), type: 'text',
          group: gettext('Definition'), disabled: true, mode:['properties','edit'],
        },

          /*
           * Proname field is dependent on source type and target type.
           * On source and target type changed event,
           * associated functions will be fetch using ajax call
           */
        {
          id: 'proname', label: gettext('Function'), deps:['srctyp', 'trgtyp'],
          type: 'text', disabled: function(m) { return !m.isNew(); },
          group: gettext('Definition'), mode: ['create'],
          control: 'node-ajax-options',
          options: function(control) {
            var srcTyp = control.model.get('srctyp');
            var trgtyp = control.model.get('trgtyp');
            var res = [];

            if(srcTyp != undefined && srcTyp != '' &&
                 trgtyp != undefined && trgtyp != '')
              {
              var node = control.field.get('schema_node'),
                _url = node.generate_url.apply(
                 node, [
                   null, 'get_functions', control.field.get('node_data'), false,
                   control.field.get('node_info'),
                 ]);
              $.ajax({
                type: 'POST',
                timeout: 30000,
                url: _url,
                cache: false,
                async: false,
                data: {'srctyp' : srcTyp, 'trgtyp' : trgtyp},
              })
               // On success return function list from server
              .done(function(result) {
                res = result.data;
                return res;
              })
               // On failure show error appropriate error message to user
              .fail(function(xhr, status, error) {
                alertify.pgRespErrorNotify(xhr, error);
              });
            }
            return res;
          },
        },
        /*
         * Text type control for viewing function name in properties and
         * edit mode only
         */
        {
          id: 'proname', label: gettext('Function'), type: 'text',
          group: gettext('Definition'), disabled: true, mode:['properties','edit'],
        },{
          id: 'castcontext', label: gettext('Context'),
          options:{'onText':'IMPLICIT','offText':'EXPLICIT'},
          editable: false, type: 'string', group: gettext('Definition'),
          mode:['create'],
          control: Backform.SwitchControl.extend({
            getValueFromDOM: function() {
              return this.$input.prop('checked') ? 'IMPLICIT' : 'EXPLICIT';
            },
          }),
        },
        /*
         * Text control for viewing context in properties and
         * edit mode
         */
        {
          id: 'castcontext', label: gettext('Context'), disabled: true,
          options:[{
            label: 'IMPLICIT', value: 'IMPLICIT',
          },{
            label: 'EXPLICIT', value: 'EXPLICIT',
          },{
            label: 'ASSIGNMENT', value: 'ASSIGNMENT',
          }], editable: false, type: 'select2', group: gettext('Definition'),
          mode:['properties', 'edit'],
        },{
          id: 'syscast', label: gettext('System cast?'),
          cell: 'switch', type: 'switch', mode: ['properties'], disabled: true,
          options: {
            'onText': gettext('Yes'), 'offText': gettext('No'),
            'onColor': 'success', 'offColor': 'primary',
            'size': 'small',
          },
        },{
          id: 'description', label: gettext('Comment'),
          type: 'multiline', cellHeaderClasses: 'width_percent_50',
        },
        ],

        /*
         * Triggers control specific error messages for source type and
         * target type if any one of them is not selected while creating
         * new cast
         */
        validate: function() {

          var srctype = this.get('srctyp'),
            trgtype = this.get('trgtyp'),
            msg;

          // validate source type control
          if (
            _.isUndefined(srctype) || _.isNull(srctype) ||
              String(srctype).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Source type must be selected.');
            this.errorModel.set('srctyp', msg);
            return msg;
          } else {
            this.errorModel.unset('srctyp');
          }

          // validate target type control
          if (
            _.isUndefined(trgtype) || _.isNull(trgtype) ||
              String(trgtype).replace(/^\s+|\s+$/g, '') == ''
          ) {
            msg = gettext('Target type must be selected.');
            this.errorModel.set('trgtyp', msg);
            return msg;
          } else {
            this.errorModel.unset('trgtyp');
          }
          this.trigger('on-status-clear');
          return null;
        },
      }),
    });

  }
  return pgBrowser.Nodes['coll-cast'];
});
