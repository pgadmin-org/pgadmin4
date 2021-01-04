/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {pgBrowser} from 'pgadmin.browser.layout';
import 'wcdocker';

var wcDocker = window.wcDocker;

describe('layout related functions test', function() {
  let menu_items = null;
  let dummy_cache = [{
    id: 2,
    mid: 1,
    module:'browser',
    name:'lock_layout',
    value: 'none',
  }];

  beforeEach(function(){
    pgBrowser.preferences_cache = dummy_cache;
    pgBrowser.docker = {
      'lockLayout': ()=>{},
    };

    _.extend(pgBrowser,{
      'menus': {
        'file': {
          'mnu_locklayout': {
            'menu_items': [
              {'name': 'mnu_lock_none', change_checked: ()=> {}},
              {'name': 'mnu_lock_docking', change_checked: ()=> {}},
              {'name': 'mnu_lock_full', change_checked: ()=> {}},
            ],
          },
        },
      },
    });

    menu_items = pgBrowser.menus.file.mnu_locklayout.menu_items;
  });

  describe('for menu actions', function() {
    beforeEach(function(){
      spyOn(pgBrowser, 'lock_layout');
      spyOn(pgBrowser, 'save_lock_layout');
    });

    it('mnu_lock_none', function() {
      pgBrowser.mnu_lock_none();
      expect(pgBrowser.lock_layout).toHaveBeenCalledWith(pgBrowser.docker, 'none');
      expect(pgBrowser.save_lock_layout).toHaveBeenCalledWith('none');
    });

    it('mnu_lock_docking', function() {
      pgBrowser.mnu_lock_docking();
      expect(pgBrowser.lock_layout).toHaveBeenCalledWith(pgBrowser.docker, 'docking');
      expect(pgBrowser.save_lock_layout).toHaveBeenCalledWith('docking');
    });

    it('mnu_lock_full', function() {
      pgBrowser.mnu_lock_full();
      expect(pgBrowser.lock_layout).toHaveBeenCalledWith(pgBrowser.docker, 'full');
      expect(pgBrowser.save_lock_layout).toHaveBeenCalledWith('full');
    });
  });

  describe('lock_layout', function() {
    let change_checked_test= function(menu_name) {
      for(let i=0; i<menu_items.length; i++) {
        if(menu_items[i].name == menu_name) {
          expect(menu_items[i].change_checked).toHaveBeenCalledWith(true);
        } else {
          expect(menu_items[i].change_checked).toHaveBeenCalledWith(false);
        }
      }
    };

    beforeEach(function(){
      spyOn(pgBrowser.docker, 'lockLayout');
      for(let i=0; i<menu_items.length; i++) {
        spyOn(menu_items[i], 'change_checked');
      }
    });

    it('none', function() {
      pgBrowser.lock_layout(pgBrowser.docker, 'none');
      expect(pgBrowser.docker.lockLayout).toHaveBeenCalledWith(wcDocker.LOCK_LAYOUT_LEVEL.NONE);
      change_checked_test('mnu_lock_none');
    });

    it('docking', function() {
      pgBrowser.lock_layout(pgBrowser.docker, 'docking');
      expect(pgBrowser.docker.lockLayout).toHaveBeenCalledWith(wcDocker.LOCK_LAYOUT_LEVEL.PREVENT_DOCKING);
      change_checked_test('mnu_lock_docking');
    });

    it('full', function() {
      pgBrowser.lock_layout(pgBrowser.docker, 'full');
      expect(pgBrowser.docker.lockLayout).toHaveBeenCalledWith(wcDocker.LOCK_LAYOUT_LEVEL.FULL);
      change_checked_test('mnu_lock_full');
    });
  });
});
