##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Browser helper utilities"""

from abc import abstractmethod

import flask
from flask import render_template, current_app
from flask.views import View, MethodViewType, with_metaclass
from flask_babelex import gettext

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import make_json_response, precondition_required,\
    internal_server_error
from pgadmin.utils.exception import ConnectionLost, SSHTunnelConnectionLost,\
    CryptKeyMissing


def underscore_escape(text):
    """
    This function mimics the behaviour of underscore js escape function
    The html escaped by jinja is not compatible for underscore unescape
    function
    :param text: input html text
    :return: escaped text
    """
    html_map = {
        '&': "&amp;",
        '<': "&lt;",
        '>': "&gt;",
        '"': "&quot;",
        '`': "&#96;",
        "'": "&#x27;"
    }

    # always replace & first
    for c, r in sorted(html_map.items(),
                       key=lambda x: 0 if x[0] == '&' else 1):
        text = text.replace(c, r)

    return text


def underscore_unescape(text):
    """
    This function mimics the behaviour of underscore js unescape function
    The html unescape by jinja is not compatible for underscore escape
    function
    :param text: input html text
    :return: unescaped text
    """
    html_map = {
        "&amp;": '&',
        "&lt;": '<',
        "&gt;": '>',
        "&quot;": '"',
        "&#96;": '`',
        "&#x27;": "'"
    }

    # always replace & first
    for c, r in html_map.items():
        text = text.replace(c, r)

    return text


def is_version_in_range(sversion, min_ver, max_ver):
    assert (max_ver is None or isinstance(max_ver, int))
    assert (min_ver is None or isinstance(min_ver, int))

    if min_ver is None and max_ver is None:
        return True

    if (min_ver is None or min_ver <= sversion) and \
            (max_ver is None or max_ver >= sversion):
        return True
    return False


