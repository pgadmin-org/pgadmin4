/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render } from '@testing-library/react';
import Theme from '../../../pgadmin/static/js/Theme';
import FileManager, { FileManagerUtils, getComparator } from '../../../pgadmin/misc/file_manager/static/js/components/FileManager';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import getApiInstance from '../../../pgadmin/static/js/api_instance';
import * as pgUtils from '../../../pgadmin/static/js/utils';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

const files = [
  {
    'Filename': 'file1.sql',
    'Path': '/home/file1',
    'file_type': 'sql',
    'Protected': 0,
    'Properties': {
      'Date Created': 'Fri Oct 22 16:59:24 2021',
      'Date Modified': 'Tue Oct 12 14:08:00 2021',
      'Size': '1.4 MB'
    }
  },
  {
    'Filename': 'folder1',
    'Path': '/home/folder1',
    'file_type': 'dir',
    'Protected': 0,
    'Properties': {
      'Date Created': 'Fri Oct 22 16:59:24 2021',
      'Date Modified': 'Tue Oct 12 14:08:00 2021',
      'Size': '1.4 MB'
    }
  }
];
const transId = 140391;
const configData = {
  'transId': transId,
  'options': {
    'culture': 'en',
    'lang': 'py',
    'defaultViewMode':'list',
    'autoload': true,
    'showFullPath': false,
    'dialog_type': 'select_folder',
    'show_hidden_files': false,
    'fileRoot': '/home/current',
    'capabilities': [
      'select_folder', 'select_file', 'download',
      'rename', 'delete', 'upload', 'create'
    ],
    'allowed_file_types': [
      '*',
      'sql',
      'backup'
    ],
    'platform_type': 'darwin',
    'show_volumes': true,
    'homedir': '/home/',
    'last_selected_format': '*',
    'storage_folder': ''
  },
  'security': {
    'uploadPolicy': '',
    'uploadRestrictions': [
      '*',
      'sql',
      'backup'
    ]
  },
  'upload': {
    'multiple': true,
    'number': 20,
    'fileSizeLimit': 50,
    'imagesOnly': false
  }
};

const sharedStorageConfig = ['Shared Storage'];
const restrictedSharedStorage = [];

const params={
  dialog_type: 'select_file',
};

