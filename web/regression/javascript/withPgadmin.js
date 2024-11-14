import React from 'react';
import { PgAdminContext } from '../../pgadmin/static/js/BrowserComponent';
import fakePgAdmin from './fake_pgadmin';

export default function withPgadmin(WrappedComp) {
  /* eslint-disable react/display-name */
  return (props)=>{
    return <PgAdminContext.Provider value={fakePgAdmin}>
      <WrappedComp {...props}/>
    </PgAdminContext.Provider>;
  };
}
