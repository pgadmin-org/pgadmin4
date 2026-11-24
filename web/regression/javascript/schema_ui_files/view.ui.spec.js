/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import ViewSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/view.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';
import { initializeSchemaWithData } from './utils';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('ViewSchema', ()=>{

  let schemaObj; 
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    schemaObj = new ViewSchema(
      ()=>new MockSchema(),
      {server: {server_type: 'pg'}},
      {
        role: ()=>[],
        schema: ()=>[],
      },
      {
        owner: 'postgres',
        schema: 'public'
      }
    );
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
    initializeSchemaWithData(schemaObj, {});

    state.definition = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', 'Please enter view code.');

    state.definition = 'SELECT 1;';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.service = 'Test';
    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

  });

  describe('getWarningText', ()=>{
    let willDropView;

    beforeEach(()=>{
      willDropView = jest.fn(()=>Promise.resolve(false));
      schemaObj.fieldOptions.willDropView = willDropView;
      initializeSchemaWithData(schemaObj, {oid: 1, definition: 'SELECT 1 AS a;'});
    });

    it('does not ask the server when the definition is unchanged', ()=>{
      expect(schemaObj.getWarningText({comment: 'x'})).toBeNull();
      expect(schemaObj.getWarningText({definition: 'SELECT 1 AS a;'})).toBeNull();
      expect(willDropView).not.toHaveBeenCalled();
    });

    it('does not ask the server when creating a view', ()=>{
      initializeSchemaWithData(schemaObj, {});
      expect(schemaObj.getWarningText({definition: 'SELECT 2 AS a;'})).toBeNull();
      expect(willDropView).not.toHaveBeenCalled();
    });

    it('does not ask the server for EPAS', ()=>{
      schemaObj.nodeInfo = {server: {server_type: 'ppas'}};
      expect(schemaObj.getWarningText({definition: 'SELECT 2 AS a;'})).toBeNull();
      expect(willDropView).not.toHaveBeenCalled();
    });

    it('does not warn when the server will replace the view', async ()=>{
      const changes = {definition: 'SELECT 2 AS a;'};
      expect(await schemaObj.getWarningText(changes)).toBeNull();
      expect(willDropView).toHaveBeenCalledWith(changes);
    });

    it('warns when the server will drop the view', async ()=>{
      willDropView.mockImplementation(()=>Promise.resolve(true));
      expect(await schemaObj.getWarningText({definition: 'SELECT 2 AS b;'}))
        .toContain('requires dropping and re-creating the view');
    });

    it('warns when the server cannot be asked', async ()=>{
      willDropView.mockImplementation(()=>Promise.reject(new Error('failed')));
      expect(await schemaObj.getWarningText({definition: 'SELECT 2 AS b;'}))
        .toContain('requires dropping and re-creating the view');
    });
  });
});
