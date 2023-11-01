/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CatalogObjectColumn from '../../../pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/columns/static/js/catalog_object_column.ui';
import {genericBeforeEach, getCreateView, getPropertiesView} from '../genericFunctions';

describe('CatalogObjectColumn', ()=>{

  let schemaObj = new CatalogObjectColumn();
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

});
