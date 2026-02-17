/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { useState, useEffect, useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../api_instance';
import Loader from '../components/Loader';
import EmptyPanelMessage from '../components/EmptyPanelMessage';
import { DefaultButton, PrimaryButton } from '../components/Buttons';

const StyledContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const ContentArea = styled(Box)({
  flex: 1,
  overflow: 'auto',
  padding: '16px',
  userSelect: 'text',
  cursor: 'auto',
});

const Section = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
}));

const BottleneckItem = styled(Box)(({ theme, severity }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  borderLeft: `4px solid ${
    severity === 'high'
      ? theme.palette.error.main
      : severity === 'medium'
        ? theme.palette.warning.main
        : theme.palette.info.main
  }`,
  '&:last-child': {
    marginBottom: 0,
  },
}));

const RecommendationItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  '&:last-child': {
    marginBottom: 0,
  },
}));

const SQLBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.action.hover,
  borderRadius: theme.shape.borderRadius,
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  border: `1px solid ${theme.palette.text.disabled}`,
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  justifyContent: 'flex-end',
}));

const LoadingContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  gap: '16px',
});

// PostgreSQL/Elephant themed thinking messages
const THINKING_MESSAGES = [
  gettext('Analyzing query plan...'),
  gettext('Examining node costs...'),
  gettext('Looking for sequential scans...'),
  gettext('Checking index usage...'),
  gettext('Evaluating join strategies...'),
  gettext('Identifying bottlenecks...'),
  gettext('Calculating row estimates...'),
  gettext('Reviewing execution times...'),
];

function getRandomThinkingMessage() {
  return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
}

function getSeverityIcon(severity) {
  switch (severity) {
  case 'high':
    return <ErrorOutlineIcon color="error" />;
  case 'medium':
    return <WarningAmberIcon color="warning" />;
  default:
    return <InfoOutlinedIcon color="info" />;
  }
}

function BottleneckCard({ bottleneck, textColors }) {
  return (
    <BottleneckItem severity={bottleneck.severity}>
      <Box sx={{ flexShrink: 0, pt: 0.25 }}>
        {getSeverityIcon(bottleneck.severity)}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {bottleneck.node}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {bottleneck.issue}
        </Typography>
        {bottleneck.details && (
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: textColors.secondary, fontSize: '0.85rem' }}
          >
            {bottleneck.details}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0 }}>
        <Chip
          label={bottleneck.severity}
          size="small"
          color={
            bottleneck.severity === 'high'
              ? 'error'
              : bottleneck.severity === 'medium'
                ? 'warning'
                : 'info'
          }
          variant="outlined"
        />
      </Box>
    </BottleneckItem>
  );
}

BottleneckCard.propTypes = {
  bottleneck: PropTypes.shape({
    severity: PropTypes.string,
    node: PropTypes.string,
    issue: PropTypes.string,
    details: PropTypes.string,
  }).isRequired,
  textColors: PropTypes.object,
};

function RecommendationCard({ recommendation, onInsertSQL, onCopySQL, textColors }) {
  return (
    <RecommendationItem>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '0.75rem',
          }}
        >
          {recommendation.priority}
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {recommendation.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: textColors.secondary }}
          >
            {recommendation.explanation}
          </Typography>
          {recommendation.sql && (
            <>
              <SQLBox>{recommendation.sql}</SQLBox>
              <ActionButtons>
                <Tooltip title={gettext('Copy to clipboard')}>
                  <IconButton
                    size="small"
                    onClick={() => onCopySQL(recommendation.sql)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={gettext('Insert into editor')}>
                  <IconButton
                    size="small"
                    onClick={() => onInsertSQL(recommendation.sql)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ActionButtons>
            </>
          )}
        </Box>
      </Box>
    </RecommendationItem>
  );
}

RecommendationCard.propTypes = {
  recommendation: PropTypes.shape({
    priority: PropTypes.number,
    title: PropTypes.string,
    explanation: PropTypes.string,
    sql: PropTypes.string,
  }).isRequired,
  onInsertSQL: PropTypes.func.isRequired,
  onCopySQL: PropTypes.func.isRequired,
  textColors: PropTypes.object,
};

