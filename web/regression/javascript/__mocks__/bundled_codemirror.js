const getSearchCursorRet = {
  _from: 3,
  _to: 14,
  find: function(_rev) {
    if(_rev){
      this._from = 1;
      this._to = 10;
    } else {
      this._from = 3;
      this._to = 14;
    }
    return true;
  },
  from: function() {return this._from;},
  to: function() {return this._to;},
  replace: jest.fn(),
};
const fromTextAreaRet = {
  'getValue':()=>'',
  'setValue': jest.fn(),
  'refresh': jest.fn(),
  'setOption': jest.fn(),
  'removeKeyMap': jest.fn(),
  'addKeyMap': jest.fn(),
  'getSelection': () => '',
  'getSearchCursor': jest.fn(()=>getSearchCursorRet),
  'getCursor': jest.fn(),
  'removeOverlay': jest.fn(),
  'addOverlay': jest.fn(),
  'setSelection': jest.fn(),
  'scrollIntoView': jest.fn(),
  'getWrapperElement': ()=>document.createElement('div'),
  'on': jest.fn(),
  'toTextArea': jest.fn(),
};
module.exports = {
  fromTextArea: jest.fn(()=>fromTextAreaRet)
};
