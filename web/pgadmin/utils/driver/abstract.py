##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implement the Base class for Driver and Connection"""

from abc import ABCMeta, abstractmethod, abstractproperty

import six

from .registry import DriverRegistry


@six.add_metaclass(DriverRegistry)
class BaseDriver(object):
    """
    class BaseDriver(object):

    This is a base class for different server types.
    Inherit this class to implement different type of database driver
    implementation.

    (For PostgreSQL/Postgres Plus Advanced Server, we will be using psycopg2)

    Abstract Properties:
    -------- ----------
    * Version (string):
        Current version string for the database server

    Abstract Methods:
    -------- -------
    * get_connection(*args, **kwargs)
    - It should return a Connection class object, which may/may not be
      connected to the database server.

    * release_connection(*args, **kwargs)
    - Implement the connection release logic

    * gc()
    - Implement this function to release the connections assigned in the
      session, which has not been pinged from more than the idle timeout
      configuration.
    """

    @abstractproperty
    def Version(cls):
        pass

    @abstractmethod
    def get_connection(self, *args, **kwargs):
        pass

    @abstractmethod
    def release_connection(self, *args, **kwargs):
        pass

    @abstractmethod
    def gc(self):
        pass


@six.add_metaclass(ABCMeta)
class BaseConnection(object):
    """
    class BaseConnection(object)

        It is a base class for database connection. A different connection
        drive must implement this to expose abstract methods for this server.

        General idea is to create a wrapper around the actual driver
        implementation. It will be instantiated by the driver factory
        basically. And, they should not be instantiated directly.


    Abstract Methods:
    -------- -------
    * connect(**kwargs)
      - Define this method to connect the server using that particular driver
        implementation.

    * execute_scalar(query, params, formatted_exception_msg)
      - Implement this method to execute the given query and returns single
        datum result.

    * execute_async(query, params, formatted_exception_msg)
      - Implement this method to execute the given query asynchronously and returns result.

    * execute_void(query, params, formatted_exception_msg)
      - Implement this method to execute the given query with no result.

    * execute_2darray(query, params, formatted_exception_msg)
      - Implement this method to execute the given query and returns the result
        as a 2 dimensional array.

    * execute_dict(query, params, formatted_exception_msg)
      - Implement this method to execute the given query and returns the result
        as an array of dict (column name -> value) format.

    * connected()
      - Implement this method to get the status of the connection. It should
        return True for connected, otherwise False

    * reset()
      - Implement this method to reconnect the database server (if possible)

    * transaction_status()
      - Implement this method to get the transaction status for this
        connection. Range of return values different for each driver type.

    * ping()
      - Implement this method to ping the server. There are times, a connection
        has been lost, but - the connection driver does not know about it. This
        can be helpful to figure out the actual reason for query failure.

    * _release()
      - Implement this method to release the connection object. This should not
        be directly called using the connection object itself.

      NOTE: Please use BaseDriver.release_connection(...) for releasing the
            connection object for better memory management, and connection pool
            management.

    * _wait(conn)
      - Implement this method to wait for asynchronous connection to finish the
        execution, hence - it must be a blocking call.

    * _wait_timeout(conn, time)
      - Implement this method to wait for asynchronous connection with timeout.
        This must be a non blocking call.

    * poll(formatted_exception_msg)
      - Implement this method to poll the data of query running on asynchronous
        connection.

    * cancel_transaction(conn_id, did=None)
      - Implement this method to cancel the running transaction.

    * messages()
      - Implement this method to return the list of the messages/notices from
        the database server.

    * rows_affected()
      - Implement this method to get the rows affected by the last command
        executed on the server.
    """

    ASYNC_OK = 1
    ASYNC_READ_TIMEOUT = 2
    ASYNC_WRITE_TIMEOUT = 3
    ASYNC_NOT_CONNECTED = 4
    ASYNC_EXECUTION_ABORTED = 5

    @abstractmethod
    def connect(self, **kwargs):
        pass

    @abstractmethod
    def execute_scalar(self, query, params=None, formatted_exception_msg=False):
        pass

    @abstractmethod
    def execute_async(self, query, params=None, formatted_exception_msg=True):
        pass

    @abstractmethod
    def execute_void(self, query, params=None, formatted_exception_msg=False):
        pass

    @abstractmethod
    def execute_2darray(self, query, params=None, formatted_exception_msg=False):
        pass

    @abstractmethod
    def execute_dict(self, query, params=None, formatted_exception_msg=False):
        pass

    @abstractmethod
    def connected(self):
        pass

    @abstractmethod
    def reset(self):
        pass

    @abstractmethod
    def transaction_status(self):
        pass

    @abstractmethod
    def ping(self):
        pass

    @abstractmethod
    def _release(self):
        pass

    @abstractmethod
    def _wait(self, conn):
        pass

    @abstractmethod
    def _wait_timeout(self, conn, time):
        pass

    @abstractmethod
    def poll(self, formatted_exception_msg=True):
        pass

    @abstractmethod
    def status_message(self):
        pass

    @abstractmethod
    def rows_affected(self):
        pass

    @abstractmethod
    def cancel_transaction(self, conn_id, did=None):
        pass
