# LLM Module Tests

This directory contains comprehensive tests for the pgAdmin LLM/AI functionality.

## Test Files

### Python Tests

#### `test_client.py` - LLM Client Tests
Tests the core LLM client functionality including:
- Provider initialization (Anthropic, OpenAI, Ollama)
- API key loading from files and environment variables
- Graceful handling of missing API keys
- User preference overrides
- Provider selection logic
- Whitespace handling in API keys

**Key Features:**
- Tests pass even without API keys configured
- Mocks external API calls
- Tests all three provider types

#### `test_reports.py` - Report Generation Tests
Tests report generation functionality including:
- Security, performance, and design report types
- Server, database, and schema level reports
- Report request validation
- Progress callback functionality
- Error handling during generation
- Markdown formatting

**Key Features:**
- Tests data collection from PostgreSQL
- Validates report structure
- Tests streaming progress updates

#### `test_chat.py` - Chat Session Tests
Tests interactive chat functionality including:
- Chat session initialization
- Message history management
- Context passing (database, SQL queries)
- Streaming responses
- Token counting for context management
- Maximum history limits
- Error handling

**Key Features:**
- Tests conversation flow
- Validates context integration
- Tests memory management

#### `test_views.py` - API Endpoint Tests
Tests Flask endpoints including:
- `/llm/status` - LLM availability check
- `/llm/reports/security/*` - Security report endpoints
- `/llm/reports/performance/*` - Performance report endpoints
- `/llm/reports/design/*` - Design review endpoints
- `/llm/chat` - Chat endpoint
- Streaming endpoints with SSE

**Key Features:**
- Tests authentication and permissions
- Tests API error responses
- Tests SSE streaming format

### JavaScript Tests

#### `AIReport.spec.js` - AIReport Component Tests
Tests the React component for AI report display including:
- Component rendering in light and dark modes
- Theme detection from body styles
- Progress display during generation
- Error handling
- Markdown rendering
- Download functionality
- SSE event handling
- Support for all report categories and types

**Key Features:**
- Tests with React Testing Library
- Mocks EventSource for SSE
- Tests theme transitions
- Validates accessibility

## Running the Tests

### Python Tests

From the `web` directory:

```bash
# Run all LLM tests
python -m pytest pgadmin/llm/tests/

# Run specific test file
python -m pytest pgadmin/llm/tests/test_client.py

# Run specific test case
python -m pytest pgadmin/llm/tests/test_client.py::LLMClientTestCase::test_anthropic_provider_with_api_key

# Run with coverage
python -m pytest --cov=pgadmin/llm pgadmin/llm/tests/
```

### JavaScript Tests

From the `web` directory:

```bash
# Run all JavaScript tests
yarn run test:karma

# Run specific test file
yarn run test:karma -- --file regression/javascript/llm/AIReport.spec.js
```

## Test Coverage

### What's Tested

✅ LLM client initialization with all providers
✅ API key loading from files and environment
✅ Graceful handling of missing API keys
✅ User preference overrides
✅ Report generation for all categories (security, performance, design)
✅ Report generation for all levels (server, database, schema)
✅ Chat session management and history
✅ Streaming progress updates via SSE
✅ API endpoint authentication and authorization
✅ React component rendering in both themes
✅ Dark mode text color detection
✅ Error handling throughout the stack

### What's Mocked

- External LLM API calls (Anthropic, OpenAI, Ollama)
- PostgreSQL database connections
- File system access for API keys
- EventSource for SSE streaming
- Theme detection (window.getComputedStyle)

## Environment Variables for Testing

These environment variables can be set for integration testing with real APIs:

```bash
# For Anthropic
export ANTHROPIC_API_KEY="your-api-key"

# For OpenAI
export OPENAI_API_KEY="your-api-key"

# For Ollama
export OLLAMA_API_URL="http://localhost:11434"
```

**Note:** Tests are designed to pass without these variables set. They will mock API responses when keys are not available.

## Test Philosophy

1. **Graceful Degradation**: All tests pass even without API keys configured
2. **Mocking by Default**: External APIs are mocked to avoid dependencies
3. **Comprehensive Coverage**: Tests cover happy paths, error cases, and edge cases
4. **Documentation**: Tests serve as documentation for expected behavior
5. **Integration Ready**: Tests can be run with real APIs when keys are provided

## Adding New Tests

When adding new functionality to the LLM module:

1. Add unit tests to the appropriate test file
2. Mock external dependencies
3. Test both success and failure cases
4. Test with and without API keys/configuration
5. Update this README with new test coverage

## Troubleshooting

### Common Issues

**Import errors**: Make sure you're running tests from the `web` directory

**API key warnings**: These are expected - tests should pass without API keys

**Theme mocking errors**: Ensure `fake_theme.js` is available in regression/javascript/

**EventSource not found**: This is mocked in JavaScript tests, ensure mocks are properly set up
