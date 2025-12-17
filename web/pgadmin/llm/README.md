# pgAdmin LLM Integration

This module provides AI/LLM functionality for pgAdmin, including database security analysis, performance reports, and design reviews powered by large language models.

## Features

- **Security Reports**: Analyze database configurations for security issues
- **Performance Reports**: Get optimization recommendations for databases
- **Design Reviews**: Review schema design and structure
- **Streaming Reports**: Real-time report generation with progress updates via Server-Sent Events (SSE)

## Supported LLM Providers

- **Anthropic Claude** (recommended)
- **OpenAI GPT**
- **Ollama** (local models)

## Configuration

Configure LLM providers in `config.py`:

- `DEFAULT_LLM_PROVIDER`: Set to 'anthropic', 'openai', or 'ollama'
- `ANTHROPIC_API_KEY_FILE`: Path to file containing Anthropic API key
- `OPENAI_API_KEY_FILE`: Path to file containing OpenAI API key
- `OLLAMA_API_URL`: URL for Ollama server (e.g., 'http://localhost:11434')

If API keys are not found, the LLM features will be gracefully disabled.

## Testing

### Python Tests

The Python test suite uses pgAdmin's existing test framework based on `BaseTestGenerator` with the scenarios pattern.

Run all LLM tests:
```bash
cd web/regression
python3 runtests.py --pkg llm
```

Run specific test modules:
```bash
python3 runtests.py --pkg llm --modules test_llm_status
python3 runtests.py --pkg llm --modules test_report_endpoints
```

### JavaScript Tests

The JavaScript test suite uses Jest with React Testing Library.

Run all JavaScript tests (including LLM tests):
```bash
cd web
yarn run test:js
```

Run only LLM JavaScript tests:
```bash
cd web
yarn run test:js-once -- llm
```

### Test Coverage

The tests use mocking to avoid requiring actual LLM API credentials. All external dependencies (utility functions, report generators) are mocked, allowing the tests to run in CI/CD environments without any API keys configured.

Test files:
- `tests/test_llm_status.py` - Tests LLM client initialization and status endpoint
- `tests/test_report_endpoints.py` - Tests report generation endpoints at server, database, and schema levels
- `regression/javascript/llm/AIReport.spec.js` - Tests React component for report display

## Architecture

- `client.py` - LLM client abstraction layer supporting multiple providers
- `reports/` - Report generation system
  - `generator.py` - Main report generation logic
  - `security.py` - Security analysis prompts and logic
  - `performance.py` - Performance analysis prompts and logic
  - `design.py` - Design review prompts and logic
- `views.py` - Flask endpoints for reports and chat
- `static/js/AIReport.jsx` - React component for displaying reports with dark mode support

## Usage

Access AI reports through the pgAdmin browser tree:
1. Right-click on a server, database, or schema
2. Select "AI Analysis" submenu
3. Choose report type (Security, Performance, or Design)
4. View streaming report generation with progress updates
5. Download reports as markdown files
