/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Opening a very large JSON/JSONB value in the cell editor parses, pretty-
// prints and renders the whole document on the main thread, which can make
// pgAdmin slow or completely unresponsive. Above this size (in characters) we
// warn the user and let them decide whether to proceed. See issue #9868.
export const LARGE_JSON_WARNING_LENGTH = 1024 * 1024;

// Returns true when the raw cell value is large enough that opening it in the
// JSON editor warrants a confirmation prompt. Only string values are measured;
// the cheap length check avoids serializing the value just to size it.
export function shouldWarnForLargeJSON(value, threshold = LARGE_JSON_WARNING_LENGTH) {
  return typeof value === 'string' && value.length > threshold;
}
