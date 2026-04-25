/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { isEmptyString } from '../../../../../../../../static/js/validators';

export default class StatisticsSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      schema: undefined,
      table: undefined,
      columns: [],
      expression_list: undefined,
      has_expressions: false,
      stat_types: [],
      stattarget: undefined,
      owner: undefined,
      comment: undefined,
      is_sys_obj: undefined,
      ...initValues,
    });

    this.fieldOptions = {
      role: [],
      schema: [],
      tables: [],
      getColumns: null,
      ...fieldOptions,
    };
    this.allTablesOptions = [];
  }

  getTableOid(tabName) {
    // Fetch the table OID from table name
    for(const t of this.allTablesOptions) {
      if(t.label === tabName) {
        return t._id;
      }
    }
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'name',
        label: gettext('Name'),
        type: 'text',
        mode: ['properties', 'create', 'edit'],
        helpMessage: gettext('Statistics name'),
      },
      {
        id: 'oid',
        label: gettext('OID'),
        type: 'text',
        mode: ['properties'],
      },
      {
        id: 'owner',
        label: gettext('Owner'),
        type: 'select',
        options: this.fieldOptions.role,
        controlProps: { allowClear: false },
        mode: ['properties', 'create', 'edit'],
      },
      {
        id: 'schema',
        label: gettext('Schema'),
        type: 'select',
        options: this.fieldOptions.schema,
        controlProps: { allowClear: false },
        mode: ['create', 'edit'],
        cache_node: 'database',
        cache_level: 'database',
      },
      {
        id: 'table',
        label: gettext('Table'),
        type: 'select',
        options: this.fieldOptions.tables,
        optionsLoaded: (res)=>obj.allTablesOptions=res,
        mode: ['properties', 'create'],
        deps: ['schema'],
        editable: false,
        noEmpty: true,
        helpMessage: gettext('Select the table for which to collect statistics.'),
      },
      {
        id: 'columns',
        label: gettext('Columns'),
        type: (state)=>{
          let tid = obj.getTableOid(state.table);
          return {
            type: 'select',
            options: state.table ? ()=>obj.fieldOptions.getColumns({tid: tid}) : [],
            optionsReloadBasis: state.table,
          };
        },
        deps: ['schema', 'table'],
        mode: ['properties', 'create'],
        editable: false,
        controlProps: {
          multiple: true,
          allowClear: true,
        },
        helpMessage: gettext('Select at least 2 columns for multi-column statistics'),
        depChange: (state)=>{
          // Clear columns when table changes
          if(!state.table) {
            return {
              columns: [],
            };
          }
        }
      },
      {
        id: 'stat_types',
        label: gettext('Statistics types'),
        type: 'select',
        mode: ['properties', 'create'],
        editable: false,
        controlProps: {
          multiple: true,
          allowClear: false,
        },
        options: [
          {label: gettext('N-distinct'), value: 'ndistinct'},
          {label: gettext('Dependencies'), value: 'dependencies'},
          {label: gettext('MCV (Most Common Values)'), value: 'mcv'},
        ],
        noEmpty: true,
        helpMessage: gettext('Select one or more statistics types to collect'),
      },
      {
        id: 'expression_list',
        label: gettext('Expressions'),
        type: 'text',
        mode: ['create'],
        group: gettext('Definition'),
        helpMessage: gettext('Enter SQL expression(s) for expression-based statistics, separated by commas'),
      },
      {
        id: 'has_expressions',
        label: gettext('Has expressions?'),
        type: 'switch',
        mode: ['properties'],
        readonly: true,
        disabled: true,
        helpMessage: gettext('Indicates if this statistics object includes expression-based statistics'),

      },
      {
        id: 'stattarget',
        label: gettext('Statistics target'),
        type: 'int',
        mode: ['properties', 'edit'],
        min: -1,
        helpMessage: gettext('Set statistics target for this object'),

      },
      {
        id: 'ndistinct_values',
        label: gettext('N-Distinct coefficients'),
        type: 'multiline',
        mode: ['properties'],
        readonly: true,
        disabled: true,
        group: gettext('Computed Statistics'),
        helpMessage: gettext('N-distinct coefficients computed by ANALYZE'),
      },
      {
        id: 'dependencies_values',
        label: gettext('Functional dependencies'),
        type: 'multiline',
        mode: ['properties'],
        readonly: true,
        disabled: true,
        group: gettext('Computed Statistics'),
        helpMessage: gettext('Functional dependency statistics computed by ANALYZE'),
      },
      {
        id: 'has_mcv_values',
        label: gettext('Has MCV data?'),
        type: 'switch',
        mode: ['properties'],
        readonly: true,
        disabled: true,
        group: gettext('Computed Statistics'),
        helpMessage: gettext('Indicates if most-common values data is available for this statistics object'),
      },
      {
        id: 'comment',
        label: gettext('Comment'),
        type: 'multiline',
        mode: ['properties', 'create', 'edit'],
      },
      {
        id: 'is_sys_obj',
        label: gettext('System statistics?'),
        cell:'boolean',
        type: 'switch',
        mode: ['properties'],
      },
    ];
  }

  validate(state, setError) {
    let errors = false;

    // Validate table is selected
    if (isEmptyString(state.table) && !state.oid) {
      setError('table', gettext('Table must be selected.'));
      errors = true;
    } else {
      setError('table', null);
    }

    // Validate columns or expressions are provided
    const hasColumns = state.columns && state.columns.length > 0;
    const hasExpressions = state.expression_list && state.expression_list.trim().length > 0;

    if (!hasColumns && !hasExpressions && !state.oid) {
      setError('columns', gettext('Either columns or expressions must be specified.'));
      setError('expression_list', gettext('Either columns or expressions must be specified.'));
      errors = true;
    } else {
      // Validate minimum 2 columns for multi-column statistics (when no expressions)
      if (hasColumns && !hasExpressions && state.columns.length < 2 && !state.oid) {
        setError('columns', gettext('At least 2 columns must be selected for multi-column statistics.'));
        errors = true;
      } else {
        setError('columns', null);
      }

      // Clear expression_list error if either columns or expressions are provided
      if (hasColumns || hasExpressions) {
        setError('expression_list', null);
      }
    }

    // Validate at least one stat type
    if (state.stat_types && state.stat_types.length === 0 && !state.oid) {
      setError('stat_types', gettext('At least one statistics type must be selected.'));
      errors = true;
    } else {
      setError('stat_types', null);
    }

    return errors;
  }
}
