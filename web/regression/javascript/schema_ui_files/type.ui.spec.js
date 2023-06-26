/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { getNodePrivilegeRoleSchema } from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import TypeSchema, { EnumerationSchema, getCompositeSchema, getExternalSchema, getRangeSchema, getDataTypeSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/types/static/js/type.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('TypeSchema', ()=>{
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  describe('composite schema describe', () => {

    let compositeCollObj = getCompositeSchema({}, {server: {user: {name: 'postgres'}}}, {});
    let types = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric[]', length: true, min_val: 10, max_val: 100, precision: true, is_collatable: true}];
    let collations = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric[]'}];

    it('composite collection', async ()=>{
      jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
      jest.spyOn(compositeCollObj.fieldOptions, 'types').mockReturnValue(types);
      jest.spyOn(compositeCollObj.fieldOptions, 'collations').mockReturnValue(collations);
      await getCreateView(compositeCollObj);
      await getEditView(compositeCollObj, getInitData);
    });

    it('composite validate', () => {
      let state = { typtype: 'b' }; //validating for ExternalSchema which is distinguish as r
      let setError = jest.fn();
      compositeCollObj.top = {
        'sessData': { 'typtype':'c' }
      };

      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('member_name', 'Please specify the value for member name.');

      state.member_name = 'demo_member';
      compositeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('type', 'Please specify the type.');
    });

    it('tlength editable', ()=>{
      compositeCollObj.type_options = types;
      let editable = _.find(compositeCollObj.fields, (f)=>f.id=='tlength').editable;
      let status = editable({type: 'numeric[]'});
      expect(status).toBe(true);
    });

    it('precision editable', ()=>{
      compositeCollObj.type_options = types;
      let editable = _.find(compositeCollObj.fields, (f)=>f.id=='precision').editable;
      let status = editable({type: 'numeric[]'});
      expect(status).toBe(true);
    });

    it('collation editable', ()=>{
      compositeCollObj.type_options = types;
      let editable = _.find(compositeCollObj.fields, (f)=>f.id=='collation').editable;
      let status = editable({type: 'numeric[]'});
      expect(status).toBe(true);
    });

    it('setTypeOptions', ()=>{
      compositeCollObj.setTypeOptions(types);
    });
  });

  describe('enumeration schema describe', () => {

    it('enumeration collection', async ()=>{

      let enumerationCollObj = new EnumerationSchema(
        ()=>[],
        ()=>[]
      );

      await getCreateView(enumerationCollObj);
      await getEditView(enumerationCollObj, getInitData);
    });
  });

  describe('external schema describe', () => {

    let externalCollObj = getExternalSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('external collection', async ()=>{

      jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
      jest.spyOn(externalCollObj.fieldOptions, 'externalFunctionsList').mockReturnValue([{ label: '', value: ''}, { label: 'lb1', cbtype: 'typmodin', value: 'val1'}, { label: 'lb2', cbtype: 'all', value: 'val2'}]);
      jest.spyOn(externalCollObj.fieldOptions, 'types').mockReturnValue([{ label: '', value: ''}]);

      await getCreateView(externalCollObj);
      await getEditView(externalCollObj, getInitData);
    });

    it('external validate', () => {
      let state = { typtype: 'b' }; //validating for ExternalSchema which is distinguish as r
      let setError = jest.fn();

      externalCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typinput', 'Input function cannot be empty');

      state.typinput = 'demo_input';
      externalCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typoutput', 'Output function cannot be empty');
    });
  });

  describe('range schema describe', () => {

    let rangeCollObj = getRangeSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('range collection', async ()=>{

      jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
      jest.spyOn(rangeCollObj.fieldOptions, 'getSubOpClass').mockReturnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      jest.spyOn(rangeCollObj.fieldOptions, 'getCanonicalFunctions').mockReturnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      jest.spyOn(rangeCollObj.fieldOptions, 'getSubDiffFunctions').mockReturnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      jest.spyOn(rangeCollObj.fieldOptions, 'typnameList').mockReturnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      jest.spyOn(rangeCollObj.fieldOptions, 'collationsList').mockReturnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);

      await getCreateView(rangeCollObj);
      await getEditView(rangeCollObj, getInitData);
    });

    it('range validate', () => {
      let state = { typtype: 'r' }; //validating for RangeSchema which is distinguish as r
      let setError = jest.fn();

      rangeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typname', 'Subtype cannot be empty');
    });
  });

  describe('data type schema describe', () => {

    let dataTypeObj = getDataTypeSchema({}, {server: {user: {name: 'postgres'}}}, {});
    let types = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric', length: true, min_val: 10, max_val: 100, precision: true}];

    it('data type collection', async ()=>{

      jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
      await getCreateView(dataTypeObj);
      await getEditView(dataTypeObj, getInitData);
    });

    it('tlength editable', ()=>{
      dataTypeObj.type_options = types;
      let editable = _.find(dataTypeObj.fields, (f)=>f.id=='tlength').editable;
      let status = editable({type: 'numeric', type_options: types});
      expect(status).toBe(true);
    });

    it('tlength disabled', ()=>{
      dataTypeObj.type_options = types;
      let disabled = _.find(dataTypeObj.fields, (f)=>f.id=='tlength').disabled;
      let status = disabled({type: 'numeric', type_options: types});
      expect(status).toBe(false);
    });

    it('precision editable', ()=>{
      dataTypeObj.type_options = types;
      let editable = _.find(dataTypeObj.fields, (f)=>f.id=='precision').editable;
      let status = editable({type: 'numeric', type_options: types});
      expect(status).toBe(true);
    });

    it('precision disabled', ()=>{
      dataTypeObj.type_options = types;
      let disabled = _.find(dataTypeObj.fields, (f)=>f.id=='precision').disabled;
      let status = disabled({type: 'numeric', type_options: types});
      expect(status).toBe(false);
    });
  });

  let typeSchemaObj = new TypeSchema(
    (privileges)=>getNodePrivilegeRoleSchema({}, {server: {user: {name: 'postgres'}}}, {}, privileges),
    ()=>getCompositeSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    ()=>getRangeSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    ()=>getExternalSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    ()=>getDataTypeSchema({}, {server: {user: {name: 'postgres'}}}, {}),
    {
      roles: ()=>[],
      schemas: ()=>[{ label: 'pg_demo', value: 'pg_demo'}],
      server_info: [],
      node_info: {'schema': []}
    },
    {
      typowner: 'postgres',
      schema: 'public',
      typtype: 'c'
    }
  );

  it('create', async ()=>{
    await getCreateView(typeSchemaObj);
  });

  it('edit', async ()=>{
    await getEditView(typeSchemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(typeSchemaObj, getInitData);
  });
});
