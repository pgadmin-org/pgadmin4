/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ERDTool from '../../../pgadmin/tools/erd/static/js/erd_tool/components/ERDTool';

describe('ERDTool unnamed save during close', () => {
  const saveDiagram = (closeOnSave, show) => {
    const tool = Object.create(ERDTool.prototype);
    tool.closeOnSave = closeOnSave;
    tool.state = {current_file: null};
    tool.diagram = {getNodesData: () => [{id: 1}]};
    tool.saveFile = jest.fn();
    tool.context = {};
    tool.props = {
      panelId: 'erd-1',
      panelDocker: {retainTabInCloseQueue: jest.fn()},
      pgAdmin: {Tools: {FileManager: {show}}},
    };
    tool.onSaveDiagram(false, closeOnSave);
    return tool;
  };

  it('keeps the tab and advances the batch when the file dialog is canceled', () => {
    const show = jest.fn();
    const tool = saveDiagram(true, show);
    const onCancel = show.mock.calls[0][2];

    onCancel();

    expect(tool.props.panelDocker.retainTabInCloseQueue).toHaveBeenCalledWith('erd-1');
    expect(tool.closeOnSave).toBe(false);
    expect(tool.saveFile).not.toHaveBeenCalled();
  });

  it('saves a chosen file and ignores the dialog close that follows it', () => {
    const show = jest.fn();
    const tool = saveDiagram(true, show);
    const onOK = show.mock.calls[0][1];
    const onCancel = show.mock.calls[0][2];

    onOK('/tmp/diagram.pgerd');
    onCancel();

    expect(tool.saveFile).toHaveBeenCalledWith('/tmp/diagram.pgerd');
    expect(tool.props.panelDocker.retainTabInCloseQueue).not.toHaveBeenCalled();
    expect(tool.closeOnSave).toBe(true);
  });
});
