/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { withTheme } from '../fake_theme';
import AIInsights from '../../../pgadmin/static/js/Explain/AIInsights';

// Mock url_for
jest.mock('sources/url_for', () => ({
  __esModule: true,
  default: jest.fn((endpoint) => `/mock/${endpoint}`),
}));

// Mock gettext
jest.mock('sources/gettext', () => ({
  __esModule: true,
  default: jest.fn((str) => str),
}));

// Mock the Loader component
jest.mock('../../../pgadmin/static/js/components/Loader', () => ({
  __esModule: true,
  default: () => <div data-testid="loader">Loading...</div>,
}));

// Mock EmptyPanelMessage
jest.mock('../../../pgadmin/static/js/components/EmptyPanelMessage', () => ({
  __esModule: true,
  default: ({ text }) => <div data-testid="empty-message">{text}</div>,
}));

describe('AIInsights Component', () => {
  let ThemedAIInsights;

  const mockPlans = [{
    Plan: {
      'Node Type': 'Seq Scan',
      'Relation Name': 'users',
      'Total Cost': 100.0,
      'Plan Rows': 1000,
    },
  }];

  beforeAll(() => {
    ThemedAIInsights = withTheme(AIInsights);

    // Mock fetch for SSE
    global.fetch = jest.fn();

    // Mock window.getComputedStyle
    window.getComputedStyle = jest.fn().mockReturnValue({
      color: 'rgb(0, 0, 0)',
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty message when no plans provided', () => {
    render(<ThemedAIInsights plans={null} isActive={true} />);
    expect(screen.getByTestId('empty-message')).toBeInTheDocument();
  });

  it('should show idle state with analyze button when plans provided but not active', () => {
    render(
      <ThemedAIInsights
        plans={mockPlans}
        sql="SELECT * FROM users"
        transId={12345}
        isActive={false}
      />
    );
    // Component should be in idle state when not active
    expect(screen.getByText('Analyze')).toBeInTheDocument();
    expect(screen.getByText(/Click Analyze to get AI-powered insights/i)).toBeInTheDocument();
  });

  it('should start analysis when tab becomes active', async () => {
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"thinking","message":"Analyzing..."}\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"complete","bottlenecks":[],"recommendations":[],"summary":"Plan looks good"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const { rerender } = render(
      <ThemedAIInsights
        plans={mockPlans}
        sql="SELECT * FROM users"
        transId={12345}
        isActive={false}
      />
    );

    // Rerender with isActive=true to trigger analysis
    rerender(
      <ThemedAIInsights
        plans={mockPlans}
        sql="SELECT * FROM users"
        transId={12345}
        isActive={true}
      />
    );

    // Wait for the analysis to complete
    await waitFor(() => {
      expect(screen.getByText('Plan looks good')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display bottlenecks when present', async () => {
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"complete","bottlenecks":[{"severity":"high","node":"Seq Scan on users","issue":"Sequential scan","details":"Consider index"}],"recommendations":[],"summary":"Found issues"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    render(
      <ThemedAIInsights
        plans={mockPlans}
        sql="SELECT * FROM users"
        transId={12345}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Performance Bottlenecks')).toBeInTheDocument();
      expect(screen.getByText('Seq Scan on users')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display recommendations with SQL when present', async () => {
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"type":"complete","bottlenecks":[],"recommendations":[{"priority":1,"title":"Create index on users","explanation":"Will help performance","sql":"CREATE INDEX idx ON users(id);"}],"summary":"Consider adding an index"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true }),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    render(
      <ThemedAIInsights
        plans={mockPlans}
        sql="SELECT * FROM users"
        transId={12345}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Create index on users')).toBeInTheDocument();
      expect(screen.getByText('CREATE INDEX idx ON users(id);')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show error state on failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <ThemedAIInsights
        plans={mockPlans}
        sql="SELECT * FROM users"
        transId={12345}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
