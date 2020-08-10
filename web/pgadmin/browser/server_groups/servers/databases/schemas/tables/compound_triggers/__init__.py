##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Compound Trigger Node """

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
    compound_triggers import utils as compound_trigger_utils
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import trigger_definition
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.directory_compare import directory_diff,\
    parse_acl


class CompoundTriggerModule(CollectionNodeModule):
    """
     class CompoundTriggerModule(CollectionNodeModule)

        A module class for Compound Trigger node derived from
        CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Trigger and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for compound trigger, when any of the server
      node is initialized.
    """

    _NODE_TYPE = 'compound_trigger'
    _COLLECTION_LABEL = gettext("Compound Triggers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the CompoundTriggerModule and
        it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(CompoundTriggerModule, self).__init__(*args, **kwargs)
        self.min_ver = self.min_ppasver = 120000
        self.max_ver = None
        self.min_gpdbver = 1000000000
        self.server_type = ['ppas']

    def backend_supported(self, manager, **kwargs):
        """
        Load this module if vid is view, we will not load it under
        material view
        """
        if manager.server_type == 'gpdb':
            return False
        if super(CompoundTriggerModule, self).backend_supported(
                manager, **kwargs):
            conn = manager.connection(did=kwargs['did'])

            if 'vid' not in kwargs:
                return True

            template_path = 'compound_triggers/sql/{0}/#{1}#'.format(
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
                "compound_triggers/css/compound_trigger.css",
                node_type=self.node_type
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


blueprint = CompoundTriggerModule(__name__)


class CompoundTriggerView(PGChildNodeView, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Compound Trigger node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the CompoundTriggerView and it's
      base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Compound Trigger nodes
      within that collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Compound Trigger node.

    * node()
      - This function will used to create child node within that
        collection, Here it will create specific the Compound Trigger node.

    * properties(gid, sid, did, scid, tid, trid)
      - This function will show the properties of the selected
      Compound Trigger node

    * create(gid, sid, did, scid, tid)
      - This function will create the new Compound Trigger object

    * update(gid, sid, did, scid, tid, trid)
      - This function will update the data for the selected
      Compound Trigger node

    * delete(self, gid, sid, scid, tid, trid):
      - This function will drop the Compound Trigger object

    * enable(self, gid, sid, scid, tid, trid):
      - This function will enable/disable Compound Trigger object

    * msql(gid, sid, did, scid, tid, trid)
      - This function is used to return modified SQL for the selected
        Compound Trigger node

    * sql(gid, sid, did, scid, tid, trid):
      - This function will generate sql to show it in sql pane for the
        selected Compound Trigger node.

    * dependency(gid, sid, did, scid, tid, trid):
      - This function will generate dependency list show it in dependency
        pane for the selected Compound Trigger node.

    * dependent(gid, sid, did, scid, tid, trid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Compound Trigger node.
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
        'enable': [{'put': 'enable_disable_trigger'}]
    })

    # Schema Diff: Keys to ignore while comparing
    keys_to_ignore = ['oid', 'xmin', 'nspname', 'tfunction',
                      'tgrelid', 'tgfoid', 'oid-2']

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
            # We need datlastsysoid to check if current compound trigger
            # is system trigger
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            self.table_template_path = compile_template_path(
                'tables/sql',
                self.manager.server_type,
                self.manager.version
            )

            # we will set template path for sql scripts
            self.template_path = 'compound_triggers/sql/{0}/#{1}#'.format(
                self.manager.server_type, self.manager.version)
            # Store server type
            self.server_type = self.manager.server_type
            # We need parent's name eg table name and schema name
            # when we create new compound trigger in update we can fetch
            # it using property sql
            schema, table = compound_trigger_utils.get_parent(
                self.conn, kwargs['tid'])
            self.schema = schema
            self.table = table

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        This function is used to list all the compound trigger nodes
        within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available compound trigger nodes
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
        Here it will create specific the compound trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            trid: Trigger ID

        Returns:
            JSON of available compound trigger child nodes
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
            return gone(gettext(
                """Could not find the compound trigger in the table.""")
            )

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            tid,
            rset['rows'][0]['name'],
            icon="icon-compound_trigger-bad" if
            rset['rows'][0]['is_enable_trigger'] == 'D' else
            "icon-compound_trigger"
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
        Here it will create all the compound trigger node.

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
                    icon="icon-compound_trigger-bad"
                    if row['is_enable_trigger'] == 'D'
                    else "icon-compound_trigger"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, trid):
        """
        This function will show the properties of the selected
        compound trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            trid: Trigger ID

        Returns:
            JSON of selected compound trigger node
        """

        status, data = self._fetch_properties(tid, trid)

        if not status:
            return internal_server_error(errormsg=data)

        if 'rows' in data and len(data['rows']) == 0:
            return gone(gettext(
                """Could not find the compound trigger in the table."""))

        return ajax_response(
            response=data,
            status=200
        )

    def _fetch_properties(self, tid, trid):

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              tid=tid, trid=trid,
                              datlastsysoid=self.datlastsysoid)

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return status, res

        if len(res['rows']) == 0:
            return True, res

        # Making copy of output for future use
        data = dict(res['rows'][0])
        if len(data['tgattr']) >= 1:
            columns = ', '.join(data['tgattr'].split(' '))
            data['columns'] = compound_trigger_utils.get_column_details(
                self.conn, tid, columns)

        data = trigger_definition(data)

        return True, data

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will creates new the compound trigger object

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
            'name': 'Name'
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
                    icon="icon-compound_trigger"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, **kwargs):
        """
        This function will updates existing the compound trigger object

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
                # We will first fetch the compound trigger name for
                # current request so that we create template for
                # dropping compound trigger
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
                            'The specified compound trigger could not be '
                            'found.\n'
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
                info=gettext("Compound Trigger is dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, trid):
        """
        This function will updates existing the compound trigger object

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

            SQL, name = compound_trigger_utils.get_sql(
                self.conn, data, tid, trid, self.datlastsysoid)
            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # We need oid to add object in browser tree and if user
            # update the compound trigger then new OID is getting generated
            # so we need to return new OID of compound trigger.
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
                return gone(gettext(
                    """Could not find the compound trigger in the table."""))

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
        This function will generates modified sql for compound trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID (When working with existing compound trigger)
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
            sql, name = compound_trigger_utils.get_sql(
                self.conn, data, tid, trid, self.datlastsysoid)
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
        This function will generates reverse engineered sql for
        compound trigger object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           trid: Trigger ID
        """
        try:
            SQL = compound_trigger_utils.get_reverse_engineered_sql(
                self.conn, schema=self.schema, table=self.table, tid=tid,
                trid=trid, datlastsysoid=self.datlastsysoid)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

        return ajax_response(response=SQL)

    @check_precondition
    def enable_disable_trigger(self, gid, sid, did, scid, tid, trid):
        """
        This function will enable OR disable the current
        compound trigger object

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

        # Convert str 'true' to boolean type
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
                return gone(gettext(
                    """Could not find the compound trigger in the table.""")
                )

            o_data = dict(res['rows'][0])

            # If enable is set to true means we need SQL to enable
            # current compound trigger which is disabled already so we need to
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
                info="Compound Trigger updated",
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
        for the compound trigger node.

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
        for the compound trigger node.

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
            sql, name = compound_trigger_utils.get_sql(self.conn,
                                                       data,
                                                       tid, oid,
                                                       self.datlastsysoid)
            if not isinstance(sql, str):
                return sql
            sql = sql.strip('\n').strip(' ')
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, tid=tid,
                                  trid=oid, only_sql=True)
            else:
                sql = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      tid=tid, trid=oid,
                                      datlastsysoid=self.datlastsysoid)

                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)
                elif len(res['rows']) == 0:
                    return gone(gettext("Could not find the compound "
                                        "trigger in the table."))

                data = dict(res['rows'][0])
                # Adding parent into data dict,
                # will be using it while creating sql
                data['schema'] = self.schema
                data['table'] = self.table

                if len(data['tgattr']) >= 1:
                    columns = ', '.join(data['tgattr'].split(' '))
                    data['columns'] = self._column_details(tid, columns)

                data = trigger_definition(data)
                sql = self._check_and_add_compound_trigger(tid, data)

        return sql

    def _check_and_add_compound_trigger(self, tid, data):
        """
        This get compound trigger and check for disable.
        :param tid: Table Id.
        :param data: Data.
        :param diff_schema: schema diff check.
        """
        sql, name = compound_trigger_utils.get_sql(self.conn,
                                                   data,
                                                   tid,
                                                   None,
                                                   self.datlastsysoid)

        # If compound trigger is disbaled then add sql
        # code for the same
        if not data['is_enable_trigger']:
            sql += '\n\n'
            sql += render_template("/".join([
                self.template_path,
                'enable_disable_trigger.sql']),
                data=data, conn=self.conn)
        return sql

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


SchemaDiffRegistry(blueprint.node_type, CompoundTriggerView, 'table')
CompoundTriggerView.register_node_view(blueprint)
