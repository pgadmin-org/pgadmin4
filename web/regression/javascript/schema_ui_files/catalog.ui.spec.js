/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CatalogSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/static/js/catalog.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('CatalogSchema', ()=>{

  let createCatalogObj = () => new CatalogSchema(
    {
      namespaceowner: '',
    }
  );
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createCatalogObj());
  });

  it('edit', async ()=>{
    await getEditView(createCatalogObj(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createCatalogObj(), getInitData);
  });
});

