/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, act } from '@testing-library/react';

import {
  LARGE_JSON_WARNING_LENGTH,
  shouldWarnForLargeJSON,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/json_editor_warning';

// Stub the heavy JSON editor so the wrapper can render without CodeMirror.
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
import { JsonTextEditor } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid/Editors';
import { RowInfoContext } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolDataGrid';
import { PgAdminProvider } from '../../../pgadmin/static/js/PgAdminProvider';

describe('QueryToolDataGrid json_editor_warning', () => {
  describe('shouldWarnForLargeJSON', () => {
    it('does not warn for small string values', () => {
      expect(shouldWarnForLargeJSON('{"a":1}')).toBe(false);
      expect(shouldWarnForLargeJSON('')).toBe(false);
    });

    it('warns once a string value exceeds the threshold (#9868)', () => {
      const big = 'x'.repeat(LARGE_JSON_WARNING_LENGTH + 1);
      expect(shouldWarnForLargeJSON(big)).toBe(true);
    });

    it('does not warn exactly at the threshold', () => {
      const atLimit = 'x'.repeat(LARGE_JSON_WARNING_LENGTH);
      expect(shouldWarnForLargeJSON(atLimit)).toBe(false);
    });

    it('respects a custom threshold', () => {
      expect(shouldWarnForLargeJSON('abcd', 3)).toBe(true);
      expect(shouldWarnForLargeJSON('abc', 3)).toBe(false);
    });

    it('does not warn for non-string values', () => {
      expect(shouldWarnForLargeJSON(null)).toBe(false);
      expect(shouldWarnForLargeJSON(undefined)).toBe(false);
      expect(shouldWarnForLargeJSON(12345)).toBe(false);
      expect(shouldWarnForLargeJSON([1, 2, 3])).toBe(false);
      expect(shouldWarnForLargeJSON({ a: 1 })).toBe(false);
    });
  });

  describe('JsonTextEditor large-value guard', () => {
    const KEY = 'col';
    let confirmArgs;
    let onClose;

    const renderEditor = (value) => {
      const column = { key: KEY, idx: 0, can_edit: true };
      const pgAdmin = {
        Browser: {
          notifier: {
            confirm: (title, text, onOk, onCancel) => {
              confirmArgs = { title, text, onOk, onCancel };
            },
            error: jest.fn(),
          },
        },
      };
      return render(
        <Theme>
          <PgAdminProvider value={pgAdmin}>
            <RowInfoContext.Provider value={{ getCellElement: () => null }}>
              <JsonTextEditor
                row={{ [KEY]: value }}
                column={column}
                onRowChange={jest.fn()}
                onClose={onClose}
              />
            </RowInfoContext.Provider>
          </PgAdminProvider>
        </Theme>
      );
    };

    beforeEach(() => {
      confirmArgs = undefined;
      onClose = jest.fn();
    });

    it('opens the editor immediately for small values without confirming', () => {
      renderEditor('{"a":1}');
      expect(confirmArgs).toBeUndefined();
      expect(screen.getByTestId('json-editor')).toBeInTheDocument();
    });

    it('warns for large values and waits before opening the editor', () => {
      renderEditor('x'.repeat(LARGE_JSON_WARNING_LENGTH + 1));
      expect(confirmArgs).toBeDefined();
      expect(screen.queryByTestId('json-editor')).not.toBeInTheDocument();
    });

    it('closes the editor when the warning is cancelled', () => {
      renderEditor('x'.repeat(LARGE_JSON_WARNING_LENGTH + 1));
      act(() => confirmArgs.onCancel());
      expect(onClose).toHaveBeenCalledWith(false);
    });

    it('opens the editor and does not close it when the user continues (#9868)', () => {
      renderEditor('x'.repeat(LARGE_JSON_WARNING_LENGTH + 1));
      // notifier.confirm() fires the cancel callback as well as the OK
      // callback when the user clicks OK; the guard must keep the editor open.
      act(() => {
        confirmArgs.onOk();
        confirmArgs.onCancel();
      });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('json-editor')).toBeInTheDocument();
    });
  });
});
