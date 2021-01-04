/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {pgBrowser} from 'pgadmin.browser.preferences';
import $ from 'jquery';

var dummy_cache = [
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

    it('reflectPreferences', function() {

      let editorOptions = {
        'tabSize':2,
        'lineWrapping':false,
        'autoCloseBrackets':true,
        'matchBrackets':true,
      };
      pgBrowser.preferences_cache.push({
        id: 4, mid: 3, module:'sqleditor', name:'sql_font_size', value: 1.456,
      });
      pgBrowser.preferences_cache.push({
        id: 4, mid: 3, module:'sqleditor', name:'tab_size', value: editorOptions.tabSize,
      });
      pgBrowser.preferences_cache.push({
        id: 4, mid: 3, module:'sqleditor', name:'wrap_code', value: editorOptions.lineWrapping,
      });
      pgBrowser.preferences_cache.push({
        id: 4, mid: 3, module:'sqleditor', name:'insert_pair_brackets', value: editorOptions.autoCloseBrackets,
      });
      pgBrowser.preferences_cache.push({
        id: 4, mid: 3, module:'sqleditor', name:'brace_matching', value: editorOptions.matchBrackets,
      });

      /* Spies */
      pgBrowser.editor = jasmine.createSpyObj(
        'CodeMirror', ['setOption','refresh','getWrapperElement']
      );
      spyOn($.fn, 'css');

      /* Call */
      pgBrowser.reflectPreferences();

      /* Tests */
      expect(pgBrowser.editor.getWrapperElement).toHaveBeenCalled();
      //expect($.fn.css).toHaveBeenCalledWith('font-size', '1.46em');

      let setOptionCalls = pgBrowser.editor.setOption.calls;
      expect(setOptionCalls.count()).toEqual(Object.keys(editorOptions).length);

      for(let i = 0; i < Object.keys(editorOptions).length; i++) {
        let option = Object.keys(editorOptions)[i];
        expect(setOptionCalls.argsFor(i)).toEqual([option, editorOptions[option]]);
      }
      expect(pgBrowser.editor.refresh).toHaveBeenCalled();
    });

    it('onPreferencesChange', function() {

      window.parent.$ = $;
      spyOn($.fn, 'on');

      var eventHandler = jasmine.createSpy('eventHandler');
      pgBrowser.onPreferencesChange('somemodule', eventHandler);
      if($.fn.on.calls.mostRecent()) {
        expect($.fn.on.calls.mostRecent().args[0]).toEqual('prefchange:somemodule');
      }
    });
  });
});
