##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements DBMS Program objects Node."""

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
from pgadmin.browser.server_groups.servers.databases.schemas.functions.utils \
    import format_arguments_from_db
from pgadmin.browser.server_groups.servers.databases.dbms_job_scheduler.utils \
    import get_formatted_program_args


class DBMSProgramModule(CollectionNodeModule):
    """
     class DBMSProgramModule(CollectionNodeModule)

        A module class for DBMS Program objects node derived
        from CollectionNodeModule.

    Methods:
    -------

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for DBMS Program objects, when any of
       the server node is initialized.
    """
    _NODE_TYPE = 'dbms_program'
    _COLLECTION_LABEL = gettext("DBMS Programs")

    @property
    def collection_icon(self):
        """
        icon to be displayed for the browser collection node
        """
        return 'icon-coll-pga_jobstep'

    @property
    def node_icon(self):
        """
        icon to be displayed for the browser nodes
        """
        return 'icon-pga_jobstep'

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


blueprint = DBMSProgramModule(__name__)


class DBMSProgramView(PGChildNodeView):
    """
    class DBMSProgramView(PGChildNodeView)

        A view class for DBMSProgram node derived from PGChildNodeView.
        This class is responsible for all the stuff related to view like
        updating program node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the DBMSProgramView, and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the program nodes within that
      collection.

    * nodes()
      - This function will use to create all the child node within that
      collection. Here it will create all the program node.

    * properties(gid, sid, did, jsid, jsprid)
      - This function will show the properties of the selected program node

    * create(gid, sid, did, jsid, jsprid)
      - This function will create the new program object

    * msql(gid, sid, did, jsid, jsprid)
      - This function is used to return modified SQL for the
      selected program node

    * sql(gid, sid, did, jsid, jsprid)
      - Dummy response for sql panel

    * delete(gid, sid, did, jsid, jsprid)
      - Drops job program
    """

    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = 'dbms_programs/ppas/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'jsid'}
    ]
    ids = [
        {'type': 'int', 'id': 'jsprid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'sql': [{'get': 'sql'}],
        'get_procedures': [{}, {'get': 'get_procedures'}],
        'enable_disable': [{'put': 'enable_disable'}],
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
        This function is used to list all the program nodes within
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
    def nodes(self, gid, sid, did, jsid, jsprid=None):
        """
        This function is used to create all the child nodes within
        the collection. Here it will create all the program nodes.

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

            if jsprid is not None:
                if len(result['rows']) == 0:
                    return gone(
                        errormsg=gettext("Could not find the specified "
                                         "program."))

                row = result['rows'][0]
                return make_json_response(
                    data=self.blueprint.generate_browser_node(
                        row['jsprid'],
                        DBMS_JOB_SCHEDULER_ID,
                        row['jsprname'],
                        is_enabled=row['jsprenabled'],
                        icon="icon-pga_jobstep" if row['jsprenabled'] else
                        "icon-pga_jobstep-disabled",
                        description=row['jsprdesc']
                    )
                )

            for row in result['rows']:
                res.append(
                    self.blueprint.generate_browser_node(
                        row['jsprid'],
                        DBMS_JOB_SCHEDULER_ID,
                        row['jsprname'],
                        is_enabled=row['jsprenabled'],
                        icon="icon-pga_jobstep" if row['jsprenabled'] else
                        "icon-pga_jobstep-disabled",
                        description=row['jsprdesc']
                    )
                )

            return make_json_response(
                data=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def properties(self, gid, sid, did, jsid, jsprid):
        """
        This function will show the properties of the selected program node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
            jsprid: Job program ID
        """
        try:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                jsprid=jsprid
            )
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    errormsg=gettext("Could not find the specified program.")
                )

            data = res['rows'][0]
            # Get the formatted program args
            get_formatted_program_args(self.template_path, self.conn, data)

            return ajax_response(
                response=data,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def create(self, gid, sid, did, jsid):
        """
        This function will update the data for the selected program node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
        """
        data = json.loads(request.data)
        try:
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                program_name=data['jsprname'],
                program_type=data['jsprtype'],
                program_action=data['jsprproc']
                if data['jsprtype'] == 'STORED_PROCEDURE' else
                data['jsprcode'],
                number_of_arguments=data['jsprnoofargs'],
                enabled=data['jsprenabled'],
                comments=data['jsprdesc'],
                arguments=data['jsprarguments'],
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

            # Get the newly created program id
            sql = render_template(
                "/".join([self.template_path, 'get_program_id.sql']),
                jsprname=data['jsprname'], conn=self.conn
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    errormsg=gettext("Job program creation failed.")
                )
            row = res['rows'][0]

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    row['jsprid'],
                    DBMS_JOB_SCHEDULER_ID,
                    row['jsprname'],
                    is_enabled=row['jsprenabled'],
                    icon="icon-pga_jobstep" if row['jsprenabled'] else
                    "icon-pga_jobstep-disabled"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, jsid, jsprid=None):
        """Delete the Job program."""

        if jsprid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [jsprid]}

        try:
            for jsprid in data['ids']:
                sql = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    jsprid=jsprid
                )

                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                jsprname = res['rows'][0]['jsprname']

                status, res = self.conn.execute_void(
                    render_template(
                        "/".join([self.template_path, self._DELETE_SQL]),
                        program_name=jsprname, conn=self.conn
                    )
                )
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(success=1)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, jsid, jsprid=None):
        """
        This function is used to return modified SQL for the
        selected program node.

        Args:
            gid: Server Group ID
            sid: Server ID
            jsid: Job Scheduler ID
            jsprid: Job program ID (optional)
        """
        data = {}
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('jsprdesc',):
                    data[k] = v
                else:
                    data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        try:
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                program_name=data['jsprname'],
                program_type=data['jsprtype'],
                program_action=data['jsprproc']
                if data['jsprtype'] == 'STORED_PROCEDURE' else
                data['jsprcode'],
                number_of_arguments=data['jsprnoofargs'],
                enabled=data['jsprenabled'],
                comments=data['jsprdesc'],
                arguments=data['jsprarguments'],
                conn=self.conn
            )

            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, jsid, jsprid):
        """
        This function will generate sql for the sql panel
        """
        try:
            SQL = render_template("/".join(
                [self.template_path, self._PROPERTIES_SQL]
            ), jsprid=jsprid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the DBMS Schedule.")
                )

            data = res['rows'][0]
            # Get the formatted program args
            get_formatted_program_args(self.template_path, self.conn, data)

            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                display_comments=True,
                program_name=data['jsprname'],
                program_type=data['jsprtype'],
                program_action=data['jsprproc']
                if data['jsprtype'] == 'STORED_PROCEDURE' else
                data['jsprcode'],
                number_of_arguments=data['jsprnoofargs'],
                enabled=data['jsprenabled'],
                comments=data['jsprdesc'],
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
        sql = render_template("/".join([self.template_path,
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
    def enable_disable(self, gid, sid, did, jsid, jsprid=None):
        """
        This function is used to enable/disable program.
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        status, res = self.conn.execute_void(
            render_template(
                "/".join([self.template_path, 'enable_disable.sql']),
                name=data['program_name'],
                is_enable=data['is_enable_program'], conn=self.conn
            )
        )
        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            success=1,
            info=gettext("Program enabled") if data['is_enable_program'] else
            gettext('Program disabled'),
            data={
                'sid': sid,
                'did': did,
                'jsid': jsid,
                'jsprid': jsprid
            }
        )


DBMSProgramView.register_node_view(blueprint)
