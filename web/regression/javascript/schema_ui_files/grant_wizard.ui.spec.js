/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import pgAdmin from 'sources/pgadmin';
import { messages } from '../fake_messages';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import GrantWizardPrivilegeSchema from '../../../pgadmin/tools/grant_wizard/static/js/privilege_schema.ui';


class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('GrantWizard', () => {
  let mount;
  let schemaObj = new GrantWizardPrivilegeSchema(
    () => new MockSchema(),
  );

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(() => {
    jasmineEnzyme();
    /* messages used by validators */
    pgAdmin.Browser = pgAdmin.Browser || {};
    pgAdmin.Browser.messages = pgAdmin.Browser.messages || messages;
    pgAdmin.Browser.utils = pgAdmin.Browser.utils || {};
  });

  it('create', () => {
    mount(<SchemaView
      formType='dialog'
      schema={schemaObj}
      viewHelperProps={{
        mode: 'create',
      }}
      onDataChange={() => { }}
      showFooter={false}
      isTabView={false}
    />);
  });
});

