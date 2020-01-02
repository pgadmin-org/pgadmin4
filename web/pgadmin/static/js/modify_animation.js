//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import $ from 'jquery';
import _ from 'underscore';
import pgWindow from 'sources/window';

function getBrowserInstance() {
  return pgWindow.pgAdmin.Browser;
}

function modifyAcitreeAnimation(pgBrowser, tree) {
  let enableAcitreeAnimation = pgBrowser.get_preference(
    'browser', 'enable_acitree_animation'
  ).value;

  if (_.isUndefined(tree)) {
    tree = pgBrowser.tree;
  }

  if(enableAcitreeAnimation) {
    tree.options({
      animateRoot: true,
      unanimated: false,
      show: _.extend(tree.options().show, {duration: 75}),
      hide: _.extend(tree.options().hide, {duration: 75}),
      view: _.extend(tree.options().view, {duration: 75}),
    });
  } else {
    tree.options({
      animateRoot: false,
      unanimated: true,
      show: _.extend(tree.options().show, {duration: 0}),
      hide: _.extend(tree.options().hide, {duration: 0}),
      view: _.extend(tree.options().view, {duration: 0}),
    });
  }
}

function modifyAlertifyAnimation(pgBrowser) {
  if(_.isUndefined(pgBrowser) || _.isNull(pgBrowser)) {
    pgBrowser = getBrowserInstance();
  }

  let enableAcitreeAnimation = pgBrowser.get_preference(
    'browser', 'enable_alertify_animation'
  ).value;

  if(enableAcitreeAnimation) {
    $(document).find('body').removeClass('alertify-no-animation');
    _.each(document.getElementsByTagName('iframe'), function(frame) {
      $(frame.contentDocument).find('body').removeClass('alertify-no-animation');
    });
  } else {
    $(document).find('body').addClass('alertify-no-animation');
    _.each(document.getElementsByTagName('iframe'), function(frame) {
      $(frame.contentDocument).find('body').addClass('alertify-no-animation');
    });
  }
}

module.exports = {
  modifyAcitreeAnimation : modifyAcitreeAnimation,
  modifyAlertifyAnimation: modifyAlertifyAnimation,
};
