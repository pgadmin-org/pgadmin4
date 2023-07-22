##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Language Node"""

import json
from functools import wraps

from pgadmin.browser.server_groups.servers import databases
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class LanguageModule(CollectionNodeModule):
    """
    class LanguageModule(CollectionNodeModule)

        A module class for Language node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the LanguageModule and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for language, when any of the database node is
        initialized.
    """

    _NODE_TYPE = 'language'
    _COLLECTION_LABEL = gettext("Languages")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the LanguageModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None

        super().__init__(*args, **kwargs)

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
                base_template_path=LanguageView.BASE_TEMPLATE_PATH):
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
        Load the module script for language, when any of the database nodes
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


blueprint = LanguageModule(__name__)


class LanguageView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class LanguageView(PGChildNodeView)

        A view class for Language node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating language node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the LanguageView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the language nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the language node.

    * properties(gid, sid, did, lid)
      - This function will show the properties of the selected language node

    * update(gid, sid, did, lid)
      - This function will update the data for the selected language node

    * create(gid, sid, did)
      - This function will create the new language node

    * delete(gid, sid, did, lid)
      - This function will delete the selected language node

    * msql(gid, sid, did, lid)
      - This function is used to return modified SQL for the selected
      language node

    * get_sql(data, lid)
      - This function will generate sql from model data

    * get_functions(gid, sid, did)
      - This function returns the handler and inline functions for the
      selected language node

    * get_templates(gid, sid, did)
      - This function returns language templates.

    * sql(gid, sid, did, lid):
      - This function will generate sql to show it in sql pane for the
      selected language node.

    * dependents(gid, sid, did, lid):
      - This function get the dependents and return ajax response for the
      language node.

    * dependencies(self, gid, sid, did, lid):
      - This function get the dependencies and return ajax response for the
      language node.
    """

    _NOT_FOUND_LANG_INFORMATION = \
        gettext("Could not find the language information.")
    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = "languages/sql/#{0}#"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'lid'}
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
        'get_functions': [{}, {'get': 'get_functions'}],
        'get_templates': [{}, {'get': 'get_templates'}],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the LanguageView and its base view.
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
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = (
                self.BASE_TEMPLATE_PATH.format(self.manager.version)
            )

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the language nodes within that
        collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn)
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
        collection. Here it will create all the language nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              conn=self.conn)
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-language",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, lid):
        """
        This function will fetch properties of the language nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              lid=lid,
                              conn=self.conn)
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-language"
                ),
                status=200
            )

        return gone(gettext("Could not find the specified language."))

    @check_precondition
    def properties(self, gid, sid, did, lid):
        """
        This function will show the properties of the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        status, res = self._fetch_properties(did, lid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, lid):
        """
        This function fetch the properties of the extension.
        :param did:
        :param lid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            lid=lid, conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(self._NOT_FOUND_LANG_INFORMATION)

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)

        sql = render_template(
            "/".join([self.template_path, self._ACL_SQL]),
            lid=lid, conn=self.conn
        )
        status, result = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=result)

        for row in result['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(priv)
            else:
                res['rows'][0][row['deftype']] = [priv]

        seclabels = []
        if 'seclabels' in res['rows'][0] and \
                res['rows'][0]['seclabels'] is not None:
            import re
            for sec in res['rows'][0]['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                seclabels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        res['rows'][0]['seclabels'] = seclabels

        return True, res['rows'][0]

    @check_precondition
    def update(self, gid, sid, did, lid):
        """
        This function will update the data for the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            sql, name = self.get_sql(data, lid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            other_node_info = {}
            if 'description' in data:
                other_node_info['description'] = data['description']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    lid,
                    did,
                    name,
                    icon="icon-%s" % self.node_type,
                    **other_node_info
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def create(self, gid, sid, did):
        """
        This function will create the language object

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
            if 'lanacl' in data:
                data['lanacl'] = parse_priv_to_db(data['lanacl'], ['U'])

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                lanname=data['name'], conn=self.conn
            )

            status, r_set = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=r_set)

            for row in r_set['rows']:
                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        row['oid'],
                        did,
                        row['name'],
                        icon='icon-language'
                    )
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, lid=None, only_sql=False):
        """
        This function will drop the language object

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
            only_sql:
        """
        if lid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [lid]}

        cascade = self._check_cascade_operation()

        try:
            for lid in data['ids']:
                # Get name for language from lid
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    lid=lid, conn=self.conn
                )
                status, lname = self.conn.execute_scalar(sql)

                if not status:
                    return internal_server_error(errormsg=lname)

                # drop language
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    lname=lname, cascade=cascade, conn=self.conn
                )

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Language dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, lid=None):
        """
        This function is used to return modified SQL for the selected
        language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
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
            sql, name = self.get_sql(data, lid)
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

    @staticmethod
    def _parse_privileges(data):
        """
        CHeck key in data adn parse privilege according.
        :param data: Data.
        :return:
        """
        for key in ['lanacl']:
            if key in data and data[key] is not None:
                if 'added' in data[key]:
                    data[key]['added'] = parse_priv_to_db(
                        data[key]['added'], ["U"]
                    )
                if 'changed' in data[key]:
                    data[key]['changed'] = parse_priv_to_db(
                        data[key]['changed'], ["U"]
                    )
                if 'deleted' in data[key]:
                    data[key]['deleted'] = parse_priv_to_db(
                        data[key]['deleted'], ["U"]
                    )

    def get_sql(self, data, lid=None):
        """
        This function will generate sql from model data.

        Args:
            data: Contains the data of the selected language node.
            lid: Language ID
        """
        required_args = [
            'name', 'lanowner', 'description'
        ]

        if lid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]), lid=lid,
                conn=self.conn
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(self._NOT_FOUND_LANG_INFORMATION)

            LanguageView._parse_privileges(data)

            old_data = res['rows'][0]
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]
            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
            return sql.strip('\n'), data['name'] if 'name' in data \
                else old_data['name']
        else:

            if 'lanacl' in data:
                data['lanacl'] = parse_priv_to_db(data['lanacl'], ["U"])

            sql = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)
            return sql.strip('\n'), data['name']

    @check_precondition
    def get_functions(self, gid, sid, did):
        """
        This function returns the handler and inline functions for the
        selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]))
        status, result = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)
        return make_json_response(
            data=result['rows'],
            status=200
        )

    @check_precondition
    def get_templates(self, gid, sid, did):
        """
        This function returns the language template.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        data = []
        if self.manager.version < 130000:
            sql = render_template("/".join(
                [self.template_path, 'templates.sql']))
            status, result = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=result)
            data = result['rows']

        return make_json_response(
            data=data,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, lid, json_resp=True):
        """
        This function will generate sql to show in the sql pane for the
        selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
            json_resp:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            lid=lid, conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(self._NOT_FOUND_LANG_INFORMATION)

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        sql = render_template(
            "/".join([self.template_path, self._ACL_SQL]),
            lid=lid, conn=self.conn
        )
        status, result = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in old_data:
                old_data[row['deftype']].append(priv)
            else:
                old_data[row['deftype']] = [priv]

        # To format privileges
        if 'lanacl' in old_data:
            old_data['lanacl'] = parse_priv_to_db(
                old_data['lanacl'],
                ['U']
            )

        seclabels = []
        if 'seclabels' in old_data and old_data['seclabels'] is not None:
            import re
            for sec in old_data['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                seclabels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        old_data['seclabels'] = seclabels
        sql = render_template(
            "/".join([self.template_path, 'sqlpane.sql']),
            data=old_data, conn=self.conn, add_replace_clause=True
        )

        if not json_resp:
            return sql.strip('\n')

        return ajax_response(response=sql.strip('\n'))

    @check_precondition
    def dependents(self, gid, sid, did, lid):
        """
        This function gets the dependents and returns an ajax response
        for the language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        dependents_result = self.get_dependents(self.conn, lid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, lid):
        """
        This function gets the dependencies and returns an ajax response
        for the language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        dependencies_result = self.get_dependencies(self.conn, lid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

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
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              schema_diff=True,
                              conn=self.conn)
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
            sql, name = self.get_sql(data=data, lid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  lid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, lid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, LanguageView, 'Database')
LanguageView.register_node_view(blueprint)
