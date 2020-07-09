##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implemented classes for the different object type used by data grid """

from abc import ABCMeta, abstractmethod
from collections import OrderedDict
import six
from flask import render_template
from flask_babelex import gettext
from pgadmin.utils.ajax import forbidden
from pgadmin.utils.driver import get_driver
from pgadmin.tools.sqleditor.utils.is_query_resultset_updatable \
    import is_query_resultset_updatable
from pgadmin.tools.sqleditor.utils.save_changed_data import save_changed_data
from pgadmin.tools.sqleditor.utils.get_column_types import get_columns_types
from pgadmin.utils.preferences import Preferences
from pgadmin.utils.exception import ObjectGone

from config import PG_DEFAULT_DRIVER

VIEW_FIRST_100_ROWS = 1
VIEW_LAST_100_ROWS = 2
VIEW_ALL_ROWS = 3
VIEW_FILTERED_ROWS = 4


class ObjectRegistry(ABCMeta):
    """
    class ObjectRegistry(ABCMeta)
        Every object will be registered automatically by its object type.

    Class-level Methods:
    ----------- -------
    * get_object(cls, name, **kwargs)
      - This method returns the object based on register object type
        else return not implemented error.
    """

    registry = dict()

    def __init__(cls, name, bases, d):
        """
        This method is used to register the objects based on object type.
        """

        if d and 'object_type' in d:
            ObjectRegistry.registry[d['object_type']] = cls

        ABCMeta.__init__(cls, name, bases, d)

    @classmethod
    def get_object(cls, name, **kwargs):
        """
        This method returns the object based on register object type
        else return not implemented error

        Args:
            name: object type for which object to be returned.
            **kwargs: N number of parameters
        """

        if name in ObjectRegistry.registry:
            return (ObjectRegistry.registry[name])(**kwargs)

        raise NotImplementedError(
            gettext("This feature has not been implemented for object "
                    "type '{0}'.").format(name)
        )


@six.add_metaclass(ObjectRegistry)
class BaseCommand(object):
    """
    class BaseCommand

        It is a base class for SQL Tools like data grid and query tool.
        A different sql tools must implement this to expose abstract methods.

    Abstract Methods:
    -------- -------
    * get_sql()
      - This method returns the proper SQL query for the object type.

    * can_edit()
      - This method returns True/False, specifying whether data is
        editable or not.

    * can_filter()
      - This method returns True/False, specifying whether filter
        will be applied on data or not.
    """

    def __init__(self, **kwargs):
        """
        This method is used to initialize the class and
        create a proper object name which will be used
        to fetch the data using namespace name and object name.

        Args:
            **kwargs : N number of parameters
        """

        # Save the server group id, server id and database id, namespace id,
        # object id
        self.sgid = kwargs['sgid'] if 'sgid' in kwargs else None
        self.sid = kwargs['sid'] if 'sid' in kwargs else None
        self.did = kwargs['did'] if 'did' in kwargs else None

    @abstractmethod
    def get_sql(self):
        pass

    @abstractmethod
    def can_edit(self):
        pass

    @abstractmethod
    def can_filter(self):
        pass


