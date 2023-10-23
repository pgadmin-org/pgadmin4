/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CatalogObjectSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/static/js/catalog_object.ui';
import {genericBeforeEach, getPropertiesView} from '../genericFunctions';

describe('CatalogObjectSchema', ()=>{

  let schemaObj = new CatalogObjectSchema();
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });
});
