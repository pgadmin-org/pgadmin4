/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom/client';

import gettext from 'sources/gettext';
import { sprintf } from 'sources/utils';
import url_for from 'sources/url_for';
import pgWindow from 'sources/window';
import Kerberos from 'pgadmin.authenticate.kerberos';

import { refresh_db_node } from 'tools/sqleditor/static/js/sqleditor_title';
import getApiInstance from '../../../../static/js/api_instance';
import { getFunctionId, getProcedureId, getAppropriateLabel, getDebuggerTitle } from './debugger_utils';
import FunctionArguments from './debugger_ui';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import DebuggerComponent from './components/DebuggerComponent';
import Theme from '../../../../static/js/Theme';
import { BROWSER_PANELS } from '../../../../browser/static/js/constants';
import { NotifierProvider } from '../../../../static/js/helpers/Notifier';
import usePreferences, { listenPreferenceBroadcast } from '../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import { PgAdminProvider } from '../../../../static/js/PgAdminProvider';

export default class DebuggerModule {
  static instance;

  static getInstance(...args) {
    if (!DebuggerModule.instance) {
      DebuggerModule.instance = new DebuggerModule(...args);
    }
    return DebuggerModule.instance;
  }

  constructor(pgAdmin, pgBrowser) {
    this.pgAdmin = pgAdmin;
    this.pgBrowser = pgBrowser;
    this.funcArgs = new FunctionArguments();
    this.api = getApiInstance();
  }

