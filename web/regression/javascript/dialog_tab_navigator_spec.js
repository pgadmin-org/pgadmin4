//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
import dialogTabNavigator from 'sources/dialog_tab_navigator';
import $ from 'jquery';
import 'bootstrap';

describe('dialogTabNavigator', function () {
  let dialog, tabNavigator, backward_shortcut, forward_shortcut, fakeEvent;

  beforeEach(() => {
    dialog = $('<div tabindex="1" class="backform-tab" role="tabpanel">'+
        '   <ul class="nav nav-tabs" role="tablist">'+
        '      <li role="presentation">'+
        '         <a class="active" data-toggle="tab" tabindex="-1" data-tab-index="1" href="#1" aria-controls="1"> General</a>'+
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

    fakeEvent = { stopPropagation: () => true };

  });

  describe('navigate', function () {

    beforeEach(() => {
      spyOn(tabNavigator, 'navigateBackward').and.callThrough();

      spyOn(tabNavigator, 'navigateForward').and.callThrough();
    });

    it('navigate backward', function () {
      tabNavigator.onKeyboardEvent(fakeEvent, 'shift+ctrl+[');

      expect(tabNavigator.navigateBackward).toHaveBeenCalled();

      expect(tabNavigator.navigateForward).not.toHaveBeenCalled();

    });

    it('navigate forward', function () {
      tabNavigator.onKeyboardEvent(fakeEvent, 'shift+ctrl+]');

      expect(tabNavigator.navigateForward).toHaveBeenCalled();

      expect(tabNavigator.navigateBackward).not.toHaveBeenCalled();

    });

    it('should not navigate', function () {
      tabNavigator.onKeyboardEvent(fakeEvent, 'shift+ctrl+a');

      expect(tabNavigator.navigateForward).not.toHaveBeenCalled();

      expect(tabNavigator.navigateBackward).not.toHaveBeenCalled();

    });

  });


  describe('navigateForward from fist tab to second tab', function () {
    var navigateForwardResult;
    beforeEach(() => {
      spyOn(tabNavigator, 'navigateForward').and.callThrough();

      navigateForwardResult = tabNavigator.navigateForward(
        dialog.find('ul.nav-tabs:first'),
        dialog.find('div#1'),
        fakeEvent
      );
    });

    it('should return true', function () {

      expect(navigateForwardResult).toEqual(true);

    });

  });


  describe('navigateForward from last tab', function () {
    var navigateForwardResult;
    beforeEach(() => {

      // set second tab active
      dialog.find('ul.nav-tabs li a.active').removeClass('active');

      dialog.find('ul.nav-tabs li a[href="#3"]').addClass('active');

      spyOn(tabNavigator, 'navigateForward').and.callThrough();

      navigateForwardResult = tabNavigator.navigateForward(
        dialog.find('ul.nav-tabs:first'),
        dialog.find('div#1'),
        fakeEvent
      );
    });

    it('should return false', function () {

      expect(navigateForwardResult).toEqual(false);

    });

  });

  describe('navigateBackward from second tab to first tab', function () {
    var navigateBackwardResult;
    beforeEach(() => {
      // set second tab active
      dialog.find('ul.nav-tabs li a.active').removeClass('active');

      dialog.find('ul.nav-tabs li a[href="#2"]').addClass('active');

      spyOn(tabNavigator, 'navigateBackward').and.callThrough();

      navigateBackwardResult = tabNavigator.navigateBackward(
        dialog.find('ul.nav-tabs:first'),
        dialog.find('div#1'),
        fakeEvent
      );
    });

    it('should return true', function () {

      expect(navigateBackwardResult).toEqual(true);

    });

  });

  describe('navigateBackward from first tab', function () {
    var navigateBackwardResult;
    beforeEach(() => {
      spyOn(tabNavigator, 'navigateBackward').and.callThrough();

      navigateBackwardResult = tabNavigator.navigateBackward(
        dialog.find('ul.nav-tabs:first'),
        dialog.find('div#1'),
        fakeEvent
      );
    });

    it('should return false', function () {

      expect(navigateBackwardResult).toEqual(false);

    });

  });

});
