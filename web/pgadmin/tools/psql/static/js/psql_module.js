/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { io } from 'socketio';
import {enable} from 'pgadmin.browser.toolbar';
import 'wcdocker';
import {getRandomInt, hasBinariesConfiguration, registerDetachEvent} from 'sources/utils';
import {retrieveAncestorOfTypeServer} from 'sources/tree/tree_utils';
import pgWindow from 'sources/window';
import Notify from '../../../../static/js/helpers/Notifier';

import {generateTitle, refresh_db_node} from 'tools/datagrid/static/js/datagrid_panel_title';


export function setPanelTitle(psqlToolPanel, panelTitle) {
  psqlToolPanel.title('<span title="'+panelTitle+'">'+panelTitle+'</span>');
}

var wcDocker = window.wcDocker;

export function initialize(gettext, url_for, $, _, pgAdmin, csrfToken, Browser) {
  var pgBrowser = Browser;
  var terminal = Terminal;
  var parentData = null;
  /* Return back, this has been called more than once */
  if (pgBrowser.psql)
    return pgBrowser.psql;


  // Create an Object Restore of pgBrowser class
  pgBrowser.psql = {
    init: function() {
      this.initialized = true;
      csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);
      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'psql',
        module: this,
        applies: ['tools'],
        callback: 'psql_tool',
        priority: 1,
        label: gettext('PSQL Tool'),
        enable: this.psqlToolEnabled,
      }];

      this.enable_psql_tool = pgAdmin['enable_psql'];
      if(pgAdmin['enable_psql']) {
        pgBrowser.add_menus(menus);
      }

      // Creating a new pgBrowser frame to show the data.
      var psqlFrameType = new pgBrowser.Frame({
        name: 'frm_psqltool',
        showTitle: true,
        isCloseable: true,
        isPrivate: true,
        url: 'about:blank',
      });

      var self = this;
      /* Cache may take time to load for the first time
       * Keep trying till available
       */
      let cacheIntervalId = setInterval(function() {
        if(pgBrowser.preference_version() > 0) {
          self.preferences = pgBrowser.get_preferences_for_module('psql');
          clearInterval(cacheIntervalId);
        }
      },0);

      pgBrowser.onPreferencesChange('psql', function() {
        self.preferences = pgBrowser.get_preferences_for_module('psql');
      });

      // Load the newly created frame
      psqlFrameType.load(pgBrowser.docker);
      return this;
    },
    /* Enable/disable PSQL tool menu in tools based
    * on node selected. if selected node is present
    * in unsupported_nodes, menu will be disabled
    * otherwise enabled.
    */
    psqlToolEnabled: function(obj) {

      var isEnabled = (() => {
        if (!_.isUndefined(obj) && !_.isNull(obj) && pgAdmin['enable_psql']) {
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

      enable(gettext('PSQL Tool'), isEnabled);
      return isEnabled;
    },
    psql_tool: function(data, aciTreeIdentifier, gen=false) {
      const serverInformation = retrieveAncestorOfTypeServer(pgBrowser, aciTreeIdentifier, gettext('PSQL Error'));
      if (!hasBinariesConfiguration(pgBrowser, serverInformation)) {
        return;
      }

      const node = pgBrowser.tree.findNodeByDomElement(aciTreeIdentifier);
      if (node === undefined || !node.getData()) {
        Notify.alert(
          gettext('PSQL Error'),
          gettext('No object selected.')
        );
        return;
      }

      parentData = pgBrowser.tree.getTreeNodeHierarchy(aciTreeIdentifier);

      if(_.isUndefined(parentData.server)) {
        Notify.alert(
          gettext('PSQL Error'),
          gettext('Please select a server/database object.')
        );
        return;
      }

      const transId = getRandomInt(1, 9999999);

      var panelTitle = '';
      // Set psql tab title as per prefrences setting.
      var title_data = {
        'database': parentData.database ? parentData.database.label : 'postgres' ,
        'username': parentData.server.user_name,
        'server': parentData.server.label,
        'type': 'psql_tool',
      };
      var tab_title_placeholder = pgBrowser.get_preferences_for_module('browser').psql_tab_title_placeholder;
      panelTitle = generateTitle(tab_title_placeholder, title_data);

      const [panelUrl, panelCloseUrl, db_label] = this.getPanelUrls(transId, panelTitle, parentData, gen);

      let psqlToolForm = `
        <form id="psqlToolForm" action="${panelUrl}" method="post">
          <input id="title" name="title" hidden />
          <input id='db' value='${db_label}' hidden />
          <input name="close_url" value="${panelCloseUrl}" hidden />
        </form>
        <script>
          document.getElementById("title").value = "${_.escape(panelTitle)}";
          document.getElementById("psqlToolForm").submit();
        </script>
      `;
      var open_new_tab = pgBrowser.get_preferences_for_module('browser').new_browser_tab_open;
      if (open_new_tab && open_new_tab.includes('psql_tool')) {
        var newWin = window.open('', '_blank');
        newWin.document.write(psqlToolForm);
        newWin.document.title = panelTitle;
      } else {
        /* On successfully initialization find the properties panel,
         * create new panel and add it to the dashboard panel.
         */
        var propertiesPanel = pgBrowser.docker.findPanels('properties');
        var psqlToolPanel = pgBrowser.docker.addPanel('frm_psqltool', wcDocker.DOCK.STACKED, propertiesPanel[0]);

        registerDetachEvent(psqlToolPanel);

        // Set panel title and icon
        setPanelTitle(psqlToolPanel, panelTitle);
        psqlToolPanel.icon('fas fa-terminal psql-tab-style');
        psqlToolPanel.focus();

        var openPSQLToolURL = function(j) {
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
                frame.openHTML(psqlToolForm);
              }
            }
          }, 100);
        };

        openPSQLToolURL(psqlToolPanel);

      }

    },
    getPanelUrls: function(transId, panelTitle, parentData) {
      let openUrl = url_for('psql.panel', {
        trans_id: transId,
      });
      const misc_preferences = pgBrowser.get_preferences_for_module('misc');
      var theme = misc_preferences.theme;

      openUrl += `?sgid=${parentData.server_group._id}`
        +`&sid=${parentData.server._id}`
        +`&did=${parentData.database._id}`
        +`&server_type=${parentData.server.server_type}`
        + `&theme=${theme}`;
      let db_label = '';
      if(parentData.database && parentData.database._id) {
        db_label = _.escape(parentData.database._label.replace('\\', '\\\\'));
        db_label = db_label.replace('\'', '\'');
        db_label = db_label.replace('"', '\"');
        openUrl += `&db=${db_label}`;
      } else {
        openUrl += `&db=${''}`;
      }

      let closeUrl = url_for('psql.close', {
        trans_id: transId,
      });
      return [openUrl, closeUrl, db_label];
    },
    psql_terminal: function() {
      // theme colors
      var term = new terminal({
        cursorBlink: true,
        macOptionIsMeta: true,
        scrollback: 5000,
      });

      return term;
    },
    psql_Addon: function(term) {
      const fitAddon = this.psql_fit_screen();
      term.loadAddon(fitAddon);

      const webLinksAddon = this.psql_web_link();
      term.loadAddon(webLinksAddon);

      const searchAddon = this.psql_search();
      term.loadAddon(searchAddon);

      fitAddon.fit();
      term.resize(15, 50);
      fitAddon.fit();
      return fitAddon;
    },
    psql_fit_screen: function() {
      return new FitAddon();
    },
    psql_web_link: function() {
      return new WebLinksAddon();
    },
    psql_search: function() {
      return new SearchAddon();
    },
    psql_socket: function() {
      return io('/pty', {pingTimeout: 120000, pingInterval: 25000});
    },
    set_theme: function(term) {
      var theme = {
        background: getComputedStyle(document.documentElement).getPropertyValue('--psql-background'),
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--psql-foreground'),
        cursor: getComputedStyle(document.documentElement).getPropertyValue('--psql-cursor'),
        cursorAccent: getComputedStyle(document.documentElement).getPropertyValue('--psql-cursorAccent'),
        selection: getComputedStyle(document.documentElement).getPropertyValue('--psql-selection'),
      };
      term.setOption('theme', theme);
    },
    psql_socket_io: function(socket, is_enable, sid, db, server_type, fitAddon, term) {
      // Listen all the socket events emit from server.
      socket.on('pty-output', function(data){
        if(data.error) {
          term.write('\r\n');
        }
        term.write(data.result);
        if(data.error) {
          term.write('\r\n');
        }
      });
      // Connect socket
      socket.on('connect', () => {
        if(is_enable == 'True'){
          socket.emit('start_process', {'sid': sid, 'db': db, 'stype': server_type });
        }
        fitAddon.fit();
        socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
      });

      socket.on('conn_error', (response) => {
        term.write(response.error);
        fitAddon.fit();
        socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
      });

      socket.on('conn_not_allow', () => {
        term.write('PSQL connection not allowed');
        fitAddon.fit();
        socket.emit('resize', {'cols': term.cols, 'rows': term.rows});
      });

      socket.on('disconnect-psql', () => {
        socket.emit('server-disconnect', {'sid': sid});
        term.write('\r\nServer disconnected, Connection terminated, To create new connection please open another psql tool.');
      });
    },
    psql_terminal_io: function(term, socket, platform) {
      // Listen key press event from terminal and emit socket event.
      term.attachCustomKeyEventHandler(e => {
        e.stopPropagation();
        if(e.type=='keydown' && (e.metaKey || e.ctrlKey) && (e.key == 'c' || e.key == 'C')) {
          document.execCommand('copy');
        }

        if (e.ctrlKey && platform == 'win32') {
          return false;
        }

        return true;
      });

      term.textarea.addEventListener('paste', function() {
        navigator.permissions.query({ name: 'clipboard-read' }).then(function(result) {
          if(result.state === 'granted' || result.state === 'prompt') {
            navigator.clipboard.readText().then( clipText => {
              var selected_text = clipText;
              if (selected_text.length > 0) {
                socket.emit('socket_input', {'input': selected_text, 'key_name': 'paste'});
              }
            });
          } else{
            Notify.alert(gettext('Clipboard read permission required'), gettext('To paste data on the PSQL terminal, Clipboard read permission required.'));
          }
        });
      });

      term.onKey(function (ev) {
        socket.emit('socket_input', {'input': ev.key, 'key_name': ev.domEvent.code});
      });
    },
    check_db_name_change: function(db_name, o_db_name) {
      if (db_name != o_db_name) {

        var selected_item = pgWindow.pgAdmin.Browser.tree.selected(),
          tree_data = pgWindow.pgAdmin.Browser.tree.translateTreeNodeIdFromReactTree(selected_item),
          database_data = pgWindow.pgAdmin.Browser.tree.findNode(tree_data[3]),
          dbNode = database_data.domNode;

        var message = `Current database has been moved or renamed to ${o_db_name}. Click on the OK button to refresh the database name, and reopen the psql again.`;
        refresh_db_node(message, dbNode);
      }
    },
  };

  return pgBrowser.psql;
}
