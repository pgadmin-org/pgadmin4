/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {getTreeNodeHierarchyFromElement} from '../../../../static/js/tree/pgadmin_tree_node';
import axios from 'axios/index';
import _ from 'underscore';
import gettext from '../../../../static/js/gettext';
import url_for from '../../../../static/js/url_for';
import {DialogWrapper} from '../../../../static/js/alertify/dialog_wrapper';

export class RestoreDialogWrapper extends DialogWrapper {
  constructor(dialogContainerSelector, dialogTitle, typeOfDialog,
    jquery, pgBrowser, alertify, dialogModel, backform) {
    super(dialogContainerSelector, dialogTitle, jquery,
      pgBrowser, alertify, dialogModel, backform);
  }

  main(title, item, data, node) {
    this.set('title', title);
    this.setting('pg_node', node);
    this.setting('pg_item', item);
    this.setting('pg_item_data', data);
  }

  setup() {
    return {
      buttons: [{
        text: '',
        className: 'btn btn-primary-icon pull-left fa fa-info pg-alertify-icon-button',
        attrs: {
          name: 'object_help',
          type: 'button',
          url: 'backup.html',
          label: gettext('Restore'),
          'aria-label': gettext('Object Help'),
        },
      }, {
        text: '',
        key: 112,
        className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
        attrs: {
          name: 'dialog_help',
          type: 'button',
          label: gettext('Restore'),
          'aria-label': gettext('Help'),
          url: url_for('help.static', {
            'filename': 'restore_dialog.html',
          }),
        },
      }, {
        text: gettext('Cancel'),
        key: 27,
        className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
        restore: false,
        'data-btn-name': 'cancel',
      }, {
        text: gettext('Restore'),
        key: 13,
        className: 'btn btn-primary fa fa-upload pg-alertify-button',
        restore: true,
        'data-btn-name': 'restore',
      }],
      // Set options for dialog
      options: {
        title: this.dialogTitle,
        //disable both padding and overflow control.
        padding: !1,
        overflow: !1,
        model: 0,
        resizable: true,
        maximizable: true,
        pinnable: false,
        closableByDimmer: false,
        modal: false,
      },
    };
  }

  prepare() {
    this.disableRestoreButton();

    const $container = this.jquery(this.dialogContainerSelector);
    const selectedTreeNode = this.getSelectedNode();
    const selectedTreeNodeData = this.getSelectedNodeData(selectedTreeNode);
    if (!selectedTreeNodeData) {
      return;
    }

    const node = this.pgBrowser.Nodes[selectedTreeNodeData._type];

    const treeInfo = getTreeNodeHierarchyFromElement(this.pgBrowser, selectedTreeNode);
    const dialog = this.createDialog(node, treeInfo, $container);
    this.addAlertifyClassToRestoreNodeChildNodes();
    dialog.render();
    const statusBar = this.jquery(
      '<div class=\'pg-prop-status-bar pg-prop-status-bar-absolute pg-el-xs-12 d-none\'>' +
      '  <div class="error-in-footer"> ' +
      '    <div class="d-flex px-2 py-1"> ' +
      '      <div class="pr-2"> ' +
      '        <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true"></i> ' +
      '      </div> ' +
      '      <div class="alert-text" role="alert"></div> ' +
      '    </div> ' +
      '  </div> ' +
      '</div>').appendTo($container);

    this.elements.content.appendChild($container.get(0));

    this.focusOnDialog(this);
    this.setListenersForFilenameChanges(statusBar);
  }

