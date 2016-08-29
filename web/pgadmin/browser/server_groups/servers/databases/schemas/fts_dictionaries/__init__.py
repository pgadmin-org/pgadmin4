##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of Fts Dictionary node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, current_app, request, jsonify
from flask_babel import gettext as _
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


class FtsDictionaryModule(SchemaChildModule):
    """
     class FtsDictionaryModule(SchemaChildModule)

        A module class for FTS Dictionary node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the FtsDictionaryModule and
        it's base module.

    * get_nodes(gid, sid, did, scid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node

    * script_load()
      - Load the module script for FTS Dictionary, when any of the schema
      node is initialized.
    """
    NODE_TYPE = 'fts_dictionary'
    COLLECTION_LABEL = _('FTS Dictionaries')

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None
        self.manager = None
        super(FtsDictionaryModule, self).__init__(*args, **kwargs)

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
        Load the module script for fts template, when any of the schema
        node is initialized.
        """
        return databases.DatabaseModule.NODE_TYPE


blueprint = FtsDictionaryModule(__name__)


class FtsDictionaryView(PGChildNodeView):
    """
    class FtsDictionaryView(PGChildNodeView)

        A view class for FTS Dictionary node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        create/update/delete FTS Dictionary,
        showing properties of node, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the FtsDictionaryView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * tokenize_options(self, option_value):
    -   This function will tokenize the string stored in database
        e.g. database store the value as below
        key1=value1, key2=value2, key3=value3, ....
        This function will extract key and value from above string

    * list()
      - This function is used to list all the  nodes within that collection.

    * nodes()
      - This function will be used to create all the child node within collection.
        Here it will create all the FTS Dictionary nodes.

    * node()
      - This function will be used to create a node given its oid
        Here it will create the FTS Template node based on its oid

    * properties(gid, sid, did, scid, dcid)
      - This function will show the properties of the selected FTS Dictionary node

    * create(gid, sid, did, scid)
      - This function will create the new FTS Dictionary object

    * update(gid, sid, did, scid, dcid)
      - This function will update the data for the selected FTS Dictionary node

    * delete(self, gid, sid, did, scid, dcid):
      - This function will drop the FTS Dictionary object

    * msql(gid, sid, did, scid, dcid)
      - This function is used to return modified SQL for the selected node

    * get_sql(data, dcid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid, dcid):
      - This function will generate sql to show in sql pane for node.

    * fetch_templates():
      - This function will fetch all templates related to node

    * dependents(gid, sid, did, scid, dcid):
      - This function get the dependents and return ajax response for the node.

    * dependencies(self, gid, sid, did, scid, dcid):
      - This function get the dependencies and return ajax response for node.

    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'dcid'}
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
        'fetch_templates': [{'get': 'fetch_templates'},
                            {'get': 'fetch_templates'}],
    })

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super(FtsDictionaryView, self).__init__(**kwargs)

    def module_js(self):
        """
        Load JS file (fts_dictionary.js) for this module.
        """
        return make_response(
            render_template(
                "fts_dictionary/js/fts_dictionary.js",
                _=_
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
            # Set the template path for the SQL scripts
            self.template_path = 'fts_dictionary/sql/9.1_plus'

            return f(*args, **kwargs)
        return wrap

    def tokenize_options(self, option_value):
        """
        This function will tokenize the string stored in database
        e.g. database store the value as below
        key1=value1, key2=value2, key3=value3, ....
        This function will extract key and value from above string

        Args:
            option_value: key value option/value pair read from database
        """
        if option_value is not None:
            option_str = option_value.split(',')
            options = []
            for fdw_option in option_str:
                k, v = fdw_option.split('=', 1)
                options.append({'option': k, 'value': v})
            return options

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        List all FTS Dictionary nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            scid=scid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            if row['options'] is not None:
                row['options'] = self.tokenize_options(row['options'])

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        Return all FTS Dictionaries to generate nodes.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

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
                    icon="icon-fts_dictionary"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, dcid):
        """
        Return FTS Dictionary node to generate node

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            dcid: fts dictionary id
        """

        sql = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            dcid=dcid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(_("Could not find the FTS Dictionary node."))

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    dcid,
                    row['schema'],
                    row['name'],
                    icon="icon-fts_dictionary"
                ),
                status=200
            )

    @check_precondition
    def properties(self, gid, sid, did, scid, dcid):
        """
        Show properties of FTS Dictionary node

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            dcid: fts dictionary id
        """

        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            scid=scid,
            dcid=dcid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(_("""
                Could not find the FTS Dictionary node in the database node.
                """))

        if res['rows'][0]['options'] is not None:
            res['rows'][0]['options'] = self.tokenize_options(res['rows'][0]['options'])

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the FTS Dictionary object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """

        # Mandatory fields to create a new FTS Dictionary
        required_args = [
            'template',
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
                    errormsg=_("Could not find the required parameter (%s)." % arg)
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

        # Replace schema oid with schema name before passing to create.sql
        # To generate proper sql query
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

        # We need dcid to add object in tree at browser,
        # Below sql will give the same
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            name=data['name'],
            scid=data['schema']
        )
        status, dcid= self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=dcid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                dcid,
                data['schema'],
                data['name'],
                icon="icon-fts_dictionary"
            )
        )

    @check_precondition
    def update(self, gid, sid, did, scid, dcid):
        """
        This function will update FTS Dictionary object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: fts dictionary id
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        # Fetch sql query to update fts dictionary
        sql, name = self.get_sql(gid, sid, did, scid, data, dcid)
        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if dcid is not None:
            sql = render_template(
                "/".join([self.template_path, 'properties.sql']),
                dcid=dcid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    _("Could not find the FTS Dictionary node to update.")
                )

        return jsonify(
            node=self.blueprint.generate_browser_node(
                dcid,
                res['rows'][0]['schema'],
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, dcid):
        """
        This function will drop the FTS Dictionary object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: FTS Dictionary id
        """
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Get name for FTS Dictionary from dcid
            sql = render_template("/".join([self.template_path, 'delete.sql']),
                                  dcid=dcid)
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
                        'The specified FTS dictionary could not be found.\n'
                    )
                )

            # Drop FTS Dictionary
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
                info=_("FTS Dictionary dropped"),
                data={
                    'id': dcid,
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
    def msql(self, gid, sid, did, scid, dcid=None):
        """
        This function returns modified SQL
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: FTS Dictionary id
        """
        # data = request.args
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        try:
            # Fetch sql query for modified data
            SQL, name = self.get_sql(gid, sid, did, scid, data, dcid)
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, did, scid, data, dcid=None):
        """
        This function will return SQL for model data
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: fts dictionary id
        """

        # Fetch sql for update
        if dcid is not None:
            sql = render_template(
                "/".join([self.template_path, 'properties.sql']),
                dcid=dcid,
                scid=scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(_("""
                    Could not find the FTS Dictionary node.
                """))

            old_data = res['rows'][0]

            # If user has changed the schema then fetch new schema directly
            # using its oid otherwise fetch old schema name using its oid
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

            if 'template' in new_data and \
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
    def fetch_templates(self, gid, sid, did, scid):
        """
        This function will return templates list for FTS Dictionary
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        # Fetch last system oid
        sql = render_template("/".join([self.template_path, 'templates.sql']),
                              template=True)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        datlastsysoid = self.manager.db_info[did]['datlastsysoid']
        # Empty set is added before actual list as initially it will be visible
        # at template control while creating a new FTS Dictionary
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            if row['schemaoid'] > datlastsysoid:
                row['tmplname'] = row['nspname'] + '.' + row['tmplname']

            res.append({'label': row['tmplname'],
                        'value': row['tmplname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, dcid):
        """
        This function will reverse generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: FTS Dictionary id
        """
        try:
            sql = render_template(
                "/".join([self.template_path, 'sql.sql']),
                dcid=dcid,
                scid=scid,
                conn=self.conn
            )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(
                    _(
                        "Couldn't generate reversed engineered query for the FTS Dictionary!\n{0}").format(
                        res
                    )
                )

            if res is None:
                return gone(
                    _(
                        "Couldn't generate reversed engineered query for FTS Dictionary node!")
                )

            return ajax_response(response=res)

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, dcid):
        """
        This function get the dependents and return ajax response
        for the FTS Dictionary node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            dcid: FTS Dictionary ID
        """
        dependents_result = self.get_dependents(self.conn, dcid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, dcid):
        """
        This function get the dependencies and return ajax response
        for the FTS Dictionary node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            dcid: FTS Dictionary ID
        """
        dependencies_result = self.get_dependencies(self.conn, dcid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


FtsDictionaryView.register_node_view(blueprint)
