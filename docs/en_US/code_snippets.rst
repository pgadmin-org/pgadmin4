*************
Code Snippets
*************


This document contains code for some of the important classes, listed as
below:

* PgAdminModule_
* NodeView_
* BaseDriver_
* BaseConnection_


.. _PgAdminModule:

PgAdminModule
*************


PgAdminModule is inherted from Flask.Blueprint module.
This module defines a set of methods, properties and attributes, that every module should implement.


.. code-block:: python

    class PgAdminModule(Blueprint):
        """
        Base class for every PgAdmin Module.

        This class defines a set of method and attributes that
        every module should implement.
        """

        def __init__(self, name, import_name, **kwargs):
            kwargs.setdefault('url_prefix', '/' + name)
            kwargs.setdefault('template_folder', 'templates')
            kwargs.setdefault('static_folder', 'static')
            self.submodules = []

            super(PgAdminModule, self).__init__(name, import_name, **kwargs)

            def create_module_preference():
                # Create preference for each module by default
                if hasattr(self, 'LABEL'):
                    self.preference = Preferences(self.name, self.LABEL)
                else:
                    self.preference = Preferences(self.name, None)

                self.register_preferences()

            # Create and register the module preference object and preferences for
            # it just before the first request
            self.before_app_first_request(create_module_preference)

        def register_preferences(self):
            pass

        def register(self, app, options, first_registration=False):
            """
            Override the default register function to automagically register
            sub-modules at once.
            """
            if first_registration:
                self.submodules = list(app.find_submodules(self.import_name))

            super(PgAdminModule, self).register(app, options, first_registration)

            for module in self.submodules:
                app.register_blueprint(module)

        def get_own_stylesheets(self):
            """
            Returns:
                list: the stylesheets used by this module, not including any
                    stylesheet needed by the submodules.
            """
            return []

        def get_own_messages(self):
            """
            Returns:
                dict: the i18n messages used by this module, not including any
                    messages needed by the submodules.
            """
            return dict()

        def get_own_javascripts(self):
            """
            Returns:
                list: the javascripts used by this module, not including
                    any script needed by the submodules.
            """
            return []

        def get_own_menuitems(self):
            """
            Returns:
                dict: the menuitems for this module, not including
                    any needed from the submodules.
            """
            return defaultdict(list)

        def get_panels(self):
            """
            Returns:
                list: a list of panel objects to add
            """
            return []

        @property
        def stylesheets(self):
            stylesheets = self.get_own_stylesheets()
            for module in self.submodules:
                stylesheets.extend(module.stylesheets)
            return stylesheets

        @property
        def messages(self):
            res = self.get_own_messages()

            for module in self.submodules:
                res.update(module.messages)
            return res

        @property
        def javascripts(self):
            javascripts = self.get_own_javascripts()
            for module in self.submodules:
                javascripts.extend(module.javascripts)
            return javascripts

        @property
        def menu_items(self):
            menu_items = self.get_own_menuitems()
            for module in self.submodules:
                for key, value in module.menu_items.items():
                    menu_items[key].extend(value)
            menu_items = dict((key, sorted(value, key=attrgetter('priority')))
                          for key, value in menu_items.items())
            return menu_items


.. _NodeView:

NodeView
********


NodeView class helps exposing basic REST APIs for different operations used by
pgAdmin Browser. The basic idea has been taken from the `Flask's MethodView
<http://flask.pocoo.org/docs/0.10/api/#flask.views.MethodView>`_ class. Because
- we need a lot more operations (not, just CRUD), we can not use it directly.

