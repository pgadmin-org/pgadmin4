/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React, { createContext, useMemo, useRef, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import {DividerBox} from 'rc-dock';

import url_for from 'sources/url_for';
import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';

import { Box } from '@mui/material';
import { Results } from './Results';
import { SchemaDiffCompare } from './SchemaDiffCompare';
import EventBus from '../../../../../static/js/helpers/EventBus';
import getApiInstance, { callFetch } from '../../../../../static/js/api_instance';
import { useModal } from '../../../../../static/js/helpers/ModalProvider';
import usePreferences from '../../../../../preferences/static/js/store';


export const SchemaDiffEventsContext = createContext();
export const SchemaDiffContext = createContext();

const StyledBox = styled(Box)(({theme}) => ({
  '& .SchemaDiff-resultPanel': {
    backgroundColor: theme.palette.default.main,
    zIndex: 5,
    border: '1px solid ' + theme.otherVars.borderColor,
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'hidden',
    height: 0,
  },
  '& .SchemaDiff-comparePanel': {
    overflow: 'hidden',
    border: '1px solid ' + theme.otherVars.borderColor,
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: 0,
  }
}));

export default function SchemaDiffComponent({params}) {
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

  const initializeSchemaDiff = ()=>{
    api.get(url_for('schema_diff.initialize', {
      'trans_id': params.transId})
    )
      .catch((err) => {
        pgAdmin.Browser.notifier.error(gettext(`Error in schema diff initialize ${err.response.data}`));
      });
  };

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

  useEffect(()=>{
    initializeSchemaDiff();
  }, []);

  return (
    <SchemaDiffContext.Provider value={schemaDiffContextValue}>
      <SchemaDiffEventsContext.Provider value={eventBus.current}>
        <StyledBox display="flex" flexDirection="column" flexGrow="1" height="100%" tabIndex="0" style={{minHeight: 80}}>
          <DividerBox mode='vertical' style={{flexGrow: 1}}>
            <div className='SchemaDiff-comparePanel' id="schema-diff-compare-container" ref={containerRef}><SchemaDiffCompare params={params} /></div>
            <div className='SchemaDiff-resultPanel' id="schema-diff-result-container">
              <Results />
            </div>
          </DividerBox>
        </StyledBox>
      </SchemaDiffEventsContext.Provider>
    </SchemaDiffContext.Provider>
  );
}

SchemaDiffComponent.propTypes = {
  params: PropTypes.object
};
