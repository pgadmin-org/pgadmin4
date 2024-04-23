/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useState, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import { MESSAGE_TYPE, NotifierMessage } from '../../../../static/js/components/FormComponents';
import { BgProcessManagerProcessState } from './BgProcessConstants';
import { DefaultButton, PgIconButton } from '../../../../static/js/components/Buttons';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { useInterval } from '../../../../static/js/custom_hooks';
import getApiInstance from '../../../../static/js/api_instance';
import pgAdmin from 'sources/pgadmin';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';


const StyledBox = styled(Box)(({theme}) => ({
  backgroundColor: theme.palette.background.default,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: '8px',
  userSelect: 'text',
  '& .ProcessDetails-cmd': {
    ...theme.mixins.panelBorder.all,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.otherVars.inputDisabledBg,
    wordBreak: 'break-word',
    margin: '8px 0px',
    padding: '4px',
  },
  '& .ProcessDetails-terminateBtn': {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    border: 0,
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
      color: theme.palette.error.contrastText,
    },
    '&.Mui-disabled': {
      color: theme.palette.error.contrastText + ' !important',
      border: 0,
    }
  },
  '& .ProcessDetails-logs': {
    flexGrow: 1,
    borderRadius: theme.shape.borderRadius,
    padding: '4px',
    overflow: 'auto',
    textOverflow: 'wrap-text',
    margin: '8px 0px',
    ...theme.mixins.panelBorder.all,

    '& .ProcessDetails-logErr': {
      color: theme.palette.error.main,
    },
  },
}));

async function getDetailedStatus(api, jobId, out, err) {
  let res = await api.get(url_for(
    'bgprocess.detailed_status', {
      'pid': jobId,
      'out': out,
      'err': err,
    }
  ));
  return res.data;
}

export default function ProcessDetails({data}) {
  const api = useMemo(()=>getApiInstance());
  const [logs, setLogs] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [[outPos, errPos], setOutErrPos] = useState([0, 0]);
  const [exitCode, setExitCode] = useState(data.exit_code);
  const [timeTaken, setTimeTaken] = useState(data.execution_time);
  const [stopping, setStopping] = useState(false);

  let notifyType = MESSAGE_TYPE.INFO;
  let notifyText = gettext('Not started');

  let process_state = pgAdmin.Browser.BgProcessManager.evaluateProcessState({
    ...data,
    exit_code: exitCode,
  });

  if(process_state == BgProcessManagerProcessState.PROCESS_STARTED && stopping) {
    process_state = BgProcessManagerProcessState.PROCESS_TERMINATING;
  }
  if(process_state == BgProcessManagerProcessState.PROCESS_FAILED && stopping) {
    process_state = BgProcessManagerProcessState.PROCESS_TERMINATED;
  }

  if(process_state == BgProcessManagerProcessState.PROCESS_STARTED) {
    notifyText = gettext('Running...');
  } else if(process_state == BgProcessManagerProcessState.PROCESS_FINISHED) {
    notifyType = MESSAGE_TYPE.SUCCESS;
    notifyText = gettext('Successfully completed.');
  } else if(process_state == BgProcessManagerProcessState.PROCESS_FAILED) {
    notifyType = MESSAGE_TYPE.ERROR;
    notifyText = gettext('Failed (exit code: %s).', String(exitCode));
  } else if(process_state == BgProcessManagerProcessState.PROCESS_TERMINATED) {
    notifyType = MESSAGE_TYPE.ERROR;
    notifyText = gettext('Terminated by user.');
  } else if(process_state == BgProcessManagerProcessState.PROCESS_TERMINATING) {
    notifyText = gettext('Terminating the process...');
  }

  useInterval(async ()=>{
    const logsSortComp = (l1, l2)=>{
      return l1[0].localeCompare(l2[0]);
    };
    let resData = await getDetailedStatus(api, data.id, outPos, errPos);
    resData.out.lines.sort(logsSortComp);
    resData.err.lines.sort(logsSortComp);
    if(resData.out?.done && resData.err?.done && resData.exit_code != null) {
      setExitCode(resData.exit_code);
      setCompleted(true);
    }
    setTimeTaken(resData.execution_time);
    setOutErrPos([resData.out.pos, resData.err.pos]);
    setLogs((prevLogs)=>{
      return [
        ...(prevLogs || []),
        ...resData.out.lines.map((l)=>l[1]),
        ...resData.err.lines.map((l)=>l[1]),
      ];
    });

  }, completed ? -1 : 1000);

  const onStopProcess = ()=>{
    setStopping(true);
    pgAdmin.Browser.BgProcessManager.stopProcess(data.id);
  };

  const errRe = new RegExp(': (' + gettext('error') + '|' + gettext('fatal') + '):', 'i');
  return (
    <StyledBox display="flex" flexDirection="column" data-test="process-details">
      <Box data-test="process-message">{data.details?.message}</Box>
      {data.details?.cmd && <>
        <Box>{gettext('Running command')}:</Box>
        <Box data-test="process-cmd" className='ProcessDetails-cmd'>{data.details.cmd}</Box>
      </>}
      {data.details?.query && <>
        <Box>{gettext('Running query')}:</Box>
        <Box data-test="process-cmd" className='ProcessDetails-cmd'>{data.details.query}</Box>
      </>}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <Box><span><AccessTimeRoundedIcon /> {gettext('Start time')}: {new Date(data.stime).toString()}</span></Box>
        <Box>
          {pgAdmin.server_mode == 'True' && data.current_storage_dir &&
          <PgIconButton icon={<FolderSharedRoundedIcon />} title={gettext('Storage Manager')} onClick={()=>{
            pgAdmin.Tools.FileManager.openStorageManager(data.current_storage_dir);
          }} style={{marginRight: '4px'}} />}
          <DefaultButton disabled={process_state != BgProcessManagerProcessState.PROCESS_STARTED || data.server_id != null}
            startIcon={<HighlightOffRoundedIcon />} className='ProcessDetails-terminateBtn' onClick={onStopProcess}>
              Stop Process
          </DefaultButton>
        </Box>
      </Box>
      <Box flexGrow={1} className='ProcessDetails-logs'>
        {logs == null && <span data-test="loading-logs">{gettext('Loading process logs...')}</span>}
        {logs?.length == 0 && gettext('No logs available.')}
        {logs?.map((log, i)=>{
          let id = logs.length-i;
          return <div ref={(el)=>{
            if(i==logs.length-1) {
              el?.scrollIntoView();
            }
          }} key={id} className={errRe.test(log) ? 'ProcessDetails-logErr' : ''}>{log}</div>;
        })}
      </Box>
      <Box display="flex" alignItems="center">
        <NotifierMessage type={notifyType} message={notifyText} closable={false} textCenter={true} style={{flexGrow: 1, marginRight: '8px'}} />
        <Box>{gettext('Execution time')}: {timeTaken} {gettext('seconds')}</Box>
      </Box>
    </StyledBox>
  );
}

ProcessDetails.propTypes = {
  data: PropTypes.object,
};
