/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SchemaView from '../../../pgadmin/static/js/SchemaView';
import { withBrowser } from '../genericFunctions';

const ORIGINAL_SQL = 'BEGIN END;';

class SQLFieldSchema extends BaseUISchema {
  constructor() {
    super({
      sqlfield: ORIGINAL_SQL,
    });
  }

  get baseFields() {
    return [{
      id: 'sqlfield', label: 'SQL', type: 'sql', group: null,
      mode: ['create'],
    }];
  }
}

describe('SchemaDialogView', ()=>{
  const SchemaViewWithBrowser = withBrowser(SchemaView);

  describe('Reset with a pending SQL editor value', ()=>{
    let ctrl, editor;

    const typeAt = (pos, text)=>{
      editor.dispatch({
        changes: {from: pos, insert: text},
        selection: {anchor: pos + text.length},
        userEvent: 'input.type',
      });
    };

    const deleteAt = (from, to)=>{
      editor.dispatch({
        changes: {from: from, to: to},
        selection: {anchor: from},
        userEvent: 'delete.backward',
      });
    };

    const resetButton = ()=>ctrl.container.querySelector('[data-test="Reset"]');

    beforeEach(async ()=>{
      await act(async ()=>{
        ctrl = render(
          <SchemaViewWithBrowser
            formType='dialog'
            schema={new SQLFieldSchema()}
            viewHelperProps={{mode: 'create'}}
            onSave={jest.fn(()=>Promise.resolve())}
            onClose={jest.fn()}
            onHelp={jest.fn()}
            onDataChange={jest.fn()}
            confirmOnCloseReset={false}
            hasSQL={false}
            disableSqlHelp={true}
          />
        );
      });
      editor = EditorView.findFromDOM(
        ctrl.container.querySelector('.cm-editor')
      );
    });

    it('shows the original value when Reset is pressed before the edits round-trip', async ()=>{
      expect(editor.state.doc.toString()).toBe(ORIGINAL_SQL);

      // A first edit that SchemaView passes back to the field, which makes
      // the dialog dirty and enables Reset.
      act(()=>{
        typeAt(6, 'x');
      });
      await waitFor(()=>expect(resetButton()).not.toBeDisabled());

      // Remove that edit, type another key and press Reset, all before
      // SchemaView has passed any of these values back to the field. The
      // editor has reported the original value along the way, so without the
      // form being remounted on Reset, InputSQL would still have it waiting
      // to come back and would treat the restored original as stale.
      act(()=>{
        deleteAt(6, 7);
        typeAt(6, 'y');
        fireEvent.click(resetButton());
      });

      await waitFor(()=>expect(resetButton()).toBeDisabled());
      editor = EditorView.findFromDOM(
        ctrl.container.querySelector('.cm-editor')
      );
      expect(editor.state.doc.toString()).toBe(ORIGINAL_SQL);
    });
  });
});
