##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Implementation of Connection.
It is a wrapper around the actual psycopg2 driver, and connection
object.
"""

import random
import select
import datetime
from collections import deque
import psycopg2
from flask import g, current_app
from flask_babelex import gettext
from flask_security import current_user
from pgadmin.utils.crypto import decrypt
from psycopg2.extensions import encodings

import config
from pgadmin.model import User
from pgadmin.utils.exception import ConnectionLost, CryptKeyMissing
from pgadmin.utils import get_complete_file_path
from ..abstract import BaseConnection
from .cursor import DictCursor
from .typecast import register_global_typecasters, \
    register_string_typecasters, register_binary_typecasters, \
    unregister_numeric_typecasters, \
    register_array_to_string_typecasters, ALL_JSON_TYPES
from .encoding import get_encoding, configure_driver_encodings
from pgadmin.utils import csv
from pgadmin.utils.master_password import get_crypt_key
from io import StringIO

_ = gettext

# Register global type caster which will be applicable to all connections.
register_global_typecasters()
configure_driver_encodings(encodings)


class Connection(BaseConnection):
    """
    class Connection(object)

        A wrapper class, which wraps the psycopg2 connection object, and
        delegate the execution to the actual connection object, when required.

    Methods:
    -------
    * connect(**kwargs)
      - Connect the PostgreSQL/EDB Postgres Advanced Server using the psycopg2
      driver

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

    * _wait_timeout(conn)
      - This method is used to wait for asynchronous connection with timeout.
        This is a non blocking call.

    * poll(formatted_exception_msg)
      - This method is used to poll the data of query running on asynchronous
        connection.

    * status_message()
      - Returns the status message returned by the last command executed on
      the server.

    * rows_affected()
      - Returns the no of rows affected by the last command executed on
      the server.

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

    * check_notifies(required_polling)
      - Check for the notify messages by polling the connection or after
        execute is there in notifies.

    * get_notifies()
      - This function will returns list of notifies received from database
        server.

    * pq_encrypt_password_conn()
      - This function will return the encrypted password for database server
      - greater than or equal to 10.
    """

    def __init__(self, manager, conn_id, db, auto_reconnect=True, async_=0,
                 use_binary_placeholder=False, array_to_string=False):
        assert (manager is not None)
        assert (conn_id is not None)

        self.conn_id = conn_id
        self.manager = manager
        self.db = db if db is not None else manager.db
        self.conn = None
        self.auto_reconnect = auto_reconnect
        self.async_ = async_
        self.__async_cursor = None
        self.__async_query_id = None
        self.__backend_pid = None
        self.execution_aborted = False
        self.row_count = 0
        self.__notices = None
        self.__notifies = None
        self.password = None
        # This flag indicates the connection status (connected/disconnected).
        self.wasConnected = False
        # This flag indicates the connection reconnecting status.
        self.reconnecting = False
        self.use_binary_placeholder = use_binary_placeholder
        self.array_to_string = array_to_string

        super(Connection, self).__init__()

    def as_dict(self):
        """
        Returns the dictionary object representing this object.
        """
        # In case, it cannot be auto reconnectable, or already been released,
        # then we will return None.
        if not self.auto_reconnect and not self.conn:
            return None

        res = dict()
        res['conn_id'] = self.conn_id
        res['database'] = self.db
        res['async_'] = self.async_
        res['wasConnected'] = self.wasConnected
        res['auto_reconnect'] = self.auto_reconnect
        res['use_binary_placeholder'] = self.use_binary_placeholder
        res['array_to_string'] = self.array_to_string

        return res

    def __repr__(self):
        return "PG Connection: {0} ({1}) -> {2} (ajax:{3})".format(
            self.conn_id, self.db,
            'Connected' if self.conn and not self.conn.closed else
            "Disconnected",
            self.async_
        )

    def __str__(self):
        return self.__repr__()

    def connect(self, **kwargs):
        if self.conn:
            if self.conn.closed:
                self.conn = None
            else:
                return True, None

        pg_conn = None
        password = None
        passfile = None
        manager = self.manager

        encpass = kwargs['password'] if 'password' in kwargs else None
        passfile = kwargs['passfile'] if 'passfile' in kwargs else None
        tunnel_password = kwargs['tunnel_password'] if 'tunnel_password' in \
                                                       kwargs else ''

        # Check SSH Tunnel needs to be created
        if manager.use_ssh_tunnel == 1 and not manager.tunnel_created:
            status, error = manager.create_ssh_tunnel(tunnel_password)
            if not status:
                return False, error

        # Check SSH Tunnel is alive or not.
        if manager.use_ssh_tunnel == 1:
            manager.check_ssh_tunnel_alive()

        if encpass is None:
            encpass = self.password or getattr(manager, 'password', None)

        self.password = encpass

        # Reset the existing connection password
        if self.reconnecting is not False:
            self.password = None

        crypt_key_present, crypt_key = get_crypt_key()
        if not crypt_key_present:
            raise CryptKeyMissing()

        if encpass:
            # Fetch Logged in User Details.
            user = User.query.filter_by(id=current_user.id).first()

            if user is None:
                return False, gettext("Unauthorized request.")

            try:
                password = decrypt(encpass, crypt_key)
                # password is in bytes, for python3 we need it in string
                if isinstance(password, bytes):
                    password = password.decode()
            except Exception as e:
                manager.stop_ssh_tunnel()
                current_app.logger.exception(e)
                return False, \
                    _(
                        "Failed to decrypt the saved password.\nError: {0}"
                    ).format(str(e))

        # If no password credential is found then connect request might
        # come from Query tool, ViewData grid, debugger etc tools.
        # we will check for pgpass file availability from connection manager
        # if it's present then we will use it
        if not password and not encpass and not passfile:
            passfile = manager.passfile if manager.passfile else None

        try:
            database = self.db
            user = manager.user
            conn_id = self.conn_id

            import os
            os.environ['PGAPPNAME'] = '{0} - {1}'.format(
                config.APP_NAME, conn_id)

            pg_conn = psycopg2.connect(
                host=manager.local_bind_host if manager.use_ssh_tunnel
                else manager.host,
                hostaddr=manager.local_bind_host if manager.use_ssh_tunnel
                else manager.hostaddr,
                port=manager.local_bind_port if manager.use_ssh_tunnel
                else manager.port,
                database=database,
                user=user,
                password=password,
                async_=self.async_,
                passfile=get_complete_file_path(passfile),
                sslmode=manager.ssl_mode,
                sslcert=get_complete_file_path(manager.sslcert),
                sslkey=get_complete_file_path(manager.sslkey),
                sslrootcert=get_complete_file_path(manager.sslrootcert),
                sslcrl=get_complete_file_path(manager.sslcrl),
                sslcompression=True if manager.sslcompression else False,
                service=manager.service,
                connect_timeout=manager.connect_timeout
            )

            # If connection is asynchronous then we will have to wait
            # until the connection is ready to use.
            if self.async_ == 1:
                self._wait(pg_conn)

        except psycopg2.Error as e:
            manager.stop_ssh_tunnel()
            if e.pgerror:
                msg = e.pgerror
            elif e.diag.message_detail:
                msg = e.diag.message_detail
            else:
                msg = str(e)
            current_app.logger.info(
                u"Failed to connect to the database server(#{server_id}) for "
                u"connection ({conn_id}) with error message as below"
                u":{msg}".format(
                    server_id=self.manager.sid,
                    conn_id=conn_id,
                    msg=msg
                )
            )
            return False, msg

        # Overwrite connection notice attr to support
        # more than 50 notices at a time
        pg_conn.notices = deque([], self.ASYNC_NOTICE_MAXLENGTH)

        self.conn = pg_conn
        self.wasConnected = True
        try:
            status, msg = self._initialize(conn_id, **kwargs)
        except Exception as e:
            manager.stop_ssh_tunnel()
            current_app.logger.exception(e)
            self.conn = None
            if not self.reconnecting:
                self.wasConnected = False
            raise e

        if status:
            manager._update_password(encpass)
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
        manager = self.manager

        def _execute(cur, query, params=None):
            try:
                self.__internal_blocking_execute(cur, query, params)
            except psycopg2.Error as pe:
                cur.close()
                return formatted_exception_msg(pe, False)
            return None

        # autocommit flag does not work with asynchronous connections.
        # By default asynchronous connection runs in autocommit mode.
        if self.async_ == 0:
            if 'autocommit' in kwargs and kwargs['autocommit'] is False:
                self.conn.autocommit = False
            else:
                self.conn.autocommit = True

        register_string_typecasters(self.conn)

        if self.array_to_string:
            register_array_to_string_typecasters(self.conn)

        # Register type casters for binary data only after registering array to
        # string type casters.
        if self.use_binary_placeholder:
            register_binary_typecasters(self.conn)

        postgres_encoding, self.python_encoding, typecast_encoding = \
            get_encoding(self.conn.encoding)

        # Note that we use 'UPDATE pg_settings' for setting bytea_output as a
        # convenience hack for those running on old, unsupported versions of
        # PostgreSQL 'cos we're nice like that.
        status = _execute(
            cur,
            "SET DateStyle=ISO; "
            "SET client_min_messages=notice; "
            "SELECT set_config('bytea_output','hex',false) FROM pg_settings"
            " WHERE name = 'bytea_output'; "
            "SET client_encoding='{0}';".format(postgres_encoding)
        )

        if status is not None:
            self.conn.close()
            self.conn = None

            return False, status

        if manager.role:
            status = _execute(cur, u"SET ROLE TO %s", [manager.role])

            if status is not None:
                self.conn.close()
                self.conn = None
                current_app.logger.error(
                    "Connect to the database server (#{server_id}) for "
                    "connection ({conn_id}), but - failed to setup the role "
                    "with error message as below:{msg}".format(
                        server_id=self.manager.sid,
                        conn_id=conn_id,
                        msg=status
                    )
                )
                return False, \
                    _(
                        "Failed to setup the role with error message:\n{0}"
                    ).format(status)

        # Check database version every time on reconnection
        status = _execute(cur, "SELECT version()")

        if status is not None:
            self.conn.close()
            self.conn = None
            self.wasConnected = False
            current_app.logger.error(
                "Failed to fetch the version information on the "
                "established connection to the database server "
                "(#{server_id}) for '{conn_id}' with below error "
                "message:{msg}".format(
                    server_id=self.manager.sid,
                    conn_id=conn_id,
                    msg=status)
            )
            return False, status

        if cur.rowcount > 0:
            row = cur.fetchmany(1)[0]
            manager.ver = row['version']
            manager.sversion = self.conn.server_version

        status = _execute(cur, """
