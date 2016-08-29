##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Cast Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


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

    NODE_TYPE = 'cast'
    COLLECTION_LABEL = 'Casts'

    def __init__(self, *args, **kwargs):
        super(CastModule, self).__init__(*args, **kwargs)

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
        return databases.DatabaseModule.NODE_TYPE


blueprint = CastModule(__name__)


class CastView(PGChildNodeView):
    """
    class CastView(PGChildNodeView)

        A view class for cast node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like create/update/delete cast,
        showing properties of cast node, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the CastView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the cast nodes within that collection.

    * nodes()
      - This function will used to create all the child node within that collection.
        Here it will create all the cast nodes.

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
      - This function will generate sql to show in sql pane for the selected cast node.

    * get_type():
      - This function will fetch all the types for source and target types select control.

    * get_functions():
      - This function will fetch associated functions list depending on selected source
        and target types while creating a new cast node.
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
        'get_type': [{'get': 'get_src_and_trg_type'}, {'get': 'get_src_and_trg_type'}],
        'get_functions': [{'post': 'get_functions'}, {'post': 'get_functions'}]
    })

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.manager = None
        super(CastView, self).__init__(**kwargs)

    def module_js(self):
        """
        This property defines whether javascript exists for this node.
        """
        return make_response(
            render_template(
                "cast/js/casts.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set template path for the SQL scripts
            self.template_path = 'cast/sql/9.1_plus'

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
            (self.manager.db_info[did])['datlastsysoid'] \
            if self.manager.db_info is not None and \
            did in self.manager.db_info else 0
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            datlastsysoid=last_system_oid,
            showsysobj=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            row['castcontext'] = True if row['castcontext'] == 'IMPLICIT' else False

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function will used to create all the child nodes within the collection.
        Here it will create all the cast nodes.
        :param gid: group id
        :param sid: server id
        :param did: database id
        :return:
        """
        res = []
        last_system_oid = 0 if self.blueprint.show_system_objects else \
            (self.manager.db_info[did])['datlastsysoid'] \
            if self.manager.db_info is not None and \
            did in self.manager.db_info else 0
        sql = render_template(
            "/".join([self.template_path, 'nodes.sql']),
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
                    icon="icon-cast"
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
            "/".join([self.template_path, 'nodes.sql']),
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
                    icon="icon-fts_template"
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
        last_system_oid = (self.manager.db_info[did])['datlastsysoid'] if \
            self.manager.db_info is not None and \
            did in self.manager.db_info else 0
        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            cid=cid,
            datlastsysoid=last_system_oid,
            showsysobj=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the cast information.")
            )

        return ajax_response(
            response=res['rows'][0],
            status=200
        )

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
        try:
            sql = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data,
                                  conn=self.conn,
                                  )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            # we need oid to to add object in tree at browser, below sql will gives the same
            last_system_oid = 0 if self.blueprint.show_system_objects else \
                (self.manager.db_info[did])['datlastsysoid'] \
                if self.manager.db_info is not None and \
                did in self.manager.db_info else 0
            sql = render_template("/".join([self.template_path, 'properties.sql']),
                                  srctyp=data['srctyp'],
                                  trgtyp=data['trgtyp'],
                                  datlastsysoid=last_system_oid,
                                  showsysobj=self.blueprint.show_system_objects
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
            request.data, encoding='utf-8'
        )
        try:
            sql, name = self.get_sql(gid, sid, did, data, cid)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    cid,
                    did,
                    name,
                    "icon-{0}".format(self.node_type)
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, cid):
        """
        This function will drop the cast object
        :param cid: cast id
        :param did: database id
        :param sid: server id
        :param gid: group id
        :return:
        """
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # Get name for cast from cid
            sql = render_template("/".join([self.template_path, 'delete.sql']),
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
            sql = render_template("/".join([self.template_path, 'delete.sql']),
                                  castsource=result['castsource'],
                                  casttarget=result['casttarget'],
                                  cascade=cascade
                                  )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Cast dropped"),
                data={
                    'id': cid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

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
        try:
            sql, name = self.get_sql(gid, sid, did, data, cid)
            sql = sql.strip('\n').strip(' ')
            if sql == '':
                sql = "--modified SQL"

            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

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
                (self.manager.db_info[did])['datlastsysoid'] \
                if self.manager.db_info is not None and \
                did in self.manager.db_info else 0
            sql = render_template("/".join([self.template_path, 'properties.sql']),
                                  cid=cid,
                                  datlastsysoid=last_system_oid,
                                  showsysobj=self.blueprint.show_system_objects)
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            old_data = res['rows'][0]
            sql = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data
            )
            return str(sql), data['name'] if 'name' in data else old_data['name']
        else:
            if 'srctyp' in data and 'trgtyp' in data:
                sql = render_template("/".join([self.template_path, 'create.sql']), data=data, conn=self.conn)
            else:
                return "-- incomplete definition", None
            return str(sql), data['srctyp'] + "->" + data["trgtyp"]

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
            request.data, encoding='utf-8'
        )

        sql = render_template("/".join([self.template_path, 'functions.sql']),
                              srctyp=data['srctyp'],
                              trgtyp=data['trgtyp'])
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
    def sql(self, gid, sid, did, cid):
        """
        This function will generate sql for sql panel
        :param gid: group id
        :param sid: server id
        :param did: database id
        :param cid: cast id
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
                return internal_server_error(
                    _("Could not generate reversed engineered SQL for the cast.\n\n{0}").format(
                        res
                    )
                )

            if res is None:
                return gone(
                    _("Could not generate reversed engineered SQL for the cast node.\n")
                )

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


CastView.register_node_view(blueprint)
