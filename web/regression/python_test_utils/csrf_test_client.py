##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import re
import flask
from flask import current_app, request, session, testing

from werkzeug.datastructures import Headers
from werkzeug.test import EnvironBuilder
from flask_wtf.csrf import generate_csrf
import config


class RequestShim(object):
    """
    A fake request that proxies cookie-related methods to a Flask test client.
    """
    def __init__(self, client):
        self.client = client

    def set_cookie(self, key, value='', *args, **kwargs):
        "Set the cookie on the Flask test client."
        server_name = current_app.config["SERVER_NAME"] or "localhost"
        return self.client.set_cookie(
            server_name, key=key, value=value, *args, **kwargs
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
        super(TestClient, self).__init__(*args, **kwargs)

    def setApp(self, _app):
        self.app = _app

    def open(self, *args, **kwargs):
        if len(args) > 0 and isinstance(args[0], (EnvironBuilder, dict)):
            return super(TestClient, self).open(*args, **kwargs)

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

        return super(TestClient, self).open(*args, **kwargs)

    def fetch_csrf(self, res):
        m = re.search(
            b'<input id="csrf_token" name="csrf_token" type="hidden"'
            b' value="([^"]*)">', res.data
        )

        return m.group(1).decode("utf-8")

    def generate_csrf_token(self, *args, **kwargs):
        # First, we'll wrap our request shim around the test client, so
        # that it will work correctly when Flask asks it to set a cookie.
        request = RequestShim(self)
        # Next, we need to look up any cookies that might already exist on
        # this test client, such as the secure cookie that
        # powers `flask.session`,
        # and make a test request context that has those cookies in it.
        environ_overrides = {}
        self.cookie_jar.inject_wsgi(environ_overrides)
        with self.app.test_request_context(
            "/login", environ_overrides=environ_overrides,
        ):
            # Now, we call Flask-WTF's method of generating a CSRF token...
            csrf_token = generate_csrf()
            # ...which also sets a value in `flask.session`, so we need to
            # ask Flask to save that value to the cookie jar in the test
            # client. This is where we actually use that request shim we
            # made!
            self.app.save_session(flask.session, request)

            return csrf_token

    def login(self, email, password, _follow_redirects=False,
              headers=None):
        if config.SERVER_MODE is True:
            res = self.get('/login', follow_redirects=True)
            csrf_token = self.fetch_csrf(res)
        else:
            csrf_token = self.generate_csrf_token()

        res = self.post(
            '/authenticate/login', data=dict(
                email=email, password=password,
                csrf_token=csrf_token,
            ),
            follow_redirects=_follow_redirects,
            headers=headers
        )
        self.csrf_token = csrf_token

        return res

    def logout(self):
        self.get('/logout?next=/browser/', follow_redirects=False)
        self.csrf_token = None
