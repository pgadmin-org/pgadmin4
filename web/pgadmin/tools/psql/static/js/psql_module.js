/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { io } from 'socketio';
import {getRandomInt, hasBinariesConfiguration} from 'sources/utils';
import {retrieveAncestorOfTypeServer} from 'sources/tree/tree_utils';
import pgWindow from 'sources/window';
import { copyToClipboard } from '../../../../static/js/clipboard';
import {generateTitle, refresh_db_node} from 'tools/sqleditor/static/js/sqleditor_title';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import usePreferences from '../../../../preferences/static/js/store';


export function setPanelTitle(psqlToolPanel, panelTitle) {
  psqlToolPanel.title('<span title="'+_.escape(panelTitle)+'">'+_.escape(panelTitle)+'</span>');
}

export function initialize(gettext, url_for, _, pgAdmin, csrfToken, Browser) {
  let pgBrowser = Browser;
  let terminal = Terminal;
  let parentData = null;
  /* Return back, this has been called more than once */
  if (pgBrowser.psql)
    return pgBrowser.psql;


  // Create an Object Restore of pgBrowser class
  pgBrowser.psql = {
    init: function() {
      this.initialized = true;
      csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);
      // Define the nodes on which the menus to be appear
      let menus = [{
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
      return this;
    },
    /* Enable/disable PSQL tool menu in tools based
    * on node selected. if selected node is present
    * in unsupported_nodes, menu will be disabled
    * otherwise enabled.
    */
    psqlToolEnabled: function(obj) {

      let isEnabled = (() => {
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

      return isEnabled;
    },
    psql_tool: function(data, treeIdentifier) {
      const serverInformation = retrieveAncestorOfTypeServer(pgBrowser, treeIdentifier, gettext('PSQL Error'));
      if (!hasBinariesConfiguration(pgBrowser, serverInformation)) {
        return;
      }

      const node = pgBrowser.tree.findNodeByDomElement(treeIdentifier);
      if (node === undefined || !node.getData()) {
        pgAdmin.Browser.notifier.alert(
          gettext('PSQL Error'),
          gettext('No object selected.')
        );
        return;
      }

      parentData = pgBrowser.tree.getTreeNodeHierarchy(treeIdentifier);

      if(_.isUndefined(parentData.server)) {
        pgAdmin.Browser.notifier.alert(
          gettext('PSQL Error'),
          gettext('Please select a server/database object.')
        );
        return;
      }

      const transId = getRandomInt(1, 9999999);

      let panelTitle = '';
      // Set psql tab title as per prefrences setting.
      let title_data = {
        'database': parentData.database ? _.unescape(parentData.database.label) : 'postgres' ,
        'username': parentData.server.user.name,
        'server': parentData.server.label,
        'type': 'psql_tool',
      };
      let tab_title_placeholder = usePreferences.getState().getPreferencesForModule('browser').psql_tab_title_placeholder;
      panelTitle = generateTitle(tab_title_placeholder, title_data);

      const [panelUrl, db_label] = this.getPanelUrls(transId, parentData);

      const escapedTitle = _.escape(panelTitle);
      const open_new_tab = usePreferences.getState().getPreferencesForModule('browser').new_browser_tab_open;

      pgAdmin.Browser.Events.trigger(
        'pgadmin:tool:show',
        `${BROWSER_PANELS.PSQL_TOOL}_${transId}`,
        panelUrl,
        {title: escapedTitle, db: db_label},
        {title: panelTitle, icon: 'fas fa-terminal psql-tab-style', manualClose: false, renamable: true},
        Boolean(open_new_tab?.includes('psql_tool'))
      );

      return true;
    },
    getPanelUrls: function(transId, pData) {
      let openUrl = url_for('psql.panel', {
        trans_id: transId,
      });
      const misc_preferences = usePreferences.getState().getPreferencesForModule('misc');
      let theme = misc_preferences.theme;

      openUrl += `?sgid=${pData.server_group._id}`
        +`&sid=${pData.server._id}`
        +`&did=${pData.database._id}`
        +`&server_type=${pData.server.server_type}`
        + `&theme=${theme}`;

      if(pData.database && pData.database._id) {
        openUrl += `&db=${encodeURIComponent(pData.database._label)}`;
      } else {
        openUrl += `&db=${''}`;
      }

      return [openUrl, pData.database._label];
    },
    psql_terminal: function() {
      // theme colors
      return new terminal({
        cursorBlink: true,
        scrollback: 5000,
      });
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
      return io('/pty', {
        path: `${url_for('pgadmin.root')}/socket.io`,
        pingTimeout: 120000,
        pingInterval: 25000
      });
    },
    set_theme: function(term) {
      let theme = {
        background: getComputedStyle(document.documentElement).getPropertyValue('--psql-background'),
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--psql-foreground'),
        cursor: getComputedStyle(document.documentElement).getPropertyValue('--psql-cursor'),
        cursorAccent: getComputedStyle(document.documentElement).getPropertyValue('--psql-cursorAccent'),
        selection: getComputedStyle(document.documentElement).getPropertyValue('--psql-selection'),
      };
      term.setOption('theme', theme);
    },
    psql_socket_io: function(socket, is_enable, sid, db, server_type, fitAddon, term, role) {
      // Listen all the socket events emit from server.
      let init_psql = true;
      socket.on('pty-output', function(data){
        if(data.error) {
          term.write('\r\n');
        }
        term.write(data.result);
        if(data.error) {
          term.write('\r\n');
        }
        if (init_psql && data && role !== 'None') {
          // setting role if available
          socket.emit('socket_set_role',{'role': _.unescape(role)});
          init_psql = false;
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
          let selected_text = term.getSelection();
          navigator.permissions.query({ name: 'clipboard-write' }).then(function(result) {
            if(result.state === 'granted' || result.state === 'prompt') {
              copyToClipboard(selected_text);
            } else{
              pgAdmin.Browser.notifier.alert(gettext('Clipboard write permission required'), gettext('To copy data from PSQL terminal, Clipboard write permission required.'));
            }
          });
        }

        return !(e.ctrlKey && platform == 'win32');
      });

      term.textarea.addEventListener('paste', function() {
        navigator.permissions.query({ name: 'clipboard-read' }).then(function(result) {
          if(result.state === 'granted' || result.state === 'prompt') {
            navigator.clipboard.readText().then( clipText => {
              let selected_text = clipText;
              if (selected_text.length > 0) {
                socket.emit('socket_input', {'input': selected_text, 'key_name': 'paste'});
              }
            });
          } else{
            pgAdmin.Browser.notifier.alert(gettext('Clipboard read permission required'), gettext('To paste data on the PSQL terminal, Clipboard read permission required.'));
          }
        });
      });

      term.onKey(function (ev) {
        socket.emit('socket_input', {'input': ev.key, 'key_name': ev.domEvent.code});
      });
    },
    check_db_name_change: function(db_name, o_db_name) {
      if (db_name != o_db_name) {

        let selected_item = pgWindow.pgAdmin.Browser.tree.selected(),
          tree_data = pgWindow.pgAdmin.Browser.tree.translateTreeNodeIdFromReactTree(selected_item),
          database_data = pgWindow.pgAdmin.Browser.tree.findNode(tree_data[3]),
          dbNode = database_data.domNode;

        let message = `Current database has been moved or renamed to ${o_db_name}. Click on the OK button to refresh the database name, and reopen the psql again.`;
        refresh_db_node(message, dbNode);
      }
    },
  };

  return pgBrowser.psql;
}
