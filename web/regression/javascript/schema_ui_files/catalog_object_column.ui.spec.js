/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import CatalogObjectColumn from '../../../pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/columns/static/js/catalog_object_column.ui';
import {genericBeforeEach, getCreateView, getPropertiesView} from '../genericFunctions';

describe('CatalogObjectColumn', ()=>{

  let createSchemaObj = () => new CatalogObjectColumn();
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObj());
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObj(), getInitData);
  });

});
