/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

(function(mod) {
  if (typeof exports == 'object' && typeof module == 'object') // CommonJS
    mod(require('codemirror'));
  else if (typeof define == 'function' && define.amd) // AMD
    define(['codemirror'], mod);
  else // Plain browser env
    mod(window.CodeMirror);
})(function(CodeMirror) {
  'use strict';

  var pgadminKeywordRangeFinder = function(cm, start, tokenSet) {
    var line = start.line,
      lineText = cm.getLine(line);
    var at = lineText.length,
      startChar, tokenType;

    let tokenSetNo = 0;
    let startTkn = tokenSet[tokenSetNo].start,
      endTkn = tokenSet[tokenSetNo].end;
    while (at > 0) {
      var found = lineText.lastIndexOf(startTkn, at);
      var startToken = startTkn;
      var endToken = endTkn;

      if (found < start.ch) {
        /* If the start token is not found then search for the next set of token */
        tokenSetNo++;
        if(tokenSetNo >= tokenSet.length) {
          return undefined;
        }
        startTkn = tokenSet[tokenSetNo].start;
        endTkn = tokenSet[tokenSetNo].end;
        at = lineText.length;
        continue;
      }

      tokenType = cm.getTokenAt(CodeMirror.Pos(line, found + 1)).type;
      if (!/^(comment|string)/.test(tokenType)) {
        startChar = found;
        break;
      }
      at = found - 1;
    }
    if (startChar == null || lineText.lastIndexOf(startToken) > startChar) return;
    var count = 1,
      lastLine = cm.lineCount(),
      end, endCh;
    outer: for (var i = line + 1; i < lastLine; ++i) {
      var text = cm.getLine(i),
        pos = 0;
      var whileloopvar = 0;
      while (whileloopvar < 1) {
        var nextOpen = text.indexOf(startToken, pos),
          nextClose = text.indexOf(endToken, pos);
        if (nextOpen < 0) nextOpen = text.length;
        if (nextClose < 0) nextClose = text.length;
        pos = Math.min(nextOpen, nextClose);
        if (pos == text.length) break;
        if (cm.getTokenAt(CodeMirror.Pos(i, pos + 1)).type == tokenType) {
          if (pos == nextOpen) ++count;
          else if (!--count) {
            end = i;
            endCh = pos;
            break outer;
          }
        }
        ++pos;
      }
    }
    if (end == null || end == line + 1) return;
    return {
      from: CodeMirror.Pos(line, startChar + startTkn.length),
      to: CodeMirror.Pos(end, endCh),
    };
  };

  CodeMirror.registerHelper('fold', 'sql', function(cm, start) {
    var fromToPos = pgadminKeywordRangeFinder(cm, start, [
      {start: 'BEGIN', end:'END;'},
      {start: 'IF', end:'END IF'},
      {start: 'LOOP', end:'END LOOP'},
      {start: 'CASE', end:'END CASE'},
    ]);
    return fromToPos;
  });
});
