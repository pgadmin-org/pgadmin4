
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
import Notify from '../../../pgadmin/static/js/helpers/Notifier';
import {genericBeforeEach, getEditView} from '../genericFunctions';
import {getBinaryPathSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/binary_path.ui';

describe('BinaryPathschema', ()=>{
  let mount;
  let schemaObj = getBinaryPathSchema();
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
    spyOn(Notify, 'alert');
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('validate path', ()=>{
    let validate = _.find(schemaObj.fields, (f)=>f.id=='binaryPath').validate;
    let status = validate('');
    expect(status).toBe(true);
  });

});
