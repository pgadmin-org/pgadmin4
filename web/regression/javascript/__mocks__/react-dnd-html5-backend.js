/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// react-dnd-html5-backend is ESM-only. The schema audits only need
// the export to exist at module load time (passed to <DndProvider>).
// Drag-drop is exercised in Playwright, not Jest, so a no-op is fine.

export const HTML5Backend = {};
export default HTML5Backend;