class SQLFilter(object):
    """
    class SQLFilter

        Implementation of filter class for sql grid.

    Class-level Methods:
    ----------- -------
    * get_filter()
      - This method returns the filter applied.
    * set_filter(row_filter)
      - This method sets the filter to be applied.
    * append_filter(row_filter)
      - This method is used to append the filter within existing filter
    * remove_filter()
      - This method removes the filter applied.
    * validate_filter(row_filter)
      - This method validates the given filter.
    * get_data_sorting()
      - This method returns columns for data sorting
    * set_data_sorting()
      - This method saves columns for data sorting
    """

    def __init__(self, **kwargs):
        """
        This method is used to initialize the class and
        create a proper object name which will be used
        to fetch the data using namespace name and object name.

        Args:
            **kwargs : N number of parameters
        """
        # Save the server id and database id, namespace id, object id
        assert ('sid' in kwargs)
        assert ('did' in kwargs)
        assert ('obj_id' in kwargs)

        self.sid = kwargs['sid']
        self.did = kwargs['did']
        self.obj_id = kwargs['obj_id']
        sql_filter = kwargs.get('sql_filter', None)
        self._row_filter = sql_filter if type(sql_filter) is str else None
        self._data_sorting = kwargs.get('data_sorting', None)
        self._set_sorting_from_filter_dialog = False

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)
        conn = manager.connection(did=self.did)

        # we will set template path for sql scripts
        self.sql_path = 'sqleditor/sql/#{0}#'.format(manager.version)

        if conn.connected():
            # Fetch the Namespace Name and object Name
            query = render_template(
                "/".join([self.sql_path, 'objectname.sql']),
                obj_id=self.obj_id
            )

            status, result = conn.execute_dict(query)
            if not status:
                raise Exception(result)
            if len(result['rows']) == 0:
                raise ObjectGone(
                    gettext("The specified object could not be found."))

            self.nsp_name = result['rows'][0]['nspname']
            self.object_name = result['rows'][0]['relname']
        else:
            raise Exception(gettext(
                'Not connected to server or connection with the server '
                'has been closed.')
            )

    def get_filter(self):
        """
        This function returns the filter.
        """
        return self._row_filter

    def set_filter(self, row_filter):
        """
        This function validates the filter and set the
        given filter to member variable.

        Args:
            row_filter: sql query
        """
        if type(row_filter) is not str:
            row_filter = None

        status, msg = self.validate_filter(row_filter)

        if status:
            self._row_filter = row_filter

        return status, msg

    def get_data_sorting(self):
        """
        This function returns the filter.
        """
        if self._data_sorting and len(self._data_sorting) > 0:
            return self._data_sorting
        return None

    def set_data_sorting(self, data_filter, set_from_filter_dialog=False):
        """
        This function validates the filter and set the
        given filter to member variable.
        """
        self._data_sorting = data_filter['data_sorting']
        self._set_sorting_from_filter_dialog = set_from_filter_dialog

    def is_sorting_set_from_filter_dialog(self):
        """This function return whether sorting is set from filter dialog"""
        return self._set_sorting_from_filter_dialog

    def is_filter_applied(self):
        """
        This function returns True if filter is applied else False.
        """
        is_filter_applied = True
        if self._row_filter is None or self._row_filter == '':
            is_filter_applied = False

        if not is_filter_applied and \
                self._data_sorting and len(self._data_sorting) > 0:
            is_filter_applied = True

        return is_filter_applied

    def remove_filter(self):
        """
        This function remove the filter by setting value to None.
        """
        self._row_filter = None
        self._data_sorting = None

    def append_filter(self, row_filter):
        """
        This function will used to get the existing filter and append
        the given filter.

        Args:
            row_filter: sql query to append
        """

        existing_filter = self.get_filter()

        if existing_filter is None or existing_filter == '':
            self._row_filter = row_filter
        else:
            self._row_filter = existing_filter + ' \n    AND ' + row_filter

    def validate_filter(self, row_filter):
        """
        This function validates the given filter.

        Args:
            row_filter: sql syntax to validate
        """
        status = True
        result = None

        if row_filter is not None and row_filter != '':
            manager = \
                get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)
            conn = manager.connection(did=self.did)

            if conn.connected():
                sql = render_template(
                    "/".join([self.sql_path, 'validate.sql']),
                    nsp_name=self.nsp_name, object_name=self.object_name,
                    row_filter=row_filter)

                status, result = conn.execute_scalar(sql)
                if not status:
                    result = result.partition("\n")[0]

        return status, result


class FetchedRowTracker(object):
    """
    Keeps track of fetched row count.
    """

    def __init__(self, **kwargs):
        self.fetched_rows = 0

    def get_fetched_row_cnt(self):
        return self.fetched_rows

    def update_fetched_row_cnt(self, rows_cnt):
        self.fetched_rows = rows_cnt


