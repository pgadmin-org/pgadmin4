##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module implementing the Webserver authentication."""

import secrets
import string
import config
from flask import request, current_app, session, Response, render_template, \
    url_for
from flask_babel import gettext
from flask_security import login_user
from .internal import BaseAuthentication
from pgadmin.model import User
from pgadmin.tools.user_management import create_user
from pgadmin.utils.constants import WEBSERVER
from pgadmin.utils import PgAdminModule
from pgadmin.utils.csrf import pgCSRFProtect
from flask_security.utils import logout_user


class WebserverModule(PgAdminModule):
    def register(self, app, options):
        # Do not look for the sub_modules,
        # instead call blueprint.register(...) directly
        super().register(app, options)

    def get_exposed_url_endpoints(self):
        return ['webserver.login',
                'webserver.logout']


def init_app(app):
    MODULE_NAME = 'webserver'

    blueprint = WebserverModule(MODULE_NAME, __name__, static_url_path='')

    @blueprint.route("/login",
                     endpoint="login", methods=["GET"])
    @pgCSRFProtect.exempt
    def webserver_login():
        logout_user()
        return Response(render_template("browser/kerberos_login.html",
                                        login_url=url_for('security.login'),
                                        ))

    @blueprint.route("/logout",
                     endpoint="logout", methods=["GET"])
    @pgCSRFProtect.exempt
    def webserver_logout():
        logout_user()
        return Response(render_template("browser/kerberos_logout.html",
                                        login_url=url_for('security.login'),
                                        ))

    app.register_blueprint(blueprint)


class WebserverAuthentication(BaseAuthentication):
    LOGIN_VIEW = 'webserver.login'
    LOGOUT_VIEW = 'webserver.logout'

    def get_source_name(self):
        return WEBSERVER

    def get_friendly_name(self):
        return gettext("webserver")

    def validate(self, form):
        return True, None

    def get_user(self):
        username = request.environ.get(config.WEBSERVER_REMOTE_USER)
        if not username:
            # One more try to get the Remote User from the hearders
            username = request.headers.get(config.WEBSERVER_REMOTE_USER)
        return username

    def authenticate(self, form):
        username = self.get_user()

        if not username:
            return False, gettext(
                "Webserver authenticate failed.")

        session['pass_enc_key'] = ''.join(
            (secrets.choice(string.ascii_lowercase) for _ in range(10)))
        useremail = request.environ.get('mail')
        if not useremail:
            useremail = ''
        return self.__auto_create_user(username, '')

    def login(self, form):
        username = self.get_user()
        if username:
            user = User.query.filter_by(username=username).first()
            status = login_user(user)
            if not status:
                current_app.logger.exception(self.messages('LOGIN_FAILED'))
                return False, self.messages('LOGIN_FAILED')
            return True, None
        return False, self.messages('LOGIN_FAILED')

    def __auto_create_user(self, username, useremail):
        """Add the webserver user to the internal SQLite database."""
        if config.WEBSERVER_AUTO_CREATE_USER:
            user = User.query.filter_by(username=username).first()
            if not user:
                return create_user({
                    'username': username,
                    'email': useremail,
                    'role': 2,
                    'active': True,
                    'auth_source': WEBSERVER
                })
        return True, None
