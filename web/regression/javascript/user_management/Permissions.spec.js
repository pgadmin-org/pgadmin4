/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////



import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { withBrowser } from '../genericFunctions';
import Permissions from '../../../pgadmin/tools/user_management/static/js/Permissions';
import { withTheme } from '../fake_theme';

describe('Permissions Component', () => {
  let networkMock;
  let ctrl;
  const PermissionsWithBrowser = withBrowser(withTheme(Permissions));
  const mockRoles = [
    { id: 1, name: 'Administrator', permissions: [] },
    { id: 2, name: 'User', permissions: ['p1', 'p2', 'p3'] },
    { id: 3, name: 'Other', permissions: ['p1', 'p2'] },
  ];
  const mockPermissions = [
    { name: 'p1', label: 'Permission 1', category: 'Category 1' },
    { name: 'p2', label: 'Permission 2', category: 'Category 1' },
    { name: 'p3', label: 'Permission 3', category: 'Category 2' },
  ];
  const mockUpdateRolePermissions = jest.fn();

  const renderComponent = async () => {
    await act( async () => {
      if(ctrl) {
        ctrl.unmount();
      }
      ctrl = render(
        <PermissionsWithBrowser
          roles={mockRoles}
          updateRolePermissions={mockUpdateRolePermissions}
        />
      );
    });
  };

  beforeEach(async ()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onGet('/user_management/all_permissions').reply(200, mockPermissions);

    await renderComponent();
  });

  afterEach(() => {
    networkMock.restore();
  });

  it('renders the component and loads permissions', async () => {
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('allows selecting a role and displays permissions', async () => {
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown', code: 40 });
    fireEvent.click(screen.getByText('Other'));
    await waitFor(() => {
      expect(screen.getByText('Category 1')).toBeInTheDocument();
      expect(screen.getByText('Permission 1')).toBeInTheDocument();
      expect(screen.getByText('Permission 2')).toBeInTheDocument();
    });
  });

  it('filters permissions based on search input', async () => {
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown', code: 40 });
    fireEvent.click(screen.getByText('Other'));
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Permission 3' } });
    await waitFor(() => {
      expect(screen.getByText('Permission 3')).toBeInTheDocument();
      expect(screen.queryByText('Permission 1')).not.toBeInTheDocument();
    });
  });

  it('saves permissions', async () => {
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown', code: 40 });
    fireEvent.click(screen.getByText('Other'));
    fireEvent.click(screen.getByText('Permission 3'));
    networkMock.onPut('/user_management/save_permissions').reply(200, {
      permissions: ['p1', 'p2', 'p3']
    });

    await waitFor(() => {
      expect(screen.getByText('Save')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save'));
      mockRoles[2].permissions = ['p1', 'p2', 'p3'];
    });

    await renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeDisabled();
      expect(mockUpdateRolePermissions).toHaveBeenCalledWith(3, ['p1', 'p2', 'p3']);
    });
  });
});
