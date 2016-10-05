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

import datetime
import os
import random
import select
import sys
import csv

import psycopg2
import psycopg2.extras
from flask import g, current_app, session
from flask_babel import gettext
from flask_security import current_user
from pgadmin.utils.crypto import decrypt
from psycopg2.extensions import adapt

import config
from pgadmin.model import Server, User
from pgadmin.utils.exception import ConnectionLost
from .keywords import ScanKeyword
from ..abstract import BaseDriver, BaseConnection
from .cursor import DictCursor

if sys.version_info < (3,):
    from StringIO import StringIO
else:
    from io import StringIO

_ = gettext

ASYNC_WAIT_TIMEOUT = 0.01  # in seconds or 10 milliseconds

# This registers a unicode type caster for datatype 'RECORD'.
psycopg2.extensions.register_type(
    psycopg2.extensions.new_type((2249,), "RECORD",
                                 psycopg2.extensions.UNICODE)
)

# Cast bytea fields to text. By default, this will render as hex strings with
# Postgres 9+ and as escaped binary in earlier versions.
psycopg2.extensions.register_type(
    psycopg2.extensions.new_type((17,), 'BYTEA_TEXT', psycopg2.STRING)
)

# This registers a type caster for datatype 'NaN'.
psycopg2.extensions.register_type(
    psycopg2.extensions.new_type((701,), 'NaN_TEXT', psycopg2.STRING)
)

# This registers a type caster for datatype 'interval'.
psycopg2.extensions.register_type(
    psycopg2.extensions.new_type((1186,), 'INTERVAL_TEXT', psycopg2.STRING)
)

# This registers a type caster for int4range, int8range, numrange
# tsrange, tstzrange, daterange
psycopg2.extensions.register_type(
    psycopg2.extensions.new_type(
        (3904, 3926, 3906, 3908, 3910, 3912),
        'NUMERIC_RANGE_TEXT', psycopg2.STRING)
)

def register_string_typecasters(connection):
    """
    Casts various types to string, resolving issues with out of
    range dates (e.g. BC) and rounded numbers which psycopg2 can't
    handle
    """

    def return_as_string(value, cursor):
        return value

    cursor = connection.cursor()
    cursor.execute('SELECT NULL::date, NULL::timestamp, NULL::timestamptz, NULL::bigint')
    # Oid(s): Date, timestamp, timestamptz, bigint, double precision
    oids = (
        cursor.description[0][1], cursor.description[1][1],
        cursor.description[2][1], cursor.description[3][1]
    )
    new_type = psycopg2.extensions.new_type(oids, 'RETURN_STRING', return_as_string)
    psycopg2.extensions.register_type(new_type)

