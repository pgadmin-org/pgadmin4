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
import PublicationSchema from '../../../pgadmin/browser/server_groups/servers/databases/publications/static/js/publication.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

describe('PublicationSchema', ()=>{
  let mount;
  let schemaObj = new PublicationSchema(
    {
      allTables: ()=>[],
      allSchemas:()=>[],
      getColumns: ()=>[],
      role: ()=>[],
    },
    {
      node_info: {
        connected: true,
        user: {id: 10, name: 'postgres', is_superuser: true, can_create_role: true, can_create_db: true},
        user_id: 1,
        username: 'postgres',
        version: 130005,
      },
    },
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

  it('pubtable disabled', ()=>{
    let disabled = _.find(schemaObj.fields, (f)=>f.id=='pubtable').disabled;
    let status = disabled({all_table: true});
    expect(status).toBe(true);
  });

  it('only_table readonly', ()=>{
    let readonly = _.find(schemaObj.fields, (f)=>f.id=='only_table').readonly;
    let status = readonly({all_table: true});
    expect(status).toBe(true);
  });

  it('pubschema disabled', ()=>{
    let disabled = _.find(schemaObj.fields, (f)=>f.id=='pubschema').disabled;
    let status = disabled({pubtable: [],all_table: true});
    expect(status).toBe(true);
  });
  
});

