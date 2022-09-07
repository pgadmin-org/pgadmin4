/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';

import React, { useContext, useState, useEffect } from 'react';

import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { InputSQL } from '../../../../../static/js/components/FormComponents';
import { SchemaDiffEventsContext } from './SchemaDiffComponent';
import { SCHEMA_DIFF_EVENT } from '../SchemaDiffConstants';


const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  table: {
    minWidth: 650,
  },
  summaryContainer: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
  },
  panelTitle: {
    borderBottom: '1px solid ' + theme.otherVars.borderColor,
    padding: '0.5rem',

  },
  editorStyle: {
    height: '100%'
  },
  editor: {
    height: '100%',
    padding: '0.5rem 0.2rem 2rem 0.5rem',
  },
  editorLabel: {
    padding: '0.3rem 0.6rem 0 0.6rem',
  },
  header: {
    padding: '0.5rem',
    borderBottom: '1px solid ' + theme.otherVars.borderColor,
  },
  sqlContainer: {
    display: 'flex',
    flexDirection: 'row',
    padding: '0rem 0rem 0.5rem',
    flexGrow: 1,
    overflow: 'hidden'
  },
  sqldata: {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    padding: '0.2rem 0.5rem',
    width: '33.33%',
  },
  label: {
    flexGrow: 1,
  }
}));

export function Results() {
  const classes = useStyles();
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
    <>
      <Box className={classes.header}>
        <span>{gettext('DDL Comparision')}</span>
      </Box>
      <Box className={classes.sqlContainer}>
        
        <Box className={classes.sqldata}> 
          <Box className={classes.label}>{gettext('Source')}</Box>
          <InputSQL
            onLable={true}
            value={sourceSQL}
            options={{
              readOnly: true,
            }}
            readonly={true}
          />
        </Box>
        <Box className={classes.sqldata}>
          <Box className={classes.label}>{gettext('Target')}</Box>
          <InputSQL
            onLable={true}
            value={targetSQL}
            options={{
              readOnly: true,
            }}
            readonly={true}
          />
        </Box>
        <Box className={classes.sqldata}>
          <Box className={classes.label}>{gettext('Difference')}</Box>
          <InputSQL
            onLable={true}
            value={sqlDiff}
            options={{
              readOnly: true,
            }}
            readonly={true}
          />
        </Box>
      </Box>
    </>
  );
}

Results.propTypes = {

};