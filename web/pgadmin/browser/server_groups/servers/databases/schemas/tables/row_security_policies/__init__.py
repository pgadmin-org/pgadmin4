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
from flask import render_template, request, jsonify
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

    NODE_TYPE = 'row_security_policy'
    COLLECTION_LABEL = gettext('RLS Policies')

    def __init__(self, *args, **kwargs):
        super(RowSecurityModule, self).__init__(*args, **kwargs)
        self.min_gpdbver = 1000000000
        self.min_ver = 90500
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid, **kwargs):
        """
        Generate the collection node
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: Schema ID
        """
        yield self.generate_browser_collection_node(did)

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
        return databases.DatabaseModule.NODE_TYPE

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

    * properties(gid, sid, did, rg_id)
      - This function will show the properties of the selected policy node

    * create(gid, sid, did, rg_id)
      - This function will create the new policy object

    * update(gid, sid, did, rg_id)
      - This function will update the data for the selected policy node

    * delete(self, gid, sid, rg_id):
      - This function will drop the policy object

    * msql(gid, sid, did, rg_id)
      - This function is used to return modified sql for the selected
      policy node

    * get_sql(data, rg_id)
      - This function will generate sql from model data

    * sql(gid, sid, did, rg_id):
      - This function will generate sql to show in sql pane for the selected
      policy node.
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
            [self.template_path, 'properties.sql']), tid=tid)
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
            [self.template_path, 'nodes.sql']), plid=plid)

        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(gettext("""Could not find the policy in the table."""))

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
            [self.template_path, 'nodes.sql']), tid=tid)

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
        status, data = self._fetch_properties(plid)
        if not status:
            return data

        return ajax_response(
            response=data,
            status=200
        )

    def _fetch_properties(self, plid):
        """
        This function is used to fetch the properties of the specified object
        :param plid:
        :return:
        """
        sql = render_template("/".join(
            [self.template_path, 'properties.sql']
        ), plid=plid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("""Could not find the policy in the table."""))

        data = dict(res['rows'][0])

        res = data

        return True, res

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
            sql = render_template("/".join([self.template_path, 'create.sql']),
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
            sql, name = row_security_policies_utils.get_sql(self.conn, data,
                                                            did,
                                                            tid, plid,
                                                            self.datlastsysoid,
                                                            self.schema,
                                                            self.table)
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

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, plid=None):
        """
        This function will drop the policy object
        :param plid: policy id
        :param did: database id
        :param sid: server id
        :param gid: group id
        :param tid: table id
        :param scid: Schema ID
        :return:
        """
        # Below will deplide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        if plid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [plid]}

        for plid in data['ids']:
            try:
                # Get name for policy from plid
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
                        info=gettext(
                            'The specified policy object could not be found.\n'
                        )
                    )

                # drop policy
                result = res['rows'][0]
                result['schema'] = self.schema
                result['table'] = self.table
                sql = render_template("/".join([self.template_path,
                                                'delete.sql']),
                                      policy_name=result['name'],
                                      cascade=cascade,
                                      result=result
                                      )
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

        sql, name = row_security_policies_utils.get_sql(self.conn, data, did,
                                                        tid, plid,
                                                        self.datlastsysoid,
                                                        self.schema,
                                                        self.table)
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
        """
        sql = render_template("/".join(
            [self.template_path, 'properties.sql']), plid=plid)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the policy in the table."""))
        res = dict(res['rows'][0])
        res_data = res
        res_data['schema'] = self.schema
        res_data['table'] = self.table

        sql = render_template("/".join(
            [self.template_path, 'create.sql']),
            data=res_data, display_comments=True)

        return ajax_response(response=sql)

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


RowSecurityView.register_node_view(blueprint)
