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

import { render, screen, fireEvent } from '@testing-library/react';
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
      screen.getByText(/Describe what SQL you need/i)
    ).toBeInTheDocument();
  });

  it('should have input field for typing queries', () => {
    renderWithContexts(<ThemedNLQChatPanel />);
    const input = screen.getByPlaceholderText(/Describe the SQL you need/i);
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
    const input = screen.getByPlaceholderText(/Describe the SQL you need/i);

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
    const input = screen.getByPlaceholderText(/Describe the SQL you need/i);

    fireEvent.change(input, { target: { value: 'Find all users' } });
    expect(input.value).toBe('Find all users');

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    // Input should still have text (clear only clears messages)
    expect(input.value).toBe('Find all users');
  });
});
