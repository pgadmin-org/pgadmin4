/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import { withTheme } from '../fake_theme';
import { fireEvent, render, screen } from '@testing-library/react';
import { PgMenu, PgMenuItem } from '../../../pgadmin/static/js/components/Menu';

describe('Menu', ()=>{
  const ThemedPgMenu = withTheme(PgMenu);
  const eleRef = {
    current: document.createElement('button'),
  };

  describe('PgMenu', ()=>{
    const onClose = ()=>{/* on close call */};
    let ctrl;
    const ctrlMount = ()=>{
      ctrl = render(
        <ThemedPgMenu
          anchorRef={eleRef}
          onClose={onClose}
          open={false}
        />);
    };
    it('init', ()=>{
      ctrlMount();
      const menu = screen.getByRole('menu');
      expect(menu.getAttribute('data-state')).toBe('closed');
    });

    it('open', ()=>{
      ctrlMount();
      ctrl.rerender(<ThemedPgMenu
        anchorRef={eleRef}
        onClose={onClose}
        open={true}
      />);
      const menu = screen.getByRole('menu');
      expect(menu.getAttribute('data-state')).toBe('open');
    });
  });

  describe('PgMenuItem', ()=>{
    let ctrlMenu;
    const ctrlMount = (props)=>{
      ctrlMenu = render(
        <ThemedPgMenu
          anchorRef={eleRef}
          open={false}
        >
          <PgMenuItem {...props}>Test</PgMenuItem>
        </ThemedPgMenu>
      );
      ctrlMenu.rerender(
        <ThemedPgMenu
          anchorRef={eleRef}
          open={true}
        >
          <PgMenuItem {...props}>Test</PgMenuItem>
        </ThemedPgMenu>
      );
    };

    it('init', ()=>{
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
      });
      const menuItem = screen.getByRole('menuitem');
      expect(menuItem.textContent).toBe('Test(Ctrl + Shift + K)');
    });

    it('not checked', ()=>{
      ctrlMount({
        hasCheck: true,
      });
      const menuItem = screen.getByRole('menuitem');
      expect(menuItem.querySelector('[data-label="CheckIcon"]').style.visibility).toBe('hidden');
    });

    it('checked', ()=>{
      ctrlMount({
        hasCheck: true,
        checked: true,
      });
      const menuItem = screen.getByRole('menuitem');
      expect(menuItem.querySelector('[data-label="CheckIcon"]').style.visibility).toBe('');
    });


    it('checked clicked', async ()=>{
      const onClick = jest.fn();
      ctrlMount({
        hasCheck: true,
        checked: false,
        onClick: onClick,
      });
      onClick.mockClear();
      const menuItem = screen.getByRole('menuitem');
      fireEvent.click(menuItem);
      expect(onClick).toHaveBeenCalled();
    });
  });
});