  callback(event) {
    const selectedTreeNode = this.getSelectedNode();
    const selectedTreeNodeData = this.getSelectedNodeData(selectedTreeNode);
    const node = selectedTreeNodeData && this.pgBrowser.Nodes[selectedTreeNodeData._type];

    if (this.wasHelpButtonPressed(event)) {
      event.cancel = true;
      this.pgBrowser.showHelp(
        event.button.element.name,
        event.button.element.getAttribute('url'),
        node,
        selectedTreeNode.getHtmlIdentifier()
      );
      return;
    }

    if (this.wasRestoreButtonPressed(event)) {

      if (!selectedTreeNodeData)
        return;

      const serverIdentifier = this.retrieveServerIdentifier(node, selectedTreeNode);

      const dialogWrapper = this;
      let urlShortcut = 'restore.create_job';

      const baseUrl = url_for(urlShortcut, {
        'sid': serverIdentifier,
      });

      const treeInfo = getTreeNodeHierarchyFromElement(
        this.pgBrowser,
        selectedTreeNode
      );

      this.setExtraParameters(selectedTreeNode, treeInfo);

      axios.post(
        baseUrl,
        this.view.model.toJSON()
      ).then(function (res) {
        if (res.data.success) {
          dialogWrapper.alertify.success(gettext('Restore job created.'), 5);
          dialogWrapper.pgBrowser.Events.trigger('pgadmin-bgprocess:created', dialogWrapper);
        } else {
          dialogWrapper.alertify.alert(
            gettext('Restore job creation failed.'),
            res.data.errormsg
          );
        }
      }).catch(function (error) {
        try {
          const err = error.response.data;
          dialogWrapper.alertify.alert(
            gettext('Restore job failed.'),
            err.errormsg
          );
        } catch (e) {
          console.warn(e.stack || e);
        }
      });
    }
  }

  addAlertifyClassToRestoreNodeChildNodes() {
    this.jquery(this.elements.body.childNodes[0]).addClass(
      'alertify_tools_dialog_properties obj_properties'
    );
  }

  getSelectedNode() {
    const tree = this.pgBrowser.treeMenu;
    const selectedNode = tree.selected();
    if (selectedNode) {
      return tree.findNodeByDomElement(selectedNode);
    } else {
      return undefined;
    }
  }

  disableRestoreButton() {
    this.__internal.buttons[3].element.disabled = true;
  }

  enableRestoreButton() {
    this.__internal.buttons[3].element.disabled = false;
  }

  createDialog(node, treeInfo, $container) {
    const newModel = new this.dialogModel({
      node_data: node,
    }, {
      node_info: treeInfo,
    });
    const fields = this.backform.generateViewSchema(
      treeInfo, newModel, 'create', node, treeInfo.server, true
    );

    return this.view = new this.backform.Dialog({
      el: $container,
      model: newModel,
      schema: fields,
    });
  }

  retrieveServerIdentifier(node, selectedTreeNode) {
    const treeInfo = getTreeNodeHierarchyFromElement(
      this.pgBrowser,
      selectedTreeNode
    );
    return treeInfo.server._id;
  }

  setListenersForFilenameChanges(statusBar) {
    const self = this;

    this.view.model.on('change', function () {
      const ctx = this;
      var errmsg;

      const showError = function(errorField, errormsg) {
        ctx.errorModel.set(errorField, errormsg);
        statusBar.removeClass('d-none');
        statusBar.find('.alert-text').html(errormsg);
      };

      if (!_.isUndefined(this.get('file')) && this.get('file') !== '') {
        this.errorModel.clear();
        statusBar.addClass('d-none');
        self.enableRestoreButton();
      } else {
        self.disableRestoreButton();
        errmsg = gettext('Please provide a filename');
        showError('file', errmsg);
      }
    });
  }

  setExtraParameters(selectedTreeNode, treeInfo) {
    this.view.model.set('database', treeInfo.database._label);
    if (!this.view.model.get('custom')) {
      const nodeData = selectedTreeNode.getData();

      switch (nodeData._type) {
      case 'schema':
        this.view.model.set('schemas', [nodeData._label]);
        break;
      case 'table':
        this.view.model.set('schemas', [treeInfo.schema._label]);
        this.view.model.set('tables', [nodeData._label]);
        break;
      case 'function':
        this.view.model.set('schemas', [treeInfo.schema._label]);
        this.view.model.set('functions', [nodeData._label]);
        break;
      case 'index':
        this.view.model.set('schemas', [treeInfo.schema._label]);
        this.view.model.set('indexes', [nodeData._label]);
        break;
      case 'trigger':
        this.view.model.set('schemas', [treeInfo.schema._label]);
        this.view.model.set('triggers', [nodeData._label]);
        break;
      case 'trigger_func':
        this.view.model.set('schemas', [treeInfo.schema._label]);
        this.view.model.set('trigger_funcs', [nodeData._label]);
        break;
      }
    }
  }

  wasRestoreButtonPressed(event) {
    return event.button['data-btn-name'] === 'restore';
  }
}
