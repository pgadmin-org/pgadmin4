/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, render } from '@testing-library/react';

import SchemaView from '../../../pgadmin/static/js/SchemaView';
import pgAdmin from '../fake_pgadmin';
import { withBrowser } from '../genericFunctions';
import { TestSchema } from './TestSchema.ui';

// Regression test for #10485: dialogs are mounted in separate React roots, and
// unmounting the DndProvider of one grid must not tear down the shared
// react-dnd manager while the HTML5 backend is still attached to 'window'.
describe('DataGridView react-dnd backend', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const initData = {
    id: 1, field1: 'val', field2: 1,
    fieldcoll: [{field3: 1, field4: 'a', field5: 'b'}],
    field3: 3, field4: 'val',
  };

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });

  const renderGrid = async ()=>{
    let ctrl;
    await act(async ()=>{
      ctrl = render(
        <SchemaViewWithBrowser
          formType='tab'
          schema={new TestSchema()}
          getInitData={()=>Promise.resolve(initData)}
          viewHelperProps={{mode: 'edit'}}
          onSave={()=>{}}
          onClose={()=>{}}
          onHelp={()=>{}}
          onEdit={()=>{}}
          onDataChange={()=>{}}
          confirmOnCloseReset={false}
          hasSQL={false}
          disableSqlHelp={false}
          disableDialogHelp={false}
        />
      );
    });
    return ctrl;
  };

  it('renders a new grid after another root unmounts its grid', async ()=>{
    const first = await renderGrid();
    const second = await renderGrid();
    expect(first.container.querySelector('[data-test="data-grid-view"]')).not.toBeNull();
    expect(second.container.querySelector('[data-test="data-grid-view"]')).not.toBeNull();

    // Unmount one root (refCount drops, but another grid is still mounted).
    first.unmount();
    // A grid mounted afterwards must not hit the two-backends error.
    const third = await renderGrid();

    expect(third.container.querySelector('[data-test="data-grid-view"]')).not.toBeNull();
    expect(third.queryByText('Something went wrong.', {exact: false})).toBeNull();
    // The global jest setup also fails any test that logs a console error.
    const msgs = console.error.mock.calls.map(c => String(c[0]) + String(c[1] ?? ''));
    expect(msgs.join('\n')).not.toMatch(/two HTML5 backends/);
    second.unmount();
    third.unmount();
  });

  it('keeps a single shared drag-drop manager across mounts', async ()=>{
    const sym = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__');
    const first = await renderGrid();
    const manager = window[sym];
    expect(manager).toBeTruthy();
    first.unmount();
    // The shared manager must survive the provider unmounting.
    expect(window[sym]).toBe(manager);
    const second = await renderGrid();
    expect(window[sym]).toBe(manager);
    second.unmount();
  });
});
