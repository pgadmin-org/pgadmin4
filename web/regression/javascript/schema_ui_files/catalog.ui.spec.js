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
import CatalogSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/static/js/catalog.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('CatalogSchema', ()=>{
  let mount;
  let catalogObj = new CatalogSchema(
    {
      namespaceowner: '',
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
    mount(getCreateView(catalogObj));
  });

  it('edit', ()=>{
    mount(getEditView(catalogObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(catalogObj, getInitData));
  });
});