SELECT
    db.oid as did, db.datname, db.datallowconn,
    pg_encoding_to_char(db.encoding) AS serverencoding,
    has_database_privilege(db.oid, 'CREATE') as cancreate, datlastsysoid
FROM
    pg_database db
WHERE db.datname = current_database()""")

        if status is None:
            manager.db_info = manager.db_info or dict()
            if cur.rowcount > 0:
                res = cur.fetchmany(1)[0]
                manager.db_info[res['did']] = res.copy()

                # We do not have database oid for the maintenance database.
                if len(manager.db_info) == 1:
                    manager.did = res['did']

        status = _execute(cur, """
SELECT
    oid as id, rolname as name, rolsuper as is_superuser,
    CASE WHEN rolsuper THEN true ELSE rolcreaterole END as can_create_role,
    CASE WHEN rolsuper THEN true ELSE rolcreatedb END as can_create_db
FROM
    pg_catalog.pg_roles
WHERE
    rolname = current_user""")

        if status is None:
            manager.user_info = dict()
            if cur.rowcount > 0:
                manager.user_info = cur.fetchmany(1)[0]

        if 'password' in kwargs:
            manager.password = kwargs['password']

        server_types = None
        if 'server_types' in kwargs and isinstance(
                kwargs['server_types'], list):
            server_types = manager.server_types = kwargs['server_types']

        if server_types is None:
            from pgadmin.browser.server_groups.servers.types import ServerType
            server_types = ServerType.types()

        for st in server_types:
            if st.instance_of(manager.ver):
                manager.server_type = st.stype
                manager.server_cls = st
                break

        manager.update_session()

        return True, None

    def __cursor(self, server_cursor=False):

        if not get_crypt_key()[0]:
            raise CryptKeyMissing()

        # Check SSH Tunnel is alive or not. If used by the database
        # server for the connection.
        if self.manager.use_ssh_tunnel == 1:
            self.manager.check_ssh_tunnel_alive()

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

        if self.connected() and cur and not cur.closed and \
                (not server_cursor or (server_cursor and cur.name)):
            return True, cur

        if not self.connected():
            errmsg = ""

            current_app.logger.warning(
                "Connection to database server (#{server_id}) for the "
                "connection - '{conn_id}' has been lost.".format(
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
                "Failed to create cursor for psycopg2 connection with error "
                "message for the server#{1}:{2}:\n{0}"
            ).format(
                str(pe), self.manager.sid, self.db
            )

            current_app.logger.error(errmsg)
            if self.conn.closed:
                self.conn = None
                if self.auto_reconnect and not self.reconnecting:
                    current_app.logger.info(
                        gettext(
                            "Attempting to reconnect to the database server "
                            "(#{server_id}) for the connection - '{conn_id}'."
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
                        None if self.conn_id[0:3] == u'DB:'
                        else self.conn_id[5:]
                    )

        setattr(
            g, "{0}#{1}".format(
                self.manager.sid, self.conn_id.encode('utf-8')
            ), cur
        )

        return True, cur

    def escape_params_sqlascii(self, params):
        # The data is unescaped using string_typecasters when selected
        # We need to esacpe the data so that it does not fail when
        # it is encoded with python ascii
        # unicode_escape helps in escaping and unescaping
        if self.conn and \
            self.conn.encoding in ('SQL_ASCII', 'SQLASCII',
                                   'MULE_INTERNAL', 'MULEINTERNAL')\
                and params is not None and type(params) == dict:
            for key, val in params.items():
                modified_val = val
                # "unicode_escape" will convert single backslash to double
                # backslash, so we will have to replace/revert them again
                # to store the correct value into the database.
                if isinstance(val, str):
                    modified_val = val.encode('unicode_escape')\
                        .decode('raw_unicode_escape')\
                        .replace("\\\\", "\\")

                params[key] = modified_val

        return params

    def __internal_blocking_execute(self, cur, query, params):
        """
        This function executes the query using cursor's execute function,
        but in case of asynchronous connection we need to wait for the
        transaction to be completed. If self.async_ is 1 then it is a
        blocking call.

        Args:
            cur: Cursor object
            query: SQL query to run.
            params: Extra parameters
        """

        query = query.encode(self.python_encoding)

        params = self.escape_params_sqlascii(params)
        cur.execute(query, params)
        if self.async_ == 1:
            self._wait(cur.connection)

    def execute_on_server_as_csv(self,
                                 query, params=None,
                                 formatted_exception_msg=False,
                                 records=2000):
        """
        To fetch query result and generate CSV output

        Args:
            query: SQL
            params: Additional parameters
            formatted_exception_msg: For exception
            records: Number of initial records
        Returns:
            Generator response
        """
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(
            25,
            u"Execute (with server cursor) for server #{server_id} - "
            u"{conn_id} (Query-id: {query_id}):\n{query}".format(
                server_id=self.manager.sid,
                conn_id=self.conn_id,
                query=query,
                query_id=query_id
            )
        )
        try:
            # Unregistering type casting for large size data types.
            unregister_numeric_typecasters(self.conn)
            self.__internal_blocking_execute(cur, query, params)
        except psycopg2.Error as pe:
            cur.close()
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"failed to execute query ((with server cursor) "
                u"for the server #{server_id} - {conn_id} "
                u"(query-id: {query_id}):\n"
                u"error message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    errmsg=errmsg,
                    query_id=query_id
                )
            )
            return False, errmsg

        # http://initd.org/psycopg/docs/cursor.html#cursor.description
        # to avoid no-op
        if cur.description is None:
            return False, \
                gettext('The query executed did not return any data.')

        def handle_null_values(results, replace_nulls_with):
            """
            This function is used to replace null values with the given string

            :param results:
            :param replace_nulls_with: null values will be replaced by this
            string.
            :return: modified result
            """

            temp_results = []
            for row in results:
                res = dict()
                for k, v in row.items():
                    if v is None:
                        res[k] = replace_nulls_with
                    else:
                        res[k] = v
                temp_results.append(res)
            results = temp_results

            return results

        def gen(quote='strings', quote_char="'", field_separator=',',
                replace_nulls_with=None):

            results = cur.fetchmany(records)
            if not results:
                if not cur.closed:
                    cur.close()
                yield gettext('The query executed did not return any data.')
                return

            header = []
            json_columns = []

            for c in cur.ordered_description():
                # This is to handle the case in which column name is non-ascii
                column_name = c.to_dict()['name']
                header.append(column_name)
                if c.to_dict()['type_code'] in ALL_JSON_TYPES:
                    json_columns.append(column_name)

            res_io = StringIO()

            if quote == 'strings':
                quote = csv.QUOTE_NONNUMERIC
            elif quote == 'all':
                quote = csv.QUOTE_ALL
            else:
                quote = csv.QUOTE_NONE

            csv_writer = csv.DictWriter(
                res_io, fieldnames=header, delimiter=field_separator,
                quoting=quote,
                quotechar=quote_char,
                replace_nulls_with=replace_nulls_with
            )

            csv_writer.writeheader()
            # Replace the null values with given string if configured.
            if replace_nulls_with is not None:
                results = handle_null_values(results, replace_nulls_with)
            csv_writer.writerows(results)

            yield res_io.getvalue()

            while True:
                results = cur.fetchmany(records)

                if not results:
                    if not cur.closed:
                        cur.close()
                    break
                res_io = StringIO()

                csv_writer = csv.DictWriter(
                    res_io, fieldnames=header, delimiter=field_separator,
                    quoting=quote,
                    quotechar=quote_char,
                    replace_nulls_with=replace_nulls_with
                )

                # Replace the null values with given string if configured.
                if replace_nulls_with is not None:
                    results = handle_null_values(results, replace_nulls_with)
                csv_writer.writerows(results)
                yield res_io.getvalue()
        # Registering back type caster for large size data types to string
        # which was unregistered at starting
        register_string_typecasters(self.conn)
        return True, gen

    def execute_scalar(self, query, params=None,
                       formatted_exception_msg=False):
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(
            25,
            u"Execute (scalar) for server #{server_id} - {conn_id} (Query-id: "
            u"{query_id}):\n{query}".format(
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
                        self.execute_scalar, query, params,
                        formatted_exception_msg
                    )
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_scalar) for the server "
                u"#{server_id} - {conn_id} (Query-id: {query_id}):\n"
                u"Error Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
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
        This function executes the given query asynchronously and returns
        result.

        Args:
            query: SQL query to run.
            params: extra parameters to the function
            formatted_exception_msg: if True then function return the
            formatted exception message
        """

        # Convert the params based on python_encoding
        params = self.escape_params_sqlascii(params)

        self.__async_cursor = None
        status, cur = self.__cursor()

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        encoding = self.python_encoding

        query = query.encode(encoding)

        dsn = self.conn.get_dsn_parameters()
        current_app.logger.log(
            25,
            u"Execute (async) by {pga_user} on {db_user}@{db_host}/{db_name} "
            u"#{server_id} - {conn_id} (Query-id: "
            u"{query_id}):\n{query}".format(
                pga_user=current_user.username,
                db_user=dsn['user'],
                db_host=dsn['host'],
                db_name=dsn['dbname'],
                server_id=self.manager.sid,
                conn_id=self.conn_id,
                query=query.decode(encoding),
                query_id=query_id
            )
        )

        try:
            self.__notices = []
            self.__notifies = []
            self.execution_aborted = False
            cur.execute(query, params)
            res = self._wait_timeout(cur.connection)
        except psycopg2.Error as pe:
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_async) for the server "
                u"#{server_id} - {conn_id}(Query-id: {query_id}):\n"
                u"Error Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
                    errmsg=errmsg,
                    query_id=query_id
                )
            )

            # Check for the asynchronous notifies.
            self.check_notifies()

            if self.is_disconnected(pe):
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
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
            formatted_exception_msg: if True then function return the
            formatted exception message
        """
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)
        query_id = random.randint(1, 9999999)

        current_app.logger.log(
            25,
            u"Execute (void) for server #{server_id} - {conn_id} (Query-id: "
            u"{query_id}):\n{query}".format(
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
                        self.execute_void, query, params,
                        formatted_exception_msg
                    )
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    None if self.conn_id[0:3] == u'DB:' else self.conn_id[5:]
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_void) for the server "
                u"#{server_id} - {conn_id}(Query-id: {query_id}):\n"
                u"Error Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
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

            current_app.logger.warning(
                "Failed to reconnect the database server "
                "(Server #{server_id}, Connection #{conn_id})".format(
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

    def execute_2darray(self, query, params=None,
                        formatted_exception_msg=False):
        status, cur = self.__cursor()
        self.row_count = 0

        if not status:
            return False, str(cur)

        query_id = random.randint(1, 9999999)
        current_app.logger.log(
            25,
            u"Execute (2darray) for server #{server_id} - {conn_id} "
            u"(Query-id: {query_id}):\n{query}".format(
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
            if not self.connected() and self.auto_reconnect and \
                    not self.reconnecting:
                return self.__attempt_execution_reconnect(
                    self.execute_2darray, query, params,
                    formatted_exception_msg
                )
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            current_app.logger.error(
                u"Failed to execute query (execute_2darray) for the server "
                u"#{server_id} - {conn_id} (Query-id: {query_id}):\n"
                u"Error Message:{errmsg}".format(
                    server_id=self.manager.sid,
                    conn_id=self.conn_id,
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
            u"Execute (dict) for server #{server_id} - {conn_id} (Query-id: "
            u"{query_id}):\n{query}".format(
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
                u"Failed to execute query (execute_dict) for the server "
                u"#{server_id}- {conn_id} (Query-id: {query_id}):\n"
                u"Error Message:{errmsg}".format(
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

    def async_fetchmany_2darray(self, records=2000,
                                formatted_exception_msg=False):
        """
        User should poll and check if status is ASYNC_OK before calling this
        function
        Args:
          records: no of records to fetch. use -1 to fetchall.
          formatted_exception_msg:

        Returns:

        """
        cur = self.__async_cursor
        if not cur:
            return False, gettext(
                "Cursor could not be found for the async connection."
            )

        if self.conn.isexecuting():
            return False, gettext(
                "Asynchronous query execution/operation underway."
            )

        if self.row_count > 0:
            result = []
            # For DDL operation, we may not have result.
            #
            # Because - there is not direct way to differentiate DML and
            # DDL operations, we need to rely on exception to figure
            # that out at the moment.
            try:
                if records == -1:
                    res = cur.fetchall()
                else:
                    res = cur.fetchmany(records)
                for row in res:
                    new_row = []
                    for col in self.column_info:
                        new_row.append(row[col['name']])
                    result.append(new_row)
            except psycopg2.ProgrammingError:
                result = None
        else:
            # User performed operation which dose not produce record/s as
            # result.
            # for eg. DDL operations.
            return True, None

        return True, result

    def connected(self):
        if self.conn:
            if not self.conn.closed:
                return True
            self.conn = None
        return False

    def reset(self):
        if self.conn and self.conn.closed:
            self.conn = None
        pg_conn = None
        manager = self.manager

        password = getattr(manager, 'password', None)

        if password:
            # Fetch Logged in User Details.
            user = User.query.filter_by(id=current_user.id).first()

            if user is None:
                return False, gettext("Unauthorized request.")

            crypt_key_present, crypt_key = get_crypt_key()
            if not crypt_key_present:
                return False, crypt_key

            password = decrypt(password, crypt_key).decode()

        try:
            pg_conn = psycopg2.connect(
                host=manager.local_bind_host if manager.use_ssh_tunnel
                else manager.host,
                hostaddr=manager.local_bind_host if manager.use_ssh_tunnel
                else manager.hostaddr,
                port=manager.local_bind_port if manager.use_ssh_tunnel
                else manager.port,
                database=self.db,
                user=manager.user,
                password=password,
                passfile=get_complete_file_path(manager.passfile),
                sslmode=manager.ssl_mode,
                sslcert=get_complete_file_path(manager.sslcert),
                sslkey=get_complete_file_path(manager.sslkey),
                sslrootcert=get_complete_file_path(manager.sslrootcert),
                sslcrl=get_complete_file_path(manager.sslcrl),
                sslcompression=True if manager.sslcompression else False,
                service=manager.service,
                connect_timeout=manager.connect_timeout
            )

        except psycopg2.Error as e:
            if e.pgerror:
                msg = e.pgerror
            elif e.message:
                msg = e.message
            elif e.diag.message_detail:
                msg = e.diag.message_detail
            else:
                msg = str(e)

            current_app.logger.error(
                gettext(
                    """
