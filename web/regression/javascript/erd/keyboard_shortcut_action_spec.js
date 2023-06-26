/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import {KeyboardShortcutAction} from 'pgadmin.tools.erd/erd_tool/components/ERDTool';

describe('KeyboardShortcutAction', ()=>{
  let keyAction = null;
  let key1 = {
    alt: true,
    control: true,
    shift: false,
    key: {
      key_code: 65,
    },
  };
  let key2 = {
    alt: false,
    control: true,
    shift: false,
    key: {
      key_code: 66,
    },
  };
  let handler1 = jest.fn();
  let handler2 = jest.fn();

  beforeAll(()=>{
    jest.spyOn(KeyboardShortcutAction.prototype, 'shortcutKey');
    keyAction = new KeyboardShortcutAction([
      [key1, handler1],
      [key2, handler2],
    ]);
  });

  it('init', ()=>{
    expect(Object.keys(keyAction.shortcuts).length).toBe(2);
  });

  it('shortcutKey', ()=>{
    expect(keyAction.shortcutKey(true, true, true, true, 65)).toBe('true:true:true:true:65');
    expect(keyAction.shortcutKey(true, false, true, true, 65)).toBe('true:false:true:true:65');
    expect(keyAction.shortcutKey(true, true, false, true, 65)).toBe('true:true:false:true:65');
    expect(keyAction.shortcutKey(true, true, true, false, 65)).toBe('true:true:true:false:65');
    expect(keyAction.shortcutKey(false, true, true, true, 65)).toBe('false:true:true:true:65');
  });

  it('callHandler', ()=>{
    let keyEvent = {altKey: key1.alt, ctrlKey: key1.control, shiftKey: key1.shift, metaKey: false, keyCode:key1.key.key_code};
    keyAction.callHandler(keyEvent);
    expect(handler1).toHaveBeenCalled();

    keyEvent = {altKey: key2.alt, ctrlKey: key2.control, shiftKey: key2.shift, metaKey: false, keyCode:key2.key.key_code};
    keyAction.callHandler(keyEvent);
    expect(handler2).toHaveBeenCalled();
  });
});
