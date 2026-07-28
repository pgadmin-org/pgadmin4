# Contributing to pgAdmin 4

Thank you for your interest in contributing to pgAdmin 4.

## Contents

- Getting Started
- Reporting Issues
- Making Changes
- Pull Requests
- AI-assisted Contributions
- Development Setup
- Database Migrations
- Security Issues
- Community and Support
- License

## Getting Started

Before starting work, please review the project documentation and familiarize yourself with the architecture and development workflow.

### Architecture

pgAdmin 4 is written as a web application with Python (Flask) on the server side and ReactJS, HTML5 with CSS for the client side processing and UI.

Although developed using web technologies, pgAdmin 4 can be deployed either on a web server using a browser, or standalone on a workstation. The [runtime/](runtime/) subdirectory contains an Electron-based runtime application intended to allow this, which will fork a Python server process and display the UI.

For a fuller introduction to the codebase, see the [code overview](docs/en_US/code_overview.rst).

If you are new to the codebase, consider starting with smaller bug fixes or documentation improvements before working on larger changes.

The Sphinx documentation also includes contributor guidance for [coding standards](docs/en_US/coding_standards.rst), [submitting pull requests](docs/en_US/submitting_pull_requests.rst), [code review](docs/en_US/code_review.rst), and [translations](docs/en_US/translations.rst).

## Reporting Issues

When reporting a bug:

- Search existing issues first.
- If a similar issue exists, add any additional information or context you have. Do not create a duplicate issue.
- Provide clear steps to reproduce the issue.
- Include relevant environment and version information.
- Attach screenshots, logs, or error messages when appropriate.

For feature requests, describe the problem being solved and the expected behavior. 


## Making Changes

When working on a contribution:

- Keep changes focused and easy to review.
- Follow existing coding patterns and conventions, including the [coding standards](docs/en_US/coding_standards.rst).
- Avoid unrelated refactoring and changes in the same commit.
- Keep commit messages clear and descriptive.
- Update tests or documentation when necessary.

## Pull Requests

Before opening a pull request:

- Ensure your changes build successfully.
- Test your changes locally.
- Review your code before submission.
- Update your branch with the latest changes from `master` upstream when appropriate.

When opening a pull request:

