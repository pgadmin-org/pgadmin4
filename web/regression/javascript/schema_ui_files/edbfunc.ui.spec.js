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
import EDBFuncSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/packages/edbfuncs/static/js/edbfunc.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('EDBFuncSchema', ()=>{
  let mount;
  let edbFuncSchemaObj = new EDBFuncSchema(
    {}, {
      name: 'sysfunc'
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
    mount(getCreateView(edbFuncSchemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(edbFuncSchemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(edbFuncSchemaObj, getInitData));
  });
});

