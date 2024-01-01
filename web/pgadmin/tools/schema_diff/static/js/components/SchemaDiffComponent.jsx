/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React, { createContext, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {DividerBox} from 'rc-dock';

import url_for from 'sources/url_for';

import { Box, makeStyles } from '@material-ui/core';

import { Results } from './Results';
import { SchemaDiffCompare } from './SchemaDiffCompare';
import EventBus from '../../../../../static/js/helpers/EventBus';
import getApiInstance, { callFetch } from '../../../../../static/js/api_instance';
import { useModal } from '../../../../../static/js/helpers/ModalProvider';
import usePreferences from '../../../../../preferences/static/js/store';

export const SchemaDiffEventsContext = createContext();
export const SchemaDiffContext = createContext();

const useStyles = makeStyles((theme) => ({
  resultPanle: {
    backgroundColor: theme.palette.default.main,
    zIndex: 5,
    border: '1px solid ' + theme.otherVars.borderColor,
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: 0,
    overflow: 'hidden',
  },
  comparePanel:{
    overflow: 'hidden',
    border: '1px solid ' + theme.otherVars.borderColor,
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: 0,
  }
}));

export default function SchemaDiffComponent({params}) {
  const classes = useStyles();
  const eventBus = useRef(new EventBus());
  const containerRef = React.useRef(null);
  const api = getApiInstance();
  const modal = useModal();
  const preferencesStore = usePreferences();

  const schemaDiffContextValue = useMemo(()=> ({
    api: api,
    modal: modal,
    preferences_schema_diff: preferencesStore.getPreferencesForModule('schema_diff'),
  }), []);

  registerUnload();

  function registerUnload() {
    window.addEventListener('unload', ()=>{
      /* Using fetch with keepalive as the browser may
      cancel the axios request on tab close. keepalive will
      make sure the request is completed */
      callFetch(
        url_for('schema_diff.close', {
          trans_id: params.transId
        }), {
          keepalive: true,
          method: 'DELETE',
        }
      )
        .then(()=>{/* Success */})
        .catch((err)=>console.error(err));
    });
  }

  return (
    <SchemaDiffContext.Provider value={schemaDiffContextValue}>
      <SchemaDiffEventsContext.Provider value={eventBus.current}>
        <Box display="flex" flexDirection="column" flexGrow="1" height="100%" tabIndex="0" style={{minHeight: 80}}>
          <DividerBox mode='vertical' style={{flexGrow: 1}}>
            <div className={classes.comparePanel} id="schema-diff-compare-container" ref={containerRef}><SchemaDiffCompare params={params} /></div>
            <div className={classes.resultPanle} id="schema-diff-result-container">
              <Results />
            </div>
          </DividerBox>
        </Box>
      </SchemaDiffEventsContext.Provider>
    </SchemaDiffContext.Provider>
  );
}

SchemaDiffComponent.propTypes = {
  params: PropTypes.object
};
