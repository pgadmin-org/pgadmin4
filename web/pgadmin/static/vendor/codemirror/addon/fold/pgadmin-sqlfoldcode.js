(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.pgadminKeywordRangeFinder = function(cm, start, startTkn, endTkn) {
    var line = start.line, lineText = cm.getLine(line);
    var at = lineText.length, startChar, tokenType;
    for (; at > 0;) {
      var found = lineText.lastIndexOf(startTkn, at);
      var startToken = startTkn;
      var endToken = endTkn;
      if (found < start.ch) {
        var found = lineText.lastIndexOf("[", at);
        if (found < start.ch) break;
        var startToken = '[';
        var endToken = ']';
      }

      tokenType = cm.getTokenAt(CodeMirror.Pos(line, found + 1)).type;
      if (!/^(comment|string)/.test(tokenType)) { startChar = found; break; }
      at = found - 1;
    }
    if (startChar == null || lineText.lastIndexOf(startToken) > startChar) return;
    var count = 1, lastLine = cm.lineCount(), end, endCh;
    outer: for (var i = line + 1; i < lastLine; ++i) {
      var text = cm.getLine(i), pos = 0;
      for (;;) {
        var nextOpen = text.indexOf(startToken, pos), nextClose = text.indexOf(endToken, pos);
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
    return {from: CodeMirror.Pos(line, startChar + startTkn.length),
          to: CodeMirror.Pos(end, endCh)};
  };

  CodeMirror.pgadminBeginRangeFinder = function(cm, start) {
    var startToken = 'BEGIN';
    var endToken = 'END;';
    var fromToPos = CodeMirror.pgadminKeywordRangeFinder(cm, start, startToken, endToken);
    return fromToPos;
  };

  CodeMirror.pgadminIfRangeFinder = function(cm, start) {
    var startToken = 'IF';
    var endToken = 'END IF';
    var fromToPos = CodeMirror.pgadminKeywordRangeFinder(cm, start, startToken, endToken);
    return fromToPos;
  };

  CodeMirror.pgadminLoopRangeFinder = function(cm, start) {
    var startToken = 'LOOP';
    var endToken = 'END LOOP';
    var fromToPos = CodeMirror.pgadminKeywordRangeFinder(cm, start, startToken, endToken);
    return fromToPos;
  };

  CodeMirror.pgadminCaseRangeFinder = function(cm, start) {
    var startToken = 'CASE';
    var endToken = 'END CASE';
    var fromToPos = CodeMirror.pgadminKeywordRangeFinder(cm, start, startToken, endToken);
    return fromToPos;
  };

});
