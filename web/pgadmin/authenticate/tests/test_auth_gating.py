##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import unittest
import config
from pgadmin.authenticate.registry import AuthSourceRegistry


class TestAuthSourceRegistryGating(unittest.TestCase):
    """
    Test suite for SERVER_MODE gating of external authentication providers in
    AuthSourceRegistry.
    """

    def setUp(self):
        self._orig_server_mode = config.SERVER_MODE
        if AuthSourceRegistry._registry:
            self._orig_registry = dict(AuthSourceRegistry._registry)
        else:
            self._orig_registry = {}

        if AuthSourceRegistry._objects:
            self._orig_objects = dict(AuthSourceRegistry._objects)
        else:
            self._orig_objects = {}

    def tearDown(self):
        config.SERVER_MODE = self._orig_server_mode
        AuthSourceRegistry._registry = self._orig_registry
        AuthSourceRegistry._objects = self._orig_objects

    def _unload_external_auth_modules(self):
        external_modules = [
            'pgadmin.authenticate.kerberos',
            'pgadmin.authenticate.ldap',
            'pgadmin.authenticate.mfa',
            'pgadmin.authenticate.oauth2',
            'pgadmin.authenticate.webserver',
        ]
        for mod in external_modules:
            sys.modules.pop(mod, None)

    def _reset_registry(self):
        self._unload_external_auth_modules()
        AuthSourceRegistry._registry = dict()
        AuthSourceRegistry._objects = dict()

        if 'pgadmin.authenticate.internal' in sys.modules:
            internal_module = sys.modules['pgadmin.authenticate.internal']
            if hasattr(internal_module, 'InternalAuthentication'):
                AuthSourceRegistry._registry['internal'] = (
                    internal_module.InternalAuthentication
                )

    def test_desktop_mode_gating(self):
        """
        Verify that in desktop mode (SERVER_MODE = False), external
        authentication provider modules are not imported or registered.
        """
        config.SERVER_MODE = False
        self._reset_registry()

        AuthSourceRegistry.load_modules()

        registry_keys = list(AuthSourceRegistry._registry.keys())

        # Desktop mode must load 'internal' authentication
        self.assertIn('internal', registry_keys)

        # External providers must NOT be registered in desktop mode
        self.assertNotIn('kerberos', registry_keys)
        self.assertNotIn('ldap', registry_keys)
        self.assertNotIn('oauth2', registry_keys)
        self.assertNotIn('webserver', registry_keys)

        # Verify external modules were NOT imported into sys.modules
        self.assertNotIn('pgadmin.authenticate.kerberos', sys.modules)
        self.assertNotIn('pgadmin.authenticate.ldap', sys.modules)
        self.assertNotIn('pgadmin.authenticate.mfa', sys.modules)
        self.assertNotIn('pgadmin.authenticate.oauth2', sys.modules)
        self.assertNotIn('pgadmin.authenticate.webserver', sys.modules)

    def test_server_mode_loading(self):
        """
        Verify that in server mode (SERVER_MODE = True), external
        authentication provider modules are imported and registered.
        """
        config.SERVER_MODE = True
        self._reset_registry()

        # Dummy Flask-like app stub for init_app if called
        class MockLoginManager:
            logout_view = None

        class MockApp:
            def __init__(self):
                self.login_manager = MockLoginManager()

            def register_blueprint(self, *args, **kwargs):
                pass

            def register_logout_hook(self, *args, **kwargs):
                pass

            class Logger:
                def warning(self, *args, **kwargs):
                    pass

            logger = Logger()

        app = MockApp()
        AuthSourceRegistry.load_modules(app)

        registry_keys = list(AuthSourceRegistry._registry.keys())

        # Server mode must load all providers
        self.assertIn('internal', registry_keys)
        self.assertIn('kerberos', registry_keys)
        self.assertIn('ldap', registry_keys)
        self.assertIn('oauth2', registry_keys)
        self.assertIn('webserver', registry_keys)

        # Verify external modules WERE imported into sys.modules
        self.assertIn('pgadmin.authenticate.kerberos', sys.modules)
        self.assertIn('pgadmin.authenticate.ldap', sys.modules)
        self.assertIn('pgadmin.authenticate.mfa', sys.modules)
        self.assertIn('pgadmin.authenticate.oauth2', sys.modules)
        self.assertIn('pgadmin.authenticate.webserver', sys.modules)
