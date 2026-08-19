/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import ColumnSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/columns/static/js/column.ui';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';
import { initializeSchemaWithData } from './utils';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

class ColumnInColl extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [{
      id: 'columns', label: '', type: 'collection',
      schema: new ColumnSchema(
        ()=>new MockSchema(),
        {},
        ()=>Promise.resolve([]),
        ()=>Promise.resolve([]),
      ),
      editable: false,
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      columns : ['name' , 'cltype', 'attlen', 'attprecision', 'attnotnull', 'is_primary_key'],
    }];
  }
}

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('ColumnSchema', ()=>{
  const createSchemaObj = () => new ColumnSchema(
    ()=>new MockSchema(),
    {},
    ()=>Promise.resolve([]),
    ()=>Promise.resolve([]),
  );
  let schemaObj = createSchemaObj();
  let datatypes = [
    {value: 'numeric', length: true, precision: true, min_val: 1, max_val: 140391},
    {value: 'character varying', length: true, precision: false, min_val: 1, max_val: 140391},
  ];
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObj());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObj(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObj(), getInitData);
  });

  it('create collection', async ()=>{
    let schemaCollObj = new ColumnInColl();
    const {ctrl, user} = await getCreateView(schemaCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });

  it('isTypeIdentity', ()=>{
    let state = {colconstype: 'i'};
    expect(schemaObj.isTypeIdentity(state)).toBe(true);
  });

  it('isTypeGenerated', ()=>{
    let state = {colconstype: 'g'};
    expect(schemaObj.isTypeGenerated(state)).toBe(true);
  });

  it('inSchemaWithModelCheck', ()=>{
    let state = {attnum: 1};
    schemaObj.nodeInfo.schema = {};
    expect(schemaObj.inSchemaWithModelCheck(state)).toBe(true);
    state.attnum = null;
    expect(schemaObj.inSchemaWithModelCheck(state)).toBe(false);
    schemaObj.nodeInfo = {};
    expect(schemaObj.inSchemaWithModelCheck(state)).toBe(true);
  });

  it('attlenRange', ()=>{
    schemaObj.datatypes = datatypes;
    let state = {cltype: 'character varying'};
    expect(schemaObj.attlenRange(state)).toEqual({min: 1, max: 140391});
  });

  it('attprecisionRange', ()=>{
    schemaObj.datatypes = datatypes;
    let state = {cltype: 'numeric'};
    expect(schemaObj.attprecisionRange(state)).toEqual({min: -140391, max: 140391});
  });

  it('inSchemaWithColumnCheck', ()=>{
    let state = {};
    schemaObj.nodeInfo = {schema: {}};
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(false);

    state.attnum = -1;
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(true);

    state.inheritedfrom = 140391;
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(true);

    schemaObj.nodeInfo.view = {};
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(true);

    schemaObj.nodeInfo = {};
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(false);
  });

  it('inSchemaWithColumnCheck - column already inherited from a parent table', ()=>{
    // Set on the properties fetch for a column the table already
    // inherits when opened (issue #10179, case 1).
    schemaObj.nodeInfo = {schema: {}};
    let state = {attnum: 1, inheritedfromtable: 'public.parent'};
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(true);
    expect(schemaObj.editableCheckForTable(state)).toBe(false);
  });

  it('inSchemaWithColumnCheck - column added interactively via Inherited from table(s)', ()=>{
    // Columns freshly fetched via 'Inherited from table(s)' don't carry an
    // attnum yet, so isNew() would otherwise (wrongly) treat them as new,
    // editable rows (issue #10179, case 2).
    schemaObj.nodeInfo = {schema: {}};
    let state = {name: 'id', inheritedfrom: 'public.parent'};
    expect(schemaObj.inSchemaWithColumnCheck(state)).toBe(true);
    expect(schemaObj.editableCheckForTable(state)).toBe(false);
  });

  it('editTypesFilter', ()=>{
    let options = [
      {label: 'integer', value: 'integer'},
      {label: 'text', value: 'text'},
      {label: 'boolean', value: 'boolean'},
    ];

    // Existing column: restricted to edit_types.
    let filtered = schemaObj.editTypesFilter(['integer', 'text'], false)(options);
    expect(filtered).toEqual([
      {label: 'integer', value: 'integer'},
      {label: 'text', value: 'text'},
    ]);

    // New column: unrestricted, full list.
    expect(schemaObj.editTypesFilter(['integer'], true)(options)).toEqual(options);

    // No edit_types available: restricts down to nothing.
    expect(schemaObj.editTypesFilter(undefined, false)(options)).toEqual([]);

    // ERD is always unrestricted, regardless of edit_types/isNew.
    schemaObj.inErd = true;
    expect(schemaObj.editTypesFilter(['integer'], false)(options)).toEqual(options);
    schemaObj.inErd = false;
  });

  it('cltype - expanded Definition tab options match the inline grid-cell options', ()=>{
    let cltypeField = _.find(schemaObj.fields, (f)=>f.id === 'cltype');
    let options = [
      {label: 'integer', value: 'integer'},
      {label: 'text', value: 'text'},
      {label: 'boolean', value: 'boolean'},
    ];
    let row = {attnum: 1, edit_types: ['integer', 'boolean']};

    // Inline grid-cell editor.
    let cellResult = cltypeField.cell(row);
    let cellFiltered = cellResult.controlProps.filter(options);

    // Expanded Definition tab, as it is invoked once 'edit_types'/'attnum'
    // have been resolved against this row via deps (see MappedControl.jsx).
    let typeResult = cltypeField.type(row.cltype, [row.edit_types, row.attnum]);
    let typeFiltered = typeResult.controlProps.filter(options);

    expect(typeFiltered).toEqual(cellFiltered);
    expect(typeFiltered).toEqual([
      {label: 'integer', value: 'integer'},
      {label: 'boolean', value: 'boolean'},
    ]);
  });

  it('editableCheckForTable', ()=>{
    let state = {};
    schemaObj.nodeInfo = {};
    expect(schemaObj.editableCheckForTable(state)).toBe(true);
  });

  it('depChange', ()=>{
    schemaObj.datatypes = datatypes;
    let state = {cltype: 'numeric'};
    getFieldDepChange(schemaObj, 'collspcname')(state);

    expect(getFieldDepChange(schemaObj, 'attlen')(state)).toEqual({
      cltype: 'numeric',
      min_val_attlen: 1,
      max_val_attlen: 140391,
    });

    expect(getFieldDepChange(schemaObj, 'attprecision')(state)).toEqual({
      cltype: 'numeric',
      min_val_attprecision: -140391,
      max_val_attprecision: 140391,
    });
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.cltype = 'bigint';
    state.min_val_attlen = 5;
    state.max_val_attlen = 10;
    state.attlen = 3;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('attlen', 'Length/Precision should not be less than: 5');
    state.attlen = 11;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('attlen', 'Length/Precision should not be greater than: 10');

    state.attlen = 6;
    state.min_val_attprecision = 5;
    state.max_val_attprecision = 10;
    state.attprecision = 3;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('attprecision', 'Scale should not be less than: 5');
    state.attprecision = 11;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('attprecision', 'Scale should not be greater than: 10');

    state.attprecision = 6;
    state.colconstype = 'g';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('genexpr', 'Expression value cannot be empty.');

    state.attnum = 1;
    state.attidentity = 'a';
    state.colconstype = 'i';
    initializeSchemaWithData(schemaObj, {attidentity:'a'});

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqincrement', 'Increment value cannot be empty.');

    state.seqincrement = 1;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqmin', 'Minimum value cannot be empty.');

    state.seqmin = 1;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqmax', 'Maximum value cannot be empty.');

    state.seqmax = 1;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqcache', 'Cache value cannot be empty.');

    state.attnum = null;
    state.seqmin = null;
    state.seqmax = null;
    initializeSchemaWithData(schemaObj, {attidentity: undefined});
    expect(schemaObj.validate(state, setError)).toBe(false);

    state.seqmin = 3;
    state.seqmax = 2;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqmin', 'Minimum value must be less than maximum value.');

    state.seqmin = 3;
    state.seqmax = 5;
    state.seqstart = 2;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqstart', 'Start value cannot be less than minimum value.');

    state.seqstart = 6;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('seqstart', 'Start value cannot be greater than maximum value.');


    state.seqstart = 4;
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

