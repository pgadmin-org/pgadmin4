/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Paper, Typography, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PropTypes from 'prop-types';
import { marked } from 'marked';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../static/js/api_instance';
import Loader from '../../../static/js/components/Loader';
import { PrimaryButton, DefaultButton } from '../../../static/js/components/Buttons';
import { usePgAdmin } from '../../../static/js/PgAdminProvider';

// Helper to get the internal key for desktop mode authentication
// The key is passed as a URL parameter when pgAdmin launches in desktop mode
function getInternalKey() {
  // Try to get from current URL's query params
  const urlParams = new URLSearchParams(window.location.search);
  const key = urlParams.get('key');
  if (key) return key;

  // Try to get from cookie (if not HTTPOnly)
  const cookieValue = `; ${document.cookie}`;
  const parts = cookieValue.split('; PGADMIN_INT_KEY=');
  if (parts.length === 2) return parts.pop().split(';').shift();

  return null;
}

// Configure marked for security and rendering
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown
  breaks: true,     // Convert \n to <br>
});


const StyledBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: theme.palette.grey[400],
  '& .AIReport-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
  },
  '& .AIReport-actions': {
    display: 'flex',
    gap: theme.spacing(1),
  },
  '& .AIReport-content': {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(3),
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
  },
  '& .AIReport-paper': {
    width: '100%',
    maxWidth: '900px',
    minHeight: 'fit-content',
  },
  '& .AIReport-markdown': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.9rem',
    lineHeight: 1.6,
    padding: theme.spacing(4),
    boxShadow: theme.shadows[2],
    userSelect: 'text',
    cursor: 'text',
    // Ensure all elements inherit the text color for dark mode support
    '& *': {
      color: 'inherit',
    },
    '& a': {
      color: theme.palette.primary.main,
    },
    '& h1': {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
      borderBottom: `1px solid ${theme.palette.divider}`,
      paddingBottom: theme.spacing(0.5),
      color: theme.palette.text.primary,
    },
    '& h1:first-of-type': {
      marginTop: 0,
    },
    '& h2': {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
      color: theme.palette.text.primary,
    },
    '& h3': {
      fontSize: '1.1rem',
      fontWeight: 600,
      marginTop: theme.spacing(1.5),
      marginBottom: theme.spacing(0.5),
      color: theme.palette.text.primary,
    },
    '& p': {
      marginTop: 0,
      marginBottom: theme.spacing(1.5),
      color: theme.palette.text.primary,
    },
    '& ul, & ol': {
      marginTop: 0,
      marginBottom: theme.spacing(1.5),
      paddingLeft: theme.spacing(3),
      color: theme.palette.text.primary,
    },
    '& ul ul, & ol ol, & ul ol, & ol ul': {
      marginBottom: 0,
    },
    '& li': {
      marginBottom: theme.spacing(0.5),
      color: theme.palette.text.primary,
      '& > p': {
        marginBottom: theme.spacing(0.5),
      },
    },
    '& li > ul, & li > ol': {
      marginTop: theme.spacing(0.5),
    },
    // Task list checkboxes (GitHub style)
    '& input[type="checkbox"]': {
      marginRight: theme.spacing(0.5),
    },
    '& code': {
      backgroundColor: theme.palette.action.hover,
      padding: '2px 6px',
      borderRadius: '3px',
      fontFamily: 'monospace',
      fontSize: '0.85em',
    },
    '& pre': {
      backgroundColor: theme.palette.action.hover,
      padding: theme.spacing(1.5),
      borderRadius: '4px',
      overflow: 'auto',
      '& code': {
        backgroundColor: 'transparent',
        padding: 0,
      },
    },
    '& blockquote': {
      borderLeft: `4px solid ${theme.palette.primary.main}`,
      margin: theme.spacing(1.5, 0),
      padding: theme.spacing(1, 2),
      backgroundColor: theme.palette.action.hover,
      '& p:last-child': {
        marginBottom: 0,
      },
    },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      marginBottom: theme.spacing(1.5),
      display: 'block',
      overflowX: 'auto',
    },
    '& thead': {
      display: 'table',
      width: '100%',
      tableLayout: 'fixed',
    },
    '& tbody': {
      display: 'table',
      width: '100%',
      tableLayout: 'fixed',
    },
    '& tr': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '& th, & td': {
      border: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1, 1.5),
      textAlign: 'left',
      verticalAlign: 'top',
      color: theme.palette.text.primary,
    },
    '& th': {
      backgroundColor: theme.palette.action.hover,
      fontWeight: 600,
      color: theme.palette.text.primary,
    },
    '& tbody tr:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '& hr': {
      border: 'none',
      borderTop: `1px solid ${theme.palette.divider}`,
      margin: theme.spacing(2, 0),
    },
    '& strong': {
      fontWeight: 600,
    },
    '& em': {
      fontStyle: 'italic',
    },
  },
  '& .AIReport-error': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.error.main,
    padding: theme.spacing(4),
    textAlign: 'center',
    width: '100%',
    maxWidth: '900px',
    boxShadow: theme.shadows[2],
    userSelect: 'text',
    cursor: 'text',
  },
  '& .AIReport-placeholder': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.secondary,
    padding: theme.spacing(4),
    textAlign: 'center',
    width: '100%',
    maxWidth: '900px',
    boxShadow: theme.shadows[2],
  },
  '& .AIReport-progress': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(4),
    width: '100%',
    maxWidth: '900px',
    boxShadow: theme.shadows[2],
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  '& .AIReport-progress-bar': {
    width: '100%',
    maxWidth: '400px',
  },
}));

