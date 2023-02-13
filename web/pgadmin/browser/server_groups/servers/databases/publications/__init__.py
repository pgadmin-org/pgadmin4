##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Publication Node"""
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
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from urllib.parse import unquote


class PublicationModule(CollectionNodeModule):
    """
    class PublicationModule(CollectionNodeModule)

        A module class for Publication node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the PublicationModule and it's
      base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for publication, when any of the database node
      is initialized.
    """

    _NODE_TYPE = 'publication'
    _COLLECTION_LABEL = gettext("Publications")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the PublicationModule and it's
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
        Load the module script for publication, when any of the database nodes
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


blueprint = PublicationModule(__name__)


class PublicationView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class PublicationView(PGChildNodeView)

        A view class for Publication node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating publication node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the PublicationView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the publication nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the publication node.

    * properties(gid, sid, did, pbid)
      - This function will show the properties of the selected publication node

    * update(gid, sid, did, pbid)
      - This function will update the data for the selected publication node

    * create(gid, sid, did)
      - This function will create the new publication node

    * delete(gid, sid, did, pbid)
      - This function will delete the selected publication node

    * msql(gid, sid, did, pbid)
      - This function is used to return modified SQL for the selected
      publication node

    * get_sql(data, pbid)
      - This function will generate sql from model data

    * get_tables(gid, sid, did)
      - This function returns the handler and inline functions for the
      selected publication node

    * sql(gid, sid, did, pbid):
      - This function will generate sql to show it in sql pane for the
      selected publication node.

    * dependencies(self, gid, sid, did, pbid):
      - This function get the dependencies and return ajax response for the
      publication node.
    """

    _NOT_FOUND_PUB_INFORMATION = \
        gettext("Could not find the publication information.")
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'pbid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_tables': [{}, {'get': 'get_tables'}],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the PublicationView and its base view.
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
                "publications/sql/#{0}#".format(self.manager.version)
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the publication nodes within that
        collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]))
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)
        for rows in res['rows']:
            if not rows['all_table']:
                get_name_sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    pbid=rows['oid'], conn=self.conn
                )
                status, pname = self.conn.execute_scalar(get_name_sql)
                table_sql = render_template(
                    "/".join([self.template_path,
                              self._GET_TABLE_FOR_PUBLICATION]),
                    pname=pname
                )

                pub_table = []
                status, table_res = self.conn.execute_dict(table_sql)

                for table in table_res['rows']:
                    pub_table.append(table['pubtable'])

                pub_table = ", ".join(str(elem) for elem in pub_table)

                rows['pubtable'] = pub_table

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function is used to create all the child nodes within the
        collection. Here it will create all the publication nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []
        sql = render_template("/".join([self.template_path,
                                        self._NODES_SQL]))
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-publication"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, pbid):
        """
        This function will fetch properties of the publication nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              pbid=pbid)
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-publication"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified publication."))

    @check_precondition
    def properties(self, gid, sid, did, pbid):
        """
        This function will show the properties of the
        selected publication node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
        """
        status, res = self._fetch_properties(did, pbid)

        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, pbid):
        """
        This function fetch the properties of the extension.
        :param did:
        :param pbid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            pbid=pbid
        )

        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self._NOT_FOUND_PUB_INFORMATION)

        if not res['rows'][0]['all_table']:
            get_name_sql = render_template(
                "/".join([self.template_path, self._DELETE_SQL]),
                pbid=pbid, conn=self.conn
            )
            status, pname = self.conn.execute_scalar(get_name_sql)
            table_sql = render_template(
                "/".join([self.template_path,
                          self._GET_TABLE_FOR_PUBLICATION]),
                pname=pname
            )

            pub_table = []
            status, table_res = self.conn.execute_dict(table_sql)

            for table in table_res['rows']:
                pub_table.append(table['pubtable'])

            res['rows'][0]['pubtable'] = pub_table

        return True, res['rows'][0]

    @check_precondition
    def update(self, gid, sid, did, pbid):
        """
        This function will update the data for the selected publication node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:

            sql, name = self.get_sql(data, pbid)

            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    pbid,
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
        This function will create the publication object

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
                                  data=data, conn=self.conn)

            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template(
                "/".join([self.template_path, 'get_position.sql']),
                conn=self.conn, pubname=data['name']
            )

            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    r_set['rows'][0]['oid'],
                    did,
                    r_set['rows'][0]['name'],
                    icon='icon-publication'
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, pbid=None, only_sql=False):
        """
        This function will drop the publication object

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
        """
        if pbid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [pbid]}

        cascade = self._check_cascade_operation()

        try:
            for pbid in data['ids']:
                # Get name for publication from pbid
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    pbid=pbid, conn=self.conn
                )

                status, pname = self.conn.execute_scalar(sql)

                if not status:
                    return internal_server_error(errormsg=pname)

                # drop publication
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    pname=pname, cascade=cascade, conn=self.conn
                )

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Publication dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, pbid=None):
        """
        This function is used to return modified SQL for the selected
        publication node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
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

            sql, name = self.get_sql(data, pbid)
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

    def _get_option_details(self, old_data, data):
        """
        Return the option details
        :param old_data:
        :param data:
        :return: data
        """

        if 'evnt_insert' in data or 'evnt_delete' in data or \
                'evnt_update' in data or 'evnt_truncate' in data:

            if 'evnt_insert' not in data:
                data['evnt_insert'] = old_data['evnt_insert']

            if 'evnt_delete' not in data:
                data['evnt_delete'] = old_data['evnt_delete']

            if 'evnt_update' not in data:
                data['evnt_update'] = old_data['evnt_update']

            if 'evnt_truncate' not in data and 'evnt_truncate' in old_data:
                data['evnt_truncate'] = old_data['evnt_truncate']

        return data

    def _get_table_details_to_add_and_delete(self, old_data, data):
        """
        This function returns the tables which need to add and delete
        :param old_data:
        :param data:
        :return:
        """
        drop_table_data = []
        add_table_data = []
        drop_table = False
        add_table = False

        for table in old_data['pubtable']:
            if 'pubtable' in data and table not in data['pubtable']:
                drop_table_data.append(table)
                drop_table = True

        if 'pubtable' in data:
            for table in data['pubtable']:
                if table not in old_data['pubtable']:
                    add_table_data.append(table)
                    add_table = True

        return drop_table, add_table, drop_table_data, add_table_data

    def get_sql(self, data, pbid=None):
        """
        This function will generate sql from model data.

        Args:
            data: Contains the data of the selected publication node.
            pbid: Publication ID
        """
        required_args = [
            'name'
        ]
        if pbid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]), pbid=pbid
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(self._NOT_FOUND_PUB_INFORMATION)

            old_data = self._get_old_table_data(res['rows'][0]['name'], res)

            drop_table, add_table, drop_table_data, add_table_data = \
                self._get_table_details_to_add_and_delete(old_data, data)

            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            # Add old event setting for future reference
            data = self._get_option_details(old_data, data)

            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn,
                drop_table=drop_table, drop_table_data=drop_table_data,
                add_table=add_table, add_table_data=add_table_data
            )
            return sql.strip('\n'), data['name'] if 'name' in data \
                else old_data['name']
        else:

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)
            return sql.strip('\n'), data['name']

    @check_precondition
    def get_tables(self, gid, sid, did):
        """
        This function returns the tables list.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []

        sql = render_template("/".join([self.template_path,
                                        'get_all_tables.sql']),
                              show_sys_objects=self.blueprint.
                              show_system_objects,
                              server_type=self.manager.server_type
                              )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)
        for row in rset['rows']:
            res.append(
                {
                    'label': row['table'],
                    'value': row['table']
                }
            )
        return make_json_response(
            data=res,
            status=200
        )

    def _get_old_table_data(self, pname, res):
        """
        This function return table details before update
        :param pname:
        :param res:
        :return:old_data
        """

        table_sql = render_template(
            "/".join([self.template_path, self._GET_TABLE_FOR_PUBLICATION]),
            pname=pname
        )

        pub_table = []
        status, table_res = self.conn.execute_dict(table_sql)

        for table in table_res['rows']:
            pub_table.append(table['pubtable'])

        res['rows'][0]['pubtable'] = pub_table

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        if 'all_table' in old_data and old_data['all_table']:
            old_data['pubtable'] = ''

        return old_data

    @check_precondition
    def sql(self, gid, sid, did, pbid, json_resp=True):
        """
        This function will generate sql to show in the sql panel for the
        selected publication node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
            json_resp:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            pbid=pbid
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(self._NOT_FOUND_PUB_INFORMATION)

        get_name_sql = render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            pbid=pbid, conn=self.conn
        )
        status, pname = self.conn.execute_scalar(get_name_sql)

        # Get old table details
        old_data = self._get_old_table_data(pname, res)

        sql = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=old_data, conn=self.conn)

        sql_header = "-- Publication: {}".format(old_data['name'])
        sql_header += "\n\n"

        sql_header += "-- "

        sql_header += render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            pname=old_data['name'], )

        sql_header += "\n"

        sql = sql_header + sql

        if not json_resp:
            return sql

        return ajax_response(response=sql)

    @check_precondition
    def dependents(self, gid, sid, did, pbid):
        """
        This function gets the dependents and returns an ajax response
        for the publication node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
        """
        dependents_result = self.get_dependents(self.conn, pbid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, pbid):
        """
        This function gets the dependencies and returns an ajax response
        for the publication node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            pbid: Publication ID
        """
        dependencies_result = self.get_dependencies(self.conn, pbid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    def get_dependencies(self, conn, object_id, where=None,
                         show_system_objects=None, is_schema_diff=False):
        """
        This function gets the dependencies and returns an ajax response
        for the publication node.
        :param conn:
        :param object_id:
        :param where:
        :param show_system_objects:
        :param is_schema_diff:
        :return: dependencies result
        """

        get_name_sql = render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            pbid=object_id, conn=self.conn
        )
        status, pname = self.conn.execute_scalar(get_name_sql)
        table_sql = render_template(
            "/".join([self.template_path, 'dependencies.sql']),
            pname=pname
        )
        status, res = self.conn.execute_dict(table_sql)
        if not status:
            return internal_server_error(errormsg=res)

        dependencies_result = []

        for pub_table in res['rows']:
            dependencies_result.append(
                {'type': 'table',
                 'name': pub_table['pubtable'],
                 'field': 'normal',
                 'oid': pub_table['oid']})

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
            schema_diff=True
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
            sql, name = self.get_sql(data=data, pbid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  pbid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, pbid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, PublicationView, 'Database')
PublicationView.register_node_view(blueprint)
