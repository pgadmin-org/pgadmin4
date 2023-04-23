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
import { getNodePrivilegeRoleSchema } from '../../../pgadmin/browser/server_groups/servers/static/js/privilege.ui';
import TypeSchema, { EnumerationSchema, getCompositeSchema, getExternalSchema, getRangeSchema, getDataTypeSchema } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/types/static/js/type.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('TypeSchema', ()=>{

  let mount;
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  describe('composite schema describe', () => {

    let compositeCollObj = getCompositeSchema({}, {server: {user: {name: 'postgres'}}}, {});
    let types = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric[]', length: true, min_val: 10, max_val: 100, precision: true, is_collatable: true}];
    let collations = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric[]'}];

    it('composite collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(compositeCollObj.fieldOptions, 'types').and.returnValue(types);
      spyOn(compositeCollObj.fieldOptions, 'collations').and.returnValue(collations);

      spyOn(compositeCollObj, 'type_options').and.returnValue(compositeCollObj.fieldOptions.types());

      mount(getCreateView(compositeCollObj));
      mount(getEditView(compositeCollObj, getInitData));
    });

    it('composite validate', () => {
      let state = { typtype: 'b' }; //validating for ExternalSchema which is distinguish as r
      let setError = jasmine.createSpy('setError');
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

    it('enumeration collection', ()=>{

      let enumerationCollObj = new EnumerationSchema(
        ()=>[],
        ()=>[]
      );

      mount(getCreateView(enumerationCollObj));
      mount(getEditView(enumerationCollObj, getInitData));
    });
  });

  describe('external schema describe', () => {

    let externalCollObj = getExternalSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('external collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(externalCollObj.fieldOptions, 'externalFunctionsList').and.returnValue([{ label: '', value: ''}, { label: 'lb1', cbtype: 'typmodin', value: 'val1'}, { label: 'lb2', cbtype: 'all', value: 'val2'}]);
      spyOn(externalCollObj.fieldOptions, 'types').and.returnValue([{ label: '', value: ''}]);

      mount(getCreateView(externalCollObj));
      mount(getEditView(externalCollObj, getInitData));
    });

    it('external validate', () => {
      let state = { typtype: 'b' }; //validating for ExternalSchema which is distinguish as r
      let setError = jasmine.createSpy('setError');

      externalCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typinput', 'Input function cannot be empty');

      state.typinput = 'demo_input';
      externalCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typoutput', 'Output function cannot be empty');
    });
  });

  describe('range schema describe', () => {

    let rangeCollObj = getRangeSchema({}, {server: {user: {name: 'postgres'}}}, {});

    it('range collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      spyOn(rangeCollObj.fieldOptions, 'getSubOpClass').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'getCanonicalFunctions').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'getSubDiffFunctions').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'typnameList').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);
      spyOn(rangeCollObj.fieldOptions, 'collationsList').and.returnValue([{ label: '', value: ''}, { label: 'lb1', value: 'val1'}]);

      mount(getCreateView(rangeCollObj));
      mount(getEditView(rangeCollObj, getInitData));
    });

    it('range validate', () => {
      let state = { typtype: 'r' }; //validating for RangeSchema which is distinguish as r
      let setError = jasmine.createSpy('setError');

      rangeCollObj.validate(state, setError);
      expect(setError).toHaveBeenCalledWith('typname', 'Subtype cannot be empty');
    });
  });

  describe('data type schema describe', () => {

    let dataTypeObj = getDataTypeSchema({}, {server: {user: {name: 'postgres'}}}, {});
    let types = [{ label: '', value: ''}, { label: 'lb1', value: 'numeric', length: true, min_val: 10, max_val: 100, precision: true}];

    it('data type collection', ()=>{

      spyOn(nodeAjax, 'getNodeAjaxOptions').and.returnValue([]);
      mount(getCreateView(dataTypeObj));
      mount(getEditView(dataTypeObj, getInitData));
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

  it('create', ()=>{
    mount(getCreateView(typeSchemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(typeSchemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(typeSchemaObj, getInitData));
  });
});
