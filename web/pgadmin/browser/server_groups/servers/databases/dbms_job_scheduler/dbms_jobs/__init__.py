##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements DBMS Job objects Node."""

import json
from functools import wraps

from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers import databases
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, gone, \
    make_response as ajax_response, internal_server_error, success_return
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.constants import DBMS_JOB_SCHEDULER_ID
from pgadmin.browser.server_groups.servers.databases.schemas.functions.utils \
    import format_arguments_from_db
from pgadmin.browser.server_groups.servers.databases.dbms_job_scheduler.utils \
    import (resolve_calendar_string, create_calendar_string,
            get_formatted_program_args)


class DBMSJobModule(CollectionNodeModule):
    """
     class DBMSJobModule(CollectionNodeModule)

        A module class for DBMS Job objects node derived
        from CollectionNodeModule.

    Methods:
    -------

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for DBMS Job objects, when any of
       the server node is initialized.
    """
    _NODE_TYPE = 'dbms_job'
    _COLLECTION_LABEL = gettext("DBMS Jobs")

    @property
    def collection_icon(self):
        """
        icon to be displayed for the browser collection node
        """
        return 'icon-coll-pga_job'

    @property
    def node_icon(self):
        """
        icon to be displayed for the browser nodes
        """
        return 'icon-pga_job'

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


blueprint = DBMSJobModule(__name__)


