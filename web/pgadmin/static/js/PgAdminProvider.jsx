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

const PgAdminContext = React.createContext();

export function usePgAdmin() {
  const pgAdmin = React.useContext(PgAdminContext);
  return pgAdmin;
}

export function PgAdminProvider({children, value}) {

  return <PgAdminContext.Provider value={value}>
    {children}
  </PgAdminContext.Provider>;
}

PgAdminProvider.propTypes = {
  children: PropTypes.object,
  value: PropTypes.any
};
