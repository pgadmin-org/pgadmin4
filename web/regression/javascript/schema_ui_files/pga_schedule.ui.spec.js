/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import PgaJobScheduleSchema, { ExceptionsSchema } from '../../../pgadmin/browser/server_groups/servers/pgagent/schedules/static/js/pga_schedule.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';
import { initializeSchemaWithData } from './utils';

describe('PgaJobScheduleSchema', ()=>{

  const createSchemaObject = () => new PgaJobScheduleSchema([], {
    jscweekdays:[true,true,true,true,false,false,true],
    jscexceptions:[
      {'jexid':81,'jexdate':'2021-08-05','jextime':'12:55:00'},
      {'jexid':83,'jexdate':'2021-08-17','jextime':'20:00:00'}
    ],
  });
  let getInitData = () => Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async () => {
    await getCreateView(createSchemaObject());
  });

  it('edit', async () => {
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async () => {
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  it('validate', () => {
    let schemaObj = createSchemaObject();
    initializeSchemaWithData(schemaObj, {});
    let state = {};
    let setError = jest.fn();

    state.jscstart = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jscstart', 'Please enter the start time.');

    state.jscstart = '2021-08-04 12:35:00+05:30';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jscstart', null);

    state.jscend = '2021-08-04 11:35:00+05:30';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jscend', 'Start time must be less than end time');

    state.jscend = '2021-08-04 15:35:00+05:30';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jscend', null);
  });
});

describe('ExceptionsSchema', () => {

  const createSchemaObject = () => new ExceptionsSchema();
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async () => {
    await getCreateView(createSchemaObject());
  });

  it('edit', async () => {
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async () => {
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  it('validate', () => {
    let schemaObj = createSchemaObject();
    initializeSchemaWithData(schemaObj, {});
    let state = {};
    let setError = jest.fn();

    state.jexdate = '<any>';
    state.jextime = '<any>';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jscdate', 'Please specify date/time.');

    state.jexdate = '2021-08-04';
    state.jextime = '12:35';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('jscdate', null);
  });
});
