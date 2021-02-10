/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';
import $ from 'jquery';
import * as Alertify from 'pgadmin.alertifyjs';
import * as SqlEditorUtils from 'sources/sqleditor_utils';
import pgWindow from 'sources/window';

var modifyAnimation = require('sources/modify_animation');

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

/* Add cache related methods and properties */
_.extend(pgBrowser, {
  /* This will hold preference data (Works as a cache object)
   * Here node will be a key and it's preference data will be value
   */
  preferences_cache: [],

  /* This will be used by poller of new tabs/windows to check
   * if preference cache is updated in parent/window.opener.
   */
  prefcache_version: 0,

  /* Generate a unique version number */
  generate_preference_version: function() {
    return (new Date()).getTime();
  },

  preference_version: function(version) {
    if(version) {
      this.prefcache_version = version;
    }
    else {
      return this.prefcache_version;
    }
  },

  /* Get cached preference */
  get_preference: function(module, preference){
    const self = this;

    return _.findWhere(
      self.preferences_cache, {'module': module, 'name': preference}
    );
  },

  /* Get all the preferences of a module */
  get_preferences_for_module: function(module) {
    var self = this;
    let preferences = {};
    _.each(
      _.where(self.preferences_cache, {'module': module}),
      (preference) => {
        preferences[preference.name] = preference.value;
      }
    );
    if(Object.keys(preferences).length > 0) {
      return preferences;
    }
  },

  /* Get preference of an id, id is numeric */
  get_preference_for_id : function(id) {
    var self = this;
    /* findWhere returns undefined if not found */
    return _.findWhere(self.preferences_cache, {'id': id});
  },

  // Get and cache the preferences
  cache_preferences: function (modulesChanged) {
    var self = this,
      headers = {};
    headers[pgAdmin.csrf_token_header] = pgAdmin.csrf_token;

    setTimeout(function() {
      $.ajax({
        url: url_for('preferences.get_all'),
        headers: headers,
      })
        .done(function(res) {
          self.preferences_cache = res;
          self.preference_version(self.generate_preference_version());

          pgBrowser.keyboardNavigation.init();
          if(pgBrowser.tree) {
            modifyAnimation.modifyAcitreeAnimation(self);
            modifyAnimation.modifyAlertifyAnimation(self);
          }

          // Initialize Tree saving/reloading
          pgBrowser.browserTreeState.init();

          /* Once the cache is loaded after changing the preferences,
         * notify the modules of the change
         */
          if(modulesChanged) {
            if(typeof modulesChanged === 'string'){
              $.event.trigger('prefchange:'+modulesChanged);
            } else {
              _.each(modulesChanged, (val, key)=> {
                $.event.trigger('prefchange:'+key);
              });
            }
          }
        })
        .fail(function(xhr, status, error) {
          Alertify.pgRespErrorNotify(xhr, error);
        });
    }, 500);
  },

  reflectPreferences: function(module) {
    let obj = this;

    if(module === 'sqleditor' || module === null || typeof module === 'undefined') {
      let sqlEditPreferences = obj.get_preferences_for_module('sqleditor');

      $(obj.editor.getWrapperElement()).css(
        'font-size',SqlEditorUtils.calcFontSize(sqlEditPreferences.sql_font_size)
      );
      obj.editor.setOption('tabSize', sqlEditPreferences.tab_size);
      obj.editor.setOption('lineWrapping', sqlEditPreferences.wrap_code);
      obj.editor.setOption('autoCloseBrackets', sqlEditPreferences.insert_pair_brackets);
      obj.editor.setOption('matchBrackets', sqlEditPreferences.brace_matching);
      obj.editor.refresh();
    }
  },

  onPreferencesChange: function(module, eventHandler) {
    $(pgWindow).on('prefchange:'+module, function(event) {
      eventHandler(event);
    });
  },

});

export {pgBrowser};
