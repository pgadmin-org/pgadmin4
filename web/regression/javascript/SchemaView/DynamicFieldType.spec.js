/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act } from 'react';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import pgAdmin from '../fake_pgadmin';
import { withBrowser } from '../genericFunctions';

/* The state each 'type' callback was given, keyed by field id. */
let typeState = {};

class RowSchema extends BaseUISchema {
  constructor() {
    super({kind: null, value: null});
    this.keys = ['kind', 'value'];
  }

  get baseFields() {
    return [
      {
        id: 'kind', label: 'Kind', type: 'text', cell: 'text',
        mode: ['edit', 'create'],
      }, {
        id: 'value', label: 'Value', cell: 'text', deps: ['kind'],
        mode: ['edit', 'create'],
        /* A row field whose control type depends on its own row. */
        type: (state)=>{
          typeState['value'] = state;
          return {type: state?.kind === 'number' ? 'int' : 'text'};
        },
      },
    ];
  }
}

class TopSchema extends BaseUISchema {
  constructor() {
    super({name: null, rows: []});
  }

  get baseFields() {
    return [
      {
        id: 'name', label: 'Name', type: 'text', mode: ['edit', 'create'],
      }, {
        id: 'toplevel', label: 'TopLevel', mode: ['edit', 'create'],
        /* A top-level field must still see the whole schema data. */
        type: (state)=>{
          typeState['toplevel'] = state;
          return {type: 'text'};
        },
      }, {
        id: 'rows', label: 'Rows', type: 'collection', schema: new RowSchema(),
        mode: ['edit', 'create'], canAdd: true, canEdit: true, canDelete: true,
      },
    ];
  }
}

const initData = {
  name: 'topname',
  toplevel: 'topvalue',
  rows: [
    {kind: 'text', value: 'rowval1'},
    {kind: 'number', value: 2},
  ],
};

describe('SchemaView dynamic field type', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const user = userEvent.setup();
  let ctrl;

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });

  beforeEach(async ()=>{
    typeState = {};
    await act(async ()=>{
      ctrl = render(
        <SchemaViewWithBrowser
          formType='dialog'
          schema={new TopSchema()}
          viewHelperProps={{mode: 'edit'}}
          getInitData={()=>Promise.resolve(initData)}
          onSave={()=>{/*This is intentional (SonarQube)*/}}
          onClose={()=>{/*This is intentional (SonarQube)*/}}
          onHelp={()=>{/*This is intentional (SonarQube)*/}}
          onEdit={()=>{/*This is intentional (SonarQube)*/}}
          onDataChange={()=>{/*This is intentional (SonarQube)*/}}
          confirmOnCloseReset={false}
          hasSQL={false}
          disableSqlHelp={true}
          disableDialogHelp={true}
        />
      );
    });
  });

  it('top-level field gets the whole schema data', ()=>{
    expect(typeState['toplevel'].name).toBe('topname');
    expect(typeState['toplevel'].rows.length).toBe(2);
  });

  it('collection row field gets its own row', async ()=>{
    /* Expand the second row, so its form controls are rendered. */
    await user.click(
      ctrl.container.querySelectorAll('button[data-test="expand-row"]')[1]
    );

    expect(typeState['value'].kind).toBe('number');
    expect(typeState['value'].value).toBe(2);
    expect(typeState['value'].rows).toBeUndefined();
    /* pgAdmin's numeric input renders as type="tel"; a text one as "text". */
    expect(
      ctrl.container.querySelector(
        '.DataGridView-expandedForm [name="value"]'
      ).getAttribute('type')
    ).toBe('tel');
  });
});
