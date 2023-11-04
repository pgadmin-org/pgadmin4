##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Subscription Node"""

import json
from functools import wraps

from pgadmin.browser.server_groups.servers import databases
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.utils import get_complete_file_path


class SubscriptionModule(CollectionNodeModule):
    """
    class SubscriptionModule(CollectionNodeModule)

        A module class for Subscription node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the SubscriptionModule and it's
      base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for subscription, when any of the database node
      is initialized.
    """

    _NODE_TYPE = 'subscription'
    _COLLECTION_LABEL = gettext("Subscriptions")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the SubscriptionModule and it's
        base module.

        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)
        self.min_ver = self.min_ppasver = 100000
        self.max_ver = None

    def get_nodes(self, gid, sid, did):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database Id
        """
        if self.has_nodes(
            sid, did,
                base_template_path=SubscriptionView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(did)

    @property
    def node_inode(self):
        """
        Override this property to make the node a leaf node.

        Returns: False as this is the leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for subscription, when any of the database nodes
        are initialized.

        Returns: node type of the server module.
        """
        return databases.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = SubscriptionModule(__name__)


class SubscriptionView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class SubscriptionView(PGChildNodeView)

        A view class for Subscription node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating subscription node, showing properties, showing sql
        in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the SubscriptionView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the subscription nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the subscription node.

    * properties(gid, sid, did, subid)
      - This function will show the properties of the selected
      subscription node

    * update(gid, sid, did, subid)
      - This function will update the data for the selected subscription node

    * create(gid, sid, did)
      - This function will create the new subscription node

    * delete(gid, sid, did, subid)
      - This function will delete the selected subscription node

    * msql(gid, sid, did, subid)
      - This function is used to return modified SQL for the selected
      subscription node

    * get_sql(data, subid)
      - This function will generate sql from model data

    * get_publications(gid, sid, did)
      - This function returns the publications list

    * get_templates(gid, sid, did)
      - This function returns subscription templates.

    * sql(gid, sid, did, subid):
      - This function will generate sql to show it in sql pane for the
      selected subscription node.

    * dependents(gid, sid, did, subid):
      - This function get the dependents and return ajax response for the
      subscription node.

    * dependencies(gid, sid, did, subid):
      - This function get the dependencies and return ajax response for the
      subscription node.
    """

    _NOT_FOUND_PUB_INFORMATION = \
        gettext("Could not find the subscription information.")
    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = "subscriptions/sql/#{0}#"

    # This mapping will be used PostgresSQL 16 above
    streaming_mapping = {
        'p': 'parallel',
        't': True,
        'f': False
    }
    two_phase_mapping = {
        'p': True,
        'e': True,
        'd': False
    }

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'subid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_publications': [{}, {'get': 'get_publications'}],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the SubscriptionView and its base view.
        Initialize all the variables create/used dynamically like conn,
        template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None
        self.manager = None

        super().__init__(**kwargs)

    def check_precondition(f):
        """
        This function will behave as a decorator which will check the
        database connection before running the view. It also attaches
        manager, conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set the template path for the SQL scripts
            self.template_path = (
                self.BASE_TEMPLATE_PATH.format(self.manager.version)
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the subscription nodes within that
        collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]), did=did)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function is used to create all the child nodes within the
        collection. Here it will create all the subscription nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []
        sql = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), did=did)
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-subscription"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, subid):
        """
        This function will fetch properties of the subscription nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              subid=subid)
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-subscription"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified subscription."))

    @check_precondition
    def properties(self, gid, sid, did, subid):
        """
        This function will show the properties of the selected subscription
        node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
        """
        status, res = self._fetch_properties(did, subid)

        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, subid):
        """
        This function fetch the properties of the subscription.
        :param did:
        :param subid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            subid=subid, did=did,
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self._NOT_FOUND_PUB_INFORMATION)

        if self.manager.version >= 150000:
            res['rows'][0]['two_phase'] = \
                self.two_phase_mapping[res['rows'][0]['two_phase']]

        if self.manager.version >= 160000:
            res['rows'][0]['streaming'] = \
                self.streaming_mapping[res['rows'][0]['streaming']]

        return True, res['rows'][0]

    @check_precondition
    def statistics(self, gid, sid, did, subid=None):
        """
        This function gets the statistics and returns an ajax response
        for the view node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: View ID
        """
        sql = render_template("/".join([self.template_path,
                                        'stats.sql']),
                              subid=subid, did=did, conn=self.conn)
        status, res = self.conn.execute_dict(sql)
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def update(self, gid, sid, did, subid):
        """
        This function will update the data for the selected subscription node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            sql, name = self.get_sql(data, subid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    subid,
                    did,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def create(self, gid, sid, did):
        """
        This function will create the subscription object

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        required_args = [
            'name'
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

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, dummy=False, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template(
                "/".join([self.template_path, 'get_position.sql']),
                conn=self.conn, subname=data['name'], did=did
            )

            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    r_set['rows'][0]['oid'],
                    did,
                    r_set['rows'][0]['name'],
                    icon='icon-subscription'
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, subid=None, only_sql=False):
        """
        This function will drop the subscription object

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
            only_sql:
        """
        if subid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [subid]}

        cascade = self._check_cascade_operation()

        try:
            for subid in data['ids']:
                # Get name for subscription from subid
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    subid=subid, conn=self.conn
                )
                status, subname = self.conn.execute_scalar(sql)

                if not status:
                    return internal_server_error(errormsg=subname)

                # drop subscription
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    subname=subname, cascade=cascade, conn=self.conn
                )

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Subscription dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, subid=None):
        """
        This function is used to return modified SQL for the selected
        subscription node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
        """
        data = {}
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v
        try:
            sql, name = self.get_sql(data, subid, 'msql')
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            if sql == '':
                sql = "--modified SQL"

            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_required_details(self, data, old_data):
        """
        This function returns the required data to create subscription
        :param data:
        :return:data , old_data

        """
        required_args = ['name']

        required_connection_args = ['host', 'port', 'username', 'db',
                                    'connect_timeout', 'passfile', 'sslmode']

        # Set connection time out to zero if initial set
        # value is replaced to ''
        if 'connect_timeout' in data and data['connect_timeout'] == '':
            data['connect_timeout'] = 0

        for arg in required_args:
            if arg not in data:
                data[arg] = old_data[arg]

        for arg in required_connection_args:
            if arg in data:
                old_data[arg] = data[arg]

        return data, old_data

    def get_sql(self, data, subid=None, operation=None):
        """
        This function will generate sql from model data.

        Args:
            data: Contains the data of the selected subscription node.
            subid: Subscription ID
        """

        if operation == 'msql':
            dummy = True
        else:
            dummy = False

        if subid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                subid=subid,
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(self._NOT_FOUND_PUB_INFORMATION)

            old_data = res['rows'][0]

            data, old_data = self.get_required_details(data, old_data)

            if 'slot_name' in data and data['slot_name'] == '':
                data['slot_name'] = 'None'

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn, dummy=dummy,
            )
            return sql.strip('\n'), data['name'] if 'name' in data \
                else old_data['name']
        else:

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, dummy=dummy, conn=self.conn)
            return sql.strip('\n'), data['name']

    def get_connection(self, connection_details):
        """
        This function is used to connect to DB and returns the publications
        :param connection_details:
        :return: publication list
        """

        passfile = connection_details['passfile'] if \
            'passfile' in connection_details and \
            connection_details['passfile'] != '' else None
        try:
            from pgadmin.utils.driver import get_driver
            driver = get_driver(PG_DEFAULT_DRIVER)
            conn = driver.get_connection(
                sid=0,
                host=connection_details['host'],
                database=connection_details['db'],
                user=connection_details['username'],
                password=connection_details[
                    'password'] if 'password' in connection_details else None,
                port=connection_details['port'] if
                connection_details['port'] else None,
                passfile=get_complete_file_path(passfile),
                connect_timeout=connection_details['connect_timeout'] if
                'connect_timeout' in connection_details and
                connection_details['connect_timeout'] else 0,
                sslmode=connection_details['sslmode'],
                sslcert=get_complete_file_path(connection_details['sslcert']),
                sslkey=get_complete_file_path(connection_details['sslkey']),
                sslrootcert=get_complete_file_path(
                    connection_details['sslrootcert']),
                sslcompression=True if connection_details[
                    'sslcompression'] else False,
            )
            # create a cursor
            cur = conn.cursor()
            cur.execute('SELECT pubname from pg_catalog.pg_publication')

            publications = cur.fetchall()
            # Close the connection
            conn.close()

            return publications, True
        except Exception as error:
            return error, False

    @check_precondition
    def get_publications(self, gid, sid, did, *args, **kwargs):
        """
        This function returns the publication list

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """

        url_params = None
        if request.args:
            url_params = {k: v for k, v in request.args.items()}

        required_connection_args = ['host', 'port', 'username', 'db',
                                    'connect_timeout', 'passfile', 'sslmode',
                                    'sslcompression', 'sslcert', 'sslkey',
                                    'sslrootcert', 'sslcrl']

        if 'oid' in url_params:
            status, params = self._fetch_properties(did, url_params['oid'])
            for arg in required_connection_args:
                if arg not in url_params and arg in params:
                    url_params[arg] = params[arg]

        res, status = self.get_connection(url_params)

        if status:
            result = []
            for pub in res:
                result.append({
                    "value": pub[0],
                    "label": pub[0]
                })
            return make_json_response(
                data=result,
                status=200
            )
        else:
            result = res.args[0]
            return make_json_response(
                errormsg=result,
                status=200
            )

    @check_precondition
    def sql(self, gid, sid, did, subid, json_resp=True):
        """
        This function will generate sql to show in the sql pane for the
        selected subscription node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
            json_resp:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            subid=subid
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(self._NOT_FOUND_PUB_INFORMATION)

        # Making copy of output for future use
        old_data = dict(res['rows'][0])
        old_data['create_slot'] = False
        if old_data['enabled']:
            old_data['connect'] = True
        else:
            old_data['connect'] = False

        if self.manager.version >= 150000:
            old_data['two_phase'] = \
                self.two_phase_mapping[old_data['two_phase']]

        if self.manager.version >= 160000:
            old_data['streaming'] = \
                self.streaming_mapping[old_data['streaming']]

        sql = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=old_data, conn=self.conn, dummy=True)
        sql += "\n\n"

        sql_header = "-- Subscription: {}".format(old_data['name'])
        sql_header += "\n\n"

        sql_header += "-- DROP SUBSCRIPTION IF EXISTS {};".format(
            old_data['name'])

        sql_header += render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            sname=old_data['name'], )

        sql_header += "\n"

        sql = sql_header + sql

        if not json_resp:
            return sql

        return ajax_response(response=sql)

    @check_precondition
    def dependents(self, gid, sid, did, subid):
        """
        This function gets the dependents and returns an ajax response
        for the subscription node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
        """
        dependents_result = self.get_dependents(self.conn, subid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, subid):
        """
        This function gets the dependencies and returns an ajax response
        for the subscription node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            subid: Subscription ID
        """
        dependencies_result = self.get_dependencies(self.conn, subid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    def get_dependencies(self, conn, object_id, where=None,
                         show_system_objects=None, is_schema_diff=False):
        """
        This function gets the dependencies and returns an ajax response
        for the subscription node.
        :param conn:
        :param object_id:
        :param where:
        :param show_system_objects:
        :param is_schema_diff:
        :return: dependencies result
        """

        get_name_sql = render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            subid=object_id, conn=self.conn
        )
        status, subname = self.conn.execute_scalar(get_name_sql)
        table_sql = render_template(
            "/".join([self.template_path, 'dependencies.sql']),
            subname=subname
        )
        status, res = self.conn.execute_dict(table_sql)
        if not status:
            return internal_server_error(errormsg=res)

        dependencies_result = []

        for publication in res['rows'][0]['pub']:
            dependencies_result.append(
                {'type': 'publication',
                 'name': publication,
                 'field': 'normal'})

        return dependencies_result

    @check_precondition
    def fetch_objects_to_compare(self, sid, did):
        """
        This function will fetch the list of all the event triggers for
        specified database id.

        :param sid: Server Id
        :param did: Database Id
        :return:
        """
        res = dict()
        if self.manager.version < 100000:
            return res

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            did=did, schema_diff=True
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            status, data = self._fetch_properties(did, row['oid'])
            if status:
                res[row['name']] = data

        return res

    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements.
        :param kwargs:
        :return:
        """
        gid = kwargs.get('gid')
        sid = kwargs.get('sid')
        did = kwargs.get('did')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            if 'pub' in data and isinstance(data['pub'], str):
                # Convert publication details to list
                data['pub'] = data['pub'].split(',,')
            sql, name = self.get_sql(data=data, subid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  subid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, subid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, SubscriptionView, 'Database')
SubscriptionView.register_node_view(blueprint)
