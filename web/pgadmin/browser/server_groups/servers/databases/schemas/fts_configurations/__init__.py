##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Defines views for management of Fts Configuration node"""

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


class FtsConfigurationModule(SchemaChildModule):
    """
     class FtsConfigurationModule(SchemaChildModule)

        A module class for FTS Configuration node derived from
        SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the FtsConfigurationModule and
        it's base module.

    * get_nodes(gid, sid, did, scid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node

    * script_load()
      - Load the module script for FTS Configuration, when any of the schema
      node is initialized.

    """
    _NODE_TYPE = 'fts_configuration'
    _COLLECTION_LABEL = _('FTS Configurations')

    def __init__(self, *args, **kwargs):
        self.min_ver = None
        self.max_ver = None
        self.manager = None
        super(FtsConfigurationModule, self).__init__(*args, **kwargs)
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


blueprint = FtsConfigurationModule(__name__)


class FtsConfigurationView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class FtsConfigurationView(PGChildNodeView)

        A view class for FTS Configuration node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        create/update/delete FTS Configuration,
        showing properties of node, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the FtsConfigurationView and it's base
      view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the  nodes within that collection.

    * nodes()
      - This function will be used to create all the child node within
      collection.
        Here it will create all the FTS Configuration nodes.

    * node()
      - This function will be used to create a node given its oid
        Here it will create the FTS Template node based on its oid

    * properties(gid, sid, did, scid, cfgid)
      - This function will show the properties of the selected
      FTS Configuration node

    * create(gid, sid, did, scid)
      - This function will create the new FTS Configuration object

    * update(gid, sid, did, scid, cfgid)
      - This function will update the data for the selected
      FTS Configuration node

    * delete(self, gid, sid, did, scid, cfgid):
      - This function will drop the FTS Configuration object

    * msql(gid, sid, did, scid, cfgid)
      - This function is used to return modified SQL for the selected node

    * get_sql(data, cfgid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid, cfgid):
      - This function will generate sql to show in sql pane for node.

    * parsers(gid, sid, did, scid):
      - This function will fetch all ftp parsers from the same schema

    * copyConfig():
      - This function will fetch all existed fts configurations from same
      schema

    * tokens():
      - This function will fetch all tokens from fts parser related to node

    * dictionaries():
      - This function will fetch all dictionaries related to node

    * dependents(gid, sid, did, scid, cfgid):
      - This function get the dependents and return ajax response for the node.

    * dependencies(self, gid, sid, did, scid, cfgid):
      - This function get the dependencies and return ajax response for node.

    * compare(**kwargs):
      - This function will compare the fts configuration nodes from two
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
        {'type': 'int', 'id': 'cfgid'}
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
        'parsers': [{'get': 'parsers'},
                    {'get': 'parsers'}],
        'copyConfig': [{'get': 'copyConfig'},
                       {'get': 'copyConfig'}],
        'tokens': [{'get': 'tokens'}, {'get': 'tokens'}],
        'dictionaries': [{}, {'get': 'dictionaries'}],
        'compare': [{'get': 'compare'}, {'get': 'compare'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'schema']

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super(FtsConfigurationView, self).__init__(**kwargs)

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
            self.template_path = 'fts_configurations/sql/#{0}#'.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        List all FTS Configuration nodes.

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

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        Return all FTS Configurations to generate nodes.

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
                    icon="icon-fts_configuration"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, cfgid):
        """
        Return FTS Configuration node to generate node

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            cfgid: fts Configuration id
        """

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            cfgid=cfgid
        )
        status, rset = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(
                _("""Could not find the FTS Configuration node.""")
            )

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-fts_configuration"
                ),
                status=200
            )

    @check_precondition
    def properties(self, gid, sid, did, scid, cfgid):
        """
        Show properties of FTS Configuration node

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            cfgid: fts Configuration id
        """
        status, res = self._fetch_properties(scid, cfgid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, cfgid):
        """
        This function is used to fetch property of specified object.
        :param scid:
        :param cfgid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid,
            cfgid=cfgid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                _(
                    "Could not find the FTS Configuration node in the "
                    "database node.")
            )

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid)

        # In edit mode fetch token/dictionary list also
        sql = render_template(
            "/".join([self.template_path, 'tokenDictList.sql']),
            cfgid=cfgid
        )

        status, rset = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=rset)

        res['rows'][0]['tokens'] = rset['rows']

        return True, res['rows'][0]

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the FTS Configuration object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """

        # Mandatory fields to create a new FTS Configuration
        required_args = [
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

        # Either copy config or parser must be present in data
        if 'copy_config' not in data and 'prsname' not in data:
            return make_json_response(
                status=410,
                success=0,
                errormsg=_(
                    "Provide at least copy config or parser."
                )
            )

        # Fetch schema name from schema oid
        sql = render_template("/".join([self.template_path,
                                        self._SCHEMA_SQL]),
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

        # We need cfgid to add object in tree at browser,
        # Below sql will give the same
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            name=data['name'],
            scid=data['schema']
        )
        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)

        res = res['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                res['oid'],
                data['schema'],
                data['name'],
                icon="icon-fts_configuration"
            )
        )

    @check_precondition
    def update(self, gid, sid, did, scid, cfgid):
        """
        This function will update FTS Configuration node
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param cfgid: fts Configuration id
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        # Fetch sql query to update fts Configuration
        sql, name = self.get_sql(gid, sid, did, scid, data, cfgid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql
        sql = sql.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if cfgid is not None:
            sql = render_template(
                "/".join([self.template_path, self._NODES_SQL]),
                cfgid=cfgid,
                scid=data['schema'] if 'schema' in data else scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    _("Could not find the FTS Configuration node to update.")
                )

        return jsonify(
            node=self.blueprint.generate_browser_node(
                cfgid,
                data['schema'] if 'schema' in data else scid,
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, cfgid=None, only_sql=False):
        """
        This function will drop the FTS Configuration object
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param cfgid: FTS Configuration id
        :param only_sql: Return only sql if True
        """
        if cfgid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [cfgid]}

        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            for cfgid in data['ids']:
                # Get name for FTS Configuration from cfgid
                sql = render_template(
                    "/".join([self.template_path, 'get_name.sql']),
                    cfgid=cfgid
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
                            'The specified FTS configuration '
                            'could not be found.\n'
                        )
                    )

                # Drop FTS Configuration
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
                info=_("FTS Configuration dropped")
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, cfgid=None):
        """
        This function returns modified SQL
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param cfgid: FTS Configuration id
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
        SQL, name = self.get_sql(gid, sid, did, scid, data, cfgid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL

        if SQL == '':
            SQL = "-- No change"

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
            'name' in new_data and
            'schema' in new_data
        ):
            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=new_data,
                                  conn=self.conn
                                  )
        else:
            sql = u"-- definition incomplete"
        return sql

    @staticmethod
    def _replace_schema_oid_with_schema_name(new_schema, new_data):
        """
        This function is used to replace schema oid with schema name.
        :param new_schema:
        :param new_data:
        :return:
        """
        if 'schema' in new_data:
            new_data['schema'] = new_schema

    def get_sql(self, gid, sid, did, scid, data, cfgid=None):
        """
        This function will return SQL for model data
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param cfgid: fts Configuration id
        """
        # Fetch sql for update
        if cfgid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                cfgid=cfgid,
                scid=scid
            )

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res), ''
            elif len(res['rows']) == 0:
                return \
                    gone(_("Could not find the FTS Configuration node.")), ''

            old_data = res['rows'][0]
            if 'schema' not in data:
                data['schema'] = old_data['schema']

            # If user has changed the schema then fetch new schema directly
            # using its oid otherwise fetch old schema name using its oid
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=data)

            status, new_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=new_schema), ''

            new_data = data.copy()
            # Replace schema oid with schema name
            self._replace_schema_oid_with_schema_name(new_schema, new_data)

            # Fetch old schema name using old schema oid
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=old_data
            )

            status, old_schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=old_schema), ''

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
            sql = render_template(
                "/".join([self.template_path, self._SCHEMA_SQL]),
                data=data
            )

            status, schema = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=schema), ''

            sql = self._get_sql_for_create(data, schema)
            return sql.strip('\n'), data['name']

    @check_precondition
    def parsers(self, gid, sid, did, scid):
        """
        This function will return fts parsers list for FTS Configuration
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        # Fetch last system oid

        sql = render_template(
            "/".join([self.template_path, 'parser.sql']),
            parser=True
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        datlastsysoid = self.manager.db_info[did]['datlastsysoid']

        # Empty set is added before actual list as initially it will be visible
        # at parser control while creating a new FTS Configuration
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            if row['schemaoid'] > datlastsysoid:
                row['prsname'] = row['nspname'] + '.' + row['prsname']

            res.append({'label': row['prsname'],
                        'value': row['prsname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def copyConfig(self, gid, sid, did, scid):
        """
        This function will return copy config list for FTS Configuration
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        # Fetch last system oid
        sql = render_template(
            "/".join([self.template_path, 'copy_config.sql']),
            copy_config=True
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        datlastsysoid = self.manager.db_info[did]['datlastsysoid']

        # Empty set is added before actual list as initially it will be visible
        # at copy_config control while creating a new FTS Configuration
        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            if row['oid'] > datlastsysoid:
                row['cfgname'] = row['nspname'] + '.' + row['cfgname']

            res.append({'label': row['cfgname'],
                        'value': row['cfgname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def tokens(self, gid, sid, did, scid, cfgid=None):
        """
        This function will return token list of fts parser node related to
        current FTS Configuration node
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param cfgid: fts configuration id
        """
        try:
            res = []
            if cfgid is not None:
                sql = render_template(
                    "/".join([self.template_path, 'parser.sql']),
                    cfgid=cfgid
                )
                status, parseroid = self.conn.execute_scalar(sql)

                if not status:
                    return internal_server_error(errormsg=parseroid)

                sql = render_template(
                    "/".join([self.template_path, 'tokens.sql']),
                    parseroid=parseroid
                )
                status, rset = self.conn.execute_dict(sql)

                for row in rset['rows']:
                    res.append({'label': row['alias'],
                                'value': row['alias']})

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dictionaries(self, gid, sid, did, scid, cfgid=None):
        """
        This function will return dictionary list for FTS Configuration
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        """
        sql = render_template(
            "/".join([self.template_path, 'dictionaries.sql'])
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        res = []
        for row in rset['rows']:
            res.append({'label': row['dictname'],
                        'value': row['dictname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, cfgid, **kwargs):
        """
        This function will reverse generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param scid: schema id
        :param cfgid: FTS Configuration id
        :param json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)

        try:
            sql = render_template(
                "/".join([self.template_path, 'sql.sql']),
                cfgid=cfgid,
                scid=scid,
                conn=self.conn
            )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(
                    _(
                        "Could not generate reversed engineered query for the "
                        "FTS Configuration.\n{0}"
                    ).format(res)
                )

            if res is None:
                return gone(
                    _(
                        "Could not generate reversed engineered query for "
                        "FTS Configuration node.")
                )

            if not json_resp:
                return res

            return ajax_response(response=res)

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, cfgid):
        """
        This function get the dependents and return ajax response
        for the FTS Configuration node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            cfgid: FTS Configuration ID
        """
        dependents_result = self.get_dependents(self.conn, cfgid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, cfgid):
        """
        This function get the dependencies and return ajax response
        for the FTS Configuration node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            cfgid: FTS Configuration ID
        """
        dependencies_result = self.get_dependencies(self.conn, cfgid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the fts configurations for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, fts_cfg = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in fts_cfg['rows']:
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

        if data:
            sql, name = self.get_sql(gid=gid, sid=sid, did=did, scid=scid,
                                     data=data, cfgid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, cfgid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, cfgid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, FtsConfigurationView)
FtsConfigurationView.register_node_view(blueprint)
