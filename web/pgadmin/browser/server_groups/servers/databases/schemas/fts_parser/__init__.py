##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of FTS Parser node"""

import simplejson as json
from functools import wraps

from flask import render_template, request, jsonify, current_app
from flask_babel import gettext as _
from pgadmin.browser.server_groups.servers.databases import DatabaseModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


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
    NODE_TYPE = 'fts_parser'
    COLLECTION_LABEL = _('FTS Parsers')

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
        return DatabaseModule.NODE_TYPE


blueprint = FtsParserModule(__name__)


class FtsParserView(PGChildNodeView):
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

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

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
        'start_functions': [{'get': 'start_functions'}, {'get': 'start_functions'}],
        'token_functions': [{'get': 'token_functions'}, {'get': 'token_functions'}],
        'end_functions': [{'get': 'end_functions'}, {'get': 'end_functions'}],
        'lextype_functions': [{'get': 'lextype_functions'}, {'get': 'lextype_functions'}],
        'headline_functions': [{'get': 'headline_functions'}, {'get': 'headline_functions'}],
    })

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
            # Set the template path for the SQL scripts
            self.template_path = 'fts_parser/sql/9.1_plus'

            return f(*args, **kwargs)
        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
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
            "/".join([self.template_path, 'nodes.sql']),
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
            "/".join([self.template_path, 'nodes.sql']),
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
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            scid=scid,
            pid=pid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(_("""
                Could not find the FTS Parser node in the database node.
                """))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

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
                        "Could not find the required parameter (%s)." % arg
                    )
                )
        # Fetch schema name from schema oid
        sql = render_template(
            "/".join([self.template_path, 'schema.sql']),
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
            "/".join([self.template_path, 'create.sql']),
            data=new_data,
            conn=self.conn,
        )
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # we need fts_parser id to to add object in tree at browser,
        # below sql will give the same
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
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
        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if pid is not None:
            sql = render_template(
                "/".join([self.template_path, 'properties.sql']),
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
    def delete(self, gid, sid, did, scid, pid):
        """
        This function will drop the fts_parser object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts tempate id
        """
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Get name for Parser from pid
            sql = render_template(
                "/".join([self.template_path, 'delete.sql']),
                pid=pid
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if not res['rows']:
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
                "/".join([self.template_path, 'delete.sql']),
                name=result['name'],
                schema=result['schema'],
                cascade=cascade
            )

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("FTS Parser dropped"),
                data={
                    'id': pid,
                    'sid': sid,
                    'gid': gid,
                    'did': did,
                    'scid': scid
                }
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
        data = request.args
        # Fetch sql query for modified data
        try:
            # Fetch sql query for modified data
            SQL, name = self.get_sql(gid, sid, did, scid, data, pid)
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

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
                "/".join([self.template_path, 'properties.sql']),
                pid=pid,
                scid=scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(_("Could not find the FTS Parser node."))

            old_data = res['rows'][0]

            # If user has changed the schema then fetch new schema directly
            # using its oid otherwise fetch old schema name with parser oid
            sql = render_template(
                "/".join([self.template_path, 'schema.sql']),
                data=data)

            status, new_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=new_schema)

            # Replace schema oid with schema name
            new_data = data.copy()
            if 'schema' in new_data:
                new_data['schema'] = new_schema

            # Fetch old schema name using old schema oid
            sql = render_template(
                "/".join([self.template_path, 'schema.sql']),
                data=old_data
            )

            status, old_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=old_schema)

            # Replace old schema oid with old schema name
            old_data['schema'] = old_schema

            sql = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=new_data,
                o_data=old_data
            )
            # Fetch sql query for modified data
            return str(sql.strip('\n')), data['name'] if 'name' in data else old_data['name']
        else:
            # Fetch schema name from schema oid
            sql = render_template(
                "/".join([self.template_path, 'schema.sql']),
                data=data
            )

            status, schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=schema)

            # Replace schema oid with schema name
            new_data = data.copy()
            new_data['schema'] = schema

            if 'prsstart' in new_data and \
                            'prstoken' in new_data and \
                            'prsend' in new_data and \
                            'prslextype' in new_data and \
                            'name' in new_data and \
                            'schema' in new_data:
                sql = render_template(
                    "/".join([self.template_path, 'create.sql']),
                    data=new_data,
                    conn=self.conn
                )
            else:
                sql = "-- incomplete definition"
        return str(sql.strip('\n')), data['name']

    @check_precondition
    def start_functions(self, gid, sid, did, scid):
        """
        This function will return start functions list for fts Parser
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template("/".join([self.template_path, 'functions.sql']),
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
        sql = render_template("/".join([self.template_path, 'functions.sql']),
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
        sql = render_template("/".join([self.template_path, 'functions.sql']),
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
        sql = render_template("/".join([self.template_path, 'functions.sql']),
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
        sql = render_template("/".join([self.template_path, 'functions.sql']),
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
    def sql(self, gid, sid, did, scid, pid):
        """
        This function will reverse generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param pid: fts tempate id
        """
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
                        "Could not generate reversed engineered query for the FTS Parser.\n{0}"
                    ).format(res)
                )

            if res is None:
                return gone(
                    _(
                        "Could not generate reversed engineered query for FTS Parser node"
                    )
                )

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


FtsParserView.register_node_view(blueprint)
