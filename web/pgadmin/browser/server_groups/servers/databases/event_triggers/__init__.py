##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import re
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
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


class EventTriggerModule(CollectionNodeModule):
    """
    class EventTriggerModule(CollectionNodeModule)

        A module class for Event trigger node derived from
        CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the EventTriggerModule and it's base
        module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for Event trigger, when any of the database node
        is initialized.
    """

    _NODE_TYPE = 'event_trigger'
    _COLLECTION_LABEL = gettext("Event Triggers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the EventTriggerModule and it's base
        module.

        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)
        self.min_ver = 90300
        self.max_ver = None

    def get_nodes(self, gid, sid, did):
        """
        Generate the event_trigger node
        """
        yield self.generate_browser_collection_node(sid)

    @property
    def node_inode(self):
        """
        Always returns false, it is a leaf node, and do not have children
        nodes.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for event_trigger, when any of the database node
        is initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = EventTriggerModule(__name__)


class EventTriggerView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    class EventTriggerView(PGChildNodeView)

        A view class for event trigger node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating event trigger node, showing properties, showing sql in sql
        pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the EventTriggerView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - Lists proroperties of all the nodes of type - event trigger.

    * nodes()
      - Creates all the child nodes of type - event trigger.

    * properties(gid, sid, did, etid)
      - Returns the properties of the given event trigger node

    * update(gid, sid, did, etid)
      - Updates the data for the given event trigger node.

    * msql(gid, sid, did, etid)
      - Return modified SQL for the given event trigger node based on the
        request data.

    * get_sql(data, etid)
      - Generates the sql from model data

    * sql(gid, sid, did, etid):
      - Generates the reversed engineered query for the given event trigger
        node.

    * get_event_funcs(gid, sid, did, etid):
      - Returns the event functions available in that database.

    * dependents(gid, sid, did, etid):
      - Returns the dependents list for the given event trigger node.

    * dependencies(self, gid, sid, did, etid):
      - Returns the dependencies list for the given event trigger node.
    """

    node_type = blueprint.node_type
    node_icon = "icon-%s" % blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'etid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'fopts': [{'get': 'get_event_funcs'}, {'get': 'get_event_funcs'}]
    })

    keys_to_ignore = ['oid', 'xmin', 'oid-2', 'eventfuncoid', 'schemaoid',
                      'source']

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):

            # Here - args[0] will always hold self & kwargs will hold gid,
            # sid, did
            self = args[0]
            self.manager = get_driver(
                PG_DEFAULT_DRIVER
            ).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.template_path = 'event_triggers/sql/#{0}#'.format(
                self.manager.version)

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
        This function is used to list all the event trigger
        nodes within that collection.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        sql = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]))
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
        collection. Here it will create all the event trigger nodes.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        result = []
        sql = render_template("/".join([self.template_path, self._NODES_SQL]))
        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            result.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    self.node_icon,
                    description=row['comment']
                ))

        return make_json_response(
            data=result,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, etid):
        """
        This function will fetch properties of trigger node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:
          Json object of trigger node
        """
        sql = render_template("/".join([self.template_path, self._NODES_SQL]),
                              etid=etid)
        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    self.node_icon
                ),
                status=200
            )

        return gone(gettext("Could not find the specified event trigger."))

    def _formatter(self, result):
        """
        This function is ued to parse security lables
        """
        seclabels = []
        if 'seclabels' in result and result['seclabels'] is not None:
            for sec in result['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                seclabels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        result['seclabels'] = seclabels
        return result

    @check_precondition
    def properties(self, gid, sid, did, etid):
        """
        This function is used to list all the event trigger
        nodes within that collection.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        status, res = self._fetch_properties(did, etid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, etid):
        """
        This function fetch the properties of the event trigger.
        :param did:
        :param etid:
        :return:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            etid=etid, conn=self.conn
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("Could not find the event trigger information."))

        result = res['rows'][0]
        result['is_sys_obj'] = (
            result['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)
        result = self._formatter(result)

        return True, result

    @check_precondition
    def create(self, gid, sid, did):
        """
        This function will create a event trigger object.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        data = request.form if request.form else json.loads(
            request.data
        )

        required_args = {
            'name': 'Name',
            'eventowner': 'Owner',
            'eventfunname': 'Trigger function',
            'enabled': 'Enabled status',
            'eventname': 'Events'
        }
        err = []
        for arg in required_args:
            if arg not in data:
                err.append(required_args.get(arg, arg))
        if err:
            return make_json_response(
                status=400,
                success=0,
                errormsg=gettext(
                    "Could not find the required parameter ({}).").format(err)
            )
        try:
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn
            )
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)
            sql = render_template(
                "/".join([self.template_path, self._GRANT_SQL]),
                data=data, conn=self.conn
            )
            sql = sql.strip('\n').strip(' ')

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template(
                "/".join([self.template_path, self._OID_SQL]),
                data=data, conn=self.conn
            )
            status, etid = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=etid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    etid,
                    did,
                    data['name'],
                    self.node_icon
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, etid):
        """
        This function will update the data for the selected
        event trigger node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            sql = self.get_sql(data, etid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql

            if sql != "":
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                sql = render_template(
                    "/".join([self.template_path, self._OID_SQL]),
                    data=data, conn=self.conn
                )
                status, etid = self.conn.execute_scalar(sql)

                other_node_info = {}
                if 'comment' in data:
                    other_node_info['description'] = data['comment']

                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        etid,
                        did,
                        data['name'],
                        self.node_icon,
                        **other_node_info
                    )
                )
            else:
                return make_json_response(
                    success=1,
                    info="Nothing to update",
                    data={
                        'id': etid,
                        'sid': sid,
                        'gid': gid,
                        'did': did
                    }
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def get_delete_data(cmd, etid, request_object):
        """
        This function is used to get the data and cascade information.
        :param cmd: Command
        :param etid: Object ID
        :param request_object: request object
        :return:
        """
        cascade = False
        # Below will decide if it's simple drop or drop with cascade call
        if cmd == 'delete':
            # This is a cascade operation
            cascade = True

        if etid is None:
            data = request_object.form if request_object.form else \
                json.loads(request_object.data)
        else:
            data = {'ids': [etid]}

        return cascade, data

    @check_precondition
    def delete(self, gid, sid, did, etid=None, only_sql=False):
        """
        This function will delete an existing event trigger object.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID
          only_sql:

        Returns:

        """
        # get the value of cascade and data
        cascade, data = self.get_delete_data(self.cmd, etid, request)

        try:
            for etid in data['ids']:
                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    etid=etid
                )
                status, name = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=name)

                if name is None:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified event trigger could not be found.\n'
                        )
                    )

                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    name=name, cascade=cascade
                )

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Event trigger dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, etid=None):
        """
        This function is used to return modified SQL for the selected
        event trigger node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v)
            except ValueError:
                data[k] = v
        try:
            sql = self.get_sql(data, etid)
            # Most probably this is due to error
            if not isinstance(sql, str):
                return sql

            sql = re.sub('\n{2,}', '\n\n', sql)
            if sql == '':
                sql = "--modified SQL"
            return make_json_response(
                data=sql,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, data, etid=None):
        """
        This function will generate sql from model data.

        Args:
          data: Contains the data of the selected event trigger node.
          etid: Event trigger ID

        Returns:

        """
        required_args = [
            'name'
        ]

        if etid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                etid=etid
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the event trigger information.")
                )

            old_data = res['rows'][0]
            old_data = self._formatter(old_data)

            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]
            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data
            )
        else:
            sql = self._get_create_with_grant_sql(data)
        return sql.strip('\n')

    def _get_create_with_grant_sql(self, data):

        required_args = {
            'name': 'Name',
            'eventowner': 'Owner',
            'eventfunname': 'Trigger function',
            'enabled': 'Enabled status',
            'eventname': 'Events'
        }
        err = []
        for arg in required_args:
            if arg not in data:
                err.append(required_args.get(arg, arg))
        if err:
            return make_json_response(
                status=410,
                success=0,
                errormsg=gettext(
                    "Could not find the required parameter ({})."
                ).format(arg)
            )
        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            data=data
        )
        sql += "\n"
        sql += render_template(
            "/".join([self.template_path, self._GRANT_SQL]),
            data=data
        )
        return sql.strip('\n').strip(' ')

    @check_precondition
    def sql(self, gid, sid, did, etid, json_resp=True):
        """
        This function will generate sql to show in the sql pane for the
        selected event trigger node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID
          json_resp:

        Returns:

        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            etid=etid
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext(
                    "Could not find the specified event trigger on the "
                    "server.")
            )

        result = res['rows'][0]
        result = self._formatter(result)

        sql = render_template(
            "/".join([self.template_path, self._CREATE_SQL]),
            data=result, conn=self.conn
        )
        sql += "\n\n"
        sql += render_template(
            "/".join([self.template_path, self._GRANT_SQL]),
            data=result, conn=self.conn
        )

        db_sql = render_template(
            "/".join([self.template_path, 'get_db.sql']),
            did=did
        )
        status, db_name = self.conn.execute_scalar(db_sql)
        if not status:
            return internal_server_error(errormsg=db_name)

        sql_header = "-- Event Trigger: {0} on database {1}\n\n-- ".format(
            result['name'], db_name
        )

        sql_header += render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            name=result['name'], )
        sql_header += "\n"

        sql = sql_header + sql
        sql = re.sub('\n{2,}', '\n\n', sql)

        if not json_resp:
            return sql

        return ajax_response(response=sql)

    @check_precondition
    def get_event_funcs(self, gid, sid, did, etid=None):
        """
        This function gets the event functions and returns an ajax response
        for the event trigger node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        res = [{'label': '', 'value': ''}]
        sql = render_template(
            "/".join([self.template_path, 'eventfunctions.sql'])
        )
        status, rest = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rest)
        for row in rest['rows']:
            res.append(
                {'label': row['tfname'], 'value': row['tfname']}
            )
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def dependents(self, gid, sid, did, etid=None):
        """
        This function gets the dependents and returns an ajax response
        for the event trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            etid: Event trigger ID
        """
        dependents_result = self.get_dependents(self.conn, etid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, etid):
        """
        This function gets the dependencies and returns an ajax response
        for the event trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            etid: Event trigger ID
        """
        dependencies_result = self.get_dependencies(self.conn, etid)
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
            sql = self.get_sql(data=data, etid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  etid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, etid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, EventTriggerView, 'Database')
EventTriggerView.register_node_view(blueprint)
