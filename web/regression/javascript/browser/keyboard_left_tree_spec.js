/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// keyboard.js reaches pgadmin.js by relative path, which skips the
// sources/pgadmin alias that maps to the fake, so point it there explicitly.
jest.mock('../../../pgadmin/static/js/pgadmin', () =>
  jest.requireActual('../fake_pgadmin'));

import pgAdmin from 'sources/pgadmin';
import '../../../pgadmin/browser/static/js/keyboard';

/* The Object Explorer shortcut is meant to put the keyboard into the tree, so
 * that the arrow keys move between nodes. It focused the rc-dock tab pane
 * around the tree, which is a plain div with no tabindex and therefore cannot
 * take focus at all, so the shortcut only ever selected a node and left focus
 * wherever it was. */
describe('keyboardNavigation.bindLeftTree', () => {
  let select;

  const buildObjectExplorer = ({withTree = true} = {}) => {
    const pane = document.createElement('div');
    pane.id = 'id-object-explorer';
    pane.className = 'dock-tabpane dock-tabpane-active';

    let tree = null;
    if (withTree) {
      tree = document.createElement('div');
      tree.className = 'file-tree';
      // As react-aspen renders it: programmatically focusable, not tabbable.
      tree.setAttribute('tabindex', '-1');
      pane.appendChild(tree);
    }

    document.body.appendChild(pane);
    return {pane, tree};
  };

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    select = jest.fn();
    pgAdmin.Browser.keyboardNavigation.getTreeDetails = () => ({
      t: {select}, i: 'some-tree-item',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('moves focus into the tree', () => {
    const {tree} = buildObjectExplorer();

    pgAdmin.Browser.keyboardNavigation.bindLeftTree();
    jest.runAllTimers();

    expect(document.activeElement).toBe(tree);
    expect(select).toHaveBeenCalledWith('some-tree-item');
  });

  it('falls back to the panel when there is no tree to focus', () => {
    buildObjectExplorer({withTree: false});

    expect(() => {
      pgAdmin.Browser.keyboardNavigation.bindLeftTree();
      jest.runAllTimers();
    }).not.toThrow();
    expect(select).toHaveBeenCalled();
  });

  it('does not throw when the Object Explorer is not in the DOM', () => {
    expect(() => {
      pgAdmin.Browser.keyboardNavigation.bindLeftTree();
      jest.runAllTimers();
    }).not.toThrow();
  });
});
