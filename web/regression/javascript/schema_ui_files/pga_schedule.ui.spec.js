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
import PgaJobScheduleSchema, { ExceptionsSchema } from '../../../pgadmin/browser/server_groups/servers/pgagent/schedules/static/js/pga_schedule.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PgaJobScheduleSchema', ()=>{
  let mount;
  let schemaObj = new PgaJobScheduleSchema([], {
    jscweekdays:[true,true,true,true,false,false,true],
    jscexceptions:[{'jexid':81,'jexdate':'2021-08-05','jextime':'12:55:00'},{'jexid':83,'jexdate':'2021-08-17','jextime':'20:00:00'}],
  });
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

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

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

describe('ExceptionsSchema', ()=>{
  let mount;
  let schemaObj = new ExceptionsSchema();
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

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('validate', ()=>{
    let state = {};
    let setError = jasmine.createSpy('setError');

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

