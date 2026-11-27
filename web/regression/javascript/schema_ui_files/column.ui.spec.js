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

  it('attlen/attprecision editable - column already inherited from a parent table (inheritedfromtable only)', ()=>{
    // A loaded row can carry only inheritedfromtable, with no
    // inheritedfrom (issue #10179, case 1). The attlen/attprecision
    // editable checks must honour that case too, not just the
    // interactively-added 'inheritedfrom' case.
    schemaObj.datatypes = datatypes;
    let attlenField = _.find(schemaObj.fields, (f)=>f.id === 'attlen');
    let attprecisionField = _.find(schemaObj.fields, (f)=>f.id === 'attprecision');

    let varcharState = {cltype: 'character varying', inheritedfromtable: 'public.parent'};
    expect(attlenField.editable(varcharState)).toBe(false);

    let numericState = {cltype: 'numeric', inheritedfromtable: 'public.parent'};
    expect(attprecisionField.editable(numericState)).toBe(false);

    // Sanity check: without inheritance, they remain editable when the
    // data type supports length/precision.
    expect(attlenField.editable({cltype: 'character varying'})).toBe(true);
    expect(attprecisionField.editable({cltype: 'numeric'})).toBe(true);
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

  it('name - trims leading and trailing whitespace on blur', ()=>{
    let nameField = _.find(schemaObj.fields, (f)=>f.id === 'name');
    expect(nameField.controlProps?.trimOnBlur).toBe(true);
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

  describe('notnull_notvalid', ()=>{
    const getField = (schema)=>_.find(schema.fields, (f)=>f.id=='notnull_notvalid');
    const pg18Table = ()=>({server: {version: 180000}, schema: {}, table: {}});

    it.each([
      ['an existing table on PostgreSQL 18', pg18Table(), null, false, true],
      ['an existing table on PostgreSQL 17', {server: {version: 170000}, schema: {}, table: {}}, null, false, false],
      ['the Create Table dialog', {server: {version: 180000}, schema: {}}, {isNew: ()=>true}, false, false],
      ['a table being created under a table node', pg18Table(), {isNew: ()=>true}, false, false],
      ['the Edit Table dialog', pg18Table(), {isNew: ()=>false}, false, true],
      ['the ERD tool', undefined, null, true, false],
    ])('is offered for %s', (_desc, nodeInfo, top, inErd, expected)=>{
      let schema = createSchemaObj();
      schema.nodeInfo = nodeInfo;
      schema.top = top;
      schema.inErd = inErd;
      expect(schema.canNotNullBeNotValid()).toBe(expected);
      expect(getField(schema).visible()).toBe(expected);
    });

    it('is cleared when Not NULL is turned off or the column is an identity', ()=>{
      let depChange = getField(createSchemaObj()).depChange;
      expect(depChange({attnotnull: false, notnull_notvalid: true})).toEqual({notnull_notvalid: false});
      expect(depChange({attnotnull: true, colconstype: 'i', notnull_notvalid: true})).toEqual({notnull_notvalid: false});
      expect(depChange({attnotnull: true, colconstype: 'n', notnull_notvalid: true})).toBeUndefined();
    });

    it.each([
      ['a new column without Not NULL', {}, {attnotnull: false}, true],
      ['a new column with Not NULL', {}, {attnotnull: true}, false],
      ['a new identity column', {}, {attnotnull: true, colconstype: 'i'}, true],
      ['an existing column getting Not NULL', {attnum: 1, attnotnull: false}, {attnum: 1, attnotnull: true}, false],
      ['an existing validated Not NULL', {attnum: 1, attnotnull: true, notnull_notvalid: false}, {attnum: 1, attnotnull: true}, true],
      ['an existing NOT VALID Not NULL', {attnum: 1, attnotnull: true, notnull_notvalid: true}, {attnum: 1, attnotnull: true, notnull_notvalid: false}, false],
    ])('readonly in the column dialog for %s', (_desc, origData, state, expected)=>{
      let schema = createSchemaObj();
      schema.nodeInfo = pg18Table();
      initializeSchemaWithData(schema, origData);
      expect(getField(schema).readonly(state)).toBe(expected);
    });

    it('readonly in the table dialog follows the row as it was loaded', ()=>{
      let schema = createSchemaObj();
      schema.nodeInfo = pg18Table();
      schema.top = {
        isNew: ()=>false,
        origData: {columns: [
          {cid: 'nn1', attnum: 1, attnotnull: true, notnull_notvalid: false},
          {cid: 'nn2', attnum: 2, attnotnull: true, notnull_notvalid: true},
        ]},
      };
      let readonly = getField(schema).readonly;
      expect(readonly({cid: 'nn1', attnum: 1, attnotnull: true})).toBe(true);
      expect(readonly({cid: 'nn2', attnum: 2, attnotnull: true, notnull_notvalid: false})).toBe(false);
    });
  });

  describe('notnull_noinherit', ()=>{
    const getField = (schema)=>_.find(schema.fields, (f)=>f.id=='notnull_noinherit');
    const pg18Table = ()=>({server: {version: 180000}, schema: {}, table: {}});

    it.each([
      ['an existing table on PostgreSQL 18', pg18Table(), null, false, true],
      ['an existing table on PostgreSQL 17', {server: {version: 170000}, schema: {}, table: {}}, null, false, false],
      ['a partitioned table', {server: {version: 180000}, schema: {}, table: {is_partitioned: true}}, null, false, false],
      ['a partition that is itself partitioned', {server: {version: 180000}, schema: {}, table: {}, partition: {is_partitioned: true}}, null, false, false],
      ['a foreign table', {server: {version: 180000}, schema: {}, foreign_table: {}}, null, false, false],
      ['the Create Table dialog', {server: {version: 180000}, schema: {}}, {sessData: {is_partitioned: false}}, false, true],
      ['the Create Table dialog for a partitioned table', {server: {version: 180000}, schema: {}}, {sessData: {is_partitioned: true}}, false, false],
      ['the ERD tool', undefined, null, true, false],
    ])('is offered for %s', (_desc, nodeInfo, top, inErd, expected)=>{
      let schema = createSchemaObj();
      schema.nodeInfo = nodeInfo;
      schema.top = top;
      schema.inErd = inErd;
      expect(schema.canNotNullBeNoInherit()).toBe(expected);
      expect(getField(schema).visible()).toBe(expected);
    });

    it('is cleared when Not NULL is turned off or a new column rejects it', ()=>{
      let schema = createSchemaObj();
      schema.nodeInfo = pg18Table();
      initializeSchemaWithData(schema, {});
      let depChange = getField(schema).depChange;
      expect(depChange({attnotnull: false, notnull_noinherit: true})).toEqual({notnull_noinherit: false});
      expect(depChange({attnotnull: true, colconstype: 'i', notnull_noinherit: true})).toEqual({notnull_noinherit: false});
      expect(depChange({attnotnull: true, cltype: 'serial', notnull_noinherit: true})).toEqual({notnull_noinherit: false});
      expect(depChange({attnotnull: true, is_primary_key: true, notnull_noinherit: true})).toEqual({notnull_noinherit: false});
      expect(depChange({attnotnull: true, cltype: 'integer', notnull_noinherit: true})).toBeUndefined();
      // An existing SERIAL column's constraint can be altered.
      expect(depChange({attnum: 1, attnotnull: true, cltype: 'serial', notnull_noinherit: true})).toBeUndefined();
    });

    it.each([
      ['a new column without Not NULL', {}, {attnotnull: false}, true],
      ['a new column with Not NULL', {}, {attnotnull: true, cltype: 'integer'}, false],
      ['a new identity column', {}, {attnotnull: true, colconstype: 'i'}, true],
      ['a new SERIAL column', {}, {attnotnull: true, cltype: 'bigserial'}, true],
      ['a new primary key column', {}, {attnotnull: true, is_primary_key: true}, true],
      ['an existing Not NULL', {attnum: 1, attnotnull: true}, {attnum: 1, attnotnull: true}, false],
      ['an existing SERIAL column', {attnum: 1, attnotnull: true, cltype: 'serial'}, {attnum: 1, attnotnull: true, cltype: 'serial'}, false],
      ['an inherited Not NULL', {attnum: 1, attnotnull: true, notnull_inherited: true}, {attnum: 1, attnotnull: true}, true],
    ])('readonly in the column dialog for %s', (_desc, origData, state, expected)=>{
      let schema = createSchemaObj();
      schema.nodeInfo = pg18Table();
      initializeSchemaWithData(schema, origData);
      expect(getField(schema).readonly(state)).toBe(expected);
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

