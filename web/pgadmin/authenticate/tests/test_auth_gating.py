##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that external authentication providers are only loaded in server
mode, and that desktop mode is left with internal authentication alone.
"""

import sys

import config
from pgadmin.authenticate.registry import AuthSourceRegistry
from pgadmin.utils.route import BaseTestGenerator

# Providers registered as authentication sources. MFA is deliberately absent:
# it is loaded by the same registry but registers no auth source of its own.
EXTERNAL_SOURCES = ['kerberos', 'ldap', 'oauth2', 'webserver']

# Modules whose import can be asserted on. mfa is excluded because
# pgadmin/browser/__init__.py and pgadmin/user_login_check.py both import
# pgadmin.authenticate.mfa.utils unconditionally, so the mfa package is
# present in sys.modules in desktop mode whatever this registry does.
EXTERNAL_MODULES = [
    'pgadmin.authenticate.{0}'.format(name) for name in EXTERNAL_SOURCES
]


class AuthSourceGatingTestCase(BaseTestGenerator):
    """Checks AuthSourceRegistry.load_modules() honours config.SERVER_MODE."""

    scenarios = [
        ('desktop mode registers internal authentication only',
         dict(server_mode=False)),
        ('server mode registers every external provider',
         dict(server_mode=True)),
    ]

    # Pure registry-contract test - no Postgres server interaction needed, so
    # skip BaseTestGenerator.setUp's connect_server().
    def setUp(self):
        self._orig_server_mode = config.SERVER_MODE
        self._orig_registry = dict(AuthSourceRegistry._registry or {})
        self._orig_objects = dict(AuthSourceRegistry._objects or {})

    def tearDown(self):
        config.SERVER_MODE = self._orig_server_mode
        AuthSourceRegistry._registry = self._orig_registry
        AuthSourceRegistry._objects = self._orig_objects

    def _reset_registry(self):
        """Empty the registry and drop the external provider modules, so that
        load_modules() is observed importing them (or not) from scratch.
        """
        for module in EXTERNAL_MODULES:
            sys.modules.pop(module, None)

        AuthSourceRegistry._registry = dict()
        AuthSourceRegistry._objects = dict()

        internal = sys.modules.get('pgadmin.authenticate.internal')
        if internal is not None and \
                hasattr(internal, 'InternalAuthentication'):
            AuthSourceRegistry._registry['internal'] = \
                internal.InternalAuthentication

    def runTest(self):
        config.SERVER_MODE = self.server_mode
        self._reset_registry()

        AuthSourceRegistry.load_modules(_MockApp() if self.server_mode
                                        else None)

        registered = list(AuthSourceRegistry._registry.keys())
        self.assertIn(
            'internal', registered,
            "Internal authentication must be registered in both modes")

        for source, module in zip(EXTERNAL_SOURCES, EXTERNAL_MODULES):
            if self.server_mode:
                self.assertIn(
                    source, registered,
                    "{0} must be registered in server mode".format(source))
                self.assertIn(
                    module, sys.modules,
                    "{0} must be imported in server mode".format(module))
            else:
                self.assertNotIn(
                    source, registered,
                    "{0} must not be registered in desktop mode".format(
                        source))
                self.assertNotIn(
                    module, sys.modules,
                    "{0} must not be imported in desktop mode".format(module))


class _MockApp:
    """The minimum Flask-like surface the providers' init_app() touches."""

    class _LoginManager:
        logout_view = None

    class _Logger:
        def warning(self, *args, **kwargs):
            pass

    def __init__(self):
        self.login_manager = self._LoginManager()
        self.logger = self._Logger()

    def register_blueprint(self, *args, **kwargs):
        pass

    def register_logout_hook(self, *args, **kwargs):
        pass
