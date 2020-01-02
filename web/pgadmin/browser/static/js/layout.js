/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import pgAdmin from 'sources/pgadmin';
import url_for from 'sources/url_for';
import $ from 'jquery';
import * as Alertify from 'pgadmin.alertifyjs';
import gettext from 'sources/gettext';
import 'wcdocker';
import pgWindow from 'sources/window';

const pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

var wcDocker = window.wcDocker;

/* Add cache related methods and properties */
_.extend(pgBrowser, {
  lock_layout_levels : {
    PREVENT_DOCKING: 'docking',
    FULL: 'full',
    NONE: 'none',
  },

  // Build the default layout
  buildDefaultLayout: function(docker) {
    var browserPanel = docker.addPanel('browser', wcDocker.DOCK.LEFT);
    var dashboardPanel = docker.addPanel(
      'dashboard', wcDocker.DOCK.RIGHT, browserPanel);
    docker.addPanel('properties', wcDocker.DOCK.STACKED, dashboardPanel, {
      tabOrientation: wcDocker.TAB.TOP,
    });
    docker.addPanel('sql', wcDocker.DOCK.STACKED, dashboardPanel);
    docker.addPanel(
      'statistics', wcDocker.DOCK.STACKED, dashboardPanel);
    docker.addPanel(
      'dependencies', wcDocker.DOCK.STACKED, dashboardPanel);
    docker.addPanel(
      'dependents', wcDocker.DOCK.STACKED, dashboardPanel);
  },

  save_current_layout: function(layout_id, docker) {
    if(docker) {
      var layout = docker.save(),
        settings = { setting: layout_id, value: layout };
      $.ajax({
        type: 'POST',
        url: url_for('settings.store_bulk'),
        data: settings,
      });
    }
  },

  restore_layout: function(docker, layout, defaultLayoutCallback) {
    // Try to restore the layout if there is one
    if (layout != '') {
      try {
        docker.restore(layout);
      }
      catch(err) {
        docker.clear();
        if(defaultLayoutCallback) {
          defaultLayoutCallback(docker);
        }
      }
    } else {
      if(defaultLayoutCallback) {
        defaultLayoutCallback(docker);
      }
    }

    /* preference available only with top/opener browser. */
    let browser = pgWindow.pgAdmin.Browser;

    /* interval required initially as preference load may take time */
    let cacheIntervalId = setInterval(()=> {
      let browserPref = browser.get_preferences_for_module('browser');
      if(browserPref) {
        clearInterval(cacheIntervalId);

        browser.reflectLocklayoutChange(docker);

        browser.onPreferencesChange('browser', function() {
          browser.reflectLocklayoutChange(docker);
        });
      }
    }, 500);
  },

  reflectLocklayoutChange: function(docker) {
    let browser = pgWindow.pgAdmin.Browser;

    let browserPref = browser.get_preferences_for_module('browser');
    browser.lock_layout(docker, browserPref.lock_layout);
  },

  lock_layout: function(docker, op) {
    let menu_items = this.menus['file']['mnu_locklayout']['menu_items'];

    switch(op) {
    case this.lock_layout_levels.PREVENT_DOCKING:
      docker.lockLayout(wcDocker.LOCK_LAYOUT_LEVEL.PREVENT_DOCKING);
      break;
    case this.lock_layout_levels.FULL:
      docker.lockLayout(wcDocker.LOCK_LAYOUT_LEVEL.FULL);
      break;
    case this.lock_layout_levels.NONE:
      docker.lockLayout(wcDocker.LOCK_LAYOUT_LEVEL.NONE);
      break;
    }

    _.each(menu_items, function(menu_item) {
      if(menu_item.name != ('mnu_lock_'+op)) {
        menu_item.change_checked(false);
      } else {
        menu_item.change_checked(true);
      }
    });
  },

  save_lock_layout: function(op) {
    let browser = pgWindow.pgAdmin.Browser;

    $.ajax({
      url: url_for('browser.lock_layout'),
      method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({
        'value': op,
      }),
    }).done(function() {
      browser.cache_preferences('browser');
    }).fail(function(xhr, error) {
      Alertify.pgNotifier(error, xhr, gettext('Failed to save the lock layout setting.'));
    });
  },

  mnu_lock_docking: function() {
    this.lock_layout(this.docker, this.lock_layout_levels.PREVENT_DOCKING);
    this.save_lock_layout(this.lock_layout_levels.PREVENT_DOCKING);
  },

  mnu_lock_full: function() {
    this.lock_layout(this.docker, this.lock_layout_levels.FULL);
    this.save_lock_layout(this.lock_layout_levels.FULL);
  },

  mnu_lock_none: function() {
    this.lock_layout(this.docker, this.lock_layout_levels.NONE);
    this.save_lock_layout(this.lock_layout_levels.NONE);
  },
});

export {pgBrowser};
