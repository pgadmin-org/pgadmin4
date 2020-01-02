/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import Mousetrap from 'mousetrap';
import { findAndSetFocus } from './utils';
import { parseShortcutValue } from './utils';

class dialogTabNavigator {
  constructor(dialogContainer, backwardShortcut, forwardShortcut) {

    this.dialogContainer = dialogContainer;

    this.tabSwitching = false;

    this.tabs = this.dialogContainer.find('.nav-tabs:visible');

    if (this.tabs.length > 0 ) {
      this.tabs = this.tabs[0];
    }

    this.dialogTabBackward = parseShortcutValue(backwardShortcut);
    this.dialogTabForward = parseShortcutValue(forwardShortcut);

    Mousetrap(this.dialogContainer[0]).bind(this.dialogTabBackward, this.onKeyboardEvent.bind(this));
    Mousetrap(this.dialogContainer[0]).bind(this.dialogTabForward, this.onKeyboardEvent.bind(this));

  }

  onKeyboardEvent(event, shortcut) {
    var currentTabPane =  this.dialogContainer
        .find('.tab-content:first > .tab-pane.active:first:visible'),
      childTabData = this.isActivePaneHasChildTabs(currentTabPane);

    if (this.tabSwitching) {
      return;
    }

    this.tabSwitching = true;

    if(childTabData) {
      var res = this.navigate(shortcut, childTabData.childTab,
        childTabData.childTabPane, event);

      if (!res) {
        this.navigate(shortcut, this.tabs, currentTabPane, event);
      }
    } else {
      this.navigate(shortcut, this.tabs, currentTabPane, event);
    }
  }

  isActivePaneHasChildTabs(currentTabPane) {
    var childTab = currentTabPane.find('.nav-tabs:first:visible'),
      childTabPane;

    if (childTab.length > 0) {
      childTabPane = currentTabPane
        .find('.tab-content:first > .tab-pane.active:first:visible');

      return {
        'childTab': childTab,
        'childTabPane': childTabPane,
      };
    }

    return null;
  }

  navigate(shortcut, tabs, tab_pane, event) {
    if (shortcut == this.dialogTabBackward) {
      return this.navigateBackward(tabs, tab_pane, event);
    } else if (shortcut == this.dialogTabForward) {
      return this.navigateForward(tabs, tab_pane, event);
    }
    return false;
  }

  navigateBackward(tabs, tab_pane, event) {
    var self = this,
      nextTabPane,
      innerTabContainer,
      prevtab = $(tabs).find('li').has('a.active').prev('li');

    if (prevtab.length > 0) {
      prevtab.find('a').tab('show');

      nextTabPane = tab_pane.prev();
      innerTabContainer = nextTabPane
        .find('.tab-content:first > .tab-pane.active:first:visible');

      if (innerTabContainer.length > 0) {
        findAndSetFocus(innerTabContainer);
      } else {
        findAndSetFocus(nextTabPane);
      }

      setTimeout(function() {
        self.tabSwitching = false;
      }, 200);

      event.stopPropagation();
      return true;
    }

    this.tabSwitching = false;
    return false;
  }

  navigateForward(tabs, tab_pane, event) {
    var self = this,
      nextTabPane,
      innerTabContainer,
      nexttab = $(tabs).find('li').has('a.active').next('li');

    if(nexttab.length > 0) {
      nexttab.find('a').tab('show');

      nextTabPane = tab_pane.next();
      innerTabContainer = nextTabPane
        .find('.tab-content:first > .tab-pane.active:first:visible');

      if (innerTabContainer.length > 0) {
        findAndSetFocus(innerTabContainer);
      } else {
        findAndSetFocus(nextTabPane);
      }

      setTimeout(function() {
        self.tabSwitching = false;
      }, 200);

      event.stopPropagation();

      return true;
    }
    this.tabSwitching = false;
    return false;
  }

  detach() {
    Mousetrap(this.dialogContainer[0]).unbind(this.dialogTabBackward);
    Mousetrap(this.dialogContainer[0]).unbind(this.dialogTabForward);
  }
}

module.exports = {
  dialogTabNavigator: dialogTabNavigator,
};
