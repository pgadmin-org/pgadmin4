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
import CatalogObjectSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/catalog_objects/static/js/catalog_object.ui';
import {genericBeforeEach, getPropertiesView} from '../genericFunctions';

describe('CatalogObjectSchema', ()=>{
  let mount;
  let schemaObj = new CatalogObjectSchema();
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

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });
});
