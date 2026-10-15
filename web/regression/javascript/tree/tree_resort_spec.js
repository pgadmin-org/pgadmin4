/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Directory, FileType } from 'react-aspen';
import { Tree } from '../../../pgadmin/static/js/tree/tree';
import { ManageTreeNodes } from '../../../pgadmin/static/js/tree/tree_nodes';
import { TreeModelX } from '../../../pgadmin/static/js/components/PgTree';

// The ordering rules the Object Explorer host applies, using a plain string
// comparison in place of pgAdmin.natural_sort, which the Jest setup fakes.
const compare = (a, b) => (a < b ? -1 : (a > b ? 1 : 0));
const sortComparator = (a, b) => {
  if (a._metadata && a._metadata.data._type == 'column') return 0;
  if (a.constructor === b.constructor) {
    return compare(a.fileName, b.fileName);
  }
  if (a.constructor === Directory) return -1;
  if (b.constructor === Directory) return 1;
  return 0;
};

const rawItem = (name, _type, inode = true) => ({
  type: inode ? FileType.Directory : FileType.File,
  name,
  metadata: {data: {_type, id: name, label: name}},
});

const structure = {
  '/browser': [
    rawItem('Alpha', 'server_group'),
    rawItem('Beta', 'server_group'),
    rawItem('Gamma', 'server_group'),
  ],
  '/browser/Alpha': [
    rawItem('Server A', 'server', false),
    rawItem('Server B', 'server', false),
  ],
  '/browser/Beta': [],
  '/browser/Gamma': [],
};

const rowLabels = (model) => {
  const labels = [];
  for (let i = 0; i < model.root.branchSize; i++) {
    labels.push(model.root.getFileEntryAtIndex(i).fileName);
  }
  return labels;
};

describe('Tree#resortItem', () => {
  let model, tree;

  const child = (dir, name) =>
    dir.children.find((c) => c.getMetadata('data').id === name);

  beforeEach(async () => {
    model = new TreeModelX({
      pathStyle: 'unix',
      getItems: async (path) => structure[path] || [],
      sortComparator,
    }, '/browser');
    await model.root.ensureLoaded();
    tree = new Tree(
      {onTreeEvents: jest.fn()}, new ManageTreeNodes(), {Nodes: {}}
    );
  });

  it('moves a renamed node to its sorted position', () => {
    const item = child(model.root, 'Alpha');

    expect(tree.resortItem(item, 'Zulu')).toBe(true);
    expect(model.root.children.map((c) => c.fileName))
      .toEqual(['Beta', 'Gamma', 'Zulu']);
    expect(rowLabels(model)).toEqual(['Beta', 'Gamma', 'Zulu']);
  });

  it('keeps the children of an expanded node directly below it', async () => {
    const item = child(model.root, 'Alpha');
    await item.setExpanded();
    expect(rowLabels(model)).toEqual(
      ['Alpha', 'Server A', 'Server B', 'Beta', 'Gamma']
    );

    expect(tree.resortItem(item, 'Delta')).toBe(true);
    expect(rowLabels(model)).toEqual(
      ['Beta', 'Delta', 'Server A', 'Server B', 'Gamma']
    );
  });

  it('does not change the path of the renamed node', () => {
    const item = child(model.root, 'Gamma');
    const path = item.path;

    tree.resortItem(item, 'Aardvark');
    expect(item.path).toEqual(path);
    expect(model.root.children[0]).toBe(item);
  });

  it('reports no move when the sorted position is unchanged', () => {
    const item = child(model.root, 'Beta');

    expect(tree.resortItem(item, 'Bravo')).toBe(false);
    expect(item.fileName).toEqual('Bravo');
    expect(tree.resortItem(item, 'Bravo')).toBe(false);
  });

  it('leaves columns in their original order', () => {
    const item = child(model.root, 'Alpha');
    item.getMetadata('data')._type = 'column';

    expect(tree.resortItem(item, 'Zulu')).toBe(false);
    expect(item.fileName).toEqual('Alpha');
    expect(model.root.children[0]).toBe(item);
  });
});