describe('FileManger', ()=>{

  let networkMock;

  beforeAll(()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onPost(`/file_manager/filemanager/${transId}/`).reply(200, {data: {result: files}});
    networkMock.onPost(`/file_manager/save_file_dialog_view/${transId}`).reply(200, {});
    networkMock.onDelete(`/file_manager/delete_trans_id/${transId}`).reply(200, {});
  });

  afterAll(() => {
    networkMock.restore();
  });

  beforeEach(()=>{

  });

  describe('FileManger', ()=>{
    let closeModal=jest.fn(),
      onOK=jest.fn(),
      onCancel=jest.fn(),
      ctrlMount = async (props)=>{
        return await render(<Theme>
          <FileManager
            params={params}
            closeModal={closeModal}
            onOK={onOK}
            onCancel={onCancel}
            sharedStorages={sharedStorageConfig}
            restrictedSharedStorage={restrictedSharedStorage}
            {...props}
          />
        </Theme>);
      };

    it('init', async ()=>{
      networkMock.onPost('/file_manager/init').reply(200, {'data': configData});
      networkMock.onPost(`/file_manager/save_last_dir/${transId}`).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':null});
      let ctrl;
      await act(async ()=>{
        ctrl = await ctrlMount({});
      });
      const user = userEvent.setup();
      await user.click(ctrl.container.querySelector('[name="menu-options"]'));
      await user.click(ctrl.container.querySelector('[data-label="List View"]'));

      expect(ctrl.container.querySelector('[id="list"]')).not.toBeNull();
      expect(ctrl.container.querySelector('[id="grid"]')).toBeNull();
      expect(ctrl.container.querySelector('[data-label="file-path"] input')).toHaveValue('/home/current');

      await user.click(ctrl.container.querySelector('button[name="menu-options"]'));
      await user.click(ctrl.container.querySelector('[data-label="Grid View"]'));
      expect(ctrl.container.querySelector('[id="list"]')).toBeNull();
      expect(ctrl.container.querySelector('[id="grid"]')).not.toBeNull();
    });

    it('Change Shared Storage', async ()=>{
      networkMock.onPost('/file_manager/init').reply(200, {'data': configData});
      networkMock.onPost(`/file_manager/save_last_dir/${transId}`).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':null});
      let ctrl;
      const user = userEvent.setup();
      await act(async ()=>{
        ctrl = await ctrlMount({});
      });

      await user.click(ctrl.container.querySelector('[name="menu-shared-storage"]'));
      await user.click(ctrl.container.querySelector('[data-label="Shared Storage"]'));
      expect(ctrl.container.querySelector('button[aria-label="Shared Storage"]')).not.toBeNull();
    });

    it('Change Storage to My Storage', async ()=>{
      networkMock.onPost('/file_manager/init').reply(200, {'data': configData});
      networkMock.onPost(`/file_manager/save_last_dir/${transId}`).reply(200, {'success':1,'errormsg':'','info':'','result':null,'data':null});
      let ctrl;
      const user = userEvent.setup();
      await act(async ()=>{
        ctrl = await ctrlMount({});
      });

      await user.click(ctrl.container.querySelector('[name="menu-shared-storage"]'));
      await user.click(ctrl.container.querySelector('[data-label="My Storage"]'));
      expect(ctrl.container.querySelector('button[aria-label="My Storage"]')).not.toBeNull();
    });

    describe('getComparator', ()=>{
      it('Filename', ()=>{
        expect(getComparator({columnKey: 'Filename', direction: 'ASC'})({Filename:'a'}, {Filename:'b'})).toBe(-1);
        expect(getComparator({columnKey: 'Filename', direction: 'DESC'})({Filename:'a'}, {Filename:'b'})).toBe(1);
        expect(getComparator({columnKey: 'Filename', direction: 'ASC'})({Filename:'a'}, {Filename:'A'})).toBe(-1);
      });

      it('Properties.DateModified', ()=>{
        expect(getComparator({columnKey: 'Properties.DateModified', direction: 'ASC'})(
          {Properties:{'Date Modified':'Tue Feb 25 11:36:28 2020'}}, {Properties:{'Date Modified':'Tue Feb 26 11:36:28 2020'}})
        ).toBe(-1);
        expect(getComparator({columnKey: 'Properties.DateModified', direction: 'DESC'})(
          {Properties:{'Date Modified':'Tue Feb 25 11:36:28 2020'}}, {Properties:{'Date Modified':'Tue Feb 26 11:36:28 2020'}})
        ).toBe(1);
        expect(getComparator({columnKey: 'Properties.DateModified', direction: 'ASC'})(
          {Properties:{'Date Modified':'Tue Feb 25 11:36:28 2020'}}, {Properties:{'Date Modified':'Tue Feb 25 11:36:28 2020'}})
        ).toBe(0);
      });

      it('Properties.Size', ()=>{
        expect(getComparator({columnKey: 'Properties.Size', direction: 'ASC'})(
          {Properties:{'Size':'1 KB'}}, {Properties:{'Size':'1 MB'}})
        ).toBe(-1);
        expect(getComparator({columnKey: 'Properties.Size', direction: 'DESC'})(
          {Properties:{'Size':'1 MB'}}, {Properties:{'Size':'1 GB'}})
        ).toBe(1);
        expect(getComparator({columnKey: 'Properties.Size', direction: 'ASC'})(
          {Properties:{'Size':'1 MB'}}, {Properties:{'Size':'1 MB'}})
        ).toBe(0);
      });
    });
  });
});

