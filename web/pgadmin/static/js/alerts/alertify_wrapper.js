define([
  'jquery',
  'alertify',
], function ($, alertify) {
  var AlertifyWrapper = function () {
    var success = function (message, timeout) {
      var alertMessage = '\
      <div class="media font-green-3 text-14">\
        <div class="media-body media-middle">\
          <div class="alert-icon success-icon">\
            <i class="fa fa-check" aria-hidden="true"></i>\
          </div>\
            <div class="alert-text">' + message + '</div>\
        </div>\
      </div>';
      var alert = alertify.success(alertMessage, timeout);
      return alert;
    };

    var error = function(message, timeout) {
      var alertMessage = '\
      <div class="media font-red-3 text-14">\
        <div class="media-body media-middle">\
          <div class="alert-icon error-icon">\
            <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>\
          </div>\
            <div class="alert-text">' + message + '</div>\
        </div>\
      </div>';
      var alert = alertify.error(alertMessage, timeout);
      return alert;
    };

    $.extend(this, {
      'success': success,
      'error': error,
    });
  };
  return AlertifyWrapper;
});