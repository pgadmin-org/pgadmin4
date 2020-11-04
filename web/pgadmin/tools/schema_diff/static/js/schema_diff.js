/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('pgadmin.schemadiff', [
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'sources/pgadmin', 'sources/csrf', 'pgadmin.alertifyjs', 'pgadmin.browser.node',
], function(
  gettext, url_for, $, _, pgAdmin, csrfToken, Alertify,
) {

  var wcDocker = window.wcDocker,
    pgBrowser = pgAdmin.Browser;
  /* Return back, this has been called more than once */
  if (pgBrowser.SchemaDiff)
    return pgBrowser.SchemaDiff;

  // Create an Object Restore of pgBrowser class
  pgBrowser.SchemaDiff = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;
      csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);


      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'schema_diff',
        module: this,
        applies: ['tools'],
        callback: 'show_schema_diff_tool',
        priority: 1,
        label: gettext('Schema Diff'),
        enable: true,
      }];

      pgBrowser.add_menus(menus);

      // Creating a new pgBrowser frame to show the data.
      var schemaDiffFrameType = new pgBrowser.Frame({
        name: 'frm_schemadiff',
        showTitle: true,
        isCloseable: true,
        isPrivate: true,
        url: 'about:blank',
      });

      let self = this;
      /* Cache may take time to load for the first time
       * Keep trying till available
       */
      let cacheIntervalId = setInterval(function() {
        if(pgBrowser.preference_version() > 0) {
          self.preferences = pgBrowser.get_preferences_for_module('schema_diff');
          clearInterval(cacheIntervalId);
        }
      },0);

      pgBrowser.onPreferencesChange('schema_diff', function() {
        self.preferences = pgBrowser.get_preferences_for_module('schema_diff');
      });

      // Load the newly created frame
      schemaDiffFrameType.load(pgBrowser.docker);
      return this;
    },

    // Callback to draw schema diff for objects
    show_schema_diff_tool: function() {
      var self = this,
        baseUrl = url_for('schema_diff.initialize', null);

      $.ajax({
        url: baseUrl,
        method: 'GET',
        dataType: 'json',
        contentType: 'application/json',
      })
        .done(function(res) {
          self.trans_id = res.data.schemaDiffTransId;
          res.data.panel_title = gettext('Schema Diff'); //TODO: Set the panel title
          // TODO: Following function is used to test the fetching of the
          // databases this should be moved to server selection event later.
          self.launch_schema_diff(res.data);
        })
        .fail(function(xhr) {
          self.raise_error_on_fail(gettext('Schema Diff initialize error') , xhr);
        });
    },

    launch_schema_diff: function(data) {
      var panel_title = data.panel_title,
        trans_id = data.schemaDiffTransId,
        panel_tooltip = '';

      var url_params = {
          'trans_id': trans_id,
          'editor_title': panel_title,
        },
        baseUrl = url_for('schema_diff.panel', url_params);

      var browser_preferences = pgBrowser.get_preferences_for_module('browser');
      var open_new_tab = browser_preferences.new_browser_tab_open;
      if (open_new_tab && open_new_tab.includes('schema_diff')) {
        window.open(baseUrl, '_blank');
      } else {

        var propertiesPanel = pgBrowser.docker.findPanels('properties'),
          schemaDiffPanel = pgBrowser.docker.addPanel('frm_schemadiff', wcDocker.DOCK.STACKED, propertiesPanel[0]);

        // Rename schema diff tab
        schemaDiffPanel.on(wcDocker.EVENT.RENAME, function(panel_data) {
          Alertify.prompt('', panel_data.$titleText[0].textContent,
            // We will execute this function when user clicks on the OK button
            function(evt, value) {
              if(value) {
                schemaDiffPanel.title('<span>'+ _.escape(value) +'</span>');
              }
            },
            // We will execute this function when user clicks on the Cancel
            // button.  Do nothing just close it.
            function(evt) { evt.cancel = false; }
          ).set({'title': gettext('Rename Panel')});
        });

        // Set panel title and icon
        schemaDiffPanel.title('<span title="'+panel_tooltip+'">'+panel_title+'</span>');
        schemaDiffPanel.icon('pg-font-icon icon-schema-diff');
        schemaDiffPanel.focus();

        var openSchemaDiffURL = function(j) {
          // add spinner element
          $(j).data('embeddedFrame').$container.append(pgBrowser.SchemaDiff.spinner_el);
          setTimeout(function() {
            var frameInitialized = $(j).data('frameInitialized');
            if (frameInitialized) {
              var frame = $(j).data('embeddedFrame');
              if (frame) {
                frame.openURL(baseUrl);
                frame.$container.find('.pg-sp-container').delay(1000).hide(1);
              }
            } else {
              openSchemaDiffURL(j);
            }
          }, 100);
        };

        openSchemaDiffURL(schemaDiffPanel);
      }

    },
  };

  return pgBrowser.SchemaDiff;
});
