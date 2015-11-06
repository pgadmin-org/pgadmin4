##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2015, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from datetime import datetime

import psycopg2
import psycopg2.extras

from flask import g, current_app, session
from flask.ext.babel import gettext
from flask.ext.security import current_user

from ..abstract import BaseDriver, BaseConnection
from pgadmin.settings.settings_model import Server, User
from pgadmin.utils.crypto import encrypt, decrypt


_ = gettext


class Connection(BaseConnection):
    """
    class Connection(object)

        A wrapper class, which wraps the psycopg2 connection object, and
        delegate the execution to the actual connection object, when required.

    Methods:
    -------
    * connect(**kwargs)
      - Connect the PostgreSQL/Postgres Plus servers using the psycopg2 driver

    * execute_scalar(query, params)
      - Execute the given query and returns single datum result

    * execute_2darray(query, params)
      - Execute the given query and returns the result as a 2 dimentional
        array.

    * execute_dict(query, params)
      - Execute the given query and returns the result as an array of dict
        (column name -> value) format.

    * connected()
      - Get the status of the connection.
        Returns True if connected, otherwise False.

    * reset()
      - Reconnect the database server (if possible)

    * transaction_status()
      - Trasaction Status

    * ping()
      - Ping the server.

    * _release()
      - Release the connection object of psycopg2
    """
    def __init__(self, manager, conn_id, db, auto_reconnect=True):
        assert(manager is not None)
        assert(conn_id is not None)

        self.conn_id = conn_id
        self.manager = manager
        self.db = db if db is not None else manager.db
        self.conn = None
        self.auto_reconnect = auto_reconnect

        super(Connection, self).__init__()

    def connect(self, **kwargs):
        if self.conn:
            if self.conn.closed:
                self.conn = None
            else:
                return True, None

        pg_conn = None
        password = None
        mgr = self.manager

        if 'password' in kwargs:
            encpass = kwargs['password']
        else:
            encpass = getattr(mgr, 'password', None)

        if encpass:
            # Fetch Logged in User Details.
            user = User.query.filter_by(id=current_user.id).first()

            if user is None:
                return unauthorized(gettext("Unauthorized Request."))

            password = decrypt(encpass, user.password)

        try:
            import os
            os.environ['PGAPPNAME'] = 'pgAdmin IV - {0}'.format(self.conn_id)
            pg_conn = psycopg2.connect(
                    host=mgr.host,
                    port=mgr.port,
                    database=self.db,
                    user=mgr.user,
                    password=password
                    )

        except psycopg2.Error as e:
            if e.pgerror:
                msg = e.pgerror
            elif e.diag.message_detail:
                msg = e.diag.message_detail
            else:
                msg = str(e)

            return False, msg

        pg_conn.autocommit = True
        self.conn = pg_conn

        self.conn.set_client_encoding("UNICODE")
        status, res = self.execute_scalar("""
SET DateStyle=ISO;
SET client_min_messages=notice;
SET bytea_output=escape;
""")
        if not status:
            self.conn.close()
            self.conn = None

            return False, res

        if mgr.role:
            status, res = self.execute_scalar("SET ROLE TO %s", [mgr.role])

            if not status:
                self.conn.close()
                self.conn = None

                return False, \
                    _("Failed to setup the role with error message:\n{0}").format(
                            res
                            )

        if mgr.ver is None:
            status, res = self.execute_scalar("SELECT version()")

            if status:
                mgr.ver = res
                mgr.sversion = int(pg_conn.server_version)
            else:
                self.conn.close()
                self.conn = None

                return False, res

        if 'password' in kwargs:
            mgr.password = kwargs['password']

        if 'modules' in kwargs and isinstance(kwargs['modules'], list):
            for m in sorted(
                    kwargs['modules'], key=lambda module: module.priority
                    ):
                if m.instanceOf(mgr.ver):
                    mgr.server_type = m.type
                    mgr.module = m
                    break

        return True, None

    def __cursor(self):
        cur = getattr(g, self.conn_id, None)

        if self.connected() and cur and not cur.closed:
            return True, cur

        if not self.connected():
            status = False
            errmsg = ""

            if self.auto_reconnect:
                status, errmsg = self.connect()
                errmsg = gettext(
                    """
Attempt to reconnect it failed with the below error:
{0}
""").format(errmsg)

            if not status:
                msg = gettext("Connection was lost!\n{0}").format(errmsg)
                current_app.logger.error(msg)

                return False, msg

        try:
            cur = self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        except psycopg2.Error as pe:
            errmsg = gettext("""
Failed to create cursor for psycopg2 connection with error message for the \
server#{1}:{2}:
{0}""").format(str(pe), self.manager.sid, self.db)
            current_app.logger.error(errmsg)
            self.conn.close()
            self.conn = None

            if self.auto_reconnect:
                status, errmsg = self.connect()
                if not status:
                    msg = gettext(
                        """
Connection for server#{0} with database "{1}" was lost.
Attempt to reconnect it failed with the below error:
{2}"""
                        ).format(self.driver.server_id, self.database, errmsg)
                    current_app.logger.error(msg)

                    return False, errmsg
            else:
                return False, errmsg

        setattr(g, self.conn_id, cur)

        return True, cur

    def execute_scalar(self, query, params=None):
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)

        try:
            cur.execute(query, params)
        except psycopg2.Error as pe:
            cur.close()
            return False, str(pe)

        if cur.rowcount > 0:
            res = cur.fetchone()
            if len(res) > 0:
                return True, res[0]

        return True, None

    def execute_2darray(self, query, params=None):
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)

        try:
            cur.execute(query, params)
        except psycopg2.Error as pe:
            cur.close()
            return False, str(pe)

        import copy
        # Get Resultset Column Name, Type and size
        columns = [copy.deepcopy(desc.__dict__) for desc in cur.description]

        rows = []
        for row in cur:
            rows.append(row)

        return True, {'columns': columns, 'rows': rows}

    def execute_dict(self, query, params=None):
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)

        try:
            cur.execute(query, params)
        except psycopg2.Error as pe:
            cur.close()
            return False, str(pe)

        import copy
        # Get Resultset Column Name, Type and size
        columns = [copy.deepcopy(desc.__dict__) for desc in cur.description]

        rows = []
        for row in cur:
            rows.append(dict(row))

        return True, {'columns': columns, 'rows': rows}

    def connected(self):
        if self.conn:
            if not self.conn.closed:
                return True
            self.conn = None
        return False

    def reset(self):
        if self.conn:
            if self.conn.closed:
                self.conn = None
        pg_conn = None
        mgr = self.manager

        password = getattr(mgr, 'password', None)

        if password:
            # Fetch Logged in User Details.
            user = User.query.filter_by(id=current_user.id).first()

            if user is None:
                return unauthorized(gettext("Unauthorized Request."))

            password = decrypt(password, user.password)

        try:
            pg_conn = psycopg2.connect(
                    host=mgr.host,
                    port=mgr.port,
                    database=db,
                    user=mgr.user,
                    password=password
                    )

        except psycopg2.Error as e:
            msg = e.pgerror if e.pgerror else e.message \
                if e.message else e.diag.message_detail \
                if e.diag.message_detail else str(e)

            current_app.logger.error(
                gettext(
                    """
Failed to reset the connection of the server due to following error:
{0}"""
                    ).Format(msg)
                )
            return False, msg

        self.conn = pg_conn

        return True, None

    def transaction_status(self):
        if self.conn:
            return self.conn.get_transaction_status()
        return None

    def ping(self):
        return self.execute_scalar('SELECT 1')

    def _release(self):
        if self.conn:
            self.conn.close()
            self.conn = None


