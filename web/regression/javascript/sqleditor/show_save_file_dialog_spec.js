/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// QueryToolComponent.jsx pulls in editors and viewers that this test never
// renders, and whose ESM-only dependencies Jest cannot load.
jest.mock('../../../pgadmin/static/js/components/ReactCodeMirror', () => ({
  __esModule: true,
  default: ({ value }) => value,
}));
jest.mock('../../../pgadmin/static/js/components/JsonEditor', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GeometryViewer', () => ({
  GeometryViewer: () => null,
}));
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/sections/GraphVisualiser', () => ({
  GraphVisualiser: () => null,
}));

import { showSaveFileDialog } from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';

describe('showSaveFileDialog', () => {
  const open = (onFile, onCancel) => {
    const show = jest.fn();
    showSaveFileDialog(show, {dialog_type: 'create_file'}, {id: 'modal'}, onFile, onCancel);
    return show.mock.calls[0];
  };

  it('keeps the tab when the file dialog is cancelled', () => {
    const onFile = jest.fn();
    const onCancel = jest.fn();
    const [, , cancel] = open(onFile, onCancel);

    cancel();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onFile).not.toHaveBeenCalled();
  });

  it('saves a chosen file and ignores the dialog close that follows it', () => {
    const onFile = jest.fn();
    const onCancel = jest.fn();
    const [, ok, cancel] = open(onFile, onCancel);

    ok('/tmp/query.sql');
    cancel();

    expect(onFile).toHaveBeenCalledWith('/tmp/query.sql');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
