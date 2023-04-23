/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {pgBrowser} from 'pgadmin.browser.preferences';
import EventBus from '../../../pgadmin/static/js/helpers/EventBus';

let dummy_cache = [
  {
    id: 1,
    mid: 1,
    module:'module1',
    name:'pref1',
    value:{
      alt: false,
      shift: false,
      control: false,
      key: {
        char: 'a',
        key_code: 65,
      },
    },
  },{
    id: 2,
    mid: 1,
    module:'module1',
    name:'pref2',
    value: 123,
  },{
    id: 3,
    mid: 2,
    module:'module2',
    name:'pref2',
    value: true,
  },
];

describe('preferences related functions test', function() {
  describe('get preference data related functions', function(){
    beforeEach(function(){
      pgBrowser.preferences_cache = dummy_cache;
      pgBrowser.Events = new EventBus();
    });

    it('generate_preference_version', function() {
      pgBrowser.generate_preference_version();
      expect(pgBrowser.generate_preference_version()).toBeGreaterThan(0);
    });

    it('preference_version', function() {
      let version = 123;
      pgBrowser.preference_version(version);
      expect(pgBrowser.prefcache_version).toEqual(version);
      expect(pgBrowser.preference_version()).toEqual(version);
    });

    it('get_preference', function(){
      expect(pgBrowser.get_preference('module1','pref1')).toEqual({
        id: 1,
        mid: 1,
        module:'module1',
        name:'pref1',
        value:{
          alt: false,
          shift: false,
          control: false,
          key: {
            char: 'a',
            key_code: 65,
          },
        },
      });
    });

    it('get_preferences_for_module', function() {
      expect(pgBrowser.get_preferences_for_module('module1')).toEqual({
        'pref1':{
          alt: false,
          shift: false,
          control: false,
          key: {
            char: 'a',
            key_code: 65,
          },
        },
        'pref2': 123,
      });
    });

    it('get_preference_for_id', function() {
      expect(pgBrowser.get_preference_for_id(3)).toEqual({
        id: 3,
        mid: 2,
        module:'module2',
        name:'pref2',
        value: true,
      });
    });

    it('onPreferencesChange', function() {
      spyOn(pgBrowser.Events, 'on');

      let eventHandler = jasmine.createSpy('eventHandler');
      pgBrowser.onPreferencesChange('somemodule', eventHandler);
      if(pgBrowser.Events.on.calls.mostRecent()) {
        expect(pgBrowser.Events.on.calls.mostRecent().args[0]).toEqual('prefchange:somemodule');
      }
    });
  });
});