class GridCommand(BaseCommand, SQLFilter, FetchedRowTracker):
    """
    class GridCommand(object)

        It is a base class for different object type used by data grid.
        A different object type must implement this to expose abstract methods.

    Class-level Methods:
    ----------- -------
    * get_primary_keys()
      - Derived class can implement there own logic to get the primary keys.

    * save()
      - Derived class can implement there own logic to save the data into the
      database.

    * set_limit(limit)
      - This method sets the limit for SQL query

    * get_limit()
      - This method returns the limit.
    """

    def __init__(self, **kwargs):
        """
        This method is used to call base class init to initialize
        the data.

        Args:
            **kwargs : N number of parameters
        """
        BaseCommand.__init__(self, **kwargs)
        SQLFilter.__init__(self, **kwargs)
        FetchedRowTracker.__init__(self, **kwargs)

        # Save the connection id, command type
        self.conn_id = kwargs['conn_id'] if 'conn_id' in kwargs else None
        self.cmd_type = kwargs['cmd_type'] if 'cmd_type' in kwargs else None
        self.limit = -1

        if self.cmd_type in (VIEW_FIRST_100_ROWS, VIEW_LAST_100_ROWS):
            self.limit = 100

    def get_primary_keys(self, *args, **kwargs):
        return None, None

    def get_all_columns_with_order(self, default_conn):
        """
        Responsible for fetching columns from given object

        Args:
            default_conn: Connection object

        Returns:
            all_sorted_columns: Columns which are already sorted which will
                         be used to populate the Grid in the dialog
            all_columns: List of all the column for given object which will
                         be used to fill columns options
        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        if default_conn is None:
            manager = driver.connection_manager(self.sid)
            conn = manager.connection(did=self.did, conn_id=self.conn_id)
        else:
            conn = default_conn

        all_sorted_columns = []
        data_sorting = self.get_data_sorting()
        all_columns = []
        if conn.connected():
            # Fetch the rest of the column names
            query = render_template(
                "/".join([self.sql_path, 'get_columns.sql']),
                obj_id=self.obj_id
            )
            status, result = conn.execute_dict(query)
            if not status:
                raise Exception(result)

            for row in result['rows']:
                all_columns.append(row['attname'])
        else:
            raise Exception(
                gettext('Not connected to server or connection with the '
                        'server has been closed.')
            )
        # If user has custom data sorting then pass as it as it is
        if data_sorting and len(data_sorting) > 0:
            all_sorted_columns = data_sorting

        return all_sorted_columns, all_columns

    def save(self, changed_data, default_conn=None):
        return forbidden(
            errmsg=gettext("Data cannot be saved for the current object.")
        )

    def get_limit(self):
        """
        This function returns the limit for the SQL query.
        """
        return self.limit

    def set_limit(self, limit):
        """
        This function sets the limit for the SQL query
        Args:
            limit: limit to be set for SQL.
        """
        self.limit = limit

    def get_pk_order(self):
        """
        This function gets the order required for primary keys
        """
        if self.cmd_type == VIEW_LAST_100_ROWS:
            return 'desc'
        else:
            return 'asc'


class TableCommand(GridCommand):
    """
    class TableCommand(GridCommand)

        It is a derived class for Table type.
    """
    object_type = 'table'

    def __init__(self, **kwargs):
        """
        This method calls the __init__ method of the base class
        to get the proper object name.

        Args:
            **kwargs : N number of parameters
        """

        # call base class init to fetch the table name
        super(TableCommand, self).__init__(**kwargs)

        # Set the default sorting on table data by primary key if user
        # preference value is set
        self.data_sorting_by_pk = Preferences.module('sqleditor').preference(
            'table_view_data_by_pk').get()

    def get_sql(self, default_conn=None):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified table
        """

        # Fetch the primary keys for the table
        pk_names, primary_keys = self.get_primary_keys(default_conn)

        # Fetch OIDs status
        has_oids = self.has_oids(default_conn)

        sql_filter = self.get_filter()
        data_sorting = self.get_data_sorting()

        # If data sorting is none and not reset from the filter dialog then
        # set the data sorting in following conditions:
        #   1. When command type is VIEW_FIRST_100_ROWS or VIEW_LAST_100_ROWS.
        #   2. When command type is VIEW_ALL_ROWS and limit is greater than 0

        if data_sorting is None and \
            not self.is_sorting_set_from_filter_dialog() \
            and (self.cmd_type in (VIEW_FIRST_100_ROWS, VIEW_LAST_100_ROWS) or
                 (self.cmd_type == VIEW_ALL_ROWS and self.data_sorting_by_pk)):
            sorting = {'data_sorting': []}
            for pk in primary_keys:
                sorting['data_sorting'].append(
                    {'name': pk, 'order': self.get_pk_order()})
            self.set_data_sorting(sorting)
            data_sorting = self.get_data_sorting()

        if sql_filter is None:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name,
                nsp_name=self.nsp_name, limit=self.limit, has_oids=has_oids,
                data_sorting=data_sorting
            )
        else:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name,
                nsp_name=self.nsp_name, limit=self.limit, has_oids=has_oids,
                sql_filter=sql_filter, data_sorting=data_sorting
            )

        return sql

    def get_primary_keys(self, default_conn=None):
        """
        This function is used to fetch the primary key columns.
        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        if default_conn is None:
            manager = driver.connection_manager(self.sid)
            conn = manager.connection(did=self.did, conn_id=self.conn_id)
        else:
            conn = default_conn

        pk_names = ''
        primary_keys = OrderedDict()

        if conn.connected():

            # Fetch the primary key column names
            query = render_template(
                "/".join([self.sql_path, 'primary_keys.sql']),
                obj_id=self.obj_id
            )

            status, result = conn.execute_dict(query)
            if not status:
                raise Exception(result)

            for row in result['rows']:
                pk_names += driver.qtIdent(conn, row['attname']) + ','
                primary_keys[row['attname']] = row['typname']

            if pk_names != '':
                # Remove last character from the string
                pk_names = pk_names[:-1]
        else:
            raise Exception(
                gettext('Not connected to server or connection with the '
                        'server has been closed.')
            )

        return pk_names, primary_keys

    def get_all_columns_with_order(self, default_conn=None):
        """
        It is overridden method specially for Table because we all have to
        fetch primary keys and rest of the columns both.

        Args:
            default_conn: Connection object

        Returns:
            all_sorted_columns: Sorted columns for the Grid
            all_columns: List of columns for the select2 options
        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        if default_conn is None:
            manager = driver.connection_manager(self.sid)
            conn = manager.connection(did=self.did, conn_id=self.conn_id)
        else:
            conn = default_conn

        all_sorted_columns = []
        data_sorting = self.get_data_sorting()
        all_columns = []
        # Fetch the primary key column names
        query = render_template(
            "/".join([self.sql_path, 'primary_keys.sql']),
            obj_id=self.obj_id
        )

        status, result = conn.execute_dict(query)

        if not status:
            raise Exception(result)

        for row in result['rows']:
            all_columns.append(row['attname'])

        # Fetch the rest of the column names
        query = render_template(
            "/".join([self.sql_path, 'get_columns.sql']),
            obj_id=self.obj_id
        )
        status, result = conn.execute_dict(query)
        if not status:
            raise Exception(result)

        for row in result['rows']:
            # Only append if not already present in the list
            if row['attname'] not in all_columns:
                all_columns.append(row['attname'])

        # If user has custom data sorting then pass as it as it is
        if data_sorting and len(data_sorting) > 0:
            all_sorted_columns = data_sorting

        return all_sorted_columns, all_columns

    def can_edit(self):
        return True

    def can_filter(self):
        return True

    def has_oids(self, default_conn=None):
        """
        This function checks whether the table has oids or not.
        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(self.sid)

        # Remove the special behavior of OID columns from
        # PostgreSQL 12 onwards, so returning False.
        if manager.sversion >= 120000:
            return False

        if default_conn is None:
            conn = manager.connection(did=self.did, conn_id=self.conn_id)
        else:
            conn = default_conn

        if conn.connected():

            # Fetch the table oids status
            query = render_template(
                "/".join([self.sql_path, 'has_oids.sql']), obj_id=self.obj_id)

            status, has_oids = conn.execute_scalar(query)
            if not status:
                raise Exception(has_oids)

        else:
            raise Exception(
                gettext('Not connected to server or connection with the '
                        'server has been closed.')
            )

        return has_oids

    def save(self,
             changed_data,
             columns_info,
             client_primary_key='__temp_PK',
             default_conn=None):
        """
        This function is used to save the data into the database.
        Depending on condition it will either update or insert the
        new row into the database.

        Args:
            changed_data: Contains data to be saved
            columns_info:
            default_conn:
            client_primary_key:
        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        if default_conn is None:
            manager = driver.connection_manager(self.sid)
            conn = manager.connection(did=self.did, conn_id=self.conn_id)
        else:
            conn = default_conn

        return save_changed_data(changed_data=changed_data,
                                 columns_info=columns_info,
                                 command_obj=self,
                                 client_primary_key=client_primary_key,
                                 conn=conn)

    def get_columns_types(self, conn):
        columns_info = conn.get_column_info()
        has_oids = self.has_oids()
        table_oid = self.obj_id
        return get_columns_types(conn=conn,
                                 columns_info=columns_info,
                                 has_oids=has_oids,
                                 table_oid=table_oid,
                                 is_query_tool=False)