  init() {
    if (this.initialized)
      return;
    this.initialized = true;
    // Initialize the context menu to display the debugging options when user open the context menu for functions, procedures, triggers and trigger functions.
    this.pgBrowser.add_menus([
      {
        name: 'direct_debugger',
        node: 'function',
        module: this,
        applies: ['object', 'context'],
        callback: 'getFunctionInformation',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'function',
        },
        enable: 'canDebug',
      }, {
        name: 'global_debugger',
        node: 'function',
        module: this,
        applies: ['object', 'context'],
        callback: 'checkFuncDebuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'function',
          debug_type: 'indirect',
        },
        enable: 'canDebug',
      }, {
        name: 'procedure_direct_debugger',
        node: 'procedure',
        module: this,
        applies: ['object', 'context'],
        callback: 'getFunctionInformation',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'procedure',
        },
        enable: 'canDebug',
      }, {
        name: 'procedure_indirect_debugger',
        node: 'procedure',
        module: this,
        applies: ['object', 'context'],
        callback: 'checkFuncDebuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'procedure',
          debug_type: 'indirect',
        },
        enable: 'canDebug',
      }, {
        name: 'trigger_function_indirect_debugger',
        node: 'trigger_function',
        module: this,
        applies: ['object', 'context'],
        callback: 'checkFuncDebuggable',
        priority: 10,
        label: gettext('Set Breakpoint'),
        category: gettext('Debugging'),
        data: {
          object: 'trigger_function',
          debug_type: 'indirect',
        },
        enable: 'canDebug',
      }, {
        name: 'trigger_indirect_debugger',
        node: 'trigger',
        module: this,
        applies: ['object', 'context'],
        callback: 'checkFuncDebuggable',
        priority: 10,
        label: gettext('Set Breakpoint'),
        category: gettext('Debugging'),
        data: {
          object: 'trigger',
          debug_type: 'indirect',
        },
        enable: 'canDebug',
      }, {
        name: 'package_function_direct_debugger',
        node: 'edbfunc',
        module: this,
        applies: ['object', 'context'],
        callback: 'getFunctionInformation',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'edbfunc',
        },
        enable: 'canDebug',
      }, {
        name: 'package_function_global_debugger',
        node: 'edbfunc',
        module: this,
        applies: ['object', 'context'],
        callback: 'checkFuncDebuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'edbfunc',
          debug_type: 'indirect',
        },
        enable: 'canDebug',
      }, {
        name: 'package_procedure_direct_debugger',
        node: 'edbproc',
        module: this,
        applies: ['object', 'context'],
        callback: 'getFunctionInformation',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Debug'),
        data: {
          object: 'edbproc',
        },
        enable: 'canDebug',
      }, {
        name: 'package_procedure_global_debugger',
        node: 'edbproc',
        module: this,
        applies: ['object', 'context'],
        callback: 'checkFuncDebuggable',
        category: gettext('Debugging'),
        priority: 10,
        label: gettext('Set Breakpoint'),
        data: {
          object: 'edbproc',
          debug_type: 'indirect',
        },
        enable: 'canDebug',
      }
    ]);
  }

  // It will check weather the function is actually debuggable or not with pre-required condition.
  canDebug(itemData, item, data) {
    let tree = this.pgBrowser.tree,
      d = itemData,
      treeInfo = tree.getTreeNodeHierarchy(item);

    // Disable debugging for catalog functions
    if ('catalog' in treeInfo)
      return false;

    if (!d)
      return false;

    // For indirect debugging user must be super user
    if (data?.debug_type == 'indirect' && !treeInfo.server.user.is_superuser)
      return false;

    // Fetch object owner
    let obj_owner = treeInfo.function?.funcowner || treeInfo.procedure?.funcowner ||
      treeInfo.edbfunc?.funcowner || treeInfo.edbproc?.funcowner;

    // Must be a super user or object owner to create breakpoints of any kind
    if (!(treeInfo.server.user.is_superuser || obj_owner == treeInfo.server.user.name))
      return false;

    // For trigger node, language will be undefined - we should allow indirect debugging for trigger node
    if ((d.language == undefined && d._type == 'trigger') ||
      (d.language == undefined && d._type == 'edbfunc') ||
      (d.language == undefined && d._type == 'edbproc')) {
      return true;
    }

    let returnValue = true;
    if (d.language != 'plpgsql' && d.language != 'edbspl') {
      returnValue = false;
    }

    return returnValue;
  }
  /*
  For the direct debugging, we need to fetch the function information to display in the dialog so "generate_url"
  will dynamically generate the URL from the server_id, database_id, schema_id and function id.
  */
  generate_url(_url, treeInfo, node) {
    let url = '{BASEURL}{URL}/{OBJTYPE}{REF}',
      ref = '';

    _.each(
      _.sortBy(
        _.values(
          _.pickBy(treeInfo,
            function (v, k) {
              return (k != 'server_group');
            })
        ),
        function (o) {
          return o.priority;
        }
      ),
      function (o) {
        ref = sprintf('%s/%s', ref, encodeURI(o._id));
      });

    let args = {
      'URL': _url,
      'BASEURL': url_for('debugger.index'),
      'REF': ref,
      'OBJTYPE': encodeURI(node.type),
    };

    return url.replace(/{(\w+)}/g, function (match, arg) {
      return args[arg];
    });
  }

  getUrl(_d, newTreeInfo, trans_id) {
    let baseUrl;
    if (_d._type == 'function' || _d._type == 'edbfunc') {
      baseUrl = url_for(
        'debugger.initialize_target_for_function', {
          'debug_type': 'direct',
          'trans_id': trans_id,
          'sid': newTreeInfo.server._id,
          'did': newTreeInfo.database._id,
          'scid': newTreeInfo.schema._id,
          'func_id': getFunctionId(newTreeInfo),
        }
      );
    } else if (_d._type == 'procedure' || _d._type == 'edbproc') {
      baseUrl = url_for(
        'debugger.initialize_target_for_function', {
          'debug_type': 'direct',
          'trans_id': trans_id,
          'sid': newTreeInfo.server._id,
          'did': newTreeInfo.database._id,
          'scid': newTreeInfo.schema._id,
          'func_id': getProcedureId(newTreeInfo),
        }
      );
    }
    return baseUrl;
  }

  checkDbNameChange(data, dbNode, newTreeInfo, db_label) {
    if (data?.data_obj?.db_name != _.unescape(newTreeInfo.database.label)) {
      db_label = data.data_obj.db_name;
      let message = `Current database has been moved or renamed to ${db_label}. Click on the OK button to refresh the database name.`;
      refresh_db_node(message, dbNode);
    }
    return db_label;
  }

  getTreeNodeData(item) {
    let t = this.pgBrowser.tree,
      i = item || t.selected(),
      d = i ? t.itemData(i) : undefined,
      node = d && this.pgBrowser.Nodes[d._type];

    return [t,i,d,node];
  }
  /*
      Get the function information for the direct debugging to display the functions arguments and  other informations
      in the user input dialog
    */
  getFunctionInformation(args, item) {
    let [t,i,d, node] = this.getTreeNodeData(item);
    let self = this,
      tree_data = this.pgBrowser.tree.translateTreeNodeIdFromReactTree(i),
      db_data = this.pgBrowser.tree.findNode(tree_data[3]),
      dbNode = db_data.domNode;

    if (!d)
      return;

    let is_edb_proc = d._type == 'edbproc';

    let treeInfo = t.getTreeNodeHierarchy(i),
      _url = this.generate_url('init', treeInfo, node);

    this.api({
      url: _url,
      method: 'GET',
    }).then((res) => {
      let debug_info = res.data.data.debug_info,
        trans_id = res.data.data.trans_id;
      // Open dialog to take the input arguments from user if function having input arguments
      if (debug_info[0]['require_input']) {
        self.funcArgs.show(debug_info[0], 0, is_edb_proc, trans_id);
      } else {
        /* Initialize the target and create asynchronous connection and unique transaction ID
        If there is no arguments to the functions then we should not ask for for function arguments and
        Directly open the panel */
        let _t = this.pgBrowser.tree,
          _i = _t.selected(),
          _d = _i ? _t.itemData(_i) : undefined;

        let newTreeInfo = _t.getTreeNodeHierarchy(_i);

        let baseUrl = self.getUrl(_d, newTreeInfo, trans_id);

        self.api({
          url: baseUrl,
          method: 'POST',
        })
          .then(function (result) {

            let data = result.data.data;

            let url = url_for('debugger.direct', {
              'trans_id': trans_id,
            });

            let browser_preferences = usePreferences.getState().getPreferencesForModule('browser');
            let open_new_tab = browser_preferences.new_browser_tab_open;
            const db_label = self.checkDbNameChange(data, dbNode, newTreeInfo);
            let label = getAppropriateLabel(newTreeInfo);
            pgAdmin.Browser.Events.trigger(
              'pgadmin:tool:show',
              `${BROWSER_PANELS.DEBUGGER_TOOL}_${trans_id}`,
              url,
              null,
              {title: getDebuggerTitle(browser_preferences, label, newTreeInfo.schema.label, db_label, null, self.pgBrowser),
                icon: 'fa fa-bug', manualClose: false, renamable: true},
              Boolean(open_new_tab?.includes('debugger'))
            );
          })
          .catch(function (e) {
            pgAdmin.Browser.notifier.alert(
              gettext('Debugger Target Initialization Error'),
              e.responseJSON.errormsg
            );
          });
      }
    })
      .catch((err) => {
        pgAdmin.Browser.notifier.alert(gettext('Debugger Error'), err.response.data.errormsg);
      });
  }

  checkFuncDebuggable(args, item) {
    let [t,i,d, node] = this.getTreeNodeData(item);
    let self = this;

    if (!d)
      return;

    let treeInfo = t.getTreeNodeHierarchy(i),
      _url = this.generate_url('init', treeInfo, node);

    self.api({
      url: _url,
      cache: false,
    })
      .then(function (res) {
        self.startGlobalDebugger(args, item, res.data.data.trans_id);
      })
      .catch(function (xhr) {
        self.onFail(xhr);
      });
  }

  getGlobalUrl(d, treeInfo, trans_id) {
    let baseUrl = null;
    if (d._type == 'function' || d._type == 'edbfunc') {
      baseUrl = url_for(
        'debugger.initialize_target_for_function', {
          'debug_type': 'indirect',
          'trans_id': trans_id,
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': getFunctionId(treeInfo),
        }
      );
    } else if (d._type == 'procedure' || d._type == 'edbproc') {
      baseUrl = url_for(
        'debugger.initialize_target_for_function', {
          'debug_type': 'indirect',
          'trans_id': trans_id,
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': getProcedureId(treeInfo),
        }
      );
    } else if (d._type == 'trigger_function') {
      baseUrl = url_for(
        'debugger.initialize_target_for_function', {
          'debug_type': 'indirect',
          'trans_id': trans_id,
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.trigger_function._id,
        }
      );
    } else if (d._type == 'trigger' && 'table' in treeInfo) {
      baseUrl = url_for(
        'debugger.initialize_target_for_trigger', {
          'debug_type': 'indirect',
          'trans_id': trans_id,
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.table._id,
          'tri_id': treeInfo.trigger._id,
        }
      );
    } else if (d._type == 'trigger' && 'view' in treeInfo) {
      baseUrl = url_for(
        'debugger.initialize_target_for_trigger', {
          'debug_type': 'indirect',
          'trans_id': trans_id,
          'sid': treeInfo.server._id,
          'did': treeInfo.database._id,
          'scid': treeInfo.schema._id,
          'func_id': treeInfo.view._id,
          'tri_id': treeInfo.trigger._id,
        }
      );
    }

    return baseUrl;
  }

  updatedDbLabel(res, db_label, treeInfo, dbNode) {
    if (res.data.data.data_obj.db_name != treeInfo.database.label) {
      db_label = res.data.data.data_obj.db_name;
      let message = gettext(`Current database has been moved or renamed to ${db_label}. Click on the OK button to refresh the database name.`);
      refresh_db_node(message, dbNode);
    }
  }

  //Callback function when user start the indirect debugging ( Listen to another session to invoke the target )
  startGlobalDebugger(args, item, trans_id) {
    // Initialize the target and create asynchronous connection and unique transaction ID
    let self = this;
    let t = this.pgBrowser.tree,
      i = item || t.selected(),
      d = i ? t.itemData(i) : undefined,
      tree_data = this.pgBrowser.tree.translateTreeNodeIdFromReactTree(i),
      db_data = this.pgBrowser.tree.findNode(tree_data[3]),
      dbNode = db_data.domNode;

    if (!d)
      return;

    let treeInfo = t.getTreeNodeHierarchy(i);
    let baseUrl = self.getGlobalUrl(d, treeInfo, trans_id);

    self.api({
      url: baseUrl,
      method: 'POST',
    })
      .then(function (res) {
        let url = url_for('debugger.direct', {
          'trans_id': res.data.data.debuggerTransId,
        });
        let browser_preferences = usePreferences.getState().getPreferencesForModule('browser');
        let open_new_tab = browser_preferences.new_browser_tab_open;
        const db_label = treeInfo.database.label;
        self.updatedDbLabel(res, db_label, treeInfo, dbNode);

        let label = getAppropriateLabel(treeInfo);

        pgAdmin.Browser.Events.trigger(
          'pgadmin:tool:show',
          `${BROWSER_PANELS.DEBUGGER_TOOL}_${res.data.data.debuggerTransId}`,
          url,
          null,
          {title: getDebuggerTitle(browser_preferences, label, db_label, db_label, null, self.pgBrowser),
            icon: 'fa fa-bug', manualClose: false, renamable: true},
          Boolean(open_new_tab?.includes('debugger'))
        );
      })
      .catch(self.raiseError);
  }

  raiseError(xhr) {
    try {
      let err = xhr.response.data;
      if (err.errormsg.search('Ticket expired') !== -1) {
        let fetchTicket = Kerberos.fetch_ticket();
        fetchTicket.then(
          function () {
            self.startGlobalDebugger();
          },
          function (error) {
            pgAdmin.Browser.notifier.alert(gettext('Debugger Error'), error);
          }
        );
      } else if (err.success == 0) {
        pgAdmin.Browser.notifier.alert(gettext('Debugger Error'), err.errormsg);
      }
    } catch (e) {
      console.warn(e.stack || e);
    }
  }

  /* We should get the transaction id from the server during initialization here */
  async load(container, trans_id, debug_type, function_name_with_arguments, layout) {
    this.trans_id = trans_id;
    this.debug_type = debug_type;
    this.first_time_indirect_debug = false;
    this.direct_execution_completed = false;
    this.polling_timeout_idle = false;
    this.debug_restarted = false;
    this.is_user_aborted_debugging = false;
    this.is_polling_required = true; // Flag to stop unwanted ajax calls
    this.function_name_with_arguments = function_name_with_arguments;
    this.layout = layout;

    let selectedNodeInfo = pgWindow.pgAdmin.Browser.tree.getTreeNodeHierarchy(
      pgWindow.pgAdmin.Browser.tree.selected()
    );
    await listenPreferenceBroadcast();

    const root = ReactDOM.createRoot(container);
    root.render(
      <Theme>
        <PgAdminProvider value={pgAdmin}>
          <ModalProvider>
            <NotifierProvider pgAdmin={pgAdmin} pgWindow={pgWindow} />
            <DebuggerComponent pgAdmin={pgWindow.pgAdmin} selectedNodeInfo={selectedNodeInfo}
              panelId={`${BROWSER_PANELS.DEBUGGER_TOOL}_${this.trans_id}`}
              panelDocker={pgWindow.pgAdmin.Browser.docker.default_workspace}
              layout={layout} params={{
                transId: trans_id,
                directDebugger: this,
                funcArgsInstance: this.funcArgs
              }}
            />
          </ModalProvider>
        </PgAdminProvider>
      </Theme>
    );
  }

  onFail(xhr) {
    try {
      let err = xhr.response.data;
      if (err.success == 0) {
        pgAdmin.Browser.notifier.alert(gettext('Debugger Error'), err.errormsg);
      }
    } catch (e) {
      console.warn(e.stack || e);
    }
  }
}
