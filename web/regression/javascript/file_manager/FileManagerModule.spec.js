/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import FileManagerModule from '../../../pgadmin/misc/file_manager/static/js/FileManagerModule';

// The dialog component is not needed for the native path, and importing it
// here would create a circular import back to the module under test.
jest.mock('../../../pgadmin/misc/file_manager/static/js/components/FileManager', ()=>()=>null);

describe('FileManagerModule', ()=>{
  describe('showNative', ()=>{
    let fmModule;

    beforeEach(()=>{
      fmModule = new FileManagerModule({});
      window.electronUI = {
        showSaveDialog: jest.fn().mockResolvedValue({canceled: false, filePath: '/backups/db.backup'}),
        showOpenDialog: jest.fn().mockResolvedValue({canceled: false, filePaths: ['/diagrams/model.pgerd']}),
      };
    });

    afterEach(()=>{
      delete window.electronUI;
    });

    it('passes the purpose to the save dialog', async ()=>{
      const onOK = jest.fn();
      await fmModule.showNative({dialog_type: 'create_file', supported_types: ['backup'], purpose: 'backup'}, onOK);
      expect(window.electronUI.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({filters: [{name: 'BACKUP File .backup', extensions: ['backup']}]}),
        'backup',
      );
      expect(onOK).toHaveBeenCalledWith('/backups/db.backup');
    });

    it('passes the purpose to the open dialog', async ()=>{
      const onOK = jest.fn();
      await fmModule.showNative({dialog_type: 'select_file', supported_types: ['pgerd'], purpose: 'erd'}, onOK);
      expect(window.electronUI.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({properties: ['openFile']}),
        'erd',
      );
      expect(onOK).toHaveBeenCalledWith('/diagrams/model.pgerd');
    });

    it('passes the purpose to the folder dialog', async ()=>{
      await fmModule.showNative({dialog_type: 'select_folder', purpose: 'binary_path'});
      expect(window.electronUI.showOpenDialog).toHaveBeenCalledWith(
        expect.objectContaining({properties: ['openDirectory']}),
        'binary_path',
      );
    });

    it('passes no purpose when the caller does not give one', async ()=>{
      await fmModule.showNative({dialog_type: 'open_file'});
      expect(window.electronUI.showOpenDialog).toHaveBeenCalledWith(expect.any(Object), undefined);
    });

    it('calls onCancel when the dialog is cancelled', async ()=>{
      const onOK = jest.fn(), onCancel = jest.fn();
      window.electronUI.showSaveDialog.mockResolvedValue({canceled: true});
      await fmModule.showNative({dialog_type: 'create_file', purpose: 'query_tool'}, onOK, onCancel);
      expect(onCancel).toHaveBeenCalled();
      expect(onOK).not.toHaveBeenCalled();
    });
  });
});
