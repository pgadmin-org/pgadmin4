##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implemented classes for the different object type used by data grid """

from abc import ABCMeta, abstractmethod

import six
from flask import render_template
from flask.ext.babel import gettext
from pgadmin.utils.ajax import forbidden
from pgadmin.utils.driver import get_driver

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
            gettext("This feature has not been implemented for object type '{0}'!").format(name)
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

        # Save the server id and database id, namespace id, object id
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
        self.__row_filter = kwargs['sql_filter'] if 'sql_filter' in kwargs else None

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)
        conn = manager.connection(did=self.did)

        ver = manager.version
        # we will set template path for sql scripts
        if ver >= 90100:
            self.sql_path = 'sqleditor/sql/9.1_plus'

        if conn.connected():
            # Fetch the Namespace Name and object Name
            query = render_template("/".join([self.sql_path, 'objectname.sql']), obj_id=self.obj_id)

            status, result = conn.execute_dict(query)
            if not status:
                raise Exception(result)

            self.nsp_name = result['rows'][0]['nspname']
            self.object_name = result['rows'][0]['relname']
        else:
            raise Exception(gettext('Not connected to server or connection with the server has been closed.'))

    def get_filter(self):
        """
        This function returns the filter.
        """
        return self.__row_filter

    def set_filter(self, row_filter):
        """
        This function validates the filter and set the
        given filter to member variable.

        Args:
            row_filter: sql query
        """

        status, msg = self.validate_filter(row_filter)

        if status:
            self.__row_filter = row_filter

        return status, msg

    def is_filter_applied(self):
        """
        This function returns True if filter is applied else False.
        """
        if self.__row_filter is None or self.__row_filter == '':
            return False

        return True

    def remove_filter(self):
        """
        This function remove the filter by setting value to None.
        """
        self.__row_filter = None

    def append_filter(self, row_filter):
        """
        This function will used to get the existing filter and append
        the given filter.

        Args:
            row_filter: sql query to append
        """

        existing_filter = self.get_filter()

        if existing_filter is None or existing_filter == '':
            self.__row_filter = row_filter
        else:
            self.__row_filter = existing_filter + ' \n    AND ' + row_filter

    def validate_filter(self, row_filter):
        """
        This function validates the given filter.

        Args:
            row_filter: sql syntax to validate
        """
        status = True
        result = None

        if row_filter is None or row_filter == '':
            return False, gettext('Filter string is empty.')

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)
        conn = manager.connection(did=self.did)

        if conn.connected():
            sql = render_template("/".join([self.sql_path, 'validate.sql']),
                                  nsp_name=self.nsp_name, object_name=self.object_name, row_filter=row_filter)

            status, result = conn.execute_scalar(sql)
            if not status:
                result = result.partition("\n")[0]

        return status, result


