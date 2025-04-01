/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useRef, useMemo } from 'react';
import PropTypes from 'prop-types';

import {DebuggerContext, DebuggerEventsContext} from '../../../pgadmin/tools/debugger/static/js/components/DebuggerComponent';
import { withBrowser } from '../genericFunctions';

function MockDebuggerComponent({value, eventsvalue, children}) {
  const containerRef = useRef();
  const valObj = useMemo(() => ({...value, containerRef: containerRef}), [value]);
  return (
    <DebuggerContext.Provider value={valObj}>
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
