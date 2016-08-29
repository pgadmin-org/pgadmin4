##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import simplejson as json
import re
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import gone

from config import PG_DEFAULT_DRIVER


class EventTriggerModule(CollectionNodeModule):
    """
    class EventTriggerModule(CollectionNodeModule)

        A module class for Event trigger node derived from CollectionNodeModule.

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

    NODE_TYPE = 'event_trigger'
    COLLECTION_LABEL = gettext("Event Triggers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the EventTriggerModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(EventTriggerModule, self).__init__(*args, **kwargs)
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
        return database.DatabaseModule.NODE_TYPE


blueprint = EventTriggerModule(__name__)


class EventTriggerView(PGChildNodeView):
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

    * module_js()
      - Returns the javascript module for event trigger.

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
            {'get': 'list', 'post': 'create'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'fopts': [{'get': 'get_event_funcs'}, {'get': 'get_event_funcs'}]
    })

    def module_js(self):
        """
        Returns the javascript module for event trigger.
        """
        return make_response(
            render_template(
                "event_triggers/js/event_trigger.js",
                _=gettext
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

            # Here - args[0] will always hold self & kwargs will hold gid, sid, did
            self = args[0]
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.template_path = 'event_triggers/sql/9.3_plus'

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
        sql = render_template("/".join([self.template_path, 'properties.sql']))
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
        This function is used to create all the child nodes within the collection.
        Here it will create all the event trigger nodes.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        result = []
        sql = render_template("/".join([self.template_path, 'nodes.sql']))
        status, res = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            result.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-%s" % self.node_type
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
        sql = render_template("/".join([self.template_path, 'nodes.sql']),
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
                    icon="icon-%s" % self.node_type
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
        sql = render_template("/".join([self.template_path, 'properties.sql']), etid=etid, conn=self.conn)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Couldnot find the event trigger information.")
            )

        result = res['rows'][0]
        result = self._formatter(result)

        return ajax_response(
            response=result,
            status=200
        )

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
            request.data, encoding='utf-8'
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
                    "Could not find the required parameter %s." % err
                )
            )
        try:
            sql = render_template("/".join([self.template_path, 'create.sql']), data=data, conn=self.conn)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)
            sql = render_template("/".join([self.template_path, 'grant.sql']), data=data, conn=self.conn)
            sql = sql.strip('\n').strip(' ')

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template("/".join([self.template_path, 'get_oid.sql']), data=data)
            status, etid = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=etid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    etid,
                    did,
                    data['name'],
                    icon="icon-%s" % self.node_type
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
            request.data, encoding='utf-8'
        )

        try:
            sql = self.get_sql(data, etid)
            sql = sql.strip('\n').strip(' ')
            if sql != "":
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                sql = render_template("/".join([self.template_path, 'get_oid.sql']), data=data)
                status, etid = self.conn.execute_scalar(sql)

                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        etid,
                        did,
                        data['name'],
                        icon="icon-%s" % self.node_type
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

    @check_precondition
    def delete(self, gid, sid, did, etid):
        """
        This function will delete an existing event trigger object.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """

        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False
        try:
            sql = render_template("/".join([self.template_path, 'delete.sql']), etid=etid)
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

            sql = render_template("/".join([self.template_path, 'delete.sql']), name=name, cascade=cascade)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Event trigger dropped"),
                data={
                    'id': etid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
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
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v
        try:
            sql = self.get_sql(data, etid)
            sql = sql.strip('\n').strip(' ')
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
            sql = render_template("/".join([self.template_path, 'properties.sql']), etid=etid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Couldnot find the event trigger information.")
                )

            old_data = res['rows'][0]
            old_data = self._formatter(old_data)

            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]
            sql = render_template("/".join([self.template_path, 'update.sql']), data=data, o_data=old_data)
        else:
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
                        "Could not find the required parameter %s." % err
                    )
                )
            sql = render_template("/".join([self.template_path, 'create.sql']), data=data)
            sql += "\n"
            sql += render_template("/".join([self.template_path, 'grant.sql']), data=data)
        return sql

    @check_precondition
    def sql(self, gid, sid, did, etid):
        """
        This function will generate sql to show in the sql pane for the selected
        event trigger node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          etid: Event trigger ID

        Returns:

        """
        try:
            sql = render_template("/".join([self.template_path, 'properties.sql']), etid=etid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            result = res['rows'][0]
            result = self._formatter(result)

            sql = render_template("/".join([self.template_path, 'create.sql']), data=result, conn=self.conn)
            sql += "\n\n"
            sql += render_template("/".join([self.template_path, 'grant.sql']), data=result, conn=self.conn)

            db_sql = render_template("/".join([self.template_path, 'get_db.sql']), did=did)
            status, db_name = self.conn.execute_scalar(db_sql)
            if not status:
                return internal_server_error(errormsg=db_name)

            sql_header = "-- Event Trigger: {0} on database {1}\n\n-- ".format(result['name'], db_name)
            if hasattr(str, 'decode'):
                sql_header = sql_header.decode('utf-8')

            sql_header += render_template(
                "/".join([self.template_path, 'delete.sql']),
                name=result['name'], )
            sql_header += "\n"

            sql = sql_header + sql

            return ajax_response(response=sql)

        except Exception as e:
            return ajax_response(response=str(e))

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
        sql = render_template("/".join([self.template_path, 'eventfunctions.sql']))
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


EventTriggerView.register_node_view(blueprint)
