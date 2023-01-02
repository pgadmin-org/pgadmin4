##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Synonym Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class SynonymModule(SchemaChildModule):
    """
     class SynonymModule(CollectionNodeModule)

        A module class for Synonym node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Synonym and it's base module.

    * get_nodes(gid, sid, did, scid, syid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'synonym'
    _COLLECTION_LABEL = gettext("Synonyms")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the SynonymModule and it's base module.

        Args:
            *args:
            **kwargs:
        """

        super().__init__(*args, **kwargs)
        self.min_ver = 90100
        self.max_ver = None
        self.server_type = ['ppas']

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for database, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        return False


blueprint = SynonymModule(__name__)


class SynonymView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Synonym node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the SynonymView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Synonym nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Synonym node.

    * properties(gid, sid, did, scid, syid)
      - This function will show the properties of the selected Synonym node

    * create(gid, sid, did, scid)
      - This function will create the new Synonym object

    * update(gid, sid, did, scid, syid)
      - This function will update the data for the selected Synonym node

    * delete(self, gid, sid, scid, syid):
      - This function will drop the Synonym object

    * msql(gid, sid, did, scid, syid)
      - This function is used to return modified SQL for the selected
        Synonym node

    * get_sql(data, scid, syid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Synonym node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Synonym node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Synonym node.

    * compare(**kwargs):
      - This function will compare the synonyms nodes from two
        different schemas.
    """

    node_type = blueprint.node_type
    node_label = "Synonym"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    # If URL has an identifier containing slash character '/'
    # into the URI, then set param type to path. Because if
    # param name contains '/' in syid, it gets confused and
    # wrong url is generated.
    # Reference:- http://flask.pocoo.org/snippets/76/
    ids = [
        {'type': 'path', 'id': 'syid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'get_target_objects': [{'get': 'get_target_objects'},
                               {'get': 'get_target_objects'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'schema', 'synobjschema']

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
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            # If DB not connected then return error to browser
            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost."
                    )
                )

            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # we will set template path for sql scripts
            self.template_path = 'synonyms/sql/#{0}#'.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the synonym nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available synonym nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]), scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available synonym child nodes
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-synonym"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, syid=None):
        """
        Return Synonym node to generate node

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            syid: Synonym id
        """

        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            syid=syid, scid=scid
        )
        status, rset = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(self.not_found_error_msg())

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-%s" % self.node_type
                ),
                status=200
            )

    @check_precondition
    def get_target_objects(self, gid, sid, did, scid, syid=None):
        """
        This function will provide list of objects as per user selection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            syid: Synonym ID

        Returns:
            List of objects
        """
        res = []
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        is_valid_request = True
        if (
            'trgTyp' not in data or data['trgTyp'] is None or
            data['trgTyp'].strip() == ''
        ):
            is_valid_request = False

        if (
            'trgSchema' not in data or data['trgSchema'] is None or
            data['trgSchema'].strip() == ''
        ):
            is_valid_request = False

        if is_valid_request:
            sql = render_template("/".join([self.template_path,
                                            'get_objects.sql']),
                                  trgTyp=data['trgTyp'],
                                  trgSchema=data['trgSchema'])
            status, rset = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                res.append({'label': row['name'],
                            'value': row['name']})

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, syid):
        """
        This function will show the properties of the selected synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            syid: Synonym ID

        Returns:
            JSON of selected synonym node
        """
        status, res = self._fetch_properties(scid, syid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, syid):
        """
        This function is used to fetch the properties of the specified object
        :param scid:
        :param syid:
        :return:
        """
        try:
            SQL = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  scid=scid, syid=syid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return False, internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return False, gone(self.not_found_error_msg())

            res['rows'][0]['is_sys_obj'] = (
                res['rows'][0]['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
                self.datistemplate)
            return True, res['rows'][0]
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        required_args = [
            'name', 'targettype', 'synobjschema', 'synobjname'
        ]

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
            SQL = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn, comment=False)

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Find parent oid to add properly in tree browser
            SQL = render_template("/".join([self.template_path,
                                            'get_parent_oid.sql']),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            parent_id = res['rows'][0]['scid']
            syid = res['rows'][0]['syid']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    syid,
                    int(parent_id),
                    data['name'],
                    icon="icon-synonym"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, syid=None, only_sql=False):
        """
        This function will delete the existing synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
           only_sql: Return SQL only if True
        """
        if syid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [syid]}

        # Below will decide if it's simple drop or drop with cascade call

        try:
            for syid in data['ids']:
                SQL = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      scid=scid, syid=syid)

                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)

                if len(res['rows']) > 0:
                    data = res['rows'][0]
                else:
                    return gone(self.not_found_error_msg())

                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data,
                                      conn=self.conn)
                if only_sql:
                    return SQL

                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Synonym dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, syid):
        """
        This function will updates the existing synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        SQL, name = self.get_sql(gid, sid, data, scid, syid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL
        try:
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    syid,
                    scid,
                    name,
                    icon="icon-synonym"
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, syid=None):
        """
        This function will generates modified sql for synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        try:
            SQL, name = self.get_sql(gid, sid, data, scid, syid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                return make_json_response(
                    data=SQL,
                    status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, scid, syid=None):
        """
        This function will genrate sql from model data
        """
        name = None
        if syid is not None:
            SQL = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  scid=scid, syid=syid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(self.not_found_error_msg())
            old_data = res['rows'][0]
            name = old_data['name']
            # If target schema/object is not present then take it from
            # old data, it means it does not changed
            if 'synobjschema' not in data:
                data['synobjschema'] = old_data['synobjschema']
            if 'synobjname' not in data:
                data['synobjname'] = old_data['synobjname']

            SQL = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            required_args = [
                'name', 'targettype', 'synobjschema', 'synobjname'
            ]

            for arg in required_args:
                if arg not in data:
                    return gettext("-- missing definition")

            name = data['name']
            SQL = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]), comment=False,
                                  data=data, conn=self.conn)
        return SQL.strip('\n'), name

    @check_precondition
    def sql(self, gid, sid, did, scid, syid, **kwargs):
        """
        This function will generates reverse engineered sql for synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
           json_resp:
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, syid=syid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) > 0:
            data = res['rows'][0]
        else:
            return gone(self.not_found_error_msg())

        if target_schema:
            data['schema'] = target_schema

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, conn=self.conn, comment=True)
        if not json_resp:
            return SQL

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, syid):
        """
        This function get the dependents and return ajax response
        for the Synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            syid: Synonym ID
        """
        dependents_result = self.get_dependents(self.conn, syid)

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, syid):
        """
        This function get the dependencies and return ajax response
        for the Synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            syid: Synonym ID
        """
        dependencies_result = self.get_dependencies(self.conn, syid)

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the synonyms for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        if self.manager.server_type != 'ppas':
            return res

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]), scid=scid,
                              schema_diff=True)
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
            if target_schema:
                data['schema'] = target_schema
            sql, name = self.get_sql(gid, sid, data, scid, oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, syid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, syid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, syid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, SynonymView)
SynonymView.register_node_view(blueprint)
