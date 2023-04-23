/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { withTheme } from '../fake_theme';
import { createMount } from '@material-ui/core/test-utils';
import { PgMenu, PgMenuItem } from '../../../pgadmin/static/js/components/Menu';

describe('Menu', ()=>{
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
  });

  const ThemedPgMenu = withTheme(PgMenu);
  const eleRef = {
    current: document.createElement('button'),
  };

  describe('PgMenu', ()=>{
    const onClose = ()=>{/* on close call */};
    let ctrl;
    const ctrlMount = ()=>{
      ctrl?.unmount();
      ctrl = mount(
        <ThemedPgMenu
          anchorRef={eleRef}
          onClose={onClose}
          open={false}
        />);
    };
    it('init', (done)=>{
      ctrlMount();

      setTimeout(()=>{
        ctrl.update();
        expect(ctrl.find('ForwardRef(ControlledMenu)')).toHaveProp('anchorRef', eleRef);
        expect(ctrl.find('ForwardRef(ControlledMenu)')).toHaveProp('state', 'closed');
        expect(ctrl.find('ForwardRef(ControlledMenu)')).toHaveProp('onClose', onClose);
        done();
      }, 0);
    });

    it('open', (done)=>{
      ctrlMount();

      setTimeout(()=>{
        ctrl.update();
        ctrl.setProps({open: true});
        setTimeout(()=>{
          expect(ctrl.find('ForwardRef(ControlledMenu)')).toHaveProp('state', 'open');
          done();
        }, 0);
      }, 0);
    });
  });

  describe('PgMenuItem', ()=>{
    let ctrlMenu;
    const ctrlMount = (props, callback)=>{
      ctrlMenu?.unmount();
      ctrlMenu = mount(
        <ThemedPgMenu
          anchorRef={eleRef}
          open={false}
        >
          <PgMenuItem {...props}>Test</PgMenuItem>
        </ThemedPgMenu>
      );
      ctrlMenu.setProps({open: true});
      setTimeout(()=>{
        ctrlMenu.update();
        callback();
      }, 0);
    };

    it('init', (done)=>{
      ctrlMount({
        shortcut: {
          'control': true,
          'shift': true,
          'alt': false,
          'key': {
            'key_code': 75,
            'char': 'k',
          },
        }
      }, ()=>{
        const menuItem = ctrlMenu.find('Memo(MenuItem)');
        expect(menuItem.find('li[role="menuitem"]').text()).toBe('Test(Ctrl + Shift + K)');
        done();
      });
    });

    it('not checked', (done)=>{
      ctrlMount({
        hasCheck: true,
      }, ()=>{
        const checkIcon = ctrlMenu.find('ForwardRef(CheckIcon)');
        expect(checkIcon.props()).toEqual(jasmine.objectContaining({
          style: {
            visibility: 'hidden',
          }
        }));
        done();
      });
    });

    it('checked', (done)=>{
      ctrlMount({
        hasCheck: true,
        checked: true,
      }, ()=>{
        const checkIcon = ctrlMenu.find('ForwardRef(CheckIcon)');
        expect(checkIcon.props()).toEqual(jasmine.objectContaining({
          style: {},
        }));
        done();
      });
    });


    it('checked clicked', (done)=>{
      const onClick = jasmine.createSpy('onClick');
      ctrlMount({
        hasCheck: true,
        checked: false,
        onClick: onClick,
      }, ()=>{
        onClick.calls.reset();
        ctrlMenu.find('Memo(MenuItem)').simulate('click');
        expect(onClick.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
          keepOpen: true,
        }));
        done();
      });
    });
  });
});
