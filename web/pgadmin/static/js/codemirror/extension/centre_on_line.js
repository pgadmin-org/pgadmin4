/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CodeMirror from 'codemirror/lib/codemirror';

CodeMirror.defineExtension('centerOnLine', function(line) {
  var ht = this.getScrollInfo().clientHeight;
  var coords = this.charCoords({line: line, ch: 0}, 'local');
  this.scrollTo(null, (coords.top + coords.bottom - ht) / 2);
});
