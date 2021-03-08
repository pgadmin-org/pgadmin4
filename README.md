# pgAdmin 4 

pgAdmin 4 is a rewrite of the popular pgAdmin3 management tool for the
PostgreSQL (http://www.postgresql.org) database. 

In the following documentation and examples, *$PGADMIN4_SRC/* is used to denote
the top-level directory of a copy of the pgAdmin source tree, either from a
tarball or a git checkout.

## Architecture

pgAdmin 4 is written as a web application in Python, using jQuery and Bootstrap
for the client side processing and UI. On the server side, Flask is being
utilised.

Although developed using web technologies, pgAdmin 4 can be deployed either on
a web server using a browser, or standalone on a workstation. The runtime/
subdirectory contains an NWjs based runtime application intended to allow this,
which will execute the Python server and display the UI.

## Building the Runtime

To build the runtime, the following packages must be installed:

* NodeJS 12+
* Yarn

Change into the runtime directory, and run *yarn install*. This will install the
dependencies required.

In order to use the runtime in a development environment, you'll need to copy
*dev_config.json.in* file to *dev_config.json*, and edit the paths to the Python
executable and *pgAdmin.py* file, otherwise the runtime will use the default
paths it would expect to find in the standard package for your platform.

You can then execute the runtime by running something like:

    node_modules/nw/nwjs/nw .

or on macOS:

    node_modules/nw/nwjs/nwjs.app/Contents/MacOS/nwjs .

# Create Database Migrations

In order to make changes to the SQLite DB, navigate to the 'web' directory:

    (pgadmin4) $ cd $PGADMIN4_SRC/web

Create a migration file with the following command:

    (pgadmin4) $ FLASK_APP=pgAdmin4.py flask db revision

This will create a file in: $PGADMIN4_SRC/web/migrations/versions/ .
Add any changes to the 'upgrade' function.
Increment the SCHEMA_VERSION in $PGADMIN4_SRC/web/pgadmin/model/__init__.py file.

There is no need to increment the SETTINGS_SCHEMA_VERSION.

# Configuring the Python Environment

In order to run the Python code, a suitable runtime environment is required.
Python version 3.6 and later are currently supported. It is recommended that a
Python Virtual Environment is setup for this purpose, rather than using the
system Python environment. On Linux and Mac systems, the process is fairly
simple - adapt as required for your distribution:

1. Install the virtualenv packages into the system Python environment

       $ sudo pip install virtualenv virtualenvwrapper

2. Source the virtualenv wrapper tools script. You may want to add this command
   to your ~/.bash_profile file for future convenience:

       $ source /usr/local/bin/virtualenvwrapper.sh

3. Create a virtual environment:

       $ mkvirtualenv pgadmin4

   To make use of the virtual environment in the future, use the following
   command to re-activate it:

       $ workon pgadmin4

4. Ensure that a PostgreSQL installation's bin/ directory is in the path (so
   pg_config can be found for building psycopg2), and install the required
   packages:

       (pgadmin4) $ PATH=$PATH:/usr/local/pgsql/bin pip install -r $PGADMIN4_SRC/requirements.txt

   If you are planning to run the regression tests, you also need to install
   additional requirements from web/regression/requirements.txt:

       (pgadmin4) $ pip install -r $PGADMIN4_SRC/web/regression/requirements.txt

5. Create a local configuration file for pgAdmin. Edit
   $PGADMIN4_SRC/web/config_local.py and add any desired configuration options
   (use the config.py file as a reference - any settings duplicated in
   config_local.py will override those in config.py). A typical development
   configuration may look like:
    ```python
    from config import *

    # Debug mode
    DEBUG = True

    # App mode
    SERVER_MODE = True

    # Enable the test module
    MODULE_BLACKLIST.remove('test')

    # Log
    CONSOLE_LOG_LEVEL = DEBUG
    FILE_LOG_LEVEL = DEBUG

    DEFAULT_SERVER = '127.0.0.1'

    UPGRADE_CHECK_ENABLED = True

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
   This configuration allows easy switching between server and desktop modes
   for testing.

6. The initial setup of the configuration database is interactive in server
   mode, and non-interactive in desktop mode. You can run it either by
   running:

       (pgadmin4) $ python $PGADMIN4_SRC/web/setup.py

   or by starting pgAdmin 4:

       (pgadmin4) $ python $PGADMIN4_SRC/web/pgAdmin4.py

   Whilst it is possible to automatically run setup in desktop mode by running
   the runtime, that will not work in server mode as the runtime doesn't allow
   command line interaction with the setup program.

At this point you will be able to run pgAdmin 4 from the command line in either
server or desktop mode, and access it from a web browser using the URL shown in
the terminal once pgAdmin has started up.

Setup of an environment on Windows is somewhat more complicated unfortunately,
please see *pkg/win32/README.txt* for complete details.

Once a virtual environment has been created and enabled, setup can continue
from step 4 above.

## Building the Web Assets

pgAdmin is dependent on a number of third party Javascript libraries. These,
along with it's own Javascript code, SCSS/CSS code and images must be
compiled into a "bundle" which is transferred to the browser for execution
and rendering. This is far more efficient than simply requesting each
asset as it's needed by the client.

To create the bundle, you will need the 'yarn' package management tool to be
installed. Then, you can run the following commands on a *nix system to
download the required packages and build the bundle:

    (pgadmin4) $ cd $PGADMIN4_SRC
    (pgadmin4) $ make install-node
    (pgadmin4) $ make bundle

On Windows systems (where "make" is not available), the following commands
can be used:

    C:\> cd $PGADMIN4_SRC\web
    C:\$PGADMIN4_SRC\web> yarn install
    C:\$PGADMIN4_SRC\web> yarn run bundle

## Creating pgAdmin themes

To create a pgAdmin theme, you need to create a directory under
*web/pgadmin/static/scss/resources*.
Copy the sample file *_theme.variables.scss.sample* to the new directory and
rename it to *_theme.variables.scss*. Change the desired hexadecimal values of
the colors and bundle pgAdmin. You can also add a preview image in the theme
directory with the name as *\<dir name>_preview.png*. It is recommended that the
preview image should not be larger in size as it may take time to load on slow
networks. Run the *yarn run bundle* and you're good to go. No other changes are
required, pgAdmin bundle will read the directory and create other required
entries to make them available in preferences.

The name of the theme is derived from the directory name. Underscores (_) and
hyphens (-) will be replaced with spaces and the result will be camel cased.

# Building the documentation

In order to build the docs, an additional Python package is required in the
virtual environment. This can be installed with the pip package manager:

    $ workon pgadmin4
    (pgadmin4) $ pip install Sphinx
    
The docs can then be built using the Makefile in *$PGADMIN4_SRC*, e.g.

    (pgadmin4) $ make docs

The output can be found in *$PGADMIN4_SRC/docs/en_US/_build/html/index.html*

# Building packages

Most packages can be built using the Makefile in $PGADMIN4_SRC, provided all
the setup and configuration above has been completed.

To build a source tarball:

    (pgadmin4) $ make src

To build a PIP Wheel, activate either a Python 3 virtual environment, configured 
with all the required packages, and then run:

    (pgadmin4) $ make pip

To build the macOS AppBundle, please see *pkg/mac/README*.

To build the Windows installer, please see *pkg/win32/README.txt*.

## Support

See https://www.pgadmin.org/support/ for support options.

## Project info

The source code repository can be found here:

http://git.postgresql.org/gitweb/?p=pgadmin4.git;a=summary

A Redmine project for pgAdmin 4 can be found at the address below. A PostgreSQL
community account is required to access this site. Please note that at present
only project developers can log bug and feature requests:

https://redmine.postgresql.org/projects/pgadmin4

If you wish to discuss pgAdmin 4, or contribute to the project, please use the
pgAdmin Hackers mailing list:

pgadmin-hackers@postgresql.org
