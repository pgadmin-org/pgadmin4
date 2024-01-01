##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import re
import flask
from flask import current_app, testing

from werkzeug.datastructures import Headers
from werkzeug.test import EnvironBuilder
from flask_wtf.csrf import generate_csrf
import config
import sys


class RequestShim():
    """
    A fake request that proxies cookie-related methods to a Flask test client.
    """
    def __init__(self, client):
        self.client = client

    def set_cookie(self, key, value='', *args, **kwargs):
        "Set the cookie on the Flask test client."
        if sys.version_info <= (3, 7, 9999):
            server_name = current_app.config["SERVER_NAME"] or "localhost"
            return self.client.set_cookie(
                server_name, key=key, value=value, *args, **kwargs
            )

        if kwargs['domain'] is None:
            kwargs['domain'] = current_app.config["SERVER_NAME"] or "localhost"

        return self.client.set_cookie(
            key=key, value=value, *args, **kwargs
        )

    def delete_cookie(self, key, *args, **kwargs):
        "Delete the cookie on the Flask test client."
        server_name = current_app.config["SERVER_NAME"] or "localhost"
        return self.client.delete_cookie(
            server_name, key=key, *args, **kwargs
        )


class TestClient(testing.FlaskClient):

    def __init__(self, *args, **kwargs):
        self.csrf_token = None
        self.app = None
        super().__init__(*args, **kwargs)

    def setApp(self, _app):
        self.app = _app

    def open(self, *args, **kwargs):
        if len(args) > 0 and isinstance(args[0], (EnvironBuilder, dict)):
            return super().open(*args, **kwargs)

        data = kwargs.get('data', {})

        if self.csrf_token is not None and not (
            'email' in data and
            'password' in data and
            'csrf_token' in data
        ):
            api_key_headers = Headers({})
            api_key_headers[
                getattr(config, 'WTF_CSRF_HEADERS', ['X-CSRFToken'])[0]
            ] = self.csrf_token
            headers = kwargs.pop('headers', Headers())
            headers.extend(api_key_headers)
            kwargs['headers'] = headers

        return super().open(*args, **kwargs)

    def fetch_csrf(self, res):
        m = re.search(
            b'<input id="csrf_token" name="csrf_token" type="hidden"'
            b' value="([^"]*)">', res.data
        )

        if m is None:
            # When login through Kerberos, we won't find the CSRF
            return None

        return m.group(1).decode("utf-8")

    def generate_csrf_token(self, *args, **kwargs):
        # First, we'll wrap our request shim around the test client, so
        # that it will work correctly when Flask asks it to set a cookie.
        request = RequestShim(self)
        # Next, we need to look up any cookies that might already exist on
        # this test client, such as the secure cookie that
        # powers `flask.session`,
        # and make a test request context that has those cookies in it.
        environ_overrides = {
            'wsgi.url_scheme': ''
        }
        if sys.version_info <= (3, 7, 9999):
            self.cookie_jar.inject_wsgi(environ_overrides)
        else:
            self._add_cookies_to_wsgi(environ_overrides)

        with self.app.test_request_context():
            # Now, we call Flask-WTF's method of generating a CSRF token...
            csrf_token = generate_csrf()
            # ...which also sets a value in `flask.session`, so we need to
            # ask Flask to save that value to the cookie jar in the test
            # client. This is where we actually use that request shim we
            # made!
            self.app.session_interface.save_session(
                self.app, flask.session, request)

            return csrf_token

    def login(self, email, password, _follow_redirects=False,
              headers=None, extra_form_data=dict()):
        csrf_token = None
        if config.SERVER_MODE is True:
            res = self.get('/login',
                           follow_redirects=_follow_redirects)
            csrf_token = self.fetch_csrf(res)

        if csrf_token is None:
            csrf_token = self.generate_csrf_token()

        form_data = dict(
            email=email,
            password=password,
            csrf_token=csrf_token
        )

        if extra_form_data:
            form_data.update(extra_form_data)

        res = self.post(
            '/authenticate/login', data=form_data,
            follow_redirects=_follow_redirects,
            headers=headers
        )
        self.csrf_token = csrf_token

        return res

    def logout(self):
        self.get('/logout?next=/browser/', follow_redirects=False)
        self.csrf_token = None
