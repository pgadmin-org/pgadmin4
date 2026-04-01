/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { format as formatSQL } from 'sql-formatter';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../../../../static/js/api_instance';
import { getRandomThinkingMessage } from '../../../../../../static/js/ai_thinking_messages';
import usePreferences from '../../../../../../preferences/static/js/store';
import {
  QueryToolContext,
  QueryToolEventsContext,
} from '../QueryToolComponent';
import { PANELS, QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import CodeMirror from '../../../../../../static/js/components/ReactCodeMirror';
import { PgIconButton, DefaultButton } from '../../../../../../static/js/components/Buttons';
import EmptyPanelMessage from '../../../../../../static/js/components/EmptyPanelMessage';
import Loader from 'sources/components/Loader';

// Styled components
const ChatContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const HeaderBar = styled('div')(({ theme }) => ({
  flex: '0 0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0.5, 1),
  backgroundColor: theme.otherVars.editorToolbarBg,
  borderBottom: `1px solid ${theme.otherVars.borderColor}`,
}));

const MessagesArea = styled('div')(({ theme }) => ({
  flex: '1 1 0',
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  userSelect: 'text',
}));

const MessageBubble = styled(Paper)(({ theme, isuser }) => ({
  padding: theme.spacing(1, 1.5),
  maxWidth: '90%',
  alignSelf: isuser === 'true' ? 'flex-end' : 'flex-start',
  backgroundColor:
    isuser === 'true'
      ? theme.palette.primary.main
      : theme.palette.background.paper,
  color:
    isuser === 'true'
      ? theme.palette.primary.contrastText
      : theme.palette.text.primary,
  borderRadius: theme.spacing(1.5),
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  ...(isuser !== 'true' && {
    border: `1px solid ${theme.otherVars.borderColor}`,
  }),
}));

const SQLPreviewBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  '& .sql-preview-header': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  '& .sql-preview-actions': {
    display: 'flex',
    gap: theme.spacing(0.5),
  },
  '& .sql-preview-editor': {
    border: `1px solid ${theme.otherVars.borderColor}`,
    borderRadius: theme.spacing(0.5),
    overflow: 'auto',
    '& .cm-editor': {
      maxHeight: '250px',
    },
    '& .cm-scroller': {
      overflow: 'auto',
    },
  },
}));

const InputArea = styled('div')(({ theme }) => ({
  flex: '0 0 auto',
  padding: theme.spacing(1),
  borderTop: `1px solid ${theme.otherVars.borderColor}`,
  backgroundColor: theme.otherVars.editorToolbarBg,
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'flex-end',
}));

const ThinkingIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

const MarkdownContent = styled(Box)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  lineHeight: theme.typography.body2.lineHeight,
  '& p': { margin: `${theme.spacing(0.5)} 0` },
  '& p:first-of-type': { marginTop: 0 },
  '& p:last-of-type': { marginBottom: 0 },
  '& code': {
    backgroundColor: theme.palette.action.hover,
    padding: '1px 4px',
    borderRadius: 3,
    fontSize: '0.85em',
    fontFamily: 'monospace',
  },
  '& pre': {
    backgroundColor: theme.palette.action.hover,
    padding: theme.spacing(1),
    borderRadius: 4,
    overflow: 'auto',
    '& code': {
      backgroundColor: 'transparent',
      padding: 0,
    },
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    margin: `${theme.spacing(1)} 0 ${theme.spacing(0.5)} 0`,
    lineHeight: 1.3,
  },
  '& h1': { fontSize: '1.3em' },
  '& h2': { fontSize: '1.2em' },
  '& h3': { fontSize: '1.1em' },
  '& ul': {
    margin: `${theme.spacing(0.5)} 0`,
    paddingLeft: theme.spacing(2.5),
    listStyleType: 'disc !important',
  },
  '& ol': {
    margin: `${theme.spacing(0.5)} 0`,
    paddingLeft: theme.spacing(2.5),
    listStyleType: 'decimal !important',
  },
  '& li': {
    margin: `${theme.spacing(0.25)} 0`,
    display: 'list-item !important',
    listStyle: 'inherit !important',
  },
  '& ul ul': { listStyleType: 'circle !important' },
  '& ul ul ul': { listStyleType: 'square !important' },
  '& table': {
    borderCollapse: 'collapse',
    margin: `${theme.spacing(0.5)} 0`,
    width: '100%',
  },
  '& th, & td': {
    border: `1px solid ${theme.otherVars.borderColor}`,
    padding: `${theme.spacing(0.25)} ${theme.spacing(0.75)}`,
    textAlign: 'left',
  },
  '& th': {
    backgroundColor: theme.palette.action.hover,
    fontWeight: 600,
  },
  '& blockquote': {
    borderLeft: `3px solid ${theme.otherVars.borderColor}`,
    margin: `${theme.spacing(0.5)} 0`,
    paddingLeft: theme.spacing(1),
    opacity: 0.85,
  },
  '& strong': { fontWeight: 600 },
  '& a': {
    color: theme.otherVars.hyperlinkColor,
    textDecoration: 'underline',
  },
}));

