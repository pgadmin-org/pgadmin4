##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implements the server-side session management.

Credit/Reference: http://flask.pocoo.org/snippets/86/

Modified to support both Python 2.6+ & Python 3.x
"""

import errno
import os
import sqlite3
from uuid import uuid4

try:
    from cPickle import dumps, loads
except:
    from pickle import dumps, loads

from collections import MutableMapping
from flask import request
from flask.sessions import SessionInterface, SessionMixin


class SqliteSessionStorage(MutableMapping, SessionMixin):
    """
    A class to store the session as sqlite object.
    """

    _create_sql = (
        'CREATE TABLE IF NOT EXISTS pg_session '
        '('
        '  key TEXT PRIMARY KEY,'
        '  val BLOB'
        ')'
    )
    _get_sql = 'SELECT val FROM pg_session WHERE key = ?'
    _set_sql = 'REPLACE INTO pg_session (key, val) VALUES (?, ?)'
    _del_sql = 'DELETE FROM pg_session WHERE key = ?'
    _ite_sql = 'SELECT key FROM pg_session'
    _len_sql = 'SELECT COUNT(*) FROM pg_session'

    def __init__(self, directory, sid, *args, **kwargs):
        """Initialize the session storage for this particular session. If
        requires, creates new sqlite database per session (if require).
        """
        self.path = os.path.join(directory, sid)
        self.directory = directory
        self.sid = sid
        self.modified = False
        self.conn = None
        if not os.path.exists(self.path):
            sess_db = os.open(self.path, os.O_CREAT, int("600", 8))
            os.close(sess_db)

            with self._get_conn() as conn:
                conn.execute(self._create_sql)
                self.new = True

    def __getitem__(self, key):
        """Reads the session data for the particular key from the sqlite
        database.
        """
        key = dumps(key, 0)
        rv = None
        with self._get_conn() as conn:
            for row in conn.execute(self._get_sql, (key,)):
                rv = loads(bytes(row[0]))
                break
        if rv is None:
            raise KeyError('Key not in this session')
        return rv

    def __setitem__(self, key, value):
        """Stores the session data for the given key.
        """
        key = dumps(key, 0)
        value = dumps(value, 2)
        with self._get_conn() as conn:
            conn.execute(self._set_sql, (key, sqlite3.Binary(value)))
        self.modified = True

    def __delitem__(self, key):
        """Removes the session data representing the key from the session.
        """
        key = dumps(key, 0)
        with self._get_conn() as conn:
            conn.execute(self._del_sql, (key,))
        self.modified = True

    def __iter__(self):
        """Returns the iterator of the key, value pair stored under this
        session.
        """
        with self._get_conn() as conn:
            for row in conn.execute(self._ite_sql):
                yield loads(dumps(row[0]))

    def __len__(self):
        """Returns the number of keys stored in this session.
        """
        with self._get_conn() as conn:
            for row in conn.execute(self._len_sql):
                return row[0]

    def _get_conn(self):
        """Connection object to the sqlite database object.
        """
        if not self.conn:
            self.conn = sqlite3.Connection(self.path)
        return self.conn

    # These proxy classes are needed in order
    # for this session implementation to work properly.
    # That is because sometimes flask will chain method calls
    # with session'setdefault' calls.
    # Eg: session.setdefault('_flashes', []).append(1)
    # With these proxies, the changes made by chained
    # method calls will be persisted back to the sqlite
    # database.
    class CallableAttributeProxy(object):
        """
        A proxy class to represent the callable attributes of a object.
        """

        def __init__(self, session, key, obj, attr):
            """Initialize the proxy instance for the callable attribute.
            """
            self.session = session
            self.key = key
            self.obj = obj
            self.attr = attr

        def __call__(self, *args, **kwargs):
            """Returns the callable attributes for this session.
            """
            rv = self.attr(*args, **kwargs)
            self.session[self.key] = self.obj
            return rv

    class PersistedObjectProxy(object):
        """
        A proxy class to represent the persistent object.
        """

        def __init__(self, session, key, obj):
            """Initialize the persitent objects under the session.
            """
            self.session = session
            self.key = key
            self.obj = obj

        def __getattr__(self, name):
            """Returns the attribute of the persistent object representing by
            the name for this object.
            """
            attr = getattr(self.obj, name)
            if callable(attr):
                return SqliteSessionStorage.CallableAttributeProxy(
                    self.session, self.key, self.obj, attr
                )
            return attr

    def setdefault(self, key, value):
        """Sets the default value for the particular key in the session.
        """

        if key not in self:
            self[key] = value
            self.modified = True

        return SqliteSessionStorage.PersistedObjectProxy(
            self, key, self[key]
        )


class ServerSideSessionInterface(SessionInterface):
    """
    Implements the SessionInterface to support saving/opening session
    as sqlite object.
    """

    def __init__(self, directory):
        """Initialize the session interface, which uses the sqlite as local
        storage, and works as server side session manager.

        It takes directory as parameter, and creates the directory with 700
        permission (if not exists).
        """
        directory = os.path.abspath(directory)
        if not os.path.exists(directory):
            os.makedirs(directory, int('700', 8))
        self.directory = directory

    def open_session(self, app, request):
        """
        Returns the SqliteSessionStorage object representing this session.
        """
        sid = request.cookies.get(app.session_cookie_name)
        if not sid or len(sid) > 40:
            sid = str(uuid4())
        return SqliteSessionStorage(self.directory, sid)

    def save_session(self, app, session, response):
        """
        Saves/Detroys the session object.
        """
        sid = request.cookies.get(app.session_cookie_name)
        domain = self.get_cookie_domain(app)
        if not session:
            try:
                if session is None:
                    session = SqliteSessionStorage(self.directory, sid)
                os.unlink(session.path)
            except OSError as ex:
                if ex.errno != errno.ENOENT:
                    raise
            if session.modified:
                response.delete_cookie(
                    app.session_cookie_name,
                    domain=domain
                )
            return
        cookie_exp = self.get_expiration_time(app, session)
        response.set_cookie(
            app.session_cookie_name, session.sid,
            expires=cookie_exp, httponly=True, domain=domain
        )
