/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Directory, FileEntry, FileType } from 'react-aspen';

type FileOrDir = FileEntry | Directory;

// The node that 'Collapse' acts on: the item itself when it is an expanded
// directory, otherwise its parent, so that collapsing from a leaf (a table
// deep inside a long 'Tables' list, say) closes the list it sits in. Returns
// null when there is nothing to collapse, such as for a closed top-level node
// whose parent is the tree's root.
export function collapseTarget(item: FileOrDir, root: Directory): Directory | null {
  if (!item) {
    return null;
  }
  if (item.type === FileType.Directory && (item as Directory).expanded) {
    return item as Directory;
  }
  const parent = item.parent;
  if (!parent || parent === root) {
    return null;
  }
  return parent;
}

// Closes dir and every expanded directory beneath it, deepest first. A closed
// directory keeps the expanded state of its children, so without walking into
// closed directories too, expanding dir again would bring the whole subtree
// back.
export async function collapseBranch(
  dir: Directory, closeDir: (dir: Directory) => void | Promise<void>
): Promise<void> {
  for (const child of dir.children ?? []) {
    if (child.type === FileType.Directory) {
      await collapseBranch(child as Directory, closeDir);
    }
  }
  if (dir.expanded) {
    await closeDir(dir);
  }
}
