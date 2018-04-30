//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
import dialogTabNavigator from 'sources/dialog_tab_navigator';
import $ from 'jquery';
import 'bootstrap';

describe('dialogTabNavigator', function () {
  let dialog, tabNavigator, backward_shortcut, forward_shortcut;

  beforeEach(() => {
    let dialogHtml =$('<div tabindex="1" class="backform-tab" role="tabpanel">'+
        '   <ul class="nav nav-tabs" role="tablist">'+
        '      <li role="presentation" class="active">'+
        '         <a data-toggle="tab" tabindex="-1" data-tab-index="1" href="#1" aria-controls="1"> General</a>'+
        '      </li>'+
        '     <li role="presentation">'+
        '         <a data-toggle="tab" tabindex="-1" data-tab-index="5" href="#2" aria-controls="2"> Default Privileges</a>'+
        '      </li>'+
        '      <li role="presentation">'+
        '         <a data-toggle="tab" tabindex="-1" data-tab-index="6" href="#3" aria-controls="3"> SQL</a>'+
        '      </li>'+
        '   </ul>'+
        '   <ul class="tab-content">'+
        '      <div role="tabpanel" tabindex="-1" class="tab-pane fade collapse in active" id="1">'+
        '      </div>'+
        '      <div role="tabpanel" tabindex="-1" class="tab-pane fade collapse" id="2">'+
        '         <div class="inline-tab-panel" role="tabpanel">'+
        '            <ul class="nav nav-tabs" role="tablist">'+
        '               <li role="presentation" class="active">'+
        '                  <a data-toggle="tab" tabindex="-1" data-tab-index="601" href="#11" aria-controls="11"> Tables</a>'+
        '               </li>'+
        '               <li role="presentation">'+
        '                  <a data-toggle="tab" tabindex="-1" data-tab-index="602" href="#22" aria-controls="22"> Sequences</a>'+
        '               </li>'+
        '            </ul>'+
        '            <ul class="tab-content">'+
        '               <div role="tabpanel" tabindex="-1" class="tab-pane fade collapse in active" id="11" >'+
        '               </div>'+
        '               <div role="tabpanel" tabindex="-1" class="tab-pane fade collapse" id="22">'+
        '               </div>'+
        '            </ul>'+
        '         </div>'+
        '      </div>'+
        '      <div role="tabpanel" tabindex="-1" class="tab-pane fade collapse" id="3">'+
        '      </div>'+
        '   </ul>'+
        '</div>');

    dialog = {};

    dialog.el = dialogHtml[0];
    dialog.$el = dialogHtml;

    backward_shortcut = {
      'alt': false,
      'shift': true,
      'control': true,
      'key': {'key_code': 91, 'char': '['},
    };

    forward_shortcut = {
      'alt': false,
      'shift': true,
      'control': true,
      'key': {'key_code': 93, 'char': ']'},
    };

    tabNavigator = new dialogTabNavigator.dialogTabNavigator(
          dialog, backward_shortcut, forward_shortcut);
  });

  describe('navigate', function () {

    beforeEach(() => {
      spyOn(tabNavigator, 'navigateBackward').and.callThrough();

      spyOn(tabNavigator, 'navigateForward').and.callThrough();
    });

    it('navigate backward', function () {
      tabNavigator.onKeyboardEvent({}, 'shift+ctrl+[');

      expect(tabNavigator.navigateBackward).toHaveBeenCalled();

      expect(tabNavigator.navigateForward).not.toHaveBeenCalled();

    });

    it('navigate forward', function () {
      tabNavigator.onKeyboardEvent({}, 'shift+ctrl+]');

      expect(tabNavigator.navigateForward).toHaveBeenCalled();

      expect(tabNavigator.navigateBackward).not.toHaveBeenCalled();

    });

    it('should not navigate', function () {
      tabNavigator.onKeyboardEvent({}, 'shift+ctrl+a');

      expect(tabNavigator.navigateForward).not.toHaveBeenCalled();

      expect(tabNavigator.navigateBackward).not.toHaveBeenCalled();

    });

  });

});