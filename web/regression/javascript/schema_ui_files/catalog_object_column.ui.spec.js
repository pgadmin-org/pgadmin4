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
import CatalogObjectColumn from '../../../pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/columns/static/js/catalog_object_column.ui';
import {genericBeforeEach, getCreateView, getPropertiesView} from '../genericFunctions';

describe('CatalogObjectColumn', ()=>{
  let mount;
  let schemaObj = new CatalogObjectColumn();
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

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

});
