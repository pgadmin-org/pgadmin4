//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
import alertify from 'pgadmin.alertifyjs';
import * as $ from 'jquery';
import gettext from 'sources/gettext';


describe('alertify_wrapper', function () {
  describe('success', function () {
    it('calls the success function from alertify and adds the checkmark to the element', function () {
      spyOn(alertify, 'orig_success');

      alertify.success('Yay, congrats!', 1);

      var calledWithMessage = alertify.orig_success.calls.mostRecent().args[0];

      expect(calledWithMessage).toContain('Yay, congrats!');
      expect(calledWithMessage).toContain('class="fa fa-check"');
    });
  });

  describe('error', function () {
    it('calls the error function from alertify and adds the warning symbol to the element', function () {
      spyOn(alertify, 'orig_error');

      alertify.error('bad, very bad', 1);

      var calledWithMessage = alertify.orig_error.calls.mostRecent().args[0];

      expect(calledWithMessage).toContain('bad, very bad');
      expect(calledWithMessage).toContain('class="fa fa-exclamation-triangle"');
    });
  });

  describe('pgRespErrorNotify', () => {
    it('calls error notifier which alertifies response error for ajax calls', () => {

      $.ajax({
        url: 'http://some/dummy/url',
        dataType: 'json',
        error: function(xhr, status, error) {

          spyOn(alertify, 'orig_error').and.callThrough();
          spyOn(alertify, 'notify').and.callThrough();

          /*When connection lost*/
          xhr.status = 0;
          alertify.pgRespErrorNotify(xhr, error);
          expect(alertify.orig_error).toHaveBeenCalled();
          expect(alertify.orig_error.calls.mostRecent().args[0]).toContain(
            gettext('Connection to the server has been lost.')
          );


          /*When some exception occurs at back end*/
          xhr.status = 4;
          var orig_getResponseHeader = xhr.getResponseHeader;

          /*Exception handled by back end*/
          xhr.getResponseHeader = (header) => {
            if(header === 'Content-Type') {
              return 'application/json';
            }
            else {
              return orig_getResponseHeader(header);
            }

          };
          xhr.responseText = '{"errormsg":"Exception XYZ"}';
          alertify.pgRespErrorNotify(xhr, error);
          expect(alertify.orig_error).toHaveBeenCalled();
          expect(alertify.orig_error.calls.mostRecent().args[0]).toContain(
            gettext('Exception XYZ')
          );

          /*Exception not handled by back end*/
          xhr.getResponseHeader = (header) => {
            if(header === 'Content-Type') {
              return 'text/html';
            }
            else {
              return orig_getResponseHeader(header);
            }
          };
          xhr.responseText = '<p>Some Exception Occurred</p>';
          alertify.pgRespErrorNotify(xhr, error);
          expect(alertify.notify).toHaveBeenCalled();
          expect(alertify.notify.calls.mostRecent().args[0]).toContain(
            gettext('INTERNAL SERVER ERROR')
          );

          /*With prefixMsg*/
          xhr.getResponseHeader = (header) => {
            if(header === 'Content-Type') {
              return 'application/json';
            }
            else {
              return orig_getResponseHeader(header);
            }
          };
          xhr.responseText = '{"errormsg":"Exception XYZ"}';
          alertify.pgRespErrorNotify(xhr, error, gettext('Some prefix message'));
          expect(alertify.orig_error).toHaveBeenCalled();
          expect(alertify.orig_error.calls.mostRecent().args[0]).toContain(
            gettext('Some prefix message')
          );
        },
      });
    });
  });
});
