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
import gettext from '../../../../static/js/gettext';
import url_for from '../../../../static/js/url_for';
import _ from 'underscore';
import {DialogWrapper} from '../../../../static/js/alertify/dialog_wrapper';

export class BackupDialogWrapper extends DialogWrapper {
  constructor(dialogContainerSelector, dialogTitle, typeOfDialog,
    jquery, pgBrowser, alertify, dialogModel, backform) {
    super(dialogContainerSelector, dialogTitle, jquery,
      pgBrowser, alertify, dialogModel, backform);
    this.typeOfDialog = typeOfDialog;
  }

  main(title) {
    this.set('title', title);
  }

  setup() {
    let get_help_file = function (dialog_type) {
      if (dialog_type == 'globals') {
        return 'backup_globals_dialog.html';
      } else if (dialog_type == 'server') {
        return 'backup_server_dialog.html';
      }
      return 'backup_dialog.html';
    };
    return {
      buttons: [{
        text: '',
        className: 'btn btn-primary-icon pull-left fa fa-info pg-alertify-icon-button',
        attrs: {
          name: 'object_help',
          type: 'button',
          url: 'backup.html',
          label: gettext('Backup'),
          'aria-label': gettext('Backup'),
        },
      }, {
        text: '',
        key: 112,
        className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
        attrs: {
          name: 'dialog_help',
          type: 'button',
          label: gettext('Help'),
          'aria-label': gettext('Help'),
          url: url_for('help.static', {
            'filename': get_help_file(this.typeOfDialog),
          }),
        },
      }, {
        text: gettext('Cancel'),
        key: 27,
        className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
        'data-btn-name': 'cancel',
      }, {
        text: gettext('Backup'),
        key: 13,
        className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button',
        'data-btn-name': 'backup',
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
    this.disableBackupButton();

    const $container = this.jquery(this.dialogContainerSelector);
    const selectedTreeNode = this.getSelectedNode();
    const selectedTreeNodeData = this.getSelectedNodeData(selectedTreeNode);
    if (!selectedTreeNodeData) {
      return;
    }

    const node = this.pgBrowser.Nodes[selectedTreeNodeData._type];
    if (this.dialogTitle === null) {
      let title = gettext('Backup (%s: %s)', node.label, selectedTreeNodeData.label);
      this.main(title);
    }

    const treeInfo = getTreeNodeHierarchyFromElement(this.pgBrowser, selectedTreeNode);
    const dialog = this.createDialog(node, treeInfo, this.typeOfDialog, $container);
    this.addAlertifyClassToBackupNodeChildNodes();
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

    if (this.wasBackupButtonPressed(event)) {

      if (!selectedTreeNodeData)
        return;

      const serverIdentifier = this.retrieveServerIdentifier(node, selectedTreeNode);

      const dialog = this;
      let urlShortcut = 'backup.create_server_job';
      if (this.typeOfDialog === 'backup_objects') {
        urlShortcut = 'backup.create_object_job';
      }
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
          dialog.alertify.success(gettext('Backup job created.'), 5);
          dialog.pgBrowser.Events.trigger('pgadmin-bgprocess:created', dialog);
        } else {
          dialog.alertify.alert(
            gettext('Backup job creation failed.'),
            res.data.errormsg
          );
        }
      }).catch(function (error) {
        try {
          const err = error.response.data;
          dialog.alertify.alert(
            gettext('Backup job failed.'),
            err.errormsg
          );
        } catch (e) {
          console.warn(e.stack || e);
        }
      });
    }
  }

  addAlertifyClassToBackupNodeChildNodes() {
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

  disableBackupButton() {
    this.__internal.buttons[3].element.disabled = true;
  }

  enableBackupButton() {
    this.__internal.buttons[3].element.disabled = false;
  }

  createDialog(node, treeInfo, typeOfDialog, $container) {
    let attributes = {};
    if (typeOfDialog !== 'backup_objects') {
      attributes['type'] = typeOfDialog;
    }
    // Instance of backbone model
    const newModel = new this.dialogModel(attributes, {
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
        self.enableBackupButton();
      } else {
        self.disableBackupButton();
        errmsg = gettext('Please provide a filename');
        showError('file', errmsg);
      }
    });
  }

  setExtraParameters(selectedTreeNode, treeInfo) {
    if (this.typeOfDialog === 'backup_objects') {

      this.view.model.set('database', treeInfo.database._label);

      const nodeData = selectedTreeNode.getData();
      if (nodeData._type === 'schema') {
        this.view.model.set('schemas', [nodeData._label]);
      }

      if (nodeData._type === 'table' || nodeData._type === 'partition') {
        this.view.model.set('tables', [
          [treeInfo.schema._label, nodeData._label],
        ]);
      }

      if (_.isEmpty(this.view.model.get('ratio'))) {
        this.view.model.unset('ratio');
      }
    }
  }

  wasBackupButtonPressed(event) {
    return event.button['data-btn-name'] === 'backup';
  }
}