class ViewCommand(GridCommand):
    """
    class ViewCommand(GridCommand)

        It is a derived class for View type.
    """
    object_type = 'view'

    def __init__(self, **kwargs):
        """
        This method calls the __init__ method of the base class
        to get the proper object name.

        Args:
            **kwargs : N number of parameters
        """

        # call base class init to fetch the table name
        super(ViewCommand, self).__init__(**kwargs)

    def get_sql(self, default_conn=None):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified view
        """
        sql_filter = self.get_filter()
        data_sorting = self.get_data_sorting()

        if sql_filter is None:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name, nsp_name=self.nsp_name,
                limit=self.limit, data_sorting=data_sorting
            )
        else:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name, nsp_name=self.nsp_name,
                sql_filter=sql_filter, limit=self.limit,
                data_sorting=data_sorting
            )

        return sql

    def can_edit(self):
        return False

    def can_filter(self):
        return True


class MViewCommand(ViewCommand):
    """
    class MViewCommand(ViewCommand)

        It is a derived class for View type has
        same functionality of View
    """
    object_type = 'mview'


class ForeignTableCommand(GridCommand):
    """
    class ForeignTableCommand(GridCommand)

        It is a derived class for ForeignTable type.
    """
    object_type = 'foreign_table'

    def __init__(self, **kwargs):
        """
        This method calls the __init__ method of the base class
        to get the proper object name.

        Args:
            **kwargs : N number of parameters
        """

        # call base class init to fetch the table name
        super(ForeignTableCommand, self).__init__(**kwargs)

    def get_sql(self, default_conn=None):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified foreign table
        """
        sql_filter = self.get_filter()
        data_sorting = self.get_data_sorting()

        if sql_filter is None:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name, nsp_name=self.nsp_name,
                limit=self.limit, data_sorting=data_sorting
            )
        else:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name, nsp_name=self.nsp_name,
                sql_filter=sql_filter, limit=self.limit,
                data_sorting=data_sorting
            )

        return sql

    def can_edit(self):
        return False

    def can_filter(self):
        return True


