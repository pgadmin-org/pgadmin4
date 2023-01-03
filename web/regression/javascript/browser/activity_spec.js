/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import {pgBrowser} from 'pgadmin.browser.activity';
import { getEpoch } from 'sources/utils';
import pgWindow from 'sources/window';

describe('For Activity', function(){
  beforeEach(function(){
    pgAdmin.user_inactivity_timeout = 60;
    pgAdmin.override_user_inactivity_timeout = true;

    /* pgBrowser here is same as main window Browser */
    pgWindow.pgAdmin = {
      Browser: pgBrowser,
    };
  });

  describe('is_pgadmin_timedout', function(){
    it('when not timedout', function(){
      expect(pgBrowser.is_pgadmin_timedout()).toEqual(false);
    });

    it('when timedout', function(){
      pgWindow.pgAdmin = undefined;
      expect(pgBrowser.is_pgadmin_timedout()).toEqual(true);
    });
  });

  describe('is_inactivity_timeout', function(){
    it('when there is activity', function(){
      pgWindow.pgAdmin.Browser.inactivity_timeout_at = getEpoch() + 30;
      expect(pgBrowser.is_inactivity_timeout()).toEqual(false);
    });

    it('when there is no activity', function(){
      pgWindow.pgAdmin.Browser.inactivity_timeout_at = getEpoch() - 30;
      expect(pgBrowser.is_inactivity_timeout()).toEqual(true);
    });
  });

  describe('log_activity', function(){
    beforeEach(function(){
      spyOn(pgBrowser, 'get_epoch_now').and.callThrough();
      spyOn(pgBrowser, 'log_activity').and.callThrough();
      pgBrowser.logging_activity = false;
    });

    it('initial log activity', function(){
      pgBrowser.log_activity();
      expect(pgWindow.pgAdmin.Browser.inactivity_timeout_at).not.toBe(null);
      expect(pgBrowser.get_epoch_now).toHaveBeenCalled();
    });

    it('multiple log activity within a second', function(){
      /* First call */
      pgBrowser.log_activity();
      expect(pgBrowser.get_epoch_now).toHaveBeenCalled();
      expect(pgBrowser.logging_activity).toEqual(true);

      /* Second call */
      pgBrowser.get_epoch_now.calls.reset();
      pgBrowser.log_activity();
      expect(pgBrowser.get_epoch_now).not.toHaveBeenCalled();
    });

    it('set login to false after timeout', function(done){
      pgBrowser.log_activity();
      expect(pgBrowser.logging_activity).toEqual(true);
      setTimeout(()=>{
        expect(pgBrowser.logging_activity).toEqual(false);
        done();
      }, 1001);
    });
  });

  describe('register_to_activity_listener', function(){
    let target = document;
    let timeout_callback = jasmine.createSpy();
    let event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    beforeEach(function(){
      spyOn(pgBrowser, 'log_activity');
      spyOn(target, 'addEventListener').and.callThrough();
      spyOn(target, 'removeEventListener').and.callThrough();
      pgBrowser.register_to_activity_listener(target, timeout_callback);
    });

    it('function called', function(){
      expect(target.addEventListener).toHaveBeenCalled();
    });

    it('event triggered', function(done){
      target.dispatchEvent(event);

      setTimeout(()=>{
        expect(pgBrowser.log_activity).toHaveBeenCalled();
        done();
      }, 250);
    });

    it('is timed out', function(done){
      spyOn(pgBrowser, 'is_pgadmin_timedout').and.returnValue(true);
      target.dispatchEvent(event);

      setTimeout(()=>{
        expect(timeout_callback).toHaveBeenCalled();
        expect(target.removeEventListener).toHaveBeenCalled();
        done();
      }, 250);
    });
  });

  describe('override_activity_event_decorator', function(){
    let input_func = jasmine.createSpy('input_func');
    let decorate_func = pgBrowser.override_activity_event_decorator(input_func);
    beforeEach(function(){
      spyOn(pgBrowser, 'log_activity').and.callThrough();
    });

    it('call the input_func', function(){
      decorate_func();
      expect(input_func).toHaveBeenCalled();
    });

    it('log activity when override_user_inactivity_timeout true', function(){
      decorate_func();
      expect(pgBrowser.log_activity).toHaveBeenCalled();
    });

    it('do not log activity when override_user_inactivity_timeout true', function(){
      pgAdmin.override_user_inactivity_timeout = false;
      decorate_func();
      expect(pgBrowser.log_activity).not.toHaveBeenCalled();
    });
  });

  describe('start_inactivity_timeout_daemon', function(){
    beforeEach(function(){
      spyOn(pgBrowser, 'logout_inactivity_user');
    });

    it('start the daemon', function(done){
      spyOn(pgBrowser, 'is_inactivity_timeout').and.returnValue(false);
      pgBrowser.inactivity_timeout_daemon_running = false;
      pgBrowser.start_inactivity_timeout_daemon();
      setTimeout(()=>{
        expect(pgBrowser.inactivity_timeout_daemon_running).toEqual(true);
        done();
      }, 1001);
    });

    it('stop the daemon', function(done){
      spyOn(pgBrowser, 'is_inactivity_timeout').and.returnValue(true);
      pgBrowser.inactivity_timeout_daemon_running = false;
      pgBrowser.start_inactivity_timeout_daemon();
      setTimeout(()=>{
        expect(pgBrowser.inactivity_timeout_daemon_running).toEqual(false);
        expect(pgBrowser.logout_inactivity_user).toHaveBeenCalled();
        done();
      }, 1001);
    });
  });
});
