import React from 'react';
import { PgAdminProvider } from '../../pgadmin/static/js/PgAdminProvider';
import fakePgAdmin from './fake_pgadmin';

export default function withPgadmin(WrappedComp) {
  /* eslint-disable react/display-name */
  return (props)=>{
    return <PgAdminProvider value={fakePgAdmin}>
      <WrappedComp {...props}/>
    </PgAdminProvider>;
  };
}