class GridCommand(BaseCommand, SQLFilter):
    """
    class GridCommand(object)

        It is a base class for different object type used by data grid.
        A different object type must implement this to expose abstract methods.

    Class-level Methods:
    ----------- -------
    * get_primary_keys()
      - Derived class can implement there own logic to get the primary keys.

    * save()
      - Derived class can implement there own logic to save the data into the database.

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

        # Save the connection id, command type
        self.conn_id = kwargs['conn_id'] if 'conn_id' in kwargs else None
        self.cmd_type = kwargs['cmd_type'] if 'cmd_type' in kwargs else None
        self.limit = -1

        if self.cmd_type == VIEW_FIRST_100_ROWS or self.cmd_type == VIEW_LAST_100_ROWS:
            self.limit = 100

    def get_primary_keys(self):
        return None, None

    def save(self, changed_data):
        return forbidden(errmsg=gettext("Data cannot be saved for the current object."))

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

    def get_sql(self):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified table
        """

        # Fetch the primary keys for the table
        pk_names, primary_keys = self.get_primary_keys()

        sql_filter = self.get_filter()

        if sql_filter is None:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, pk_names=pk_names, cmd_type=self.cmd_type,
                                  limit=self.limit)
        else:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, pk_names=pk_names, cmd_type=self.cmd_type,
                                  sql_filter=sql_filter, limit=self.limit)

        return sql

    def get_primary_keys(self):
        """
        This function is used to fetch the primary key columns.
        """

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)
        conn = manager.connection(did=self.did, conn_id=self.conn_id)

        pk_names = ''
        primary_keys = dict()

        if conn.connected():

            # Fetch the primary key column names
            query = render_template("/".join([self.sql_path, 'primary_keys.sql']), obj_id=self.obj_id)

            status, result = conn.execute_dict(query)
            if not status:
                raise Exception(result)

            for row in result['rows']:
                pk_names += row['attname'] + ','
                primary_keys[row['attname']] = row['typname']

            if pk_names != '':
                # Remove last character from the string
                pk_names = pk_names[:-1]
        else:
            raise Exception(gettext('Not connected to server or connection with the server has been closed.'))

        return pk_names, primary_keys

    def can_edit(self):
        return True

    def can_filter(self):
        return True

    def save(self, changed_data):
        """
        This function is used to save the data into the database.
        Depending on condition it will either update or insert the
        new row into the database.

        Args:
            changed_data: Contains data to be saved
        """

        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(self.sid)
        conn = manager.connection(did=self.did, conn_id=self.conn_id)

        status = False
        res = None
        query_res = dict()
        count = 0

        if conn.connected():

            # Start the transaction
            conn.execute_void('BEGIN;')

            # Iterate total number of records to be updated/inserted
            for row in changed_data:

                # if no data to be saved then continue
                if 'data' not in row:
                    continue

                # if 'keys' is present in row then it is and update query
                # else it is an insert query.
                if 'keys' in row:
                    # if 'marked_for_deletion' is present in row and it is true then delete
                    if 'marked_for_deletion' in row and row['marked_for_deletion']:
                        sql = render_template("/".join([self.sql_path, 'delete.sql']),
                                              primary_keys=row['keys'], object_name=self.object_name,
                                              nsp_name=self.nsp_name)
                    else:
                        sql = render_template("/".join([self.sql_path, 'update.sql']), object_name=self.object_name,
                                              data_to_be_saved=row['data'], primary_keys=row['keys'],
                                              nsp_name=self.nsp_name)
                else:
                    sql = render_template("/".join([self.sql_path, 'insert.sql']), object_name=self.object_name,
                                          data_to_be_saved=row['data'], nsp_name=self.nsp_name)

                status, res = conn.execute_void(sql)
                rows_affected = conn.rows_affected()

                # store the result of each query in dictionary
                query_res[count] = {'status': status, 'result': res,
                                    'sql': sql, 'rows_affected': rows_affected}
                count += 1

                if not status:
                    conn.execute_void('ROLLBACK;')
                    # If we roll backed every thing then update the message for
                    # each sql query.
                    for val in query_res:
                        if query_res[val]['status']:
                            query_res[val]['result'] = 'Transaction ROLLBACK'

                    return status, res, query_res

            # Commit the transaction if there is no error found
            conn.execute_void('COMMIT;')

        return status, res, query_res


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

    def get_sql(self):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified view
        """
        sql_filter = self.get_filter()

        if sql_filter is None:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, cmd_type=self.cmd_type,
                                  limit=self.limit)
        else:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, cmd_type=self.cmd_type,
                                  sql_filter=sql_filter, limit=self.limit)

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
    object_type = 'foreign-table'

    def __init__(self, **kwargs):
        """
        This method calls the __init__ method of the base class
        to get the proper object name.

        Args:
            **kwargs : N number of parameters
        """

        # call base class init to fetch the table name
        super(ForeignTableCommand, self).__init__(**kwargs)

    def get_sql(self):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified foreign table
        """
        sql_filter = self.get_filter()

        if sql_filter is None:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, cmd_type=self.cmd_type,
                                  limit=self.limit)
        else:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, cmd_type=self.cmd_type,
                                  sql_filter=sql_filter, limit=self.limit)

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

    def get_sql(self):
        """
        This method is used to create a proper SQL query
        to fetch the data for the specified catalog object
        """
        sql_filter = self.get_filter()

        if sql_filter is None:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, cmd_type=self.cmd_type,
                                  limit=self.limit)
        else:
            sql = render_template("/".join([self.sql_path, 'objectquery.sql']), object_name=self.object_name,
                                  nsp_name=self.nsp_name, cmd_type=self.cmd_type,
                                  sql_filter=sql_filter, limit=self.limit)

        return sql

    def can_edit(self):
        return False

    def can_filter(self):
        return True


class QueryToolCommand(BaseCommand):
    """
    class QueryToolCommand(BaseCommand)

        It is a derived class for Query Tool.
    """
    object_type = 'query_tool'

    def __init__(self, **kwargs):
        # call base class init to fetch the table name
        super(QueryToolCommand, self).__init__(**kwargs)

        self.conn_id = None
        self.auto_rollback = False
        self.auto_commit = True

    def get_sql(self):
        return None

    def can_edit(self):
        return False

    def can_filter(self):
        return False

    def set_connection_id(self, conn_id):
        self.conn_id = conn_id

    def set_auto_rollback(self, auto_rollback):
        self.auto_rollback = auto_rollback

    def set_auto_commit(self, auto_commit):
        self.auto_commit = auto_commit
