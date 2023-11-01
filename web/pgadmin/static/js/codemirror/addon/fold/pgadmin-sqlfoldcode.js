/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
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

  let pgadminKeywordRangeFinder = function(cm, start, tokenSet) {
    let line = start.line,
      lineText = cm.getLine(line);
    let at = lineText.length,
      startChar, tokenType;

    let tokenSetNo = 0,
      startToken, endToken;
    let startTkn = tokenSet[tokenSetNo].start,
      endTkn = tokenSet[tokenSetNo].end;
    while (at > 0) {
      let found = lineText.toUpperCase().lastIndexOf(startTkn, at);
      found = checkStartTokenFoundOnEndToken(found, lineText.toUpperCase(), endTkn, startTkn);
      startToken = startTkn;
      endToken = endTkn;

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
    if (startChar == null || lineText.toUpperCase().lastIndexOf(startToken) > startChar) return;
    let count = 1,
      lastLine = cm.lineCount(),
      end, endCh;
    outer: for (let i = line + 1; i < lastLine; ++i) {
      let text = cm.getLine(i).toUpperCase(),
        pos = 0;
      let whileloopvar = 0;
      while (whileloopvar < 1) {
        let nextOpen = text.indexOf(startToken, pos);
        nextOpen = checkStartTokenFoundOnEndToken(nextOpen, text, endToken, startToken);

        let nextClose = text.indexOf(endToken, pos);
        if (nextOpen < 0) nextOpen = text.length;
        if (nextClose < 0) nextClose = text.length;
        pos = Math.min(nextOpen, nextClose);
        if (pos == text.length) { whileloopvar=1; break; }
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

  /**
   * This function is responsible for finding whether the startToken is present
   * in the endToken as well, to avoid mismatch of start and end points.
   * e.g. In case of IF and END IF, IF is detected in both tokens, which creates
   * confusion. The said function will resolve such issues.
   * @function checkStartTokenFoundOnEndToken
   * @returns {Number} - returns found
   */
  function checkStartTokenFoundOnEndToken(found, text, endToken, startToken) {
    if(found > 0) {
      if(text.includes(endToken)
        || !checkTokenMixedWithOtherAlphabets(text, startToken)) {
        found = -1;
      }
    }
    return found;
  }

  /**
   * This function is responsible for finding whether the startToken is mixed
   * with other alphabets of the text. To avoid word like NOTIFY to be mistakenly treat as keyword.
   * e.g. to avoid the IF detected as keyword in the word pgAdmin.Browser.notifier.
   * Function also works with other tokens like LOOP, CASE, etc.
   * @function checkTokenMixedWithOtherAlphabets
   * @returns {Boolean} - returns true/false
   */
  function checkTokenMixedWithOtherAlphabets(text, startToken) {
    //this reg will check the token should be in format as - IF condition or IF(condition)
    let reg = `\\b\\${startToken}\\s*\\(\\w*\\)(?!\\w)|\\b\\${startToken}\\(\\w*\\)(?!\\w)|\\b\\${startToken}\\s*(?!\\w)`;
    let regex = RegExp(reg, 'g');
    return regex.exec(text) !== null;
  }

  CodeMirror.registerHelper('fold', 'sql', function(cm, start) {
    return pgadminKeywordRangeFinder(cm, start, [
      {start: 'BEGIN', end:'END;'},
      {start: 'IF', end:'END IF'},
      {start: 'LOOP', end:'END LOOP'},
      {start: 'CASE', end:'END CASE'},
    ]);
  });
});