class CatalogCommand(GridCommand):
    """
    class CatalogCommand(GridCommand)

        It is a derived class for CatalogObject type.
    """
    object_type = 'catalog_object'

    def __init__(self, **kwargs):
        """
        This method calls the __init__ method of the base class
        to get the proper object name.

        Args:
            **kwargs : N number of parameters
        """

        # call base class init to fetch the table name
        super(CatalogCommand, self).__init__(**kwargs)

    def get_sql(self, default_conn=None):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified catalog object
        """
        sql_filter = self.get_filter()
        data_sorting = self.get_data_sorting()

        if sql_filter is None:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name, nsp_name=self.nsp_name,
                limit=self.limit, data_sorting=data_sorting
            )
        else:
            sql = render_template(
                "/".join([self.sql_path, 'objectquery.sql']),
                object_name=self.object_name, nsp_name=self.nsp_name,
                sql_filter=sql_filter, limit=self.limit,
                data_sorting=data_sorting
            )

        return sql

    def can_edit(self):
        return False

    def can_filter(self):
        return True


class QueryToolCommand(BaseCommand, FetchedRowTracker):
    """
    class QueryToolCommand(BaseCommand)

        It is a derived class for Query Tool.
    """
    object_type = 'query_tool'

    def __init__(self, **kwargs):
        # call base class init to fetch the table name

        BaseCommand.__init__(self, **kwargs)
        FetchedRowTracker.__init__(self, **kwargs)

        self.conn_id = kwargs['conn_id'] if 'conn_id' in kwargs else None
        self.auto_rollback = False
        self.auto_commit = True

        # Attributes needed to be able to edit updatable resultsets
        self.is_updatable_resultset = False
        self.primary_keys = None
        self.pk_names = None
        self.table_has_oids = False
        self.columns_types = None

    def get_sql(self, default_conn=None):
        return None

    def get_all_columns_with_order(self, default_conn=None):
        return None

    def get_primary_keys(self):
        return self.pk_names, self.primary_keys

    def get_columns_types(self, conn=None):
        return self.columns_types

    def has_oids(self):
        return self.table_has_oids

    def can_edit(self):
        return self.is_updatable_resultset

    def can_filter(self):
        return False

    def check_updatable_results_pkeys_oids(self):
        """
            This function is used to check whether the last successful query
            produced updatable results and sets the necessary flags and
            attributes accordingly.
            Should be called after polling for the results is successful
            (results are ready)
        """
        # Fetch the connection object
        driver = get_driver(PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(self.sid)
        conn = manager.connection(did=self.did, conn_id=self.conn_id)

        # Get the driver version as a float
        driver_version = float('.'.join(driver.version().split('.')[:2]))

        # Checking for updatable resultsets uses features in psycopg 2.8
        if driver_version < 2.8:
            return False

        # Get the path to the sql templates
        sql_path = 'sqleditor/sql/#{0}#'.format(manager.version)

        self.is_updatable_resultset, self.table_has_oids,\
            self.primary_keys, pk_names, table_oid,\
            self.columns_types = is_query_resultset_updatable(conn, sql_path)

        # Create pk_names attribute in the required format
        if pk_names is not None:
            self.pk_names = ''

            for pk_name in pk_names:
                self.pk_names += driver.qtIdent(conn, pk_name) + ','

            if self.pk_names != '':
                # Remove last character from the string
                self.pk_names = self.pk_names[:-1]

        # Add attributes required to be able to update table data
        if self.is_updatable_resultset:
            self.__set_updatable_results_attrs(sql_path=sql_path,
                                               table_oid=table_oid,
                                               conn=conn)
        return self.is_updatable_resultset

    def save(self,
             changed_data,
             columns_info,
             client_primary_key='__temp_PK',
             default_conn=None):
        if not self.is_updatable_resultset:
            return False, gettext('Resultset is not updatable.'), None, None
        else:
            driver = get_driver(PG_DEFAULT_DRIVER)
            if default_conn is None:
                manager = driver.connection_manager(self.sid)
                conn = manager.connection(did=self.did, conn_id=self.conn_id)
            else:
                conn = default_conn

            return save_changed_data(changed_data=changed_data,
                                     columns_info=columns_info,
                                     conn=conn,
                                     command_obj=self,
                                     client_primary_key=client_primary_key,
                                     auto_commit=self.auto_commit)

    def set_connection_id(self, conn_id):
        self.conn_id = conn_id

    def set_auto_rollback(self, auto_rollback):
        self.auto_rollback = auto_rollback

    def set_auto_commit(self, auto_commit):
        self.auto_commit = auto_commit

    def __set_updatable_results_attrs(self, sql_path,
                                      table_oid, conn):
        # Set template path for sql scripts and the table object id
        self.sql_path = sql_path
        self.obj_id = table_oid

        if conn.connected():
            # Fetch the Namespace Name and object Name
            query = render_template(
                "/".join([self.sql_path, 'objectname.sql']),
                obj_id=self.obj_id
            )

            status, result = conn.execute_dict(query)
            if not status:
                raise Exception(result)

            self.nsp_name = result['rows'][0]['nspname']
            self.object_name = result['rows'][0]['relname']
        else:
            raise Exception(gettext(
                'Not connected to server or connection with the server '
                'has been closed.')
            )
