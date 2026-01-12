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
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import getApiInstance from '../../../../../../static/js/api_instance';
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
      minHeight: '60px',
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

// Message types
const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SQL: 'sql',
  THINKING: 'thinking',
  ERROR: 'error',
};

// Elephant/PostgreSQL-themed processing messages
const THINKING_MESSAGES = [
  'Consulting the elephant...',
  'Traversing the B-tree...',
  'Vacuuming the catalog...',
  'Analyzing table statistics...',
  'Joining the herds...',
  'Indexing the savanna...',
  'Querying the watering hole...',
  'Optimizing the plan...',
  'Warming up the cache...',
  'Gathering the tuples...',
  'Scanning the relations...',
  'Checking constraints...',
  'Rolling back the peanuts...',
  'Committing to memory...',
  'Trumpeting the results...',
];

// Helper function to get a random thinking message
function getRandomThinkingMessage() {
  return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
}

// Single chat message component
function ChatMessage({ message, onInsertSQL, onReplaceSQL, textColors, cmKey }) {
  if (message.type === MESSAGE_TYPES.USER) {
    return (
      <MessageBubble isuser="true">
        <Typography variant="body2">{message.content}</Typography>
      </MessageBubble>
    );
  }

  if (message.type === MESSAGE_TYPES.SQL) {
    return (
      <MessageBubble isuser="false">
        {message.explanation && (
          <Typography variant="body2" gutterBottom>
            {message.explanation}
          </Typography>
        )}
        <SQLPreviewBox>
          <Box className="sql-preview-header">
            <Typography variant="caption" style={{ color: textColors.secondary }}>
              {gettext('Generated SQL')}
            </Typography>
            <Box className="sql-preview-actions">
              <Tooltip title={gettext('Insert at cursor')}>
                <IconButton
                  size="small"
                  onClick={() => onInsertSQL(message.sql)}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={gettext('Replace query')}>
                <IconButton
                  size="small"
                  onClick={() => onReplaceSQL(message.sql)}
                >
                  <AutoFixHighIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={gettext('Copy to clipboard')}>
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard.writeText(message.sql)}
                >
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
              options={{
                lineNumbers: true,
                foldGutter: false,
                mode: 'text/x-pgsql',
              }}
            />
          </Box>
        </SQLPreviewBox>
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
      <Typography variant="body2">{message.content}</Typography>
    </MessageBubble>
  );
}

// Main NLQ Chat Panel
export function NLQChatPanel() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
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
  const abortControllerRef = useRef(null);
  const readerRef = useRef(null);
  const stoppedRef = useRef(false);
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
    setMessages([]);
    setConversationId(null);
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

    // Reset stopped flag
    stoppedRef.current = false;

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

      // Check if user manually stopped
      if (stoppedRef.current) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId),
          {
            type: MESSAGE_TYPES.ASSISTANT,
            content: gettext('Generation stopped.'),
          },
        ]);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      readerRef.current = null;
      // Show appropriate message based on error type
      if (error.name === 'AbortError') {
        // Check if this was a user-initiated stop or a timeout
        if (stoppedRef.current) {
          // User manually stopped
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== thinkingId),
            {
              type: MESSAGE_TYPES.ASSISTANT,
              content: gettext('Generation stopped.'),
            },
          ]);
        } else {
          // Timeout occurred
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== thinkingId),
            {
              type: MESSAGE_TYPES.ERROR,
              content: gettext('Request timed out. The query may be too complex. Please try a simpler request.'),
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId),
          {
            type: MESSAGE_TYPES.ERROR,
            content: gettext('Failed to generate SQL: ') + error.message,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setThinkingMessageId(null);
    }
  };

  const handleSSEEvent = (event, thinkingId) => {
    switch (event.type) {
    case 'thinking':
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingId ? { ...m, content: event.message } : m
        )
      );
      break;

    case 'sql':
    case 'complete':
      // If sql is null/empty, show as regular assistant message (e.g., clarification questions)
      if (!event.sql) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId),
          {
            type: MESSAGE_TYPES.ASSISTANT,
            content: event.explanation || gettext('I need more information to generate the SQL.'),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== thinkingId),
          {
            type: MESSAGE_TYPES.SQL,
            sql: formatSqlWithPrefs(event.sql),
            explanation: event.explanation,
          },
        ]);
      }
      if (event.conversation_id) {
        setConversationId(event.conversation_id);
      }
      break;

    case 'error':
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== thinkingId),
        {
          type: MESSAGE_TYPES.ERROR,
          content: event.message,
        },
      ]);
      break;
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
                'Describe what SQL you need and I\'ll generate it for you. ' +
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
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesArea>

      <InputArea>
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          placeholder={gettext('Describe the SQL you need...')}
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