class ServerManager(object):
    """
    class ServerManager

    This class contains the information about the given server.
    And, acts as connection manager for that particular session.
    """
    def __init__(self, server):
        self.module = None
        self.ver = None
        self.sversion = None
        self.connections = dict()

        self.update(server)

    def update(self, server):
        assert(server is not None)
        assert(isinstance(server, Server))

        self.module = None
        self.ver = None
        self.sversion = None
        self.password = None

        self.sid = server.id
        self.stype = None
        self.host = server.host
        self.port = server.port
        self.db = server.maintenance_db
        self.user = server.username
        self.password = server.password
        self.role = server.role
        self.ssl_mode = server.ssl_mode
        self.pinged = datetime.now()

        for con in self.connections:
            self.connections[con]._release()

        self.connections = dict()

    def ServerVersion(self):
        return self.ver

    @property
    def version(self):
        return self.sversion

    def MajorVersion(self):
        if self.sversion is not None:
            return int(self.sversion / 10000)
        raise Exception("Information is not available!")

    def MinorVersion(self):
        if self.sversion:
            return int(int(self.sversion / 100) % 100)
        raise Exception("Information is not available!")

    def PatchVersion(self):
        if self.sversion:
            return int(int(self.sversion / 100) / 100)
        raise Exception("Information is not available!")

    def connection(self, database=None, conn_id=None, auto_reconnect=True):

        my_id = ('CONN:' + str(conn_id)) if conn_id is not None else \
                ('DB:' + (str(database) if database is not None else \
					self.db))

        self.pinged = datetime.now()

        if my_id in self.connections:
            return self.connections[my_id]
        else:
            self.connections[my_id] = Connection(
                    self, my_id, database, auto_reconnect
                    )

            return self.connections[my_id]

    def release(self, database=None, conn_id=None):

        my_id = ('CONN:' + str(conn_id)) if conn_id is not None else \
                ('DB:' + str(database)) if database is not None else None

        if my_id is not None:
            if my_id in self.connections:
                self.connections[my_id]._release()
                del self.connections[my_id]

                return True
            else:
                return False

        for con in self.connections:
            self.connections[con]._release()

        self.connections = dict()
        self.password = None

        return True


