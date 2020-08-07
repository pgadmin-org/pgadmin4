##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""This is the main application entry point for pgAdmin 4. If running on
a webserver, this will provide the WSGI interface, otherwise, we're going
to start a web server."""


import sys

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
if 'SERVER_MODE' in globals():
    builtins.SERVER_MODE = globals()['SERVER_MODE']
else:
    builtins.SERVER_MODE = None

import config
from pgadmin import create_app
from pgadmin.utils import u_encode, fs_encoding, file_quote
# Get the config database schema version. We store this in pgadmin.model
# as it turns out that putting it in the config files isn't a great idea
from pgadmin.model import SCHEMA_VERSION


##########################################################################
# Support reverse proxying
##########################################################################
class ReverseProxied(object):
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
if not os.path.isfile(config.SQLITE_PATH):
    setup_py = os.path.join(
        os.path.dirname(os.path.realpath(u_encode(__file__, fs_encoding))),
        u'setup.py'
    )
    exec(open(file_quote(setup_py), 'r').read())


##########################################################################
# Create the app and configure it. It is created outside main so that
# it can be imported
##########################################################################
app = create_app()
app.debug = False
if config.SERVER_MODE:
    app.wsgi_app = ReverseProxied(app.wsgi_app)

# Authentication sources
app.PGADMIN_DEFAULT_AUTH_SOURCE = 'internal'
app.PGADMIN_SUPPORTED_AUTH_SOURCE = ['internal', 'ldap']
if len(config.AUTHENTICATION_SOURCES) > 0:
    app.PGADMIN_EXTERNAL_AUTH_SOURCE = config.AUTHENTICATION_SOURCES[0]
else:
    app.PGADMIN_EXTERNAL_AUTH_SOURCE = app.PGADMIN_DEFAULT_AUTH_SOURCE

app.logger.debug(
    "Authentication Source: %s" % app.PGADMIN_DEFAULT_AUTH_SOURCE)

# Start the web server. The port number should have already been set by the
# runtime if we're running in desktop mode, otherwise we'll just use the
# Flask default.
app.PGADMIN_RUNTIME = False
config.EFFECTIVE_SERVER_PORT = None
if 'PGADMIN_INT_PORT' in globals():
    app.logger.debug(
        'Running under the desktop runtime, port: %s',
        globals()['PGADMIN_INT_PORT']
    )
    config.EFFECTIVE_SERVER_PORT = int(globals()['PGADMIN_INT_PORT'])
    app.PGADMIN_RUNTIME = True
elif 'PGADMIN_INT_PORT' in os.environ:
    port = os.environ['PGADMIN_INT_PORT']
    app.logger.debug(
        'Not running under the desktop runtime, port: %s',
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
if 'PGADMIN_INT_KEY' in globals():
    app.PGADMIN_INT_KEY = globals()['PGADMIN_INT_KEY']
    app.logger.debug("Desktop security key: %s" % app.PGADMIN_INT_KEY)
else:
    app.PGADMIN_INT_KEY = ''


##########################################################################
# The entry point
##########################################################################
def main():
    # Set null device file path to stdout, stdin, stderr if they are None
    for _name in ('stdin', 'stdout', 'stderr'):
        if getattr(sys, _name) is None:
            setattr(sys, _name,
                    open(os.devnull, 'r' if _name == 'stdin' else 'w'))

    # Build Javascript files when DEBUG
    if config.DEBUG:
        from pgadmin.utils.javascript.javascript_bundler import \
            JavascriptBundler, JsState
        app.debug = True

        javascript_bundler = JavascriptBundler()
        javascript_bundler.bundle()
        if javascript_bundler.report() == JsState.NONE:
            app.logger.error(
                "Unable to generate javascript.\n"
                "To run the app ensure that yarn install command runs "
                "successfully"
            )
            raise RuntimeError("No generated javascript, aborting")

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
        # For unknown reason the Qt runtime does not pass the environment
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
        app.run(
            host=config.DEFAULT_SERVER,
            port=config.EFFECTIVE_SERVER_PORT,
            use_reloader=(
                (not app.PGADMIN_RUNTIME) and app.debug and
                os.environ.get("WERKZEUG_RUN_MAIN") is not None
            ),
            threaded=config.THREADED_MODE
        )

    except IOError:
        app.logger.error("Error starting the app server: %s", sys.exc_info())


##########################################################################
# Server startup
##########################################################################
if __name__ == '__main__':
    main()
