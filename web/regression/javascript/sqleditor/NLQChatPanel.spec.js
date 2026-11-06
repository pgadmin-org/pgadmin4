/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Mock url_for
jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint) => `/mock/${endpoint}`),
}));

// Mock preferences store
jest.mock('../../../pgadmin/preferences/static/js/store', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getPreferencesForModule: jest.fn(() => ({})),
  })),
}));

// Mock the QueryToolComponent to avoid importing all its dependencies
jest.mock('../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx', () => {
  const React = require('react');
  return {
    QueryToolContext: React.createContext(null),
    QueryToolEventsContext: React.createContext(null),
  };
});

// Mock CodeMirror
jest.mock('../../../pgadmin/static/js/components/ReactCodeMirror', () => ({
  __esModule: true,
  default: ({ value }) => <pre data-testid="codemirror">{value}</pre>,
}));

// Mock EmptyPanelMessage
jest.mock('../../../pgadmin/static/js/components/EmptyPanelMessage', () => ({
  __esModule: true,
  default: ({ text }) => <div data-testid="empty-message">{text}</div>,
}));

// Mock Loader
jest.mock('sources/components/Loader', () => ({
  __esModule: true,
  default: () => <div data-testid="loader">Loading...</div>,
}));

// Make the placeholder messages predictable
jest.mock('../../../pgadmin/static/js/ai_thinking_messages', () => ({
  getRandomThinkingMessage: jest.fn(() => 'Placeholder elephant message'),
}));

import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { withTheme } from '../fake_theme';
import { NLQChatPanel } from '../../../pgadmin/tools/sqleditor/static/js/components/sections/NLQChatPanel.jsx';
import {
  QueryToolContext,
  QueryToolEventsContext,
} from '../../../pgadmin/tools/sqleditor/static/js/components/QueryToolComponent.jsx';

// Mock the EventBus
const createMockEventBus = () => ({
  fireEvent: jest.fn(),
  registerListener: jest.fn(),
});

// Mock the QueryToolContext
const createMockQueryToolCtx = (isQueryTool = true) => ({
  params: {
    trans_id: 12345,
    is_query_tool: isQueryTool,
  },
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
});

// Helper to render with contexts
const renderWithContexts = (component, { queryToolCtx, eventBus } = {}) => {
  const mockEventBus = eventBus || createMockEventBus();
  const mockQueryToolCtx = queryToolCtx || createMockQueryToolCtx();

  return render(
    <QueryToolContext.Provider value={mockQueryToolCtx}>
      <QueryToolEventsContext.Provider value={mockEventBus}>
        {component}
      </QueryToolEventsContext.Provider>
    </QueryToolContext.Provider>
  );
};

