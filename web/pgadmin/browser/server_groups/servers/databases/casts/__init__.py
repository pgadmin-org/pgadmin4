##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Cast Node"""

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


class CastModule(CollectionNodeModule):
    """
     class CastModule(CollectionNodeModule)

        A module class for Cast node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the CastModule and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for cast, when any of the database node is
        initialized.
    """

    _NODE_TYPE = 'cast'
    _COLLECTION_LABEL = gettext('Casts')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did):
        """
        Generate the collection node
        :param gid: group id
        :param sid: server id
        :param did: database id
        """
        yield self.generate_browser_collection_node(did)

    @property
    def node_inode(self):
        """
        Override the property to make the node as leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for cast, when any of the database node is
        initialized.
        """
        return databases.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = CastModule(__name__)


class CastView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class CastView(PGChildNodeView)

        A view class for cast node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like
        create/update/delete cast, showing properties of cast node,
        showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the CastView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the cast nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
      collection. Here it will create all the cast nodes.

    * properties(gid, sid, did, rg_id)
      - This function will show the properties of the selected cast node

    * create(gid, sid, did, rg_id)
      - This function will create the new cast object

    * update(gid, sid, did, rg_id)
      - This function will update the data for the selected cast node

    * delete(self, gid, sid, rg_id):
      - This function will drop the cast object

    * msql(gid, sid, did, rg_id)
      - This function is used to return modified SQL for the selected cast node

    * get_sql(data, rg_id)
      - This function will generate sql from model data

    * sql(gid, sid, did, rg_id):
      - This function will generate sql to show in sql pane for the selected
      cast node.

    * get_type():
      - This function will fetch all the types for source and target types
      select control.

    * get_functions():
      - This function will fetch associated functions list depending on
      selected source and target types while creating a new cast node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'cid'}
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
        'get_type': [
            {'get': 'get_src_and_trg_type'},
            {'get': 'get_src_and_trg_type'}
        ],
        'get_functions': [
            {'post': 'get_functions'},
            {'post': 'get_functions'}
        ],
        'compare': [{'get': 'compare'}, {'get': 'compare'}]
    })

    keys_to_ignore = ['oid', 'id', 'oid-2', 'castfunc']

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super().__init__(**kwargs)

    def check_precondition(f):
        """
        This function will behave as a decorator which will check the
        database connection before running view. It will also attach
        manager, conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.manager = get_driver(
                PG_DEFAULT_DRIVER
            ).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set template path for the SQL scripts
            self.template_path = 'casts/sql/#{0}#'.format(self.manager.version)

            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the cast nodes within the collection.
        :param gid: group id
        :param sid: server id
        :param did: database id
        :return:
        """
        last_system_oid = 0 if self.blueprint.show_system_objects else \
            self._DATABASE_LAST_SYSTEM_OID
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            datlastsysoid=last_system_oid,
            showsysobj=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            row['castcontext'] = True if row['castcontext'] == 'IMPLICIT' \
                else False

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function will used to create all the child nodes within the
        collection. Here it will create all the cast nodes.
        :param gid: group id
        :param sid: server id
        :param did: database id
        :return:
        """
        res = []
        last_system_oid = 0 if self.blueprint.show_system_objects else \
            self._DATABASE_LAST_SYSTEM_OID

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            datlastsysoid=last_system_oid,
            showsysobj=self.blueprint.show_system_objects
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-cast",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, cid):
        """
        This function will fetch properties of the cast node
        """
        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            cid=cid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-cast"
                ),
                status=200
            )

        return gone(errormsg=gettext("Could not find the specified cast."))

    @check_precondition
    def properties(self, gid, sid, did, cid):
        """
        This function will show the properties of the selected cast node
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param cid: cast id
        :return:
        """
        status, res = self._fetch_properties(did, cid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, cid):
        """
        This function fetch the properties of the
        :param did:
        :param cid:
        :return:
        """
        last_system_oid = 0 if not self.blueprint.show_system_objects else \
            self._DATABASE_LAST_SYSTEM_OID
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            cid=cid,
            datlastsysoid=last_system_oid,
            showsysobj=self.blueprint.show_system_objects,
            conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("Could not find the cast information.")
            )

        return True, res['rows'][0]

    @check_precondition
    def create(self, gid, sid, did):
        """
        This function will creates new the cast object
        :param did: database id
        :param sid: server id
        :param gid: group id
        :return:
        """

        required_args = [
            'srctyp',
            'trgtyp'
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
                                  data=data,
                                  conn=self.conn,
                                  )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            # we need oid to add object in tree at browser, below sql will
            # gives the same
            last_system_oid = 0 if self.blueprint.show_system_objects else \
                self._DATABASE_LAST_SYSTEM_OID
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                srctyp=data['srctyp'],
                trgtyp=data['trgtyp'],
                datlastsysoid=last_system_oid,
                showsysobj=self.blueprint.show_system_objects,
                conn=self.conn
            )
            status, cid = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=cid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    cid,
                    did,
                    data['name'],
                    icon="icon-cast"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, cid):
        """
        This function will update cast object
        :param cid: cast id
        :param did: database id
        :param sid: server id
        :param gid: group id
        :return:
        """
        data = request.form if request.form else json.loads(
            request.data
        )
        try:
            sql, name = self.get_sql(gid, sid, did, data, cid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            other_node_info = {}
            if 'description' in data:
                other_node_info['description'] = data['description']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    cid,
                    did,
                    name,
                    "icon-{0}".format(self.node_type),
                    **other_node_info
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def get_delete_data(cmd, cid, request_object):
        """
        This function is used to get the data and cascade information.
        :param cmd: Command
        :param cid: Object ID
        :param request_object: request object
        :return:
        """
        cascade = False
        # Below will decide if it's simple drop or drop with cascade call
        if cmd == 'delete':
            # This is a cascade operation
            cascade = True

        if cid is None:
            data = request_object.form if request_object.form else \
                json.loads(request_object.data)
        else:
            data = {'ids': [cid]}

        return cascade, data

    @check_precondition
    def delete(self, gid, sid, did, cid=None, only_sql=False):
        """
        This function will drop the cast object
        :param cid: cast id
        :param did: database id
        :param sid: server id
        :param gid: group id
        :param only_sql:
        :return:
        """
        # get the value of cascade and data
        cascade, data = self.get_delete_data(self.cmd, cid, request)

        for cid in data['ids']:
            try:
                # Get name for cast from cid
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      cid=cid)
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                if not res['rows']:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified cast object could not be found.\n'
                        )
                    )

                # drop cast
                result = res['rows'][0]
                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      castsource=result['castsource'],
                                      casttarget=result['casttarget'],
                                      cascade=cascade
                                      )

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            except Exception as e:
                return internal_server_error(errormsg=str(e))

        return make_json_response(
            success=1,
            info=gettext("Cast dropped")
        )

    @check_precondition
    def msql(self, gid, sid, did, cid=None):
        """
         This function returns modified SQL
         :param cid: cast id
         :param did: database id
         :param sid: server id
         :param gid: group id
         :return:
        """
        data = request.args
        sql, name = self.get_sql(gid, sid, did, data, cid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql
        sql = sql.strip('\n').strip(' ')
        if sql == '':
            sql = "--modified SQL"

        return make_json_response(
            data=sql,
            status=200
        )

    def get_sql(self, gid, sid, did, data, cid=None):
        """
        This function will return sql for model data
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param cid: cast id
        :param data: model data
        :return:
        """
        if cid is not None:
            last_system_oid = 0 if self.blueprint.show_system_objects else \
                self._DATABASE_LAST_SYSTEM_OID
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                cid=cid,
                datlastsysoid=last_system_oid,
                showsysobj=self.blueprint.show_system_objects,
                conn=self.conn
            )
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the specified cast on the server.")
                )

            old_data = res['rows'][0]
            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
            return sql, data['name'] if 'name' in data else old_data['name']
        else:
            if 'srctyp' in data and 'trgtyp' in data:
                sql = render_template(
                    "/".join([self.template_path, self._CREATE_SQL]),
                    data=data, conn=self.conn
                )
            else:
                return gettext("-- definition incomplete"), None
            return sql, data['srctyp'] + "->" + data["trgtyp"]

    @check_precondition
    def get_functions(self, gid, sid, did, cid=None):
        """
        This function will return functions list associated with a cast
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param cid: cast id
        :return:
        """
        res = []
        data = request.form if request.form else json.loads(
            request.data
        )

        sql = render_template("/".join([self.template_path,
                                        self._FUNCTIONS_SQL]),
                              srctyp=data['srctyp'],
                              trgtyp=data['trgtyp'],
                              conn=self.conn)
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)
        res.append({'label': '',
                    'value': ''})

        for row in rset['rows']:
            res.append({'label': row['proname'],
                        'value': row['proname']})
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def get_src_and_trg_type(self, gid, sid, did, cid=None):
        """
        This function will return type list
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param cid: cast id
        :return:
        """
        res = []
        sql = render_template(
            "/".join([self.template_path, 'getsrcandtrgttype.sql']),
            cid=cid
        )
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        res = [{'label': '', 'value': ''}]
        for row in rset['rows']:
            res.append({
                'label': row['typname'],
                'value': row['typname']
            })

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, cid, json_resp=True):
        """
        This function will generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param cid: cast id
        :param json_resp:
        :return:
        """
        try:
            sql = render_template(
                "/".join([self.template_path, 'sql.sql']),
                cid=cid,
                conn=self.conn
            )

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(gettext(
                    "Could not generate reversed engineered SQL for the cast."
                ) + "\n\n{0}".format(res))

            if res is None:
                return gone(gettext(
                    "Could not generate reversed engineered SQL for the "
                    "cast node."
                ))

            if not json_resp:
                return res

            return ajax_response(response=res)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, cid):
        """
        This function gets the dependents and returns an ajax response
        for the cast node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            cid: Cast ID
        """
        dependents_result = self.get_dependents(self.conn, cid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, cid):
        """
        This function gets the dependencies and returns an ajax response
        for the cast node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            cid: Cast ID
        """
        dependencies_result = self.get_dependencies(self.conn, cid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did):
        """
        This function will fetch the list of all the casts for
        specified database id.

        :param sid: Server Id
        :param did: Database Id
        :return:
        """
        res = dict()

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
            showsysobj=self.blueprint.show_system_objects,
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
            sql, name = self.get_sql(gid=gid, sid=sid, did=did, data=data,
                                     cid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  cid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, cid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, CastView, 'Database')
CastView.register_node_view(blueprint)
