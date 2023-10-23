/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import GrantWizardPrivilegeSchema from '../../../pgadmin/tools/grant_wizard/static/js/privilege_schema.ui';
import {genericBeforeEach, getCreateView} from '../genericFunctions';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('GrantWizard', () => {

  let schemaObj = new GrantWizardPrivilegeSchema(
    () => new MockSchema(),
  );

  beforeEach(() => {
    genericBeforeEach();
  });

  it('create', async () => {
    await getCreateView(schemaObj);
  });
});

