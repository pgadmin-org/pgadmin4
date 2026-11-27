/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { format } from 'sql-formatter';

/* Map the editor's SQL formatting preferences on to sql-formatter options.
  sql-formatter does not support capitalize casing, so a legacy 'capitalize'
  setting falls back to 'preserve', which is the library's default.
*/
export function getFormatOptions(editorPrefs) {
  return {
    language: 'postgresql',
    keywordCase: editorPrefs.keyword_case === 'capitalize' ? 'preserve' : editorPrefs.keyword_case,
    identifierCase: editorPrefs.identifier_case === 'capitalize' ? 'preserve' : editorPrefs.identifier_case,
    dataTypeCase: editorPrefs.data_type_case,
    functionCase: editorPrefs.function_case,
    logicalOperatorNewline: editorPrefs.logical_operator_new_line,
    expressionWidth: editorPrefs.expression_width,
    linesBetweenQueries: editorPrefs.lines_between_queries,
    tabWidth: editorPrefs.tab_size,
    useTabs: !editorPrefs.use_spaces,
    denseOperators: !editorPrefs.spaces_around_operators,
    newlineBeforeSemicolon: editorPrefs.new_line_before_semicolon
  };
}

/* Copy the letter case of the formatted SQL on to the original SQL, keeping
  the original line breaks and indentation. sql-formatter only changes
  whitespace and letter case, so once whitespace is skipped on both sides the
  remaining characters must match case-insensitively. If they do not, the
  original SQL is returned unchanged rather than risk altering the query.
*/
export function applyCaseOnly(original, formatted) {
  const isSpace = (ch) => /\s/.test(ch);
  let result = '';
  let j = 0;
  // Index by UTF-16 code unit on both sides so that the two stay aligned.
  for (let i = 0; i < original.length; i++) {
    const ch = original[i];
    if (isSpace(ch)) {
      result += ch;
      continue;
    }
    while (j < formatted.length && isSpace(formatted[j])) {
      j++;
    }
    const fch = formatted[j];
    if (fch === undefined || fch.toLowerCase() !== ch.toLowerCase()) {
      return original;
    }
    result += fch;
    j++;
  }
  while (j < formatted.length && isSpace(formatted[j])) {
    j++;
  }
  return j < formatted.length ? original : result;
}

export default function formatSQL(sql, editorPrefs) {
  const formatted = format(sql, getFormatOptions(editorPrefs));
  if (editorPrefs.preserve_layout) {
    return applyCaseOnly(sql, formatted);
  }
  return formatted;
}
