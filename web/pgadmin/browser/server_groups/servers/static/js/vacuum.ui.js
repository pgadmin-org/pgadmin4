import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getNodeAjaxOptions } from '../../../../static/js/node_ajax';

export function getNodeVacuumSettingsSchema(nodeObj, treeNodeInfo, itemNodeData) {
  let tableVacuumRows = ()=>getNodeAjaxOptions('get_table_vacuum', nodeObj, treeNodeInfo, itemNodeData, {noCache: true});
  let toastTableVacuumRows = ()=>getNodeAjaxOptions('get_toast_table_vacuum', nodeObj, treeNodeInfo, itemNodeData, {noCache: true});
  return new VacuumSettingsSchema(tableVacuumRows, toastTableVacuumRows, treeNodeInfo);
}
export class VacuumTableSchema extends BaseUISchema {
  constructor(valueDep) {
    super();
    this.valueDep = valueDep;
  }

  get baseFields() {
    let obj = this;

    return [
      {
        id: 'label', name: 'label', label: gettext('Label'), cell: '',
      },
      {
        id: 'value', name: 'value', label: gettext('Value'),
        type: 'text', deps: [[this.valueDep]],
        editable: function() {
          return obj.top.sessData[this.valueDep];
        },
        cell: (state)=>{
          switch(state.column_type) {
          case 'integer':
            return {cell: 'int'};
          case 'number':
            return {cell: 'numeric', controlProps: {decimals: 5}};
          case 'string':
            return {cell: 'text'};
          default:
            return {cell: ''};
          }
        }
      },
      {
        id: 'setting', name: 'setting', label: gettext('Default'), cell: '',
      },
    ];
  }
}

export default class VacuumSettingsSchema extends BaseUISchema {
  constructor(tableVars, toastTableVars, nodeInfo) {
    super({
      vacuum_table: [],
      vacuum_toast: [],
    });
    this.tableVars = tableVars;
    this.toastTableVars = toastTableVars;
    this.nodeInfo = nodeInfo;

    this.vacuumTableObj = new VacuumTableSchema('autovacuum_custom');
    this.vacuumToastTableObj = new VacuumTableSchema('toast_autovacuum');
  }

  get baseFields() {
    let obj = this;
    return [{
      id: 'autovacuum_custom', label: gettext('Custom auto-vacuum?'),
      group: gettext('Table'), mode: ['edit', 'create'], skipChange: true,
      type: 'switch', disabled: function(state) {
        if(state.is_partitioned) {
          return true;
        }
        // If table is partitioned table then disabled it.
        if(state.top && state.is_partitioned) {
          return true;
        }

        return !obj.inCatalog;
      },
      depChange(state) {
        if(state.is_partitioned) {
          return {autovacuum_custom: false};
        }
      }
    },
    {
      id: 'autovacuum_enabled', label: gettext('Autovacuum Enabled?'),
      group: gettext('Table'), mode: ['edit', 'create'], type: 'toggle',
      options: [
        {'label': gettext('Not set'), 'value': 'x'},
        {'label': gettext('Yes'), 'value': 't'},
        {'label': gettext('No'), 'value': 'f'},
      ],
      deps: ['autovacuum_custom'],
      disabled: function(state) {
        return !(obj.inCatalog && state.autovacuum_custom);
      },
      depChange: function(state) {
        if(obj.inCatalog && state.autovacuum_custom) {
          return;
        }
        return {autovacuum_enabled: 'x'};
      },
    },
    {
      id: 'vacuum_table', label: '', editable: false, type: 'collection',
      canEdit: false, canAdd: false, canDelete: false, group: gettext('Table'),
      fixedRows: this.tableVars,
      schema: this.vacuumTableObj,
      mode: ['edit', 'create'],
    },
    {
      id: 'toast_autovacuum', label: gettext('Custom auto-vacuum?'),
      group: gettext('TOAST table'), mode: ['edit', 'create'],
      type: 'switch',
      disabled: function(state) {
        // We need to check additional condition to toggle enable/disable
        // for table auto-vacuum
        return !(obj.inCatalog && (obj.top.isNew() || state.hastoasttable));
      }
    },
    {
      id: 'toast_autovacuum_enabled', label: gettext('Autovacuum Enabled?'),
      group: gettext('TOAST table'), mode: ['edit', 'create'],
      type: 'toggle',
      options: [
        {'label': gettext('Not set'), 'value': 'x'},
        {'label': gettext('Yes'), 'value': 't'},
        {'label': gettext('No'), 'value': 'f'},
      ],
      deps:['toast_autovacuum'],
      disabled: function(state) {
        return !(obj.inCatalog && state.toast_autovacuum);
      },
      depChange: function(state) {
        if(obj.inCatalog && state.toast_autovacuum) {
          return;
        }
        if(obj.isNew() || state.hastoasttable) {
          return {toast_autovacuum_enabled: 'x'};
        }
      },
    },
    {
      id: 'vacuum_toast', label: '',
      type: 'collection',
      fixedRows: this.toastTableVars,
      editable: function(state) {
        return obj.isNew(state);
      },
      canEdit: false, canAdd: false, canDelete: false, group: gettext('TOAST table'),
      schema: this.vacuumToastTableObj,
      mode: ['properties', 'edit', 'create'], deps: ['toast_autovacuum'],
    }];
  }
}
