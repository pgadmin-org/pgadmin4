##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements policy Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, request, jsonify, current_app
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.tables. \
    row_security_policies import utils as row_security_policies_utils
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.directory_compare import directory_diff


class RowSecurityModule(CollectionNodeModule):
    """
     class RowSecurityModule(CollectionNodeModule)

        A module class for policy node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the RowSecurityModule
      and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overplidden from its base class to
        make the node as leaf node.

    * script_load()
      - Load the module script for policy, when any of the database node is
        initialized.
    """

    _NODE_TYPE = 'row_security_policy'
    _COLLECTION_LABEL = gettext('RLS Policies')

    def __init__(self, *args, **kwargs):
        super(RowSecurityModule, self).__init__(*args, **kwargs)
        self.min_gpdbver = 1000000000
        self.min_ver = 90500
        self.max_ver = None

    def get_nodes(self, **kwargs):
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
        Overplide the property to make the node as leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for policy, when any of the database node is
        initialized.
        """
        return databases.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = RowSecurityModule(__name__)


class RowSecurityView(PGChildNodeView):
    """
    class RowSecurityView(PGChildNodeView)

        A view class for policy node derived from PGChildNodeView.
        This class is
        responsible for all the stuff related to view like
        create/update/delete policy, showing properties of policy node,
        showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the RowSecurityView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the policy nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the policy nodes.

    * properties(gid, sid, did, plid)
      - This function will show the properties of the selected policy node

    * create(gid, sid, did, plid)
      - This function will create the new policy object

    * update(gid, sid, did, plid)
      - This function will update the data for the selected policy node

    * delete(self, gid, sid, plid):
      - This function will drop the policy object

    * msql(gid, sid, did, plid)
      - This function is used to return modified sql for the selected
      policy node


    * sql(gid, sid, did, plid):
      - This function will generate sql to show in sql pane for the selected
      policy node.
    """

    node_type = blueprint.node_type
    node_label = "RLS Policy"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [
        {'type': 'int', 'id': 'plid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super(RowSecurityView, self).__init__(**kwargs)

    def check_precondition(f):
        """
        This function will behave as a decorator which will check the
        database connection before running view. It will also attach
        manager, conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(
                PG_DEFAULT_DRIVER
            ).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            schema, table = row_security_policies_utils.get_parent(self.conn,
                                                                   kwargs[
                                                                       'tid'])
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0
            self.schema = schema
            self.table = table
            # Set template path for the sql scripts
            self.table_template_path = compile_template_path(
                'tables/sql',
                self.manager.server_type,
                self.manager.version
            )
            self.template_path = 'row_security_policies/sql/#{0}#'.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        Fetch all policy properties and render into properties tab
        """

        # fetch schema name by schema id
        sql = render_template("/".join(
            [self.template_path, self._PROPERTIES_SQL]), schema=self.schema,
            tid=tid)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, tid, plid):
        """
        return single node
        """
        sql = render_template("/".join(
            [self.template_path, self._NODES_SQL]), plid=plid)

        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(self.not_found_error_msg())

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            tid,
            rset['rows'][0]['name'],
            icon="icon-row_security_policy"
        )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid):
        """
        List all the policies under the policies Collection node
        """
        res = []
        sql = render_template("/".join(
            [self.template_path, self._NODES_SQL]), tid=tid)

        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-row_security_policy"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, plid):
        """
        Fetch the properties of an individual policy and render in
        properties tab

        """
        status, data = self._fetch_properties(did, scid, tid, plid)
        if not status:
            return data

        return ajax_response(
            response=data,
            status=200
        )

    def _fetch_properties(self, did, scid, tid, plid):
        """
        This function is used to fetch the properties of the specified object
        :param plid:
        :return:
        """
        sql = render_template("/".join(
            [self.template_path, self._PROPERTIES_SQL]
        ), plid=plid, scid=scid, policy_table_id=tid,
            datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        data = dict(res['rows'][0])

        # Remove opening and closing bracket as we already have in jinja
        # template.
        if 'using' in data and data['using'] is not None and \
                data['using'].startswith('(') and data['using'].endswith(')'):
            data['using'] = data['using'][1:-1]
        if 'withcheck' in data and data['withcheck'] is not None and \
            data['withcheck'].startswith('(') and \
                data['withcheck'].endswith(')'):
            data['withcheck'] = data['withcheck'][1:-1]

        return True, data

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will creates new the policy object
        :param did: database id
        :param sid: server id
        :param gid: group id
        :param tid: table id
        :param scid: Schema ID
        :return:
        """

        required_args = [
            'name',
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        data['schema'] = self.schema
        data['table'] = self.table
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
            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data,
                                  conn=self.conn,
                                  )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            # we need oid to to add object in tree at browser
            sql = render_template(
                "/".join([self.template_path, 'get_position.sql']),
                tid=tid, data=data
            )
            status, plid = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=tid)
            return jsonify(
                node=self.blueprint.generate_browser_node(
                    plid,
                    tid,
                    data['name'],
                    icon="icon-row_security_policy"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, scid, did, tid, plid=None):
        """
        This function will update policy object
        :param plid: policy id
        :param did: database id
        :param sid: server id
        :param gid: group id
        :param tid: table id
        :param scid: Schema ID
        :return:
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        try:
            sql, name = row_security_policies_utils.get_sql(
                self.conn, data=data, scid=scid, plid=plid,
                policy_table_id=tid,
                schema=self.schema, table=self.table)

            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    plid,
                    tid,
                    name,
                    icon="icon-row_security_policy"
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def get_policy_data(plid):
        """
        return policy data
        :param plid:
        :return: policy id
        """
        if plid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [plid]}

        return data

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, **kwargs):
        """
        This function will drop the policy object
        :param plid: policy id
        :param did: database id
        :param sid: server id
        :param gid: group id
        :param tid: table id
        :param scid: Schema ID
        :param kwargs
        :return:
        """
        plid = kwargs.get('plid', None)
        only_sql = kwargs.get('only_sql', False)

        # Below will deplide if it's simple drop or drop with cascade call
        cascade = self._check_cascade_operation()

        data = self.get_policy_data(plid)

        for plid in data['ids']:
            try:
                # Get name of policy using plid
                sql = render_template("/".join([self.template_path,
                                                'get_policy_name.sql']),
                                      plid=plid)
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                if not res['rows']:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=self.not_found_error_msg()
                    )

                # drop policy
                result = res['rows'][0]
                result['schema'] = self.schema
                result['table'] = self.table
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      policy_name=result['name'],
                                      cascade=cascade,
                                      result=result
                                      )
                if only_sql:
                    return sql
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            except Exception as e:
                return internal_server_error(errormsg=str(e))

        return make_json_response(
            success=1,
            info=gettext("policy dropped")
        )

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, plid=None):
        """
        This function returns modified sql
        """
        data = dict(request.args)

        sql, name = row_security_policies_utils.get_sql(
            self.conn, data=data, scid=scid, plid=plid, policy_table_id=tid,
            schema=self.schema, table=self.table)
        if not isinstance(sql, str):
            return sql
        sql = sql.strip('\n').strip(' ')

        if sql == '':
            sql = "--modified sql"
        return make_json_response(
            data=sql,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, plid):
        """
        This function will generate sql to render into the sql panel

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           plid: policy ID
        """

        SQL = row_security_policies_utils.get_reverse_engineered_sql(
            self.conn, schema=self.schema, table=self.table, scid=scid,
            plid=plid, policy_table_id=tid, datlastsysoid=self.datlastsysoid)

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, plid):
        """
        This function gets the dependents and returns an ajax response
        for the policy node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            plid: policy ID
            tid: table id
            scid: Schema ID
        """
        dependents_result = self.get_dependents(self.conn, plid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, plid):
        """
        This function gets the dependencies and returns an ajax response
        for the policy node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            plid: policy ID
            tid: table id
            scid: Schema ID
        """
        dependencies_result = self.get_dependencies(self.conn, plid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements.
        :param kwargs
        :return:
        """
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        scid = kwargs.get('scid')
        tid = kwargs.get('tid')
        oid = kwargs.get('plid')
        data = kwargs.get('data', None)
        drop_req = kwargs.get('drop_req', False)
        target_schema = kwargs.get('target_schema', None)

        if data:
            data['schema'] = self.schema
            data['table'] = self.table
            sql, name = row_security_policies_utils.get_sql(
                self.conn, data=data, scid=scid, plid=oid,
                schema=self.schema, table=self.table)

            sql = sql.strip('\n').strip(' ')

        else:
            schema = self.schema
            if target_schema:
                schema = target_schema

            sql = row_security_policies_utils.get_reverse_engineered_sql(
                self.conn, schema=schema, table=self.table, scid=scid,
                plid=oid, datlastsysoid=self.datlastsysoid, with_header=False)

        drop_sql = ''
        if drop_req:
            drop_sql = '\n' + self.delete(gid=1, sid=sid, did=did,
                                          scid=scid, tid=tid,
                                          plid=oid, only_sql=True)
        if drop_sql != '':
            sql = drop_sql + '\n\n' + sql
        return sql

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, tid, oid=None):
        """
        This function will fetch the list of all the policies for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :param oid: Policy Id
        :return:
        """

        res = dict()

        if not oid:
            SQL = render_template("/".join([self.template_path,
                                            self._NODES_SQL]), tid=tid)
            status, policies = self.conn.execute_2darray(SQL)
            if not status:
                current_app.logger.error(policies)
                return False
            for row in policies['rows']:
                status, data = self._fetch_properties(did, scid, tid,
                                                      row['oid'])
                if status:
                    res[row['name']] = data
        else:
            status, data = self._fetch_properties(did, scid, tid, oid)
            if not status:
                current_app.logger.error(data)
                return False
            res = data

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
        target_schema = kwargs.get('target_schema')
        comp_status = kwargs.get('comp_status')

        diff = ''
        if comp_status == 'source_only':
            diff = self.get_sql_from_diff(gid=src_params['gid'],
                                          sid=src_params['sid'],
                                          did=src_params['did'],
                                          scid=src_params['scid'],
                                          tid=src_params['tid'],
                                          plid=source['oid'],
                                          target_schema=target_schema)
        elif comp_status == 'target_only':
            diff = self.delete(gid=1,
                               sid=tgt_params['sid'],
                               did=tgt_params['did'],
                               scid=tgt_params['scid'],
                               tid=tgt_params['tid'],
                               plid=target['oid'],
                               only_sql=True)
        elif comp_status == 'different':
            diff_dict = directory_diff(
                source, target, difference={}
            )
            if 'event' in diff_dict or 'type' in diff_dict:
                delete_sql = self.get_sql_from_diff(gid=1,
                                                    sid=tgt_params['sid'],
                                                    did=tgt_params['did'],
                                                    scid=tgt_params['scid'],
                                                    tid=tgt_params['tid'],
                                                    plid=target['oid'],
                                                    drop_req=True)

                diff = self.get_sql_from_diff(gid=src_params['gid'],
                                              sid=src_params['sid'],
                                              did=src_params['did'],
                                              scid=src_params['scid'],
                                              tid=src_params['tid'],
                                              plid=source['oid'],
                                              target_schema=target_schema)
                return delete_sql + diff

            diff = self.get_sql_from_diff(gid=tgt_params['gid'],
                                          sid=tgt_params['sid'],
                                          did=tgt_params['did'],
                                          scid=tgt_params['scid'],
                                          tid=tgt_params['tid'],
                                          plid=target['oid'],
                                          data=diff_dict)
        return '\n' + diff


SchemaDiffRegistry(blueprint.node_type, RowSecurityView, 'table')
RowSecurityView.register_node_view(blueprint)
