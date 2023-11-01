
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import {genericBeforeEach, getEditView} from '../genericFunctions';
import {getBinaryPathSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/binary_path.ui';
import pgAdmin from '../fake_pgadmin';

describe('BinaryPathschema', ()=>{

  let schemaObj = getBinaryPathSchema();
  let getInitData = ()=>Promise.resolve({});

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });



  beforeEach(()=>{
    genericBeforeEach();
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('validate path', ()=>{
    let validate = _.find(schemaObj.fields, (f)=>f.id=='binaryPath').validate;
    let status = validate('');
    expect(status).toBe(true);
  });

});
