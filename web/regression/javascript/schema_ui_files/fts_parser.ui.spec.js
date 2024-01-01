/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import FTSParserSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_parsers/static/js/fts_parser.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSParserSchema', ()=>{

  let schemaObj = new FTSParserSchema(
    {
      prsstartList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      prstokenList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      prsendList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      prslextypeList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      prsheadlineList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      schemaList: ()=> [],
    },
    {
      schema: 123
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
});

