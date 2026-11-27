/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../fake_theme';
import {
  ActiveOnlyHeader, getSessionsAutoRefreshDelay,
} from '../../../pgadmin/dashboard/static/js/Dashboard';

describe('Dashboard sessions auto refresh', ()=>{
  describe('getSessionsAutoRefreshDelay', ()=>{
    const enabled = {
      autoRefresh: true, onStateTab: true, pageVisible: true,
      serverConnected: true, did: 0, dbConnected: false, refreshRate: 5,
    };

    it.each([
      ['enabled on a server', {}, 5000],
      ['enabled on a connected database', {did: 3, dbConnected: true}, 5000],
      ['uses the refresh rate', {refreshRate: 12}, 12000],
      ['checkbox off', {autoRefresh: false}, -1],
      ['another dashboard tab', {onStateTab: false}, -1],
      ['dashboard panel hidden', {pageVisible: false}, -1],
      ['server disconnected', {serverConnected: false}, -1],
      ['database disconnected', {did: 3, dbConnected: false}, -1],
      ['refresh rate missing', {refreshRate: undefined}, -1],
    ])('%s', (_name, overrides, expected)=>{
      expect(getSessionsAutoRefreshDelay({...enabled, ...overrides}))
        .toBe(expected);
    });
  });

  describe('<ActiveOnlyHeader />', ()=>{
    const ThemedHeader = withTheme(ActiveOnlyHeader);

    it('toggles auto refresh independently of active sessions only', ()=>{
      const setActiveOnly = jest.fn();
      const setAutoRefresh = jest.fn();
      render(<ThemedHeader activeOnly={false} setActiveOnly={setActiveOnly}
        autoRefresh={false} setAutoRefresh={setAutoRefresh} />);

      const autoRefresh = screen.getByRole('checkbox', {name: 'Auto refresh'});
      expect(autoRefresh).not.toBeChecked();
      fireEvent.click(autoRefresh);
      expect(setAutoRefresh).toHaveBeenCalledWith(true);
      expect(setActiveOnly).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('checkbox', {name: 'Active sessions only'}));
      expect(setActiveOnly).toHaveBeenCalledWith(true);
      expect(setAutoRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