describe('NLQChatPanel Component', () => {
  let ThemedNLQChatPanel;

  beforeAll(() => {
    ThemedNLQChatPanel = withTheme(NLQChatPanel);

    // Mock fetch for SSE
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = renderWithContexts(<ThemedNLQChatPanel />);
    expect(container).toBeInTheDocument();
  });

  it('should show AI Assistant header', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('should show empty state message when no messages', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    expect(
      screen.getByText(/Describe the SQL you need/i)
    ).toBeInTheDocument();
  });

  it('should have input field for typing queries', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    const input = screen.getByPlaceholderText(
      /Ask a question or describe the SQL you need/i,
    );
    expect(input).toBeInTheDocument();
  });

  it('should have send button', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    const sendButton = screen.getByLabelText('Send');
    expect(sendButton).toBeInTheDocument();
  });

  it('should have clear conversation button', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    const { container } = renderWithContexts(<ThemedNLQChatPanel />);
    const sendButton = container.querySelector('button[data-label="Send"]');
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has text', () => {
    const { container } = renderWithContexts(<ThemedNLQChatPanel />);
    const input = screen.getByPlaceholderText(
      /Ask a question or describe the SQL you need/i,
    );

    fireEvent.change(input, { target: { value: 'Find all users' } });

    const sendButton = container.querySelector('button[data-label="Send"]');
    expect(sendButton).not.toBeDisabled();
  });

  it('should show message when not in query tool mode', () => {
    const mockQueryToolCtx = createMockQueryToolCtx(false);
    renderWithContexts(<ThemedNLQChatPanel />, {
      queryToolCtx: mockQueryToolCtx,
    });

    expect(
      screen.getByText(/AI Assistant is only available in Query Tool mode/i)
    ).toBeInTheDocument();
  });

  it('should clear input after typing and clicking clear', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    const input = screen.getByPlaceholderText(
      /Ask a question or describe the SQL you need/i,
    );

    fireEvent.change(input, { target: { value: 'Find all users' } });
    expect(input.value).toBe('Find all users');

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Input should still have text (clear only clears messages)
    expect(input.value).toBe('Find all users');
  });

  describe('streamed responses', () => {
    // Build a fetch mock whose response body yields SSE events one at a
    // time, under the test's control.
    const createStreamingFetch = () => {
      const encoder = new TextEncoder();
      const pending = [];
      const waiters = [];
      const reader = {
        read: () => new Promise((resolve) => {
          if (pending.length) {
            resolve(pending.shift());
          } else {
            waiters.push(resolve);
          }
        }),
        cancel: jest.fn(),
      };
      const push = (chunk) => {
        if (waiters.length) {
          waiters.shift()(chunk);
        } else {
          pending.push(chunk);
        }
      };
      return {
        fetchMock: jest.fn(() => Promise.resolve({
          ok: true,
          body: { getReader: () => reader },
        })),
        send: async (event) => {
          await act(async () => {
            push({
              done: false,
              value: encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            });
          });
        },
        end: async () => {
          await act(async () => {
            push({ done: true, value: undefined });
          });
        },
      };
    };

    const submit = async (text) => {
      const input = screen.getByPlaceholderText(
        /Ask a question or describe the SQL you need/i,
      );
      fireEvent.change(input, { target: { value: text } });
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });
    };

    let savedPgAdmin;

    beforeEach(() => {
      jest.useFakeTimers();
      savedPgAdmin = window.pgAdmin;
      window.pgAdmin = {
        ...savedPgAdmin,
        csrf_token_header: 'X-CSRFToken',
        csrf_token: 'test-token',
      };
    });

    afterEach(() => {
      jest.useRealTimers();
      window.pgAdmin = savedPgAdmin;
    });

    it('should keep intermediate text when the LLM goes on to use a tool', async () => {
      const stream = createStreamingFetch();
      global.fetch = stream.fetchMock;
      renderWithContexts(<ThemedNLQChatPanel />);

      await submit('How many users are there?');
      await stream.send({ type: 'thinking', message: 'Analyzing your request...' });
      await stream.send({ type: 'text_delta', content: 'Let me check the ' });
      await stream.send({ type: 'text_delta', content: 'users table.' });
      await stream.send({ type: 'thinking', message: 'Querying the database...' });

      expect(screen.getByText('Let me check the users table.')).toBeInTheDocument();
      expect(screen.getByText('Querying the database...')).toBeInTheDocument();

      await stream.send({ type: 'text_delta', content: 'There are 42 users.' });
      await stream.send({
        type: 'complete',
        content: 'There are 42 users.',
        sql: null,
        conversation_id: 'abc',
        history: [],
      });
      await stream.end();

      expect(screen.getByText('Let me check the users table.')).toBeInTheDocument();
      expect(screen.getByText('There are 42 users.')).toBeInTheDocument();
      expect(screen.queryByText('Querying the database...')).not.toBeInTheDocument();
    });

    it('should stop cycling placeholder messages once the LLM has produced text', async () => {
      const stream = createStreamingFetch();
      global.fetch = stream.fetchMock;
      renderWithContexts(<ThemedNLQChatPanel />);

      await submit('How many users are there?');
      // Before any LLM output, the placeholder messages are shown
      await act(async () => {
        jest.advanceTimersByTime(2500);
      });
      expect(screen.getByText('Placeholder elephant message')).toBeInTheDocument();

      await stream.send({ type: 'text_delta', content: 'Let me look.' });
      await stream.send({ type: 'thinking', message: 'Querying the database...' });
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.getByText('Querying the database...')).toBeInTheDocument();
      expect(screen.queryByText('Placeholder elephant message')).not.toBeInTheDocument();

      await stream.send({
        type: 'complete', content: 'Done.', sql: null, history: [],
      });
      await stream.end();
    });
  });
});
