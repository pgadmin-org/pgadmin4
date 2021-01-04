/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import CodeMirror from 'codemirror/lib/codemirror';
import 'codemirror/mode/sql/sql';
import 'codemirror/addon/selection/mark-selection';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/sql-hint';
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/search/search';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/search/jump-to-line';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/comment/comment';
import 'sources/codemirror/addon/fold/pgadmin-sqlfoldcode';
import 'sources/codemirror/extension/centre_on_line';

var cmds = CodeMirror.commands;
cmds.focusOut = function(){
  event.stopPropagation();
  document.activeElement.blur();
  if(event.currentTarget.hasOwnProperty('parents') && event.currentTarget.parents().find('.sql-code-control')) {
    // for code mirror in dialogs
    event.currentTarget.parents().find('.sql-code-control').focus();
  }
};

CodeMirror.defineInitHook(function (codeMirror) {
  codeMirror.addKeyMap({
    Tab: function (cm) {
      if(cm.somethingSelected()){
        cm.execCommand('indentMore');
      }
      else {
        if (cm.getOption('indentWithTabs')) {
          cm.replaceSelection('\t', 'end', '+input');
        }
        else {
          cm.execCommand('insertSoftTab');
        }
      }
    },
  });
});

CodeMirror.keyMap.default['Esc'] = 'focusOut';
export default CodeMirror;
