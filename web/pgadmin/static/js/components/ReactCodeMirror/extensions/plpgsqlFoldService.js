/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { foldService } from '@codemirror/language';

function findRange(pair, state, startLine) {
  let depth = 1;
  const from = startLine.to;

  for (let i = startLine.number + 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const text = line.text.trim();

    if (pair.start.test(text)) {
      depth++;
    } else if (pair.end.test(text)) {
      depth--;
      if (depth === 0) {
        // Only fold if there is at least one line between the start and end.
        if (i <= startLine.number + 1) {
          return null;
        }

        // leaving the closing keyword line visible after folding.
        const to = state.doc.line(i - 1).to;
        return { from, to };
      }
    }
  }
  // No valid closing block found
  return null;
}


const plpgsqlFoldService = foldService.of((state, startPos) => {
  const startLine = state.doc.lineAt(startPos);
  const startText = startLine.text.trim();

  const foldPairs = [
    // Added 'i' flag for case-insensitivity
    { start: /^BEGIN\b/i, end: /^END\b\s*;$/i },
    { start: /^IF\b/i, end: /^END IF\b\s*;$/i },
    { start: /^FOR\b/i, end: /^END LOOP\b\s*;$/i },
    { start: /^CASE\b/i, end: /^END CASE\b\s*;$/i }
  ];

  for (let pair of foldPairs) {
    if (pair.start.test(startText)) {
      return findRange(pair, state, startLine);
    }
  }

  return null;
});

export default plpgsqlFoldService;
