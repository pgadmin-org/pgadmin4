/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import Theme from '../../../pgadmin/static/js/Theme';
import Uploader, { filesReducer, getFileSize, UploadedFile } from '../../../pgadmin/misc/file_manager/static/js/components/Uploader';
import { MESSAGE_TYPE } from '../../../pgadmin/static/js/components/FormComponents';

describe('GridView', ()=>{
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
  });

  describe('Uploader', ()=>{
    let fmUtilsObj = jasmine.createSpyObj('fmUtilsObj', ['uploadItem', 'deleteItem'], ['currPath']);
    let onClose = jasmine.createSpy('onClose');
    let ctrlMount = (props)=>{
      return mount(<Theme>
        <Uploader
          fmUtilsObj={fmUtilsObj}
          onClose={onClose}
          {...props}
        />
      </Theme>);
    };

    it('init', (done)=>{
      let ctrl = ctrlMount();
      setTimeout(()=>{
        ctrl.update();
        done();
      }, 0);
    });

    describe('filesReducer', ()=>{
      let state;

      beforeEach(()=>{
        state = [
          {
            id: 1,
            file: 'file1',
            progress: 0,
            started: false,
            failed: false,
            done: false,
          }
        ];
      });

      it('add', ()=>{
        let newState = filesReducer(state, {
          type: 'add',
          files: ['new1'],
        });
        expect(newState.length).toBe(2);
        expect(newState[0]).toEqual(jasmine.objectContaining({
          file: 'new1',
          progress: 0,
          started: false,
          failed: false,
          done: false,
        }));
      });


      it('started', ()=>{
        let newState = filesReducer(state, {
          type: 'started',
          id: 1,
        });
        expect(newState[0]).toEqual(jasmine.objectContaining({
          file: 'file1',
          progress: 0,
          started: true,
          failed: false,
          done: false,
        }));
      });

      it('started', ()=>{
        let newState = filesReducer(state, {
          type: 'progress',
          id: 1,
          value: 14,
        });
        expect(newState[0]).toEqual(jasmine.objectContaining({
          file: 'file1',
          progress: 14,
          started: false,
          failed: false,
          done: false,
        }));
      });

      it('failed', ()=>{
        let newState = filesReducer(state, {
          type: 'failed',
          id: 1,
        });
        expect(newState[0]).toEqual(jasmine.objectContaining({
          file: 'file1',
          progress: 0,
          started: false,
          failed: true,
          done: false,
        }));
      });

      it('done', ()=>{
        let newState = filesReducer(state, {
          type: 'done',
          id: 1,
        });
        expect(newState[0]).toEqual(jasmine.objectContaining({
          file: 'file1',
          progress: 0,
          started: false,
          failed: false,
          done: true,
        }));
      });

      it('remove', ()=>{
        let newState = filesReducer(state, {
          type: 'remove',
          id: 1,
        });
        expect(newState.length).toBe(0);
      });
    });

    it('getFileSize', ()=>{
      expect(getFileSize(1024)).toBe('1 KB');
    });

    describe('UploadedFile', ()=>{
      let upCtrlMount = (props)=>{
        return mount(<Theme>
          <UploadedFile
            deleteFile={()=>{/*dummy*/}}
            onClose={onClose}
            {...props}
          />
        </Theme>);
      };

      it('uploading', (done)=>{
        let ctrl = upCtrlMount({upfile: {
          file: {
            name: 'file1',
            size: '1KB',
          },
          done: false,
          failed: false,
          progress: 14,
        }});

        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('FormFooterMessage').props()).toEqual(jasmine.objectContaining({
            type: MESSAGE_TYPE.INFO,
            message: 'Uploading... 14%',
          }));
          done();
        }, 0);
      });

      it('done', (done)=>{
        let ctrl = upCtrlMount({upfile: {
          file: {
            name: 'file1',
            size: '1KB',
          },
          done: true,
          failed: false,
          progress: 14,
        }});

        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('FormFooterMessage').props()).toEqual(jasmine.objectContaining({
            type: MESSAGE_TYPE.SUCCESS,
            message: 'Uploaded!',
          }));
          done();
        }, 0);
      });

      it('failed', (done)=>{
        let ctrl = upCtrlMount({upfile: {
          file: {
            name: 'file1',
            size: '1KB',
          },
          done: false,
          failed: true,
          progress: 14,
        }});

        setTimeout(()=>{
          ctrl.update();
          expect(ctrl.find('FormFooterMessage').props()).toEqual(jasmine.objectContaining({
            type: MESSAGE_TYPE.ERROR,
            message: 'Failed!',
          }));
          done();
        }, 0);
      });
    });
  });
});
