##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Rule Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases.schemas as schemas
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    parse_rule_definition
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone


class RuleModule(CollectionNodeModule):
    """
    class RuleModule(CollectionNodeModule):

        A rule collection Node which inherits CollectionNodeModule
        class and define methods:
          get_nodes - To generate collection node.
          script_load - tells when to load js file.
          csssnppets - add css to page
    """
    NODE_TYPE = 'rule'
    COLLECTION_LABEL = gettext("Rules")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None

        super(RuleModule, self).__init__(*args, **kwargs)

    def BackendSupported(self, manager, **kwargs):
        """
        Load this module if tid is view, we will not load it under
        material view
        """
        if super(RuleModule, self).BackendSupported(manager, **kwargs):
            conn = manager.connection(did=kwargs['did'])

            if 'vid' not in kwargs:
                return True

            self.template_path = 'rules/sql'
            SQL = render_template("/".join(
                [self.template_path, 'backend_support.sql']
            ), vid=kwargs['vid'])
            status, res = conn.execute_scalar(SQL)
            # check if any errors
            if not status:
                return internal_server_error(errormsg=res)
            # Check tid is view not material view
            # then true, othewise false
            if res is True:
                return res
            else:
                return res

    def get_nodes(self, gid, sid, did, scid, **kwargs):
        """
        Generate the collection node
        """
        assert ('tid' in kwargs or 'vid' in kwargs)
        yield self.generate_browser_collection_node(
            kwargs['tid'] if 'tid' in kwargs else kwargs['vid']
        )

    @property
    def node_inode(self):
        """
        If a node has children return True otherwise False
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for rule, when any of the database nodes are
        initialized.
        """
        return schemas.SchemaModule.NODE_TYPE

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "browser/css/collection.css",
                node_type=self.node_type,
                _=gettext
            ),
            render_template(
                "rules/css/rule.css",
                node_type=self.node_type,
                _=gettext
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


# Create blueprint of RuleModule.
blueprint = RuleModule(__name__)


class RuleView(PGChildNodeView):
    """
    This is a class for rule node which inherits the
    properties and methods from PGChildNodeView class and define
    various methods to list, create, update and delete rule.

    Variables:
    ---------
    * node_type - tells which type of node it is
    * parent_ids - id with its type and name of parent nodes
    * ids - id with type and name of extension module being used.
    * operations - function routes mappings defined.
    """
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [
        {'type': 'int', 'id': 'rid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'children': [{
            'get': 'children'
        }],
        'delete': [{'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'configs': [{'get': 'configs'}]
    })

    def module_js(self):
        """
        This property defines whether Javascript exists for this node.
        """
        return make_response(
            render_template(
                "rules/js/rules.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    def check_precondition(f):
        """
        This function will behave as a decorator which will check the
        database connection before running a view. It will also attach
        manager, conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(
                PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0
            self.template_path = 'rules/sql'
            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        Fetch all rule properties and render into properties tab
        """

        # fetch schema name by schema id
        SQL = render_template("/".join(
            [self.template_path, 'properties.sql']), tid=tid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, tid, rid):
        """
        return single node
        """
        SQL = render_template("/".join(
            [self.template_path, 'nodes.sql']), rid=rid)

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(gettext("""Could not find the rule in the table."""))

        res = self.blueprint.generate_browser_node(
                rset['rows'][0]['oid'],
                tid,
                rset['rows'][0]['name'],
                icon="icon-rule"
        )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid):
        """
        List all the rules under the Rules Collection node
        """
        res = []
        SQL = render_template("/".join(
            [self.template_path, 'nodes.sql']), tid=tid)

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-rule"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, rid):
        """
        Fetch the properties of an individual rule and render in properties tab

        """
        SQL = render_template("/".join(
            [self.template_path, 'properties.sql']
        ), rid=rid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the rule in the table."""))

        return ajax_response(
            response=parse_rule_definition(res),
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will create a new rule object
        """
        required_args = [
            'name',
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Couldn't find the required parameter (%s)." % arg
                    )
                )
        try:
            SQL = render_template("/".join(
                [self.template_path, 'create.sql']), data=data)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Fetch the rule id against rule name to display node
            # in tree browser
            SQL = render_template("/".join(
                [self.template_path, 'rule_id.sql']), rule_name=data['name'])
            status, rule_id = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=rule_id)
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rule_id,
                    tid,
                    data['name'],
                    icon="icon-rule"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, rid):
        """
        This function will update a rule object
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        try:
            SQL, name = self.getSQL(gid, sid, data, tid, rid)
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rid,
                    tid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, rid):
        """
        This function will drop a rule object
        """
        # Below will decide if it's simple drop or drop with cascade call
        cascade = True if self.cmd == 'delete' else False

        try:
            # Get name for rule from did
            SQL = render_template("/".join(
                [self.template_path, 'delete.sql']), rid=rid)
            status, res_data = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res_data)

            if not res_data['rows']:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified rule could not be found.\n'
                    )
                )

            # drop rule
            rset = res_data['rows'][0]
            SQL = render_template("/".join(
                [self.template_path, 'delete.sql']),
                rulename=rset['rulename'],
                relname=rset['relname'],
                nspname=rset['nspname'],
                cascade=cascade
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Rule dropped"),
                data={
                    'id': tid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, rid=None):
        """
        This function returns modified SQL
        """
        data = request.args
        sql, name = self.getSQL(gid, sid, data, tid, rid)
        sql = sql.strip('\n').strip(' ')

        if sql == '':
            sql = "--modified SQL"
        return make_json_response(
            data=sql,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, rid):
        """
        This function will generate sql to render into the sql panel
        """
        SQL = render_template("/".join(
            [self.template_path, 'properties.sql']), rid=rid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        res_data = parse_rule_definition(res)
        SQL = render_template("/".join(
            [self.template_path, 'create.sql']),
            data=res_data, display_comments=True)

        return ajax_response(response=SQL)

    def getSQL(self, gid, sid, data, tid, rid):
        """
        This function will generate sql from model data
        """

        if rid is not None:
            SQL = render_template("/".join(
                [self.template_path, 'properties.sql']), rid=rid)
            status, res = self.conn.execute_dict(SQL)
            res_data = parse_rule_definition(res)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res_data
            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data
            )
        else:
            SQL = render_template("/".join(
                [self.template_path, 'create.sql']), data=data)
        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, rid):
        """
        This function gets the dependents and returns an ajax response
        for the rule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            tid: View ID
            rid: Rule ID
        """
        dependents_result = self.get_dependents(self.conn, rid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, rid):
        """
        This function gets the dependencies and returns sn ajax response
        for the rule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            tid: View ID
            rid: Rule ID
        """
        dependencies_result = self.get_dependencies(self.conn, rid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


RuleView.register_node_view(blueprint)
