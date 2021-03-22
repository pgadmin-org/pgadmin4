/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import Alertify from 'pgadmin.alertifyjs';
import {getTreeNodeHierarchyFromIdentifier} from 'sources/tree/pgadmin_tree_node';
import {getPanelTitle} from 'tools/datagrid/static/js/datagrid_panel_title';
import {getRandomInt} from 'sources/utils';


export function setPanelTitle(erdToolPanel, panelTitle) {
  erdToolPanel.title('<span title="'+panelTitle+'">'+panelTitle+'</span>');
}

export function initialize(gettext, url_for, $, _, pgAdmin, csrfToken, pgBrowser, wcDocker) {
  /* Return back, this has been called more than once */
  if (pgBrowser.erd)
    return pgBrowser.erd;

  pgBrowser.erd = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;
      csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);


      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'erd',
        module: this,
        applies: ['tools'],
        callback: 'showErdTool',
        priority: 1,
        label: gettext('New ERD Project (Beta)'),
        enable: this.erdToolEnabled,
        data: {
          data_disabled: gettext('The selected tree node does not support this option.'),
        },
      }];

      pgBrowser.add_menus(menus);

      // Creating a new pgBrowser frame to show the data.
      var erdFrameType = new pgBrowser.Frame({
        name: 'frm_erdtool',
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
          self.preferences = pgBrowser.get_preferences_for_module('erd');
          clearInterval(cacheIntervalId);
        }
      },0);

      pgBrowser.onPreferencesChange('erd', function() {
        self.preferences = pgBrowser.get_preferences_for_module('erd');
      });

      // Load the newly created frame
      erdFrameType.load(pgBrowser.docker);
      return this;
    },

    erdToolEnabled: function(obj) {
      /* Same as query tool */
      var isEnabled = (() => {
        if (!_.isUndefined(obj) && !_.isNull(obj)) {
          if (_.indexOf(pgAdmin.unsupported_nodes, obj._type) == -1) {
            if (obj._type == 'database' && obj.allowConn) {
              return true;
            } else if (obj._type != 'database') {
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      })();
      return isEnabled;
    },

    // Callback to draw schema diff for objects
    showErdTool: function(data, aciTreeIdentifier, gen=false) {
      const node = pgBrowser.treeMenu.findNodeByDomElement(aciTreeIdentifier);
      if (node === undefined || !node.getData()) {
        Alertify.alert(
          gettext('ERD Error'),
          gettext('No object selected.')
        );
        return;
      }

      const parentData = getTreeNodeHierarchyFromIdentifier.call(
        pgBrowser,
        aciTreeIdentifier
      );

      if(_.isUndefined(parentData.database)) {
        Alertify.alert(
          gettext('ERD Error'),
          gettext('Please select a database/database object.')
        );
        return;
      }

      const transId = getRandomInt(1, 9999999);
      const panelTitle = getPanelTitle(pgBrowser, aciTreeIdentifier);
      const [panelUrl, panelCloseUrl] = this.getPanelUrls(transId, panelTitle, parentData, gen);

      let erdToolForm = `
        <form id="erdToolForm" action="${panelUrl}" method="post">
          <input id="title" name="title" hidden />
          <input name="close_url" value="${panelCloseUrl}" hidden />
        </form>
        <script>
          document.getElementById("title").value = "${_.escape(panelTitle)}";
          document.getElementById("erdToolForm").submit();
        </script>
      `;

      var open_new_tab = pgBrowser.get_preferences_for_module('browser').new_browser_tab_open;
      if (open_new_tab && open_new_tab.includes('erd_tool')) {
        var newWin = window.open('', '_blank');
        newWin.document.write(erdToolForm);
        newWin.document.title = panelTitle;
        // Send the signal to runtime, so that proper zoom level will be set.
        setTimeout(function() {
          pgBrowser.send_signal_to_runtime('Runtime new window opened');
        }, 500);
      } else {
        /* On successfully initialization find the dashboard panel,
         * create new panel and add it to the dashboard panel.
         */
        var propertiesPanel = pgBrowser.docker.findPanels('properties');
        var erdToolPanel = pgBrowser.docker.addPanel('frm_erdtool', wcDocker.DOCK.STACKED, propertiesPanel[0]);

        // Set panel title and icon
        setPanelTitle(erdToolPanel, 'Untitled');
        erdToolPanel.icon('fa fa-sitemap');
        erdToolPanel.focus();

        // Listen on the panel closed event.
        erdToolPanel.on(wcDocker.EVENT.CLOSED, function() {
          $.ajax({
            url: panelCloseUrl,
            method: 'DELETE',
          });
        });

        var openErdToolURL = function(j) {
          // add spinner element
          let $spinner_el =
            $(`<div class="pg-sp-container">
                  <div class="pg-sp-content">
                      <div class="row">
                          <div class="col-12 pg-sp-icon"></div>
                      </div>
                  </div>
              </div>`).appendTo($(j).data('embeddedFrame').$container);

          let init_poller_id = setInterval(function() {
            var frameInitialized = $(j).data('frameInitialized');
            if (frameInitialized) {
              clearInterval(init_poller_id);
              var frame = $(j).data('embeddedFrame');
              if (frame) {
                frame.onLoaded(()=>{
                  $spinner_el.remove();
                });
                frame.openHTML(erdToolForm);
              }
            }
          }, 100);
        };

        openErdToolURL(erdToolPanel);
      }
    },

    getPanelUrls: function(transId, panelTitle, parentData, gen) {
      let openUrl = url_for('erd.panel', {
        trans_id: transId,
      });

      openUrl += `?sgid=${parentData.server_group._id}`
        +`&sid=${parentData.server._id}`
        +`&server_type=${parentData.server.server_type}`
        +`&did=${parentData.database._id}`
        +`&gen=${gen}`;

      let closeUrl = url_for('erd.close', {
        trans_id: transId,
        sgid: parentData.server_group._id,
        sid: parentData.server._id,
        did: parentData.database._id,
      });

      return [openUrl, closeUrl];
    },
  };

  return pgBrowser.erd;
}
