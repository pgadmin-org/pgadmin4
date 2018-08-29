import CodeMirror from 'codemirror/lib/codemirror';

CodeMirror.defineExtension('centerOnLine', function(line) {
  var ht = this.getScrollInfo().clientHeight;
  var coords = this.charCoords({line: line, ch: 0}, 'local');
  this.scrollTo(null, (coords.top + coords.bottom - ht) / 2);
});
