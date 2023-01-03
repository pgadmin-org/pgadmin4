/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import _ from 'lodash';

import pgAdmin from 'sources/pgadmin';
import pgWindow from 'sources/window';
import {getEpoch} from 'sources/utils';

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};
const MIN_ACTIVITY_TIME_UNIT = 1000; /* in seconds */
/*
 * User UI activity related functions.
 */
_.extend(pgBrowser, {
  inactivity_timeout_at: null,
  logging_activity: false,
  inactivity_timeout_daemon_running: false,

  is_pgadmin_timedout: function() {
    return !pgWindow.pgAdmin;
  },

  is_inactivity_timeout: function() {
    return pgWindow.pgAdmin.Browser.inactivity_timeout_at < this.get_epoch_now();
  },

  get_epoch_now: function(){
    return getEpoch();
  },

  log_activity: function() {
    if(!this.logging_activity) {
      this.logging_activity = true;
      this.inactivity_timeout_at = this.get_epoch_now() + pgAdmin.user_inactivity_timeout;

      /* No need to log events till next MIN_ACTIVITY_TIME_UNIT second as the
       * value of inactivity_timeout_at won't change
       */
      setTimeout(()=>{
        this.logging_activity = false;
      }, MIN_ACTIVITY_TIME_UNIT);
    }
  },

  /* Call this to register element for acitivity monitoring
   * Generally, document is passed to cover all.
   */
  register_to_activity_listener: function(target, timeout_callback) {
    let inactivity_events = ['mousemove', 'mousedown', 'keydown'];
    let self = this;
    inactivity_events.forEach((event)=>{
      /* Bind events in the event capture phase, the bubble phase might stop propagation */
      let eventHandler = function() {
        if(self.is_pgadmin_timedout()) {
          /* If the main page has logged out then remove the listener and call the timeout callback */
          inactivity_events.forEach((events)=>{
            target.removeEventListener(events, eventHandler, true);
          });
          timeout_callback();
        } else {
          pgWindow.pgAdmin.Browser.log_activity();
        }
      };

      target.addEventListener(event, eventHandler, true);
    });
  },

  /*
   * This function can be used by tools like sqleditor where
   * poll call is as good as user activity. Decorate such functions
   * with this to consider them as events. Note that, this is controlled
   * by override_user_inactivity_timeout.
   */
  override_activity_event_decorator: function(input_func) {
    return function() {
      /* Log only if override_user_inactivity_timeout true */
      if(pgAdmin.override_user_inactivity_timeout) {
        pgWindow.pgAdmin.Browser.log_activity();
      }
      return input_func.apply(this, arguments);
    };
  },

  logout_inactivity_user: function() {
    if (!_.isUndefined(pgBrowser.utils) &&
        !_.isUndefined(pgBrowser.utils.logout_url)) {
      window.location.href = pgBrowser.utils.logout_url;
    }
  },

  /* The daemon will track and logout when timeout occurs */
  start_inactivity_timeout_daemon: function() {
    let self = this;
    if(pgAdmin.user_inactivity_timeout > 0 && !self.inactivity_timeout_daemon_running) {
      let timeout_daemon_id = setInterval(()=>{
        self.inactivity_timeout_daemon_running = true;
        if(self.is_inactivity_timeout()) {
          clearInterval(timeout_daemon_id);
          self.inactivity_timeout_daemon_running = false;
          $(window).off('beforeunload');
          self.logout_inactivity_user();
        }
      }, MIN_ACTIVITY_TIME_UNIT);
    }
  },
});

export {pgBrowser};