// Message types
const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SQL: 'sql',
  THINKING: 'thinking',
  STREAMING: 'streaming',
  ERROR: 'error',
};

/**
 * Incrementally parse streaming markdown text into an ordered list of
 * segments.  Each segment is:
 *   { type: 'text', content: string }
 *   { type: 'code', language: string, content: string, complete: boolean }
 *
 * Handles ```language fenced code blocks.  Segments appear in the order
 * the LLM streams them so the renderer can map straight over the array.
 */
function parseMarkdownSegments(text) {
  const segments = [];
  let pos = 0;

  while (pos < text.length) {
    const fenceIdx = text.indexOf('```', pos);

    if (fenceIdx === -1) {
      // No more fences — rest is text
      const content = text.substring(pos);
      if (content) segments.push({ type: 'text', content });
      break;
    }

    // Text before the fence
    if (fenceIdx > pos) {
      segments.push({ type: 'text', content: text.substring(pos, fenceIdx) });
    }

    // Parse opening fence line: ```language\n
    const afterFence = text.substring(fenceIdx + 3);
    const langMatch = /^([a-zA-Z]*)\n/.exec(afterFence);
    if (!langMatch) {
      // Language line not complete yet — wait for more tokens
      break;
    }

    const language = langMatch[1].toLowerCase();
    const codeStart = fenceIdx + 3 + langMatch[0].length;

    // Find closing fence
    const closeIdx = text.indexOf('```', codeStart);
    if (closeIdx === -1) {
      // Still streaming code block content
      segments.push({
        type: 'code', language,
        content: text.substring(codeStart),
        complete: false,
      });
      break;
    }

    // Complete code block — trim trailing newline before closing fence
    let codeContent = text.substring(codeStart, closeIdx);
    if (codeContent.endsWith('\n')) {
      codeContent = codeContent.slice(0, -1);
    }
    segments.push({
      type: 'code', language,
      content: codeContent,
      complete: true,
    });

    // Move past closing ``` and optional trailing newline
    pos = closeIdx + 3;
    if (pos < text.length && text[pos] === '\n') pos++;
  }

  return segments;
}

/**
 * Render a markdown text fragment to sanitized HTML.
 * Uses marked for inline formatting (bold, italic, code, lists, tables, etc.)
 * and DOMPurify to prevent XSS.
 */
function renderMarkdownText(text) {
  if (!text) return '';
  const html = marked.parse(text, { gfm: true, breaks: true });
  return DOMPurify.sanitize(html);
}

