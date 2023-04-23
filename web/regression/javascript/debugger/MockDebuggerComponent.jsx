/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import PropTypes from 'prop-types';

import Theme from 'sources/Theme';
import {DebuggerContext, DebuggerEventsContext} from '../../../pgadmin/tools/debugger/static/js/components/DebuggerComponent';

export default function MockDebuggerComponent({value, eventsvalue, children}) {
  return (
    <Theme>
      <DebuggerContext.Provider value={value}>
        <DebuggerEventsContext.Provider value={eventsvalue}>
          {children}
        </DebuggerEventsContext.Provider>
      </DebuggerContext.Provider>
    </Theme>
  );
}

MockDebuggerComponent.propTypes = {
  value: PropTypes.any,
  eventsvalue: PropTypes.any,
  children: PropTypes.any
};
