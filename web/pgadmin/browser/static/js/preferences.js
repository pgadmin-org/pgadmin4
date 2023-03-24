/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';
import Notify from '../../../static/js/helpers/Notifier';
import { shortcutToString } from '../../../static/js/components/ShortcutTitle';
import gettext from 'sources/gettext';
import getApiInstance from '../../../static/js/api_instance';


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

    return _.find(
      self.preferences_cache, {'module': module, 'name': preference}
    );
  },

  /* Get all the preferences of a module */
  get_preferences_for_module: function(module) {
    let self = this;
    let preferences = {};
    _.forEach(
      _.filter(self.preferences_cache, {'module': module}),
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
    let self = this;
    /* find returns undefined if not found */
    return _.find(self.preferences_cache, {'id': id});
  },

  // Get and cache the preferences
  cache_preferences: function (modulesChanged) {
    let self = this;

    setTimeout(function() {
      getApiInstance().get(url_for('preferences.get_all'))
        .then(({data: res})=>{
          self.preferences_cache = res;
          self.preference_version(self.generate_preference_version());

          pgBrowser.keyboardNavigation.init();

          // Initialize Tree saving/reloading
          pgBrowser.browserTreeState.init();

          /* Once the cache is loaded after changing the preferences,
          * notify the modules of the change
          */
          if(modulesChanged) {
            if(typeof modulesChanged === 'string'){
              pgBrowser.Events.trigger('prefchange:'+modulesChanged);
            } else {
              _.each(modulesChanged, (val, key)=> {
                pgBrowser.Events.trigger('prefchange:'+key);
              });
            }
          }
        })
        .catch(function(error) {
          Notify.pgRespErrorNotify(error);
        });
    }, 500);
  },

  triggerPreferencesChange: function(moduleChanged) {
    pgBrowser.Events.trigger('prefchange:'+moduleChanged);
  },

  reflectPreferences: function(module) {
    let obj = this;
    //browser preference
    if(module === 'browser') {
      let browserPreferences = obj.get_preferences_for_module('browser');
      let buttonList = obj?.panels?.browser?.panel?._buttonList;
      buttonList.forEach(btn => {
        let key = null;
        switch(btn.name) {
        case gettext('Query Tool'):
          key = shortcutToString(browserPreferences.sub_menu_query_tool,null,true);
          obj?.panels?.browser?.panel?.updateButton(gettext('Query Tool'), {key});
          break;
        case gettext('View Data'):
          key = shortcutToString(browserPreferences.sub_menu_view_data,null,true);
          obj?.panels?.browser?.panel?.updateButton(gettext('View Data'), {key});
          break;
        case gettext('Search objects'):
          key = shortcutToString(browserPreferences.sub_menu_search_objects,null,true);
          obj?.panels?.browser?.panel?.updateButton(gettext('Search objects'), {key});
        }
      });
    }
  },

  onPreferencesChange: function(module, eventHandler) {
    pgBrowser.Events?.on('prefchange:'+module, function(event) {
      eventHandler(event);
    });
  },

});

export {pgBrowser};
