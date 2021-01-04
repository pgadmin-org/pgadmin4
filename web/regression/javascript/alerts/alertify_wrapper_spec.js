//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
import alertify from 'pgadmin.alertifyjs';
import * as $ from 'jquery';
import gettext from 'sources/gettext';


describe('alertify_wrapper', function () {
  var env = jasmine.getEnv();

  env.allowRespy(true);

  describe('alertify_success', function () {
    it('calls the success function from alertify and adds the checkmark to the element', function () {
      let spyObj = spyOn(alertify, 'orig_success').and.callThrough();

      alertify.success('Yay, congrats!', 1);

      expect(spyObj).toHaveBeenCalled();
      expect(spyObj.calls.mostRecent().args[0]).toContain('Yay, congrats!');
      expect(spyObj.calls.mostRecent().args[0]).toContain('class="fa fa-check"');
    });
  });

  describe('alertify_error calls the error function', function() {
    it('and adds the warning symbol to the element', function () {
      let spyOrigError = spyOn(alertify, 'orig_error').and.callThrough();
      alertify.error('bad, very bad', 1);

      expect(spyOrigError).toHaveBeenCalled();
      expect(spyOrigError.calls.mostRecent().args[0]).toContain('bad, very bad');
      expect(spyOrigError.calls.mostRecent().args[0]).toContain('class="fa fa-exclamation-triangle"');
    });
  });

  describe('alertify_error calls pgRespErrorNotify notifier', function() {
    it('which alertifies response error for ajax calls', (done) => {
      $.ajax({
        url: 'http://some/dummy/url',
        dataType: 'json',
        error: function(xhr, status, error) {
          let spyOrigError = spyOn(alertify, 'orig_error').and.callThrough(),
            spyNotify = spyOn(alertify, 'notify').and.callThrough();

          /*When connection lost*/
          xhr.status = 0;
          alertify.pgRespErrorNotify(xhr, error);
          expect(spyOrigError).toHaveBeenCalled();
          expect(spyOrigError.calls.mostRecent().args[0]).toContain(
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
          expect(spyOrigError).toHaveBeenCalled();
          expect(spyOrigError.calls.mostRecent().args[0]).toContain(
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
          expect(spyNotify).toHaveBeenCalled();
          expect(spyNotify.calls.mostRecent().args[0]).toContain(
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
          expect(spyOrigError).toHaveBeenCalled();
          expect(spyOrigError.calls.mostRecent().args[0]).toContain(
            gettext('Some prefix message')
          );

          done();
        },
      });
    });
  });
});
