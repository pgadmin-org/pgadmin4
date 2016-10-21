define(
  ['jquery', 'underscore', 'underscore.string', 'alertify', 'pgadmin',
  'pgadmin.browser', 'backbone', 'backgrid', 'backform',
  'pgadmin.backform', 'pgadmin.backgrid', 'pgadmin.browser.node.ui'],
  function($, _, S, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid, Backform) {

  pgAdmin = pgAdmin || window.pgAdmin || {};

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  // Return back, this has been called more than once
  if (pgAdmin.Tools.maintenance)
    return pgAdmin.Tools.maintenance;

  var CustomSwitchControl = Backform.CustomSwitchControl = Backform.SwitchControl.extend({
      template: _.template([
        '<label class="<%=Backform.controlLabelClassName%> custom_switch_label_class"><%=label%></label>',
        '<div class="<%=Backform.controlsClassName%> custom_switch_control_class">',
        '  <div class="checkbox">',
        '    <label>',
        '      <input type="checkbox" class="<%=extraClasses.join(\' \')%>" name="<%=name%>" <%=value ? "checked=\'checked\'" : ""%> <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
        '    </label>',
        '  </div>',
        '</div>',
        '<% if (helpMessage && helpMessage.length) { %>',
        '  <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
        '<% } %>'
      ].join("\n")),
      className: 'pgadmin-control-group form-group col-xs-6'
    });

  // Main model for Maintenance functionality
  var MaintenanceModel = Backbone.Model.extend({
    defaults: {
      op: 'VACUUM',
      vacuum_full: false,
      vacuum_freeze: false,
      vacuum_analyze: false,
      verbose: true
    },
    initialize: function() {
        var node_info = arguments[1]['node_info'];
        // If node is Unique or Primary key then set op to reindex
        if ('primary_key' in node_info || 'unique_constraint' in node_info
                                       || 'index' in node_info) {
          this.set('op', 'REINDEX');
          this.set('verbose', false);
        }
    },
    schema: [
      {
        id: 'op', label:'{{ _('Maintenance operation') }}', cell: 'string',
        type: 'text', group: '{{ _('Options') }}',
        options:[
          {'label': "VACUUM", 'value': "VACUUM"},
          {'label': "ANALYZE", 'value': "ANALYZE"},
          {'label': "REINDEX", 'value': "REINDEX"},
          {'label': "CLUSTER", 'value': "CLUSTER"},
        ],
        control: Backform.RadioControl.extend({
          template: _.template([
            '<label class="control-label col-sm-4 col-xs-12"><%=label%></label>',
            '<div class="pgadmin-controls col-xs-12 col-sm-8 btn-group pg-maintenance-op" data-toggle="buttons">',
            ' <% for (var i=0; i < options.length; i++) { %>',
            ' <% var option = options[i]; %>',
            ' <label class="btn btn-primary<% if (i == 0) { %> active<%}%>">',
            '  <input type="radio" name="op" id="op" autocomplete="off" value=<%-formatter.fromRaw(option.value)%><% if (i == 0) { %> selected<%}%> > <%-option.label%>',
            ' </label>',
            ' <% } %>',
            '</div>'
          ].join("\n"))
        }),
        select2: {
          allowClear: false,
          width: "100%",
          placeholder: '{{ _('Select from list...') }}'
        },
      },
      {
        type: 'nested', control: 'fieldset', label:'{{ _('Vacuum') }}', group: '{{ _('Options') }}',
        schema:[{
          id: 'vacuum_full', disabled: false, group: '{{ _('Vacuum') }}', disabled: 'isDisabled',
          control: Backform.CustomSwitchControl, label: '{{ _('FULL') }}', deps: ['op']
        },{
          id: 'vacuum_freeze', disabled: false, deps: ['op'], disabled: 'isDisabled',
          control: Backform.CustomSwitchControl, label: '{{ _('FREEZE') }}', group: '{{ _('Vacuum') }}'
        },{
          id: 'vacuum_analyze', disabled: false, deps: ['op'], disabled: 'isDisabled',
          control: Backform.CustomSwitchControl, label: '{{ _('ANALYZE') }}', group: '{{ _('Vacuum') }}'
        }]
      },
      {
        id: 'verbose', disabled: false, group: '{{ _('Options') }}', deps: ['op'],
        control: Backform.CustomSwitchControl, label: '{{ _('Verbose Messages') }}', disabled: 'isDisabled'
      }
    ],

    // Enable/Disable the items based on the user maintenance operation selection
    isDisabled: function(m) {
      var name = this.name,
        node_info = this.node_info;
      switch(name) {
        case 'vacuum_full':
        case 'vacuum_freeze':
        case 'vacuum_analyze':
          if (m.get('op') != 'VACUUM') {
            return true;
          }
          else {
            return false;
          }
          break;
        case 'verbose':
          if ('primary_key' in node_info || 'unique_constraint' in node_info ||
                'index' in node_info ) {
            if (m.get('op') == 'REINDEX') {
              setTimeout(function() { m.set('verbose', false); }, 10);
              return true;
            }
          }
          if (m.get('op') == 'REINDEX') {
            return true;
          }
          else {
            return false;
          }
          break;
        default:
          return false;
      }
      return false;
    }
  });

  pgTools.maintenance = {
      init: function() {

        // We do not want to initialize the module multiple times.
        if (this.initialized)
            return;

        this.initialized = true;

        var maintenance_supported_nodes = [
              'database', 'table', 'primary_key',
              'unique_constraint', 'index'
            ];

        /**
         Enable/disable Maintenance menu in tools based on node selected.
         Maintenance menu will be enabled only when user select table and database node.
        */
        menu_enabled = function(itemData, item, data) {
         var t = pgBrowser.tree, i = item, d = itemData;
         var parent_item = t.hasParent(i) ? t.parent(i): null,
             parent_data = parent_item ? t.itemData(parent_item) : null;
           if(!_.isUndefined(d) && !_.isNull(d) && !_.isNull(parent_data))
             return (
               (_.indexOf(maintenance_supported_nodes, d._type) !== -1 &&
               parent_data._type != 'catalog') ? true: false
             );
           else
             return false;
        };

        var menus = [{
          name: 'maintenance', module: this,
          applies: ['tools'], callback: 'callback_maintenace',
          priority: 10, label: '{{ _('Maintenance...') }}',
          icon: 'fa fa-wrench', enable: menu_enabled
        }];

        // Add supported menus into the menus list
        for (var idx = 0; idx < maintenance_supported_nodes.length; idx++) {
          menus.push({
            name: 'maintenance_context_' + maintenance_supported_nodes[idx],
            node: maintenance_supported_nodes[idx], module: this,
            applies: ['context'], callback: 'callback_maintenace',
            priority: 10, label: '{{_("Maintenance...") }}',
            icon: 'fa fa-wrench', enable: menu_enabled
          });
        }
        pgBrowser.add_menus(menus);
      },

      /*
        Open the dialog for the maintenance functionality
      */
      callback_maintenace: function(args, item) {
        var i = item || pgBrowser.tree.selected(),
          server_data = null;

        while (i) {
          var node_data = pgBrowser.tree.itemData(i);
          if (node_data._type == 'server') {
            server_data = node_data;
            break;
          }

          if (pgBrowser.tree.hasParent(i)) {
            i = $(pgBrowser.tree.parent(i));
          } else {
            Alertify.alert("{{ _("Please select server or child node from tree.") }}");
            break;
          }
        }

        if (!server_data) {
          return;
        }

        var module = 'paths',
          preference_name = 'pg_bin_dir',
          msg = '{{ _('Please configure the PostgreSQL Binary Path in the Preferences dialog.') }}';

        if ((server_data.type && server_data.type == 'ppas') ||
            server_data.server_type == 'ppas') {
          preference_name = 'ppas_bin_dir';
          msg = '{{ _('Please configure the EDB Advanced Server Binary Path in the Preferences dialog.') }}';
        }

        var preference = pgBrowser.get_preference(module, preference_name);

        if(preference) {
          if (!preference.value) {
            Alertify.alert('{{ _("Configuration required") }}', msg);
            return;
          }
        } else {
          Alertify.alert(S('{{ _('Failed to load preference %s of module %s') }}').sprintf(preference_name, module).value());
          return;
        }

        var self = this,
          input = args || {},
          t = pgBrowser.tree,
          i = item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined,
          node = d && pgBrowser.Nodes[d._type];

        if (!d)
          return;

        var objName = d.label;
        var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

        if (!Alertify.MaintenanceDialog) {
          Alertify.dialog('MaintenanceDialog', function factory() {

            return {
              main: function(title) {
                this.set('title', title);
              },
              setup: function() {
                return {
                  buttons:[{
                    text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-info',
                    attrs:{name:'object_help', type:'button', url: 'maintenance.html', label: '{{ _('Maintenance') }}'}
                  },{
                    text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-question',
                    attrs:{name:'dialog_help', type:'button', label: '{{ _('Maintenance') }}',
                    url: '{{ url_for('help.static', filename='maintenance_dialog.html') }}'}
                  },{
                    text: "{{ _('OK') }}", key: 27, className: "btn btn-primary fa fa-lg fa-save pg-alertify-button"
                  },{
                    text: "{{ _('Cancel') }}", key: 27, className: "btn btn-danger fa fa-lg fa-times pg-alertify-button"
                  }],
                  options: { modal: 0, pinnable: false}
                };
              },
              // Callback functions when click on the buttons of the Alertify dialogs
              callback: function(e) {
                var i = pgBrowser.tree.selected(),
                  d = i && i.length == 1 ? pgBrowser.tree.itemData(i) : undefined,
                  node = d && pgBrowser.Nodes[d._type];

                if (e.button.element.name == "dialog_help" || e.button.element.name == "object_help") {
                  e.cancel = true;
                  pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                    node, i, e.button.element.getAttribute('label'));
                  return;
                }

                if (e.button.text === "{{ _('OK') }}") {

                  var schema = undefined,
                    table = undefined,
                    primary_key = undefined,
                    unique_constraint = undefined,
                    index = undefined;

                  if (!d)
                    return;

                  var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

                  if (treeInfo.schema != undefined) {
                    schema = treeInfo.schema._label;
                  }
                  if (treeInfo.table != undefined) {
                    table = treeInfo.table._label;
                  }

                  if (treeInfo.primary_key != undefined) {
                    primary_key = treeInfo.primary_key._label;
                  } else if (treeInfo.unique_constraint != undefined) {
                    unique_constraint = treeInfo.unique_constraint._label;
                  } else if (treeInfo.index != undefined) {
                    index = treeInfo.index._label;
                  }

                  this.view.model.set({'database': treeInfo.database._label,
                                      'schema': schema,
                                      'table': table,
                                      'primary_key': primary_key,
                                      'unique_constraint': unique_constraint,
                                      'index': index})

                    baseUrl = "{{ url_for('maintenance.index') }}" +
                    "create_job/" + treeInfo.server._id + "/" + treeInfo.database._id,
                    args =  this.view.model.toJSON();

                  $.ajax({
                    url: baseUrl,
                    method: 'POST',
                    data:{ 'data': JSON.stringify(args) },
                    success: function(res) {
                      if (res.data && res.data.status) {
                        //Do nothing as we are creating the job and exiting from the main dialog
                        Alertify.success(res.data.info);
                        pgBrowser.Events.trigger('pgadmin-bgprocess:created', self);
                      }
                      else {
                        Alertify.error(res.data.errmsg);
                      }
                    },
                    error: function(e) {
                      Alertify.alert(
                        "{{ _('Maintenance job creation failed.') }}"
                      );
                    }
                  });
                }
              },
              build: function() {
                Alertify.pgDialogBuild.apply(this)
              },
              hooks: {
                onclose: function() {
                  if (this.view) {
                    this.view.remove({data: true, internal: true, silent: true});
                  }
                }
              },
              prepare: function() {
                // Main maintenance tool dialog container
                var $container = $("<div class='maintenance_dlg'></div>");

                var t = pgBrowser.tree,
                  i = t.selected(),
                  d = i && i.length == 1 ? t.itemData(i) : undefined,
                  node = d && pgBrowser.Nodes[d._type];

                if (!d)
                  return;

                var treeInfo = node.getTreeNodeHierarchy.apply(node, [i]);

                var newModel = new MaintenanceModel (
                  {}, {node_info: treeInfo}
                  ),
                  fields = Backform.generateViewSchema(
                    treeInfo, newModel, 'create', node, treeInfo.server, true
                  );

                  var view = this.view = new Backform.Dialog({
                    el: $container, model: newModel, schema: fields
                  });

                  $(this.elements.body.childNodes[0]).addClass('alertify_tools_dialog_properties obj_properties');
                  view.render();

                 // If node is Index, Unique or Primary key then disable vacuum & analyze button
                  if (d._type == 'primary_key' || d._type == 'unique_constraint'
                                               || d._type == 'index') {
                    var vacuum_analyze_btns = $container.find(
                                                '.pgadmin-controls label:lt(2)'
                                                ).removeClass('active').addClass('disabled');
                    // Find reindex button element & add active class to it
                    var reindex_btn = vacuum_analyze_btns[1].nextElementSibling;
                    $(reindex_btn).addClass('active');
                  }

                  this.elements.content.appendChild($container.get(0));
              }
            };
          });
        }

        // Open the Alertify dialog
        Alertify.MaintenanceDialog('Maintenance...').set('resizable',true).resizeTo('60%','80%');
      },
    };

    return pgAdmin.Tools.maintenance;
  });
