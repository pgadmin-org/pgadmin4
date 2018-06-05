import * as commonUtils from '../utils';

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

  focusOnDialog(dialog) {
    dialog.$el.attr('tabindex', -1);
    this.pgBrowser.keyboardNavigation.getDialogTabNavigator(dialog);
    const container = dialog.$el.find('.tab-content:first > .tab-pane.active:first');
    commonUtils.findAndSetFocus(container);
  }

  isNodeSelected(selectedTreeNode) {
    return selectedTreeNode;
  }
}
