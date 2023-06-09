##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""This is the main application entry point for pgAdmin 4. If running on
a webserver, this will provide the WSGI interface, otherwise, we're going
to start a web server."""

import sys
if sys.version_info <= (3, 9):
    import select

if sys.version_info < (3, 4):
    raise RuntimeError('This application must be run under Python 3.4 '
                       'or later.')
import builtins
import os

# We need to include the root directory in sys.path to ensure that we can
# find everything we need when running in the standalone runtime.
if sys.path[0] != os.path.dirname(os.path.realpath(__file__)):
    sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))

# Grab the SERVER_MODE if it's been set by the runtime
if 'PGADMIN_SERVER_MODE' in os.environ:
    if os.environ['PGADMIN_SERVER_MODE'] == 'OFF':
        builtins.SERVER_MODE = False
    else:
        builtins.SERVER_MODE = True
else:
    builtins.SERVER_MODE = None

if (3, 10) > sys.version_info > (3, 8, 99) and os.name == 'posix':
    # Fix eventlet issue with Python 3.9.
    # Ref: https://github.com/eventlet/eventlet/issues/670
    # This was causing issue in psycopg3
    import select
    from eventlet import hubs
    hubs.use_hub("poll")

    import selectors
    selectors.DefaultSelector = selectors.PollSelector

import config
import setup
from pgadmin import create_app, socketio
from pgadmin.utils.constants import INTERNAL
# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION


##########################################################################
# Support reverse proxying
##########################################################################
class ReverseProxied():
    def __init__(self, app):
        self.app = app
        # https://werkzeug.palletsprojects.com/en/0.15.x/middleware/proxy_fix
        try:
            from werkzeug.middleware.proxy_fix import ProxyFix
            self.app = ProxyFix(app,
                                x_for=config.PROXY_X_FOR_COUNT,
                                x_proto=config.PROXY_X_PROTO_COUNT,
                                x_host=config.PROXY_X_HOST_COUNT,
                                x_port=config.PROXY_X_PORT_COUNT,
                                x_prefix=config.PROXY_X_PREFIX_COUNT
                                )
        except ImportError:
            pass

    def __call__(self, environ, start_response):
        script_name = environ.get("HTTP_X_SCRIPT_NAME", "")
        if script_name:
            environ["SCRIPT_NAME"] = script_name
            path_info = environ["PATH_INFO"]
            if path_info.startswith(script_name):
                environ["PATH_INFO"] = path_info[len(script_name):]
        scheme = environ.get("HTTP_X_SCHEME", "")
        if scheme:
            environ["wsgi.url_scheme"] = scheme
        return self.app(environ, start_response)


##########################################################################
# Sanity checks
##########################################################################
config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

# Check if the database exists. If it does not, create it.
setup_db_required = False
if not os.path.isfile(config.SQLITE_PATH):
    setup_db_required = True

##########################################################################
# Create the app and configure it. It is created outside main so that
# it can be imported
##########################################################################
app = create_app()
app.config['sessions'] = dict()

if setup_db_required:
    setup.setup_db(app)

# Authentication sources
if len(config.AUTHENTICATION_SOURCES) > 0:
    # Creating a temporary auth source list removing INTERNAL
    # This change is done to avoid selecting INTERNAL authentication when user
    # mistakenly keeps that the first option.
    auth_source = [x for x in config.AUTHENTICATION_SOURCES
                   if x != INTERNAL]
    app.PGADMIN_EXTERNAL_AUTH_SOURCE = auth_source[0] \
        if len(auth_source) > 0 else INTERNAL
else:
    app.PGADMIN_EXTERNAL_AUTH_SOURCE = INTERNAL

# Start the web server. The port number should have already been set by the
# runtime if we're running in desktop mode, otherwise we'll just use the
# Flask default.
app.PGADMIN_RUNTIME = False
app.logger.debug(
    'Config server mode: %s', config.SERVER_MODE
)
config.EFFECTIVE_SERVER_PORT = None
if 'PGADMIN_INT_PORT' in os.environ:
    port = os.environ['PGADMIN_INT_PORT']
    app.logger.debug(
        'Running under the desktop runtime, port: %s',
        port
    )
    config.EFFECTIVE_SERVER_PORT = int(port)
else:
    app.logger.debug(
        'Not running under the desktop runtime, port: %s',
        config.DEFAULT_SERVER_PORT
    )
    config.EFFECTIVE_SERVER_PORT = config.DEFAULT_SERVER_PORT

# Set the key if appropriate
if 'PGADMIN_INT_KEY' in os.environ:
    app.PGADMIN_INT_KEY = os.environ['PGADMIN_INT_KEY']
    app.logger.debug("Desktop security key: %s" % app.PGADMIN_INT_KEY)
    app.PGADMIN_RUNTIME = True
else:
    app.PGADMIN_INT_KEY = ''

if not app.PGADMIN_RUNTIME:
    app.wsgi_app = ReverseProxied(app.wsgi_app)


##########################################################################
# The entry point
##########################################################################
def main():
    # Set null device file path to stdout, stdin, stderr if they are None
    for _name in ('stdin', 'stdout', 'stderr'):
        if getattr(sys, _name) is None:
            setattr(sys, _name,
                    open(os.devnull, 'r' if _name == 'stdin' else 'w'))

    # Output a startup message if we're not under the runtime and startup.
    # If we're under WSGI, we don't need to worry about this
    if not app.PGADMIN_RUNTIME:
        print(
            "Starting %s. Please navigate to http://%s:%d in your browser." %
            (config.APP_NAME, config.DEFAULT_SERVER,
             config.EFFECTIVE_SERVER_PORT)
        )
        sys.stdout.flush()
    else:
        # For unknown reason the runtime does not pass the environment
        # variables (i.e. PYTHONHOME, and PYTHONPATH), to the Python
        # sub-processes, leading to failures executing background processes.
        #
        # This has been observed only on windows. On *nix systems, it is likely
        # picking the system python environment, which is good enough to run
        # the process-executor.
        #
        # Setting PYTHONHOME launch them properly.
        from pgadmin.utils import IS_WIN

        if IS_WIN:
            os.environ['PYTHONHOME'] = sys.prefix

    # Initialize Flask service only once
    # If `WERKZEUG_RUN_MAIN` is None, i.e: app is initializing for first time
    # so set `use_reloader` = False, thus reload won't call.
    # Reference:
    # https://github.com/pallets/werkzeug/issues/220#issuecomment-11176538
    try:
        if config.DEBUG:
            app.run(
                host=config.DEFAULT_SERVER,
                port=config.EFFECTIVE_SERVER_PORT,
                debug=config.DEBUG,
                use_reloader=(
                    (not app.PGADMIN_RUNTIME) and
                    os.environ.get("WERKZEUG_RUN_MAIN") is not None
                ),
                threaded=config.THREADED_MODE
            )
        else:
            try:
                socketio.run(
                    app,
                    debug=config.DEBUG,
                    allow_unsafe_werkzeug=True,
                    host=config.DEFAULT_SERVER,
                    port=config.EFFECTIVE_SERVER_PORT,
                )
            except KeyboardInterrupt:
                print("CLOSE SERVER")
                socketio.stop()

    except IOError:
        app.logger.error("Error starting the app server: %s", sys.exc_info())


##########################################################################
# Server startup
##########################################################################
if __name__ == '__main__':
    main()
