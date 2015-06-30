(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if(typeof module !== 'undefined' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    factory();
  }
}(function(){
  var pgAdmin = window.pgAdmin = window.pgAdmin || {};

  return pgAdmin;
}));
