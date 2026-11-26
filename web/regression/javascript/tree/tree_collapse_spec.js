/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { FileType } from 'react-aspen';
import { Tree } from '../../../pgadmin/static/js/tree/tree';
import { ManageTreeNodes } from '../../../pgadmin/static/js/tree/tree_nodes';
import { TreeModelX } from '../../../pgadmin/static/js/components/PgTree';
import {
  collapseBranch, collapseTarget,
} from '../../../pgadmin/static/js/components/PgTree/services/collapse';
import { KeyboardHotkeys } from '../../../pgadmin/static/js/components/PgTree/services/keyboardHotkeys';

const rawItem = (name, inode = true) => ({
  type: inode ? FileType.Directory : FileType.File,
  name,
  metadata: {data: {_type: name, id: name, label: name}},
});

// server_group > server > Databases > db > Tables > (t1, t2), plus a sibling
// Schemas collection under db, which is enough depth to leave expanded nodes
// hidden beneath a closed one.
const structure = {
  '/browser': [rawItem('group')],
  '/browser/group': [rawItem('server')],
  '/browser/group/server': [rawItem('databases')],
  '/browser/group/server/databases': [rawItem('db')],
  '/browser/group/server/databases/db': [rawItem('tables'), rawItem('schemas')],
  '/browser/group/server/databases/db/tables': [
    rawItem('t1', false), rawItem('t2', false),
  ],
  '/browser/group/server/databases/db/schemas': [],
};

const rowLabels = (model) => {
  const labels = [];
  for (let i = 0; i < model.root.branchSize; i++) {
    labels.push(model.root.getFileEntryAtIndex(i).fileName);
  }
  return labels;
};

describe('Object Explorer collapse', () => {
  let model, nodes;

  const find = (path) => path.split('/').reduce(
    (dir, name) => dir.children.find((c) => c.fileName === name), model.root
  );

  const expand = async (...paths) => {
    for (const path of paths) {
      await find(path).setExpanded();
    }
  };

  beforeEach(async () => {
    model = new TreeModelX({
      pathStyle: 'unix',
      getItems: async (path) => structure[path] || [],
      sortComparator: () => 0,
    }, '/browser');
    await model.root.ensureLoaded();
    await expand('group', 'group/server', 'group/server/databases',
      'group/server/databases/db', 'group/server/databases/db/tables',
      'group/server/databases/db/schemas');
    nodes = {
      group: find('group'),
      server: find('group/server'),
      db: find('group/server/databases/db'),
      tables: find('group/server/databases/db/tables'),
      schemas: find('group/server/databases/db/schemas'),
      t1: find('group/server/databases/db/tables/t1'),
    };
  });

  describe('collapseTarget', () => {
    it.each([
      ['an expanded node is its own target', 'db', 'db'],
      ['a leaf targets its parent', 't1', 'tables'],
      ['a top-level node has nothing to collapse when closed', 'group', null],
    ])('%s', async (_desc, item, expected) => {
      if (item === 'group') {
        nodes.group.setCollapsed();
      }
      expect(collapseTarget(nodes[item], model.root))
        .toBe(expected ? nodes[expected] : null);
    });

    it('targets the parent of a closed node', () => {
      nodes.tables.setCollapsed();
      expect(collapseTarget(nodes.tables, model.root)).toBe(nodes.db);
    });
  });

  describe('collapseBranch', () => {
    it('closes the node and every expanded node beneath it', async () => {
      const closed = [];
      await collapseBranch(nodes.server, (dir) => {
        closed.push(dir.fileName);
        dir.setCollapsed();
      });

      // Deepest first, and never a node that was already closed.
      expect(closed).toEqual(['tables', 'schemas', 'db', 'databases', 'server']);
      expect(rowLabels(model)).toEqual(['group', 'server']);

      // Expanding again shows only the next level, not the old subtree.
      await nodes.server.setExpanded();
      expect(rowLabels(model)).toEqual(['group', 'server', 'databases']);
    });

    it('reaches expanded nodes hidden beneath a closed one', async () => {
      nodes.db.setCollapsed();
      const closeDir = jest.fn((dir) => dir.setCollapsed());

      await collapseBranch(nodes.server, closeDir);

      expect(closeDir.mock.calls.map(([d]) => d.fileName))
        .toEqual(['tables', 'schemas', 'databases', 'server']);
      expect(nodes.tables.expanded).toBe(false);
    });
  });

  describe('Tree#collapse', () => {
    let tree, collapseAll;

    beforeEach(() => {
      collapseAll = jest.fn((dir) => collapseBranch(dir, (d) => d.setCollapsed()));
      tree = new Tree(
        {onTreeEvents: jest.fn(), getModel: () => model, collapseAll},
        new ManageTreeNodes(), {Nodes: {}}
      );
    });

    it('collapses the parent of a leaf and returns it', async () => {
      expect(await tree.collapse(nodes.t1)).toBe(nodes.tables);
      expect(collapseAll).toHaveBeenCalledWith(nodes.tables);
      expect(nodes.tables.expanded).toBe(false);
      expect(nodes.db.expanded).toBe(true);
    });

    it('does nothing for a closed top-level node', async () => {
      nodes.group.setCollapsed();
      expect(await tree.collapse(nodes.group)).toBeNull();
      expect(collapseAll).not.toHaveBeenCalled();
    });
  });

  describe('Shift+ArrowLeft in the tree', () => {
    let active, handle, hotkeys;

    const press = (code, modifiers = {}) => {
      const ev = {
        nativeEvent: {code, key: code, ctrlKey: false, metaKey: false,
          shiftKey: false, ...modifiers},
        preventDefault: jest.fn(),
      };
      return hotkeys.handleKeyDown(ev);
    };

    beforeEach(() => {
      handle = {
        hasDirectFocus: () => true,
        getModel: () => model,
        getActiveFile: () => active,
        setActiveFile: jest.fn((item) => { active = item; }),
        collapseAll: jest.fn((dir) => collapseBranch(dir, (d) => d.setCollapsed())),
        closeDirectory: jest.fn(),
      };
      hotkeys = new KeyboardHotkeys(handle, {dispatch: jest.fn()});
    });

    it('collapses the parent of the active leaf and makes it active', async () => {
      active = nodes.t1;
      expect(press('ArrowLeft', {shiftKey: true})).toBe(true);
      expect(handle.collapseAll).toHaveBeenCalledWith(nodes.tables);
      // The action awaits the collapse before moving the selection, and was
      // waiting on this promise before the test was.
      await handle.collapseAll.mock.results[0].value;

      expect(nodes.tables.expanded).toBe(false);
      expect(handle.setActiveFile).toHaveBeenCalledWith(nodes.tables, true);
    });

    it('leaves plain ArrowLeft and other Shift keys as they were', () => {
      active = nodes.db;
      press('ArrowLeft');
      expect(handle.closeDirectory).toHaveBeenCalledWith(nodes.db);
      expect(handle.collapseAll).not.toHaveBeenCalled();

      active = nodes.db;
      press('ArrowUp', {shiftKey: true});
      expect(handle.setActiveFile).toHaveBeenCalled();
      expect(handle.collapseAll).not.toHaveBeenCalled();
    });
  });
});
