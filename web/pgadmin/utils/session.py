##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
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
import random
import string
import time
from uuid import uuid4
from threading import Lock
from flask import current_app, request, flash, redirect
from flask_login import login_url
from pgadmin.utils.ajax import make_json_response

try:
    from cPickle import dump, load
except ImportError:
    from pickle import dump, load

try:
    from collections import OrderedDict
except ImportError:
    from ordereddict import OrderedDict

from flask.sessions import SessionInterface, SessionMixin
from werkzeug.datastructures import CallbackDict


def _calc_hmac(body, secret):
    return base64.b64encode(
        hmac.new(
            secret.encode(), body.encode(), hashlib.sha1
        ).digest()
    ).decode()


sess_lock = Lock()


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

    def sign(self, secret):
        if not self.hmac_digest:
            if hasattr(string, 'lowercase'):
                population = string.lowercase
            # If script is running under python3
            elif hasattr(string, 'ascii_lowercase'):
                population = string.ascii_lowercase
            population += string.digits

            self.randval = ''.join(random.sample(population, 20))
            self.hmac_digest = _calc_hmac(
                '%s:%s' % (self.sid, self.randval), secret)


class SessionManager(object):
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
    def __init__(self, parent, num_to_store, skip_paths=[]):
        self.parent = parent
        self.num_to_store = num_to_store
        self._cache = OrderedDict()
        self.skip_paths = skip_paths

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
                if session.hmac_digest != digest:
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

    def __init__(self, path, secret, disk_write_delay, skip_paths=[]):
        self.path = path
        self.secret = secret
        self.disk_write_delay = disk_write_delay
        if not os.path.exists(self.path):
            os.makedirs(self.path)
        self.skip_paths = skip_paths

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
            pass

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
        elif not session.force_write:
            if session.last_write is not None and \
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
    def __init__(self, manager, cookie_timedelta):
        self.manager = manager
        self.cookie_timedelta = cookie_timedelta

    def get_expiration_time(self, app, session):
        if session.permanent:
            return app.permanent_session_lifetime
        return datetime.datetime.now() + self.cookie_timedelta

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
            expires=cookie_exp, httponly=True, domain=domain
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
        ),
        datetime.timedelta(days=1))


def pga_unauthorised():

    lm = current_app.login_manager
    login_message = None

    if lm.login_message:
        if lm.localize_callback is not None:
            login_message = lm.localize_callback(lm.login_message)
        else:
            login_message = lm.login_message

    if not lm.login_view or request.is_xhr:
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

    if login_message:
        flash(login_message, category=lm.login_message_category)

    return redirect(login_url(lm.login_view, request.url))
