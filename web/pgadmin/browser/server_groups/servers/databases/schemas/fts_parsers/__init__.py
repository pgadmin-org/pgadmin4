##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of FTS Parser node"""

from functools import wraps

import simplejson as json
from flask import render_template, request, jsonify, current_app
from flask_babelex import gettext as _

from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases import DatabaseModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class FtsParserModule(SchemaChildModule):
    """
     class FtsParserModule(SchemaChildModule)

        A module class for FTS Parser node derived from SchemaChildModule.

    Methods:
    -------
    * get_nodes(gid, sid, did, scid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for FTS Parser, when any of the schema node is
        initialized.
    """
    _NODE_TYPE = 'fts_parser'
    _COLLECTION_LABEL = _('FTS Parsers')

    def __init__(self, *args, **kwargs):
        super(FtsParserModule, self).__init__(*args, **kwargs)
        self.min_gpdbver = 1000000000

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def node_inode(self):
        """
        Override the property to make the node as leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for fts template, when any of the schema node is
        initialized.
        """
        return DatabaseModule.node_type


blueprint = FtsParserModule(__name__)


class FtsParserView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class FtsParserView(PGChildNodeView)

        A view class for FTS Parser node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view
        like create/update/delete FTS Parser, showing properties of node,
        showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the FtsParserView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the  nodes within that collection.

    * nodes()
      - This function will used to create all the child node within that
        collection.
      - Here it will create all the FTS Parser nodes.

    * properties(gid, sid, did, scid, pid)
      - This function will show the properties of the selected FTS Parser node

    * create(gid, sid, did, scid)
      - This function will create the new FTS Parser object

    * update(gid, sid, did, scid, pid)
      - This function will update the data for the selected FTS Parser node

    * delete(self, gid, sid, did, scid, pid):
      - This function will drop the FTS Parser object

    * msql(gid, sid, did, scid, pid)
      - This function is used to return modified SQL for
        selected FTS Parser node

    * get_sql(data, pid)
      - This function will generate sql from model data

    * get_start(self, gid, sid, did, scid, pid)
      - This function will fetch start functions list for ftp parser

    * get_token(self, gid, sid, did, scid, pid)
      - This function will fetch token functions list for ftp parser

    * get_end(self, gid, sid, did, scid, pid)
      - This function will fetch end functions list for ftp parser

    * get_lextype(self, gid, sid, did, scid, pid)
      - This function will fetch lextype functions list for ftp parser

    * get_headline(self, gid, sid, did, scid, pid)
      - This function will fetch headline functions list for ftp parser

    * sql(gid, sid, did, scid, pid):
      - This function will generate sql to show it in sql pane for the selected
        FTS Parser node.

    * get_type():
      - This function will fetch all the types for source and
        target types select control.

    * dependents(gid, sid, did, scid, pid):
      - This function get the dependents and return ajax response for
        Fts Parser node.

    * dependencies(self, gid, sid, did, scid, pid):
      - This function get the dependencies and return ajax response for
        FTS Parser node.

    * compare(**kwargs):
      - This function will compare the fts parser nodes from two
        different schemas.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'pid'}
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
        'start_functions': [{'get': 'start_functions'},
                            {'get': 'start_functions'}],
        'token_functions': [{'get': 'token_functions'},
                            {'get': 'token_functions'}],
        'end_functions': [{'get': 'end_functions'}, {'get': 'end_functions'}],
        'lextype_functions': [{'get': 'lextype_functions'},
                              {'get': 'lextype_functions'}],
        'headline_functions': [{'get': 'headline_functions'},
                               {'get': 'headline_functions'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'schema']

    def _init_(self, **kwargs):
        """
        Method is used to initialize the FtsParserView and it's base view.

        Args:
            *args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None
        self.manager = None
        super(FtsParserView, self).__init__(**kwargs)

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.datlastsysoid = \
                self.manager.db_info[kwargs['did']]['datlastsysoid'] \
                if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0
            # Set the template path for the SQL scripts
            self.template_path = 'fts_parsers/sql/#{0}#'.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        res = []
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            scid=scid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-fts_parser"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, pid):
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            pid=pid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(_("Could not find the FTS Parser node."))

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    row['schema'],
                    row['name'],
                    icon="icon-fts_parser"
                ),
                status=200
            )

    @check_precondition
    def properties(self, gid, sid, did, scid, pid):
        """

        :param gid:
        :param sid:
        :param did:
        :param scid:
        :param pid:
        :return:
        """
        status, res = self._fetch_properties(scid, pid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, pid):
        """
        This function is used to fetch the properties of specified object.

        :param scid:
        :param pid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid,
            pid=pid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                _("Could not find the FTS Parser node in the database node."))

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid)
        return True, res['rows'][0]

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the fts_parser object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """

        # Mandatory fields to create a new fts parser
        required_args = [
            'prsstart',
            'prstoken',
            'prsend',
            'prslextype',
            'schema',
            'name'
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
        # Fetch schema name from schema oid
        sql = render_template(
            "/".join([self.template_path, self._SCHEMA_SQL]),
            data=data,
            conn=self.conn,
        )

        status, schema = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=schema)

        # replace schema oid with schema name before passing to create.sql
        # to generate proper sql query
        new_data = data.copy()
        new_data['schema'] = schema
        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            data=new_data,
            conn=self.conn,
        )
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # we need fts_parser id to to add object in tree at browser,
        # below sql will give the same
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            name=data['name'],
            scid=data['schema'] if 'schema' in data else scid
        )
        status, pid = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=pid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                pid,
                data['schema'] if 'schema' in data else scid,
                data['name'],
                icon="icon-fts_parser"
            )
        )

    @check_precondition
    def update(self, gid, sid, did, scid, pid):
        """
        This function will update text search parser object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts parser id
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        # Fetch sql query to update fts parser
        sql, name = self.get_sql(gid, sid, did, scid, data, pid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if pid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                pid=pid,
                scid=data['schema'] if 'schema' in data else scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    _("Could not find the FTS Parser node to update.")
                )

        return jsonify(
            node=self.blueprint.generate_browser_node(
                pid,
                data['schema'] if 'schema' in data else scid,
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, pid=None, only_sql=False):
        """
        This function will drop the fts_parser object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts tempate id
        :param only_sql: Return only sql if True
        """
        if pid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [pid]}

        # Below will decide if it's simple drop or drop with cascade call
        cascade = self._check_cascade_operation()

        try:
            for pid in data['ids']:
                # Get name for Parser from pid
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    pid=pid
                )
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)
                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=_(
                            'Error: Object not found.'
                        ),
                        info=_(
                            'The specified FTS parser could not be found.\n'
                        )
                    )

                # Drop fts Parser
                result = res['rows'][0]
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    name=result['name'],
                    schema=result['schema'],
                    cascade=cascade
                )

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("FTS Parser dropped")
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, pid=None):
        """
        This function returns modified SQL
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts tempate id
        """
        data = {}
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        # Fetch sql query for modified data
        SQL, name = self.get_sql(gid, sid, did, scid, data, pid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL
        if SQL == '':
            SQL = "--modified SQL"

        return make_json_response(
            data=SQL,
            status=200
        )

    @staticmethod
    def _replace_schema_oid_with_name(new_data, new_schema):
        """
        This function is used to replace schema oid with schema name.
        :param new_data:
        :param new_schema:
        :return:
        """
        if 'schema' in new_data:
            new_data['schema'] = new_schema

    def _get_sql_for_create(self, data, schema):
        """
        This function is used to get the create sql.
        :param data:
        :param schema:
        :return:
        """
        new_data = data.copy()
        new_data['schema'] = schema

        if (
            'prsstart' in new_data and
            'prstoken' in new_data and
            'prsend' in new_data and
            'prslextype' in new_data and
            'name' in new_data and
            'schema' in new_data
        ):
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=new_data,
                conn=self.conn
            )
        else:
            sql = "-- definition incomplete"
        return sql

    def get_sql(self, gid, sid, did, scid, data, pid=None):
        """
        This function will return SQL for model data
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts tempate id
        """

        # Fetch sql for update
        if pid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                pid=pid,
                scid=scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            elif len(res['rows']) == 0:
                return gone(_("Could not find the FTS Parser node."))

            old_data = res['rows'][0]
            if 'schema' not in data:
                data['schema'] = old_data['schema']

            # If user has changed the schema then fetch new schema directly
            # using its oid otherwise fetch old schema name with parser oid
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=data)

            status, new_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=new_schema)

            # Replace schema oid with schema name
            new_data = data.copy()
            FtsParserView._replace_schema_oid_with_name(new_data, new_schema)

            # Fetch old schema name using old schema oid
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=old_data
            )

            status, old_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=old_schema)

            # Replace old schema oid with old schema name
            old_data['schema'] = old_schema

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=new_data,
                o_data=old_data
            )
            # Fetch sql query for modified data
            if 'name' in data:
                return sql.strip('\n'), data['name']
            return sql.strip('\n'), old_data['name']
        else:
            # Fetch schema name from schema oid
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=data
            )

            status, schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=schema)

            sql = self._get_sql_for_create(data, schema)
        return sql.strip('\n'), data['name']

    @check_precondition
    def start_functions(self, gid, sid, did, scid):
        """
        This function will return start functions list for fts Parser
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]),
                              start=True)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # Empty set is added before actual list as initially it will be visible
        # at start select control while creating a new fts parser
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def token_functions(self, gid, sid, did, scid):
        """
        This function will return token functions list for fts Parser
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]),
                              token=True)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # Empty set is added before actual list as initially it will be visible
        # at token select control while creating a new fts parser
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def end_functions(self, gid, sid, did, scid):
        """
        This function will return end functions list for fts Parser
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]),
                              end=True)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # Empty set is added before actual list as initially it will be visible
        # at end select control while creating a new fts parser
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def lextype_functions(self, gid, sid, did, scid):
        """
        This function will return lextype functions list for fts Parser
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]),
                              lextype=True)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # Empty set is added before actual list as initially it will be visible
        # at lextype select control while creating a new fts parser
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def headline_functions(self, gid, sid, did, scid):
        """
        This function will return headline functions list for fts Parser
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]),
                              headline=True)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # Empty set is added before actual list as initially it will be visible
        # at headline select control while creating a new fts parser
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, pid, **kwargs):
        """
        This function will reverse generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts tempate id
        :param json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        try:
            sql = render_template(
                "/".join([self.template_path, 'sql.sql']),
                pid=pid,
                scid=scid,
                conn=self.conn
            )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(
                    _(
                        "Could not generate reversed engineered query for the "
                        "FTS Parser.\n{0}"
                    ).format(res)
                )

            if res is None:
                return gone(
                    _(
                        "Could not generate reversed engineered query for "
                        "FTS Parser node."
                    )
                )

            # Used for schema diff tool
            if target_schema:
                data = {'schema': scid}
                # Fetch schema name from schema oid
                sql = render_template("/".join([self.template_path,
                                                'schema.sql']),
                                      data=data,
                                      conn=self.conn,
                                      )

                status, schema = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=schema)

                res = res.replace(schema, target_schema)

            if not json_resp:
                return res

            return ajax_response(response=res)

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, pid):
        """
        This function get the dependents and return ajax response
        for the FTS Parser node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pid: FTS Parser ID
        """
        dependents_result = self.get_dependents(self.conn, pid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, pid):
        """
        This function get the dependencies and return ajax response
        for the FTS Parser node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            pid: FTS Tempalte ID
        """
        dependencies_result = self.get_dependencies(self.conn, pid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the fts parsers for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in rset['rows']:
            status, data = self._fetch_properties(scid, row['oid'])
            if status:
                res[row['name']] = data

        return res

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
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)
        target_schema = kwargs.get('target_schema', None)

        if data:
            sql, name = self.get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                     data=data, pid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, pid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, pid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, pid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, FtsParserView)
FtsParserView.register_node_view(blueprint)
