##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
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
        # Modern pgAdmin emits the CSRF token to the SPA frontend in two
        # JSON shapes:
        #   * `"csrfToken": "..."` inside a JSON config block embedded in
        #     the /login HTML (camelCase, used by JS bootstrap).
        #   * `"csrf_token": "..."` at the top level of pure JSON API
        #     responses (snake_case, e.g. /browser/change_password).
        # Match either.
        for pattern in (
            rb'"csrfToken":\s*"([^"]*)"',
            rb'"csrf_token":\s*"([^"]*)"',
        ):
            m = re.search(pattern, res.data)
            if m is not None:
                return m.group(1).decode("utf-8")

        # Fall back to the legacy hidden-input form for any older or
        # alternative login templates that still emit it.
        m = re.search(
            rb'<input id="csrf_token" name="csrf_token" type="hidden"'
            rb' value="([^"]*)">', res.data
        )
        if m is not None:
            return m.group(1).decode("utf-8")

        # When login through Kerberos, we won't find the CSRF.
        return None

    def generate_csrf_token(self, *args, **kwargs):
        # First, we'll wrap our request shim around the test client, so
        # that it will work correctly when Flask asks it to set a cookie.
        request = RequestShim(self)
        # Next, we need to look up any cookies that might already exist on
        # this test client, such as the secure cookie that
        # powers `flask.session`,
        # and make a test request context that has those cookies in it.
        server_name = self.app.config.get("SERVER_NAME") or "localhost"
        environ_overrides = {
            'wsgi.url_scheme': 'http',
            'HTTP_HOST': server_name
        }
        self._add_cookies_to_wsgi(environ_overrides)

        with self.app.test_request_context(
            environ_overrides=environ_overrides
        ):
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
        # Flask-Paranoid regenerates the session on login (anti-fixation),
        # which drops the `csrf_token` populated during GET /login. Capture
        # a fresh token from a post-login authenticated page so subsequent
        # state-changing API calls aren't rejected with "CSRF session token
        # is missing."
        if config.SERVER_MODE is True:
            post_login = self.get('/browser/', follow_redirects=True)
            fresh_token = self.fetch_csrf(post_login)
            if fresh_token is not None:
                self.csrf_token = fresh_token
            else:
                self.csrf_token = csrf_token
        else:
            self.csrf_token = csrf_token

        return res

    def logout(self):
        self.get('/logout?next=/browser/', follow_redirects=False)
        self.csrf_token = None