class DBMSJobView(PGChildNodeView):
    """
    class DBMSJobView(PGChildNodeView)

        A view class for DBMSJob node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating job node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the DBMSJobView, and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the job nodes within that
      collection.

    * nodes()
      - This function will use to create all the child node within that
      collection. Here it will create all the job node.

    * properties(gid, sid, did, jsid, jsjobid)
      - This function will show the properties of the selected job node

    * create(gid, sid, did, jsid, jsjobid)
      - This function will create the new job object

    * msql(gid, sid, did, jsid, jsjobid)
      - This function is used to return modified SQL for the
      selected job node

    * sql(gid, sid, did, jsid, jsjobid)
      - Dummy response for sql panel

    * delete(gid, sid, did, jsid, jsjobid)
      - Drops job
    """

    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = 'dbms_jobs/ppas/#{0}#'
    PROGRAM_TEMPLATE_PATH = 'dbms_programs/ppas/#{0}#'
    SCHEDULE_TEMPLATE_PATH = 'dbms_schedules/ppas/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'jsid'}
    ]
    ids = [
        {'type': 'int', 'id': 'jsjobid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'sql': [{'get': 'sql'}],
        'get_procedures': [{}, {'get': 'get_procedures'}],
        'enable_disable': [{'put': 'enable_disable'}],
        'get_programs': [{}, {'get': 'get_programs'}],
        'get_schedules': [{}, {'get': 'get_schedules'}],
        'run_job': [{'put': 'run_job'}],
    })

    def _init_(self, **kwargs):
        self.conn = None
        self.template_path = None
        self.pr_template_path = None
        self.sch_template_path = None
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
            self.pr_template_path = self.PROGRAM_TEMPLATE_PATH.format(
                self.manager.version)
            self.sch_template_path = self.SCHEDULE_TEMPLATE_PATH.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, jsid):
        """
        This function is used to list all the job nodes within
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
    def nodes(self, gid, sid, did, jsid, jsjobid=None):
        """
        This function is used to create all the child nodes within
        the collection. Here it will create all the job nodes.

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

            if jsjobid is not None:
                if len(result['rows']) == 0:
                    return gone(
                        errormsg=gettext("Could not find the specified job.")
                    )

                row = result['rows'][0]
                return make_json_response(
                    data=self.blueprint.generate_browser_node(
                        row['jsjobid'],
                        DBMS_JOB_SCHEDULER_ID,
                        row['jsjobname'],
                        is_enabled=row['jsjobenabled'],
                        icon="icon-pga_job" if row['jsjobenabled'] else
                        "icon-pga_job-disabled",
                        description=row['jsjobdesc']
                    )
                )

            for row in result['rows']:
                res.append(
                    self.blueprint.generate_browser_node(
                        row['jsjobid'],
                        DBMS_JOB_SCHEDULER_ID,
                        row['jsjobname'],
                        is_enabled=row['jsjobenabled'],
                        icon="icon-pga_job" if row['jsjobenabled'] else
                        "icon-pga_job-disabled",
                        description=row['jsjobdesc']
                    )
                )

            return make_json_response(
                data=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def properties(self, gid, sid, did, jsid, jsjobid):
        """
        This function will show the properties of the selected job node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
            jsjobid: Job ID
        """
        try:
            status, data = self._fetch_properties(jsjobid)
            if not status:
                return data

            return ajax_response(
                response=data,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _fetch_properties(self, jsjobid):
        """
        This function is used to fetch the properties.
        Args:
            jsjobid:
        """
        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            jsjobid=jsjobid
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                errormsg=gettext("Could not find the specified job.")
            )

        data = res['rows'][0]

        # If 'jsjobscname' and 'jsjobprname' in data then set the jsjobtype
        if ('jsjobscname' in data and data['jsjobscname'] is not None and
                'jsjobprname' in data and data['jsjobprname'] is not None):
            data['jsjobtype'] = 'p'
        else:
            data['jsjobtype'] = 's'

        # Resolve the repeat interval string
        if 'jsscrepeatint' in data:
            (freq, by_date, by_month, by_month_day, by_weekday, by_hour,
             by_minute) = resolve_calendar_string(
                data['jsscrepeatint'])

            data['jsscfreq'] = freq
            data['jsscdate'] = by_date
            data['jsscmonths'] = by_month
            data['jsscmonthdays'] = by_month_day
            data['jsscweekdays'] = by_weekday
            data['jsschours'] = by_hour
            data['jsscminutes'] = by_minute

        # Get Program's arguments
        sql = render_template(
            "/".join([self.pr_template_path, self._PROPERTIES_SQL]),
            jsprid=data['program_id']
        )
        status, res_program = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res_program)

        # Update the data dictionary.
        if len(res_program['rows']) > 0:
            # Get the formatted program args
            get_formatted_program_args(self.pr_template_path, self.conn,
                                       res_program['rows'][0])
            # Get the job argument value
            self.get_job_args_value(self.template_path, self.conn,
                                    data['jsjobname'],
                                    res_program['rows'][0])
            data['jsprarguments'] = res_program['rows'][0]['jsprarguments'] \
                if 'jsprarguments' in res_program['rows'][0] else []

        return True, data

    @check_precondition
    def create(self, gid, sid, did, jsid):
        """
        This function will create the job node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
        """
        data = json.loads(request.data)
        try:
            # Get the SQL
            sql, _, _ = self.get_sql(None, data)

            status, res = self.conn.execute_void('BEGIN')
            if not status:
                return internal_server_error(errormsg=res)

            status, res = self.conn.execute_scalar(sql)
            if not status:
                if self.conn.connected():
                    self.conn.execute_void('END')
                return internal_server_error(errormsg=res)

            self.conn.execute_void('END')

            # Get the newly created job id
            sql = render_template(
                "/".join([self.template_path, 'get_job_id.sql']),
                job_name=data['jsjobname'], conn=self.conn
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    errormsg=gettext("Job creation failed.")
                )
            row = res['rows'][0]

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    row['jsjobid'],
                    DBMS_JOB_SCHEDULER_ID,
                    row['jsjobname'],
                    is_enabled=row['jsjobenabled'],
                    icon="icon-pga_job" if row['jsjobenabled'] else
                    "icon-pga_job-disabled"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, jsid, jsjobid=None):
        """
        This function will update job object

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            sql, jobname, jobenabled = self.get_sql(jsjobid, data)

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    jsjobid,
                    DBMS_JOB_SCHEDULER_ID,
                    jobname,
                    icon="icon-pga_job" if jobenabled else
                    "icon-pga_job-disabled"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, jsid, jsjobid=None):
        """Delete the Job."""

        if jsjobid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [jsjobid]}

        try:
            for jsjobid in data['ids']:
                status, data = self._fetch_properties(jsjobid)
                if not status:
                    return data

                jsjobname = data['jsjobname']

                status, res = self.conn.execute_void(
                    render_template(
                        "/".join([self.template_path, self._DELETE_SQL]),
                        job_name=jsjobname, conn=self.conn
                    )
                )
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(success=1)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, jsid, jsjobid=None):
        """
        This function is used to return modified SQL for the
        selected job node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
            jsjobid: Job ID (optional)
        """
        data = {}
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('jsjobdesc',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        sql, _, _ = self.get_sql(jsjobid, data)

        return make_json_response(
            data=sql,
            status=200
        )

    def get_sql(self, jsjobid, data):
        """
        This function is used to get the SQL.
        """
        sql = ''
        name = ''
        enabled = True
        if jsjobid is None:
            name = data['jsjobname']
            enabled = data['jsjobenabled']

            # Create calendar string for repeat interval
            repeat_interval = create_calendar_string(
                data['jsscfreq'], data['jsscdate'], data['jsscmonths'],
                data['jsscmonthdays'], data['jsscweekdays'], data['jsschours'],
                data['jsscminutes'])

            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                job_name=data['jsjobname'],
                internal_job_type=data['jsjobtype'],
                job_type=data['jsprtype'],
                job_action=data['jsprproc']
                if data['jsprtype'] == 'STORED_PROCEDURE' else
                data['jsprcode'],
                enabled=data['jsjobenabled'],
                comments=data['jsjobdesc'],
                number_of_arguments=data['jsprnoofargs'],
                start_date=data['jsscstart'],
                repeat_interval=repeat_interval,
                end_date=data['jsscend'],
                program_name=data['jsjobprname'],
                schedule_name=data['jsjobscname'],
                arguments=data['jsprarguments'] if 'jsprarguments' in data
                else [],
                conn=self.conn
            )
        elif jsjobid is not None and 'jsprarguments' in data:
            status, res = self._fetch_properties(jsjobid)
            if not status:
                return res

            name = res['jsjobname']
            enabled = res['jsjobenabled']
            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                job_name=res['jsjobname'],
                changed_value=data['jsprarguments']['changed'],
                conn=self.conn
            )

        return sql, name, enabled

    @check_precondition
    def sql(self, gid, sid, did, jsid, jsjobid):
        """
        This function will generate sql for the sql panel
        """
        try:
            status, data = self._fetch_properties(jsjobid)
            if not status:
                return ''

            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                display_comments=True,
                job_name=data['jsjobname'],
                internal_job_type=data['jsjobtype'],
                job_type=data['jsprtype'],
                job_action=data['jsprproc']
                if data['jsprtype'] == 'STORED_PROCEDURE' else
                data['jsprcode'],
                enabled=data['jsjobenabled'],
                comments=data['jsjobdesc'],
                number_of_arguments=data['jsprnoofargs'],
                start_date=data['jsscstart'],
                repeat_interval=data['jsscrepeatint'],
                end_date=data['jsscend'],
                program_name=data['jsjobprname'],
                schedule_name=data['jsjobscname'],
                arguments=data['jsprarguments'] if 'jsprarguments' in data
                else [],
                conn=self.conn
            )

            return ajax_response(response=SQL)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_procedures(self, gid, sid, did, jsid=None):
        """
        This function will return procedure list
        :param gid: group id
        :param sid: server id
        :param did: database id
        :return:
        """
        res = []
        sql = render_template("/".join([self.pr_template_path,
                                        'get_procedures.sql']),
                              datlastsysoid=self._DATABASE_LAST_SYSTEM_OID)
        status, rset = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            # Get formatted Arguments
            frmtd_params, _ = format_arguments_from_db(
                self.template_path, self.conn, row)

            res.append({'label': row['proc_name'],
                        'value': row['proc_name'],
                        'no_of_args': row['number_of_arguments'],
                        'arguments': frmtd_params['arguments']
                        })

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def enable_disable(self, gid, sid, did, jsid, jsjobid=None):
        """
        This function is used to enable/disable job.
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.pr_template_path, 'enable_disable.sql']),
                name=data['job_name'],
                is_enable=data['is_enable_job'], conn=self.conn
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            success=1,
            info=gettext("Job enabled") if data['is_enable_job'] else
            gettext('Job disabled'),
            data={
                'sid': sid,
                'did': did,
                'jsid': jsid,
                'jsjobid': jsjobid
            }
        )

    @check_precondition
    def get_programs(self, gid, sid, did, jsid=None):
        """
        This function will return procedure list
        :param gid: group id
        :param sid: server id
        :param did: database id
        :return:
        """
        res = []
        sql = render_template("/".join([self.pr_template_path,
                                        self._NODES_SQL]),
                              datlastsysoid=self._DATABASE_LAST_SYSTEM_OID)
        status, rset = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append({'label': row['jsprname'],
                        'value': row['jsprname']})

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def get_schedules(self, gid, sid, did, jsid=None):
        """
        This function will return procedure list
        :param gid: group id
        :param sid: server id
        :param did: database id
        :return:
        """
        res = []
        sql = render_template("/".join([self.sch_template_path,
                                        self._NODES_SQL]))
        status, rset = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append({'label': row['jsscname'],
                        'value': row['jsscname']
                        })

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def run_job(self, gid, sid, did, jsid, jsjobid=None):
        """
        This function is used to run the job now.
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            status, res = self.conn.execute_void(
                render_template(
                    "/".join([self.template_path, 'run_job.sql']),
                    job_name=data['job_name'], conn=self.conn
                )
            )
            if not status:
                return internal_server_error(errormsg=res)

            return success_return(
                message=gettext("Started the Job execution.")
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_job_args_value(self, template_path, conn, jobname, data):
        """
        This function is used to get the job arguments value.
        Args:
            template_path:
            conn:
            jobname:
            data:

        Returns:

        """
        if 'jsprarguments' in data and len(data['jsprarguments']) > 0:
            for args in data['jsprarguments']:
                sql = render_template(
                    "/".join([template_path, 'get_job_args_value.sql']),
                    job_name=jobname,
                    arg_name=args['argname'], conn=self.conn)
                status, res = conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)
                args['argval'] = res


DBMSJobView.register_node_view(blueprint)
