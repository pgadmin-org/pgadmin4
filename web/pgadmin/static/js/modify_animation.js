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

function modify_acitree_animation(pgBrowser, tree) {
  if (_.isUndefined(tree)) {
    tree = pgBrowser.tree;
  }
  var enable_acitree_animation = pgBrowser.get_preference('browser',
    'enable_acitree_animation').value;
  if(enable_acitree_animation == true) {
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

function modify_alertify_animation(pgBrowser) {
  var enable_alertify_animation = pgBrowser.get_preference('browser',
    'enable_alertify_animation').value;
  if(enable_alertify_animation == true) {
    $(document).find('link#alertify-no-animation').attr('disabled', 'disabled');
    _.each(document.getElementsByTagName('iframe'), function(frame){
      $(frame.contentDocument).find('link#alertify-no-animation').attr('disabled', 'disabled');
    });
  } else {
    $(document).find('link#alertify-no-animation').removeAttr('disabled', 'disabled');
    _.each(document.getElementsByTagName('iframe'), function(frame){
      $(frame.contentDocument).find('link#alertify-no-animation').removeAttr('disabled', 'disabled');
    });
  }
}

module.exports = {
  modify_acitree_animation : modify_acitree_animation,
  modify_alertify_animation: modify_alertify_animation,
};
