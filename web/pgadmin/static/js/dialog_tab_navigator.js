import $ from 'jquery';
import Mousetrap from 'mousetrap';
import { findAndSetFocus } from './utils';
import { parseShortcutValue } from './utils';

class dialogTabNavigator {
  constructor(dialog, backwardShortcut, forwardShortcut) {

    this.dialog = dialog;

    this.tabSwitching = false;

    this.tabs = this.dialog.$el.find('.nav-tabs');

    if (this.tabs.length > 0 ) {
      this.tabs = this.tabs[0];
    }

    this.dialogTabBackward = parseShortcutValue(backwardShortcut);
    this.dialogTabForward = parseShortcutValue(forwardShortcut);

    Mousetrap(this.dialog.el).bind(this.dialogTabBackward, this.onKeyboardEvent.bind(this));
    Mousetrap(this.dialog.el).bind(this.dialogTabForward, this.onKeyboardEvent.bind(this));

  }

  onKeyboardEvent(event, shortcut) {
    var currentTabPane =  this.dialog.$el
        .find('.tab-content:first > .tab-pane.active:first'),
      childTabData = this.isActivePaneHasChildTabs(currentTabPane);

    if (this.tabSwitching) {
      return;
    }

    this.tabSwitching = true;

    if(childTabData) {
      var res = this.navigate(shortcut, childTabData.childTab,
        childTabData.childTabPane);

      if (!res) {
        this.navigate(shortcut, this.tabs, currentTabPane);
      }
    } else {
      this.navigate(shortcut, this.tabs, currentTabPane);
    }
  }

  isActivePaneHasChildTabs(currentTabPane) {
    var childTab = currentTabPane.find('.nav-tabs:first'),
      childTabPane;

    if (childTab.length > 0) {
      childTabPane = currentTabPane
        .find('.tab-content:first > .tab-pane.active:first');

      return {
        'childTab': childTab,
        'childTabPane': childTabPane,
      };
    }

    return null;
  }

  navigate(shortcut, tabs, tab_pane) {
    if(shortcut == this.dialogTabBackward) {
      return this.navigateBackward(tabs, tab_pane);
    }else if (shortcut == this.dialogTabForward) {
      return this.navigateForward(tabs, tab_pane);
    }
    return false;
  }

  navigateBackward(tabs, tab_pane) {
    var self = this,
      nextTabPane,
      innerTabContainer,
      prevtab = $(tabs).find('li.active').prev('li');

    if (prevtab.length > 0) {
      prevtab.find('a').tab('show');

      nextTabPane = tab_pane.prev();
      innerTabContainer = nextTabPane
        .find('.tab-content:first > .tab-pane.active:first');

      if (innerTabContainer.length > 0) {
        findAndSetFocus(innerTabContainer);
      } else {
        findAndSetFocus(nextTabPane);
      }

      setTimeout(function() {
        self.tabSwitching = false;
      }, 200);

      return true;
    }

    this.tabSwitching = false;
    return false;
  }

  navigateForward(tabs, tab_pane) {
    var self = this,
      nextTabPane,
      innerTabContainer,
      nexttab = $(tabs).find('li.active').next('li');

    if(nexttab.length > 0) {
      nexttab.find('a').tab('show');

      nextTabPane = tab_pane.next();
      innerTabContainer = nextTabPane
        .find('.tab-content:first > .tab-pane.active:first');

      if (innerTabContainer.length > 0) {
        findAndSetFocus(innerTabContainer);
      } else {
        findAndSetFocus(nextTabPane);
      }

      setTimeout(function() {
        self.tabSwitching = false;
      }, 200);

      return true;
    }
    this.tabSwitching = false;
    return false;
  }

  detach() {
    Mousetrap(this.dialog.el).unbind(this.dialogTabBackward);
    Mousetrap(this.dialog.el).unbind(this.dialogTabForward);
  }
}

module.exports = {
  dialogTabNavigator: dialogTabNavigator,
};