class PGChildModule(object):
    """
    class PGChildModule

    This is a base class for children/grand-children of PostgreSQL, and
    all EDB Postgres Advanced Server version
    (i.e. EDB Postgres Advanced Server, Green Plum, etc).

    Method:
    ------
    * backend_supported(manager)
    - Return True when it supports certain version.
      Uses the psycopg2 server connection manager as input for checking the
      compatibility of the current module.
    """

    def __init__(self, *args, **kwargs):
        self.min_ver = 0
        self.max_ver = 1100000000
        self.min_ppasver = 0
        self.max_ppasver = 1100000000
        self.server_type = None
        self.min_gpdbver = 80323
        self.max_gpdbver = 1000000000

        super(PGChildModule, self).__init__()

    def backend_supported(self, manager, **kwargs):
        if hasattr(self, 'show_node'):
            if not self.show_node:
                return False
        sversion = getattr(manager, 'sversion', None)

        if sversion is None or not isinstance(sversion, int):
            return False

        assert (self.server_type is None or isinstance(self.server_type, list))

        if self.server_type is None or manager.server_type in self.server_type:
            min_server_version = self.min_ver
            max_server_version = self.max_ver
            if manager.server_type == 'ppas':
                min_server_version = self.min_ppasver
                max_server_version = self.max_ppasver
            if manager.server_type == 'gpdb':
                min_server_version = self.min_gpdbver
                max_server_version = self.max_gpdbver
            return is_version_in_range(sversion, min_server_version,
                                       max_server_version)

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
        'children': [{'get': 'children'}]
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
            id_url = '{0}<{1}:{2}>'.format(
                common_url if not id_url else id_url,
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
        http_method = flask.request.method.lower()
        if http_method == 'head':
            http_method = 'get'

        assert self.cmd in self.operations, \
            'Unimplemented command ({0}) for {1}'.format(
                self.cmd,
                str(self.__class__.__name__)
            )

        has_args, has_id = self.check_args(**kwargs)

        assert (
            self.cmd in self.operations and
            (has_id and len(self.operations[self.cmd]) > 0 and
             http_method in self.operations[self.cmd][0]) or
            (not has_id and len(self.operations[self.cmd]) > 1 and
             http_method in self.operations[self.cmd][1]) or
            (len(self.operations[self.cmd]) > 2 and
             http_method in self.operations[self.cmd][2])
        ), \
            'Unimplemented method ({0}) for command ({1}), which {2} ' \
            'an id'.format(http_method,
                           self.cmd,
                           'requires' if has_id else 'does not require')
        meth = None
        if has_id:
            meth = self.operations[self.cmd][0][http_method]
        elif has_args and http_method in self.operations[self.cmd][1]:
            meth = self.operations[self.cmd][1][http_method]
        else:
            meth = self.operations[self.cmd][2][http_method]

        method = getattr(self, meth, None)

        if method is None:
            return make_json_response(
                status=406,
                success=0,
                errormsg=gettext(
                    'Unimplemented method ({0}) for this url ({1})').format(
                        meth, flask.request.path
                )
            )

        return method(*args, **kwargs)

    @classmethod
    def register_node_view(cls, blueprint):
        cls.blueprint = blueprint
        id_url, url = cls.get_node_urls()

        commands = cls.generate_ops()

        for c in commands:
            cmd = c['cmd'].replace('.', '-')
            if c['with_id']:
                blueprint.add_url_rule(
                    '/{0}{1}'.format(
                        c['cmd'], id_url if c['req'] else url
                    ),
                    view_func=cls.as_view(
                        '{0}{1}'.format(
                            cmd, '_id' if c['req'] else ''
                        ),
                        cmd=c['cmd']
                    ),
                    methods=c['methods']
                )
            else:
                blueprint.add_url_rule(
                    '/{0}'.format(c['cmd']),
                    view_func=cls.as_view(
                        cmd, cmd=c['cmd']
                    ),
                    methods=c['methods']
                )

    def children(self, *args, **kwargs):
        """Build a list of treeview nodes from the child nodes."""
        children = self.get_children_nodes(*args, **kwargs)

        # Return sorted nodes based on label
        return make_json_response(
            data=sorted(
                children, key=lambda c: c['label']
            )
        )

    def get_children_nodes(self, *args, **kwargs):
        """
        Returns the list of children nodes for the current nodes. Override this
        function for special cases only.

        :param args:
        :param kwargs: Parameters to generate the correct set of tree node.
        :return: List of the children nodes
        """
        children = []

        for module in self.blueprint.submodules:
            children.extend(module.get_nodes(*args, **kwargs))

        return children


class PGChildNodeView(NodeView):

    _NODE_SQL = 'node.sql'
    _NODES_SQL = 'nodes.sql'
    _CREATE_SQL = 'create.sql'
    _UPDATE_SQL = 'update.sql'
    _ALTER_SQL = 'alter.sql'
    _PROPERTIES_SQL = 'properties.sql'
    _DELETE_SQL = 'delete.sql'
    _GRANT_SQL = 'grant.sql'
    _SCHEMA_SQL = 'schema.sql'
    _ACL_SQL = 'acl.sql'
    _OID_SQL = 'get_oid.sql'
    _FUNCTIONS_SQL = 'functions.sql'
    _GET_CONSTRAINTS_SQL = 'get_constraints.sql'
    _GET_TABLES_SQL = 'get_tables.sql'
    _GET_DEFINITION_SQL = 'get_definition.sql'
    _GET_SCHEMA_OID_SQL = 'get_schema_oid.sql'
    _GET_COLUMNS_SQL = 'get_columns.sql'

    def get_children_nodes(self, manager, **kwargs):
        """
        Returns the list of children nodes for the current nodes.

        :param manager: Server Manager object
        :param kwargs: Parameters to generate the correct set of browser tree
          node
        :return:
        """
        nodes = []
        for module in self.blueprint.submodules:
            if isinstance(module, PGChildModule):
                if (
                    manager is not None and
                    module.backend_supported(manager, **kwargs)
                ):
                    nodes.extend(module.get_nodes(**kwargs))
            else:
                nodes.extend(module.get_nodes(**kwargs))
        return nodes

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

        try:
            conn = manager.connection(did=did)
            if not conn.connected():
                status, msg = conn.connect()
                if not status:
                    return internal_server_error(errormsg=msg)
        except (ConnectionLost, SSHTunnelConnectionLost, CryptKeyMissing):
            raise
        except Exception:
            return precondition_required(
                gettext(
                    "Connection to the server has been lost."
                )
            )

        # Return sorted nodes based on label
        return make_json_response(
            data=sorted(
                self.get_children_nodes(manager, **kwargs),
                key=lambda c: c['label']
            )
        )

    def get_dependencies(self, conn, object_id, where=None,
                         show_system_objects=None, is_schema_diff=False):
        """
        This function is used to fetch the dependencies for the selected node.

        Args:
            conn: Connection object
            object_id: Object Id of the selected node.
            where: where clause for the sql query (optional)
            show_system_objects: System object status
            is_schema_diff: True when function gets called from schema diff.

        Returns: Dictionary of dependencies for the selected node.
        """

        # Set the sql_path
        sql_path = 'depends/{0}/#{1}#'.format(
            conn.manager.server_type, conn.manager.version)

        if where is None:
            where_clause = "WHERE dep.objid={0}::oid".format(object_id)
        else:
            where_clause = where

        query = render_template("/".join([sql_path, 'dependencies.sql']),
                                where_clause=where_clause,
                                object_id=object_id)
        # fetch the dependency for the selected object
        dependencies = self.__fetch_dependency(
            conn, query, show_system_objects, is_schema_diff)

        # fetch role dependencies
        if where_clause.find('subid') < 0:
            sql = render_template(
                "/".join([sql_path, 'role_dependencies.sql']),
                where_clause=where_clause)

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
                    dependencies.append(
                        {'type': 'role',
                         'name': ref_name,
                         'field': dep_type}
                    )

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
        sql_path = 'depends/{0}/#{1}#'.format(
            conn.manager.server_type, conn.manager.version)

        if where is None:
            where_clause = "WHERE dep.refobjid={0}::oid".format(object_id)
        else:
            where_clause = where

        query = render_template("/".join([sql_path, 'dependents.sql']),
                                where_clause=where_clause)
        # fetch the dependency for the selected object
        dependents = self.__fetch_dependency(conn, query)

        return dependents

    def __fetch_dependency(self, conn, query, show_system_objects=None,
                           is_schema_diff=False):
        """
        This function is used to fetch the dependency for the selected node.

        Args:
            conn: Connection object
            query: sql query to fetch dependencies/dependents
            show_system_objects: System object status
            is_schema_diff: True when function gets called from schema diff.

        Returns: Dictionary of dependency for the selected node.
        """

        standard_types = {
            'r': None,
            'i': 'index',
            'S': 'sequence',
            'v': 'view',
            'p': 'partition_table',
            'f': 'foreign_table',
            'm': 'materialized_view',
            't': 'toast_table',
            'I': 'partition_index'
        }

        # Dictionary for the object types
        custom_types = {
            'x': 'external_table', 'n': 'schema', 'd': 'domain',
            'l': 'language', 'Cc': 'check', 'Cd': 'domain_constraints',
            'Cf': 'foreign_key', 'Cp': 'primary_key', 'Co': 'collation',
            'Cu': 'unique_constraint', 'Cx': 'exclusion_constraint',
            'Fw': 'foreign_data_wrapper', 'Fs': 'foreign_server',
            'Fc': 'fts_configuration', 'Fp': 'fts_parser',
            'Fd': 'fts_dictionary', 'Ft': 'fts_template',
            'Ex': 'extension', 'Et': 'event_trigger', 'Pa': 'package',
            'Pf': 'function', 'Pt': 'trigger_function', 'Pp': 'procedure',
            'Rl': 'rule', 'Rs': 'row_security_policy', 'Sy': 'synonym',
            'Ty': 'type', 'Tr': 'trigger', 'Tc': 'compound_trigger',
            # None specified special handling for this type
            'A': None
        }

        # Merging above two dictionaries
        types = {**standard_types, **custom_types}

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
            object_id = None
            if 'refobjid' in row:
                object_id = row['refobjid']

            ref_name = ''
            if nsp_name is not None:
                ref_name = nsp_name + '.'

            type_name = ''
            icon = None

            # Fetch the type name from the dictionary
            # if type is not present in the types dictionary then
            # we will continue and not going to add it.
            if len(type_str) and type_str in types and \
                    types[type_str] is not None:
                type_name = types[type_str]
                if type_str == 'Rl':
                    ref_name = \
                        _ref_name + ' ON ' + ref_name + row['ownertable']
                    _ref_name = None
                elif type_str == 'Cf':
                    ref_name += row['ownertable'] + '.'
                elif type_str == 'm':
                    icon = 'icon-mview'
            elif len(type_str) and type_str[0] in types and \
                    types[type_str[0]] is None:
                # if type is present in the types dictionary, but it's
                # value is None then it requires special handling.
                if type_str[0] == 'r':
                    if int(type_str[1]) > 0:
                        type_name = 'column'
                    else:
                        type_name = 'table'
                        if 'is_inherits' in row and row['is_inherits'] == '1':
                            if 'is_inherited' in row and \
                                    row['is_inherited'] == '1':
                                icon = 'icon-table-multi-inherit'
                            # For tables under partitioned tables,
                            # is_inherits will be true and dependency
                            # will be auto as it inherits from parent
                            # partitioned table
                            elif ('is_inherited' in row and
                                  row['is_inherited'] == '0') and \
                                    dep_str == 'a':
                                type_name = 'partition'
                            else:
                                icon = 'icon-table-inherits'
                        elif 'is_inherited' in row and \
                                row['is_inherited'] == '1':
                            icon = 'icon-table-inherited'
                elif type_str[0] == 'A':
                    # Include only functions
                    if row['adbin'].startswith('{FUNCEXPR'):
                        type_name = 'function'
                        ref_name = row['adsrc']
                    else:
                        continue
            else:
                continue

            if _ref_name is not None:
                ref_name += _ref_name

            # If schema diff is set to True then we don't need to calculate
            # field and also no need to add icon and field in the list.
            if is_schema_diff and type_name != 'schema':
                dependency.append(
                    {
                        'type': type_name,
                        'name': ref_name,
                        'oid': object_id
                    }
                )
            elif not is_schema_diff:
                dep_type = ''
                if show_system_objects is None:
                    show_system_objects = self.blueprint.show_system_objects
                if dep_str[0] in dep_types:
                    # if dep_type is present in the dep_types dictionary,
                    # but it's value is None then it requires special
                    # handling.
                    if dep_types[dep_str[0]] is None:
                        if dep_str[0] == 'i':
                            if show_system_objects:
                                dep_type = 'internal'
                            else:
                                continue
                        elif dep_str[0] == 'p':
                            dep_type = 'pin'
                            type_name = ''
                    else:
                        dep_type = dep_types[dep_str[0]]

                dependency.append(
                    {
                        'type': type_name,
                        'name': ref_name,
                        'field': dep_type,
                        'icon': icon,
                    }
                )

        return dependency