.. code-block:: python

    class NodeView(with_metaclass(MethodViewType, View)):
        """
        A PostgreSQL Object has so many operaions/functions apart from CRUD
        (Create, Read, Update, Delete):
        i.e.
        - Reversed Engineered SQL
        - Modified Query for parameter while editing object attributes
          i.e. ALTER TABLE ...
        - Statistics of the objects
        - List of dependents
        - List of dependencies
        - Listing of the children object types for the certain node
          It will used by the browser tree to get the children nodes

        This class can be inherited to achieve the diffrent routes for each of the
        object types/collections.

           OPERATION   |             URL             | HTTP Method |    Method
        ---------------+-----------------------------+-------------+--------------
        List           | /obj/[Parent URL]/          | GET         | list
        Properties     | /obj/[Parent URL]/id        | GET         | properties
        Create         | /obj/[Parent URL]/          | POST        | create
        Delete         | /obj/[Parent URL]/id        | DELETE      | delete
        Update         | /obj/[Parent URL]/id        | PUT         | update

        SQL (Reversed  | /sql/[Parent URL]/id        | GET         | sql
        Engineering)   |
        SQL (Modified  | /msql/[Parent URL]/id       | GET         | modified_sql
        Properties)    |

        Statistics     | /stats/[Parent URL]/id      | GET         | statistics
        Dependencies   | /dependency/[Parent URL]/id | GET         | dependencies
        Dependents     | /dependent/[Parent URL]/id  | GET         | dependents

        Nodes          | /nodes/[Parent URL]/        | GET         | nodes
        Current Node   | /nodes/[Parent URL]/id      | GET         | node

        Children       | /children/[Parent URL]/id   | GET         | children

        NOTE:
        Parent URL can be seen as the path to identify the particular node.

        i.e.
        In order to identify the TABLE object, we need server -> database -> schema
        information.
        """
        operations = dict({
            'obj': [
                {'get': 'properties', 'delete': 'delete', 'put': 'update'},
                {'get': 'list', 'post': 'create'}
            ],
            'nodes': [{'get': 'node'}, {'get': 'nodes'}],
            'sql': [{'get': 'sql'}],
            'msql': [{'get': 'modified_sql'}],
            'stats': [{'get': 'statistics'}],
            'dependency': [{'get': 'dependencies'}],
            'dependent': [{'get': 'dependents'}],
            'children': [{'get': 'children'}],
            'module.js': [{}, {}, {'get': 'module_js'}]
        })

        @classmethod
        def generate_ops(cls):
            cmds = []
            for op in cls.operations:
                idx = 0
                for ops in cls.operations[op]:
                    meths = []
                    for meth in ops:
                        meths.append(meth.upper())
                    if len(meths) > 0:
                        cmds.append({
                            'cmd': op, 'req': (idx == 0),
                            'with_id': (idx != 2), 'methods': meths
                            })
                    idx += 1
            return cmds

        # Inherited class needs to modify these parameters
        node_type = None
        # This must be an array object with attributes (type and id)
        parent_ids = []
        # This must be an array object with attributes (type and id)
        ids = []

        @classmethod
        def get_node_urls(cls):
            assert cls.node_type is not None, \
                "Please set the node_type for this class ({0})".format(
                    str(cls.__class__.__name__))
            common_url = '/'
            for p in cls.parent_ids:
                common_url += '<{0}:{1}>/'.format(str(p['type']), str(p['id']))

            id_url = None
            for p in cls.ids:
                id_url = '{0}<{1}:{2}>'.format(common_url if not id_url else id_url,
                                               p['type'], p['id'])

            return id_url, common_url

        def __init__(self, **kwargs):
            self.cmd = kwargs['cmd']

        # Check the existance of all the required arguments from parent_ids
        # and return combination of has parent arguments, and has id arguments
        def check_args(self, **kwargs):
            has_id = has_args = True
            for p in self.parent_ids:
                if p['id'] not in kwargs:
                    has_args = False
                    break

            for p in self.ids:
                if p['id'] not in kwargs:
                    has_id = False
                    break

            return has_args, has_id and has_args

        def dispatch_request(self, *args, **kwargs):
            meth = flask.request.method.lower()
            if meth == 'head':
                meth = 'get'

            assert self.cmd in self.operations, \
                    "Unimplemented command ({0}) for {1}".format(
                        self.cmd,
                        str(self.__class__.__name__)
                        )

            has_args, has_id = self.check_args(**kwargs)

            assert (self.cmd in self.operations and
                    (has_id and len(self.operations[self.cmd]) > 0 and
                        meth in self.operations[self.cmd][0]) or
                    (not has_id and len(self.operations[self.cmd]) > 1 and
                        meth in self.operations[self.cmd][1]) or
                    (len(self.operations[self.cmd]) > 2 and
                        meth in self.operations[self.cmd][2])), \
                    "Unimplemented method ({0}) for command ({1}), which {2} an id".format(
                        meth, self.cmd,
                        'requires' if has_id else 'does not require'
                        )

            meth = self.operations[self.cmd][0][meth] if has_id else \
                self.operations[self.cmd][1][meth] if has_args and \
                meth in self.operations[self.cmd][1] else \
                self.operations[self.cmd][2][meth]

            method = getattr(self, meth, None)

            if method is None:
                return make_json_response(
                    status=406,
                    success=0,
                    errormsg=gettext(
                        "Unimplemented method ({0}) for this url ({1})".format(
                            meth, flask.request.path)
                    )
                )

            return method(*args, **kwargs)

        @classmethod
        def register_node_view(cls, blueprint):
            cls.blueprint = blueprint
            id_url, url = cls.get_node_urls()

            commands = cls.generate_ops()

            for c in commands:
                if c['with_id']:
                    blueprint.add_url_rule(
                            '/{0}{1}'.format(
                                c['cmd'], id_url if c['req'] else url
                                ),
                            view_func=cls.as_view(
                                '{0}{1}'.format(
                                    c['cmd'], '_id' if c['req'] else ''
                                    ),
                                cmd=c['cmd']
                                ),
                            methods=c['methods']
                            )
                else:
                    blueprint.add_url_rule(
                            '/{0}'.format(c['cmd']),
                            view_func=cls.as_view(
                                '{0}'.format(c['cmd']), cmd=c['cmd']
                                ),
                            methods=c['methods']
                            )

        def module_js(self, **kwargs):
            """
            This property defines (if javascript) exists for this node.
            Override this property for your own logic.
            """
            return flask.make_response(
                    flask.render_template(
                        "{0}/js/{0}.js".format(self.node_type)
                        ),
                    200, {'Content-Type': 'application/x-javascript'}
                    )

        def children(self, *args, **kwargs):
            """Build a list of treeview nodes from the child nodes."""
            children = []

            for module in self.blueprint.submodules:
                children.extend(module.get_nodes(*args, **kwargs))

            return make_json_response(data=children)


.. _BaseDriver:

BaseDriver
**********

.. code-block:: python

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


.. _BaseConnection:

BaseConnection
**************

.. code-block:: python

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
