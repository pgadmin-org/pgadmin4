/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { createDragDropManager } from 'dnd-core';
import { HTML5Backend } from 'react-dnd-html5-backend';

// A single react-dnd manager shared by every drag and drop consumer.
//
// The HTML5 backend attaches itself to 'window', and only one backend may be
// set up there at a time. When <DndProvider> is given just a 'backend',
// react-dnd keeps the manager in a global singleton guarded by a
// module-level reference count, and nulls it when that count reaches zero.
// pgAdmin mounts dialogs in separate React roots, and react-arborist bundles
// its own copy of react-dnd with a separate count, so one provider unmounting
// could drop the manager while its backend was still in use elsewhere. The
// next provider then created a second backend and failed with "Cannot have
// two HTML5 backends at the same time." (react-dnd/react-dnd#3178)
//
// Passing this manager explicitly (DndProvider 'manager', react-arborist
// 'dndManager') bypasses that reference counting, so it lives for the life
// of the page and is never recreated.
let dndManager = null;

export function getDndManager() {
  if (!dndManager) {
    dndManager = createDragDropManager(HTML5Backend);
  }
  return dndManager;
}
