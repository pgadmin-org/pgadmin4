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
import EventTriggerSchema from '../../../pgadmin/browser/server_groups/servers/databases/event_triggers/static/js/event_trigger.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('EventTriggerSchema', ()=>{
  let mount;
  let schemaObj = new EventTriggerSchema(
    {
      role: ()=>[],
      function_names: ()=>[],
    },
    {
      eventowner: 'postgres'
    }
  );
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

    state.eventfunname = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('eventfunname', 'Event trigger function cannot be empty.');

    state.eventfunname = 'Test';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('eventfunname', null);

    state.service = 'Test';
    state.eventfunname = 'Test';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('eventfunname', null);

  });
});