class Connection(BaseConnection):
    """
    class Connection(object)

        A wrapper class, which wraps the psycopg2 connection object, and
        delegate the execution to the actual connection object, when required.

    Methods:
    -------
    * connect(**kwargs)
      - Connect the PostgreSQL/Postgres Plus servers using the psycopg2 driver

    * execute_scalar(query, params, formatted_exception_msg)
      - Execute the given query and returns single datum result

    * execute_async(query, params, formatted_exception_msg)
      - Execute the given query asynchronously and returns result.

    * execute_void(query, params, formatted_exception_msg)
      - Execute the given query with no result.

    * execute_2darray(query, params, formatted_exception_msg)
      - Execute the given query and returns the result as a 2 dimensional
        array.

    * execute_dict(query, params, formatted_exception_msg)
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

    * _reconnect()
      - Attempt to reconnect to the database

    * _wait(conn)
      - This method is used to wait for asynchronous connection. This is a
        blocking call.

    * _wait_timeout(conn, time)
      - This method is used to wait for asynchronous connection with timeout.
        This is a non blocking call.

    * poll(formatted_exception_msg)
      - This method is used to poll the data of query running on asynchronous
        connection.

    * status_message()
      - Returns the status message returned by the last command executed on the server.

    * rows_affected()
      - Returns the no of rows affected by the last command executed on the server.

    * cancel_transaction(conn_id, did=None)
      - This method is used to cancel the transaction for the
        specified connection id and database id.

    * messages()
      - Returns the list of messages/notices sends from the PostgreSQL database
        server.

    * _formatted_exception_msg(exception_obj, formatted_msg)
      - This method is used to parse the psycopg2.Error object and returns the
        formatted error message if flag is set to true else return
        normal error message.

    """

    def __init__(self, manager, conn_id, db, auto_reconnect=True, async=0):
        assert (manager is not None)
        assert (conn_id is not None)

        self.conn_id = conn_id
        self.manager = manager
        self.db = db if db is not None else manager.db
        self.conn = None
        self.auto_reconnect = auto_reconnect
        self.async = async
        self.__async_cursor = None
        self.__async_query_id = None
        self.__backend_pid = None
        self.execution_aborted = False
        self.row_count = 0
        self.__notices = None
        self.password = None
        # This flag indicates the connection status (connected/disconnected).
        self.wasConnected = False
        # This flag indicates the connection reconnecting status.
        self.reconnecting = False

        super(Connection, self).__init__()

    def as_dict(self):
        """
        Returns the dictionary object representing this object.
        """
        # In case, it can not be auto reconnectable, or already been released,
        # then we will return None.
        if not self.auto_reconnect and not self.conn:
            return None

        res = dict()
        res['conn_id'] = self.conn_id
        res['database'] = self.db
        res['async'] = self.async

        return res

    def __repr__(self):
        return "PG Connection: {0} ({1}) -> {2} (ajax:{3})".format(
            self.conn_id, self.db,
            'Connected' if self.conn and not self.conn.closed else
            "Disconnected",
            self.async
        )

    def __str__(self):
        return "PG Connection: {0} ({1}) -> {2} (ajax:{3})".format(
            self.conn_id, self.db,
            'Connected' if self.conn and not self.conn.closed else
            "Disconnected",
            self.async
        )

    def connect(self, **kwargs):
        if self.conn:
            if self.conn.closed:
                self.conn = None
            else:
                return True, None

        pg_conn = None
        password = None
        mgr = self.manager

        encpass = kwargs['password'] if 'password' in kwargs else None

        if encpass is None:
            encpass = self.password or getattr(mgr, 'password', None)

        # Reset the existing connection password
        if self.reconnecting is not False:
            self.password = None

        if encpass:
            # Fetch Logged in User Details.
            user = User.query.filter_by(id=current_user.id).first()

            if user is None:
                return False, gettext("Unauthorized request.")

            try:
                password = decrypt(encpass, user.password)

                # password is in bytes, for python3 we need it in string
                if isinstance(password, bytes):
                    password = password.decode()
            except Exception as e:
                current_app.logger.exception(e)
                return False, \
                       _("Failed to decrypt the saved password!\nError: {0}").format(
                           str(e)
                       )

        try:
            if hasattr(str, 'decode'):
                database = self.db.encode('utf-8')
                user = mgr.user.encode('utf-8')
                conn_id = self.conn_id.encode('utf-8')
            else:
                database = self.db
                user = mgr.user
                conn_id = self.conn_id

            import os
            os.environ['PGAPPNAME'] = '{0} - {1}'.format(config.APP_NAME, conn_id)

            pg_conn = psycopg2.connect(
                host=mgr.host,
                port=mgr.port,
                database=database,
                user=user,
                password=password,
                async=self.async,
                sslmode=mgr.ssl_mode
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
                conn_id=conn_id,
                msg=msg
            )
            )

            return False, msg

        self.conn = pg_conn
        self.wasConnected = True
        try:
            status, msg = self._initialize(conn_id, **kwargs)
        except Exception as e:
            current_app.logger.exception(e)
            self.conn = None
            if not self.reconnecting:
                self.wasConnected = False
            raise e

        if status:
            mgr._update_password(encpass)
        else:
            if not self.reconnecting:
                self.wasConnected = False

        return status, msg

    def _initialize(self, conn_id, **kwargs):
        self.execution_aborted = False
        self.__backend_pid = self.conn.get_backend_pid()

        setattr(g, "{0}#{1}".format(
            self.manager.sid,
            self.conn_id.encode('utf-8')
        ), None)

        status, cur = self.__cursor()
        formatted_exception_msg = self._formatted_exception_msg
        mgr = self.manager

        def _execute(cur, query, params=None):
            try:
                self.__internal_blocking_execute(cur, query, params)
            except psycopg2.Error as pe:
                cur.close()
                return formatted_exception_msg(pe, False)
            return None

        # autocommit flag does not work with asynchronous connections.
        # By default asynchronous connection runs in autocommit mode.
        if self.async == 0:
            if 'autocommit' in kwargs and kwargs['autocommit'] == False:
                self.conn.autocommit = False
            else:
                self.conn.autocommit = True
            register_string_typecasters(self.conn)

        status = _execute(cur, """
SET DateStyle=ISO;
SET client_min_messages=notice;
SET bytea_output=escape;
SET client_encoding='UNICODE';""")

        if status is not None:
            self.conn.close()
            self.conn = None

            return False, status

        if mgr.role:
            status = _execute(cur, u"SET ROLE TO %s", [mgr.role])

            if status is not None:
                self.conn.close()
                self.conn = None
                current_app.logger.error("""
Connect to the database server (#{server_id}) for connection ({conn_id}), but - failed to setup the role with error message as below:
{msg}
""".format(
                    server_id=self.manager.sid,
                    conn_id=conn_id,
                    msg=status
                )
                )
                return False, \
                       _("Failed to setup the role with error message:\n{0}").format(
                           status
                       )

        if mgr.ver is None:
            status = _execute(cur, "SELECT version()")

            if status is not None:
                self.conn.close()
                self.conn = None
                self.wasConnected = False
                current_app.logger.error("""
Failed to fetch the version information on the established connection to the database server (#{server_id}) for '{conn_id}' with below error message:
{msg}
""".format(
                    server_id=self.manager.sid,
                    conn_id=conn_id,
                    msg=status
                )
                )
                return False, status

            if cur.rowcount > 0:
                row = cur.fetchmany(1)[0]
                mgr.ver = row['version']
                mgr.sversion = self.conn.server_version

        status = _execute(cur, """
SELECT
    db.oid as did, db.datname, db.datallowconn, pg_encoding_to_char(db.encoding) AS serverencoding,
    has_database_privilege(db.oid, 'CREATE') as cancreate, datlastsysoid
FROM
    pg_database db
WHERE db.datname = current_database()""")

        if status is None:
            mgr.db_info = mgr.db_info or dict()
            if cur.rowcount > 0:
                res = cur.fetchmany(1)[0]
                mgr.db_info[res['did']] = res.copy()

                # We do not have database oid for the maintenance database.
                if len(mgr.db_info) == 1:
                    mgr.did = res['did']

        status = _execute(cur, """
SELECT
    oid as id, rolname as name, rolsuper as is_superuser,
    rolcreaterole as can_create_role, rolcreatedb as can_create_db
FROM
    pg_catalog.pg_roles
WHERE
    rolname = current_user""")

        if status is None:
            mgr.user_info = dict()
            if cur.rowcount > 0:
                mgr.user_info = cur.fetchmany(1)[0]

        if 'password' in kwargs:
            mgr.password = kwargs['password']

        server_types = None
        if 'server_types' in kwargs and isinstance(kwargs['server_types'], list):
            server_types = mgr.server_types = kwargs['server_types']

        if server_types is None:
            from pgadmin.browser.server_groups.servers.types import ServerType
            server_types = ServerType.types()

        for st in server_types:
            if st.instanceOf(mgr.ver):
                mgr.server_type = st.stype
                mgr.server_cls = st
                break

        mgr.update_session()

        return True, None

    def __cursor(self, server_cursor=False):
        if self.wasConnected is False:
            raise ConnectionLost(
                self.manager.sid,
                self.db,
                None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
            )
        cur = getattr(g, "{0}#{1}".format(
            self.manager.sid,
            self.conn_id.encode('utf-8')
        ), None)

        if self.connected() and cur and not cur.closed:
            if not server_cursor or (server_cursor and cur.name):
                return True, cur

        if not self.connected():
            errmsg = ""

            current_app.logger.warning(
                "Connection to database server (#{server_id}) for the connection - '{conn_id}' has been lost.".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id
                )
            )

            if self.auto_reconnect and not self.reconnecting:
                self.__attempt_execution_reconnect(None)
            else:
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                )

        try:
            if server_cursor:
                # Providing name to cursor will create server side cursor.
                cursor_name = "CURSOR:{0}".format(self.conn_id)
                cur = self.conn.cursor(
                    name=cursor_name, cursor_factory=DictCursor
                )
            else:
                cur = self.conn.cursor(cursor_factory=DictCursor)
        except psycopg2.Error as pe:
            current_app.logger.exception(pe)
            errmsg = gettext(
                "Failed to create cursor for psycopg2 connection with error message for the server#{1}:{2}:\n{0}"
            ).format(
                str(pe), self.manager.sid, self.db
            )

            current_app.logger.error(errmsg)
            if self.conn.closed:
                self.conn = None
                if self.auto_reconnect and not self.reconnecting:
                    current_app.logger.info(
                        gettext(
                            "Attempting to reconnect to the database server (#{server_id}) for the connection - '{conn_id}'."
                        ).format(
                            server_id=self.manager.sid,
                            conn_id=self.conn_id
                        )
                    )
                    return self.__attempt_execution_reconnect(
                        self.__cursor, server_cursor
                    )
                else:
                    raise ConnectionLost(
                        self.manager.sid,
                        self.db,
                        None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                    )

        setattr(
            g, "{0}#{1}".format(
                self.manager.sid, self.conn_id.encode('utf-8')
            ), cur
        )

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


    def execute_on_server_as_csv(self, query, params=None, formatted_exception_msg=False, records=2000):
        status, cur = self.__cursor(server_cursor=True)
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(25,
                               u"Execute (with server cursor) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
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
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"failed to execute query ((with server cursor) for the server #{server_id} - {conn_id} (query-id: {query_id}):\nerror message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query=query,
                    errmsg=errmsg,
                    query_id=query_id
                )
            )
            return False, errmsg

        def gen():

            results = cur.fetchmany(records)
            if not results:
                if not cur.closed:
                    cur.close()
                yield gettext('"The query executed did not return any data."')
                return

            header = [c.to_dict()['name'] for c in cur.ordered_description()]

            res_io = StringIO()

            csv_writer = csv.DictWriter(
                res_io, fieldnames=header, delimiter=str(','), quoting=csv.QUOTE_NONNUMERIC
            )
            csv_writer.writeheader()
            csv_writer.writerows(results)

            yield res_io.getvalue().strip(str('\r\n'))

            while True:
                results = cur.fetchmany(records)

                if not results:
                    if not cur.closed:
                        cur.close()
                    break
                res_io = StringIO()

                csv_writer = csv.DictWriter(
                    res_io, fieldnames=header, delimiter=str(','), quoting=csv.QUOTE_NONNUMERIC
                )
                csv_writer.writerows(results)
                yield res_io.getvalue().strip(str('\r\n'))

        return True, gen

    def execute_scalar(self, query, params=None, formatted_exception_msg=False):
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(
            25,
            u"Execute (scalar) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
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
            if not self.connected():
                if self.auto_reconnect and not self.reconnecting:
                    return self.__attempt_execution_reconnect(
                        self.execute_dict, query, params, formatted_exception_msg
                    )
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_scalar) for the server #{server_id} - {conn_id} (Query-id: {query_id}):\nError Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query=query,
                    errmsg=errmsg,
                    query_id=query_id
                )
            )
            return False, errmsg

        self.row_count = cur.rowcount
        if cur.rowcount > 0:
            res = cur.fetchone()
            if len(res) > 0:
                return True, res[0]

        return True, None

    def execute_async(self, query, params=None, formatted_exception_msg=True):
        """
        This function executes the given query asynchronously and returns result.

        Args:
            query: SQL query to run.
            params: extra parameters to the function
            formatted_exception_msg: if True then function return the formatted exception message
        """
        self.__async_cursor = None
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(
            25,
            u"Execute (async) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
                server_id=self.manager.sid,
                conn_id=self.conn_id,
                query=query,
                query_id=query_id
            )
        )

        try:
            self.__notices = []
            self.execution_aborted = False
            cur.execute(query, params)
            res = self._wait_timeout(cur.connection, ASYNC_WAIT_TIMEOUT)
        except psycopg2.Error as pe:
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(u"""
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

    def execute_void(self, query, params=None, formatted_exception_msg=False):
        """
        This function executes the given query with no result.

        Args:
            query: SQL query to run.
            params: extra parameters to the function
            formatted_exception_msg: if True then function return the formatted exception message
        """
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(
            25,
            u"Execute (void) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
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
            if not self.connected():
                if self.auto_reconnect and not self.reconnecting:
                    return self.__attempt_execution_reconnect(
                        self.execute_void, query, params, formatted_exception_msg
                    )
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(u"""
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

        self.row_count = cur.rowcount

        return True, None

    def __attempt_execution_reconnect(self, fn, *args, **kwargs):
        self.reconnecting = True
        setattr(g, "{0}#{1}".format(
            self.manager.sid,
            self.conn_id.encode('utf-8')
        ), None)
        try:
            status, res = self.connect()
            if status:
                if fn:
                    status, res = fn(*args, **kwargs)
                    self.reconnecting = False
                return status, res
        except Exception as e:
            current_app.logger.exception(e)
            self.reconnecting = False

            current_app.warning(
                "Failed to reconnect the database server (#{server_id})".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id
                )
            )
        self.reconnecting = False
        raise ConnectionLost(
            self.manager.sid,
            self.db,
            None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
        )

    def execute_2darray(self, query, params=None, formatted_exception_msg=False):
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)

        query_id = random.randint(1, 9999999)
        current_app.logger.log(
            25,
            u"Execute (2darray) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
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
            if not self.connected():
                if self.auto_reconnect and \
                        not self.reconnecting:
                    return self.__attempt_execution_reconnect(
                        self.execute_2darray, query, params, formatted_exception_msg
                    )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_2darray) for the server #{server_id} - {conn_id} (Query-id: {query_id}):\nError Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query=query,
                    errmsg=errmsg,
                    query_id=query_id
                )
            )
            return False, errmsg

        # Get Resultset Column Name, Type and size
        columns = cur.description and [
            desc.to_dict() for desc in cur.ordered_description()
            ] or []

        rows = []
        self.row_count = cur.rowcount
        if cur.rowcount > 0:
            for row in cur:
                rows.append(row)

        return True, {'columns': columns, 'rows': rows}

    def execute_dict(self, query, params=None, formatted_exception_msg=False):
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)
        current_app.logger.log(
            25,
            u"Execute (dict) for server #{server_id} - {conn_id} (Query-id: {query_id}):\n{query}".format(
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
            if not self.connected():
                if self.auto_reconnect and not self.reconnecting:
                    return self.__attempt_execution_reconnect(
                        self.execute_dict, query, params,
                        formatted_exception_msg
                    )
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_dict) for the server #{server_id}- {conn_id} (Query-id: {query_id}):\nError Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    query_id=query_id,
                    errmsg=errmsg
                )
            )
            return False, errmsg

        # Get Resultset Column Name, Type and size
        columns = cur.description and [
            desc.to_dict() for desc in cur.ordered_description()
            ] or []

        rows = []
        self.row_count = cur.rowcount
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
                return False, gettext("Unauthorized request.")

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
Failed to reset the connection to the server due to following error:
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
        if self.wasConnected:
            if self.conn:
                self.conn.close()
                self.conn = None
            self.password = None
            self.wasConnected = False

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
            # Wait for the given time and then check the return status
            # If three empty lists are returned then the time-out is reached.
            timeout_status = select.select([], [conn.fileno()], [], time)
            if timeout_status == ([], [], []):
                return self.ASYNC_WRITE_TIMEOUT

            # poll again to check the state if it is still POLL_WRITE
            # then return ASYNC_WRITE_TIMEOUT else return ASYNC_OK.
            state = conn.poll()
            if state == psycopg2.extensions.POLL_WRITE:
                return self.ASYNC_WRITE_TIMEOUT
            return self.ASYNC_OK
        elif state == psycopg2.extensions.POLL_READ:
            # Wait for the given time and then check the return status
            # If three empty lists are returned then the time-out is reached.
            timeout_status = select.select([conn.fileno()], [], [], time)
            if timeout_status == ([], [], []):
                return self.ASYNC_READ_TIMEOUT

            # poll again to check the state if it is still POLL_READ
            # then return ASYNC_READ_TIMEOUT else return ASYNC_OK.
            state = conn.poll()
            if state == psycopg2.extensions.POLL_READ:
                return self.ASYNC_READ_TIMEOUT
            return self.ASYNC_OK
        else:
            raise psycopg2.OperationalError(
                "poll() returned %s from _wait_timeout function" % state
            )

    def poll(self, formatted_exception_msg=False):
        """
        This function is a wrapper around connection's poll function.
        It internally uses the _wait_timeout method to poll the
        result on the connection object. In case of success it
        returns the result of the query.

        Args:
            formatted_exception_msg: if True then function return the formatted
                                     exception message, otherwise error string.
        """

        cur = self.__async_cursor
        if not cur:
            return False, gettext(
                "Cursor could not be found for the async connection."
            ), None

        current_app.logger.log(
            25,
            "Polling result for (Query-id: {query_id})".format(
                query_id=self.__async_query_id
            )
        )

        try:
            status = self._wait_timeout(self.conn, ASYNC_WAIT_TIMEOUT)
        except psycopg2.Error as pe:
            if cur.closed:
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    self.conn_id[5:]
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            return False, errmsg, None

        if self.conn.notices and self.__notices is not None:
            while self.conn.notices:
                self.__notices.append(self.conn.notices.pop(0)[:])

        colinfo = None
        result = None
        self.row_count = 0
        if status == self.ASYNC_OK:

            # if user has cancelled the transaction then changed the status
            if self.execution_aborted:
                status = self.ASYNC_EXECUTION_ABORTED
                self.execution_aborted = False
                return status, result, colinfo

            # Fetch the column information
            if cur.description is not None:
                colinfo = [
                    desc.to_dict() for desc in cur.ordered_description()
                ]

            self.row_count = cur.rowcount
            if cur.rowcount > 0:
                result = []

                # For DDL operation, we may not have result.
                #
                # Because - there is not direct way to differentiate DML and
                # DDL operations, we need to rely on exception to figure that
                # out at the moment.
                try:
                    for row in cur:
                        result.append(dict(row))
                except psycopg2.ProgrammingError:
                    result = None
        return status, result, colinfo

    def status_message(self):
        """
        This function will return the status message returned by the last command executed on the server.
        """
        cur = self.__async_cursor
        if not cur:
            return gettext("Cursor could not be found for the async connection.")

        current_app.logger.log(
            25,
            "Status message for (Query-id: {query_id})".format(
                query_id=self.__async_query_id
            )
        )

        return cur.statusmessage

    def rows_affected(self):
        """
        This function will return the no of rows affected by the last command
        executed on the server.
        """

        return self.row_count

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
                    return False, gettext("Unauthorized request.")

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

                if status:
                    cancel_conn.execution_aborted = True
            else:
                status = False
                msg = gettext("Not connected to the database server.")

        return status, msg

    def messages(self):
        """
        Returns the list of the messages/notices send from the database server.
        """
        resp = []
        while self.__notices:
            resp.append(self.__notices.pop(0))
        return resp

    def _formatted_exception_msg(self, exception_obj, formatted_msg):
        """
        This method is used to parse the psycopg2.Error object and returns the
        formatted error message if flag is set to true else return
        normal error message.

        Args:
            exception_obj: exception object
            formatted_msg: if True then function return the formatted exception message

        """

        if exception_obj.pgerror:
            errmsg = exception_obj.pgerror
        elif exception_obj.diag.message_detail:
            errmsg = exception_obj.diag.message_detail
        else:
            errmsg = str(exception_obj)
        # errmsg might contains encoded value, lets decode it
        if hasattr(str, 'decode'):
            errmsg = errmsg.decode('utf-8')

        # if formatted_msg is false then return from the function
        if not formatted_msg:
            return errmsg

        errmsg += '********** Error **********\n\n'

        if exception_obj.diag.severity is not None \
                and exception_obj.diag.message_primary is not None:
            errmsg += exception_obj.diag.severity + ": " + \
                      exception_obj.diag.message_primary
        elif exception_obj.diag.message_primary is not None:
            errmsg += exception_obj.diag.message_primary

        if exception_obj.diag.sqlstate is not None:
            if not errmsg[:-1].endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('SQL state: ')
            errmsg += exception_obj.diag.sqlstate

        if exception_obj.diag.message_detail is not None:
            if not errmsg[:-1].endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Detail: ')
            errmsg += exception_obj.diag.message_detail

        if exception_obj.diag.message_hint is not None:
            if not errmsg[:-1].endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Hint: ')
            errmsg += exception_obj.diag.message_hint

        if exception_obj.diag.statement_position is not None:
            if not errmsg[:-1].endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Character: ')
            errmsg += exception_obj.diag.statement_position

        if exception_obj.diag.context is not None:
            if not errmsg[:-1].endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Context: ')
            errmsg += exception_obj.diag.context

        return errmsg


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
        assert (server is not None)
        assert (isinstance(server, Server))

        self.ver = None
        self.sversion = None
        self.server_type = None
        self.server_cls = None
        self.password = None

        self.sid = server.id
        self.host = server.host
        self.port = server.port
        self.db = server.maintenance_db
        self.did = None
        self.user = server.username
        self.password = server.password
        self.role = server.role
        self.ssl_mode = server.ssl_mode
        self.pinged = datetime.datetime.now()
        self.db_info = dict()
        self.server_types = None

        for con in self.connections:
            self.connections[con]._release()

        self.update_session()

        self.connections = dict()

    def as_dict(self):
        """
        Returns a dictionary object representing the server manager.
        """
        if self.ver is None or len(self.connections) == 0:
            return None

        res = dict()
        res['sid'] = self.sid
        if hasattr(self.password, 'decode'):
            res['password'] = self.password.decode('utf-8')
        else:
            res['password'] = str(self.password)

        connections = res['connections'] = dict()

        for conn_id in self.connections:
            conn = self.connections[conn_id].as_dict()

            if conn is not None:
                connections[conn_id] = conn

        return res

    def ServerVersion(self):
        return self.ver

    @property
    def version(self):
        return self.sversion

    def MajorVersion(self):
        if self.sversion is not None:
            return int(self.sversion / 10000)
        raise Exception("Information is not available.")

    def MinorVersion(self):
        if self.sversion:
            return int(int(self.sversion / 100) % 100)
        raise Exception("Information is not available.")

    def PatchVersion(self):
        if self.sversion:
            return int(int(self.sversion / 100) / 100)
        raise Exception("Information is not available.")

    def connection(
            self, database=None, conn_id=None, auto_reconnect=True, did=None,
            async=None
    ):
        if database is not None:
            if hasattr(str, 'decode') and \
                    not isinstance(database, unicode):
                database = database.decode('utf-8')
        else:
            if did is None:
                database = self.db
            elif did in self.db_info:
                database = self.db_info[did]['datname']
                if hasattr(str, 'decode'):
                    database = database.decode('utf-8')
            else:
                maintenance_db_id = u'DB:{0}'.format(self.db)
                if maintenance_db_id in self.connections:
                    conn = self.connections[maintenance_db_id]
                    if conn.connected():
                        status, res = conn.execute_dict(u"""
SELECT
    db.oid as did, db.datname, db.datallowconn,
    pg_encoding_to_char(db.encoding) AS serverencoding,
    has_database_privilege(db.oid, 'CREATE') as cancreate, datlastsysoid
FROM
    pg_database db
WHERE db.oid = {0}""".format(did))

                        if status and len(res['rows']) > 0:
                            for row in res['rows']:
                                self.db_info[did] = row
                                if hasattr(str, 'decode'):
                                    self.db_info[did]['datname'] = \
                                        self.db_info[did]['datname'].decode('utf-8')
                                database = self.db_info[did]['datname']

                        if did not in self.db_info:
                            raise Exception(gettext(
                                "Couldn't find the specified database."
                            ))

        if database is None:
            raise ConnectionLost(self.sid, None, None)

        my_id = (u'CONN:{0}'.format(conn_id)) if conn_id is not None else \
            (u'DB:{0}'.format(database))

        self.pinged = datetime.datetime.now()

        if my_id in self.connections:
            return self.connections[my_id]
        else:
            if async is None:
                async = 1 if conn_id is not None else 0
            else:
                async = 1 if async is True else 0
            self.connections[my_id] = Connection(
                self, my_id, database, auto_reconnect, async
            )

            return self.connections[my_id]

    def _restore(self, data):
        """
        Helps restoring to reconnect the auto-connect connections smoothly on
        reload/restart of the app server..
        """
        # Hmm.. we will not honour this request, when I already have
        # connections
        if len(self.connections) != 0:
            return

        # We need to know about the existing server variant supports during
        # first connection for identifications.
        from pgadmin.browser.server_groups.servers.types import ServerType
        self.pinged = datetime.datetime.now()
        try:
            data['password'] = data['password'].encode('utf-8')
        except:
            pass

        connections = data['connections']
        for conn_id in connections:
            conn_info = connections[conn_id]
            conn = self.connections[conn_info['conn_id']] = Connection(
                self, conn_info['conn_id'], conn_info['database'],
                True, conn_info['async']
            )

            try:
                conn.connect(
                    password=data['password'],
                    server_types=ServerType.types()
                )
            except Exception as e:
                current_app.logger.exception(e)
                self.connections.pop(conn_info['conn_id'])

    def release(self, database=None, conn_id=None, did=None):
        if did is not None:
            if did in self.db_info and 'datname' in self.db_info[did]:
                database = self.db_info[did]['datname']
                if hasattr(str, 'decode'):
                    database = database.decode('utf-8')
                if database is None:
                    return False
            else:
                return False

        my_id = (u'CONN:{0}'.format(conn_id)) if conn_id is not None else \
            (u'DB:{0}'.format(database)) if database is not None else None

        if my_id is not None:
            if my_id in self.connections:
                self.connections[my_id]._release()
                del self.connections[my_id]

                if len(self.connections) == 0:
                    self.ver = None
                    self.sversion = None
                    self.server_type = None
                    self.server_cls = None
                    self.password = None

                self.update_session()

                return True
            else:
                return False

        for con in self.connections:
            self.connections[con]._release()

        self.connections = dict()
        self.ver = None
        self.sversion = None
        self.server_type = None
        self.server_cls = None
        self.password = None

        self.update_session()

        return True

    def _update_password(self, passwd):
        self.password = passwd
        for conn_id in self.connections:
            conn = self.connections[conn_id]
            if conn.conn is not None or conn.wasConnected is True:
                conn.password = passwd

    def update_session(self):
        managers = session['__pgsql_server_managers'] \
            if '__pgsql_server_managers' in session else dict()
        updated_mgr = self.as_dict()

        if not updated_mgr:
            if self.sid in managers:
                managers.pop(self.sid)
        else:
            managers[self.sid] = updated_mgr
        session['__pgsql_server_managers'] = managers

    def utility(self, operation):
        """
        utility(operation)

        Returns: name of the utility which used for the operation
        """
        if self.server_cls is not None:
            return self.server_cls.utility(operation, self.sversion)

        return None

    def export_password_env(self, env):
        if self.password:
            password = decrypt(
                self.password, current_user.password
            ).decode()
            os.environ[str(env)] = password


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

        if session['_id'] not in self.managers:
            self.managers[session['_id']] = managers = dict()
            if '__pgsql_server_managers' in session:
                session_managers = session['__pgsql_server_managers'].copy()
                session['__pgsql_server_managers'] = dict()

                for server_id in session_managers:
                    s = Server.query.filter_by(id=server_id).first()

                    if not s:
                        continue

                    manager = managers[str(server_id)] = ServerManager(s)
                    manager._restore(session_managers[server_id])
                    manager.update_session()
        else:
            managers = self.managers[session['_id']]

        managers['pinged'] = datetime.datetime.now()
        if str(sid) not in managers:
            s = Server.query.filter_by(id=sid).first()

            if not s:
                return None

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

    def delete_manager(self, sid):
        """
        Delete manager for given server id.
        """
        manager = self.connection_manager(sid)
        if manager is not None:
            manager.release()
        if session['_id'] in self.managers and \
                str(sid) in self.managers[session['_id']]:
            del self.managers[session['_id']][str(sid)]

    def gc(self):
        """
        Release the connections for the sessions, which have not pinged the
        server for more than config.MAX_SESSION_IDLE_TIME.
        """

        # Mininum session idle is 20 minutes
        max_idle_time = max(config.MAX_SESSION_IDLE_TIME or 60, 20)
        session_idle_timeout = datetime.timedelta(minutes=max_idle_time)

        curr_time = datetime.datetime.now()

        for sess in self.managers:
            sess_mgr = self.managers[sess]

            if sess == session.get('_id'):
                sess_mgr['pinged'] = curr_time
                continue

            if (curr_time - sess_mgr['pinged'] >= session_idle_timeout):
                for mgr in [m for m in sess_mgr if isinstance(m,
                                                              ServerManager)]:
                    mgr.release()

    @staticmethod
    def qtLiteral(value):
        try:
            res = adapt(value).getquoted()
        except UnicodeEncodeError:
            # We will handle special characters with utf8 encoding
            adapted = adapt(value)
            adapted.encoding = 'utf8'
            res = adapted.getquoted()

        # Returns in bytes, we need to convert it in string
        if isinstance(res, bytes):
            try:
                res = res.decode()
            except UnicodeDecodeError:
                res = res.decode('utf-8')

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
        value = key
        valNoArray = value

        # check if the string is number or not
        if isinstance(value, int):
            return True
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

        # If already quoted?, If yes then do not quote again
        if forTypes and valNoArray:
            if valNoArray.startswith('"') \
                    or valNoArray.endswith('"'):
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
            if hasattr(str, 'decode') and not isinstance(val, unicode):
                # Handling for python2
                try:
                    val = str(val).encode('utf-8')
                except UnicodeDecodeError:
                    # If already unicode, most likely coming from db
                    val = str(val).decode('utf-8')
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
            if hasattr(str, 'decode') and not isinstance(val, unicode):
                # Handling for python2
                try:
                    val = str(val).encode('utf-8')
                except UnicodeDecodeError:
                    # If already unicode, most likely coming from db
                    val = str(val).decode('utf-8')

            if len(val) == 0:
                continue

            value = val

            if (Driver.needsQuoting(val, False)):
                value = value.replace("\"", "\"\"")
                value = "\"" + value + "\""

            res = ((res and res + '.') or '') + value

        return res
