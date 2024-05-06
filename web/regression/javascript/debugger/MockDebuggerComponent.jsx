/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useRef } from 'react';
import PropTypes from 'prop-types';

import {DebuggerContext, DebuggerEventsContext} from '../../../pgadmin/tools/debugger/static/js/components/DebuggerComponent';
import { withBrowser } from '../genericFunctions';

function MockDebuggerComponent({value, eventsvalue, children}) {
  const containerRef = useRef();
  return (
    <DebuggerContext.Provider value={{...value, containerRef: containerRef}}>
      <DebuggerEventsContext.Provider value={eventsvalue}>
        <div ref={containerRef} style={{width: '100%', height: '100%'}}>
          {children}
        </div>
      </DebuggerEventsContext.Provider>
    </DebuggerContext.Provider>
  );
}

export default withBrowser(MockDebuggerComponent);

MockDebuggerComponent.propTypes = {
  value: PropTypes.any,
  eventsvalue: PropTypes.any,
  children: PropTypes.any
};