// Report category configurations
const REPORT_CONFIGS = {
  security: {
    endpoints: {
      server: 'llm.security_report',
      database: 'llm.database_security_report',
      schema: 'llm.schema_security_report',
    },
    streamEndpoints: {
      server: 'llm.security_report_stream',
      database: 'llm.database_security_report_stream',
      schema: 'llm.schema_security_report_stream',
    },
    titles: {
      server: () => gettext('Server Security Report'),
      database: () => gettext('Database Security Report'),
      schema: () => gettext('Schema Security Report'),
    },
    loadingMessage: () => gettext('Generating security report'),
    filePrefix: 'security-report',
  },
  performance: {
    endpoints: {
      server: 'llm.performance_report',
      database: 'llm.database_performance_report',
    },
    streamEndpoints: {
      server: 'llm.performance_report_stream',
      database: 'llm.database_performance_report_stream',
    },
    titles: {
      server: () => gettext('Server Performance Report'),
      database: () => gettext('Database Performance Report'),
    },
    loadingMessage: () => gettext('Generating performance report'),
    filePrefix: 'performance-report',
  },
  design: {
    endpoints: {
      database: 'llm.database_design_report',
      schema: 'llm.schema_design_report',
    },
    streamEndpoints: {
      database: 'llm.database_design_report_stream',
      schema: 'llm.schema_design_report_stream',
    },
    titles: {
      database: () => gettext('Database Design Review'),
      schema: () => gettext('Schema Design Review'),
    },
    loadingMessage: () => gettext('Generating design review'),
    filePrefix: 'design-review',
  },
};

// Stage display names
const STAGE_NAMES = {
  planning: () => gettext('Planning Analysis'),
  gathering: () => gettext('Gathering Data'),
  analyzing: () => gettext('Analyzing Sections'),
  synthesizing: () => gettext('Creating Report'),
};


