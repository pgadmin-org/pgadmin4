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
import FTSTemplateSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/fts_templates/static/js/fts_template.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('FTSTemplateSchema', ()=>{
  let mount;
  let schemaObj = new FTSTemplateSchema(
    {
      schemaList: ()=> [],
      initFunctionList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
      lexisFunctionList: ()=> [{ label: '', value: ''}, { label: 'lb1', value: 'val1'}],
    },
    {
      schema: 123
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
});