// Single chat message component
function ChatMessage({ message, onInsertSQL, onReplaceSQL, textColors, cmKey, formatSqlWithPrefs }) {
  if (message.type === MESSAGE_TYPES.USER) {
    return (
      <MessageBubble isuser="true">
        <Typography variant="body2">{message.content}</Typography>
      </MessageBubble>
    );
  }

  if (message.type === MESSAGE_TYPES.SQL) {
    const segments = message.content
      ? parseMarkdownSegments(message.content) : [];

    // Fallback for messages without markdown content (old format)
    if (segments.length === 0 && message.sql) {
      return (
        <MessageBubble isuser="false">
          <SQLPreviewBox>
            <Box className="sql-preview-header">
              <Typography variant="caption" style={{ color: textColors.secondary }}>
                {gettext('Generated SQL')}
              </Typography>
              <Box className="sql-preview-actions">
                <Tooltip title={gettext('Insert at cursor')}>
                  <IconButton size="small" onClick={() => onInsertSQL(message.sql)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={gettext('Replace query')}>
                  <IconButton size="small" onClick={() => onReplaceSQL(message.sql)}>
                    <AutoFixHighIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={gettext('Copy to clipboard')}>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(message.sql)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box className="sql-preview-editor">
              <CodeMirror
                key={`sql-preview-${cmKey}`}
                value={message.sql}
                readonly={true}
                options={{ lineNumbers: true, foldGutter: false, mode: 'text/x-pgsql' }}
              />
            </Box>
          </SQLPreviewBox>
          {message.explanation && (
            <Typography variant="body2" sx={{ marginTop: 1 }}>{message.explanation}</Typography>
          )}
        </MessageBubble>
      );
    }

    // Render markdown segments with action buttons on code blocks
    return (
      <MessageBubble isuser="false">
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            const content = seg.content?.trim();
            if (!content) return null;
            return (
              <MarkdownContent key={idx}
                sx={{ marginTop: idx > 0 ? 1 : 0 }}
                dangerouslySetInnerHTML={{ __html: renderMarkdownText(content) }}
              />
            );
          }

          if (seg.type === 'code') {
            const isSql = ['sql', 'pgsql', 'postgresql'].includes(seg.language);
            const formattedCode = isSql ? formatSqlWithPrefs(seg.content) : seg.content;

            return (
              <SQLPreviewBox key={idx}>
                <Box className="sql-preview-header">
                  <Typography variant="caption" style={{ color: textColors.secondary }}>
                    {seg.language || gettext('Code')}
                  </Typography>
                  <Box className="sql-preview-actions">
                    {isSql && (
                      <>
                        <Tooltip title={gettext('Insert at cursor')}>
                          <IconButton size="small" onClick={() => onInsertSQL(formattedCode)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={gettext('Replace query')}>
                          <IconButton size="small" onClick={() => onReplaceSQL(formattedCode)}>
                            <AutoFixHighIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title={gettext('Copy to clipboard')}>
                      <IconButton size="small"
                        onClick={() => navigator.clipboard.writeText(formattedCode)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box className="sql-preview-editor">
                  <CodeMirror
                    key={`sql-preview-${cmKey}-${idx}`}
                    value={formattedCode}
                    readonly={true}
                    options={{
                      lineNumbers: true, foldGutter: false,
                      mode: isSql ? 'text/x-pgsql' : '',
                    }}
                  />
                </Box>
              </SQLPreviewBox>
            );
          }

          return null;
        })}
      </MessageBubble>
    );
  }

  if (message.type === MESSAGE_TYPES.THINKING) {
    return (
      <MessageBubble isuser="false">
        <ThinkingIndicator>
          <Loader
            message=""
            style={{ position: 'relative', height: 20, width: 20 }}
          />
          <Typography variant="body2" style={{ color: textColors.secondary }}>
            {message.content}
          </Typography>
        </ThinkingIndicator>
      </MessageBubble>
    );
  }

  if (message.type === MESSAGE_TYPES.STREAMING) {
    const segments = parseMarkdownSegments(message.content);
    const BlinkingCursor = (
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          width: '6px',
          height: '1em',
          backgroundColor: 'text.secondary',
          marginLeft: '2px',
          verticalAlign: 'text-bottom',
          animation: 'blink 1s step-end infinite',
          '@keyframes blink': {
            '50%': { opacity: 0 },
          },
        }}
      />
    );

    // No segments parsed yet — show raw text or spinner
    if (segments.length === 0) {
      return (
        <MessageBubble isuser="false">
          {message.content ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
              {BlinkingCursor}
            </Typography>
          ) : (
            <ThinkingIndicator>
              <Loader
                message=""
                style={{ position: 'relative', height: 20, width: 20 }}
              />
              <Typography variant="body2" style={{ color: textColors.secondary }}>
                {gettext('Generating response...')}
              </Typography>
            </ThinkingIndicator>
          )}
        </MessageBubble>
      );
    }

    // Render markdown segments in order
    const lastIdx = segments.length - 1;
    return (
      <MessageBubble isuser="false">
        {segments.map((seg, idx) => {
          const isLast = idx === lastIdx;
          const cursor = isLast && !seg.complete ? BlinkingCursor : null;

          if (seg.type === 'code') {
            return (
              <SQLPreviewBox key={idx}>
                <Box className="sql-preview-header">
                  <Typography variant="caption" style={{ color: textColors.secondary }}>
                    {seg.complete
                      ? (seg.language || gettext('Code'))
                      : gettext('Generating...')}
                  </Typography>
                </Box>
                <Box className="sql-preview-editor">
                  <Box
                    component="pre"
                    sx={{
                      margin: 0,
                      padding: 1,
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '250px',
                      overflow: 'auto',
                    }}
                  >
                    {seg.content}
                    {cursor}
                  </Box>
                </Box>
              </SQLPreviewBox>
            );
          }

          const content = seg.content?.trim();
          if (!content && !cursor) return null;
          return (
            <Box key={idx} sx={{ marginTop: idx > 0 ? 1 : 0 }}>
              <MarkdownContent
                dangerouslySetInnerHTML={{ __html: renderMarkdownText(content || '') }}
              />
              {cursor}
            </Box>
          );
        })}
      </MessageBubble>
    );
  }

  if (message.type === MESSAGE_TYPES.ERROR) {
    return (
      <MessageBubble
        isuser="false"
        sx={{ backgroundColor: 'error.light', borderColor: 'error.main' }}
      >
        <Typography variant="body2" color="error.dark">
          {message.content}
        </Typography>
      </MessageBubble>
    );
  }

  return (
    <MessageBubble isuser="false">
      <MarkdownContent
        dangerouslySetInnerHTML={{ __html: renderMarkdownText(message.content || '') }}
      />
    </MessageBubble>
  );
}

