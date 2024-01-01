/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CatalogSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/static/js/catalog.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('CatalogSchema', ()=>{

  let catalogObj = new CatalogSchema(
    {
      namespaceowner: '',
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(catalogObj);
  });

  it('edit', async ()=>{
    await getEditView(catalogObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(catalogObj, getInitData);
  });
});

