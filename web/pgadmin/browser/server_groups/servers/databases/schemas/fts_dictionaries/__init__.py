##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of Fts Dictionary node"""

from functools import wraps

import simplejson as json
from flask import render_template, make_response, current_app, request, jsonify
from flask_babelex import gettext as _

import pgadmin.browser.server_groups.servers.databases as databases
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


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
    _NODE_TYPE = 'fts_dictionary'
    _COLLECTION_LABEL = _('FTS Dictionaries')

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None
        self.manager = None
        super(FtsDictionaryModule, self).__init__(*args, **kwargs)
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
        Load the module script for fts template, when any of the schema
        node is initialized.
        """
        return databases.DatabaseModule.node_type


blueprint = FtsDictionaryModule(__name__)


class FtsDictionaryView(PGChildNodeView, SchemaDiffObjectCompare):
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
      - This function will be used to create all the child node within
      collection.
        Here it will create all the FTS Dictionary nodes.

    * node()
      - This function will be used to create a node given its oid
        Here it will create the FTS Template node based on its oid

    * properties(gid, sid, did, scid, dcid)
      - This function will show the properties of the selected FTS Dictionary
      node

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

    * compare(**kwargs):
      - This function will compare the fts dictionaries nodes from two
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
        {'type': 'int', 'id': 'dcid'}
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
        'fetch_templates': [{'get': 'fetch_templates'},
                            {'get': 'fetch_templates'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'schema']

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super(FtsDictionaryView, self).__init__(**kwargs)

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
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.qtIdent = driver.qtIdent
            self.datlastsysoid = \
                self.manager.db_info[kwargs['did']]['datlastsysoid'] \
                if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            # Set the template path for the SQL scripts
            self.template_path = 'fts_dictionaries/sql/#{0}#'.format(
                self.manager.version)

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
                options.append({'option': k.strip(),
                                'value': v.strip().strip("'")})
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
            "/".join([self.template_path, self._PROPERTIES_SQL]),
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
            "/".join([self.template_path, self._NODES_SQL]),
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
        status, res = self._fetch_properties(scid, dcid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, dcid):
        """
        This function is used to fetch the properties of specified object.

        :param scid:
        :param dcid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid,
            dcid=dcid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(_(
                "Could not find the FTS Dictionary node in the database node."
            ))

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid)

        # Handle templates and its schema name properly
        if res['rows'][0]['template_schema'] is not None and \
                res['rows'][0]['template_schema'] != "pg_catalog":
            res['rows'][0]['template'] = self.qtIdent(
                self.conn, res['rows'][0]['template_schema'],
                res['rows'][0]['template']
            )

        if res['rows'][0]['options'] is not None:
            res['rows'][0]['options'] = self.tokenize_options(
                res['rows'][0]['options']
            )

        return True, res['rows'][0]

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

        # Replace schema oid with schema name before passing to create.sql
        # To generate proper sql query
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

        # We need dcid to add object in tree at browser,
        # Below sql will give the same
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            name=data['name'],
            scid=data['schema']
        )
        status, dcid = self.conn.execute_scalar(sql)
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
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if dcid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
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
    def delete(self, gid, sid, did, scid, dcid=None, only_sql=False):
        """
        This function will drop the FTS Dictionary object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: FTS Dictionary id
        :param only_sql: Return only sql if True
        """
        if dcid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [dcid]}

        # Below will decide if it's simple drop or drop with cascade call

        cascade = self._check_cascade_operation()

        try:
            for dcid in data['ids']:
                # Get name for FTS Dictionary from dcid
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      dcid=dcid)
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
                            'The specified FTS dictionary '
                            'could not be found.\n'
                        )
                    )

                # Drop FTS Dictionary
                result = res['rows'][0]
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
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
                info=_("FTS Dictionary dropped")
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
        SQL, name = self.get_sql(gid, sid, did, scid, data, dcid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL

        if SQL == '':
            SQL = "--modified SQL"

        return make_json_response(
            data=SQL,
            status=200
        )

    def _get_sql_for_create(self, data, schema):
        """
        This function is used to get the create sql.
        :param data:
        :param schema:
        :return:
        """
        # Replace schema oid with schema name
        new_data = data.copy()
        new_data['schema'] = schema

        if (
            'template' in new_data and
            'name' in new_data and
            'schema' in new_data
        ):
            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=new_data,
                                  conn=self.conn
                                  )
        else:
            sql = "-- definition incomplete"
        return sql

    def _check_template_name_and_schema_name(self, data, old_data):
        """
        This function is used to check the template and schema name.
        :param data:
        :param old_data:
        :return:
        """
        if 'schema' not in data:
            data['schema'] = old_data['schema']

        # Handle templates and its schema name properly
        if old_data['template_schema'] is not None and \
                old_data['template_schema'] != "pg_catalog":
            old_data['template'] = self.qtIdent(
                self.conn, old_data['template_schema'],
                old_data['template']
            )

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
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                dcid=dcid,
                scid=scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            elif len(res['rows']) == 0:
                return gone(_("Could not find the FTS Dictionary node."))

            old_data = res['rows'][0]
            self._check_template_name_and_schema_name(data, old_data)

            # If user has changed the schema then fetch new schema directly
            # using its oid otherwise fetch old schema name using its oid
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
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
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=old_data)

            status, old_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=old_schema)

            # Replace old schema oid with old schema name
            old_data['schema'] = old_schema

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=new_data, o_data=old_data
            )
            # Fetch sql query for modified data
            if 'name' in data:
                return sql.strip('\n'), data['name']

            return sql.strip('\n'), old_data['name']
        else:
            # Fetch schema name from schema oid
            sql = render_template("/".join([self.template_path,
                                            self._SCHEMA_SQL]), data=data)

            status, schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=schema)

            sql = self._get_sql_for_create(data, schema)
            return sql.strip('\n'), data['name']

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

        # Empty set is added before actual list as initially it will be visible
        # at template control while creating a new FTS Dictionary
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            if row['nspname'] != "pg_catalog":
                row['tmplname'] = self.qtIdent(
                    self.conn, row['nspname'], row['tmplname']
                )

            res.append({'label': row['tmplname'],
                        'value': row['tmplname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, dcid, **kwargs):
        """
        This function will reverse generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param dcid: FTS Dictionary id
        :param json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid,
            dcid=dcid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(_(
                "Could not find the FTS Dictionary node in the database node."
            ))

        # Handle templates and its schema name properly
        if res['rows'][0]['template_schema'] is not None and \
                res['rows'][0]['template_schema'] != "pg_catalog":
            res['rows'][0]['template'] = self.qtIdent(
                self.conn, res['rows'][0]['template_schema'],
                res['rows'][0]['template']
            )

        if res['rows'][0]['options'] is not None:
            res['rows'][0]['options'] = self.tokenize_options(
                res['rows'][0]['options']
            )
        else:
            # Make it iterable
            res['rows'][0]['options'] = []

        # Fetch schema name from schema oid
        sql = render_template("/".join(
            [self.template_path, self._SCHEMA_SQL]), data=res['rows'][0])

        status, schema = self.conn.execute_scalar(sql)

        if not status:
            return internal_server_error(errormsg=schema)

        # Replace schema oid with schema name
        res['rows'][0]['schema'] = schema
        if target_schema:
            res['rows'][0]['schema'] = target_schema

        sql = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=res['rows'][0],
                              conn=self.conn, is_displaying=True)

        sql_header = """-- Text Search Dictionary: {0}.{1}\n\n""".format(
            res['rows'][0]['schema'], res['rows'][0]['name'])
        sql_header += """-- DROP TEXT SEARCH DICTIONARY {0};\n
""".format(self.qtIdent(self.conn, res['rows'][0]['schema'],
                        res['rows'][0]['name']))

        sql = sql_header + sql

        if not json_resp:
            return sql

        return ajax_response(response=sql.strip('\n'))

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

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the fts dictionaries for
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
                                     data=data, dcid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, dcid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, dcid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, dcid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, FtsDictionaryView)
FtsDictionaryView.register_node_view(blueprint)