- Clearly describe the change.
- Explain the reason for the change.
- Include screenshots or recordings for UI-related changes when applicable.
- Submit any changes as Pull Requests against the `master` branch of the [pgadmin-org/pgadmin4](https://github.com/pgadmin-org/pgadmin4) repository.

Use a clear pull request title that describes the change. Short prefixes such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, and `chore:` are useful when they match the change being made. Branch names are contributor-local and do not need to follow a project-specific naming convention.

For more detail, see the [pull request submission guide](docs/en_US/submitting_pull_requests.rst) and [code review guide](docs/en_US/code_review.rst).

## AI-assisted Contributions

Contributors are responsible for understanding, testing, and standing behind everything they submit, whether or not AI tools were used. Please do not open large numbers of auto-generated issues or pull requests without first discussing that work with the maintainers.

## Development Setup

In the following documentation and examples, `$PGADMIN4_SRC` is used to denote the top-level directory of your copy of the pgAdmin source tree (either from a tarball or a git checkout).

### Prerequisites

1. Install Node.js 20 and above (https://nodejs.org/en/download)
2. yarn (https://yarnpkg.com/getting-started/install)
3. Python 3.9 and above (https://www.python.org/downloads/)
4. PostgreSQL server (https://www.postgresql.org/download)

Start by enabling Corepack, if it isn't already; this will add the yarn binary to your PATH:

```bash
corepack enable
```

### Building Web Assets

pgAdmin is dependent on a number of third-party JavaScript libraries. These, along with its own JavaScript code, CSS code and images must be compiled into a "bundle" which is transferred to the browser for execution and rendering. This is far more efficient than simply requesting each asset as it is needed by the client.

To create the bundle, you will need the 'yarn' package management tool to be installed. Then, you can run the following commands on a *nix system to download the required packages and build the bundle:

```bash
$ cd $PGADMIN4_SRC
$ make install-node
$ make bundle
```

On Windows systems (where "make" is not available), the following commands can be used:

```bat
C:\> cd $PGADMIN4_SRC\web
C:\$PGADMIN4_SRC\web> yarn install
C:\$PGADMIN4_SRC\web> yarn run bundle
```

### Python Environment

In order to run the Python code, a suitable runtime environment is required. Python version 3.9 and later are currently supported. It is recommended that a Python virtual environment is set up for this purpose, rather than using the system Python environment. On Linux and Mac systems, the process is fairly simple - adapt as required for your distribution:

1. Create a virtual environment in an appropriate directory. The last argument is the name of the environment; that can be changed as desired:

   ```bash
   $ python3 -m venv venv
   ```

2. Now activate the virtual environment:

   ```bash
   $ source venv/bin/activate
   ```

   On Windows:

   ```bash
   venv\Scripts\activate
   ```

3. Some of the components used by pgAdmin require a very recent version of *pip*, so update that to the latest:

   ```bash
   (venv) $ pip install --upgrade pip
   ```

4. Ensure that a PostgreSQL installation's bin/ directory is in the path (so pg_config can be found for building psycopg3), and install the required packages:

   ```bash
   (venv) $ PATH=$PATH:/usr/local/pgsql/bin pip install -r $PGADMIN4_SRC/requirements.txt
   ```

   If you are planning to run the regression tests, you also need to install additional requirements from `web/regression/requirements.txt`:

   ```bash
   (venv) $ pip install -r $PGADMIN4_SRC/web/regression/requirements.txt
   ```

### Configuration

Create a local configuration file for pgAdmin. Edit `$PGADMIN4_SRC/web/config_local.py` and add any desired configuration options (use the `config.py` file as a reference - any settings duplicated in `config_local.py` will override those in `config.py`). A typical development configuration may look like:

```python
import os
import logging

# Change pgAdmin data directory
DATA_DIR = '/Users/myuser/.pgadmin_dev'

# Change pgAdmin server and port
DEFAULT_SERVER = '127.0.0.1'
DEFAULT_SERVER_PORT = 5051

# Switch between server and desktop mode
SERVER_MODE = True

# Change pgAdmin config DB path in case an external DB is used.
CONFIG_DATABASE_URI="postgresql://postgres:postgres@localhost:5436/pgadmin"

# Set up SMTP
MAIL_SERVER = 'smtp.gmail.com'
MAIL_PORT = 465
MAIL_USE_SSL = True
MAIL_USERNAME = 'user@gmail.com'
MAIL_PASSWORD = 'xxxxxxxxxx'

# Change log level
CONSOLE_LOG_LEVEL = logging.INFO
FILE_LOG_LEVEL = logging.INFO

# Use a different config DB for each server mode.
if SERVER_MODE == False:
  SQLITE_PATH = os.path.join(
      DATA_DIR,
      'pgadmin4-desktop.db'
  )
else:
  SQLITE_PATH = os.path.join(
      DATA_DIR,
      'pgadmin4-server.db'
  )
```

This configuration allows easy switching between server and desktop modes for testing.

### Running pgAdmin

The initial setup of the configuration database is interactive in server mode, and non-interactive in desktop mode. You can run it either by running:

```bash
(venv) $ python3 $PGADMIN4_SRC/web/setup.py
```

or by starting pgAdmin 4:

```bash
(venv) $ python3 $PGADMIN4_SRC/web/pgAdmin4.py
```

Whilst it is possible to automatically run setup in desktop mode by running the runtime, that will not work in server mode as the runtime doesn't allow command line interaction with the setup program.

At this point you will be able to run pgAdmin 4 from the command line in either server or desktop mode, and access it from a web browser using the URL shown in the terminal once pgAdmin has started up.

Setup of an environment on Windows is somewhat more complicated unfortunately, please see `pkg/win32/README.md` for complete details.

### Building the documentation

In order to build the docs, an additional Python package is required in the virtual environment. This can be installed with the pip package manager:

```bash
$ source venv/bin/activate
(venv) $ pip install Sphinx
(venv) $ pip install sphinxcontrib-youtube
```

The docs can then be built using the Makefile in `$PGADMIN4_SRC`, e.g.

```bash
(venv) $ make docs
```

The output can be found in `$PGADMIN4_SRC/docs/en_US/_build/html/index.html`

### Runtime Development

For Electron runtime development:

1. Navigate to the `runtime` directory.
2. Install dependencies:

```bash
yarn install
```

3. Copy:

```text
dev_config.json.in
```

to:

```text
dev_config.json
```

4. Update the paths to your Python executable and `pgAdmin4.py`.

Start the runtime:

```bash
yarn run start
```

### Building packages

Most packages can be built using the Makefile in `$PGADMIN4_SRC`, provided all the setup and configuration above has been completed.

To build a source tarball:

```bash
(venv) $ make src
```

To build a PIP Wheel, activate either a Python 3 virtual environment, configured with all the required packages, and then run:

```bash
(venv) $ make pip
```

To build the macOS AppBundle, please see `pkg/mac/README.md`.

To build the Windows installer, please see `pkg/win32/README.md`.

## Database Migrations

In order to make changes to the SQLite DB, navigate to the 'web' directory:

```bash
(venv) $ cd $PGADMIN4_SRC/web
```

Create a migration file with the following command:

```bash
(venv) $ FLASK_APP=pgAdmin4.py flask db revision
```

This will create a file in `$PGADMIN4_SRC/web/migrations/versions/`. Add any changes to the `upgrade` function.

When making schema changes, update the `SCHEMA_VERSION` value in:

```text
web/pgadmin/model/__init__.py
```

There is no need to increment the `SETTINGS_SCHEMA_VERSION`.

## Security Issues

**Do not report security vulnerabilities through GitHub issues.**

Potential security issues should be reported to: 
`security@pgadmin.org`.

Note that this **address should only be used for reporting security issues** that you believe you've found in the design or code of pgAdmin, pgAgent, and the pgAdmin website. It **should not be used to ask security questions**.

If you are unsure whether an issue is a security vulnerability, please lean on the side of caution and report it to the above address. The pgAdmin team will review the report and respond as appropriate.

## Community and Support

For development discussions, use:

`pgadmin-hackers@postgresql.org`

For support options, visit the [pgAdmin support page](https://www.pgadmin.org/support/).

Use the [GitHub issue tracker](https://github.com/pgadmin-org/pgadmin4/issues) for reporting bugs and requesting features, but please follow the guidelines outlined in the "Reporting Issues" section above.

## License

By contributing to pgAdmin 4, you agree that your contributions will be licensed under the project's existing and future license terms.
