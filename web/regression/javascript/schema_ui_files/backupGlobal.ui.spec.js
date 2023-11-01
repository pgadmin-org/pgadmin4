/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BackupGlobalSchema, {getMiscellaneousSchema} from '../../../pgadmin/tools/backup/static/js/backupGlobal.ui';
import { getCreateView } from '../genericFunctions';


describe('BackupGlobalSchema', ()=>{
  let backupGlobalSchemaObj = new BackupGlobalSchema(
    ()=> getMiscellaneousSchema(),
    {
      role: ()=>[],
    }
  );

  it('create', async ()=>{
    await getCreateView(backupGlobalSchemaObj);
  });
});

