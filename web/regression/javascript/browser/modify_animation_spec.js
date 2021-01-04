/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import modifyAnimation from 'sources/modify_animation';


describe('modifyAnimation', function () {
  let pgBrowser;
  let dummyElement;

  beforeEach(() => {
    pgBrowser = jasmine.createSpyObj('pgBrowser', ['get_preference', 'tree']);
    pgBrowser.tree = jasmine.createSpyObj('tree', ['options']);
    pgBrowser.tree.options.and.returnValue({
      show: {},
      hide: {},
      view: {},
    });
    dummyElement = document.createElement('link');
    spyOn($.fn, 'find').and.returnValue($(dummyElement));
    spyOn($.fn, 'removeClass');
    spyOn($.fn, 'addClass');
  });

  describe('When browser tree animation is disabled', () => {
    beforeEach(() => {
      pgBrowser.get_preference.and.returnValue({value: false});
      modifyAnimation.modifyAcitreeAnimation(pgBrowser);
    });
    it('tree options to animate should be disabled', function() {
      expect(pgBrowser.get_preference).toHaveBeenCalled();
      expect(pgBrowser.tree.options).toHaveBeenCalledTimes(4);
      expect(pgBrowser.tree.options).toHaveBeenCalledWith({
        animateRoot: false,
        unanimated: true,
        show: {duration: 0},
        hide: {duration: 0},
        view: {duration: 0},
      });
    });
  });

  describe('When browser tree animation is enabled', () => {
    beforeEach(() => {
      pgBrowser.get_preference.and.returnValue({value: true});
      modifyAnimation.modifyAcitreeAnimation(pgBrowser);
    });
    it('tree options to animate should be enabled', function() {
      expect(pgBrowser.get_preference).toHaveBeenCalled();
      expect(pgBrowser.tree.options).toHaveBeenCalledTimes(4);
      expect(pgBrowser.tree.options).toHaveBeenCalledWith({
        animateRoot: true,
        unanimated: false,
        show: {duration: 75},
        hide: {duration: 75},
        view: {duration: 75},
      });
    });
  });

  describe('When alertify animation is disabled', () => {
    beforeEach(() => {
      pgBrowser.get_preference.and.returnValue({value: false});
      modifyAnimation.modifyAlertifyAnimation(pgBrowser);

    });
    it('alertify disalogue/notification animation should be disabled', function() {
      expect(pgBrowser.get_preference).toHaveBeenCalled();
      expect($.fn.find).toHaveBeenCalled();
      expect($.fn.addClass).toHaveBeenCalledWith('alertify-no-animation');
    });
  });

  describe('When alertify animation is enabled', () => {
    beforeEach(() => {
      pgBrowser.get_preference.and.returnValue({value: true});
      modifyAnimation.modifyAlertifyAnimation(pgBrowser);
    });
    it('alertify disalogue/notification animation should be enabled', function() {
      expect(pgBrowser.get_preference).toHaveBeenCalled();
      expect($.fn.find).toHaveBeenCalled();
      expect($.fn.removeClass).toHaveBeenCalledWith('alertify-no-animation');
    });
  });

});

