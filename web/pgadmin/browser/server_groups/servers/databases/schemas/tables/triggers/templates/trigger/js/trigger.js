define(
        ['jquery', 'underscore', 'underscore.string', 'pgadmin', 'pgadmin.browser',
        'backform', 'alertify', 'pgadmin.browser.collection'],
function($, _, S, pgAdmin, pgBrowser, Backform, alertify) {


  var CustomSwitchControl = Backform.CustomSwitchControl = Backform.SwitchControl.extend({
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%> custom_switch_label_class"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%> custom_switch_control_class">',
      '  <div class="checkbox">',
      '    <label>',
      '      <input type="checkbox" class="<%=extraClasses.join(\' \')%>"',
      '        name="<%=name%>" <%=value ? "checked=\'checked\'" : ""%>',
      '        <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '    </label>',
      '  </div>',
      '</div>',
      '<% if (helpMessage && helpMessage.length) { %>',
      '  <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '<% } %>'
    ].join("\n")),
    className: 'pgadmin-control-group form-group col-xs-6'
  });

  if (!pgBrowser.Nodes['coll-trigger']) {
    var triggers = pgAdmin.Browser.Nodes['coll-trigger'] =
      pgAdmin.Browser.Collection.extend({
        node: 'trigger',
        label: '{{ _('Triggers') }}',
        type: 'coll-trigger',
        columns: ['name', 'description']
      });
  };

  if (!pgBrowser.Nodes['trigger']) {
    pgAdmin.Browser.Nodes['trigger'] = pgAdmin.Browser.Node.extend({
      parent_type: ['table', 'view'],
      collection_type: ['coll-table', 'coll-view'],
      type: 'trigger',
      label: '{{ _('Trigger') }}',
      hasSQL:  true,
      hasDepends: true,
      width: '650px',
      sqlAlterHelp: 'sql-altertrigger.html',
      sqlCreateHelp: 'sql-createtrigger.html',
      dialogHelp: '{{ url_for('help.static', filename='trigger_dialog.html') }}',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.initialized)
            return;

        this.initialized = true;

        pgBrowser.add_menus([{
          name: 'create_trigger_on_coll', node: 'coll-trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Trigger...') }}',
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Trigger...') }}',
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'create_trigger_onTable', node: 'table', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Trigger...') }}',
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate'
        },{
          name: 'enable_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'enable_trigger',
          category: 'connect', priority: 3, label: '{{ _('Enable trigger') }}',
          icon: 'fa fa-check', enable : 'canCreate_with_trigger_enable'
        },{
          name: 'disable_trigger', node: 'trigger', module: this,
          applies: ['object', 'context'], callback: 'disable_trigger',
          category: 'drop', priority: 3, label: '{{ _('Disable trigger') }}',
          icon: 'fa fa-times', enable : 'canCreate_with_trigger_disable'
        },{
          name: 'create_trigger_onView', node: 'view', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: '{{ _('Trigger...') }}',
          icon: 'wcTabIcon icon-trigger', data: {action: 'create', check: true},
          enable: 'canCreate'
        }
        ]);
      },
      callbacks: {
        /* Enable trigger */
        enable_trigger: function(args) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'enable' , d, true),
            type:'PUT',
            data: {'enable' : true},
            dataType: "json",
            success: function(res) {
              if (res.success == 1) {
                alertify.success("{{ _('" + res.info + "') }}");
                t.removeIcon(i);
                data.icon = 'icon-trigger';
                t.addIcon(i, {icon: data.icon});
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
                // Fetch updated data from server
                setTimeout(function() {
                  t.select(i);
                }, 10);
              }
            },
            error: function(xhr, status, error) {
              try {
                var err = $.parseJSON(xhr.responseText);
                if (err.success == 0) {
                  msg = S('{{ _(' + err.errormsg + ')}}').value();
                  alertify.error("{{ _('" + err.errormsg + "') }}");
                }
              } catch (e) {}
              t.unload(i);
            }
          })
        },
        /* Disable trigger */
        disable_trigger: function(args) {
          var input = args || {};
          obj = this,
          t = pgBrowser.tree,
          i = input.item || t.selected(),
          d = i && i.length == 1 ? t.itemData(i) : undefined;

          if (!d)
            return false;

          var data = d;
          $.ajax({
            url: obj.generate_url(i, 'enable' , d, true),
            type:'PUT',
            data: {'enable' : false},
            dataType: "json",
            success: function(res) {
              if (res.success == 1) {
                alertify.success("{{ _('" + res.info + "') }}");
                t.removeIcon(i);
                data.icon = 'icon-trigger-bad';
                t.addIcon(i, {icon: data.icon});
                t.unload(i);
                t.setInode(i);
                t.deselect(i);
                // Fetch updated data from server
                setTimeout(function() {
                  t.select(i);
                }, 10);
              }
            },
            error: function(xhr, status, error) {
              try {
                var err = $.parseJSON(xhr.responseText);
                if (err.success == 0) {
                  msg = S('{{ _(' + err.errormsg + ')}}').value();
                  alertify.error("{{ _('" + err.errormsg + "') }}");
                }
              } catch (e) {}
              t.unload(i);
            }
          })
        }
      },
      canDrop: pgBrowser.Nodes['schema'].canChildDrop,
      canDropCascade: pgBrowser.Nodes['schema'].canChildDrop,
      model: pgAdmin.Browser.Node.Model.extend({
        defaults: {
          name: undefined,
          is_row_trigger: true,
          fires: 'BEFORE'
        },
        schema: [{
          id: 'name', label: '{{ _('Name') }}', cell: 'string',
          type: 'text', disabled: 'inSchema'
        },{
          id: 'oid', label:'{{ _('OID') }}', cell: 'string',
          type: 'int', disabled: true, mode: ['properties']
        },{
          id: 'is_enable_trigger', label:'{{ _('Enable trigger?') }}',
          type: 'switch', disabled: 'inSchema', mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'is_row_trigger', label:'{{ _('Row trigger?') }}',
          type: 'switch', group: '{{ _('Definition') }}',
          mode: ['create','edit', 'properties'],
          deps: ['is_constraint_trigger'],
          disabled: function(m) {
            // If constraint trigger is set to True then row trigger will
            // automatically set to True and becomes disable
            var is_constraint_trigger = m.get('is_constraint_trigger');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
                if(!_.isUndefined(is_constraint_trigger) &&
                is_constraint_trigger === true) {
                // change it's model value
                    setTimeout(function() { m.set('is_row_trigger', true) }, 10);
                    return true;
                } else {
                    return false;
                }
            } else {
                // Disable it
                return true;
            }
          }
        },{
          id: 'is_constraint_trigger', label:'{{ _('Constraint trigger?') }}',
          type: 'switch', disabled: 'inSchemaWithModelCheck',
          mode: ['create','edit', 'properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'tgdeferrable', label:'{{ _('Deferrable?') }}',
          type: 'switch', group: '{{ _('Definition') }}',
          mode: ['create','edit', 'properties'],
          deps: ['is_constraint_trigger'],
          disabled: function(m) {
            // If constraint trigger is set to True then only enable it
            var is_constraint_trigger = m.get('is_constraint_trigger');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
                if(!_.isUndefined(is_constraint_trigger) &&
                is_constraint_trigger === true) {
                    return false;
                } else {
                    // If value is already set then reset it to false
                    if(m.get('tgdeferrable')) {
                      setTimeout(function() { m.set('tgdeferrable', false) }, 10);
                    }
                    return true;
                }
            } else {
                // Disable it
                return true;
            }
          }
        },{
          id: 'tginitdeferred', label:'{{ _('Deferred?') }}',
          type: 'switch', group: '{{ _('Definition') }}',
          mode: ['create','edit', 'properties'],
          deps: ['tgdeferrable', 'is_constraint_trigger'],
          disabled: function(m) {
            // If Deferrable is set to True then only enable it
            var tgdeferrable = m.get('tgdeferrable');
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
                if(!_.isUndefined(tgdeferrable) &&
                tgdeferrable) {
                    return false;
                } else {
                    // If value is already set then reset it to false
                    if(m.get('tginitdeferred')) {
                      setTimeout(function() { m.set('tginitdeferred', false) }, 10);
                    }
                    // If constraint trigger is set then do not disable
                    return m.get('is_constraint_trigger') ? false : true;
                }
            } else {
                // Disable it
                return true;
            }
          }
        },{
          id: 'tfunction', label:'{{ _('Trigger Function') }}',
          type: 'text', disabled: 'inSchemaWithModelCheck',
          mode: ['create','edit', 'properties'], group: '{{ _('Definition') }}',
          control: 'node-ajax-options', url: 'get_triggerfunctions'
        },{
          id: 'tgargs', label:'{{ _('Arguments') }}', cell: 'string',
          group: '{{ _('Definition') }}',
          type: 'text',mode: ['create','edit', 'properties'], deps: ['tfunction'],
          disabled: function(m) {
            // We will disable it when EDB PPAS and trigger function is
            // set to Inline EDB-SPL
            var tfunction = m.get('tfunction'),
                server_type = m.node_info['server']['server_type'];
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
                if(server_type === 'ppas' &&
                    !_.isUndefined(tfunction) &&
                tfunction === 'Inline EDB-SPL') {
                    // Disable and clear its value
                    m.set('tgargs', undefined)
                    return true;
                } else {
                    return false;
                }
            } else {
                // Disable it
                return true;
            }
          }
        },{
        id: 'fires', label:'{{ _('Fires') }}', deps: ['is_constraint_trigger'],
        mode: ['create','edit', 'properties'], group: '{{ _('Events') }}',
        options: function(control) {
            var table_options = [
                {label: "BEFORE", value: "BEFORE"},
                {label: "AFTER", value: "AFTER"}],
                view_options = [
                {label: "BEFORE", value: "BEFORE"},
                {label: "AFTER", value: "AFTER"},
                {label: "INSTEAD OF", value: "INSTEAD OF"}];
            // If we are under table then show table specific options
            if(_.indexOf(Object.keys(control.model.node_info), 'table') != -1) {
                return table_options;
            } else {
                return view_options;
            }
        },
        // If create mode then by default open composite type
        control: 'select2', select2: { allowClear: false, width: "100%" },
        disabled: function(m) {
        // If contraint trigger is set to True then only enable it
        var is_constraint_trigger = m.get('is_constraint_trigger');
        if(!m.inSchemaWithModelCheck.apply(this, [m])) {
            if(!_.isUndefined(is_constraint_trigger) &&
            is_constraint_trigger === true) {
                setTimeout(function() { m.set('fires', 'AFTER') }, 10);
                return true;
            } else {
                return false;
            }
        } else {
            // Disable it
            return true;
        }
       }
      },{
        type: 'nested', control: 'fieldset', mode: ['create','edit', 'properties'],
        label: '{{ _('Events') }}', group: '{{ _('Events') }}',
        schema:[{
            id: 'evnt_insert', label:'{{ _('INSERT') }}',
            type: 'switch', mode: ['create','edit', 'properties'],
            group: '{{ _('Events') }}',
            control: Backform.CustomSwitchControl,
            disabled: function(m) {
                return m.inSchemaWithModelCheck.apply(this, [m]);
            }
        },{
            id: 'evnt_update', label:'{{ _('UPDATE') }}',
            type: 'switch', mode: ['create','edit', 'properties'],
            group: '{{ _('Events') }}',
            control: Backform.CustomSwitchControl,
            disabled: function(m) {
                return m.inSchemaWithModelCheck.apply(this, [m]);
            }
        },{
            id: 'evnt_delete', label:'{{ _('DELETE') }}',
            type: 'switch', mode: ['create','edit', 'properties'],
            group: '{{ _('Events') }}',
            control: Backform.CustomSwitchControl,
            disabled: function(m) {
                return m.inSchemaWithModelCheck.apply(this, [m]);
            }
        },{
            id: 'evnt_truncate', label:'{{ _('TRUNCATE') }}',
            type: 'switch', group: '{{ _('Events') }}',
            control: Backform.CustomSwitchControl,
            disabled: function(m) {
            var is_constraint_trigger = m.get('is_constraint_trigger'),
                is_row_trigger = m.get('is_row_trigger'),
                server_type = m.node_info['server']['server_type'];
            if(!m.inSchemaWithModelCheck.apply(this, [m])) {
                // We will enabale truncate only for EDB PPAS
                // and both triggers row & constarint are set to false
                if(server_type === 'ppas' &&
                    !_.isUndefined(is_constraint_trigger) &&
                    !_.isUndefined(is_row_trigger) &&
                is_constraint_trigger === false &&
                    is_row_trigger === false) {
                    return false;
                } else {
                    return true;
                }
            } else {
                // Disable it
                return true;
            }
        }
        }]
        },{
            id: 'whenclause', label:'{{ _('When') }}',
            type: 'text', disabled: 'inSchemaWithModelCheck',
            mode: ['create', 'edit', 'properties'],
            control: 'sql-field', visible: true, group: '{{ _('Events') }}'
        },{
            id: 'columns', label: '{{ _('Columns') }}', url: 'nodes',
            type: 'collection', control: 'multi-select-ajax',
            deps: ['evnt_update'], node: 'column', group: '{{ _('Events') }}',
            model: pgBrowser.Node.Model.extend({
                keys: ['column'], defaults: { column: undefined }
            }),
            disabled: function(m) {
                if(this.node_info &&  'catalog' in this.node_info) {
                    return true;
                }
                //Disable in edit mode
                if (!m.isNew()) {
                    return true;
                }
                // Enable column only if update event is set true
                var isUpdate = m.get('evnt_update');
                if(!_.isUndefined(isUpdate) && isUpdate) {
                    return false;
                }
             return true;
            }
        },{
            id: 'prosrc', label:'{{ _('Code') }}', group: '{{ _('Code') }}',
            type: 'text', mode: ['create', 'edit'], deps: ['tfunction'],
            control: 'sql-field', visible: true,
            disabled: function(m) {
                // We will enable it only when EDB PPAS and trigger function is
                // set to Inline EDB-SPL
                var tfunction = m.get('tfunction'),
                    server_type = m.node_info['server']['server_type'];

                if(server_type === 'ppas' &&
                    !_.isUndefined(tfunction) &&
                    tfunction === 'Inline EDB-SPL')
                  return false;
                else
                  return true;
            }
        },{
          id: 'is_sys_trigger', label:'{{ _('System trigger?') }}', cell: 'string',
          type: 'switch', disabled: 'inSchemaWithModelCheck', mode: ['properties']
        },{
          id: 'is_constarint', label:'{{ _('Constraint?') }}', cell: 'string',
          type: 'switch', disabled: 'inSchemaWithModelCheck', mode: ['properties'],
          group: '{{ _('Definition') }}'
        },{
          id: 'description', label:'{{ _('Comment') }}', cell: 'string',
          type: 'multiline', mode: ['properties', 'create', 'edit'],
          disabled: 'inSchema'
    }],
        validate: function(keys) {
          var err = {},
              msg = undefined;
          this.errorModel.clear();

          // If nothing to validate
          if (keys && keys.length == 0) {
            return null;
          }

          if(_.isUndefined(this.get('name'))
              || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Name can not be empty.') }}';
            this.errorModel.set('name', msg);
            return msg;
            }
          if(_.isUndefined(this.get('tfunction'))
              || String(this.get('tfunction')).replace(/^\s+|\s+$/g, '') == '') {
            msg = '{{ _('Trigger function can not be empty.') }}';
            this.errorModel.set('tfunction', msg);
            return msg;
          }

          if(!this.get('evnt_truncate') && !this.get('evnt_delete') &&
            !this.get('evnt_update') && !this.get('evnt_insert')) {
            msg = '{{ _('Specify at least one event.') }}';
            this.errorModel.set('evnt_truncate', " ");
            this.errorModel.set('evnt_delete', " ");
            this.errorModel.set('evnt_update', " ");
            this.errorModel.set('evnt_insert', msg);
            return msg;
          }

          if(!_.isUndefined(this.get('tfunction')) &&
            this.get('tfunction') === 'Inline EDB-SPL' &&
            (_.isUndefined(this.get('prosrc'))
              || String(this.get('prosrc')).replace(/^\s+|\s+$/g, '') == ''))
          {
            msg = '{{ _('Trigger code can not be empty.') }}';
            this.errorModel.set('prosrc', msg);
            return msg;
          }
          return null;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchema: function() {
          if(this.node_info &&  'catalog' in this.node_info) {
            return true;
          }
          return false;
        },
        // We will check if we are under schema node & in 'create' mode
        inSchemaWithModelCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's in 'edit' mode
            if (m.isNew()) {
              return false;
            } else {
              return true;
            }
          }
          return true;
        },
        // Checks weather to enable/disable control
        inSchemaWithColumnCheck: function(m) {
          if(this.node_info &&  'schema' in this.node_info) {
            // We will disable control if it's system columns
            // ie: it's position is less then 1
            if (m.isNew()) {
              return false;
            } else {
              // if we are in edit mode
              if (!_.isUndefined(m.get('attnum')) && m.get('attnum') >= 1 ) {
                return false;
              } else {
                return true;
              }
           }
          }
          return true;
        }
      }),
      // Below function will enable right click menu for creating column
      canCreate: function(itemData, item, data) {
          // If check is false then , we will allow create menu
          if (data && data.check == false)
            return true;

          var t = pgBrowser.tree, i = item, d = itemData, parents = [];
          // To iterate over tree to check parent node
          while (i) {
            // If it is schema then allow user to c reate table
            if (_.indexOf(['schema'], d._type) > -1)
              return true;
            parents.push(d._type);
            i = t.hasParent(i) ? t.parent(i) : null;
            d = i ? t.itemData(i) : null;
          }
          // If node is under catalog then do not allow 'create' menu
          if (_.indexOf(parents, 'catalog') > -1) {
            return false;
          } else {
            return true;
          }
      },
      // Check to whether trigger is disable ?
      canCreate_with_trigger_enable: function(itemData, item, data) {
        if(this.canCreate.apply(this, [itemData, item, data])) {
          // We are here means we can create menu, now let's check condition
          if(itemData.icon === 'icon-trigger-bad') {
            return true;
          } else {
            return false;
          }
        }
      },
      // Check to whether trigger is enable ?
      canCreate_with_trigger_disable: function(itemData, item, data) {
        if(this.canCreate.apply(this, [itemData, item, data])) {
          // We are here means we can create menu, now let's check condition
          if(itemData.icon === 'icon-trigger') {
            return true;
          } else {
            return false;
          }
        }
      }
  });
 }

  return pgBrowser.Nodes['trigger'];
});
