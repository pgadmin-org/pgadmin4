##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Trigger Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify, current_app
from flask_babelex import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    triggers import utils as trigger_utils
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import trigger_definition
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.directory_compare import directory_diff,\
    parse_acl


class TriggerModule(CollectionNodeModule):
    """
     class TriggerModule(CollectionNodeModule)

        A module class for Trigger node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Trigger and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for trigger, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'trigger'
    _COLLECTION_LABEL = gettext("Triggers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the TriggerModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None
        self.min_gpdbver = 1000000000
        super(TriggerModule, self).__init__(*args, **kwargs)

    def backend_supported(self, manager, **kwargs):
        """
        Load this module if vid is view, we will not load it under
        material view
        """
        if manager.server_type == 'gpdb':
            return False
        if super(TriggerModule, self).backend_supported(manager, **kwargs):
            conn = manager.connection(did=kwargs['did'])

            if 'vid' not in kwargs:
                return True

            template_path = 'triggers/sql/{0}/#{1}#'.format(
                manager.server_type, manager.version)
            SQL = render_template("/".join(
                [template_path, 'backend_support.sql']), vid=kwargs['vid']
            )

            status, res = conn.execute_scalar(SQL)

            # check if any errors
            if not status:
                return internal_server_error(errormsg=res)

            # Check vid is view not material view
            # then true, othewise false
            return res

    def get_nodes(self, gid, sid, did, scid, **kwargs):
        """
        Generate the collection node
        """
        assert ('tid' in kwargs or 'vid' in kwargs)
        yield self.generate_browser_collection_node(
            kwargs['tid'] if 'tid' in kwargs else kwargs['vid']
        )

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return False

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "triggers/css/trigger.css",
                node_type=self.node_type
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


blueprint = TriggerModule(__name__)


class TriggerView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Trigger node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the TriggerView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Trigger nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Trigger node.

    * node()
      - This function will used to create child node within that
        collection, Here it will create specific the Trigger node.

    * properties(gid, sid, did, scid, tid, trid)
      - This function will show the properties of the selected Trigger node

    * create(gid, sid, did, scid, tid)
      - This function will create the new Trigger object

    * update(gid, sid, did, scid, tid, trid)
      - This function will update the data for the selected Trigger node

    * delete(self, gid, sid, scid, tid, trid):
      - This function will drop the Trigger object

    * enable(self, gid, sid, scid, tid, trid):
      - This function will enable/disable Trigger object

    * msql(gid, sid, did, scid, tid, trid)
      - This function is used to return modified SQL for the selected
        Trigger node

    * sql(gid, sid, did, scid, tid, trid):
      - This function will generate sql to show it in sql pane for the
        selected Trigger node.

    * dependency(gid, sid, did, scid, tid, trid):
      - This function will generate dependency list show it in dependency
        pane for the selected Trigger node.

    * dependent(gid, sid, did, scid, tid, trid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Trigger node.

    * get_trigger_functions(gid, sid, did, scid, tid, trid):
      - This function will return list of trigger functions available
        via AJAX response
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [
        {'type': 'int', 'id': 'trid'}
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
        'get_triggerfunctions': [{'get': 'get_trigger_functions'},
                                 {'get': 'get_trigger_functions'}],
        'enable': [{'put': 'enable_disable_trigger'}]
    })

    # Schema Diff: Keys to ignore while comparing
    keys_to_ignore = ['oid', 'xmin', 'nspname', 'tgrelid', 'tgfoid', 'prosrc',
                      'oid-2']

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
            # We need datlastsysoid to check if current trigger is system
            # trigger
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            # we will set template path for sql scripts
            self.table_template_path = compile_template_path(
                'tables/sql',
                self.manager.server_type,
                self.manager.version
            )
            self.template_path = 'triggers/sql/{0}/#{1}#'.format(
                self.manager.server_type, self.manager.version)
            # Store server type
            self.server_type = self.manager.server_type
            # We need parent's name eg table name and schema name
            # when we create new trigger in update we can fetch it using
            # property sql
            schema, table = trigger_utils.get_parent(self.conn, kwargs['tid'])
            self.schema = schema
            self.table = table

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def get_trigger_functions(self, gid, sid, did, scid, tid, trid=None):
        """
        This function will return list of trigger functions available
        via AJAX response
        """
        res = [{'label': '', 'value': ''}]

        # TODO: REMOVE True Condition , it's just for testing
        # If server type is EDB-PPAS then we also need to add
        # inline edb-spl along with options fetched by below sql

        if self.server_type == 'ppas':
            res.append({
                'label': 'Inline EDB-SPL',
                'value': 'Inline EDB-SPL'
            })
        try:
            SQL = render_template(
                "/".join([self.template_path, 'get_triggerfunctions.sql']),
                show_system_objects=self.blueprint.show_system_objects
            )
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['tfunctions'],
                     'value': row['tfunctions']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        This function is used to list all the trigger nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available trigger nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]), tid=tid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, tid, trid):
        """
        This function will used to create the child node within that
        collection.
        Here it will create specific the trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            trid: Trigger ID

        Returns:
            JSON of available trigger child nodes
        """
        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]),
                              tid=tid,
                              trid=trid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(
                gettext("""Could not find the trigger in the table.""")
            )

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            tid,
            rset['rows'][0]['name'],
            icon="icon-trigger-bad" if
            rset['rows'][0]['is_enable_trigger'] == 'D' else "icon-trigger"
        )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available trigger child nodes
        """
        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-trigger-bad" if row['is_enable_trigger'] == 'D'
                    else "icon-trigger"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, trid):
        """
        This function will show the properties of the selected trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            trid: Trigger ID

        Returns:
            JSON of selected trigger node
        """
        status, data = self._fetch_properties(tid, trid)
        if not status:
            return data

        return ajax_response(
            response=data,
            status=200
        )

    def _fetch_properties(self, tid, trid):
        """
        This function is used to fetch the properties of the specified object
        :param tid:
        :param trid:
        :return:
        """
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              tid=tid, trid=trid,
                              datlastsysoid=self.datlastsysoid)

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("""Could not find the trigger in the table."""))

        # Making copy of output for future use
        data = dict(res['rows'][0])
        data = trigger_utils.get_trigger_function_and_columns(
            self.conn, data, tid, self.blueprint.show_system_objects)

        data = trigger_definition(data)

        return True, data

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will creates new the trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for k, v in data.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        required_args = {
            'name': 'Name',
            'tfunction': 'Trigger function'
        }

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(required_args[arg])
                )

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table
        if len(data['table']) == 0:
            return gone(gettext("The specified object could not be found."))

        try:
            SQL = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # we need oid to to add object in tree at browser
            SQL = render_template("/".join([self.template_path,
                                            self._OID_SQL]),
                                  tid=tid, data=data)
            status, trid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=tid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    trid,
                    tid,
                    data['name'],
                    icon="icon-trigger"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, **kwargs):
        """
        This function will updates existing the trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID
        """
        trid = kwargs.get('trid', None)
        only_sql = kwargs.get('only_sql', False)

        if trid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [trid]}

        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            for trid in data['ids']:
                # We will first fetch the trigger name for current request
                # so that we create template for dropping trigger
                SQL = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      tid=tid, trid=trid,
                                      datlastsysoid=self.datlastsysoid)

                status, res = self.conn.execute_dict(SQL)
                if not status:
                    return internal_server_error(errormsg=res)
                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified trigger could not be found.\n'
                        )
                    )

                data = dict(res['rows'][0])

                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data,
                                      conn=self.conn,
                                      cascade=cascade
                                      )
                if only_sql:
                    return SQL
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Trigger is dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, trid):
        """
        This function will updates existing the trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            data['schema'] = self.schema
            data['table'] = self.table

            SQL, name = trigger_utils.get_sql(
                self.conn, data=data, tid=tid, trid=trid,
                datlastsysoid=self.datlastsysoid,
                show_system_objects=self.blueprint.show_system_objects)

            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # We need oid to add object in browser tree and if user
            # update the trigger then new OID is getting generated
            # so we need to return new OID of trigger.
            SQL = render_template(
                "/".join([self.template_path, self._OID_SQL]),
                tid=tid, data=data
            )
            status, new_trid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=new_trid)
            # Fetch updated properties
            SQL = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  tid=tid, trid=new_trid,
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("""Could not find the trigger in the table."""))

            # Making copy of output for future use
            data = dict(res['rows'][0])

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    new_trid,
                    tid,
                    name,
                    icon="icon-%s-bad" % self.node_type if
                    data['is_enable_trigger'] == 'D' else
                    "icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, trid=None):
        """
        This function will generates modified sql for trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID (When working with existing trigger)
        """
        data = dict()
        for k, v in request.args.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        try:
            sql, name = trigger_utils.get_sql(
                self.conn, data=data, tid=tid, trid=trid,
                datlastsysoid=self.datlastsysoid,
                show_system_objects=self.blueprint.show_system_objects)
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')

            if sql == '':
                sql = "--modified SQL"
            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, trid):
        """
        This function will generates reverse engineered sql for trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID
        """

        SQL = trigger_utils.get_reverse_engineered_sql(
            self.conn, schema=self.schema, table=self.table, tid=tid,
            trid=trid, datlastsysoid=self.datlastsysoid,
            show_system_objects=self.blueprint.show_system_objects)

        return ajax_response(response=SQL)

    @check_precondition
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
        tid = kwargs.get('tid')
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            SQL, name = trigger_utils.get_sql(
                self.conn, data=data, tid=tid, trid=oid,
                datlastsysoid=self.datlastsysoid,
                show_system_objects=self.blueprint.show_system_objects,
                is_schema_diff=True)

            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
        else:
            if drop_sql:
                SQL = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, tid=tid, trid=oid,
                                  only_sql=True)
            else:
                schema = self.schema
                SQL = trigger_utils.get_reverse_engineered_sql(
                    self.conn, schema=schema, table=self.table, tid=tid,
                    trid=oid, datlastsysoid=self.datlastsysoid,
                    show_system_objects=self.blueprint.show_system_objects,
                    template_path=None, with_header=False)

        return SQL

    @check_precondition
    def enable_disable_trigger(self, gid, sid, did, scid, tid, trid):
        """
        This function will enable OR disable the current trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        is_enable_trigger = data['is_enable_trigger']

        try:

            SQL = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  tid=tid, trid=trid,
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(
                    gettext("""Could not find the trigger in the table.""")
                )

            o_data = dict(res['rows'][0])

            # If enable is set to true means we need SQL to enable
            # current trigger which is disabled already so we need to
            # alter the 'is_enable_trigger' flag so that we can render
            # correct SQL for operation
            o_data['is_enable_trigger'] = is_enable_trigger

            # Adding parent into data dict, will be using it while creating sql
            o_data['schema'] = self.schema
            o_data['table'] = self.table

            SQL = render_template("/".join([self.template_path,
                                            'enable_disable_trigger.sql']),
                                  data=o_data, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info="Trigger updated",
                data={
                    'id': trid,
                    'tid': tid,
                    'scid': scid
                }
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, trid):
        """
        This function get the dependents and return ajax response
        for the trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            trid: Trigger ID
        """
        dependents_result = self.get_dependents(
            self.conn, trid
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, trid):
        """
        This function get the dependencies and return ajax response
        for the trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            trid: Trigger ID

        """
        dependencies_result = self.get_dependencies(
            self.conn, trid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, tid, oid=None):
        """
        This function will fetch the list of all the triggers for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :param tid: Table Id
        :return:
        """
        res = dict()

        if oid:
            status, data = self._fetch_properties(tid, oid)
            if not status:
                current_app.logger.error(data)
                return False
            res = data
        else:
            SQL = render_template("/".join([self.template_path,
                                            self._NODES_SQL]), tid=tid)
            status, triggers = self.conn.execute_2darray(SQL)
            if not status:
                current_app.logger.error(triggers)
                return False

            for row in triggers['rows']:
                status, data = self._fetch_properties(tid, row['oid'])
                if status:
                    res[row['name']] = data

        return res

    def ddl_compare(self, **kwargs):
        """
        This function returns the DDL/DML statements based on the
        comparison status.

        :param kwargs:
        :return:
        """

        src_params = kwargs.get('source_params')
        tgt_params = kwargs.get('target_params')
        source = kwargs.get('source')
        target = kwargs.get('target')
        comp_status = kwargs.get('comp_status')

        diff = ''
        if comp_status == 'source_only':
            diff = self.get_sql_from_diff(gid=src_params['gid'],
                                          sid=src_params['sid'],
                                          did=src_params['did'],
                                          scid=src_params['scid'],
                                          tid=src_params['tid'],
                                          oid=source['oid'])
        elif comp_status == 'target_only':
            diff = self.get_sql_from_diff(gid=tgt_params['gid'],
                                          sid=tgt_params['sid'],
                                          did=tgt_params['did'],
                                          scid=tgt_params['scid'],
                                          tid=tgt_params['tid'],
                                          oid=target['oid'],
                                          drop_sql=True)
        elif comp_status == 'different':
            diff_dict = directory_diff(
                source, target,
                ignore_keys=self.keys_to_ignore, difference={}
            )
            parse_acl(source, target, diff_dict)

            diff = self.get_sql_from_diff(gid=tgt_params['gid'],
                                          sid=tgt_params['sid'],
                                          did=tgt_params['did'],
                                          scid=tgt_params['scid'],
                                          tid=tgt_params['tid'],
                                          oid=target['oid'],
                                          data=diff_dict)
        return diff


SchemaDiffRegistry(blueprint.node_type, TriggerView, 'table')
TriggerView.register_node_view(blueprint)
