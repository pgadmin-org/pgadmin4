##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser helper utilities"""

from abc import abstractmethod

import flask
from flask import render_template, current_app
from flask_babel import gettext
from flask.views import View, MethodViewType, with_metaclass
from pgadmin.utils.ajax import make_json_response, precondition_required

from config import PG_DEFAULT_DRIVER


class PGChildModule(object):
    """
    class PGChildModule

    This is a base class for children/grand-children of PostgreSQL, and
    all Postgres Plus version (i.e. Postgres Plus Advanced Server, Green Plum,
    etc).

    Method:
    ------
    * BackendSupported(manager)
    - Return True when it supports certain version.
      Uses the psycopg2 server connection manager as input for checking the
      compatibility of the current module.
    """

    def __init__(self, *args, **kwargs):
        self.min_ver = 0
        self.max_ver = 1000000000
        self.server_type = None

        super(PGChildModule, self).__init__()

    def BackendSupported(self, manager, **kwargs):
        if hasattr(self, 'show_node'):
            if not self.show_node:
                return False
        sversion = getattr(manager, 'sversion', None)
        if (sversion is None or not isinstance(sversion, int)):
            return False

        if (self.min_ver is None and self.max_ver is None):
            return True

        assert (self.max_ver is None or isinstance(self.max_ver, int))
        assert (self.min_ver is None or isinstance(self.min_ver, int))
        assert (self.server_type is None or isinstance(self.server_type, list))

        if self.server_type is None or manager.server_type in self.server_type:
            if self.min_ver is None or self.min_ver <= sversion:
                if self.max_ver is None or self.max_ver >= sversion:
                    return True

        return False

    @abstractmethod
    def get_nodes(self, sid=None, **kwargs):
        pass


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
        # Return sorted nodes based on label
        return make_json_response(
            data=sorted(
                children, key=lambda c: c['label']
            )
        )


