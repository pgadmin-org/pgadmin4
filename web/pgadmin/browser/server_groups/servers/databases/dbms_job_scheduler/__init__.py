##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements DBMS Job Scheduler objects Node."""

from functools import wraps
from flask import render_template
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers import databases
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import (make_json_response, internal_server_error,
                                make_response as ajax_response)
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.constants import DBMS_JOB_SCHEDULER_ID


class DBMSJobSchedulerModule(CollectionNodeModule):
    """
     class DBMSJobSchedulerModule(CollectionNodeModule)

        A module class for DBMS Job Scheduler objects node derived
        from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the DBMS Job Scheduler objects, and it's
      base module.

    * get_nodes(gid, sid, did, scid, coid)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for DBMS Job Scheduler objects, when any of the
       server node is initialized.

    * backend_supported(manager, **kwargs)

    * registert(self, app, options)
      - Override the default register function to automagically register
        sub-modules at once.
    """
    _NODE_TYPE = 'dbms_job_scheduler'
    _COLLECTION_LABEL = gettext("DBMS Job Scheduler")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the DBMSJobSchedulerModule, and it's base
        module.

        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    @property
    def node_icon(self):
        """
        icon to be displayed for the browser nodes
        """
        return 'icon-coll-dbms_job_scheduler'

    def get_nodes(self, gid, sid, did):
        """
        Generate the collection node
        """
        if self.show_node:
            yield self.generate_browser_node(DBMS_JOB_SCHEDULER_ID, did,
                                             self._COLLECTION_LABEL, None)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the database node is
        initialized.
        """
        return databases.DatabaseModule.node_type

    def backend_supported(self, manager, **kwargs):
        """
        Function is used to check the pre-requisite for this node.
        Args:
            manager:
            **kwargs:

        Returns:

        """
        if hasattr(self, 'show_node') and not self.show_node:
            return False

        # Get the connection for the respective database
        conn = manager.connection(did=kwargs['did'])
        # Checking whether both 'edb_job_scheduler' and 'dbms_scheduler'
        # extensions are created or not.
        status, res = conn.execute_scalar("""
            SELECT COUNT(*) FROM pg_extension WHERE extname IN (
                'edb_job_scheduler', 'dbms_scheduler') """)
        if status and int(res) == 2:
            # Get the list of databases specified for the edb_job_scheduler
            status, res = conn.execute_scalar("""
                SHOW edb_job_scheduler.database_list""")
            # If database is available in the specified list than return True.
            if status and res and conn.db in res:
                return True

        return False

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .dbms_jobs import blueprint as module
        self.submodules.append(module)

        from .dbms_programs import blueprint as module
        self.submodules.append(module)

        from .dbms_schedules import blueprint as module
        self.submodules.append(module)

        super().register(app, options)


blueprint = DBMSJobSchedulerModule(__name__)


class DBMSJobSchedulerView(PGChildNodeView):
    """
    class DBMSJobSchedulerView(PGChildNodeView)

        A view class for cast node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like
        create/update/delete cast, showing properties of cast node,
        showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the DBMSJobSchedulerView, and it's
        base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attach
        manager,conn & template_path properties to self

    * nodes()
      - This function will use to create all the child node within that
      collection. Here it will create all the scheduler nodes.

    * properties(gid, sid, did, jsid)
      - This function will show the properties of the selected job node

    """

    node_type = blueprint.node_type
    BASE_TEMPLATE_PATH = 'dbms_job_scheduler/ppas/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'jsid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties'},
            {'get': 'list'}
        ],
        'children': [{
            'get': 'children'
        }],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}]
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
            self = args[0]
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            # Set the template path for the SQL scripts
            self.template_path = self.BASE_TEMPLATE_PATH.format(
                self.manager.version)

            # Here args[0] will hold self & kwargs will hold gid,sid,did
            return f(*args, **kwargs)
        return wrap

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function will use to create all the child nodes within the
        collection.
        """
        return make_json_response(
            data=[],
            status=200
        )

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function will show the run details of all the jobs.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        try:
            sql = render_template(
                "/".join([self.template_path, 'get_job_run_details.sql']))
            status, res = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=res)

            return ajax_response(
                response=res['rows'],
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def properties(self, gid, sid, did, jsid):
        """

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            jsid: Job Scheduler ID
        """
        return make_json_response(
            data=[],
            status=200
        )


DBMSJobSchedulerView.register_node_view(blueprint)
