/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import { TestSchema } from './TestSchema.ui';
import { withBrowser } from '../genericFunctions';

// A single required field is all the Ctrl/Cmd+Enter save-and-close tests
// need; TestSchema's nested tab and row collection require a lot more
// simulated input just to get to a savable state.
class MinimalSchema extends BaseUISchema {
  constructor() {
    super({field1: null});
  }

  get baseFields() {
    return [
      {
        id: 'field1', label: 'Field1', type: 'text', group: null,
        mode: ['properties', 'edit', 'create'], disabled: false, visible: true,
      },
    ];
  }
}

// Escape closes a dialog rendered as a dockable panel (issue #5691). The
// handler sits on the dialog wrapper, which must not be memoized along with
// the dialog body: the body only changes with the schema, the mode or the
// reset key, whereas onClose is a fresh function on most parent renders, and
// a memoized wrapper would keep calling whichever one it captured first.
describe('SchemaDialogView keyboard handling', () => {
  const SchemaViewWithBrowser = withBrowser(SchemaView);
  const user = userEvent.setup();

  const dialog = (schema, onClose) => (
    <SchemaViewWithBrowser
      formType='dialog'
      schema={schema}
      viewHelperProps={{mode: 'create'}}
      onSave={jest.fn(() => Promise.resolve())}
      onClose={onClose}
      onHelp={jest.fn()}
      onEdit={jest.fn()}
      onDataChange={jest.fn()}
      hasSQL={false}
      disableSqlHelp={true}
      disableDialogHelp={true}
    />
  );

  const renderDialog = async (onClose, onSave = jest.fn(() => Promise.resolve()), schema = new TestSchema()) => {
    let ctrl;
    await act(async () => {
      ctrl = render(
        <SchemaViewWithBrowser
          formType='dialog'
          schema={schema}
          viewHelperProps={{mode: 'create'}}
          onSave={onSave}
          onClose={onClose}
          onHelp={jest.fn()}
          onEdit={jest.fn()}
          onDataChange={jest.fn()}
          hasSQL={false}
          disableSqlHelp={true}
          disableDialogHelp={true}
        />
      );
    });
    return ctrl;
  };

  const pressEscape = async (ctrl) => {
    await act(async () => {
      fireEvent.keyDown(ctrl.container.firstChild, {key: 'Escape'});
    });
  };

  const pressCtrlEnter = async (ctrl) => {
    await act(async () => {
      fireEvent.keyDown(ctrl.container.firstChild, {key: 'Enter', ctrlKey: true});
    });
  };

  it('closes the dialog on Escape', async () => {
    const onClose = jest.fn();
    const ctrl = await renderDialog(onClose);

    await pressEscape(ctrl);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls the current onClose, not the one from the first render',
    async () => {
      const firstOnClose = jest.fn();
      const secondOnClose = jest.fn();
      // The same schema throughout: the memo deps are the schema id, the mode
      // and the reset key, so this is the case where nothing invalidates the
      // memo and only the callback has changed.
      const schema = new TestSchema();

      let ctrl;
      await act(async () => {
        ctrl = render(dialog(schema, firstOnClose));
      });

      // The parent re-renders with a new callback, as it does whenever it
      // defines onClose inline.
      await act(async () => {
        ctrl.rerender(dialog(schema, secondOnClose));
      });

      await pressEscape(ctrl);

      expect(secondOnClose).toHaveBeenCalled();
      expect(firstOnClose).not.toHaveBeenCalled();
    });

  // Ctrl/Cmd+Enter is meant to save and close in one step (issue #7167).
  // onSaveClick alone is not enough: it only calls onSave, so this covers the
  // dialog actually closing once that save resolves.
  it('saves and closes the dialog on Ctrl/Cmd+Enter', async () => {
    const onClose = jest.fn();
    const onSave = jest.fn(() => Promise.resolve());
    const ctrl = await renderDialog(onClose, onSave, new MinimalSchema());

    // Wait for the dialog's auto-focus to settle before typing, as the other
    // SchemaDialogView specs do.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    await user.type(ctrl.container.querySelector('[name="field1"]'), 'val1');

    await pressCtrlEnter(ctrl);

    expect(onSave).toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