class Driver(BaseDriver):
    """
    class Driver(BaseDriver):

    This driver acts as a wrapper around psycopg2 connection driver
    implementation. We will be using psycopg2 for makeing connection with
    the PostgreSQL/Postgres Plus Advanced Server (EnterpriseDB).

    Properties:
    ----------

    * Version (string):
        Version of psycopg2 driver

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

        import datetime
        if session['_id'] not in self.managers:
            self.managers[session['_id']] = managers = dict()
        else:
            managers = self.managers[session['_id']]

        managers['pinged'] = datetime.datetime.now()
        if str(sid) not in managers:
            from pgadmin.settings.settings_model import Server
            s = Server.query.filter_by(id=sid).first()

            managers[str(sid)] = ServerManager(s)

            return managers[str(sid)]

        return managers[str(sid)]

    def Version(cls):
        """
        Version(...)

        Returns the current version of psycopg2 driver
        """
        version = getattr(psycopg2, '__version__', None)

        if version:
            return version

        raise Exception(
                "Driver Version information for psycopg2 is not available!"
            )

    def get_connection(
            self, sid, database=None, conn_id=None, auto_reconnect=True
            ):
        """
        get_connection(...)

        Returns the connection object for the certain connection-id/database
        for the specific server, identified by sid. Create a new Connection
        object (if require).

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
        manager = self.connection_manager(sid)

        return manager.connection(database, conn_id, auto_reconnect)

    def release_connection(self, sid, database=None, conn_id=None):
        """
        Release the connection for the given connection-id/database in this
        session.
        """
        return self.connection_manager(sid).release(database, conn_id)

    def gc(self):
        """
        Release the connections for the sessions, which have not pinged the
        server for more than config.MAX_SESSION_IDLE_TIME.
        """
        import datetime
        import config

        # Mininum session idle is 20 minutes
        max_idle_time = max(config.MAX_SESSION_IDLE_TIME or 60, 20)
        session_idle_timeout = datetime.timedelta(minutes=max_idle_time)

        curr_time = datetime.datetime.now()

        for sess in self.managers:
            sess_mgr = self.managers[sess]

            if sess == session['_id']:
                sess_mgr['pinged'] = curr_time
                continue

            if (curr_time - sess_mgr['pinged'] >= session_idle_timeout):
                for mgr in [m for m in sess_mgr if isinstance(m,
                        ServerManager)]:
                    mgr.release()