class PGChildNodeView(NodeView):
    def children(self, **kwargs):
        """Build a list of treeview nodes from the child nodes."""

        if 'sid' not in kwargs:
            return precondition_required(
                gettext('Required properties are missing.')
            )

        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
            sid=kwargs['sid']
        )

        did = None
        if 'did' in kwargs:
            did = kwargs['did']

        conn = manager.connection(did=did)

        if not conn.connected():
            return precondition_required(
                gettext(
                    "Connection to the server has been lost."
                )
            )

        nodes = []
        for module in self.blueprint.submodules:
            if isinstance(module, PGChildModule):
                if manager is not None and \
                        module.BackendSupported(manager, **kwargs):
                    nodes.extend(module.get_nodes(**kwargs))
            else:
                nodes.extend(module.get_nodes(**kwargs))

        # Return sorted nodes based on label
        return make_json_response(
            data=sorted(
                nodes, key=lambda c: c['label']
            )
        )

    def get_dependencies(self, conn, object_id, where=None):
        """
        This function is used to fetch the dependencies for the selected node.

        Args:
            conn: Connection object
            object_id: Object Id of the selected node.
            where: where clause for the sql query (optional)

        Returns: Dictionary of dependencies for the selected node.
        """

        # Set the sql_path
        sql_path = ''
        if conn.manager.version >= 90100:
            sql_path = 'depends/sql/9.1_plus'

        if where is None:
            where_clause = "WHERE dep.objid={0}::oid".format(object_id)
        else:
            where_clause = where

        query = render_template("/".join([sql_path, 'dependents.sql']),
                                fetch_dependencies=True, where_clause=where_clause)
        # fetch the dependency for the selected object
        dependencies = self.__fetch_dependency(conn, query)

        # fetch role dependencies
        if where_clause.find('subid') < 0:
            sql = render_template("/".join([sql_path, 'dependents.sql']),
                                  fetch_role_dependencies=True, where_clause=where_clause)

            status, result = conn.execute_dict(sql)
            if not status:
                current_app.logger.error(result)

            for row in result['rows']:
                ref_name = row['refname']
                dep_str = row['deptype']
                dep_type = ''

                if dep_str == 'a':
                    dep_type = 'ACL'
                elif dep_str == 'o':
                    dep_type = 'Owner'

                if row['refclassid'] == 1260:
                    dependencies.append({'type': 'role', 'name': ref_name, 'field': dep_type})

        return dependencies

    def get_dependents(self, conn, object_id, where=None):
        """
        This function is used to fetch the dependents for the selected node.

        Args:
            conn: Connection object
            object_id: Object Id of the selected node.
            where: where clause for the sql query (optional)

        Returns: Dictionary of dependents for the selected node.
        """
        # Set the sql_path
        sql_path = ''
        if conn.manager.version >= 90100:
            sql_path = 'depends/sql/9.1_plus'

        if where is None:
            where_clause = "WHERE dep.refobjid={0}::oid".format(object_id)
        else:
            where_clause = where

        query = render_template("/".join([sql_path, 'dependents.sql']),
                                fetch_dependents=True, where_clause=where_clause)
        # fetch the dependency for the selected object
        dependents = self.__fetch_dependency(conn, query)

        return dependents

    def __fetch_dependency(self, conn, query):
        """
        This function is used to fetch the dependency for the selected node.

        Args:
            conn: Connection object
            query: sql query to fetch dependencies/dependents

        Returns: Dictionary of dependency for the selected node.
        """

        # Dictionary for the object types
        types = {
            # None specified special handling for this type
            'r': None,
            'i': 'index',
            'S': 'sequence',
            'v': 'view',
            'x': 'external_table',
            'p': 'function',
            'n': 'schema',
            'y': 'type',
            'd': 'domain',
            'T': 'trigger',
            'l': 'language',
            'f': 'foreign_data_wrapper',
            'F': 'foreign_server',
            'R': None,
            'C': None,
            'A': None
        }

        # Dictionary for the restrictions
        dep_types = {
            # None specified special handling for this type
            'n': 'normal',
            'a': 'auto',
            'i': None,
            'p': None
        }

        status, result = conn.execute_dict(query)
        if not status:
            current_app.logger.error(result)

        dependency = list()

        for row in result['rows']:
            _ref_name = row['refname']
            type_str = row['type']
            dep_str = row['deptype']
            nsp_name = row['nspname']

            ref_name = ''
            if nsp_name is not None:
                ref_name = nsp_name + '.'

            type_name = ''

            # Fetch the type name from the dictionary
            # if type is not present in the types dictionary then
            # we will continue and not going to add it.
            if type_str[0] in types:

                # if type is present in the types dictionary, but it's
                # value is None then it requires special handling.
                if types[type_str[0]] is None:
                    if type_str[0] == 'r':
                        if int(type_str[1]) > 0:
                            type_name = 'column'
                        else:
                            type_name = 'table'
                    elif type_str[0] == 'R':
                        type_name = 'rule'
                        ref_name = _ref_name + ' ON ' + ref_name + row['ownertable']
                        _ref_name = None
                    elif type_str[0] == 'C':
                        if type_str[1] == 'c':
                            type_name = 'check'
                        elif type_str[1] == 'f':
                            type_name = 'foreign_key'
                            ref_name += row['ownertable'] + '.'
                        elif type_str[1] == 'p':
                            type_name = 'primary_key'
                        elif type_str[1] == 'u':
                            type_name = 'unique'
                        elif type_str[1] == 'x':
                            type_name = 'exclude'
                    elif type_str[0] == 'A':
                        # Include only functions
                        if row['adbin'].startswith('{FUNCEXPR'):
                            type_name = 'function'
                            ref_name = row['adsrc']
                        else:
                            continue
                else:
                    type_name = types[type_str[0]]
            else:
                continue

            if _ref_name is not None:
                ref_name += _ref_name

            dep_type = ''
            if dep_str[0] in dep_types:

                # if dep_type is present in the dep_types dictionary, but it's
                # value is None then it requires special handling.
                if dep_types[dep_str[0]] is None:
                    if dep_str[0] == 'i':
                        if self.blueprint.show_system_objects:
                            dep_type = 'internal'
                        else:
                            continue
                    elif dep_str[0] == 'p':
                        dep_type = 'pin'
                        type_name = ''
                else:
                    dep_type = dep_types[dep_str[0]]

            dependency.append({'type': type_name, 'name': ref_name, 'field': dep_type})

        return dependency
