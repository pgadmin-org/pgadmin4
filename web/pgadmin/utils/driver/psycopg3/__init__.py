##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implementation of Driver class
It is a wrapper around the actual psycopg3 driver, and connection
object.

"""
import datetime
import re
from flask import session
from flask_login import current_user
from werkzeug.exceptions import InternalServerError
import psycopg
from threading import Lock

import config
from pgadmin.model import Server
from .keywords import scan_keyword
from ..abstract import BaseDriver
from .connection import Connection
from .server_manager import ServerManager

connection_restore_lock = Lock()


class Driver(BaseDriver):
    """
    class Driver(BaseDriver):

    This driver acts as a wrapper around psycopg3 connection driver
    implementation. We will be using psycopg3 for makeing connection with
    the PostgreSQL/EDB Postgres Advanced Server (EnterpriseDB).

    Properties:
    ----------

    * Version (string):
        Version of psycopg3 driver

    Methods:
    -------
    * get_connection(sid, database, conn_id, auto_reconnect)
    - It returns a Connection class object, which may/may not be connected
      to the database server for this sesssion

    * release_connection(seid, database, conn_id)
    - It releases the connection object for the given conn_id/database for this
      session.

    * connection_manager(sid, reset)
    - It returns the server connection manager for this session.
    """

    def __init__(self, **kwargs):
        self.managers = dict()

        super(Driver, self).__init__()

    def _restore_connections_from_session(self):
        """
        Used internally by connection_manager to restore connections
        from sessions.
        """
        if session.sid not in self.managers:
            self.managers[session.sid] = managers = dict()
            if '__pgsql_server_managers' in session:
                session_managers = \
                    session['__pgsql_server_managers'].copy()
                for server in \
                    Server.query.filter_by(
                        user_id=current_user.id, is_adhoc=0):
                    manager = managers[str(server.id)] = \
                        ServerManager(server)
                    if server.id in session_managers:
                        manager._restore(session_managers[server.id])
                        manager.update_session()
            return managers

        return {}

    def connection_manager(self, sid=None):
        """
        connection_manager(...)

        Returns the ServerManager object for the current session. It will
        create new ServerManager object (if necessary).

        Parameters:
            sid
            - Server ID
        """
        assert (sid is not None and isinstance(sid, int))
        managers = None

        server_data = Server.query.filter_by(id=sid).first()
        if server_data is None:
            return None

        if session.sid not in self.managers:
            with connection_restore_lock:
                # The wait is over but the object might have been loaded
                # by some other thread check again
                managers = self._restore_connections_from_session()
        else:
            managers = self.managers[session.sid]
            if str(sid) in managers:
                manager = managers[str(sid)]
                with connection_restore_lock:
                    manager._restore_connections()
                    manager.update_session()

        managers['pinged'] = datetime.datetime.now()
        if str(sid) not in managers:
            s = Server.query.filter_by(id=sid).first()

            if not s:
                return None

            managers[str(sid)] = ServerManager(s)

            return managers[str(sid)]

        return managers[str(sid)]

    def version(self):
        """
        version(...)

        Returns the current version of psycopg3 driver
        """
        _version = getattr(psycopg, '__version__', None)

        if _version:
            return _version

        raise InternalServerError(
            "Driver Version information for psycopg3 is not available!"
        )

    def libpq_version(self):
        """
        Returns the loaded libpq version
        """
        version = getattr(psycopg, '__libpq_version__', None)
        if version:
            return version

        raise InternalServerError(
            "libpq version information is not available!"
        )

    def get_connection(
            self, sid, database=None, conn_id=None, auto_reconnect=True,
            **kwargs
    ):
        """
        get_connection(...)

        Returns the connection object for the certain connection-id/database
        for the specific server, identified by sid. Create a new Connection
        object (if require). If server id is 0, it will return the database
        connection object.

        Parameters:
            sid
            - Server ID
            database
            - Database, on which the connection needs to be made
              If provided none, maintenance_db for the server will be used,
              while generating new Connection object.
            conn_id
            - Identification String for the Connection This will be used by
              certain tools, which will require a dedicated connection for it.
              i.e. Debugger, Query Tool, etc.
            auto_reconnect
            - This parameters define, if we should attempt to reconnect the
              database server automatically, when connection has been lost for
              any reason. Certain tools like Debugger will require a permenant
              connection, and it stops working on disconnection.

        """

        if sid:
            manager = self.connection_manager(sid)

            return manager.connection(database=database, conn_id=conn_id,
                                      auto_reconnect=auto_reconnect)
        else:
            return psycopg.Connection.connect(
                host=kwargs['host'],
                dbname=database,
                user=kwargs['user'],
                password=kwargs[
                    'password'] if 'password' in kwargs else None,
                port=kwargs['port'] if
                kwargs['port'] else None,
                passfile=kwargs['passfile'],
                connect_timeout=kwargs['connect_timeout'] if
                'connect_timeout' in kwargs and
                kwargs['connect_timeout'] else 0,
                sslmode=kwargs['sslmode'],
                sslcert=kwargs['sslcert'],
                sslkey=kwargs['sslkey'],
                sslrootcert=kwargs['sslrootcert'],
                sslcompression=True if kwargs[
                    'sslcompression'] else False
            )

    def release_connection(self, sid, database=None, conn_id=None):
        """
        Release the connection for the given connection-id/database in this
        session.
        """
        return self.connection_manager(sid).release(database, conn_id)

    def delete_manager(self, sid):
        """
        Delete manager for given server id.
        """
        manager = self.connection_manager(sid)
        if manager is not None:
            manager.release()
        if session.sid in self.managers and \
                str(sid) in self.managers[session.sid]:
            del self.managers[session.sid][str(sid)]

    def gc_timeout(self):
        """
        Release the connections for the sessions, which have not pinged the
        server for more than config.MAX_SESSION_IDLE_TIME.
        """

        # Minimum session idle is 20 minutes
        max_idle_time = max(config.MAX_SESSION_IDLE_TIME or 60, 20)
        session_idle_timeout = datetime.timedelta(minutes=max_idle_time)

        curr_time = datetime.datetime.now()

        for sess in self.managers:
            sess_mgr = self.managers[sess]

            if sess == session.sid:
                sess_mgr['pinged'] = curr_time
                continue
            if curr_time - sess_mgr['pinged'] >= session_idle_timeout:
                for mgr in [
                    m for m in sess_mgr.values() if isinstance(m,
                                                               ServerManager)
                ]:
                    mgr.release()

    def gc_own(self):
        """
        Release the connections for current session
        This is useful when (eg. logout) we want to release all
        connections (except dedicated connections created by utilities
        like backup, restore etc) of all servers for current user.
        """

        sess_mgr = self.managers.get(session.sid, None)

        if sess_mgr:
            for mgr in (
                m for m in sess_mgr.values() if isinstance(m, ServerManager)
            ):
                mgr.release()

    @staticmethod
    def qtLiteral(value, conn, force_quote=False):
        res = value

        if conn:
            try:
                if not isinstance(conn, psycopg.Connection) and \
                        not isinstance(conn, psycopg.AsyncConnection):
                    conn = conn.conn
                res = psycopg.sql.Literal(value).as_string(conn).strip()
            except Exception:
                print("Exception", value)

        if force_quote is True:
            # Convert the input to the string to use the startsWith(...)
            res = str(res)
            if not res.startswith("'"):
                return "'" + res + "'"

        return res

    @staticmethod
    def ScanKeywordExtraLookup(key):
        # UNRESERVED_KEYWORD      0
        # COL_NAME_KEYWORD        1
        # TYPE_FUNC_NAME_KEYWORD  2
        # RESERVED_KEYWORD        3
        extra_keywords = {
            'connect': 3,
            'convert': 3,
            'distributed': 0,
            'exec': 3,
            'log': 0,
            'long': 3,
            'minus': 3,
            'nocache': 3,
            'number': 3,
            'package': 3,
            'pls_integer': 3,
            'raw': 3,
            'return': 3,
            'smalldatetime': 3,
            'smallfloat': 3,
            'smallmoney': 3,
            'sysdate': 3,
            'systimestap': 3,
            'tinyint': 3,
            'tinytext': 3,
            'varchar2': 3
        }

        return extra_keywords.get(key, None) or scan_keyword(key)

    @staticmethod
    def needsQuoting(key, for_types):
        value = key
        val_noarray = value

        # check if the string is number or not
        if isinstance(value, int):
            return True
        # certain types should not be quoted even though it contains a space.
        # Evilness.
        elif for_types and value.endswith('[]'):
            val_noarray = value[:-2]

        if for_types and val_noarray.lower() in [
            'bit varying',
            '"char"',
            'character varying',
            'double precision',
            'timestamp without time zone',
            'timestamp with time zone',
            'time without time zone',
            'time with time zone',
            '"trigger"',
            '"unknown"'
        ]:
            return False

        # If already quoted?, If yes then do not quote again
        if for_types and val_noarray and \
                (val_noarray.startswith('"') or val_noarray.endswith('"')):
            return False

        if '0' <= val_noarray[0] <= '9':
            return True

        if re.search('[^a-z_0-9]+', val_noarray):
            return True

        # check string is keywaord or not
        category = Driver.ScanKeywordExtraLookup(value)

        if category is None:
            return False

        # UNRESERVED_KEYWORD
        if category == 0:
            return False

        # COL_NAME_KEYWORD
        if for_types and category == 1:
            return False

        return True

    @staticmethod
    def qtTypeIdent(conn, *args):
        # We're not using the conn object at the moment, but - we will
        # modify the
        # logic to use the server version specific keywords later.
        res = None
        value = None

        for val in args:
            # DataType doesn't have len function then convert it to string
            if not hasattr(val, '__len__'):
                val = str(val)

            if len(val) == 0:
                continue
            value = val

            if Driver.needsQuoting(val, True):
                value = value.replace("\"", "\"\"")
                value = "\"" + value + "\""

            res = ((res and res + '.') or '') + value

        return res

    @staticmethod
    def qtIdent(conn, *args):
        # We're not using the conn object at the moment, but - we will
        # modify the logic to use the server version specific keywords later.
        res = None
        value = None

        for val in args:
            if isinstance(val, list):
                return map(lambda w: Driver.qtIdent(conn, w), val)

            # DataType doesn't have len function then convert it to string
            if not hasattr(val, '__len__'):
                val = str(val)

            if len(val) == 0:
                continue

            value = val

            if Driver.needsQuoting(val, False):
                value = value.replace("\"", "\"\"")
                value = "\"" + value + "\""

            res = ((res and res + '.') or '') + value

        return res
