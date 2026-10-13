/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, act } from '@testing-library/react';

import EventBus from '../../../pgadmin/static/js/helpers/EventBus';
import { DebuggerEventsContext } from '../../../pgadmin/tools/debugger/static/js/components/DebuggerComponent';
import DebuggerMessages from '../../../pgadmin/tools/debugger/static/js/components/DebuggerMessages';
import { DEBUGGER_EVENTS } from '../../../pgadmin/tools/debugger/static/js/DebuggerConstants';


describe('Debugger Messages', () => {
  let eventBus;

  const renderMessages = () => {
    eventBus = new EventBus();
    const ctrl = render(
      <DebuggerEventsContext.Provider value={eventBus}>
        <DebuggerMessages />
      </DebuggerEventsContext.Provider>
    );
    return ctrl.container.querySelector('#debugger-msg');
  };

  it('puts each appended batch of messages on a new line', async () => {
    const msgDiv = renderMessages();
    await act(async () => {
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, 'NOTICE:  first', true);
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, 'NOTICE:  second', true);
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, 'NOTICE:  third\n', true);
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, 'NOTICE:  fourth', true);
    });
    expect(msgDiv.textContent).toBe(
      'NOTICE:  first\nNOTICE:  second\nNOTICE:  third\nNOTICE:  fourth'
    );
  });

  it('replaces the messages when not appending', async () => {
    const msgDiv = renderMessages();
    await act(async () => {
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, 'NOTICE:  old', true);
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_MESSAGES, 'NOTICE:  new');
    });
    expect(msgDiv.textContent).toBe('NOTICE:  new');
  });
});
