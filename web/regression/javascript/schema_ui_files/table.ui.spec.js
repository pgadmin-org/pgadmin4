/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import { SCHEMA_STATE_ACTIONS } from '../../../pgadmin/static/js/SchemaView';
import _ from 'lodash';
import { getNodeTableSchema, LikeSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import Notify from '../../../pgadmin/static/js/helpers/Notifier';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('TableSchema', ()=>{
  let mount;
  let schemaObj;
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue(Promise.resolve([]));
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue(Promise.resolve([]));
    schemaObj = getNodeTableSchema({
      server: {
        _id: 1,
      },
      schema: {
        _label: 'public',
      }
    }, {}, {
      Nodes: {table: {}},
      serverInfo: {
        1: {
          user: {
            name: 'Postgres',
          }
        }
      }
    });
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('getTableOid', ()=>{
    schemaObj.inheritedTableList = [
      {label: 'tab1', tid: 140391},
      {label: 'tab2', tid: 180191}
    ];
    expect(schemaObj.getTableOid('tab2')).toBe(180191);
  });

  it('canEditDeleteRowColumns', ()=>{
    expect(schemaObj.canEditDeleteRowColumns({inheritedfrom: 1234})).toBe(false);
    expect(schemaObj.canEditDeleteRowColumns({inheritedfrom: null})).toBe(true);
  });

  it('LikeSchema typname change', ()=>{
    let likeSchemaObj = new LikeSchema([]);
    /* Dummy */
    likeSchemaObj.top = new LikeSchema([]);
    let depResp = getFieldDepChange(likeSchemaObj, 'like_relation')({typname: 'type1'}, ['typname']);
    expect(depResp).toEqual({
      like_relation: null,
      like_default_value: false,
      like_constraints: false,
      like_indexes: false,
      like_storage: false,
      like_comments: false,
    });
  });

  describe('typname change', ()=>{
    let confirmSpy;
    let deferredDepChange;
    let oftypeColumns = [
      {name: 'id'}
    ];
    beforeEach(()=>{
      spyOn(schemaObj,'changeColumnOptions').and.callThrough();
      spyOn(schemaObj, 'getTableOid').and.returnValue(140391);
      confirmSpy = spyOn(Notify, 'confirm').and.callThrough();
      deferredDepChange = _.find(schemaObj.fields, (f)=>f.id=='typname')?.deferredDepChange;
      schemaObj.ofTypeTables = [
        {label: 'type1', oftype_columns: oftypeColumns}
      ];
    });

    let onDepChangeAction = (depChange, done)=> {
      expect(depChange()).toEqual({
        columns: oftypeColumns,
        primary_key: [],
        foreign_key: [],
        exclude_constraint: [],
        unique_constraint: [],
        partition_keys: [],
        partitions: [],
      });
      expect(schemaObj.changeColumnOptions).toHaveBeenCalledWith(oftypeColumns);
      done();
    };

    it('initial selection with OK', (done)=>{
      let state = {typname: 'type1'};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          typname: null,
        },
      });
      deferredPromise.then((depChange)=>{
        onDepChangeAction(depChange, done);
      });
      /* Press OK */
      confirmSpy.calls.argsFor(0)[2]();
    });

    it('initial selection with Cancel', (done)=>{
      let state = {typname: 'type1'};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          typname: null,
        },
      });
      deferredPromise.then((depChange)=>{
        expect(depChange()).toEqual({
          typname: null,
        });
        done();
      });
      /* Press Cancel */
      confirmSpy.calls.argsFor(0)[3]();
    });

    it('later selection', (done)=>{
      let state = {typname: 'type1'};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          typname: 'typeold',
        },
      });
      deferredPromise.then((depChange)=>{
        onDepChangeAction(depChange, done);
      });
    });

    it('empty', (done)=>{
      let state = {typname: null};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          typname: null,
        },
      });
      deferredPromise.then((depChange)=>{
        expect(depChange()).toBeUndefined();
        done();
      });
    });
  });

  describe('coll_inherits change', ()=>{
    let deferredDepChange;
    let inheritCol = {name: 'id'};
    let onRemoveAction = (depChange, state, done)=> {
      let finalCols = [{name: 'desc'}];
      expect(depChange(state)).toEqual({
        adding_inherit_cols: false,
        columns: finalCols,
      });
      expect(schemaObj.changeColumnOptions).toHaveBeenCalledWith(finalCols);
      done();
    };

    beforeEach(()=>{
      spyOn(schemaObj,'changeColumnOptions').and.callThrough();
      spyOn(schemaObj, 'getTableOid').and.returnValue(140391);
      spyOn(schemaObj, 'getColumns').and.returnValue(Promise.resolve([inheritCol]));
      deferredDepChange = _.find(schemaObj.fields, (f)=>f.id=='coll_inherits')?.deferredDepChange;
    });

    it('add first selection', (done)=>{
      let state = {columns: [], coll_inherits: ['table1']};
      let newCol = schemaObj.columnsSchema.getNewData(inheritCol);
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          coll_inherits: [],
        },
      });
      deferredPromise.then((depChange)=>{
        let finalCols = [newCol];
        expect(depChange(state)).toEqual({
          adding_inherit_cols: false,
          columns: finalCols,
        });
        expect(schemaObj.changeColumnOptions).toHaveBeenCalledWith(finalCols);
        done();
      });
    });

    it('add more', (done)=>{
      let newCol = schemaObj.columnsSchema.getNewData(inheritCol);
      let state = {columns: [newCol], coll_inherits: ['table1', 'table2']};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          coll_inherits: ['table1'],
        },
      });
      deferredPromise.then((depChange)=>{
        let finalCols = [newCol];
        expect(depChange(state)).toEqual({
          adding_inherit_cols: false,
          columns: [newCol],
        });
        expect(schemaObj.changeColumnOptions).toHaveBeenCalledWith(finalCols);
        done();
      });
    });

    it('remove one table', (done)=>{
      inheritCol.inheritedid = 140391;
      let newCol = schemaObj.columnsSchema.getNewData(inheritCol);
      let state = {columns: [{name: 'desc'}, newCol], coll_inherits: ['table1']};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          coll_inherits: ['table1', 'table2'],
        },
      });
      deferredPromise.then((depChange)=>{
        onRemoveAction(depChange, state, done);
      });
    });

    it('remove all', (done)=>{
      inheritCol.inheritedid = 140391;
      let newCol = schemaObj.columnsSchema.getNewData(inheritCol);
      let state = {columns: [{name: 'desc'}, newCol], coll_inherits: []};
      let deferredPromise = deferredDepChange(state, null, null, {
        oldState: {
          coll_inherits: ['table1'],
        },
      });
      deferredPromise.then((depChange)=>{
        onRemoveAction(depChange, state, done);
      });
    });
  });

  it('depChange', ()=>{
    spyOn(schemaObj, 'getTableOid').and.returnValue(140391);
    let state = {};

    state.is_partitioned = true;
    state.coll_inherits = ['table1'];
    expect(getFieldDepChange(schemaObj, 'coll_inherits')(state, ['is_partitioned'], null, {
      type: SCHEMA_STATE_ACTIONS.SET_VALUE,
      path: ['is_partitioned'],
    })).toEqual({
      coll_inherits: [],
    });

    spyOn(schemaObj, 'getServerVersion').and.returnValue(100000);
    schemaObj.constraintsObj.top = schemaObj;
    expect(getFieldDepChange(schemaObj.constraintsObj, 'primary_key')({is_partitioned: true})).toEqual({
      primary_key: []
    });
    expect(getFieldDepChange(schemaObj.constraintsObj, 'foreign_key')({is_partitioned: true})).toEqual({
      foreign_key: []
    });
    expect(getFieldDepChange(schemaObj.constraintsObj, 'unique_constraint')({is_partitioned: true})).toEqual({
      unique_constraint: []
    });
    expect(getFieldDepChange(schemaObj.constraintsObj, 'exclude_constraint')({is_partitioned: true})).toEqual({
      exclude_constraint: []
    });
  });

  it('validate', ()=>{
    let state = {is_partitioned: true};
    let setError = jasmine.createSpy('setError');

    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('partition_keys', 'Please specify at least one key for partitioned table.');

    state.partition_keys = [{key: 'id'}];
    expect(schemaObj.validate(state, setError)).toBe(false);
  });
});

