/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, fireEvent } from '@testing-library/react';

// Stub the heavy JSON editor so importing Editors does not pull in CodeMirror.
jest.mock('../../../pgadmin/static/js/components/JsonEditor', () => ({
  __esModule: true,
  default: () => <div data-testid="json-editor" />,
}));

// Mock the QueryToolDataGrid index so importing Editors does not pull in the
// whole data grid; Editors only needs RowInfoContext from it.
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid', () => {
  const ReactActual = require('react');
  return { RowInfoContext: ReactActual.createContext() };
});

import Theme from 'sources/Theme';
import { TextEditor } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/Editors';
import { RowInfoContext } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid';
import { PgAdminProvider } from '../../../pgadmin/static/js/PgAdminProvider';

describe('QueryToolDataGrid TextEditor read-only columns', () => {
  const KEY = 'the_name';
  let onRowChange, onClose;

  const renderEditor = (canEdit) => {
    const pgAdmin = { Browser: { notifier: { error: jest.fn() } } };
    return render(
      <Theme>
        <PgAdminProvider value={pgAdmin}>
          <RowInfoContext.Provider value={{ getCellElement: () => null }}>
            <TextEditor
              row={{ [KEY]: 'John Doe' }}
              column={{ key: KEY, idx: 0, can_edit: canEdit }}
              onRowChange={onRowChange}
              onClose={onClose}
            />
          </RowInfoContext.Provider>
        </PgAdminProvider>
      </Theme>
    );
  };

  const editAndPressEnter = () => {
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Jane Doe' } });
    fireEvent.keyDown(textarea, { keyCode: 13 });
  };

  beforeEach(() => {
    onRowChange = jest.fn();
    onClose = jest.fn();
  });

  it('hides the OK button on a read-only column', () => {
    renderEditor(false);
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('refuses the Enter-key commit on a read-only column (#10103)', () => {
    renderEditor(false);
    editAndPressEnter();
    expect(onRowChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it('still commits the Enter-key edit on an editable column', () => {
    renderEditor(true);
    editAndPressEnter();
    expect(onRowChange).toHaveBeenCalledWith({ [KEY]: 'Jane Doe' }, true);
  });
});
