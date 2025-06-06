
/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import {genericBeforeEach, getEditView} from '../genericFunctions';
import pgAdmin from '../fake_pgadmin';
import { getBinaryPathSchema } from '../../../pgadmin/preferences/static/js/components/binary_path.ui';

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
