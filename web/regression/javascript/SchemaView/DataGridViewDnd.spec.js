/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, render } from '@testing-library/react';
import { useDragDropManager } from 'react-dnd';

import SchemaView from '../../../pgadmin/static/js/SchemaView';
import PgTreeView from '../../../pgadmin/static/js/PgTreeView';
import { getDndManager } from '../../../pgadmin/static/js/dnd_manager';
import pgAdmin from '../fake_pgadmin';
import { withBrowser } from '../genericFunctions';
import { TestSchema } from './TestSchema.ui';

// react-dnd's global singleton key, shared by every copy of react-dnd.
const INSTANCE_SYM = Symbol.for('__REACT_DND_CONTEXT_INSTANCE__');

// Make the collection reorderable so that its rows register drag sources and
// the HTML5 backend is actually set up on 'window'.
class ReorderTestSchema extends TestSchema {
  get baseFields() {
    return super.baseFields.map((f) => (
      f.id === 'fieldcoll' ? {...f, canReorder: true} : f
    ));
  }
}

const initData = {
  id: 1, field1: 'val', field2: 1,
  fieldcoll: [
    {field3: 1, field4: 'a1', field5: 'b1'},
    {field3: 2, field4: 'a2', field5: 'b2'},
  ],
  field3: 3, field4: 'val',
};

const treeData = [{
  id: 'n1', name: 'Node 1', children: [{id: 'n2', name: 'Node 2'}],
}];

// Every render() below creates its own React root, the same way pgAdmin
// mounts each dialog.
describe('react-dnd manager shared across React roots (#10485)', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const PgTreeViewWithBrowser = withBrowser(PgTreeView);

  beforeAll(()=>{
    jest.spyOn(pgAdmin.Browser.notifier, 'alert').mockImplementation(() => {});
  });

  const renderGrid = async ()=>{
    let ctrl;
    await act(async ()=>{
      ctrl = render(
        <SchemaViewWithBrowser
          formType='tab'
          schema={new ReorderTestSchema()}
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

  const renderTree = async ()=>{
    let ctrl;
    await act(async ()=>{
      ctrl = render(<PgTreeViewWithBrowser data={treeData} />);
    });
    return ctrl;
  };

  const unmount = async (ctrl)=>{
    await act(async ()=>{ ctrl.unmount(); });
  };

  const expectGridRendered = (ctrl)=>{
    expect(ctrl.container.querySelector('[data-test="data-grid-view"]'))
      .not.toBeNull();
    expect(ctrl.queryByText('Something went wrong.', {exact: false}))
      .toBeNull();
    // The global jest setup also fails any test that logs a console error.
    const msgs = console.error.mock.calls.map((c) => c.map(String).join(' '));
    expect(msgs.join('\n')).not.toMatch(/two HTML5 backends/);
  };

  describe('getDndManager', ()=>{
    it('returns the same manager on every call', ()=>{
      expect(getDndManager()).toBeTruthy();
      expect(getDndManager()).toBe(getDndManager());
    });

    it('uses the HTML5 backend', ()=>{
      const backend = getDndManager().getBackend();
      expect(typeof backend.setup).toBe('function');
      expect(typeof backend.connectDragSource).toBe('function');
      expect(typeof backend.profile).toBe('function');
    });
  });

  describe('DataGridView', ()=>{
    it('uses the shared manager', async ()=>{
      let used = null;
      const Probe = ()=>{ used = useDragDropManager(); return null; };
      const { DndProvider } = jest.requireActual('react-dnd');
      // Same provider configuration as grid.jsx.
      render(<DndProvider manager={getDndManager()}><Probe /></DndProvider>);
      expect(used).toBe(getDndManager());

      const ctrl = await renderGrid();
      expectGridRendered(ctrl);
      // The grid must not store its manager on react-dnd's global key, where
      // another copy of react-dnd could null it.
      expect(window[INSTANCE_SYM] ?? null).toBeNull();
      await unmount(ctrl);
    });

    it('sets up the HTML5 backend on window while a reorderable grid is mounted', async ()=>{
      const ctrl = await renderGrid();
      expectGridRendered(ctrl);
      expect(window.__isReactDndBackendSetUp).toBe(true);
      await unmount(ctrl);
      expect(window.__isReactDndBackendSetUp).toBe(false);
    });

    it('renders a new grid after another root unmounts its grid', async ()=>{
      const first = await renderGrid();
      const second = await renderGrid();
      expectGridRendered(first);
      expectGridRendered(second);

      await unmount(first);
      const third = await renderGrid();
      expectGridRendered(third);

      await unmount(second);
      await unmount(third);
    });

    it('survives every grid unmounting and remounting repeatedly', async ()=>{
      for (let i = 0; i < 3; i++) {
        const ctrl = await renderGrid();
        expectGridRendered(ctrl);
        await unmount(ctrl);
      }
      const manager = getDndManager();
      const ctrl = await renderGrid();
      expectGridRendered(ctrl);
      expect(getDndManager()).toBe(manager);
      await unmount(ctrl);
    });
  });

  describe('DataGridView together with PgTreeView (react-arborist)', ()=>{
    // react-arborist bundles react-dnd 14, which keeps its own reference
    // count for the same global key. Before the fix, unmounting whichever
    // one created the global manager dropped it while the other still used
    // its backend, and the next grid failed to set up a second backend.
    it('renders a grid after a grid unmounts while a tree is mounted', async ()=>{
      const grid = await renderGrid();
      const tree = await renderTree();
      expectGridRendered(grid);

      await unmount(grid);
      const nextGrid = await renderGrid();
      expectGridRendered(nextGrid);

      await unmount(nextGrid);
      await unmount(tree);
    });

    it('renders a grid after a tree unmounts while a grid is mounted', async ()=>{
      const tree = await renderTree();
      const grid = await renderGrid();
      expectGridRendered(grid);

      await unmount(tree);
      const nextGrid = await renderGrid();
      expectGridRendered(nextGrid);

      await unmount(grid);
      await unmount(nextGrid);
    });

    it('does not leave a manager on react-dnd\'s global key', async ()=>{
      const tree = await renderTree();
      const grid = await renderGrid();
      expect(window[INSTANCE_SYM] ?? null).toBeNull();
      await unmount(grid);
      await unmount(tree);
    });
  });
});