describe('FileManagerUtils', ()=>{
  let api, fmObj, networkMock;
  beforeEach(()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onDelete(`/file_manager/delete_trans_id/${transId}`).reply(200, {});
    networkMock.onPost(`/file_manager/filemanager/${transId}/`).reply((config)=>{
      let retVal = {};
      let apiData = JSON.parse(config.data);
      let headers = {};
      if(apiData.mode == 'addfolder') {
        retVal = {data: {result: {
          Name: apiData.name,
          Path: '/home/'+apiData.name,
          'Date Modified': 'Tue Feb 25 11:36:28 2020',
        }}};
      } else if(apiData.mode == 'rename') {
        retVal = {data: {result: {
          'New Path': '/home/'+apiData.new,
          'New Name': apiData.new,
        }}};
      } else if(apiData.mode == 'download') {
        retVal = 'blobdata';
        headers = {filename: 'newfile1'};
      } else if(apiData.mode == 'is_file_exist') {
        retVal = {data: {result: {Code: 1}}};
      }
      return [200, retVal, headers];
    });

    api = getApiInstance();
    fmObj = new FileManagerUtils(api, params);
    fmObj.config = configData;
  });

  afterEach(()=>{
    networkMock.restore();
  });

  it('showHiddenFiles', ()=>{
    expect(fmObj.showHiddenFiles).toBe(false);
    networkMock.onPut(`/file_manager/save_show_hidden_file_option/${transId}`).reply(200, {});
    fmObj.showHiddenFiles = true;
    expect(fmObj.config.options?.show_hidden_files).toBe(true);
  });

  it('setLastVisitedDir', async ()=>{
    let calledPath = null;
    networkMock.onPost(`/file_manager/save_last_dir/${transId}`).reply((config)=>{
      calledPath = JSON.parse(config.data).path;
      return [200, {}];
    });
    await fmObj.setLastVisitedDir('/home/xyz');
    expect(calledPath).toBe('/home/xyz');
  });

  it('setDialogView', async ()=>{
    networkMock.onPost(`/file_manager/save_file_dialog_view/${transId}`).reply(200, {});
    await fmObj.setDialogView('grid');
    expect(fmObj.config.options.defaultViewMode).toBe('grid');
  });

  it('setFileType', async ()=>{
    networkMock.onPost('/settings/save_file_format_setting/').reply(200, {});
    await fmObj.setFileType('pgerd');
    expect(fmObj.config.options.last_selected_format).toBe('pgerd');
  });

  it('join', ()=>{
    expect(fmObj.join('/dir1/dir2', 'file1')).toBe('/dir1/dir2/file1');
    expect(fmObj.join('/dir1/dir2/', 'file1')).toBe('/dir1/dir2/file1');
  });

  it('addFolder', async ()=>{
    let res = await fmObj.addFolder({Filename: 'newfolder', 'storage_folder': 'my_storage'});
    expect(res).toEqual({
      Filename: 'newfolder',
      Path: '/home/newfolder',
      file_type: 'dir',
      Properties: {
        'Date Modified': 'Tue Feb 25 11:36:28 2020',
      }
    });
  });

  it('rename', async ()=>{
    let row = {Filename: 'newfolder1', Path: '/home/newfolder'};
    let res = await fmObj.renameItem(row);
    expect(res).toEqual({
      Filename: 'newfolder1',
      Path: '/home/newfolder1',
    });
  });

  it('deleteItem', async ()=>{
    let row = {Filename: 'newfolder', Path: '/home/newfolder'};
    let path = await fmObj.deleteItem(row, '');
    expect(path).toBe('/home/newfolder');

    path = await fmObj.deleteItem(row, '', 'file1');
    expect(path).toBe('/home/newfolder/file1');
  });

  it('checkPermission', async ()=>{
    networkMock.reset();
    networkMock.onPost(`/file_manager/filemanager/${transId}/`).reply(200, {
      data: {
        result: {
          Code: 1,
        }
      }
    });
    let res = await fmObj.checkPermission('/home/newfolder');
    expect(res).toEqual(null);

    networkMock.onPost(`/file_manager/filemanager/${transId}/`).reply(200, {
      data: {
        result: {
          Code: 0,
          Error: 'file error'
        }
      }
    });
    res = await fmObj.checkPermission('/home/newfolder');
    expect(res).toEqual('file error');
  });

  it('isFileExists', async ()=>{
    let res = await fmObj.isFileExists('/home/newfolder', 'newfile1');
    expect(res).toBe(true);
  });

  it('downloadFile', async ()=>{
    jest.spyOn(pgUtils, 'downloadBlob').mockImplementation(() => {});
    let row = {Filename: 'newfile1', Path: '/home/newfile1', 'storage_folder': 'my_storage'};
    await fmObj.downloadFile(row);
    expect(pgUtils.downloadBlob).toHaveBeenCalledWith('blobdata', 'newfile1');
  });
});
