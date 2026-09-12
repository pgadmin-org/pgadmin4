/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import StatisticsSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/statistics/static/js/statistics.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('StatisticsSchema', () => {
  const createSchemaObj = (version=180000) => new StatisticsSchema(
    {
      role: () => [],
      schema: () => [],
      getTables: () => [],
      getColumns: () => [],
    },
    {
      owner: 'postgres',
      schema: 'public',
    },
    {
      server: {version: version},
    }
  );
  let schemaObj = createSchemaObj();
  let getInitData = () => Promise.resolve({});

  beforeEach(() => {
    genericBeforeEach();
  });

  it('create', () => {
    getCreateView(createSchemaObj());
  });

  it('edit', () => {
    getEditView(createSchemaObj(), getInitData);
  });

  it('properties', () => {
    getPropertiesView(createSchemaObj(), getInitData);
  });

  it('name is required before PostgreSQL 16 and optional from 16', () => {
    const nameField = (obj) => obj.baseFields.find((f) => f.id == 'name');

    expect(createSchemaObj(150000).isNameOptional).toBe(false);
    expect(nameField(createSchemaObj(150000)).noEmpty).toBe(true);

    expect(createSchemaObj(160000).isNameOptional).toBe(true);
    expect(nameField(createSchemaObj(160000)).noEmpty).toBe(false);
  });

  it('computed statistics are hidden without access to the catalog', () => {
    const computed = schemaObj.baseFields.filter(
      (f) => f.group == 'Computed Statistics'
    );
    expect(computed.length).toBe(3);

    for (const field of computed) {
      expect(field.visible({has_ext_data_access: true})).toBe(true);
      expect(field.visible({has_ext_data_access: false})).toBe(false);
    }
  });

  it('validate', () => {
    let state = {};
    let setError = jest.fn();

    // A table has to be chosen.
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('table', 'Table must be selected.');

    state.table = 'test_table';

    // Neither columns nor expressions given.
    state.columns = [];
    state.expression_list = null;
    state.stat_types = ['ndistinct'];
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith(
      'columns', 'Either columns or expressions must be specified.');

    // One column on its own is not enough for a statistics object.
    state.columns = ['col1'];
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith(
      'columns',
      'At least 2 columns must be selected for multi-column statistics.');

    // Two columns are.
    state.columns = ['col1', 'col2'];
    expect(schemaObj.validate(state, setError)).toBe(false);

    // So is one column alongside an expression, and so is an expression on
    // its own: the single expression form needs nothing else.
    state.columns = ['col1'];
    state.expression_list = '(col2 + 1)';
    expect(schemaObj.validate(state, setError)).toBe(false);

    state.columns = [];
    state.expression_list = 'coalesce(col1, col2)';
    expect(schemaObj.validate(state, setError)).toBe(false);

    // At least one statistics type is needed when columns are involved.
    state.columns = ['col1', 'col2'];
    state.expression_list = null;
    state.stat_types = [];
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith(
      'stat_types', 'At least one statistics type must be selected.');

    // But not for the expression-only form: PostgreSQL's univariate
    // expression statistics don't accept a statistics-kind clause at all.
    state.columns = [];
    state.expression_list = 'coalesce(col1, col2)';
    state.stat_types = [];
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});
