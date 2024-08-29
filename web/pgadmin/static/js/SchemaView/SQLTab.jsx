/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { InputSQL } from 'sources/components/FormComponents';


// Optional SQL tab.
export function SQLTab({active, getSQLValue}) {
  const [sql, setSql] = useState('Loading...');
  useEffect(() => {
    let unmounted = false;
    if(active) {
      setSql('Loading...');
      getSQLValue().then((value) => {
        if(!unmounted) {
          setSql(value);
        }
      });
    }
    return () => {unmounted=true;};
  }, [active]);

  return <InputSQL
    value={sql}
    options={{
      readOnly: true,
    }}
    readonly={true}
    className='FormView-sqlTabInput'
  />;
}

SQLTab.propTypes = {
  active: PropTypes.bool,
  getSQLValue: PropTypes.func.isRequired,
};
