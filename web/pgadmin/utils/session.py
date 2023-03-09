##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implements the server-side session management.

Credit/Reference: http://flask.pocoo.org/snippets/109/

Modified to support both Python 2.6+ & Python 3.x
"""

import base64
import datetime
import hmac
import hashlib
import os
import secrets
import string
import time
import config
from uuid import uuid4
from threading import Lock
from flask import current_app, request, flash, redirect
from flask_login import login_url

from pickle import dump, load
from collections import OrderedDict

from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict

from pgadmin.utils.ajax import make_json_response


def _calc_hmac(body, secret):
    return base64.b64encode(
        hmac.new(
            secret.encode(), body.encode(), hashlib.sha256
        ).digest()
    ).decode()


sess_lock = Lock()
LAST_CHECK_SESSION_FILES = None


class ManagedSession(CallbackDict, SessionMixin):
    def __init__(self, initial=None, sid=None, new=False, randval=None,
                 hmac_digest=None):
        def on_update(self):
            self.modified = True

        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        self.new = new
        self.modified = False
        self.randval = randval
        self.last_write = None
        self.force_write = False
        self.hmac_digest = hmac_digest
        self.permanent = True

    def sign(self, secret):
        if not self.hmac_digest:
            population = string.ascii_lowercase + string.digits

            self.randval = ''.join(
                secrets.choice(population) for i in range(20))
            self.hmac_digest = _calc_hmac(
                '%s:%s' % (self.sid, self.randval), secret)


class SessionManager():
    def new_session(self):
        'Create a new session'
        raise NotImplementedError

    def exists(self, sid):
        'Does the given session-id exist?'
        raise NotImplementedError

    def remove(self, sid):
        'Remove the session'
        raise NotImplementedError

    def get(self, sid, digest):
        'Retrieve a managed session by session-id, checking the HMAC digest'
        raise NotImplementedError

    def put(self, session):
        'Store a managed session'
        raise NotImplementedError


class CachingSessionManager(SessionManager):
    def __init__(self, parent, num_to_store, skip_paths=None):
        self.parent = parent
        self.num_to_store = num_to_store
        self._cache = OrderedDict()
        self.skip_paths = [] if skip_paths is None else skip_paths

    def _normalize(self):
        if len(self._cache) > self.num_to_store:
            # Flush 20% of the cache
            with sess_lock:
                while len(self._cache) > (self.num_to_store * 0.8):
                    self._cache.popitem(False)

    def new_session(self):
        session = self.parent.new_session()

        # Do not store the session if skip paths
        for sp in self.skip_paths:
            if request.path.startswith(sp):
                return session

        with sess_lock:
            self._cache[session.sid] = session
        self._normalize()

        return session

    def remove(self, sid):
        with sess_lock:
            self.parent.remove(sid)
            if sid in self._cache:
                del self._cache[sid]

    def exists(self, sid):
        with sess_lock:
            if sid in self._cache:
                return True
            return self.parent.exists(sid)

    def get(self, sid, digest):
        session = None
        with sess_lock:
            if sid in self._cache:
                session = self._cache[sid]
                if session and session.hmac_digest != digest:
                    session = None

                # reset order in Dict
                del self._cache[sid]

            if not session:
                session = self.parent.get(sid, digest)

            # Do not store the session if skip paths
            for sp in self.skip_paths:
                if request.path.startswith(sp):
                    return session

            self._cache[sid] = session
        self._normalize()

        return session

    def put(self, session):
        with sess_lock:
            self.parent.put(session)

            # Do not store the session if skip paths
            for sp in self.skip_paths:
                if request.path.startswith(sp):
                    return

            if session.sid in self._cache:
                try:
                    del self._cache[session.sid]
                except Exception:
                    pass

            self._cache[session.sid] = session
        self._normalize()


class FileBackedSessionManager(SessionManager):

    def __init__(self, path, secret, disk_write_delay, skip_paths=None):
        self.path = path
        self.secret = secret
        self.disk_write_delay = disk_write_delay
        if not os.path.exists(self.path):
            os.makedirs(self.path)
        self.skip_paths = [] if skip_paths is None else skip_paths

    def exists(self, sid):
        fname = os.path.join(self.path, sid)
        return os.path.exists(fname)

    def remove(self, sid):
        fname = os.path.join(self.path, sid)
        if os.path.exists(fname):
            os.unlink(fname)

    def new_session(self):
        sid = str(uuid4())
        fname = os.path.join(self.path, sid)

        while os.path.exists(fname):
            sid = str(uuid4())
            fname = os.path.join(self.path, sid)

        # Do not store the session if skip paths
        for sp in self.skip_paths:
            if request.path.startswith(sp):
                return ManagedSession(sid=sid)

        # touch the file
        with open(fname, 'wb'):
            return ManagedSession(sid=sid)

        return ManagedSession(sid=sid)

    def get(self, sid, digest):
        'Retrieve a managed session by session-id, checking the HMAC digest'

        fname = os.path.join(self.path, sid)
        data = None
        hmac_digest = None
        randval = None

        if os.path.exists(fname):
            try:
                with open(fname, 'rb') as f:
                    randval, hmac_digest, data = load(f)
            except Exception:
                pass

        if not data:
            return self.new_session()

        # This assumes the file is correct, if you really want to
        # make sure the session is good from the server side, you
        # can re-calculate the hmac

        if hmac_digest != digest:
            return self.new_session()

        return ManagedSession(
            data, sid=sid, randval=randval, hmac_digest=hmac_digest
        )

    def put(self, session):
        """Store a managed session"""
        current_time = time.time()
        if not session.hmac_digest:
            session.sign(self.secret)
        elif not session.force_write and session.last_write is not None and \
            (current_time - float(session.last_write)) < \
                self.disk_write_delay:
            return

        session.last_write = current_time
        session.force_write = False

        # Do not store the session if skip paths
        for sp in self.skip_paths:
            if request.path.startswith(sp):
                return

        fname = os.path.join(self.path, session.sid)
        with open(fname, 'wb') as f:
            dump(
                (session.randval, session.hmac_digest, dict(session)),
                f
            )


class ManagedSessionInterface(SessionInterface):
    def __init__(self, manager):
        self.manager = manager

    def open_session(self, app, request):
        cookie_val = request.cookies.get(app.session_cookie_name)

        if not cookie_val or '!' not in cookie_val:
            return self.manager.new_session()

        sid, digest = cookie_val.split('!', 1)

        if self.manager.exists(sid):
            return self.manager.get(sid, digest)

        return self.manager.new_session()

    def save_session(self, app, session, response):
        domain = self.get_cookie_domain(app)
        if not session:
            self.manager.remove(session.sid)
            if session.modified:
                response.delete_cookie(app.session_cookie_name, domain=domain)
            return

        if not session.modified:
            # No need to save an unaltered session
            # TODO: put logic here to test if the cookie is older than N days,
            # if so, update the expiration date
            return

        self.manager.put(session)
        session.modified = False

        cookie_exp = self.get_expiration_time(app, session)
        response.set_cookie(
            app.session_cookie_name,
            '%s!%s' % (session.sid, session.hmac_digest),
            expires=cookie_exp,
            secure=config.SESSION_COOKIE_SECURE,
            httponly=config.SESSION_COOKIE_HTTPONLY,
            samesite=config.SESSION_COOKIE_SAMESITE,
            domain=domain
        )


def create_session_interface(app, skip_paths=[]):
    return ManagedSessionInterface(
        CachingSessionManager(
            FileBackedSessionManager(
                app.config['SESSION_DB_PATH'],
                app.config['SECRET_KEY'],
                app.config.get('PGADMIN_SESSION_DISK_WRITE_DELAY', 10),
                skip_paths
            ),
            1000,
            skip_paths
        ))


def pga_unauthorised():

    lm = current_app.login_manager
    login_message = None

    if lm.login_message:
        if lm.localize_callback is not None:
            login_message = lm.localize_callback(lm.login_message)
        else:
            login_message = lm.login_message

    if not lm.login_view:
        # Only 401 is not enough to distinguish pgAdmin login is required.
        # There are other cases when we return 401. For eg. wrong password
        # supplied while connecting to server.
        # So send additional 'info' message.
        return make_json_response(
            status=401,
            success=0,
            errormsg=login_message,
            info='PGADMIN_LOGIN_REQUIRED'
        )

    # flash messages are only required if the request was from a
    # security page, otherwise it will be redirected to login page
    # anyway
    if login_message and 'security' in request.endpoint:
        flash(login_message, category=lm.login_message_category)

    return redirect(login_url(lm.login_view, request.url))


def cleanup_session_files():
    """
    This function will iterate through session directory and check the last
    modified time, if it older than (session expiration time + 1) days then
    delete that file.
    """
    iterate_session_files = False

    global LAST_CHECK_SESSION_FILES
    if LAST_CHECK_SESSION_FILES is None or \
        datetime.datetime.now() >= LAST_CHECK_SESSION_FILES + \
            datetime.timedelta(hours=config.CHECK_SESSION_FILES_INTERVAL):
        iterate_session_files = True
        LAST_CHECK_SESSION_FILES = datetime.datetime.now()

    if iterate_session_files:
        for root, dirs, files in os.walk(
                current_app.config['SESSION_DB_PATH']):
            for file_name in files:
                absolute_file_name = os.path.join(root, file_name)
                st = os.stat(absolute_file_name)

                # Get the last modified time of the session file
                last_modified_time = \
                    datetime.datetime.fromtimestamp(st.st_mtime)

                # Calculate session file expiry time.
                file_expiration_time = \
                    last_modified_time + \
                    current_app.permanent_session_lifetime + \
                    datetime.timedelta(days=1)

                if file_expiration_time <= datetime.datetime.now() and \
                        os.path.exists(absolute_file_name):
                    os.unlink(absolute_file_name)