export default function AIReport({
  sid, did, scid, reportCategory = 'security', reportType = 'server',
  serverName, databaseName, schemaName,
  onClose: _onClose
}) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stopped, setStopped] = useState(false);
  const pgAdmin = usePgAdmin();
  const eventSourceRef = useRef(null);
  const stoppedRef = useRef(false);

  // Get text colors from the body element to match pgAdmin's theme
  // The MUI theme may not be synced with pgAdmin's theme in docker tabs
  const [textColors, setTextColors] = useState({
    primary: 'inherit',
    secondary: 'inherit',
  });

  useEffect(() => {
    const updateColors = () => {
      const bodyStyles = window.getComputedStyle(document.body);
      const primaryColor = bodyStyles.color;

      // For secondary color, create a semi-transparent version of the primary
      // by parsing the RGB values and adding opacity
      const rgbMatch = primaryColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      let secondaryColor = primaryColor;
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        secondaryColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
      }

      setTextColors({
        primary: primaryColor,
        secondary: secondaryColor,
      });
    };

    updateColors();

    // Check periodically in case theme changes
    const interval = setInterval(updateColors, 1000);
    return () => clearInterval(interval);
  }, []);

  const api = getApiInstance();
  const config = REPORT_CONFIGS[reportCategory];

  // Build the API URL based on report category and type
  const getReportUrl = useCallback((useStream = false) => {
    const endpoints = useStream ? config.streamEndpoints : config.endpoints;
    const endpoint = endpoints?.[reportType];
    if (!endpoint) {
      console.error(`No endpoint for ${reportCategory}/${reportType}`);
      return null;
    }

    if (reportType === 'schema') {
      return url_for(endpoint, { sid, did, scid });
    } else if (reportType === 'database') {
      return url_for(endpoint, { sid, did });
    } else {
      return url_for(endpoint, { sid });
    }
  }, [config, reportType, reportCategory, sid, did, scid]);

  // Close any existing EventSource connection
  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Stop the current report generation
  const stopReport = useCallback(() => {
    stoppedRef.current = true;
    closeEventSource();
    setLoading(false);
    setProgress(null);
    setStopped(true);
    setError(null);
  }, [closeEventSource]);

  // Fallback to non-streaming API call
  const generateReportFallback = useCallback(() => {
    const url = getReportUrl(false);
    if (!url) {
      setError(gettext('Invalid report configuration.'));
      return;
    }

    stoppedRef.current = false;
    setStopped(false);
    setLoading(true);
    setError(null);
    setReport('');
    setProgress(null);

    api.get(url)
      .then((res) => {
        if (res.data && res.data.success) {
          setReport(res.data.data?.report || '');
        } else {
          setError(res.data?.errormsg || gettext('Failed to generate report.'));
        }
      })
      .catch((err) => {
        let errMsg = gettext('Failed to generate report.');
        if (err.response?.data?.errormsg) {
          errMsg = err.response.data.errormsg;
        } else if (err.message) {
          errMsg = err.message;
        }
        setError(errMsg);
        pgAdmin.Browser.notifier.error(errMsg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [getReportUrl, api, pgAdmin]);

  // Generate report using SSE streaming
  const generateReportStream = useCallback(() => {
    let url = getReportUrl(true);
    if (!url) {
      setError(gettext('Invalid report configuration.'));
      return;
    }

    // In desktop mode, add the internal key to the URL for authentication
    const internalKey = getInternalKey();
    if (internalKey) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}key=${encodeURIComponent(internalKey)}`;
    }

    closeEventSource();
    stoppedRef.current = false;
    setStopped(false);
    setLoading(true);
    setError(null);
    setReport('');
    setProgress({ stage: 'planning', message: gettext('Starting...') });

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'stage') {
          setProgress({
            stage: data.stage,
            message: data.message,
            completed: 0,
            total: 0,
          });
        } else if (data.type === 'progress') {
          setProgress((prev) => ({
            ...prev,
            stage: data.stage,
            message: data.message,
            section: data.section,
            completed: data.completed || 0,
            total: data.total || 0,
          }));
        } else if (data.type === 'retry') {
          setProgress((prev) => ({
            ...prev,
            message: data.message,
            retrying: true,
          }));
        } else if (data.type === 'complete') {
          setReport(data.report || '');
          setLoading(false);
          setProgress(null);
          closeEventSource();
        } else if (data.type === 'error') {
          setError(data.message || gettext('Failed to generate report.'));
          setLoading(false);
          setProgress(null);
          closeEventSource();
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    // Track error count to detect persistent failures (like 401)
    let errorCount = 0;

    eventSource.onerror = () => {
      errorCount++;

      // If we get multiple errors quickly (like 401 retries), fall back immediately
      if (errorCount >= 2) {
        console.warn('SSE connection failed repeatedly, falling back to non-streaming');
        closeEventSource();
        generateReportFallback();
        return;
      }

      // If the connection is closed, fall back
      if (eventSource.readyState === EventSource.CLOSED) {
        closeEventSource();
        generateReportFallback();
      }
    };
  }, [getReportUrl, closeEventSource, generateReportFallback]);

  // Main generate function - tries streaming first
  const generateReport = useCallback(() => {
    // Check if streaming endpoints are available
    const streamUrl = getReportUrl(true);
    if (streamUrl) {
      generateReportStream();
    } else {
      generateReportFallback();
    }
  }, [getReportUrl, generateReportStream, generateReportFallback]);

  useEffect(() => {
    // Generate report on mount
    generateReport();

    // Cleanup on unmount
    return () => {
      closeEventSource();
    };
  }, [sid, did, scid, reportCategory, reportType]);

  // Build markdown header for the report
  const getReportHeader = () => {
    const titleFn = config.titles[reportType];
    let title = titleFn ? titleFn() : gettext('Report');
    let subtitle;

    if (reportType === 'schema') {
      title += ': ' + schemaName;
      subtitle = `${schemaName} ${gettext('in')} ${databaseName} ${gettext('on')} ${serverName}`;
    } else if (reportType === 'database') {
      title += ': ' + databaseName;
      subtitle = `${databaseName} ${gettext('on')} ${serverName}`;
    } else {
      title += ': ' + serverName;
      subtitle = serverName;
    }

    const date = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `# ${title}\n\n*${subtitle} • ${date}*\n\n---\n\n`;
  };

  // Build filename for download based on report type
  const getDownloadFilename = () => {
    const date = new Date().toISOString().slice(0, 10);
    const sanitize = (str) => str ? str.replace(/[^a-z0-9]/gi, '_') : '';
    const prefix = config.filePrefix;

    if (reportType === 'schema') {
      return `${prefix}-${sanitize(schemaName)}-${sanitize(databaseName)}-${sanitize(serverName)}-${date}.md`;
    } else if (reportType === 'database') {
      return `${prefix}-${sanitize(databaseName)}-${sanitize(serverName)}-${date}.md`;
    } else {
      return `${prefix}-${sanitize(serverName)}-${date}.md`;
    }
  };

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([getReportHeader() + report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getDownloadFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reportHtml = report ? marked.parse(getReportHeader() + report) : '';

  return (
    <StyledBox>
      <Box className="AIReport-header">
        <Box className="AIReport-actions">
          <DefaultButton
            onClick={stopReport}
            disabled={!loading}
            startIcon={<StopIcon />}
          >
            {gettext('Stop')}
          </DefaultButton>
          <DefaultButton
            onClick={generateReport}
            disabled={loading}
            startIcon={<RefreshIcon />}
          >
            {gettext('Regenerate')}
          </DefaultButton>
          <PrimaryButton
            onClick={handleDownload}
            disabled={!report || loading}
            startIcon={<DownloadIcon />}
          >
            {gettext('Download')}
          </PrimaryButton>
        </Box>
      </Box>

      <Box className="AIReport-content">
        {/* Progress display during streaming */}
        {loading && progress && (
          <Box className="AIReport-progress">
            <Typography
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                marginBottom: '8px',
                color: textColors.primary,
              }}>
              {STAGE_NAMES[progress.stage]?.() || progress.stage}
            </Typography>
            <Typography
              style={{
                fontSize: '0.875rem',
                color: textColors.secondary,
              }}>
              {progress.message}
            </Typography>
            {progress.total > 0 && (
              <Box className="AIReport-progress-bar">
                <LinearProgress
                  variant="determinate"
                  value={(progress.completed / progress.total) * 100}
                />
                <Typography
                  variant="caption"
                  style={{
                    marginTop: '4px',
                    display: 'block',
                    textAlign: 'center',
                    color: textColors.secondary
                  }}>
                  {progress.completed} / {progress.total}
                </Typography>
              </Box>
            )}
            {!progress.total && (
              <Box className="AIReport-progress-bar">
                <LinearProgress variant="indeterminate" />
              </Box>
            )}
          </Box>
        )}

        {/* Fallback loader when not using streaming */}
        {loading && !progress && (
          <Loader message={config.loadingMessage()} autoEllipsis />
        )}

        {error && !loading && (
          <Box className="AIReport-error">
            <Typography variant="body1">{error}</Typography>
            <DefaultButton onClick={generateReport} style={{ marginTop: '16px' }}>
              {gettext('Retry')}
            </DefaultButton>
          </Box>
        )}

        {stopped && !loading && !error && (
          <Box
            className="AIReport-placeholder"
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1">
              {gettext('Report generation was cancelled.')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {gettext('Click Regenerate to start a new report.')}
            </Typography>
          </Box>
        )}

        {!report && !loading && !error && !stopped && (
          <Box className="AIReport-placeholder">
            <Typography variant="body1">
              {gettext('Generating report...')}
            </Typography>
          </Box>
        )}

        {report && !loading && (
          <Box className="AIReport-paper">
            <Paper
              elevation={0}
              className="AIReport-markdown"
              sx={(theme) => ({
                color: `${theme.palette.text.primary} !important`,
                '& *': {
                  color: 'inherit !important'
                }
              })}
            >
              <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </Paper>
          </Box>
        )}
      </Box>
    </StyledBox>
  );
}

AIReport.propTypes = {
  sid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  did: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  scid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  reportCategory: PropTypes.oneOf(['security', 'performance', 'design']),
  reportType: PropTypes.oneOf(['server', 'database', 'schema']),
  serverName: PropTypes.string.isRequired,
  databaseName: PropTypes.string,
  schemaName: PropTypes.string,
  onClose: PropTypes.func,
};
