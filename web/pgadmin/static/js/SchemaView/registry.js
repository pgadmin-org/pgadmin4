/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/*
 * Using the factory pattern (registry) to avoid circular imports of the views.
 */
const _views = {};

export function registerView(viewFunc, name) {
  name = name || viewFunc.name;

  if (name in _views) {
    throw new Error(
      `View type '${name}' is alredy registered.`
    );
  }

  if (typeof viewFunc !== 'function') {
    throw new Error(
      `View '${name}' must be a function.`
    );
  }

  _views[name] = viewFunc;
}

export function View(name) {
  const view = _views[name];

  if (view) return view;
  throw new Error(`View ${name} is not found in the registry.`);
}

export function hasView(name) {
  return (name in _views);
}
