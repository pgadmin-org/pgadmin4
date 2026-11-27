/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { withTheme } from '../fake_theme';
import CheckBoxTree from '../../../pgadmin/static/js/components/CheckBoxTree';

describe('CheckBoxTree', () => {
  const treeData = [{
    value: 'Group 1', label: 'Group 1',
    children: [{value: 1, label: 'Server A'}, {value: 2, label: 'Server B'}],
  }, {
    value: 'Group 2', label: 'Group 2',
    children: [{value: 3, label: 'Server C'}],
  }];
  const ThemedCheckBoxTree = withTheme(CheckBoxTree);

  it('does not show select all by default', () => {
    render(<ThemedCheckBoxTree treeData={treeData} />);
    expect(screen.queryByLabelText('Select all')).toBeNull();
  });

  it('selects and deselects every server', async () => {
    const user = userEvent.setup();
    const getSelectedServers = jest.fn();
    render(<ThemedCheckBoxTree treeData={treeData} showSelectAll
      getSelectedServers={getSelectedServers} />);
    const selectAll = screen.getByLabelText('Select all');

    await user.click(selectAll);
    expect(getSelectedServers).toHaveBeenLastCalledWith(['1', '2', '3']);
    expect(selectAll).toBeChecked();
    expect(screen.getByLabelText('Group 1')).toBeChecked();
    expect(screen.getByLabelText('Group 2')).toBeChecked();

    await user.click(selectAll);
    expect(getSelectedServers).toHaveBeenLastCalledWith([]);
    expect(selectAll).not.toBeChecked();
    expect(screen.getByLabelText('Group 1')).not.toBeChecked();
  });

  it('reflects a partial selection made in the tree', async () => {
    const user = userEvent.setup();
    render(<ThemedCheckBoxTree treeData={treeData} showSelectAll />);
    const selectAll = screen.getByLabelText('Select all');

    await user.click(screen.getByLabelText('Group 2'));
    expect(selectAll).not.toBeChecked();
    expect(selectAll).toHaveAttribute('data-indeterminate', 'true');

    await user.click(screen.getByLabelText('Group 1'));
    expect(selectAll).toBeChecked();
    expect(selectAll).toHaveAttribute('data-indeterminate', 'false');
  });
});
