import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';
import * as modifyAnimation from 'sources/modify_animation';
import $ from 'jquery';
import * as Alertify from 'pgadmin.alertifyjs';
import * as SqlEditorUtils from 'sources/sqleditor_utils';

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
    // If cache is not yet loaded then keep checking
    if(_.size(self.preferences_cache) == 0) {
      var check_preference = function() {
          if(self.preferences_cache.length > 0) {
            clearInterval(preferenceTimeout);
            return _.findWhere(
            self.preferences_cache, {'module': module, 'name': preference}
          );
          }
        },
        preferenceTimeout = setInterval(check_preference, 1000);
    }
    else {
      return _.findWhere(
        self.preferences_cache, {'module': module, 'name': preference}
      );
    }
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
    var self = this;
    setTimeout(function() {
      $.ajax({
        url: url_for('preferences.get_all'),
      })
      .done(function(res) {
        self.preferences_cache = res;
        self.preference_version(self.generate_preference_version());

        pgBrowser.keyboardNavigation.init();
        if(pgBrowser.tree) {
          modifyAnimation.modifyAcitreeAnimation(self);
          modifyAnimation.modifyAlertifyAnimation(self);
        }

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
    window.parent.$(parent.document).on('prefchange:'+module, function(event) {
      /* If a sqleditor is closed, event handler will be called
       * but the window.top will be null. Unbind the event handler
       */
      if(window.top === null) {
        window.$(document).off(event);
      }
      else {
        eventHandler(event);
      }
    });
  },

});

export {pgBrowser};
