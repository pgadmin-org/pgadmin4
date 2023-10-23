/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import ForeignTableSchema, { ColumnSchema, CheckConstraintSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/foreign_tables/static/js/foreign_table.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('ForeignTableSchema', ()=>{

  let schemaObj = new ForeignTableSchema(
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    ()=>new MockSchema(),
    {
      role: [],
      schema: [],
      foreignServers: [],
      tables: [],
      nodeData: {},
      pgBrowser: {},
      nodeInfo: {
        schema: {},
        server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
        table: {}
      }
    }
  );
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();

    state.ftsrvname = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('ftsrvname', 'Foreign server cannot be empty.');

    state.ftsrvname = 'public';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('ftsrvname', null);
  });

  it('column canEditRow', ()=>{
    let state = {};
    let canEditRow = _.find(schemaObj.fields, (f)=>f.id=='columns').canEditRow;
    let status = canEditRow(state);
    expect(status).toBe(true);

    let colstate = { inheritedfrom: ['public'] };
    status = canEditRow(colstate);
    expect(status).toBe(false);
  });

  it('constraints canDeleteRow', ()=>{
    let state = {};
    let canEditRow = _.find(schemaObj.fields, (f)=>f.id=='constraints').canDeleteRow;
    let status = canEditRow(state);
    expect(status).toBe(true);

    let colstate = { conislocal: true };
    status = canEditRow(colstate);
    expect(status).toBe(true);
  });

  it('constraints canEditRow', ()=>{
    let state = {};
    let canEditRow = _.find(schemaObj.fields, (f)=>f.id=='constraints').canEditRow;
    let status = canEditRow(state);
    expect(status).toBe(true);
  });

  it('getTableOid', ()=>{
    schemaObj.inheritedTableList = [
      {label: 'tab1', value: 12345},
      {label: 'tab2', value: 123456}
    ];
    expect(schemaObj.getTableOid(123456)).toBe(123456);
  });


  describe('inherits change', ()=>{
    let deferredDepChange;
    let inheritCol = {name: 'id'};
    let addInheritCols = (depChange, state, done)=> {
      let finalCols = [{name: 'desc'}];
      expect(depChange(state)).toEqual({
        adding_inherit_cols: false,
        columns: finalCols,
      });
      done();
    };

    beforeEach(()=>{
      jest.spyOn(schemaObj, 'getTableOid').mockReturnValue(123456);
      jest.spyOn(schemaObj, 'getColumns').mockReturnValue(Promise.resolve([inheritCol]));
      deferredDepChange = _.find(schemaObj.fields, (f)=>f.id=='inherits')?.deferredDepChange;
    });

    it('add first selection', (done)=>{
      let state = {columns: [], inherits: ['table1']};
      let newCol = schemaObj.columnsObj.getNewData(inheritCol);
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          inherits: [],
        },
      });
      deferredPromise.then((depChange)=>{
        let finalCols = [newCol];
        expect(depChange(state)).toEqual({
          adding_inherit_cols: false,
          columns: finalCols,
        });
        done();
      });
    });
    it('remove one table', (done)=>{
      inheritCol.inheritedid = 123456;
      let newCol = schemaObj.getNewData(inheritCol);
      let state = {columns: [{name: 'desc'}, newCol], inherits: ['table1']};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          inherits: ['table1', 'table2'],
        },
      });
      deferredPromise.then((depChange)=>{
        addInheritCols(depChange, state, done);
      });
    });

    it('remove all', (done)=>{
      inheritCol.inheritedid = 140391;
      let state = {columns: [{name: 'desc'}], inherits: []};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          inherits: ['table1'],
        },
      });
      deferredPromise.then((depChange)=>{
        addInheritCols(depChange, state, done);
      });
    });
  });

});


describe('ForeignTableColumnSchema', ()=>{

  let schemaObj = new ColumnSchema(
    {},
    ()=>new MockSchema(),
    {
      schema: {},
      server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90400},
      table: {}
    },
    [{is_collatable: false, label: '"char"', value: '"char"', length: true, max_val: 0, min_val: 0, precision: true, typval: ' '}],
    ()=>[],
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('column editable', ()=>{
    let state = {};
    let editable = _.find(schemaObj.fields, (f)=>f.id=='name').editable;
    let status = editable(state);
    expect(status).toBe(true);
  });

  it('typdefault_edit', async ()=>{
    let defaultSchemaObj = new ForeignTableSchema(
      ()=>new MockSchema(),
      ()=>new MockSchema(),
      ()=>new MockSchema(),
      {
        role: [],
        schema: [],
        foreignServers: [],
        tables: [],
        nodeData: {},
        pgBrowser: {},
        nodeInfo: {
          schema: {},
          server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90000},
          table: {}
        }
      }
    );

    let initData = ()=>Promise.resolve({typlen: 1, inheritedid: 1, inheritedfrom: 'public'});

    await getEditView(defaultSchemaObj, initData);
  });



  it('attstattarget', async ()=>{
    let defaultSchemaObj = new ForeignTableSchema(
      ()=>new MockSchema(),
      ()=>new MockSchema(),
      ()=>new MockSchema(),
      {
        role: [],
        schema: [],
        foreignServers: [],
        tables: [],
        nodeData: {},
        pgBrowser: {},
        nodeInfo: {
          schema: {},
          server: {user: {name:'postgres', id:0}, server_type: 'pg', version: 90000},
          table: {}
        }
      }
    );

    let initData = ()=>Promise.resolve({
      precision: null,
      typlen: 1,
      inheritedid: 1,
      inheritedfrom: 'public',

    });

    await getEditView(defaultSchemaObj, initData);
  });

});


describe('ForeignTableCheckConstraint', ()=>{

  let schemaObj = new CheckConstraintSchema();
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('conname editable', ()=>{
    let state = {};
    let editable = _.find(schemaObj.fields, (f)=>f.id=='conname').editable;
    let status = editable(state);
    expect(status).toBe(true);
  });

  it('consrc editable', ()=>{
    let state = {};
    let editable = _.find(schemaObj.fields, (f)=>f.id=='consrc').editable;
    let status = editable(state);
    expect(status).toBe(true);
  });

  it('connoinherit editable', ()=>{
    let state = {};
    let editable = _.find(schemaObj.fields, (f)=>f.id=='connoinherit').editable;
    let status = editable(state);
    expect(status).toBe(true);
  });

  it('convalidated editable', ()=>{
    let state = {};
    let editable = _.find(schemaObj.fields, (f)=>f.id=='convalidated').editable;
    let status = editable(state);
    expect(status).toBe(true);

    jest.spyOn(schemaObj, 'isNew').mockReturnValue(false);
    editable = _.find(schemaObj.fields, (f)=>f.id=='convalidated').editable;
    status = editable(state);
    expect(status).toBe(true);
  });
});
