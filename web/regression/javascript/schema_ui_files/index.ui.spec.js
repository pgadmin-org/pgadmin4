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
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import IndexSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/indexes/static/js/index.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class SchemaInColl extends BaseUISchema {
  constructor(indexSchemaObj) {
    super();
    this.indexSchemaObj = indexSchemaObj;
  }

  get baseFields() {
    return [{
      id: 'collection', label: '', type: 'collection',
      schema: this.indexSchemaObj,
      editable: false,
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      columns : ['name', 'consrc'],
    }];
  }
}

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('IndexSchema', ()=>{
  let mount;
  let indexSchemaObj;
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue(Promise.resolve([]));
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue(Promise.resolve([]));
    indexSchemaObj = new IndexSchema(
      {
        tablespaceList: ()=>[],
        amnameList : ()=>[{label:'abc', value:'abc'}],
        columnList: ()=>[{label:'abc', value:'abc'}],
        collationList: ()=>[{label:'abc', value:'abc'}],
        opClassList: ()=>[{label:'abc', value:'abc'}]
      },
      {
        node_info: {'server': { 'version': 110000} }
      },
      {
        amname: 'btree'
      }
    );
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(indexSchemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(indexSchemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(indexSchemaObj, getInitData));
  });

  it('create collection', ()=>{
    let schemaCollObj = new SchemaInColl(indexSchemaObj);
    let ctrl = mount(getCreateView(schemaCollObj));
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });

  it('changeColumnOptions', ()=>{
    spyOn(indexSchemaObj.indexHeaderSchema, 'changeColumnOptions').and.callThrough();
    let columns = [{label: 'label', value: 'value'}];
    indexSchemaObj.changeColumnOptions(columns);
    expect(indexSchemaObj.indexHeaderSchema.changeColumnOptions).toHaveBeenCalledWith(columns);
  });

  describe('IndexColHeaderSchema', ()=>{
    it('getNewData', ()=>{
      indexSchemaObj.indexHeaderSchema.columnOptions = [
        {label: 'id', value: 'id'},
        {label: 'name', value: 'name'}
      ];
      spyOn(indexSchemaObj.indexColumnSchema, 'getNewData');
      indexSchemaObj.indexHeaderSchema.getNewData({
        is_exp: false,
        colname: 'id',
        expression: null,
      });
      expect(indexSchemaObj.indexColumnSchema.getNewData).toHaveBeenCalledWith({
        is_exp: false,
        colname: 'id',
      });

      indexSchemaObj.indexHeaderSchema.getNewData({
        is_exp: true,
        colname: null,
        expression: 'abc',
      });
      expect(indexSchemaObj.indexColumnSchema.getNewData).toHaveBeenCalledWith({
        is_exp: true,
        colname: 'abc',
      });
    });
  });

  describe('IndexColumnSchema', ()=>{
    it('column schema colname editable', ()=>{
      indexSchemaObj.indexColumnSchema._top = {
        _sessData: { amname: 'btree' }
      };
      let cell = _.find(indexSchemaObj.indexColumnSchema.fields, (f)=>f.id=='op_class').cell;
      cell();
    });

    it('column schema sort_order depChange', ()=>{
      let topState = { amname: 'btree' };
      let depChange = _.find(indexSchemaObj.indexColumnSchema.fields, (f)=>f.id=='sort_order').depChange;

      let state = { sort_order: true };
      depChange(state, {}, topState, { oldState: { sort_order: false } });

      state.sort_order = false;
      topState.amname = 'abc';
      depChange(state, {}, topState, { oldState: { sort_order: false } });
      expect(state.is_sort_nulls_applicable).toBe(false);
    });

    it('column schema sort_order editable', ()=>{
      indexSchemaObj.indexColumnSchema._top = {
        _sessData: { amname: 'btree' }
      };
      let state = {};
      spyOn(indexSchemaObj.indexColumnSchema, 'inSchemaWithModelCheck').and.returnValue(true);
      let editable = _.find(indexSchemaObj.indexColumnSchema.fields, (f)=>f.id=='sort_order').editable;
      let status = editable(state);
      expect(status).toBe(false);

      spyOn(indexSchemaObj.indexColumnSchema, 'inSchemaWithModelCheck').and.returnValue(false);
      status = editable(state);
      expect(status).toBe(true);

      indexSchemaObj.indexColumnSchema._top._sessData.amname = 'abc';
      status = editable(state);
      expect(status).toBe(false);
    });

    it('column schema nulls editable', ()=>{
      indexSchemaObj.indexColumnSchema._top = {
        _sessData: { amname: 'btree' }
      };
      let state = {};
      spyOn(indexSchemaObj.indexColumnSchema, 'inSchemaWithModelCheck').and.returnValue(true);
      let editable = _.find(indexSchemaObj.indexColumnSchema.fields, (f)=>f.id=='nulls').editable;
      let status = editable(state);
      expect(status).toBe(false);

      spyOn(indexSchemaObj.indexColumnSchema, 'inSchemaWithModelCheck').and.returnValue(false);
      status = editable(state);
      expect(status).toBe(true);

      indexSchemaObj.indexColumnSchema._top._sessData.amname = 'abc';
      status = editable(state);
      expect(status).toBe(false);
    });

    it('column schema setOpClassTypes', ()=>{
      indexSchemaObj.indexColumnSchema._top = {
        _sessData: { amname: 'btree' }
      };
      let options = [];
      indexSchemaObj.indexColumnSchema.op_class_types = [];
      let status = indexSchemaObj.indexColumnSchema.setOpClassTypes(options);
      expect(status).toEqual([]);

      indexSchemaObj.indexColumnSchema.op_class_types = [];
      options.push({label: '', value: ''});
      indexSchemaObj.indexColumnSchema.setOpClassTypes(options);
      expect(indexSchemaObj.indexColumnSchema.op_class_types.length).toBe(1);
    });

  });

  it('depChange', ()=>{
    let state = {};
    expect(getFieldDepChange(indexSchemaObj, 'description')(state)).toEqual({
      comment: '',
    });
  });

  it('columns formatter', ()=>{
    let formatter = _.find(indexSchemaObj.fields, (f)=>f.id=='columns').cell().controlProps.formatter;
    expect(formatter.fromRaw([{
      colname: 'lid',
    },{
      colname: 'rid',
    }])).toBe('lid, rid');

    expect(formatter.fromRaw([])).toBe('');
  });

  it('validate', ()=>{
    let state = { columns: [] };
    let setError = jasmine.createSpy('setError');

    indexSchemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('columns', 'You must specify at least one column/expression.');

    state.columns.push({});
    let status = indexSchemaObj.validate(state, setError);
    expect(status).toBe(null);
  });
});

