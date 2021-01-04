/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* Create and Register Procedure Collection and Node. */
define('pgadmin.node.procedure', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'pgadmin.browser', 'alertify',
  'pgadmin.node.function', 'pgadmin.node.schema.dir/child',
  'pgadmin.node.schema.dir/schema_child_tree_node',
  'pgadmin.browser.collection', 'pgadmin.browser.server.privilege',
], function(gettext, url_for, $, _, pgAdmin, pgBrowser, alertify, Function,
  schemaChild, schemaChildTreeNode) {

  if (!pgBrowser.Nodes['coll-procedure']) {
    pgAdmin.Browser.Nodes['coll-procedure'] =
      pgAdmin.Browser.Collection.extend({
        node: 'procedure',
        label: gettext('Procedures'),
        type: 'coll-procedure',
        columns: ['name', 'funcowner', 'description'],
        hasStatistics: true,
        canDrop: schemaChildTreeNode.isTreeItemOfChildOfSchema,
        canDropCascade: schemaChildTreeNode.isTreeItemOfChildOfSchema,
      });
  }

  // Inherit Functions Node
  if (!pgBrowser.Nodes['procedure']) {
    pgAdmin.Browser.Nodes['procedure'] = schemaChild.SchemaChildNode.extend({
      type: 'procedure',
      sqlAlterHelp: 'sql-alterprocedure.html',
      sqlCreateHelp: 'sql-createprocedure.html',
      dialogHelp: url_for('help.static', {'filename': 'procedure_dialog.html'}),
      label: gettext('Procedure'),
      collection_type: 'coll-procedure',
      hasSQL: true,
      hasDepends: true,
      hasStatistics: true,
      hasScriptTypes: ['create', 'exec'],
      width: pgBrowser.stdW.md + 'px',
      Init: function() {
        /* Avoid mulitple registration of menus */
        if (this.proc_initialized)
          return;

        this.proc_initialized = true;

        pgBrowser.add_menus([{
          name: 'create_procedure_on_coll', node: 'coll-procedure', module:
          this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Procedure...'),
          icon: 'wcTabIcon icon-procedure', data: {action: 'create', check:
          false}, enable: 'canCreateProc',
        },{
          name: 'create_procedure', node: 'procedure', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Procedure...'),
          icon: 'wcTabIcon icon-procedure', data: {action: 'create', check:
          true}, enable: 'canCreateProc',
        },{
          name: 'create_procedure', node: 'schema', module: this,
          applies: ['object', 'context'], callback: 'show_obj_properties',
          category: 'create', priority: 4, label: gettext('Procedure...'),
          icon: 'wcTabIcon icon-procedure', data: {action: 'create', check:
          true}, enable: 'canCreateProc',
        },
        ]);
      },
      canCreateProc: function(itemData, item) {
        var node_hierarchy = this.getTreeNodeHierarchy.apply(this, [item]);

        // Do not provide Create option in catalog
        if ('catalog' in node_hierarchy)
          return false;

        // Procedures supported only in PPAS and PG >= 11
        return (
          'server' in node_hierarchy && (
            node_hierarchy['server'].server_type == 'ppas' ||
            (node_hierarchy['server'].server_type == 'pg' &&
             node_hierarchy['server'].version >= 110000)
          )
        );
      },
      model: Function.model.extend({
        defaults: _.extend({},
          Function.model.prototype.defaults,
          {
            lanname: 'edbspl',
          }
        ),
        canVarAdd: function() {
          var server = this.node_info.server;
          return server.version >= 90500;
        },
        isVisible: function() {
          if (this.name == 'sysfunc') { return false; }
          else if (this.name == 'sysproc') { return true; }
          return false;
        },
        isDisabled: function(m) {
          if(this.node_info &&  'catalog' in this.node_info) {
            return true;
          }
          switch(this.name){
          case 'provolatile':
          case 'proisstrict':
          case 'procost':
          case 'proleakproof':
            if(this.node_info.server.version < 90500 ||
              this.node_info.server.server_type != 'ppas' ||
              m.get('lanname') != 'edbspl') {

              setTimeout(function() {
                m.set('provolatile', null);
                m.set('proisstrict', false);
                m.set('procost', null);
                m.set('proleakproof', false);
              }, 10);
              return true;
            }
            else{
              return false;
            }
          case 'variables':
          case 'prosecdef':
            return this.node_info.server.version < 90500;
          case 'prorows':
            var server = this.node_info.server;
            return !(server.version >= 90500 && m.get('proretset') == true);
          case 'proparallel':
            if (this.node_info.server.version < 90600 ||
              this.node_info.server.server_type != 'ppas' ||
              m.get('lanname') != 'edbspl') {
              setTimeout(function() {
                m.set('proparallel', null);
              }, 10);
              return true;
            }
            else{
              return false;
            }
          case 'lanname':
            return this.node_info.server.version < 110000;
          default:
            return false;
          }
        },
        validate: function()
        {
          var err = {},
            errmsg,
            seclabels = this.get('seclabels');

          if (_.isUndefined(this.get('name')) || String(this.get('name')).replace(/^\s+|\s+$/g, '') == '') {
            err['name'] = gettext('Name cannot be empty.');
            errmsg = err['name'];
          }

          if (_.isUndefined(this.get('pronamespace')) || String(this.get('pronamespace')).replace(/^\s+|\s+$/g, '') == '') {
            err['pronamespace'] = gettext('Schema cannot be empty.');
            errmsg = errmsg || err['pronamespace'];
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

          return null;
        },
      }),
    });

  }

  return pgBrowser.Nodes['procedure'];
});
