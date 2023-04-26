##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Rule Node"""

import json
from functools import wraps

from pgadmin.browser.server_groups.servers.databases import schemas
from flask import render_template, make_response, request, jsonify,\
    current_app
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    parse_rule_definition
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.directory_compare import directory_diff,\
    parse_acl


class RuleModule(CollectionNodeModule):
    """
    class RuleModule(CollectionNodeModule):

        A rule collection Node which inherits CollectionNodeModule
        class and define methods:
          get_nodes - To generate collection node.
          script_load - tells when to load js file.
          csssnppets - add css to page
    """
    _NODE_TYPE = 'rule'
    _COLLECTION_LABEL = gettext("Rules")

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None

        super().__init__(*args, **kwargs)

    def backend_supported(self, manager, **kwargs):
        """
        Load this module if tid is view, we will not load it under
        material view
        """
        if super().backend_supported(manager, **kwargs):
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
        return schemas.SchemaModule.node_type

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                self._COLLECTION_CSS,
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

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


# Create blueprint of RuleModule.
blueprint = RuleModule(__name__)


class RuleView(PGChildNodeView, SchemaDiffObjectCompare):
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
    node_label = "Rule"

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
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'children': [{
            'get': 'children'
        }],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'configs': [{'get': 'configs'}]
    })

    # Schema Diff: Keys to ignore while comparing
    keys_to_ignore = ['oid', 'schema', 'definition', 'oid-2']

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
            self.template_path = 'rules/sql'
            self.table_template_path = compile_template_path(
                'tables/sql',
                self.manager.version
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        Fetch all rule properties and render into properties tab
        """

        # fetch schema name by schema id
        SQL = render_template("/".join(
            [self.template_path, self._PROPERTIES_SQL]), tid=tid)
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
            [self.template_path, self._NODES_SQL]), rid=rid)

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(self.not_found_error_msg())

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            tid,
            rset['rows'][0]['name'],
            icon="icon-rule" if
            rset['rows'][0]['is_enable_rule'] == 'D' else "icon-rule-bad"
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
            [self.template_path, self._NODES_SQL]), tid=tid)

        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-rule-bad"
                    if 'is_enable_rule' in row and
                       row['is_enable_rule'] == 'D' else "icon-rule",
                    description=row['comment']
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
        status, data = self._fetch_properties(rid)
        if not status:
            return data

        return ajax_response(
            response=data,
            status=200
        )

    def _fetch_properties(self, rid):
        """
        This function is used to fetch the properties of the specified object
        :param rid:
        :return:
        """
        SQL = render_template("/".join(
            [self.template_path, self._PROPERTIES_SQL]
        ), rid=rid, datlastsysoid=self._DATABASE_LAST_SYSTEM_OID)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        return True, parse_rule_definition(res)

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will create a new rule object
        """
        required_args = [
            'name',
        ]

        data = request.form if request.form else json.loads(
            request.data
        )
        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
        try:
            SQL = render_template("/".join(
                [self.template_path, self._CREATE_SQL]),
                data=data,
                conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Fetch the rule id against rule name to display node
            # in tree browser
            SQL = render_template("/".join(
                [self.template_path, 'rule_id.sql']),
                rule_name=data['name'], conn=self.conn)
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
            request.data
        )
        try:
            SQL, name = self.getSQL(gid, sid, data, tid, rid)
            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            other_node_info = {}
            if 'comment' in data:
                other_node_info['description'] = data['comment']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    rid,
                    tid,
                    name,
                    icon="icon-%s-bad" % self.node_type
                    if 'is_enable_rule' in data and
                       data['is_enable_rule'] == 'D'
                    else "icon-%s" % self.node_type,
                    **other_node_info
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, **kwargs):
        """
        This function will drop a rule object
        """
        rid = kwargs.get('rid', None)
        only_sql = kwargs.get('only_sql', False)

        if rid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [rid]}

        # Below will decide if it's simple drop or drop with cascade call

        cascade = self._check_cascade_operation()

        try:
            for rid in data['ids']:
                # Get name for rule from did
                SQL = render_template("/".join(
                    [self.template_path, self._DELETE_SQL]), rid=rid)
                status, res_data = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res_data)

                if not res_data['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=self.not_found_error_msg()
                    )

                # drop rule
                rset = res_data['rows'][0]
                SQL = render_template("/".join(
                    [self.template_path, self._DELETE_SQL]),
                    rulename=rset['rulename'],
                    relname=rset['relname'],
                    nspname=rset['nspname'],
                    cascade=cascade
                )
                if only_sql:
                    return SQL
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Rule dropped")
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
        if not isinstance(sql, str):
            return sql
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
            [self.template_path, self._PROPERTIES_SQL]), rid=rid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        res_data = parse_rule_definition(res)
        SQL = render_template("/".join(
            [self.template_path, self._CREATE_SQL]),
            data=res_data, display_comments=True,
            add_replace_clause=True,
            conn=self.conn
        )

        return ajax_response(response=SQL)

    def getSQL(self, gid, sid, data, tid, rid):
        """
        This function will generate sql from model data
        """

        if rid is not None:
            SQL = render_template("/".join(
                [self.template_path, self._PROPERTIES_SQL]), rid=rid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(self.not_found_error_msg())
            res_data = parse_rule_definition(res)

            old_data = res_data
            SQL = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            SQL = render_template("/".join(
                [self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn)
        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements.
        :param kwargs
        :return:
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        tid = kwargs.get('tid')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)
        target_schema = kwargs.get('target_schema', None)

        if drop_sql:
            sql = self.delete(gid=gid, sid=sid, did=did,
                              scid=scid, tid=tid,
                              rid=oid, only_sql=True)
        else:
            sql = render_template("/".join(
                [self.template_path, self._PROPERTIES_SQL]), rid=oid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(self.not_found_error_msg())
            res_data = parse_rule_definition(res)

            if data:
                old_data = res_data
                sql = render_template(
                    "/".join([self.template_path, self._UPDATE_SQL]),
                    data=data, o_data=old_data, conn=self.conn
                )
            else:
                RuleView._check_schema_diff(target_schema, res_data)
                sql = render_template("/".join(
                    [self.template_path, self._CREATE_SQL]),
                    data=res_data,
                    display_comments=True,
                    conn=self.conn)

        return sql

    @ staticmethod
    def _check_schema_diff(target_schema, res_data):
        """
        Check for schema diff, if yes then replace source schema with target
        schema.
        diff_schema: schema diff schema
        res_data: response from properties sql.
        """
        if target_schema and 'statements' in res_data:
            # Replace the source schema with the target schema
            res_data['statements'] = \
                res_data['statements'].replace(
                    res_data['schema'], target_schema)
            res_data['schema'] = target_schema

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

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, tid, oid=None):
        """
        This function will fetch the list of all the rules for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :param tid: Table Id
        :return:
        """

        res = {}
        if oid:
            status, data = self._fetch_properties(oid)
            if not status:
                current_app.logger.error(data)
                return False

            res = data
        else:
            SQL = render_template("/".join([self.template_path,
                                            self._NODES_SQL]),
                                  tid=tid, schema_diff=True)
            status, rules = self.conn.execute_2darray(SQL)
            if not status:
                current_app.logger.error(rules)
                return False

            for row in rules['rows']:
                status, data = self._fetch_properties(row['oid'])
                if status:
                    res[row['name']] = data
        return res

    def ddl_compare(self, **kwargs):
        """
        This function returns the DDL/DML statements based on the
        comparison status.

        :param kwargs:
        :return:
        """

        src_params = kwargs.get('source_params')
        tgt_params = kwargs.get('target_params')
        source = kwargs.get('source')
        target = kwargs.get('target')
        comp_status = kwargs.get('comp_status')

        diff = ''
        if comp_status == 'source_only':
            diff = self.get_sql_from_diff(gid=src_params['gid'],
                                          sid=src_params['sid'],
                                          did=src_params['did'],
                                          scid=src_params['scid'],
                                          tid=src_params['tid'],
                                          oid=source['oid'])
        elif comp_status == 'target_only':
            diff = self.get_sql_from_diff(gid=tgt_params['gid'],
                                          sid=tgt_params['sid'],
                                          did=tgt_params['did'],
                                          scid=tgt_params['scid'],
                                          tid=tgt_params['tid'],
                                          oid=target['oid'],
                                          drop_sql=True)
        elif comp_status == 'different':
            diff_dict = directory_diff(
                source, target,
                ignore_keys=self.keys_to_ignore, difference={}
            )
            parse_acl(source, target, diff_dict)

            diff = self.get_sql_from_diff(gid=tgt_params['gid'],
                                          sid=tgt_params['sid'],
                                          did=tgt_params['did'],
                                          scid=tgt_params['scid'],
                                          tid=tgt_params['tid'],
                                          oid=target['oid'],
                                          data=diff_dict)

        return diff


SchemaDiffRegistry(blueprint.node_type, RuleView, 'table')
RuleView.register_node_view(blueprint)
