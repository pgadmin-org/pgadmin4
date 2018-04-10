//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import $ from 'jquery';
import _ from 'underscore';

function getBrowserInstance() {
  if (!_.isUndefined(window.opener) && !_.isNull(window.opener)) {
    return window.opener.pgAdmin.Browser;
  } else {
    return window.parent.pgAdmin.Browser;
  }
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
    $(document).find('link#alertify-no-animation')
               .attr('disabled', 'disabled');
    _.each(document.getElementsByTagName('iframe'), function(frame) {
      $(frame.contentDocument).find('link#alertify-no-animation')
                              .attr('disabled', 'disabled');
    });
  } else {
    $(document).find('link#alertify-no-animation')
               .removeAttr('disabled', 'disabled');
    _.each(document.getElementsByTagName('iframe'), function(frame) {
      $(frame.contentDocument).find('link#alertify-no-animation')
                              .removeAttr('disabled', 'disabled');
    });
  }
}

module.exports = {
  modifyAcitreeAnimation : modifyAcitreeAnimation,
  modifyAlertifyAnimation: modifyAlertifyAnimation,
};
