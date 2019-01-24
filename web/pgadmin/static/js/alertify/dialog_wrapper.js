/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2019, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as commonUtils from '../utils';
import $ from 'jquery';

export class DialogWrapper {
  constructor(
    dialogContainerSelector, dialogTitle, jquery, pgBrowser,
    alertify, dialogModel, backform) {
    this.hooks = {
      onclose: function () {
        if (this.view) {
          this.view.remove({
            data: true,
            internal: true,
            silent: true,
          });
        }
      },
    };
    this.dialogContainerSelector = dialogContainerSelector;
    this.dialogTitle = dialogTitle;
    this.jquery = jquery;
    this.pgBrowser = pgBrowser;
    this.alertify = alertify;
    this.dialogModel = dialogModel;
    this.backform = backform;
  }

  build() {
    this.alertify.pgDialogBuild.apply(this);
  }

  wasHelpButtonPressed(e) {
    return e.button.element.name === 'dialog_help'
      || e.button.element.name === 'object_help';
  }

  getSelectedNodeData(selectedTreeNode) {
    if (!this.isNodeSelected(selectedTreeNode)) {
      return undefined;
    }
    const treeNodeData = selectedTreeNode.getData();
    if (treeNodeData) {
      return treeNodeData;
    }
    return undefined;
  }

  focusOnDialog(alertifyDialog) {
    let backform_tab = $(alertifyDialog.elements.body).find('.backform-tab');
    backform_tab.attr('tabindex', -1);
    this.pgBrowser.keyboardNavigation.getDialogTabNavigator($(alertifyDialog.elements.dialog));
    const container = backform_tab.find('.tab-content:first > .tab-pane.active:first');
    commonUtils.findAndSetFocus(container);

    $(alertifyDialog.elements.footer).on('keydown', 'button', function(event) {
      if (event.keyCode == 9 && $(this).nextAll('button:not([disabled])').length == 0) {
        // set focus back to first editable input element of current active tab once we cycle through all enabled buttons.
        commonUtils.findAndSetFocus($(alertifyDialog.elements.body).find('.tab-content div.active'));
        return false;
      }
    });
  }

  isNodeSelected(selectedTreeNode) {
    return selectedTreeNode;
  }
}