Failed to reset the connection to the server due to following error:
{0}"""
                ).Format(msg)
            )
            return False, msg

        pg_conn.notices = deque([], self.ASYNC_NOTICE_MAXLENGTH)
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
                select.select([], [conn.fileno()], [],
                              self.ASYNC_WAIT_TIMEOUT)
            elif state == psycopg2.extensions.POLL_READ:
                select.select([conn.fileno()], [], [],
                              self.ASYNC_WAIT_TIMEOUT)
            else:
                raise psycopg2.OperationalError(
                    "poll() returned %s from _wait function" % state)

    def _wait_timeout(self, conn):
        """
        This function is used for the asynchronous connection,
        it will call poll method and return the status. If state is
        psycopg2.extensions.POLL_WRITE and psycopg2.extensions.POLL_READ
        function will wait for the given timeout.This is not a blocking call.

        Args:
            conn: connection object
            time: wait time
        """

        while 1:
            state = conn.poll()

            if state == psycopg2.extensions.POLL_OK:
                return self.ASYNC_OK
            elif state == psycopg2.extensions.POLL_WRITE:
                # Wait for the given time and then check the return status
                # If three empty lists are returned then the time-out is
                # reached.
                timeout_status = select.select(
                    [], [conn.fileno()], [], self.ASYNC_TIMEOUT
                )
                if timeout_status == ([], [], []):
                    return self.ASYNC_WRITE_TIMEOUT
            elif state == psycopg2.extensions.POLL_READ:
                # Wait for the given time and then check the return status
                # If three empty lists are returned then the time-out is
                # reached.
                timeout_status = select.select(
                    [conn.fileno()], [], [], self.ASYNC_TIMEOUT
                )
                if timeout_status == ([], [], []):
                    return self.ASYNC_READ_TIMEOUT
            else:
                raise psycopg2.OperationalError(
                    "poll() returned %s from _wait_timeout function" % state
                )

    def poll(self, formatted_exception_msg=False, no_result=False):
        """
        This function is a wrapper around connection's poll function.
        It internally uses the _wait_timeout method to poll the
        result on the connection object. In case of success it
        returns the result of the query.

        Args:
            formatted_exception_msg: if True then function return the formatted
                                     exception message, otherwise error string.
            no_result: If True then only poll status will be returned.
        """

        cur = self.__async_cursor
        if not cur:
            return False, gettext(
                "Cursor could not be found for the async connection."
            )

        current_app.logger.log(
            25,
            "Polling result for (Query-id: {query_id})".format(
                query_id=self.__async_query_id
            )
        )

        is_error = False
        try:
            status = self._wait_timeout(self.conn)
        except psycopg2.OperationalError as op_er:
            errmsg = \
                self._formatted_exception_msg(op_er, formatted_exception_msg)
            is_error = True
        except psycopg2.Error as pe:
            errmsg = self._formatted_exception_msg(pe, formatted_exception_msg)
            is_error = True
            if self.conn.closed:
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    self.conn_id[5:]
                )
        except OSError as e:
            # Bad File descriptor
            if e.errno == 9:
                raise ConnectionLost(
                    self.manager.sid,
                    self.db,
                    self.conn_id[5:]
                )
            else:
                raise e

        if self.conn.notices and self.__notices is not None:
            self.__notices.extend(self.conn.notices)
            self.conn.notices.clear()

        # Check for the asynchronous notifies.
        self.check_notifies()

        # We also need to fetch notices before we return from function in case
        # of any Exception, To avoid code duplication we will return after
        # fetching the notices in case of any Exception
        if is_error:
            return False, errmsg

        result = None
        self.row_count = 0
        self.column_info = None

        if status == self.ASYNC_OK:

            # if user has cancelled the transaction then changed the status
            if self.execution_aborted:
                status = self.ASYNC_EXECUTION_ABORTED
                self.execution_aborted = False
                return status, result

            # Fetch the column information
            if cur.description is not None:
                self.column_info = [
                    desc.to_dict() for desc in cur.ordered_description()
                ]

                pos = 0
                for col in self.column_info:
                    col['pos'] = pos
                    pos += 1

            self.row_count = cur.rowcount
            if not no_result and cur.rowcount > 0:
                result = []
                # For DDL operation, we may not have result.
                #
                # Because - there is not direct way to differentiate DML
                # and DDL operations, we need to rely on exception to
                # figure that out at the moment.
                try:
                    for row in cur:
                        new_row = []
                        for col in self.column_info:
                            new_row.append(row[col['name']])
                        result.append(new_row)

                except psycopg2.ProgrammingError:
                    result = None

        return status, result

    def status_message(self):
        """
        This function will return the status message returned by the last
        command executed on the server.
        """
        cur = self.__async_cursor
        if not cur:
            return gettext(
                "Cursor could not be found for the async connection."
            )

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

    def get_column_info(self):
        """
        This function will returns list of columns for last async sql command
        executed on the server.
        """

        return self.column_info

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
        query = """SELECT pg_cancel_backend({0});""".format(
            cancel_conn.__backend_pid)

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

                crypt_key_present, crypt_key = get_crypt_key()
                if not crypt_key_present:
                    return False, crypt_key

                password = decrypt(password, crypt_key)\
                    .decode()

            try:
                pg_conn = psycopg2.connect(
                    host=self.manager.local_bind_host if
                    self.manager.use_ssh_tunnel else self.manager.host,
                    hostaddr=self.manager.local_bind_host if
                    self.manager.use_ssh_tunnel else
                    self.manager.hostaddr,
                    port=self.manager.local_bind_port if
                    self.manager.use_ssh_tunnel else self.manager.port,
                    database=self.db,
                    user=self.manager.user,
                    password=password,
                    passfile=get_complete_file_path(self.manager.passfile),
                    sslmode=self.manager.ssl_mode,
                    sslcert=get_complete_file_path(self.manager.sslcert),
                    sslkey=get_complete_file_path(self.manager.sslkey),
                    sslrootcert=get_complete_file_path(
                        self.manager.sslrootcert
                    ),
                    sslcrl=get_complete_file_path(self.manager.sslcrl),
                    sslcompression=True if self.manager.sslcompression
                    else False,
                    service=self.manager.service,
                    connect_timeout=self.manager.connect_timeout
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

        if self.__notices is not None:
            while self.__notices:
                resp.append(self.__notices.pop(0))

        if self.__notifies is None:
            return resp

        for notify in self.__notifies:
            if notify.payload is not None and notify.payload != '':
                notify_msg = gettext(
                    "Asynchronous notification \"{0}\" with payload \"{1}\" "
                    "received from server process with PID {2}\n"
                ).format(notify.channel, notify.payload, notify.pid)

            else:
                notify_msg = gettext(
                    "Asynchronous notification \"{0}\" received from "
                    "server process with PID {1}\n"
                ).format(notify.channel, notify.pid)
            resp.append(notify_msg)

        return resp

    def _formatted_exception_msg(self, exception_obj, formatted_msg):
        """
        This method is used to parse the psycopg2.Error object and returns the
        formatted error message if flag is set to true else return
        normal error message.

        Args:
            exception_obj: exception object
            formatted_msg: if True then function return the formatted exception
            message

        """
        if exception_obj.pgerror:
            errmsg = exception_obj.pgerror
        elif exception_obj.diag.message_detail:
            errmsg = exception_obj.diag.message_detail
        else:
            errmsg = str(exception_obj)

        # if formatted_msg is false then return from the function
        if not formatted_msg:
            notices = self.get_notices()
            return errmsg if notices == '' else notices + '\n' + errmsg

        # Do not append if error starts with `ERROR:` as most pg related
        # error starts with `ERROR:`
        if not errmsg.startswith(u'ERROR:'):
            errmsg = gettext(u'ERROR: ') + errmsg + u'\n\n'

        if exception_obj.diag.severity is not None \
                and exception_obj.diag.message_primary is not None:
            ex_diag_message = u"{0}:  {1}".format(
                exception_obj.diag.severity,
                exception_obj.diag.message_primary
            )
            # If both errors are different then only append it
            if errmsg and ex_diag_message and \
                ex_diag_message.strip().strip('\n').lower() not in \
                    errmsg.strip().strip('\n').lower():
                errmsg += ex_diag_message
        elif exception_obj.diag.message_primary is not None:
            message_primary = exception_obj.diag.message_primary
            if message_primary.lower() not in errmsg.lower():
                errmsg += message_primary

        if exception_obj.diag.sqlstate is not None:
            if not errmsg.endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('SQL state: ')
            errmsg += exception_obj.diag.sqlstate

        if exception_obj.diag.message_detail is not None and \
                'Detail:'.lower() not in errmsg.lower():
            if not errmsg.endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Detail: ')
            errmsg += exception_obj.diag.message_detail

        if exception_obj.diag.message_hint is not None and \
                'Hint:'.lower() not in errmsg.lower():
            if not errmsg.endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Hint: ')
            errmsg += exception_obj.diag.message_hint

        if exception_obj.diag.statement_position is not None and \
                'Character:'.lower() not in errmsg.lower():
            if not errmsg.endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Character: ')
            errmsg += exception_obj.diag.statement_position

        if exception_obj.diag.context is not None and \
                'Context:'.lower() not in errmsg.lower():
            if not errmsg.endswith('\n'):
                errmsg += '\n'
            errmsg += gettext('Context: ')
            errmsg += exception_obj.diag.context

        notices = self.get_notices()
        return errmsg if notices == '' else notices + '\n' + errmsg

    #####
    # As per issue reported on pgsycopg2 github repository link is shared below
    # conn.closed is not reliable enough to identify the disconnection from the
    # database server for some unknown reasons.
    #
    # (https://github.com/psycopg/psycopg2/issues/263)
    #
    # In order to resolve the issue, sqlalchamey follows the below logic to
    # identify the disconnection. It relies on exception message to identify
    # the error.
    #
    # Reference (MIT license):
    # https://github.com/zzzeek/sqlalchemy/blob/master/lib/sqlalchemy/dialects/postgresql/psycopg2.py
    #
    def is_disconnected(self, err):
        if not self.conn.closed:
            # checks based on strings.  in the case that .closed
            # didn't cut it, fall back onto these.
            str_e = str(err).partition("\n")[0]
            for msg in [
                # these error messages from libpq: interfaces/libpq/fe-misc.c
                # and interfaces/libpq/fe-secure.c.
                'terminating connection',
                'closed the connection',
                'connection not open',
                'could not receive data from server',
                'could not send data to server',
                # psycopg2 client errors, psycopg2/conenction.h,
                # psycopg2/cursor.h
                'connection already closed',
                'cursor already closed',
                # not sure where this path is originally from, it may
                # be obsolete.   It really says "losed", not "closed".
                'losed the connection unexpectedly',
                # these can occur in newer SSL
                'connection has been closed unexpectedly',
                'SSL SYSCALL error: Bad file descriptor',
                'SSL SYSCALL error: EOF detected',
            ]:
                idx = str_e.find(msg)
                if idx >= 0 and '"' not in str_e[:idx]:
                    return True

            return False
        return True

    def check_notifies(self, required_polling=False):
        """
        Check for the notify messages by polling the connection or after
        execute is there in notifies.
        """
        if self.conn and required_polling:
            self.conn.poll()

        if self.conn and hasattr(self.conn, 'notifies') and \
                len(self.conn.notifies) > 0:
            self.__notifies.extend(self.conn.notifies)
            self.conn.notifies = []
        else:
            self.__notifies = []

    def get_notifies(self):
        """
        This function will returns list of notifies received from database
        server.
        """
        notifies = None
        # Convert list of Notify objects into list of Dict.
        if self.__notifies is not None and len(self.__notifies) > 0:
            notifies = [{'recorded_time': str(datetime.datetime.now()),
                         'channel': notify.channel,
                         'payload': notify.payload,
                         'pid': notify.pid
                         } for notify in self.__notifies
                        ]
        return notifies

    def get_notices(self):
        """
        This function will returns the notices as string.
        :return:
        """
        notices = ''
        # Check for notices.
        if self.conn.notices and self.__notices is not None:
            self.__notices.extend(self.conn.notices)
            self.conn.notices.clear()

            while self.__notices:
                notices += self.__notices.pop(0)

        return notices

    def pq_encrypt_password_conn(self, password, user):
        """
        This function will return the encrypted password for database server
        greater than or equal to 10
        :param password: password to be encrypted
        :param user: user of the database server
        :return:
        """
        enc_password = None
        if psycopg2.__libpq_version__ >= 100000 and \
                hasattr(psycopg2.extensions, 'encrypt_password'):
            if self.connected():
                status, enc_algorithm = \
                    self.execute_scalar("SHOW password_encryption")
                if status:
                    enc_password = psycopg2.extensions.encrypt_password(
                        password=password, user=user, scope=self.conn,
                        algorithm=enc_algorithm
                    )
        elif psycopg2.__libpq_version__ < 100000:
            current_app.logger.warning(
                u"To encrypt passwords the required libpq version is "
                u"greater than or equal to 100000. Current libpq version "
                u"is {curr_ver}".format(
                    curr_ver=psycopg2.__libpq_version__
                )
            )
        elif not hasattr(psycopg2.extensions, 'encrypt_password'):
            current_app.logger.warning(
                u"The psycopg2.extensions module does not have the"
                u"'encrypt_password' method."
            )

        return enc_password

    def mogrify(self, query, parameters):
        """
        This function will return the sql query after parameters binding
        :param query: sql query before parameters (variables) binding
        :param parameters: query parameters / variables
        :return:
        """
        status, cursor = self.__cursor()
        if not status:
            return None
        else:
            mogrified_sql = cursor.mogrify(query, parameters)
            return mogrified_sql
