/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import ImportExportSelectionSchema from '../../../pgadmin/tools/import_export_servers/static/js/import_export_selection.ui';
import {genericBeforeEach} from '../genericFunctions';
import Theme from '../../../pgadmin/static/js/Theme';

describe('ImportExportServers', () => {
  let mount;
  let schemaObj = new ImportExportSelectionSchema();

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(() => {
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(() => {
    genericBeforeEach();
  });

  it('import', () => {
    mount(<Theme>
      <SchemaView
        formType='dialog'
        schema={schemaObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onDataChange={() => {/*This is intentional (SonarQube)*/}}
        showFooter={false}
        isTabView={false}
      />
    </Theme>);
  });

  it('export', () => {
    schemaObj = new ImportExportSelectionSchema(
      {imp_exp: 'e', filename: 'test.json'});
    mount(<Theme>
      <SchemaView
        formType='dialog'
        schema={schemaObj}
        viewHelperProps={{
          mode: 'create',
        }}
        onDataChange={() => {/*This is intentional (SonarQube)*/}}
        showFooter={false}
        isTabView={false}
      />
    </Theme>);
  });
});
