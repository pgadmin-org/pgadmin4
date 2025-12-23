/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useState, useEffect } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import PropTypes from 'prop-types';
import { marked } from 'marked';

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../static/js/api_instance';
import Loader from '../../../static/js/components/Loader';
import { PrimaryButton, DefaultButton } from '../../../static/js/components/Buttons';
import { usePgAdmin } from '../../../static/js/PgAdminProvider';

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
  '& .SecurityReport-header': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.default,
  },
  '& .SecurityReport-actions': {
    display: 'flex',
    gap: theme.spacing(1),
  },
  '& .SecurityReport-content': {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing(3),
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
  },
  '& .SecurityReport-paper': {
    width: '100%',
    maxWidth: '900px',
    minHeight: 'fit-content',
  },
  '& .SecurityReport-markdown': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    fontFamily: theme.typography.fontFamily,
    fontSize: '0.9rem',
    lineHeight: 1.6,
    padding: theme.spacing(4),
    boxShadow: theme.shadows[2],
    userSelect: 'text',
    cursor: 'text',
    '& h1': {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
      borderBottom: `1px solid ${theme.palette.divider}`,
      paddingBottom: theme.spacing(0.5),
    },
    '& h2': {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
    },
    '& h3': {
      fontSize: '1.1rem',
      fontWeight: 600,
      marginTop: theme.spacing(1.5),
      marginBottom: theme.spacing(0.5),
    },
    '& p': {
      marginTop: 0,
      marginBottom: theme.spacing(1.5),
    },
    '& ul, & ol': {
      marginTop: 0,
      marginBottom: theme.spacing(1.5),
      paddingLeft: theme.spacing(3),
    },
    '& ul ul, & ol ol, & ul ol, & ol ul': {
      marginBottom: 0,
    },
    '& li': {
      marginBottom: theme.spacing(0.5),
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
    },
    '& th': {
      backgroundColor: theme.palette.action.hover,
      fontWeight: 600,
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
  '& .SecurityReport-error': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.error.main,
    padding: theme.spacing(4),
    textAlign: 'center',
    width: '100%',
    maxWidth: '900px',
    boxShadow: theme.shadows[2],
  },
  '& .SecurityReport-placeholder': {
    ...theme.mixins.panelBorder.all,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.secondary,
    padding: theme.spacing(4),
    textAlign: 'center',
    width: '100%',
    maxWidth: '900px',
    boxShadow: theme.shadows[2],
  },
}));


export default function SecurityReport({
  sid, did, scid, reportType = 'server',
  serverName, databaseName, schemaName,
  onClose: _onClose
}) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pgAdmin = usePgAdmin();

  const api = getApiInstance();

  // Build the API URL based on report type
  const getReportUrl = () => {
    if (reportType === 'schema') {
      return url_for('llm.schema_security_report', { sid, did, scid });
    } else if (reportType === 'database') {
      return url_for('llm.database_security_report', { sid, did });
    } else {
      return url_for('llm.security_report', { sid });
    }
  };

  const generateReport = () => {
    setLoading(true);
    setError(null);
    setReport('');

    api.get(getReportUrl())
      .then((res) => {
        if (res.data && res.data.success) {
          setReport(res.data.data?.report || '');
        } else {
          setError(res.data?.errormsg || gettext('Failed to generate security report.'));
        }
      })
      .catch((err) => {
        let errMsg = gettext('Failed to generate security report.');
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
  };

  useEffect(() => {
    // Generate report on mount
    generateReport();
  }, [sid, did, scid, reportType]);

  // Build markdown header for the report
  const getReportHeader = () => {
    let title, subtitle;

    if (reportType === 'schema') {
      title = gettext('Schema Security Report') + ': ' + schemaName;
      subtitle = `${schemaName} ${gettext('in')} ${databaseName} ${gettext('on')} ${serverName}`;
    } else if (reportType === 'database') {
      title = gettext('Database Security Report') + ': ' + databaseName;
      subtitle = `${databaseName} ${gettext('on')} ${serverName}`;
    } else {
      title = gettext('Server Security Report') + ': ' + serverName;
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

    if (reportType === 'schema') {
      return `security-report-${sanitize(schemaName)}-${sanitize(databaseName)}-${sanitize(serverName)}-${date}.md`;
    } else if (reportType === 'database') {
      return `security-report-${sanitize(databaseName)}-${sanitize(serverName)}-${date}.md`;
    } else {
      return `security-report-${sanitize(serverName)}-${date}.md`;
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
      <Box className="SecurityReport-header">
        <Box className="SecurityReport-actions">
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

      <Box className="SecurityReport-content">
        <Loader message={loading ? gettext('Generating security report') : null} autoEllipsis />

        {error && !loading && (
          <Box className="SecurityReport-error">
            <Typography variant="body1">{error}</Typography>
            <DefaultButton onClick={generateReport} style={{ marginTop: '16px' }}>
              {gettext('Retry')}
            </DefaultButton>
          </Box>
        )}

        {!report && !loading && !error && (
          <Box className="SecurityReport-placeholder">
            <Typography variant="body1">
              {gettext('Click "Generate" to create a security report for this server.')}
            </Typography>
          </Box>
        )}

        {report && !loading && (
          <Box className="SecurityReport-paper">
            <Paper elevation={0} className="SecurityReport-markdown">
              <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </Paper>
          </Box>
        )}
      </Box>
    </StyledBox>
  );
}

SecurityReport.propTypes = {
  sid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  did: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  scid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  reportType: PropTypes.oneOf(['server', 'database', 'schema']),
  serverName: PropTypes.string.isRequired,
  databaseName: PropTypes.string,
  schemaName: PropTypes.string,
  onClose: PropTypes.func,
};
