##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements DBMS Schedule objects Node."""

import json
from functools import wraps

from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers import databases
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.constants import DBMS_JOB_SCHEDULER_ID
from pgadmin.browser.server_groups.servers.databases.dbms_job_scheduler.utils \
    import resolve_calendar_string, create_calendar_string


class DBMSScheduleModule(CollectionNodeModule):
    """
     class DBMSScheduleModule(CollectionNodeModule)

        A module class for DBMS Schedule objects node derived
        from CollectionNodeModule.

    Methods:
    -------

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for DBMS Schedule objects, when any of
       the server node is initialized.
    """
    _NODE_TYPE = 'dbms_schedule'
    _COLLECTION_LABEL = gettext("DBMS Schedules")

    @property
    def collection_icon(self):
        """
        icon to be displayed for the browser collection node
        """
        return 'icon-coll-pga_schedule'

    @property
    def node_icon(self):
        """
        icon to be displayed for the browser nodes
        """
        return 'icon-pga_schedule'

    def get_nodes(self, gid, sid, did, jsid):
        """
        Generate the collection node
        """
        if self.show_node:
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
        Load the module script for server, when any of the database node is
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


blueprint = DBMSScheduleModule(__name__)


class DBMSScheduleView(PGChildNodeView):
    """
    class DBMSScheduleView(PGChildNodeView)

        A view class for DBMSSchedule node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating schedule node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the DBMSScheduleView, and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the schedule nodes within that
      collection.

    * nodes()
      - This function will use to create all the child node within that
      collection. Here it will create all the schedule node.

    * properties(gid, sid, did, jsid, jsscid)
      - This function will show the properties of the selected schedule node

    * create(gid, sid, did, jsid, jsscid)
      - This function will create the new schedule object

    * msql(gid, sid, did, jsid, jsscid)
      - This function is used to return modified SQL for the
      selected schedule node

    * sql(gid, sid, did, jsid, jsscid)
      - Dummy response for sql panel

    * delete(gid, sid, did, jsid, jsscid)
      - Drops job schedule
    """

    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = 'dbms_schedules/ppas/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'jsid'}
    ]
    ids = [
        {'type': 'int', 'id': 'jsscid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'sql': [{'get': 'sql'}]
    })

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
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set the template path for the SQL scripts
            self.template_path = self.BASE_TEMPLATE_PATH.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, jsid):
        """
        This function is used to list all the schedule nodes within
        that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]))
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, jsid, jsscid=None):
        """
        This function is used to create all the child nodes within
        the collection. Here it will create all the schedule nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
        """
        res = []
        try:
            sql = render_template(
                "/".join([self.template_path, self._NODES_SQL]))

            status, result = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=result)

            if jsscid is not None:
                if len(result['rows']) == 0:
                    return gone(
                        errormsg=gettext("Could not find the specified "
                                         "schedule.")
                    )

                row = result['rows'][0]
                return make_json_response(
                    data=self.blueprint.generate_browser_node(
                        row['jsscid'],
                        DBMS_JOB_SCHEDULER_ID,
                        row['jsscname'],
                        icon="icon-pga_schedule",
                        description=row['jsscdesc']
                    )
                )

            for row in result['rows']:
                res.append(
                    self.blueprint.generate_browser_node(
                        row['jsscid'],
                        DBMS_JOB_SCHEDULER_ID,
                        row['jsscname'],
                        icon="icon-pga_schedule",
                        description=row['jsscdesc']
                    )
                )

            return make_json_response(
                data=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def properties(self, gid, sid, did, jsid, jsscid):
        """
        This function will show the properties of the selected schedule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
            jsscid: JobSchedule ID
        """
        try:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                jsscid=jsscid
            )
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    errormsg=gettext("Could not find the specified schedule.")
                )

            # Resolve the repeat interval string
            if 'jsscrepeatint' in res['rows'][0]:
                (freq, by_date, by_month, by_month_day, by_weekday, by_hour,
                 by_minute) = resolve_calendar_string(
                    res['rows'][0]['jsscrepeatint'])

                res['rows'][0]['jsscfreq'] = freq
                res['rows'][0]['jsscdate'] = by_date
                res['rows'][0]['jsscmonths'] = by_month
                res['rows'][0]['jsscmonthdays'] = by_month_day
                res['rows'][0]['jsscweekdays'] = by_weekday
                res['rows'][0]['jsschours'] = by_hour
                res['rows'][0]['jsscminutes'] = by_minute

            return ajax_response(
                response=res['rows'][0],
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def create(self, gid, sid, did, jsid):
        """
        This function will create the schedule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
        """
        data = json.loads(request.data)
        try:
            # Create calendar string for repeat interval
            repeat_interval = create_calendar_string(
                data['jsscfreq'], data['jsscdate'], data['jsscmonths'],
                data['jsscmonthdays'], data['jsscweekdays'], data['jsschours'],
                data['jsscminutes'])

            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                schedule_name=data['jsscname'],
                start_date=data['jsscstart'],
                repeat_interval=repeat_interval,
                end_date=data['jsscend'],
                comments=data['jsscdesc'],
                conn=self.conn
            )

            status, res = self.conn.execute_void('BEGIN')
            if not status:
                return internal_server_error(errormsg=res)

            status, res = self.conn.execute_scalar(sql)
            if not status:
                if self.conn.connected():
                    self.conn.execute_void('END')
                return internal_server_error(errormsg=res)

            self.conn.execute_void('END')

            # Get the newly created Schedule id
            sql = render_template(
                "/".join([self.template_path, 'get_schedule_id.sql']),
                jsscname=data['jsscname'], conn=self.conn
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    errormsg=gettext("Job schedule creation failed.")
                )
            row = res['rows'][0]

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    row['jsscid'],
                    DBMS_JOB_SCHEDULER_ID,
                    row['jsscname'],
                    icon="icon-pga_schedule"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, jsid, jsscid=None):
        """Delete the Job Schedule."""

        if jsscid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [jsscid]}

        try:
            for jsscid in data['ids']:
                sql = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    jsscid=jsscid
                )

                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                jsscname = res['rows'][0]['jsscname']

                status, res = self.conn.execute_void(
                    render_template(
                        "/".join([self.template_path, self._DELETE_SQL]),
                        schedule_name=jsscname, force=False, conn=self.conn
                    )
                )
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(success=1)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, jsid, jsscid=None):
        """
        This function is used to return modified SQL for the
        selected Schedule node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
            jsscid: Job Schedule ID (optional)
        """
        data = {}
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('jsscdesc',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        try:
            # Create calendar string for repeat interval
            repeat_interval = create_calendar_string(
                data['jsscfreq'], data['jsscdate'], data['jsscmonths'],
                data['jsscmonthdays'], data['jsscweekdays'], data['jsschours'],
                data['jsscminutes'])

            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                schedule_name=data['jsscname'],
                start_date=data['jsscstart'],
                repeat_interval=repeat_interval,
                end_date=data['jsscend'],
                comments=data['jsscdesc'],
                conn=self.conn
            )

            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, jsid, jsscid):
        """
        This function will generate sql for the sql panel
        """
        try:
            SQL = render_template("/".join(
                [self.template_path, self._PROPERTIES_SQL]
            ), jsscid=jsscid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the DBMS Schedule.")
                )

            data = res['rows'][0]

            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                display_comments=True,
                schedule_name=data['jsscname'],
                start_date=data['jsscstart'],
                repeat_interval=data['jsscrepeatint'],
                end_date=data['jsscend'],
                comments=data['jsscdesc'],
                conn=self.conn
            )

            return ajax_response(response=SQL)
        except Exception as e:
            return internal_server_error(errormsg=str(e))


DBMSScheduleView.register_node_view(blueprint)
