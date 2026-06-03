/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// react-resize-detector ships ESM-only; jest.config.js routes the
// module here via moduleNameMapper. Tests that exercise resize-driven
// behavior aren't in Jest's scope (those run in Playwright); a stub
// suffices for module-load correctness.

import React from 'react';

// useResizeDetector returns { ref, width, height }. Width/height as
// undefined matches the initial-mount return of the real hook.
export const useResizeDetector = () => ({
  ref: React.createRef(),
  width: undefined,
  height: undefined,
});

// Named class export. Renders children verbatim — consumers expect a
// render-prop pattern; if any test relies on it, add a function-child
// branch.
export const ResizeDetector = ({ children }) => <>{children}</>;
ResizeDetector.displayName = 'ResizeDetectorMock';

// withResizeDetector HOC stub — passes width/height undefined.
export const withResizeDetector = (Component) => (props) => (
  <Component {...props} width={undefined} height={undefined} />
);

export default ResizeDetector;
