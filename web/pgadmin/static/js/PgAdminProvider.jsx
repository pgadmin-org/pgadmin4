/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import PropTypes from 'prop-types';
import EventBus from './helpers/EventBus';
import getApiInstance from './api_instance';
import url_for from 'sources/url_for';

const PgAdminContext = React.createContext();

export function usePgAdmin() {
  const pgAdmin = React.useContext(PgAdminContext);
  return pgAdmin;
}

export function PgAdminProvider({children, value}) {

  const eventBus = React.useRef(new EventBus());

  React.useEffect(()=>{
    eventBus.current.registerListener('SAVE_TOOL_DATA', (data) => {
      getApiInstance().post(
        url_for('settings.save_pgadmin_state'),
        JSON.stringify(data),
      ).catch((error)=>{console.error(error);});
    });
  }, []);

  return <PgAdminContext.Provider value={{pgAdminProviderEventBus: eventBus.current, ...value}}>
    {children}
  </PgAdminContext.Provider>;
}

PgAdminProvider.propTypes = {
  children: PropTypes.object,
  value: PropTypes.any
};