// Main NLQ Chat Panel
export function NLQChatPanel() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [thinkingMessageId, setThinkingMessageId] = useState(null);
  const [llmInfo, setLlmInfo] = useState({ provider: null, model: null });

  // History navigation state
  const [queryHistory, setQueryHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');

  // Get text colors from the body element to match pgAdmin's theme
  // The MUI theme may not be synced with pgAdmin's theme in docker tabs
  const [textColors, setTextColors] = useState({
    primary: 'inherit',
    secondary: 'inherit',
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const readerRef = useRef(null);
  const stoppedRef = useRef(false);
  const clearedRef = useRef(false);
  const streamingTextRef = useRef('');
  const streamingIdRef = useRef(null);
  const eventBus = useContext(QueryToolEventsContext);
  const queryToolCtx = useContext(QueryToolContext);
  const editorPrefs = usePreferences().getPreferencesForModule('editor');

  // Format SQL using pgAdmin's editor preferences
  const formatSqlWithPrefs = useCallback((sql) => {
    if (!sql) return sql;
    try {
      const formatPrefs = {
        language: 'postgresql',
        keywordCase: editorPrefs.keyword_case === 'capitalize' ? 'preserve' : editorPrefs.keyword_case,
        identifierCase: editorPrefs.identifier_case === 'capitalize' ? 'preserve' : editorPrefs.identifier_case,
        dataTypeCase: editorPrefs.data_type_case,
        functionCase: editorPrefs.function_case,
        logicalOperatorNewline: editorPrefs.logical_operator_new_line,
        expressionWidth: editorPrefs.expression_width,
        linesBetweenQueries: editorPrefs.lines_between_queries,
        tabWidth: editorPrefs.tab_size,
        useTabs: !editorPrefs.use_spaces,
        denseOperators: !editorPrefs.spaces_around_operators,
        newlineBeforeSemicolon: editorPrefs.new_line_before_semicolon
      };
      return formatSQL(sql, formatPrefs);
    } catch {
      // If formatting fails, return original SQL
      return sql;
    }
  }, [editorPrefs]);

  // Update text colors from body styles for theme compatibility
  useEffect(() => {
    const updateColors = () => {
      const bodyStyles = window.getComputedStyle(document.body);
      const primaryColor = bodyStyles.color;

      // For secondary color, create a semi-transparent version of the primary
      // Use higher opacity (0.85) to ensure readability in light mode
      const rgbMatch = primaryColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      let secondaryColor = primaryColor;
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        secondaryColor = `rgba(${r}, ${g}, ${b}, 0.85)`;
      }

      setTextColors({
        primary: primaryColor,
        secondary: secondaryColor,
      });
    };

    updateColors();
  }, []);

  // Fetch LLM info on mount
  useEffect(() => {
    const api = getApiInstance();
    api.get(url_for('llm.status'))
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setLlmInfo({
            provider: res.data.data.provider,
            model: res.data.data.model
          });
        }
      })
      .catch(() => {
        // Ignore errors fetching LLM status
      });
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus the input when loading completes
  useEffect(() => {
    if (!isLoading) {
      // Defer focus to ensure the DOM has updated (disabled=false)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isLoading]);

  // Force CodeMirror re-render when panel becomes visible (fixes tab switching issue)
  const [cmKey, setCmKey] = useState(0);
  useEffect(() => {
    const unregister = eventBus.registerListener(QUERY_TOOL_EVENTS.FOCUS_PANEL, (panelId) => {
      if (panelId === PANELS.AI_ASSISTANT) {
        // Increment key to force CodeMirror re-render
        setCmKey((prev) => prev + 1);
      }
    });
    return () => unregister?.();
  }, [eventBus]);

  // Cycle through thinking messages while loading
  useEffect(() => {
    if (!isLoading || !thinkingMessageId) return;

    const interval = setInterval(() => {
      const newMessage = getRandomThinkingMessage();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingMessageId ? { ...m, content: newMessage } : m
        )
      );
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [isLoading, thinkingMessageId]);

  const handleInsertSQL = (sql) => {
    eventBus.fireEvent(QUERY_TOOL_EVENTS.NLQ_INSERT_SQL, sql);
    eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.QUERY);
  };

  const handleReplaceSQL = (sql) => {
    eventBus.fireEvent(QUERY_TOOL_EVENTS.EDITOR_SET_SQL, sql);
    eventBus.fireEvent(QUERY_TOOL_EVENTS.FOCUS_PANEL, PANELS.QUERY);
  };

  const handleClearConversation = () => {
    // Mark as cleared so in-flight stream handlers ignore late events
    clearedRef.current = true;
    // Cancel any active stream
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setConversationId(null);
    setConversationHistory([]);
  };

  // Stop the current request
  const handleStop = useCallback(() => {
    // Mark as stopped so the read loop knows to show stopped message
    stoppedRef.current = true;
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
  }, []);

  // Fetch current LLM provider/model info
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
      // Ignore errors fetching LLM status
    }
  }, []);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Reset stopped, cleared flags and streaming state
    stoppedRef.current = false;
    clearedRef.current = false;
    streamingTextRef.current = '';
    streamingIdRef.current = null;

    // Fetch latest LLM provider/model info before submitting
    fetchLlmInfo();

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add to query history (avoid duplicates of the last entry)
    setQueryHistory((prev) => {
      if (prev.length === 0 || prev[prev.length - 1] !== userMessage) {
        return [...prev, userMessage];
      }
      return prev;
    });
    setHistoryIndex(-1);
    setSavedInput('');

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        type: MESSAGE_TYPES.USER,
        content: userMessage,
      },
    ]);

    // Add thinking indicator with random elephant-themed message
    const thinkingId = Date.now();
    setThinkingMessageId(thinkingId);
    setMessages((prev) => [
      ...prev,
      {
        type: MESSAGE_TYPES.THINKING,
        content: getRandomThinkingMessage(),
        id: thinkingId,
      },
    ]);

    setIsLoading(true);

    // Create abort controller with 5 minute timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    try {
      const response = await fetch(
        url_for('sqleditor.nlq_chat_stream', {
          trans_id: queryToolCtx.params.trans_id,
        }),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [window.pgAdmin.csrf_token_header]: window.pgAdmin.csrf_token,
          },
          body: JSON.stringify({
            message: userMessage,
            conversation_id: conversationId,
            history: conversationHistory,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      abortControllerRef.current = null;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.errormsg || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(data, thinkingId);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      readerRef.current = null;

      // Check if user manually stopped (but not cleared)
      if (stoppedRef.current && !clearedRef.current) {
        const streamId = streamingIdRef.current;
        // If we have partial streaming content, show it separately
        // from the stop notice to avoid breaking open markdown fences
        if (streamingTextRef.current) {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
            {
              type: MESSAGE_TYPES.ASSISTANT,
              content: streamingTextRef.current,
            },
            {
              type: MESSAGE_TYPES.ASSISTANT,
              content: gettext('Generation stopped.'),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== thinkingId),
            {
              type: MESSAGE_TYPES.ASSISTANT,
              content: gettext('Generation stopped.'),
            },
          ]);
        }
        streamingTextRef.current = '';
        streamingIdRef.current = null;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      readerRef.current = null;
      const streamId = streamingIdRef.current;
      // If conversation was cleared, ignore all late errors
      if (clearedRef.current) {
        // Do nothing - conversation was wiped
      } else if (error.name === 'AbortError') {
        // Check if this was a user-initiated stop or a timeout
        if (stoppedRef.current) {
          // User manually stopped - show partial content separately
          if (streamingTextRef.current) {
            setMessages((prev) => [
              ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
              {
                type: MESSAGE_TYPES.ASSISTANT,
                content: streamingTextRef.current,
              },
              {
                type: MESSAGE_TYPES.ASSISTANT,
                content: gettext('Generation stopped.'),
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev.filter((m) => m.id !== thinkingId),
              {
                type: MESSAGE_TYPES.ASSISTANT,
                content: gettext('Generation stopped.'),
              },
            ]);
          }
        } else {
          // Timeout occurred
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
            {
              type: MESSAGE_TYPES.ERROR,
              content: gettext('Request timed out. The query may be too complex. Please try a simpler request.'),
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
          {
            type: MESSAGE_TYPES.ERROR,
            content: gettext('Failed to generate SQL: ') + error.message,
          },
        ]);
      }
      streamingTextRef.current = '';
      streamingIdRef.current = null;
    } finally {
      setIsLoading(false);
      setThinkingMessageId(null);
    }
  };

  const handleSSEEvent = (event, thinkingId) => {
    switch (event.type) {
    case 'thinking': {
      const streamId = streamingIdRef.current;
      if (streamId) {
        // Transition from streaming back to thinking (tool use)
        // Remove streaming message and re-add thinking indicator
        streamingTextRef.current = '';
        streamingIdRef.current = null;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== streamId),
          {
            type: MESSAGE_TYPES.THINKING,
            content: event.message,
            id: thinkingId,
          },
        ]);
        setThinkingMessageId(thinkingId);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId ? { ...m, content: event.message } : m
          )
        );
      }
      break;
    }

    case 'text_delta':
      streamingTextRef.current += event.content;
      if (!streamingIdRef.current) {
        // First text chunk: replace thinking with streaming message
        streamingIdRef.current = Date.now();
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId),
          {
            type: MESSAGE_TYPES.STREAMING,
            content: streamingTextRef.current,
            id: streamingIdRef.current,
          },
        ]);
      } else {
        // Update existing streaming message
        const sid = streamingIdRef.current;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === sid ? { ...m, content: streamingTextRef.current } : m
          )
        );
      }
      break;

    case 'sql':
    case 'complete': {
      const streamId = streamingIdRef.current;
      const content = event.content || event.explanation
        || gettext('I need more information to generate the SQL.');
      // Use SQL type if there's SQL or any code fences in the response
      const hasCodeBlocks = event.sql || (content && content.includes('```'));
      if (hasCodeBlocks) {
        // When SQL was extracted via JSON fallback (no fenced blocks),
        // clear content so ChatMessage uses the sql-only render path
        const msgContent = (content && content.includes('```'))
          ? content : null;
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
          {
            type: MESSAGE_TYPES.SQL,
            content: msgContent,
            sql: event.sql,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
          {
            type: MESSAGE_TYPES.ASSISTANT,
            content,
          },
        ]);
      }
      if (event.conversation_id) {
        setConversationId(event.conversation_id);
      }
      if (event.history) {
        setConversationHistory(event.history);
      }
      // Reset streaming state
      streamingTextRef.current = '';
      streamingIdRef.current = null;
      break;
    }

    case 'error': {
      const streamId = streamingIdRef.current;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== thinkingId && m.id !== streamId),
        {
          type: MESSAGE_TYPES.ERROR,
          content: event.message,
        },
      ]);
      streamingTextRef.current = '';
      streamingIdRef.current = null;
      break;
    }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp' && queryHistory.length > 0) {
      e.preventDefault();
      if (historyIndex === -1) {
        // Starting to navigate history, save current input
        setSavedInput(inputValue);
        const newIndex = queryHistory.length - 1;
        setHistoryIndex(newIndex);
        setInputValue(queryHistory[newIndex]);
      } else if (historyIndex > 0) {
        // Move further back in history
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(queryHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown' && historyIndex !== -1) {
      e.preventDefault();
      if (historyIndex < queryHistory.length - 1) {
        // Move forward in history
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(queryHistory[newIndex]);
      } else {
        // At the end of history, restore saved input
        setHistoryIndex(-1);
        setInputValue(savedInput);
      }
    }
  };

  // Don't render if not a query tool (e.g., View Data mode)
  if (!queryToolCtx?.params?.is_query_tool) {
    return (
      <EmptyPanelMessage
        text={gettext('AI Assistant is only available in Query Tool mode.')}
      />
    );
  }

  return (
    <ChatContainer>
      <HeaderBar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">
            {gettext('AI Assistant')}
          </Typography>
          {llmInfo.provider && (
            <Typography variant="caption" sx={{ color: textColors.secondary }}>
              ({llmInfo.provider}{llmInfo.model ? ` / ${llmInfo.model}` : ''})
            </Typography>
          )}
        </Box>
        <DefaultButton
          onClick={handleClearConversation}
          startIcon={<ClearAllIcon />}
        >
          {gettext('Clear')}
        </DefaultButton>
      </HeaderBar>

      <MessagesArea>
        {messages.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
            textAlign="center"
            p={2}
          >
            <Typography variant="body2" style={{ color: textColors.secondary }}>
              {gettext(
                'Ask a question about your database or describe the SQL you need ' +
                'and I\'ll generate it for you. ' +
                'I can help with SELECT, INSERT, UPDATE, DELETE, and DDL statements.'
              )}
            </Typography>
          </Box>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              onInsertSQL={handleInsertSQL}
              onReplaceSQL={handleReplaceSQL}
              textColors={textColors}
              cmKey={cmKey}
              formatSqlWithPrefs={formatSqlWithPrefs}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      <InputArea>
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          placeholder={gettext('Ask a question or describe the SQL you need...')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          sx={{
            flex: 1,
            minWidth: 0,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
              alignItems: 'flex-start',
              padding: '4px 8px',
            },
            '& .MuiOutlinedInput-root.Mui-disabled': {
              backgroundColor: 'transparent',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'divider',
            },
            '& .MuiInputBase-input': {
              padding: '4px 0',
              fontSize: '0.875rem',
            },
            '& .MuiOutlinedInput-input::placeholder': {
              color: textColors.secondary,
              opacity: 1,
            },
          }}
        />
        <PgIconButton
          title={isLoading ? gettext('Stop') : gettext('Send')}
          icon={isLoading ? <StopIcon /> : <SendIcon />}
          onClick={isLoading ? handleStop : handleSubmit}
          disabled={!isLoading && !inputValue.trim()}
        />
      </InputArea>
    </ChatContainer>
  );
}

export default NLQChatPanel;
