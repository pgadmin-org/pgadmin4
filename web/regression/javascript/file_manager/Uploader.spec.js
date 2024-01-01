/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import Theme from '../../../pgadmin/static/js/Theme';
import Uploader, { filesReducer, getFileSize, UploadedFile } from '../../../pgadmin/misc/file_manager/static/js/components/Uploader';

describe('GridView', ()=>{


  describe('Uploader', ()=>{
    let fmUtilsObj = {
      'uploadItem': jest.fn(),
      'deleteItem': jest.fn(),
      'currPath': ''
    };
    let onClose = jest.fn();
    let ctrlMount = (props)=>{
      return render(<Theme>
        <Uploader
          fmUtilsObj={fmUtilsObj}
          onClose={onClose}
          {...props}
        />
      </Theme>);
    };

    it('init', ()=>{
      ctrlMount();
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
        expect(newState[0]).toEqual(expect.objectContaining({
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
        expect(newState[0]).toEqual(expect.objectContaining({
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
        expect(newState[0]).toEqual(expect.objectContaining({
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
        expect(newState[0]).toEqual(expect.objectContaining({
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
        expect(newState[0]).toEqual(expect.objectContaining({
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
        return render(<Theme>
          <UploadedFile
            deleteFile={()=>{/*dummy*/}}
            onClose={onClose}
            {...props}
          />
        </Theme>);
      };

      it('uploading', async ()=>{
        upCtrlMount({upfile: {
          file: {
            name: 'file1',
            size: '1KB',
          },
          done: false,
          failed: false,
          progress: 14,
        }});

        await waitFor(()=>{
          expect(screen.getByText('Uploading... 14%')).toBeInTheDocument();
        });
      });

      it('done', async ()=>{
        upCtrlMount({upfile: {
          file: {
            name: 'file1',
            size: '1KB',
          },
          done: true,
          failed: false,
          progress: 14,
        }});

        await waitFor(()=>{
          expect(screen.getByText('Uploaded!')).toBeInTheDocument();
        });
      });

      it('failed', async ()=>{
        upCtrlMount({upfile: {
          file: {
            name: 'file1',
            size: '1KB',
          },
          done: false,
          failed: true,
          progress: 14,
        }});

        await waitFor(()=>{
          expect(screen.getByText('Failed!')).toBeInTheDocument();
        });
      });
    });
  });
});
