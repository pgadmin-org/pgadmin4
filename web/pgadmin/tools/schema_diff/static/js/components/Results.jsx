/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';

import { styled } from '@mui/material/styles';

import React, { useContext, useState, useEffect } from 'react';

import { Box } from '@mui/material';
import { InputSQL } from '../../../../../static/js/components/FormComponents';
import { SchemaDiffEventsContext } from './SchemaDiffComponent';
import { SCHEMA_DIFF_EVENT } from '../SchemaDiffConstants';

const Root = styled('div')(({theme}) => ({
  height: '100%',
  display:'flex',
  flexDirection:'column',
  '& .Results-header': {
    padding: '0.5rem',
    borderBottom: '1px solid ' + theme.otherVars.borderColor,
  },
  '& .Results-labelContainer': {
    display: 'flex',
    flexDirection: 'row',
    '& .Results-label': {
      padding: '0.2rem 0.5rem',
      width: '33.33%'
    },
  },
  '& .Results-sqlContainer': {
    display: 'flex',
    flexDirection: 'row',
    padding: '0rem 0rem 0.5rem',
    flexGrow: 1,
    overflow: 'hidden',
    height: '100%',
    '& .Results-sqldata': {
      display: 'flex',
      flexGrow: 1,
      flexDirection: 'column',
      padding: '0.2rem 0.5rem',
      width: '33.33%',
      height: '100%',
      '& .Results-sqlInput': {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        height: '100%',
      }
    },
  },  
}));

export function Results() {

  const [sourceSQL, setSourceSQL] = useState(null);
  const [targetSQL, setTargetSQL] = useState(null);
  const [sqlDiff, setSqlDiff] = useState(null);

  const eventBus = useContext(SchemaDiffEventsContext);

  useEffect(() => {
    eventBus.registerListener(
      SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_RESULT_SQL, triggerUpdateResult);

  }, []);

  const triggerUpdateResult = (resultData) => {
    setSourceSQL(resultData.sourceSQL);
    setTargetSQL(resultData.targetSQL);
    setSqlDiff(resultData.SQLdiff);
  };

  return (
    (<Root>
      <Box className='Results-header'>
        <span>{gettext('DDL Comparision')}</span>
      </Box>
      <Box className='Results-labelContainer'>
        <Box className='Results-label'>{gettext('Source')}</Box>
        <Box className='Results-label'>{gettext('Target')}</Box>
        <Box className='Results-label'>{gettext('Difference')}</Box>
      </Box>
      <Box className='Results-sqlContainer'>
        <Box className='Results-sqldata'>
          <Box className='Results-sqlInput'>
            <InputSQL
              onLable={true}
              value={sourceSQL}
              options={{
                readOnly: true,
              }}
              readonly={true}
              width='100%'
            />
          </Box>
        </Box>
        <Box className='Results-sqldata'>
          <Box className='Results-sqlInput'>
            <InputSQL
              onLable={true}
              value={targetSQL}
              options={{
                readOnly: true,
              }}
              readonly={true}
              width='100%'
            />
          </Box>
        </Box>
        <Box className='Results-sqldata'>
          <Box className='Results-sqlInput'>
            <InputSQL
              onLable={true}
              value={sqlDiff}
              options={{
                readOnly: true,
              }}
              readonly={true}
              width='100%'
              controlProps={
                {
                  showCopyBtn: true
                }
              }
            />
          </Box>
        </Box>
      </Box>
    </Root>)
  );
}

Results.propTypes = {

};
