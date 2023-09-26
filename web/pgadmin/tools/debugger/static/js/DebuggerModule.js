/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';

import gettext from 'sources/gettext';
import { sprintf, registerDetachEvent } from 'sources/utils';
import url_for from 'sources/url_for';
import pgWindow from 'sources/window';
import Kerberos from 'pgadmin.authenticate.kerberos';

import { refresh_db_node } from 'tools/sqleditor/static/js/sqleditor_title';
import { _set_dynamic_tab } from '../../../sqleditor/static/js/show_query_tool';
import getApiInstance from '../../../../static/js/api_instance';
import Notify from '../../../../static/js/helpers/Notifier';
import { getFunctionId, getProcedureId, getAppropriateLabel, setDebuggerTitle } from './debugger_utils';
import FunctionArguments from './debugger_ui';
import ModalProvider from '../../../../static/js/helpers/ModalProvider';
import DebuggerComponent from './components/DebuggerComponent';
import Theme from '../../../../static/js/Theme';
import { showRenamePanel } from '../../../../static/js/Dialogs';

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
    this.wcDocker = window.wcDocker;
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
        enable: 'can_debug',
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
        enable: 'can_debug',
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
        enable: 'can_debug',
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
        enable: 'can_debug',
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
        enable: 'can_debug',
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
        enable: 'can_debug',
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
        enable: 'can_debug',
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
        enable: 'can_debug',
      }
    ]);

    /* Create and load the new frame required for debugger panel */
    this.frame = new this.pgBrowser.Frame({
      name: 'frm_debugger',
      title: gettext('Debugger'),
      showTitle: true,
      isCloseable: true,
      isRenamable: true,
      isPrivate: true,
      icon: 'fa fa-bug',
      url: 'about:blank',
    });

    this.frame.load(this.pgBrowser.docker);
  }

  // It will check weather the function is actually debuggable or not with pre-required condition.
  canDebug(itemData, item, data) {
    let t = this.pgBrowser.tree,
      i = item,
      d = itemData;
    // To iterate over tree to check parent node
    while (i) {
      if ('catalog' == d._type) {
        //Check if we are not child of catalog
        return false;
      }
      i = t.hasParent(i) ? t.parent(i) : null;
      d = i ? t.itemData(i) : null;
    }

    // Find the function is really available in database
    let tree = this.pgBrowser.tree,
      info = tree.selected(),
      d_ = info ? tree.itemData(info) : undefined;

    if (!d_)
      return false;

    let treeInfo = tree.getTreeNodeHierarchy(info);

    // For indirect debugging user must be super user
    if (data && data.debug_type && data.debug_type == 'indirect' &&
      !treeInfo.server.user.is_superuser)
      return false;

    // Fetch object owner
    let obj_owner = treeInfo.function && treeInfo.function.funcowner ||
      treeInfo.procedure && treeInfo.procedure.funcowner ||
      treeInfo.edbfunc && treeInfo.edbfunc.funcowner ||
      treeInfo.edbproc && treeInfo.edbproc.funcowner;

    // Must be a super user or object owner to create breakpoints of any kind
    if (!(treeInfo.server.user.is_superuser || obj_owner == treeInfo.server.user.name))
      return false;

    // For trigger node, language will be undefined - we should allow indirect debugging for trigger node
    if ((d_.language == undefined && d_._type == 'trigger') ||
      (d_.language == undefined && d_._type == 'edbfunc') ||
      (d_.language == undefined && d_._type == 'edbproc')) {
      return true;
    }

    let returnValue = true;
    if (d_.language != 'plpgsql' && d_.language != 'edbspl') {
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
    let baseUrl = undefined;
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
    if (data && data.data_obj && data.data_obj.db_name != _.unescape(newTreeInfo.database.label)) {
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

            let browser_preferences = self.pgBrowser.get_preferences_for_module('browser');
            let open_new_tab = browser_preferences.new_browser_tab_open;
            if (open_new_tab && open_new_tab.includes('debugger')) {
              window.open(url, '_blank');
              // Send the signal to runtime, so that proper zoom level will be set.
              setTimeout(function () {
                self.pgBrowser.Events.trigger('pgadmin:nw-set-new-window-open-size');
              }, 500);
            } else {
              self.pgBrowser.Events.once(
                'pgadmin-browser:frame:urlloaded:frm_debugger',
                function (frame) {
                  frame.openURL(url);
                });

              // Create the debugger panel as per the data received from user input dialog.
              let dashboardPanel = self.pgBrowser.docker.findPanels(
                  'properties'
                ),
                panel = self.pgBrowser.docker.addPanel(
                  'frm_debugger', self.wcDocker.DOCK.STACKED, dashboardPanel[0]
                ),
                db_label = newTreeInfo.database.label;
              panel.trans_id = trans_id;

              _set_dynamic_tab(self.pgBrowser, browser_preferences['dynamic_tabs']);
              registerDetachEvent(panel);

              db_label = self.checkDbNameChange(data, dbNode, newTreeInfo, db_label);

              let label = getAppropriateLabel(newTreeInfo);
              setDebuggerTitle(panel, browser_preferences, label, newTreeInfo.schema.label, db_label, null, self.pgBrowser);

              panel.focus();
              panel.on(self.wcDocker.EVENT.RENAME, function (panel_data) {
                self.panel_rename_event(panel_data, panel, treeInfo);
              });
            }
          })
          .catch(function (e) {
            Notify.alert(
              gettext('Debugger Target Initialization Error'),
              e.responseJSON.errormsg
            );
          });
      }
    })
      .catch((err) => {
        Notify.alert(gettext('Debugger Error'), err.response.data.errormsg);
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
        let browser_preferences = self.pgBrowser.get_preferences_for_module('browser');
        let open_new_tab = browser_preferences.new_browser_tab_open;
        if (open_new_tab && open_new_tab.includes('debugger')) {
          window.open(url, '_blank');
          // Send the signal to runtime, so that proper zoom level will be set.
          setTimeout(function () {
            self.pgBrowser.Browser.Events.trigger('pgadmin:nw-set-new-window-open-size');
          }, 500);
        } else {
          self.pgBrowser.Events.once(
            'pgadmin-browser:frame:urlloaded:frm_debugger',
            function (frame) {
              frame.openURL(url);
            });

          // Create the debugger panel as per the data received from user input dialog.
          let dashboardPanel = self.pgBrowser.docker.findPanels(
              'properties'
            ),
            panel = self.pgBrowser.docker.addPanel(
              'frm_debugger', self.wcDocker.DOCK.STACKED, dashboardPanel[0]
            ),
            db_label = treeInfo.database.label;
          panel.trans_id = trans_id;

          self.updatedDbLabel(res, db_label, treeInfo, dbNode);

          let label = getAppropriateLabel(treeInfo);
          setDebuggerTitle(panel, browser_preferences, label, db_label, db_label, null, self.pgBrowser);

          panel.focus();

          // Panel Rename event
          panel.on(self.wcDocker.EVENT.RENAME, function (panel_data) {
            self.panel_rename_event(panel_data, panel, treeInfo);
          });
        }
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
            Notify.alert(gettext('Debugger Error'), error);
          }
        );
      } else {
        if (err.success == 0) {
          Notify.alert(gettext('Debugger Error'), err.errormsg);
        }
      }
    } catch (e) {
      console.warn(e.stack || e);
    }
  }

  /* We should get the transaction id from the server during initialization here */
  load(container, trans_id, debug_type, function_name_with_arguments, layout) {
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
    this.preferences = this.pgBrowser.get_preferences_for_module('debugger');

    let panel = null;
    let selectedNodeInfo = pgWindow.pgAdmin.Browser.tree.getTreeNodeHierarchy(
      pgWindow.pgAdmin.Browser.tree.selected()
    );

    // Find debugger panel.
    pgWindow.pgAdmin.Browser.docker.findPanels('frm_debugger').forEach(p => {
      if (parseInt(p.trans_id) == trans_id) {
        panel = p;
      }
    });

    ReactDOM.render(
      <Theme>
        <ModalProvider>
          <DebuggerComponent pgAdmin={pgWindow.pgAdmin} selectedNodeInfo={selectedNodeInfo} panel={panel}  layout={layout} params={{
            transId: trans_id,
            directDebugger: this,
            funcArgsInstance: this.funcArgs
          }} />
        </ModalProvider>
      </Theme>,
      container
    );
  }

  onFail(xhr) {
    try {
      let err = xhr.response.data;
      if (err.success == 0) {
        Notify.alert(gettext('Debugger Error'), err.errormsg);
      }
    } catch (e) {
      console.warn(e.stack || e);
    }
  }

  panel_rename_event(panel_data, panel, treeInfo) {
    let name = getAppropriateLabel(treeInfo);
    let preferences = this.pgBrowser.get_preferences_for_module('browser');
    let data = {
      function_name: name,
      schema_name: treeInfo.schema.label,
      database_name: treeInfo.database.label
    };
    showRenamePanel(panel_data.$titleText[0].textContent, preferences, panel, 'debugger', data);
  }
}
