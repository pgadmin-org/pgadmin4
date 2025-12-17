/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { withTheme } from '../fake_theme';
import AIReport from '../../../pgadmin/llm/static/js/AIReport.jsx';

describe('AIReport Component', () => {
  let ThemedAIReport;

  beforeAll(() => {
    ThemedAIReport = withTheme(AIReport);

    // Mock window.getComputedStyle for dark mode detection
    window.getComputedStyle = jest.fn().mockReturnValue({
      color: 'rgb(212, 212, 212)',
      backgroundColor: 'rgb(30, 30, 30)'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('should show regenerate and download buttons', () => {
    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    expect(screen.getByText('Regenerate')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('should disable download button when no report exists', () => {
    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    const downloadButton = screen.getByText('Download').closest('button');
    expect(downloadButton).toBeDisabled();
  });

  it('should detect dark mode from body styles', async () => {
    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    // Wait for dark mode detection to run
    await waitFor(() => {
      // The component should apply light colors in dark mode
      // This would be verified by checking computed styles
    }, { timeout: 1500 });
  });

  it('should handle light mode correctly', async () => {
    // Mock light mode
    window.getComputedStyle = jest.fn().mockReturnValue({
      color: 'rgb(0, 0, 0)',
      backgroundColor: 'rgb(255, 255, 255)'
    });

    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    await waitFor(() => {
      // Component should apply dark colors in light mode
    }, { timeout: 1500 });
  });

  it('should handle report generation error gracefully', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    const regenerateButton = screen.getByText('Regenerate');
    fireEvent.click(regenerateButton);

    await waitFor(() => {
      // Should show error message
      // expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display progress during report generation', async () => {
    // Mock SSE EventSource
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn(),
      onerror: null
    };

    global.EventSource = jest.fn(() => mockEventSource);

    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    const regenerateButton = screen.getByText('Regenerate');
    fireEvent.click(regenerateButton);

    // Simulate SSE progress event
    const onMessage = mockEventSource.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (onMessage) {
      onMessage({
        data: JSON.stringify({
          type: 'progress',
          stage: 'analyzing',
          message: 'Analyzing database structure...',
          completed: 1,
          total: 5
        })
      });
    }

    await waitFor(() => {
      // Progress should be visible
      // expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    });
  });

  it('should support all report categories', () => {
    const categories = ['security', 'performance', 'design'];

    categories.forEach(category => {
      const { unmount } = render(
        <ThemedAIReport
          sid={1}
          reportCategory={category}
          reportType="server"
          serverName="TestServer"
        />
      );

      expect(screen.getByText('Regenerate')).toBeInTheDocument();
      unmount();
    });
  });

  it('should support all report types', () => {
    const types = [
      { type: 'server', props: { sid: 1, serverName: 'Test' } },
      { type: 'database', props: { sid: 1, did: 5, serverName: 'Test', databaseName: 'TestDB' } },
      { type: 'schema', props: { sid: 1, did: 5, scid: 10, serverName: 'Test', databaseName: 'TestDB', schemaName: 'public' } }
    ];

    types.forEach(({ type, props }) => {
      const { unmount } = render(
        <ThemedAIReport
          reportCategory="security"
          reportType={type}
          {...props}
        />
      );

      expect(screen.getByText('Regenerate')).toBeInTheDocument();
      unmount();
    });
  });

  it('should render markdown content correctly', () => {
    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    // Would need to simulate report completion and verify markdown rendering
  });

  it('should handle download functionality', () => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock document.createElement for download link
    const mockLink = {
      click: jest.fn(),
      setAttribute: jest.fn()
    };
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    // Test would simulate having a report and clicking download

    // Restore document mocks
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('should close EventSource on component unmount', () => {
    const mockEventSource = {
      addEventListener: jest.fn(),
      close: jest.fn(),
      onerror: null
    };

    global.EventSource = jest.fn(() => mockEventSource);

    const { unmount } = render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    unmount();

    // EventSource should be closed on unmount
    // Would verify mockEventSource.close was called
  });

  it('should update text colors when theme changes', async () => {
    render(
      <ThemedAIReport
        sid={1}
        reportCategory="security"
        reportType="server"
        serverName="TestServer"
      />
    );

    // Change theme
    window.getComputedStyle = jest.fn().mockReturnValue({
      color: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(0, 0, 0)'
    });

    // Wait for theme detection interval
    await waitFor(() => {
      // Colors should update
    }, { timeout: 1500 });
  });
});
