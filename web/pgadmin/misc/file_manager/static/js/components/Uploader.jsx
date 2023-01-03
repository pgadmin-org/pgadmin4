/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useCallback, useReducer, useEffect, useMemo } from 'react';
import { Box, List, ListItem, makeStyles } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/CloseRounded';
import { PgIconButton } from '../../../../../static/js/components/Buttons';
import gettext from 'sources/gettext';
import {useDropzone} from 'react-dropzone';
import { FormFooterMessage, MESSAGE_TYPE } from '../../../../../static/js/components/FormComponents';
import convert from 'convert-units';
import _ from 'lodash';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme)=>({
  root: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: theme.palette.background.default,
    display: 'flex',
    flexDirection: 'column',
    padding: '4px',
  },
  uploadArea: {
    border: `1px dashed ${theme.palette.grey[600]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexDirection: 'column',
    cursor: 'move',
    textAlign: 'center',
    padding: '4px',
  },
  uploadFilesRoot: {
    width: '350px',
    border: `1px dashed ${theme.palette.grey[600]}`,
    borderLeft: 'none',
    overflowX: 'hidden',
    overflowY: 'auto'
  },
  uploadProgress: {
    position: 'unset',
    padding: 0,
  },
  uploadPending: {

  }
}));

export function filesReducer(state, action) {
  let newState = [...state];
  switch (action.type) {
  case 'add':
    newState.unshift(...action.files.map((file)=>({
      id: _.uniqueId('f'),
      file: file,
      progress: 0,
      started: false,
      failed: false,
      done: false,
      deleting: false,
    })));
    break;
  case 'started':
    _.find(newState, (f)=>f.id==action.id).started = true;
    break;
  case 'progress':
    _.find(newState, (f)=>f.id==action.id).progress = action.value;
    break;
  case 'failed':
    _.find(newState, (f)=>f.id==action.id).failed = true;
    break;
  case 'done':
    _.find(newState, (f)=>f.id==action.id).done = true;
    break;
  case 'remove':
    newState = newState.filter((f)=>f.id!=action.id) || [];
    break;
  default:
    break;
  }
  return newState;
}

export function getFileSize(bytes) {
  let conVal = convert(bytes).from('B').toBest();
  conVal.val = Math.round(conVal.val * 100) / 100;
  return `${conVal.val} ${conVal.unit}`;
}

export function UploadedFile({upfile, removeFile}) {
  let type = MESSAGE_TYPE.INFO;
  let message = `Uploading... ${upfile.progress?.toString() || ''}%`;
  if(upfile.done) {
    type = MESSAGE_TYPE.SUCCESS;
    message = 'Uploaded!';
  } else if(upfile.failed) {
    type = MESSAGE_TYPE.ERROR;
    message = 'Failed!';
  }

  return (
    <ListItem style={{cursor: 'auto'}}>
      <Box display="flex" alignItems="flex-start">
        <Box overflow="hidden" style={{overflowWrap: 'break-word'}} >{upfile.file.name}</Box>
        <Box marginLeft="auto">
          <PgIconButton title={gettext('Remove from list')} icon={<CloseIcon  />} size="xs" noBorder onClick={removeFile} />
        </Box>
      </Box>
      <span>{useMemo(()=>getFileSize(upfile.file.size), [])}</span>
      <FormFooterMessage type={type} message={message}
        closable={false} showIcon={false} textCenter={true} style={{position: 'unset', padding: '0px 0px 4px', fontSize: '0.9em'}} />
    </ListItem>
  );
}
UploadedFile.propTypes = {
  upfile: PropTypes.object,
  removeFile: PropTypes.func,
};


export default function Uploader({fmUtilsObj, onClose}) {
  const classes = useStyles();
  const [files, dispatchFileAction] = useReducer(filesReducer, []);
  const onDrop = useCallback(acceptedFiles => {
    dispatchFileAction({
      type: 'add',
      files: acceptedFiles,
    });
  }, []);
  const {getRootProps, getInputProps} = useDropzone({onDrop});

  useEffect(()=>{
    files.forEach(async (upfile)=>{
      if(!upfile.started && !upfile.failed) {
        try {
          dispatchFileAction({
            type: 'started',
            id: upfile.id,
          });
          await fmUtilsObj.uploadItem(upfile.file, (progressEvent)=>{
            const {loaded, total} = progressEvent;
            const percent = Math.floor((loaded * 100) / total);
            dispatchFileAction({
              type: 'progress',
              id: upfile.id,
              value: percent,
            });
          });
          dispatchFileAction({
            type: 'done',
            id: upfile.id,
          });
        } catch {
          dispatchFileAction({
            type: 'failed',
            id: upfile.id,
          });
        }
      }
    });
  }, [files.length]);

  return (
    <Box className={classes.root}>
      <Box display="flex" justifyContent="flex-end">
        <PgIconButton title={gettext('Close')} icon={<CloseIcon  />} size="xs" noBorder onClick={onClose} />
      </Box>
      <Box display="flex" flexGrow={1} overflow="hidden">
        <Box className={classes.uploadArea} {...getRootProps()}>
          <input {...getInputProps()} />
          <Box>{gettext('Drop files here, or click to select files.')}</Box>
          <Box>{gettext('The file size limit (per file) is %s MB.', fmUtilsObj.config?.upload?.fileSizeLimit)}</Box>
        </Box>
        {files.length > 0 &&
          <Box className={classes.uploadFilesRoot}>
            <List>
              {files.map((upfile)=>(
                <UploadedFile key={upfile.id} upfile={upfile} removeFile={async ()=>{
                  dispatchFileAction({
                    type: 'remove',
                    id: upfile.id,
                  });
                }}/>
              ))}
            </List>
          </Box>}
      </Box>
    </Box>
  );
}
Uploader.propTypes = {
  fmUtilsObj: PropTypes.object,
  onClose: PropTypes.func,
};
