##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of Fts Template node"""

import simplejson as json
from functools import wraps

from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases import DatabaseModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


class FtsTemplateModule(SchemaChildModule):
    """
     class FtsTemplateModule(SchemaChildModule)

        A module class for FTS Template node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the FtsTemplateModule and it's base module.

    * get_nodes(gid, sid, did, scid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for FTS Template, when any of the schema node is
        initialized.
    """
    NODE_TYPE = 'fts_template'
    COLLECTION_LABEL = gettext('FTS Templates')

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None
        super(FtsTemplateModule, self).__init__(*args, **kwargs)

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


blueprint = FtsTemplateModule(__name__)


class FtsTemplateView(PGChildNodeView):
    """
    class FtsTemplateView(PGChildNodeView)

        A view class for FTS Tempalte node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like create/update/delete
        responsible for all the stuff related to view like create/update/delete
        FTS template, showing properties of node, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the FtsTemplateView and it's base view.

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
      - This function will used to create all the child node within that collection.
        Here it will create all the FTS Template nodes.

    * properties(gid, sid, did, scid, tid)
      - This function will show the properties of the selected FTS Template node

    * create(gid, sid, did, scid)
      - This function will create the new FTS Template object

    * update(gid, sid, did, scid, tid)
      - This function will update the data for the selected FTS Template node

    * delete(self, gid, sid, did, scid, tid):
      - This function will drop the FTS Template object

    * msql(gid, sid, did, scid, tid)
      - This function is used to return modified SQL for the selected FTS Template node

    * get_sql(data, tid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid,  tid):
      - This function will generate sql to show it in sql pane for the selected FTS Template node.

    * get_type():
      - This function will fetch all the types for source and target types select control.

    * dependents(gid, sid, did, scid, tid):
      - This function get the dependents and return ajax response for the Fts Tempalte node.

    * dependencies(self, gid, sid, did, scid, tid):
      - This function get the dependencies and return ajax response for the FTS Tempalte node.

    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'tid'}
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
        'get_lexize': [{'get': 'get_lexize'}, {'get': 'get_lexize'}],
        'get_init': [{'get': 'get_init'}, {'get': 'get_init'}],
    })

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super(FtsTemplateView, self).__init__(**kwargs)

    def module_js(self):
        """
        This property defines whether javascript exists for this node.
        """
        return make_response(
            render_template(
                "fts_template/js/fts_templates.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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
            self.template_path = 'fts_template/sql/9.1_plus'

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
                    icon="icon-fts_template"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, tid):
        sql = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            tid=tid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    row['schema'],
                    row['name'],
                    icon="icon-fts_template"
                ),
                status=200
            )
        return gone(
            _("Could not the requested FTS template.")
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid):
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            scid=scid,
            tid=tid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the FTS template node in the database."""))

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the fts_template object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """

        # Mandatory fields to create a new fts template
        required_args = [
            'tmpllexize',
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
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )
        # Fetch schema name from schema oid
        sql = render_template("/".join([self.template_path, 'schema.sql']),
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
        sql = render_template("/".join([self.template_path, 'create.sql']),
                              data=new_data,
                              conn=self.conn,
                              )
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # we need fts_template id to to add object in tree at browser,
        # below sql will give the same
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            name=data['name'],
            scid=data['schema'] if 'schema' in data else scid
        )
        status, tid = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=tid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                tid,
                data['schema'] if 'schema' in data else scid,
                data['name'],
                icon="icon-fts_template"
            )
        )

    @check_precondition
    def update(self, gid, sid, did, scid, tid):
        """
        This function will update text search template object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        # Fetch sql query to update fts template
        sql, name = self.get_sql(gid, sid, did, scid, data, tid)
        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            tid=tid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        rset = rset['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                tid,
                rset['schema'],
                rset['name'],
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, tid):
        """
        This function will drop the fts_template object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        # Get name for template from tid
        sql = render_template("/".join([self.template_path, 'delete.sql']),
                              tid=tid)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if not res['rows']:
            return make_json_response(
                success=0,
                errormsg=gettext(
                    'Error: Object not found.'
                ),
                info=gettext(
                    'The specified FTS template could not be found.\n'
                )
            )

        # Drop fts template
        result = res['rows'][0]
        sql = render_template("/".join([self.template_path, 'delete.sql']),
                              name=result['name'],
                              schema=result['schema'],
                              cascade=cascade
                              )

        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            success=1,
            info=gettext("FTS template dropped"),
            data={
                'id': tid,
                'sid': sid,
                'gid': gid,
                'did': did,
                'scid': scid
            }
        )

    @check_precondition
    def msql(self, gid, sid, did, scid, tid=None):
        """
        This function returns modified SQL
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """
        data = request.args

        # Fetch sql query for modified data
        # Fetch sql query for modified data
        SQL, name = self.get_sql(gid, sid, did, scid, data, tid)
        if SQL == '':
            SQL = "--modified SQL"

        return make_json_response(
            data=SQL,
            status=200
            )

    def get_sql(self, gid, sid, did, scid, data, tid=None):
        """
        This function will return SQL for model data
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """

        # Fetch sql for update
        if tid is not None:
            sql = render_template(
                "/".join([self.template_path, 'properties.sql']),
                tid=tid,
                scid=scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            old_data = res['rows'][0]

            # If user has changed the schema then fetch new schema directly
            # using its oid otherwise fetch old schema name using fts template oid
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
                data=old_data)

            status, old_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=old_schema)

            # Replace old schema oid with old schema name
            old_data['schema'] = old_schema

            sql = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=new_data, o_data=old_data
            )
            # Fetch sql query for modified data
            return str(sql.strip('\n')), data['name'] if 'name' in data else old_data['name']
        else:
            # Fetch schema name from schema oid
            sql = render_template("/".join([self.template_path, 'schema.sql']),
                                  data=data)

            status, schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=schema)

            # Replace schema oid with schema name
            new_data = data.copy()
            new_data['schema'] = schema

            if 'tmpllexize' in new_data and \
                            'name' in new_data and \
                            'schema' in new_data:
                sql = render_template("/".join([self.template_path,
                                                'create.sql']),
                                      data=new_data,
                                      conn=self.conn
                                      )
            else:
                sql = "-- incomplete definition"
            return str(sql.strip('\n')), data['name']

    @check_precondition
    def get_lexize(self, gid, sid, did, scid, tid=None):
        """
        This function will return lexize functions list for fts template
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """
        sql = render_template(
            "/".join([self.template_path, 'functions.sql']), lexize=True
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # Empty set is added before actual list as initially it will be visible
        # at lexize select control while creating a new fts template
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def get_init(self, gid, sid, did, scid, tid=None):
        """
        This function will return init functions list for fts template
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """
        sql = render_template(
            "/".join([self.template_path, 'functions.sql']), init=True
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        # We have added this to map against '-' which is coming from server
        res = [{'label': '', 'value': '-'}]
        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, tid):
        """
        This function will reverse generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param tid: fts tempate id
        """
        sql = render_template(
            "/".join([self.template_path, 'sql.sql']),
            tid=tid,
            scid=scid,
            conn=self.conn
        )
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(
                _(
                    "Could not generate reversed engineered Query for the FTS Template.\n{0}").format(
                    res
                )
            )

        if res is None:
            return gone(
                _(
                    "Could not generate reversed engineered Query for FTS Template node.")
            )

        return ajax_response(response=res)

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid):
        """
        This function get the dependents and return ajax response
        for the FTS Template node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: FTS Template ID
        """
        dependents_result = self.get_dependents(self.conn, tid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid):
        """
        This function get the dependencies and return ajax response
        for the FTS Template node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: FTS Tempalte ID
        """
        dependencies_result = self.get_dependencies(self.conn, tid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


FtsTemplateView.register_node_view(blueprint)
