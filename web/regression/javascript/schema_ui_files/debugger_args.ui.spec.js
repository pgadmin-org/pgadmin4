/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////




import {DebuggerArgumentSchema} from '../../../pgadmin/tools/debugger/static/js/components/DebuggerArgs.ui';
import {genericBeforeEach, getCreateView} from '../genericFunctions';

describe('DebuggerArgs', () => {

  let schemaObj = new DebuggerArgumentSchema();



  beforeEach(() => {
    genericBeforeEach();
  });

  it('create', async () => {
    await getCreateView(schemaObj);
  });
});