export default function AIInsights({
  plans,
  sql,
  transId,
  onInsertSQL,
  isActive,
}) {
  const [analysisState, setAnalysisState] = useState('idle'); // idle | loading | complete | error
  const [bottlenecks, setBottlenecks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [thinkingMessage, setThinkingMessage] = useState(
    getRandomThinkingMessage()
  );
  const [textColors, setTextColors] = useState({
    primary: 'inherit',
    secondary: 'inherit',
  });
  const [llmInfo, setLlmInfo] = useState({ provider: null, model: null });

  // Track if we've analyzed the current plan
  const analyzedPlanRef = useRef(null);
  const prevPlansRef = useRef(null);
  const abortControllerRef = useRef(null);
  const readerRef = useRef(null);
  const stoppedRef = useRef(false);

  // Detect new EXPLAIN runs by tracking plan object reference
  // This ensures re-analysis even when plan content is identical
  useEffect(() => {
    if (plans !== prevPlansRef.current) {
      prevPlansRef.current = plans;
      if (plans) {
        // New plans received (new EXPLAIN run), allow re-analysis
        analyzedPlanRef.current = null;
      }
    }
  }, [plans]);

  // Stop the current analysis
  const stopAnalysis = useCallback(() => {
    // Mark as stopped so the read loop knows not to set complete state
    stoppedRef.current = true;
    // Mark current plan as handled to prevent auto-restart
    // (user can still click Regenerate, or run a new EXPLAIN)
    analyzedPlanRef.current = plans;
    // Cancel the active reader first (this actually stops the streaming)
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    // Then abort the fetch controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAnalysisState('stopped');
    setErrorMessage('');
  }, [plans]);

  // Fetch LLM provider/model info
  const fetchLlmInfo = useCallback(async () => {
    try {
      const api = getApiInstance();
      const res = await api.get(url_for('llm.status'));
      if (res.data?.success && res.data?.data) {
        setLlmInfo({
          provider: res.data.data.provider,
          model: res.data.data.model
        });
      }
    } catch {
      // LLM status not available - ignore
    }
  }, []);

  // Fetch LLM info on mount
  useEffect(() => {
    fetchLlmInfo();
  }, [fetchLlmInfo]);

  // Update text colors from body styles for theme compatibility
  useEffect(() => {
    const bodyStyles = window.getComputedStyle(document.body);
    const primaryColor = bodyStyles.color;

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
  }, []);

  // Cycle through thinking messages while loading
  useEffect(() => {
    if (analysisState !== 'loading') return;

    const interval = setInterval(() => {
      setThinkingMessage(getRandomThinkingMessage());
    }, 2000);

    return () => clearInterval(interval);
  }, [analysisState]);

  const runAnalysis = useCallback(async () => {
    if (!plans || !transId) return;

    // Reset stopped flag
    stoppedRef.current = false;

    // Fetch latest LLM provider/model info before running analysis
    fetchLlmInfo();

    setAnalysisState('loading');
    setBottlenecks([]);
    setRecommendations([]);
    setSummary('');
    setErrorMessage('');
    setThinkingMessage(getRandomThinkingMessage());

    // Create abort controller with 5 minute timeout for complex plans
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    try {
      const response = await fetch(
        url_for('sqleditor.explain_analyze_stream', { trans_id: transId }),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan: plans,
            sql: sql || '',
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      abortControllerRef.current = null;

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errormsg || 'Analysis request failed');
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      let receivedComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event);
              if (event.type === 'complete' || event.type === 'error') {
                receivedComplete = true;
              }
            } catch (parseErr) {
              // Log parse errors for debugging
              console.warn('Failed to parse SSE event:', line, parseErr);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        const remainingLines = buffer.split('\n');
        for (const line of remainingLines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event);
              if (event.type === 'complete' || event.type === 'error') {
                receivedComplete = true;
              }
            } catch {
              // Ignore remaining parse errors
            }
          }
        }
      }

      readerRef.current = null;

      // Don't change state if user manually stopped
      if (stoppedRef.current) {
        return;
      }

      // Fallback: if stream ended without complete/error event, set to complete
      if (!receivedComplete) {
        console.warn('SSE stream ended without complete event');
        setAnalysisState('complete');
      }

      analyzedPlanRef.current = plans;
    } catch (err) {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      readerRef.current = null;
      // Don't show error if user manually stopped
      if (err.name === 'AbortError') {
        // Check if this was a user-initiated stop (state already set to idle)
        // or a timeout (state still loading)
        setAnalysisState((current) => {
          if (current === 'loading') {
            setErrorMessage('Analysis timed out. The plan may be too complex for the AI model.');
            return 'error';
          }
          return current; // Keep idle state if user stopped
        });
      } else {
        setAnalysisState('error');
        setErrorMessage(err.message || 'Failed to analyze plan');
      }
    }
  }, [plans, sql, transId, fetchLlmInfo]);

  const handleSSEEvent = (event) => {
    switch (event.type) {
    case 'thinking':
      setThinkingMessage(event.message || getRandomThinkingMessage());
      break;

    case 'complete':
      setBottlenecks(event.bottlenecks || []);
      setRecommendations(event.recommendations || []);
      setSummary(event.summary || '');
      setAnalysisState('complete');
      break;

    case 'error':
      setErrorMessage(event.message || 'Analysis failed');
      setAnalysisState('error');
      break;
    }
  };

  // Auto-analyze when tab becomes active or plan changes
  // Triggers for any non-loading state when plan hasn't been analyzed yet
  useEffect(() => {
    if (
      isActive &&
      plans &&
      analysisState !== 'loading' &&
      analyzedPlanRef.current !== plans
    ) {
      runAnalysis();
    }
  }, [isActive, plans, analysisState, runAnalysis]);

  const handleCopySQL = (sqlText) => {
    navigator.clipboard.writeText(sqlText);
  };

  const handleInsertSQL = (sqlText) => {
    if (onInsertSQL) {
      onInsertSQL(sqlText);
    }
  };

  // Generate the raw plan text from the plans array
  const getRawPlanText = useCallback(() => {
    if (!plans || plans.length === 0) return '';

    // The plans array contains the EXPLAIN output
    // Convert it to a readable text format
    const formatPlanNode = (node, indent = 0) => {
      if (!node) return '';
      const prefix = '  '.repeat(indent);
      let result = '';

      // Format the node type and basic info
      const nodeType = node['Node Type'] || '';
      const relationship = node['Parent Relationship'] ? ` (${node['Parent Relationship']})` : '';

      let nodeInfo = `${prefix}-> ${nodeType}${relationship}`;

      // Add key metrics
      const metrics = [];
      if (node['Relation Name']) metrics.push(`on ${node['Relation Name']}`);
      if (node['Index Name']) metrics.push(`using ${node['Index Name']}`);
      if (node['Join Type']) metrics.push(`${node['Join Type']} Join`);
      if (node['Hash Cond']) metrics.push(`Hash Cond: ${node['Hash Cond']}`);
      if (node['Index Cond']) metrics.push(`Index Cond: ${node['Index Cond']}`);
      if (node['Filter']) metrics.push(`Filter: ${node['Filter']}`);

      if (metrics.length > 0) {
        nodeInfo += `  ${metrics.join(', ')}`;
      }

      result += nodeInfo + '\n';

      // Add cost and row info
      const costInfo = [];
      if (node['Startup Cost'] !== undefined) costInfo.push(`cost=${node['Startup Cost']}..${node['Total Cost']}`);
      if (node['Plan Rows'] !== undefined) costInfo.push(`rows=${node['Plan Rows']}`);
      if (node['Plan Width'] !== undefined) costInfo.push(`width=${node['Plan Width']}`);

      if (costInfo.length > 0) {
        result += `${prefix}   (${costInfo.join(' ')})\n`;
      }

      // Add actual metrics if available (from EXPLAIN ANALYZE)
      const actualInfo = [];
      if (node['Actual Startup Time'] !== undefined) actualInfo.push(`actual time=${node['Actual Startup Time']}..${node['Actual Total Time']}`);
      if (node['Actual Rows'] !== undefined) actualInfo.push(`rows=${node['Actual Rows']}`);
      if (node['Actual Loops'] !== undefined) actualInfo.push(`loops=${node['Actual Loops']}`);

      if (actualInfo.length > 0) {
        result += `${prefix}   (${actualInfo.join(' ')})\n`;
      }

      // Recursively format child plans
      if (node['Plans'] && Array.isArray(node['Plans'])) {
        for (const child of node['Plans']) {
          result += formatPlanNode(child, indent + 1);
        }
      }

      return result;
    };

    // Format each plan in the array
    return plans.map((plan, idx) => {
      let planText = '';
      if (plans.length > 1) {
        planText += `--- Plan ${idx + 1} ---\n`;
      }
      if (plan['Plan']) {
        planText += formatPlanNode(plan['Plan']);
      }
      // Add execution time if available
      if (plan['Execution Time'] !== undefined) {
        planText += `\nExecution Time: ${plan['Execution Time']} ms\n`;
      }
      if (plan['Planning Time'] !== undefined) {
        planText += `Planning Time: ${plan['Planning Time']} ms\n`;
      }
      return planText;
    }).join('\n');
  }, [plans]);

  // Generate markdown content for download
  const generateMarkdownReport = useCallback(() => {
    const date = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let markdown = '# Query Plan AI Insights\n\n';
    markdown += `*Generated on ${date}*\n\n`;
    markdown += '---\n\n';

    // Add the original SQL query
    markdown += '## Original Query\n\n';
    markdown += '```sql\n';
    markdown += (sql || 'Query not available') + '\n';
    markdown += '```\n\n';

    // Add the raw execution plan
    markdown += '## Execution Plan\n\n';
    markdown += '```\n';
    markdown += getRawPlanText() || 'Plan not available';
    markdown += '\n```\n\n';

    markdown += '---\n\n';
    markdown += '## AI Analysis\n\n';

    // Add summary
    if (summary) {
      markdown += '### Summary\n\n';
      markdown += `${summary}\n\n`;
    }

    // Add bottlenecks
    if (bottlenecks.length > 0) {
      markdown += '### Performance Bottlenecks\n\n';
      for (const b of bottlenecks) {
        const severityEmoji = b.severity === 'high' ? '🔴' : b.severity === 'medium' ? '🟡' : '🔵';
        markdown += `#### ${severityEmoji} ${b.node} [${b.severity}]\n\n`;
        markdown += `**Issue:** ${b.issue}\n\n`;
        if (b.details) {
          markdown += `${b.details}\n\n`;
        }
      }
    }

    // Add recommendations
    if (recommendations.length > 0) {
      markdown += '### Recommendations\n\n';
      for (const r of recommendations) {
        markdown += `#### ${r.priority}. ${r.title}\n\n`;
        markdown += `${r.explanation}\n\n`;
        if (r.sql) {
          markdown += '```sql\n';
          markdown += r.sql + '\n';
          markdown += '```\n\n';
        }
      }
    }

    // Add "no issues" message if applicable
    if (bottlenecks.length === 0 && recommendations.length === 0) {
      markdown += '### Analysis Result\n\n';
      markdown += '✅ No significant performance issues detected. The query plan appears to be well-optimized.\n\n';
    }

    markdown += '---\n\n';
    markdown += '*AI analysis is advisory. Always verify recommendations before applying them to production.*\n';

    return markdown;
  }, [sql, summary, bottlenecks, recommendations, getRawPlanText]);

  // Handle download
  const handleDownload = useCallback(() => {
    const markdown = generateMarkdownReport();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `query-plan-insights-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateMarkdownReport]);

  if (!plans) {
    return (
      <EmptyPanelMessage
        text={gettext('Run EXPLAIN to see AI-powered analysis.')}
      />
    );
  }

  if (analysisState === 'loading') {
    return (
      <StyledContainer>
        <Header>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {gettext('AI Insights')}
            </Typography>
            {llmInfo.provider && (
              <Typography variant="caption" sx={{ color: textColors.secondary }}>
                ({llmInfo.provider}{llmInfo.model ? ` / ${llmInfo.model}` : ''})
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <DefaultButton
              onClick={stopAnalysis}
              startIcon={<StopIcon />}
            >
              {gettext('Stop')}
            </DefaultButton>
            <DefaultButton
              onClick={runAnalysis}
              startIcon={<RefreshIcon />}
              disabled={true}
            >
              {gettext('Regenerate')}
            </DefaultButton>
            <PrimaryButton
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
              disabled={true}
            >
              {gettext('Download')}
            </PrimaryButton>
          </Box>
        </Header>
        <LoadingContainer>
          <Loader message="" style={{ position: 'relative', height: 40, width: 40 }} />
          <Typography variant="body1" sx={{ color: textColors.secondary }}>
            {thinkingMessage}
          </Typography>
        </LoadingContainer>
      </StyledContainer>
    );
  }

  if (analysisState === 'error') {
    return (
      <StyledContainer>
        <Header>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {gettext('AI Insights')}
            </Typography>
            {llmInfo.provider && (
              <Typography variant="caption" sx={{ color: textColors.secondary }}>
                ({llmInfo.provider}{llmInfo.model ? ` / ${llmInfo.model}` : ''})
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <DefaultButton
              onClick={runAnalysis}
              startIcon={<RefreshIcon />}
            >
              {gettext('Regenerate')}
            </DefaultButton>
            <PrimaryButton
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
              disabled={true}
            >
              {gettext('Download')}
            </PrimaryButton>
          </Box>
        </Header>
        <ContentArea>
          <Section>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
              <ErrorOutlineIcon />
              <Typography variant="body1">{errorMessage}</Typography>
            </Box>
          </Section>
        </ContentArea>
      </StyledContainer>
    );
  }

  if (analysisState === 'idle') {
    return (
      <StyledContainer>
        <Header>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {gettext('AI Insights')}
            </Typography>
            {llmInfo.provider && (
              <Typography variant="caption" sx={{ color: textColors.secondary }}>
                ({llmInfo.provider}{llmInfo.model ? ` / ${llmInfo.model}` : ''})
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <DefaultButton
              onClick={runAnalysis}
              startIcon={<RefreshIcon />}
            >
              {gettext('Analyze')}
            </DefaultButton>
            <PrimaryButton
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
              disabled={true}
            >
              {gettext('Download')}
            </PrimaryButton>
          </Box>
        </Header>
        <ContentArea>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <LightbulbOutlinedIcon sx={{ fontSize: 48, color: textColors.secondary }} />
            <Typography variant="body1" sx={{ color: textColors.secondary }}>
              {gettext('Click Analyze to get AI-powered insights on your query plan')}
            </Typography>
          </Box>
        </ContentArea>
      </StyledContainer>
    );
  }

  if (analysisState === 'stopped') {
    return (
      <StyledContainer>
        <Header>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {gettext('AI Insights')}
            </Typography>
            {llmInfo.provider && (
              <Typography variant="caption" sx={{ color: textColors.secondary }}>
                ({llmInfo.provider}{llmInfo.model ? ` / ${llmInfo.model}` : ''})
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <DefaultButton
              onClick={stopAnalysis}
              startIcon={<StopIcon />}
              disabled={true}
            >
              {gettext('Stop')}
            </DefaultButton>
            <DefaultButton
              onClick={runAnalysis}
              startIcon={<RefreshIcon />}
            >
              {gettext('Regenerate')}
            </DefaultButton>
            <PrimaryButton
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
              disabled={true}
            >
              {gettext('Download')}
            </PrimaryButton>
          </Box>
        </Header>
        <ContentArea>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 48, color: textColors.secondary }} />
            <Typography variant="body1" sx={{ color: textColors.secondary }}>
              {gettext('Analysis stopped. Click Regenerate or re-run EXPLAIN to try again.')}
            </Typography>
          </Box>
        </ContentArea>
      </StyledContainer>
    );
  }

  // Complete state
  return (
    <StyledContainer>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {gettext('AI Insights')}
          </Typography>
          {llmInfo.provider && (
            <Typography variant="caption" sx={{ color: textColors.secondary }}>
              ({llmInfo.provider}{llmInfo.model ? ` / ${llmInfo.model}` : ''})
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <DefaultButton
            onClick={runAnalysis}
            startIcon={<RefreshIcon />}
          >
            {gettext('Regenerate')}
          </DefaultButton>
          <PrimaryButton
            onClick={handleDownload}
            startIcon={<DownloadIcon />}
          >
            {gettext('Download')}
          </PrimaryButton>
        </Box>
      </Header>
      <ContentArea>
        {/* Summary */}
        {summary && (
          <Section>
            <SectionHeader>
              <CheckCircleOutlineIcon color="success" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {gettext('Summary')}
              </Typography>
            </SectionHeader>
            <Typography variant="body2">{summary}</Typography>
          </Section>
        )}

        {/* Bottlenecks */}
        {bottlenecks.length > 0 && (
          <Section>
            <SectionHeader>
              <WarningAmberIcon color="warning" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {gettext('Performance Bottlenecks')}
              </Typography>
              <Chip label={bottlenecks.length} size="small" />
            </SectionHeader>
            {bottlenecks.map((bottleneck, idx) => (
              <BottleneckCard
                key={idx}
                bottleneck={bottleneck}
                textColors={textColors}
              />
            ))}
          </Section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Section>
            <SectionHeader>
              <LightbulbOutlinedIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {gettext('Recommendations')}
              </Typography>
              <Chip label={recommendations.length} size="small" />
            </SectionHeader>
            {recommendations.map((rec, idx) => (
              <RecommendationCard
                key={idx}
                recommendation={rec}
                onInsertSQL={handleInsertSQL}
                onCopySQL={handleCopySQL}
                textColors={textColors}
              />
            ))}
          </Section>
        )}

        {/* No issues found */}
        {bottlenecks.length === 0 && recommendations.length === 0 && (
          <Section>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 3,
              }}
            >
              <CheckCircleOutlineIcon
                sx={{ fontSize: 48, color: 'success.main', mb: 1 }}
              />
              <Typography variant="body1">
                {gettext('No significant performance issues detected.')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: textColors.secondary, mt: 0.5 }}
              >
                {gettext('The query plan appears to be well-optimized.')}
              </Typography>
            </Box>
          </Section>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" sx={{ color: textColors.secondary }}>
          {gettext(
            'AI analysis is advisory. Always verify recommendations before applying them to production.'
          )}
        </Typography>
      </ContentArea>
    </StyledContainer>
  );
}

AIInsights.propTypes = {
  plans: PropTypes.array,
  sql: PropTypes.string,
  transId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onInsertSQL: PropTypes.func,
  isActive: PropTypes.bool,
};
