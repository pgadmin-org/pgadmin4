##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
import types

from flask import Flask, Response
import config

from pgadmin.authenticate.mfa import init_app as mfa_init_app


def init_dummy_auth_class():
    from pgadmin.authenticate.mfa.registry import BaseMFAuth

    class DummyAuth(BaseMFAuth):  # NOSONAR - S5603
        """
        A dummy authentication for testing the registry ability of adding
        'dummy' authentication method.

        Declaration is enough to use this class, we don't have to use it
        directly, as it will be initialized automatically by the registry, and
        ready to use.
        """

        @property
        def name(self):
            return "dummy"

        @property
        def label(self):
            return "Dummy"

        def validate(self, **kwargs):
            return true

        def validation_view(self):
            return "View"

        def registration_view(self):
            return "Registration"

        def register_url_endpoints(self, blueprint):
            print('Initialize the end-points for dummy auth')

    # FPSONAR_OFF


def test_create_dummy_app(name=__name__):
    import os
    import pgadmin
    from pgadmin.misc.themes import themes

    def index():
        return Response("<html><body>logged in</body></html>")

    template_folder = os.path.join(
        os.path.dirname(os.path.realpath(pgadmin.__file__)), 'templates'
    )
    app = Flask(name, template_folder=template_folder)
    config.MFA_ENABLED = True
    config.MFA_SUPPORTED_METHODS = ['tests.utils']
    app.config.from_object(config)
    app.config.update(dict(LOGIN_DISABLED=True))
    app.add_url_rule("/", "index", index, methods=("GET",))
    app.add_url_rule(
        "/favicon.ico", "redirects.favicon", index, methods=("GET",)
    )
    app.add_url_rule("/browser", "browser.index", index, methods=("GET",))
    app.add_url_rule("/tools", "tools.index", index, methods=("GET",))
    app.add_url_rule(
        "/users", "user_management.index", index, methods=("GET",)
    )
    app.add_url_rule(
        "/login", "security.logout", index, methods=("GET",)
    )
    app.add_url_rule(
        "/kerberos_logout", "authenticate.kerberos_logout", index,
        methods=("GET",)
    )

    def __dummy_logout_hook(self, blueprint):
        pass  # We don't need the logout url when dummy auth is enabled.

    app.register_logout_hook = types.MethodType(__dummy_logout_hook, app)

    themes(app)

    return app


def setup_mfa_app(test):
    test.app = test_create_dummy_app()
    mfa_init_app(test.app)
    test.tester = test.app.test_client()


class MockUserMFA():
    """Mock user for UserMFA"""
    def __init__(self, user_id, mfa_auth, options):
        self.user_id = user_id
        self.mfa_auth = mfa_auth
        self.options = options


class MockCurrentUserId():
    id = 1
