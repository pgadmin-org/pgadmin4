//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import alertify from '../../../pgadmin/static/vendor/alertifyjs/alertify';
import AlertifyWrapper from '../../../pgadmin/static/js/alerts/alertify_wrapper';

describe('alertify_wrapper', function () {
  describe('success', function () {
    it('calls the success function from alertify and adds the checkmark to the element', function () {
      spyOn(alertify, 'success');
      var alertifyWrapper = new AlertifyWrapper();

      alertifyWrapper.success('Yay, congrats!', 1);

      var calledWithMessage = alertify.success.calls.mostRecent().args[0];

      expect(calledWithMessage).toContain('Yay, congrats!');
      expect(calledWithMessage).toContain('class="fa fa-check"');
    });
  });

  describe('error', function () {
    it('calls the error function from alertify and adds the warning symbol to the element', function () {
      spyOn(alertify, 'error');
      var alertifyWrapper = new AlertifyWrapper();

      alertifyWrapper.error('bad, very bad', 1);

      var calledWithMessage = alertify.error.calls.mostRecent().args[0];

      expect(calledWithMessage).toContain('bad, very bad');
      expect(calledWithMessage).toContain('class="fa fa-exclamation-triangle"');
    });
  });
});
