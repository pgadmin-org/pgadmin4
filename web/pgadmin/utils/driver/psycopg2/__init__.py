##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implementation of Connection, ServerManager and Driver classes using the
psycopg2. It is a wrapper around the actual psycopg2 driver, and connection
object.
"""

from datetime import datetime

import psycopg2
import psycopg2.extras
from psycopg2.extensions import adapt

from flask import g, current_app, session
from flask.ext.babel import gettext
from flask.ext.security import current_user

from ..abstract import BaseDriver, BaseConnection
from pgadmin.model import Server, User
from pgadmin.utils.crypto import decrypt
import random
import select

from .keywords import ScanKeyword


_ = gettext

ASYNC_WAIT_TIMEOUT = 0.1  # in seconds or 100 milliseconds


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

    * execute_async(query, params)
      - Execute the given query asynchronously and returns result.

    * execute_void(query, params)
      - Execute the given query with no result.

    * execute_2darray(query, params)
      - Execute the given query and returns the result as a 2 dimensional
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
      - Transaction Status

    * ping()
      - Ping the server.

    * _release()
      - Release the connection object of psycopg2

    * _wait(conn)
      - This method is used to wait for asynchronous connection. This is a
        blocking call.

    * _wait_timeout(conn, time)
      - This method is used to wait for asynchronous connection with timeout.
        This is a non blocking call.

    * poll()
      - This method is used to poll the data of query running on asynchronous
        connection.

    * cancel_transaction(conn_id, did=None)
      - This method is used to cancel the transaction for the
        specified connection id and database id.

    * messages()
      - Returns the list of messages/notices sends from the PostgreSQL database
        server.
    """
    def __init__(self, manager, conn_id, db, auto_reconnect=True, async=0):
        assert(manager is not None)
        assert(conn_id is not None)

        self.conn_id = conn_id
        self.manager = manager
        self.db = db if db is not None else manager.db
        self.conn = None
        self.auto_reconnect = auto_reconnect
        self.async = async
        self.__async_cursor = None
        self.__async_query_id = None
        self.__backend_pid = None

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
                return False, gettext("Unauthorized Request.")

            try:
                password = decrypt(encpass, user.password)
            except Exception as e:
                current_app.logger.exception(e)
                return False, \
                    _("Failed to decrypt the saved password!\nError: {0}").format(
                        str(e)
                        )

            # password is in bytes, for python3 we need it in string
            if isinstance(password, bytes):
                password = password.decode()

        try:
            import os
            os.environ['PGAPPNAME'] = 'pgAdmin IV - {0}'.format(self.conn_id)
            pg_conn = psycopg2.connect(
                    host=mgr.host,
                    port=mgr.port,
                    database=self.db,
                    user=mgr.user,
                    password=password,
                    async=self.async
                    )

            # If connection is asynchronous then we will have to wait
            # until the connection is ready to use.
            if self.async == 1:
                self._wait(pg_conn)

        except psycopg2.Error as e:
            if e.pgerror:
                msg = e.pgerror
            elif e.diag.message_detail:
                msg = e.diag.message_detail
            else:
                msg = str(e)
            current_app.logger.info("""
Failed to connect to the database server(#{server_id}) for connection ({conn_id}) with error message as below:
{msg}""".format(
                        server_id=self.manager.sid,
                        conn_id=self.conn_id,
                        msg=msg
                        )
                    )

            return False, msg

        self.conn = pg_conn
        self.__backend_pid = pg_conn.get_backend_pid()

        # autocommit and client encoding not worked with asynchronous connection
        # By default asynchronous connection runs in autocommit mode
        if self.async == 0:
            self.conn.autocommit = True
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
                current_app.logger.error("""
Connect to the database server (#{server_id}) for connection ({conn_id}), but - failed to setup the role with error message as below:
{msg}
""".format(
                        server_id=self.manager.sid,
                        conn_id=self.conn_id,
                        msg=res
                        )
                    )
                return False, \
                    _("Failed to setup the role with error message:\n{0}").format(
                            res
                            )

        if mgr.ver is None:
            status, res = self.execute_scalar("SELECT version()")

            if status:
                mgr.ver = res
                mgr.sversion = pg_conn.server_version
            else:
                self.conn.close()
                self.conn = None
                current_app.logger.error("""
Failed to fetch the version information on the established connection to the database server (#{server_id}) for '{conn_id}' with below error message:
{msg}
""".format(
                        server_id=self.manager.sid,
                        conn_id=self.conn_id,
                        msg=res
                        )
                    )
                return False, res

        status, res = self.execute_dict("""
SELECT
    db.oid as did, db.datname, db.datallowconn, pg_encoding_to_char(db.encoding) AS serverencoding,
    has_database_privilege(db.oid, 'CREATE') as cancreate, datlastsysoid
FROM
    pg_database db
WHERE db.datname = current_database()""")

        if status:
            mgr.db_info = dict()
            f_row = res['rows'][0]
            mgr.db_info[f_row['did']] = f_row.copy()

        status, res = self.execute_dict("""
SELECT
    oid as id, rolname as name, rolsuper as is_superuser,
    rolcreaterole as can_create_role, rolcreatedb as can_create_db
FROM
    pg_catalog.pg_roles
WHERE
    rolname = current_user""")

        if status:
            mgr.user_info = dict()
            f_row = res['rows'][0]
            mgr.user_info = f_row.copy()

        if 'password' in kwargs:
            mgr.password = kwargs['password']

        if 'server_types' in kwargs and isinstance(kwargs['server_types'], list):
            for st in kwargs['server_types']:
                if st.instanceOf(mgr.ver):
                    mgr.server_type = st.stype
                    break

        return True, None

    def __cursor(self):
        cur = getattr(g, self.conn_id, None)

        if self.connected() and cur and not cur.closed:
            return True, cur

        if not self.connected():
            status = False
            errmsg = ""

            current_app.logger.warning("""
Connection to database server (#{server_id}) for the connection - '{conn_id}' has been lost.
""".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id
                    )
                )

            if self.auto_reconnect:
                status, errmsg = self.connect()

                if not status:
                    errmsg = gettext(
                            """
Attempt to reconnect has failed with the below error:
{0}""".format(errmsg)
                        )

            if not status:
                msg = gettext("Connection was lost!\n{0}").format(errmsg)
                current_app.logger.error(errmsg)

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
                current_app.logger.debug("""
Attempting to reconnect to the database server (#{server_id}) for the connection - '{conn_id}'.
""".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id
                    )
                )
                status, cur = self.connect()
                if not status:
                    msg = gettext(
                        """
Connection for server#{0} with database "{1}" was lost.
Attempt to reconnect it failed with the below error:
{2}"""
                        ).format(self.driver.server_id, self.database, cur)
                    current_app.logger.error(msg)

                    return False, cur
            else:
                return False, errmsg

        setattr(g, self.conn_id, cur)

        return True, cur

    def __internal_blocking_execute(self, cur, query, params):
        """
        This function executes the query using cursor's execute function,
        but in case of asynchronous connection we need to wait for the
        transaction to be completed. If self.async is 1 then it is a
        blocking call.

        Args:
            cur: Cursor object
            query: SQL query to run.
            params: Extra parameters
        """
        cur.execute(query, params)
        if self.async == 1:
            self._wait(cur.connection)

    def execute_scalar(self, query, params=None):
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(25,
                "Execute (scalar) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query=query,
                    query_id=query_id
                    )
                )
        try:
            self.__internal_blocking_execute(cur, query, params)
        except psycopg2.Error as pe:
            cur.close()
            errmsg = str(pe)
            current_app.logger.error(
                    "Failed to execute query (execute_scalar) for the server #{server_id} - {conn_id} (Query-id: {query_id}):\nError Message:{errmsg}".format(
                        server_id=self.manager.sid,
                        conn_id=self.conn_id,
                        query=query,
                        errmsg=errmsg,
                        query_id=query_id
                        )
                    )
            return False, errmsg

        if cur.rowcount > 0:
            res = cur.fetchone()
            if len(res) > 0:
                return True, res[0]

        return True, None

    def execute_async(self, query, params=None):
        """
        This function executes the given query asynchronously and returns result.

        Args:
            query: SQL query to run.
            params: extra parameters to the function
        """
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(25, """
Execute (async) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}
""".format(
            server_id=self.manager.sid,
            conn_id=self.conn_id,
            query=query,
            query_id=query_id
            )
        )

        try:
            cur.execute(query, params)
            res = self._wait_timeout(cur.connection, ASYNC_WAIT_TIMEOUT)
        except psycopg2.Error as pe:
            errmsg = str(pe)
            current_app.logger.error("""
Failed to execute query (execute_async) for the server #{server_id} - {conn_id}
(Query-id: {query_id}):\nError Message:{errmsg}
""".format(
                server_id=self.manager.sid,
                conn_id=self.conn_id,
                query=query,
                errmsg=errmsg,
                query_id=query_id
                )
            )
            return False, errmsg

        self.__async_cursor = cur
        self.__async_query_id = query_id

        return True, res

    def execute_void(self, query, params=None):
        """
        This function executes the given query with no result.

        Args:
            query: SQL query to run.
            params: extra parameters to the function
        """
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(25, """
Execute (void) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}
""".format(
            server_id=self.manager.sid,
            conn_id=self.conn_id,
            query=query,
            query_id=query_id
            )
        )

        try:
            self.__internal_blocking_execute(cur, query, params)
        except psycopg2.Error as pe:
            cur.close()
            errmsg = str(pe)
            current_app.logger.error("""
Failed to execute query (execute_void) for the server #{server_id} - {conn_id}
(Query-id: {query_id}):\nError Message:{errmsg}
""".format(
                server_id=self.manager.sid,
                conn_id=self.conn_id,
                query=query,
                errmsg=errmsg,
                query_id=query_id
                )
            )
            return False, errmsg

        return True, None

    def execute_2darray(self, query, params=None):
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)

        query_id = random.randint(1, 9999999)
        current_app.logger.log(25,
                "Execute (2darray) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query=query,
                    query_id=query_id
                    )
                )
        try:
            self.__internal_blocking_execute(cur, query, params)
        except psycopg2.Error as pe:
            cur.close()
            errmsg = str(pe)
            current_app.logger.error(
                    "Failed to execute query (execute_2darray) for the server #{server_id} - {conn_id} (Query-id: {query_id}):\nError Message:{errmsg}".format(
                        server_id=self.manager.sid,
                        conn_id=self.conn_id,
                        query=query,
                        errmsg=errmsg,
                        query_id=query_id
                        )
                    )
            return False, errmsg

        import copy
        # Get Resultset Column Name, Type and size
        columns = cur.description and [
                copy.deepcopy(desc._asdict()) for desc in cur.description
                ] or []

        rows = []
        if cur.rowcount > 0:
            for row in cur:
                rows.append(row)

        return True, {'columns': columns, 'rows': rows}

    def execute_dict(self, query, params=None):
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)
        current_app.logger.log(25,
                "Execute (dict) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query=query,
                    query_id=query_id
                    )
                )
        try:
            self.__internal_blocking_execute(cur, query, params)
        except psycopg2.Error as pe:
            cur.close()
            errmsg = str(pe)
            current_app.logger.error(
                    "Failed to execute query (execute_dict) for the server #{server_id}- {conn_id} (Query-id: {query_id}):\nError Message:{errmsg}".format(
                        server_id=self.manager.sid,
                        conn_id=self.conn_id,
                        query_id=query_id,
                        errmsg=errmsg
                        )
                    )
            return False, errmsg

        import copy
        # Get Resultset Column Name, Type and size
        columns = cur.description and [
                copy.deepcopy(desc._asdict()) for desc in cur.description
                ] or []

        rows = []
        if cur.rowcount > 0:
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
                return False, gettext("Unauthorized Request.")

            password = decrypt(password, user.password).decode()

        try:
            pg_conn = psycopg2.connect(
                    host=mgr.host,
                    port=mgr.port,
                    database=self.db,
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
        self.__backend_pid = pg_conn.get_backend_pid()

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

    def _wait(self, conn):
        """
        This function is used for the asynchronous connection,
        it will call poll method in a infinite loop till poll
        returns psycopg2.extensions.POLL_OK. This is a blocking
        call.

        Args:
            conn: connection object
        """

        while 1:
            state = conn.poll()
            if state == psycopg2.extensions.POLL_OK:
                break
            elif state == psycopg2.extensions.POLL_WRITE:
                select.select([], [conn.fileno()], [])
            elif state == psycopg2.extensions.POLL_READ:
                select.select([conn.fileno()], [], [])
            else:
                raise psycopg2.OperationalError("poll() returned %s from _wait function" % state)

    def _wait_timeout(self, conn, time):
        """
        This function is used for the asynchronous connection,
        it will call poll method and return the status. If state is
        psycopg2.extensions.POLL_WRITE and psycopg2.extensions.POLL_READ
        function will wait for the given timeout.This is not a blocking call.

        Args:
            conn: connection object
            time: wait time
        """

        state = conn.poll()
        if state == psycopg2.extensions.POLL_OK:
            return self.ASYNC_OK
        elif state == psycopg2.extensions.POLL_WRITE:
            select.select([], [conn.fileno()], [], time)
            return self.ASYNC_WRITE_TIMEOUT
        elif state == psycopg2.extensions.POLL_READ:
            select.select([conn.fileno()], [], [], time)
            return self.ASYNC_READ_TIMEOUT
        else:
            raise psycopg2.OperationalError("poll() returned %s from _wait_timeout function" % state)

    def poll(self):
        """
        This function is a wrapper around connection's poll function.
        It internally uses the _wait_timeout method to poll the
        result on the connection object. In case of success it
        returns the result of the query.
        """

        cur = self.__async_cursor
        if not cur:
            return False, gettext("Cursor could not found for the aysnc connection."), None

        current_app.logger.log(25, """
Polling result for (Query-id: {query_id})""".format(query_id=self.__async_query_id))

        status = self._wait_timeout(self.conn, ASYNC_WAIT_TIMEOUT)
        if status == self.ASYNC_OK:
            if cur.rowcount > 0:
                # Fetch the column information
                colinfo = [desc for desc in cur.description]
                result = []
                # Fetch the data rows.
                for row in cur:
                    result.append(dict(row))
                self.__async_cursor = None
                return status, result, colinfo
        return status, None, None

    def cancel_transaction(self, conn_id, did=None):
        """
        This function is used to cancel the running transaction
        of the given connection id and database id using
        PostgreSQL's pg_cancel_backend.

        Args:
            conn_id: Connection id
            did: Database id (optional)
        """
        cancel_conn = self.manager.connection(did=did, conn_id=conn_id)
        query = """SELECT pg_cancel_backend({0});""".format(cancel_conn.__backend_pid)

        status = True
        msg = ''

        # if backend pid is same then create a new connection
        # to cancel the query and release it.
        if cancel_conn.__backend_pid == self.__backend_pid:
            password = getattr(self.manager, 'password', None)
            if password:
                # Fetch Logged in User Details.
                user = User.query.filter_by(id=current_user.id).first()
                if user is None:
                    return False, gettext("Unauthorized Request.")

                password = decrypt(password, user.password).decode()

            try:
                pg_conn = psycopg2.connect(
                    host=self.manager.host,
                    port=self.manager.port,
                    database=self.db,
                    user=self.manager.user,
                    password=password
                )

                # Get the cursor and run the query
                cur = pg_conn.cursor()
                cur.execute(query)

                # Close the connection
                pg_conn.close()
                pg_conn = None

            except psycopg2.Error as e:
                status = False
                if e.pgerror:
                    msg = e.pgerror
                elif e.diag.message_detail:
                    msg = e.diag.message_detail
                else:
                    msg = str(e)
                return status, msg
        else:
            if self.connected():
                status, msg = self.execute_void(query)
            else:
                status = False
                msg = gettext("Not connected to the database server.")

        return status, msg

    def messages(self):
        """
        Returns the list of the messages/notices send from the database server.
        """
        return self.conn.notices if self.conn else []


class ServerManager(object):
    """
    class ServerManager

    This class contains the information about the given server.
    And, acts as connection manager for that particular session.
    """
    def __init__(self, server):
        self.connections = dict()

        self.update(server)

    def update(self, server):
        assert(server is not None)
        assert(isinstance(server, Server))

        self.module = None
        self.ver = None
        self.sversion = None
        self.server_type = None
        self.password = None

        self.sid = server.id
        self.host = server.host
        self.port = server.port
        self.db = server.maintenance_db
        self.user = server.username
        self.password = server.password
        self.role = server.role
        self.ssl_mode = server.ssl_mode
        self.pinged = datetime.now()
        self.db_info = dict()

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

    def connection(self, database=None, conn_id=None, auto_reconnect=True, did=None):
        msg_active_conn = gettext(
            "Server has no active connection, please connect it first!"
            )

        if database is None:
            if did is None:
                database = self.db
            elif did in self.db_info:
                database = self.db_info[did]['datname']
            else:
                maintenance_db_id = 'DB:' + self.db
                if maintenance_db_id in self.connections:
                    conn = self.connections[maintenance_db_id]
                    if conn.connected():
                        status, res = conn.execute_dict("""
SELECT
    db.oid as did, db.datname, db.datallowconn, pg_encoding_to_char(db.encoding) AS serverencoding,
    has_database_privilege(db.oid, 'CREATE') as cancreate, datlastsysoid
FROM
    pg_database db
WHERE db.oid = {0}""".format(did))

                        if status and len(res['rows']) > 0:
                            for row in res['rows']:
                                self.db_info[did] = row
                                database = self.db_info[did]['datname']

                        if did not in self.db_info:
                            raise Exception(gettext(
                                "Couldn't find the database!"
                                ))

        if database is None:
            raise Exception(msg_active_conn)

        my_id = ('CONN:' + str(conn_id)) if conn_id is not None else \
                ('DB:' + str(database))

        self.pinged = datetime.now()

        if my_id in self.connections:
            return self.connections[my_id]
        else:
            async = 1 if conn_id is not None else 0
            self.connections[my_id] = Connection(
                    self, my_id, database, auto_reconnect, async
                    )

            return self.connections[my_id]

    def release(self, database=None, conn_id=None, did=None):
        if did is not None:
            if did in self.db_info and 'datname' in self.db_info[did]:
                database = self.db_info[did]['datname']
                if database is None:
                    return False
            else:
                return False


        my_id = ('CONN:' + str(conn_id)) if conn_id is not None else \
                ('DB:' + str(database)) if database is not None else None

        if my_id is not None:
            if my_id in self.connections:
                self.connections[my_id]._release()
                del self.connections[my_id]

                if len(self.connections) == 0:
                    self.ver = None
                    self.sversion = None
                    self.server_type = None
                    self.password = None

                return True
            else:
                return False

        for con in self.connections:
            self.connections[con]._release()

        self.connections = dict()
        self.ver = None
        self.sversion = None
        self.server_type = None
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
            from pgadmin.model import Server
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

    @staticmethod
    def qtLiteral(value):

        res = adapt(value).getquoted()

        # Returns in bytes, we need to convert it in string
        if isinstance(res, bytes):
            return res.decode()
        else:
            return res

    @staticmethod
    def ScanKeywordExtraLookup(key):
        # UNRESERVED_KEYWORD      0
        # COL_NAME_KEYWORD        1
        # TYPE_FUNC_NAME_KEYWORD  2
        # RESERVED_KEYWORD        3
        extraKeywords = {
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
            };

        return (key in extraKeywords and extraKeywords[key]) or ScanKeyword(key)

    @staticmethod
    def needsQuoting(key, forTypes):

        # Python 3 does not require the decoding of value
        if hasattr(str, 'decode'):
            value = key.decode()
        else:
            value = key
        valNoArray = value

        # check if the string is number or not
        if (isinstance(value, int)):
            return True;
        # certain types should not be quoted even though it contains a space. Evilness.
        elif forTypes and value[-2:] == u"[]":
            valNoArray = value[:-2]

        if forTypes and valNoArray.lower() in [
            u'bit varying',
            u'"char"',
            u'character varying',
            u'double precision',
            u'timestamp without time zone',
            u'timestamp with time zone',
            u'time without time zone',
            u'time with time zone',
            u'"trigger"',
            u'"unknown"'
            ]:
            return False

        if u'0' <= valNoArray[0] <= u'9':
            return True

        for c in valNoArray:
            if (not (u'a' <= c <= u'z') and c != u'_' and
                    not (u'0' <= c <= u'9')):
                return True

        # check string is keywaord or not
        category = Driver.ScanKeywordExtraLookup(value)

        if category is None:
            return False

        # UNRESERVED_KEYWORD
        if category == 0:
            return False

        # COL_NAME_KEYWORD
        if forTypes and category == 1:
            return False

        return True

    @staticmethod
    def qtTypeIdent(conn, *args):
        # We're not using the conn object at the moment, but - we will modify the
        # logic to use the server version specific keywords later.
        res = None
        value = None

        for val in args:
            if len(val) == 0:
                continue

            value = val

            if (Driver.needsQuoting(val, True)):
                value = value.replace("\"", "\"\"")
                value = "\"" + value + "\""

            res = ((res and res + '.') or '') + value

        return res

    @staticmethod
    def qtIdent(conn, *args):
        # We're not using the conn object at the moment, but - we will modify the
        # logic to use the server version specific keywords later.
        res = None
        value = None

        for val in args:
            if type(val) == list:
                return map(lambda w: Driver.qtIdent(conn, w), val)

            val = str(val)
            if len(val) == 0:
                continue

            value = val

            if (Driver.needsQuoting(val, False)):
                value = value.replace("\"", "\"\"")
                value = "\"" + value + "\""

            res = ((res and res + '.') or '') + value

        return res
