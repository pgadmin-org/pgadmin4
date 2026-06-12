/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as LosslessJSON from 'lossless-json';

// A lossless JSON parser, with the same { parse, stringify } interface as the
// native JSON object. It preserves the original numeric representation of a
// value - including big integers and trailing fractional zeros such as 10.00 -
// instead of normalizing it the way JSON.parse/JSON.stringify does.
//
// This matters for the JSON cell editor: jsonb values arrive from the server
// as their canonical text, and a normalizing round-trip would silently rewrite
// numbers (e.g. 10.00 -> 10), corrupting unmodified values when the document is
// saved back. See issue #9854.
export const losslessJSONParser = LosslessJSON;

// Pretty-print a JSON string for the editor, preserving the exact numeric
// representation of every value.
export function prettifyJSONString(value) {
  return LosslessJSON.stringify(LosslessJSON.parse(value), null, 2);
}

// Pretty-print an already-parsed JSON value (e.g. an element of an array
// column) for the editor.
export function prettifyJSONValue(value) {
  return LosslessJSON.stringify(value, null, 2);
}
