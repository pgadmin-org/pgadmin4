/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import AIReport from './AIReport';
import { AllPermissionTypes, BROWSER_PANELS } from '../../../browser/static/js/constants';
import getApiInstance from '../../../static/js/api_instance';
import url_for from 'sources/url_for';

// AI Reports Module
define([
  'sources/gettext', 'pgadmin.browser',
], function(
  gettext, pgBrowser
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.AITools) {
    return pgBrowser.AITools;
  }

  // Create an Object AITools of pgBrowser class
  pgBrowser.AITools = {
    llmEnabled: false,
    llmSystemEnabled: false,
    llmStatusChecked: false,

    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Check LLM status
      this.checkLLMStatus();

      // Register AI Reports menu category
      pgBrowser.add_menu_category({
        name: 'ai_tools',
        label: gettext('AI Reports'),
        priority: 100,
      });

      // Define the menus
      let menus = [];

      // =====================================================================
      // Security Reports - Server, Database, Schema
      // =====================================================================
      menus.push({
        name: 'ai_security_report',
        module: this,
        applies: ['tools'],
        callback: 'show_security_report',
        category: 'ai_tools',
        priority: 1,
        label: gettext('Security'),
        icon: 'fa fa-shield-alt',
        enable: this.security_report_enabled.bind(this),
        data: {
          data_disabled: gettext('Please select a server, database, or schema.'),
        },
        permission: AllPermissionTypes.TOOLS_AI,
      });

      // Context menus for security reports
      for (let node_val of ['server', 'database', 'schema']) {
        menus.push({
          name: 'ai_security_report_context_' + node_val,
          node: node_val,
          module: this,
          applies: ['context'],
          callback: 'show_security_report',
          category: 'ai_tools',
          priority: 100,
          label: gettext('Security'),
          icon: 'fa fa-shield-alt',
          enable: this.security_report_enabled.bind(this),
          permission: AllPermissionTypes.TOOLS_AI,
        });
      }

      // =====================================================================
      // Performance Reports - Server, Database
      // =====================================================================
      menus.push({
        name: 'ai_performance_report',
        module: this,
        applies: ['tools'],
        callback: 'show_performance_report',
        category: 'ai_tools',
        priority: 2,
        label: gettext('Performance'),
        icon: 'fa fa-tachometer-alt',
        enable: this.performance_report_enabled.bind(this),
        data: {
          data_disabled: gettext('Please select a server or database.'),
        },
        permission: AllPermissionTypes.TOOLS_AI,
      });

      // Context menus for performance reports (server and database only)
      for (let node_val of ['server', 'database']) {
        menus.push({
          name: 'ai_performance_report_context_' + node_val,
          node: node_val,
          module: this,
          applies: ['context'],
          callback: 'show_performance_report',
          category: 'ai_tools',
          priority: 101,
          label: gettext('Performance'),
          icon: 'fa fa-tachometer-alt',
          enable: this.performance_report_enabled.bind(this),
          permission: AllPermissionTypes.TOOLS_AI,
        });
      }

      // =====================================================================
      // Design Review Reports - Database, Schema
      // =====================================================================
      menus.push({
        name: 'ai_design_report',
        module: this,
        applies: ['tools'],
        callback: 'show_design_report',
        category: 'ai_tools',
        priority: 3,
        label: gettext('Design'),
        icon: 'fa fa-drafting-compass',
        enable: this.design_report_enabled.bind(this),
        data: {
          data_disabled: gettext('Please select a database or schema.'),
        },
        permission: AllPermissionTypes.TOOLS_AI,
      });

      // Context menus for design review (database and schema only)
      for (let node_val of ['database', 'schema']) {
        menus.push({
          name: 'ai_design_report_context_' + node_val,
          node: node_val,
          module: this,
          applies: ['context'],
          callback: 'show_design_report',
          category: 'ai_tools',
          priority: 102,
          label: gettext('Design'),
          icon: 'fa fa-drafting-compass',
          enable: this.design_report_enabled.bind(this),
          permission: AllPermissionTypes.TOOLS_AI,
        });
      }

      pgBrowser.add_menus(menus);

      return this;
    },

    // Check if LLM is configured
    checkLLMStatus: function() {
      const api = getApiInstance();
      api.get(url_for('llm.status'))
        .then((res) => {
          if (res.data && res.data.success) {
            this.llmEnabled = res.data.data?.enabled || false;
            this.llmSystemEnabled = res.data.data?.system_enabled || false;
          }
          this.llmStatusChecked = true;
        })
        .catch(() => {
          this.llmEnabled = false;
          this.llmSystemEnabled = false;
          this.llmStatusChecked = true;
        });
    },

    // Get the node type from tree item
    getNodeType: function(item) {
      let tree = pgBrowser.tree;
      let nodeData = tree.itemData(item);

      if (!nodeData) return null;
      return nodeData._type;
    },

    // Common LLM enablement check
    checkLLMEnabled: function(data) {
      if (!this.llmSystemEnabled) {
        if (data) {
          data.data_disabled = gettext('AI features are disabled in the server configuration.');
        }
        return false;
      }

      if (!this.llmEnabled) {
        if (data) {
          data.data_disabled = gettext('Please configure an LLM provider in Preferences > AI to enable this feature.');
        }
        return false;
      }

      return true;
    },

    // =====================================================================
    // Security Report Functions
    // =====================================================================

    security_report_enabled: function(node, item, data) {
      if (!this.checkLLMEnabled(data)) return false;

      if (!node || !item) return false;

      let tree = pgBrowser.tree;
      let info = tree.getTreeNodeHierarchy(item);

      if (!info || !info.server) {
        if (data) {
          data.data_disabled = gettext('Please select a server, database, or schema.');
        }
        return false;
      }

      if (!info.server.connected) {
        if (data) {
          data.data_disabled = gettext('Please connect to the server first.');
        }
        return false;
      }

      let nodeType = this.getNodeType(item);
      if (!['server', 'database', 'schema'].includes(nodeType)) {
        if (data) {
          data.data_disabled = gettext('Please select a server, database, or schema.');
        }
        return false;
      }

      if (nodeType === 'database' || nodeType === 'schema') {
        if (!info.database || !info.database.connected) {
          if (data) {
            data.data_disabled = gettext('Please connect to the database first.');
          }
          return false;
        }
      }

      return true;
    },

    show_security_report: function() {
      this._showReport('security', ['server', 'database', 'schema']);
    },

    // =====================================================================
    // Performance Report Functions
    // =====================================================================

    performance_report_enabled: function(node, item, data) {
      if (!this.checkLLMEnabled(data)) return false;

      if (!node || !item) return false;

      let tree = pgBrowser.tree;
      let info = tree.getTreeNodeHierarchy(item);

      if (!info || !info.server) {
        if (data) {
          data.data_disabled = gettext('Please select a server or database.');
        }
        return false;
      }

      if (!info.server.connected) {
        if (data) {
          data.data_disabled = gettext('Please connect to the server first.');
        }
        return false;
      }

      let nodeType = this.getNodeType(item);
      if (!['server', 'database'].includes(nodeType)) {
        if (data) {
          data.data_disabled = gettext('Please select a server or database.');
        }
        return false;
      }

      if (nodeType === 'database') {
        if (!info.database || !info.database.connected) {
          if (data) {
            data.data_disabled = gettext('Please connect to the database first.');
          }
          return false;
        }
      }

      return true;
    },

    show_performance_report: function() {
      this._showReport('performance', ['server', 'database']);
    },

    // =====================================================================
    // Design Review Functions
    // =====================================================================

    design_report_enabled: function(node, item, data) {
      if (!this.checkLLMEnabled(data)) return false;

      if (!node || !item) return false;

      let tree = pgBrowser.tree;
      let info = tree.getTreeNodeHierarchy(item);

      if (!info || !info.server) {
        if (data) {
          data.data_disabled = gettext('Please select a database or schema.');
        }
        return false;
      }

      if (!info.server.connected) {
        if (data) {
          data.data_disabled = gettext('Please connect to the server first.');
        }
        return false;
      }

      let nodeType = this.getNodeType(item);
      if (!['database', 'schema'].includes(nodeType)) {
        if (data) {
          data.data_disabled = gettext('Please select a database or schema.');
        }
        return false;
      }

      if (!info.database || !info.database.connected) {
        if (data) {
          data.data_disabled = gettext('Please connect to the database first.');
        }
        return false;
      }

      return true;
    },

    show_design_report: function() {
      this._showReport('design', ['database', 'schema']);
    },

    // =====================================================================
    // Common Report Display Function
    // =====================================================================

    _showReport: function(reportCategory, validNodeTypes) {
      let t = pgBrowser.tree,
        i = t.selected(),
        info = pgBrowser.tree.getTreeNodeHierarchy(i);

      if (!info || !info.server) {
        pgBrowser.report_error(
          gettext('Report'),
          gettext('Please select a valid node.')
        );
        return;
      }

      let nodeType = this.getNodeType(i);
      if (!validNodeTypes.includes(nodeType)) {
        pgBrowser.report_error(
          gettext('Report'),
          gettext('Please select a valid node for this report type.')
        );
        return;
      }

      let sid = info.server._id;
      let did = info.database ? info.database._id : null;
      let scid = info.schema ? info.schema._id : null;

      // Determine report type based on node
      let reportType = nodeType;

      // Build panel title and ID with timestamp for uniqueness
      let panelTitle = this._buildPanelTitle(reportCategory, reportType, info);
      let panelIdSuffix = this._buildPanelIdSuffix(reportCategory, reportType, sid, did, scid);
      const timestamp = Date.now();
      const panelId = `${BROWSER_PANELS.AI_REPORT_PREFIX}-${panelIdSuffix}-${timestamp}`;

      // Get docker handler and open as tab in main panel area
      let handler = pgBrowser.getDockerHandler?.(
        BROWSER_PANELS.AI_REPORT_PREFIX,
        pgBrowser.docker.default_workspace
      );
      handler.focus();
      handler.docker.openTab({
        id: panelId,
        title: panelTitle,
        content: (
          <AIReport
            sid={sid}
            did={did}
            scid={scid}
            reportCategory={reportCategory}
            reportType={reportType}
            serverName={info.server.label}
            databaseName={info.database?.label}
            schemaName={info.schema?.label}
            onClose={() => { handler.docker.close(panelId); }}
          />
        ),
        closable: true,
        cache: false,
        group: 'playground'
      }, BROWSER_PANELS.MAIN, 'middle', true);
    },

    _buildPanelTitle: function(reportCategory, reportType, info) {
      let categoryLabel;
      switch (reportCategory) {
      case 'security':
        categoryLabel = gettext('Security Report');
        break;
      case 'performance':
        categoryLabel = gettext('Performance Report');
        break;
      case 'design':
        categoryLabel = gettext('Design Review');
        break;
      default:
        categoryLabel = gettext('Report');
      }

      if (reportType === 'server') {
        return info.server.label + ' ' + categoryLabel;
      } else if (reportType === 'database') {
        return info.database.label + ' ' + gettext('on') + ' ' +
          info.server.label + ' ' + categoryLabel;
      } else if (reportType === 'schema') {
        return info.schema.label + ' ' + gettext('in') + ' ' +
          info.database.label + ' ' + gettext('on') + ' ' +
          info.server.label + ' ' + categoryLabel;
      }
      return categoryLabel;
    },

    _buildPanelIdSuffix: function(reportCategory, reportType, sid, did, scid) {
      let base = `${reportCategory}_${reportType}`;
      if (reportType === 'server') {
        return `${base}_${sid}`;
      } else if (reportType === 'database') {
        return `${base}_${sid}_${did}`;
      } else if (reportType === 'schema') {
        return `${base}_${sid}_${did}_${scid}`;
      }
      return base;
    },
  };

  return pgBrowser.AITools;
});
