/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// react-dnd ships ESM-only; jest.config.js routes the module to this
// mock via moduleNameMapper. Only the schema-ui audits need these
// symbols to exist at module load time — drag-drop interactions are
// exercised in Playwright, not Jest, so no-op stubs suffice.


export const useDrag = () => [
  { isDragging: false }, () => {}, () => {},
];
export const useDrop = () => [
  { isOver: false, canDrop: false }, () => {},
];

export const DndProvider = ({ children }) => <>{children}</>;
DndProvider.displayName = 'DndProviderMock';
