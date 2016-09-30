##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Trigger Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone


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

    NODE_TYPE = 'trigger'
    COLLECTION_LABEL = gettext("Triggers")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the TriggerModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None
        super(TriggerModule, self).__init__(*args, **kwargs)

    def BackendSupported(self, manager, **kwargs):
        """
        Load this module if vid is view, we will not load it under
        material view
        """
        if super(TriggerModule, self).BackendSupported(manager, **kwargs):
            conn = manager.connection(did=kwargs['did'])

            if 'vid' not in kwargs:
                return True

            template_path = 'trigger/sql/9.1_plus'
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
        return database.DatabaseModule.NODE_TYPE

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return False

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "trigger/css/trigger.css",
                node_type=self.node_type
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


blueprint = TriggerModule(__name__)


class TriggerView(PGChildNodeView):
    """
    This class is responsible for generating routes for Trigger node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the TriggerView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

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

    * get_sql(data, scid, tid, trid)
      - This function will generate sql from model data

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

    * _column_details(tid, clist)::
      - This function will fetch the columns for trigger

    * _trigger_definition(data):
      - This function will set additional trigger definitions in
        AJAX response
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
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'get_triggerfunctions': [{'get': 'get_trigger_functions'},
                                 {'get': 'get_trigger_functions'}],
        'enable': [{'put': 'enable_disable_trigger'}]
    })

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
            # We need datlastsysoid to check if current trigger is system trigger
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            # we will set template path for sql scripts
            self.template_path = 'trigger/sql/9.1_plus'
            # Store server type
            self.server_type = self.manager.server_type
            # We need parent's name eg table name and schema name
            # when we create new trigger in update we can fetch it using
            # property sql
            SQL = render_template("/".join([self.template_path,
                                            'get_parent.sql']),
                                  tid=kwargs['tid'])
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                self.schema = row['schema']
                self.table = row['table']

            # Here we are storing trigger definition
            # We will use it to check trigger type definition
            self.trigger_definition = {
                'TRIGGER_TYPE_ROW': (1 << 0),
                'TRIGGER_TYPE_BEFORE': (1 << 1),
                'TRIGGER_TYPE_INSERT': (1 << 2),
                'TRIGGER_TYPE_DELETE': (1 << 3),
                'TRIGGER_TYPE_UPDATE': (1 << 4),
                'TRIGGER_TYPE_TRUNCATE': (1 << 5),
                'TRIGGER_TYPE_INSTEAD': (1 << 6)
            }

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
            SQL = render_template("/".join([self.template_path,
                                            'get_triggerfunctions.sql']),
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
        This function is used to list all the trigger nodes within that collection.

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
                                        'properties.sql']), tid=tid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid):
        """
        This function will used to create all the child node within that collection.
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
                                        'nodes.sql']), tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-trigger" if row['is_enable_trigger']
                    else "icon-trigger-bad"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    def _column_details(self, tid, clist):
        """
        This functional will fetch list of column for trigger

        Args:
            tid: Table OID
            clist: List of columns

        Returns:
            Updated properties data with column
        """

        SQL = render_template("/".join([self.template_path,
                                        'get_columns.sql']),
                              tid=tid, clist=clist)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        # 'tgattr' contains list of columns from table used in trigger
        columns = []

        for row in rset['rows']:
            columns.append({'column': row['name']})

        return columns

    def _trigger_definition(self, data):
        """
        This functional will set the trigger definition

        Args:
            data: Properties data

        Returns:
            Updated properties data with trigger definition
        """

        # Fires event definition
        if data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_BEFORE']:
            data['fires'] = 'BEFORE'
        elif data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_INSTEAD']:
            data['fires'] = 'INSTEAD OF'
        else:
            data['fires'] = 'AFTER'

        # Trigger of type definition
        if data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_ROW']:
            data['is_row_trigger'] = True
        else:
            data['is_row_trigger'] = False

        # Event definition
        if data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_INSERT']:
            data['evnt_insert'] = True
        else:
            data['evnt_insert'] = False

        if data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_DELETE']:
            data['evnt_delete'] = True
        else:
            data['evnt_delete'] = False

        if data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_UPDATE']:
            data['evnt_update'] = True
        else:
            data['evnt_update'] = False

        if data['tgtype'] & self.trigger_definition['TRIGGER_TYPE_TRUNCATE']:
            data['evnt_truncate'] = True
        else:
            data['evnt_truncate'] = False

        return data

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

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              tid=tid, trid=trid,
                              datlastsysoid=self.datlastsysoid)

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the trigger in the table."""))

        # Making copy of output for future use
        data = dict(res['rows'][0])

        # If language is 'edbspl' then trigger function should be 'Inline EDB-SPL'
        # else we will find the trigger function with schema name.
        if data['lanname'] == 'edbspl':
            data['tfunction'] = 'Inline EDB-SPL'
        else:
            SQL = render_template("/".join([self.template_path,
                                            'get_triggerfunctions.sql']),
                                  tgfoid=data['tgfoid'],
                                  show_system_objects=self.blueprint.show_system_objects)

            status, result = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Update the trigger function which we have fetched with schema name
            if 'rows' in result and len(result['rows']) > 0 and \
                            'tfunctions' in result['rows'][0]:
                data['tfunction'] = result['rows'][0]['tfunctions']

        if data['tgnargs'] > 1:
            # We know that trigger has more than 1 arguments, let's join them
            # and convert it as string
            data['tgargs'] = ', '.join(data['tgargs'])

        if len(data['tgattr']) > 1:
            columns = ', '.join(data['tgattr'].split(' '))
            data['columns'] = self._column_details(tid, columns)

        data = self._trigger_definition(data)

        return ajax_response(
            response=data,
            status=200
        )

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
                    errormsg=gettext("Couldn't find the required parameter (%s)." % \
                                     required_args[arg])
                )

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        try:
            SQL = render_template("/".join([self.template_path,
                                            'create.sql']),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # we need oid to to add object in tree at browser
            SQL = render_template("/".join([self.template_path,
                                            'get_oid.sql']),
                                  tid=tid, data=data)
            status, trid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=tid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    trid,
                    scid,
                    data['name'],
                    icon="icon-trigger"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, trid):
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
        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:
            # We will first fetch the trigger name for current request
            # so that we create template for dropping trigger
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  tid=tid, trid=trid,
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if not res['rows']:
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
                                            'delete.sql']),
                                  data=data, conn=self.conn, cascade=cascade)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Trigger is dropped"),
                data={
                    'id': trid,
                    'tid': tid
                }
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

            SQL, name = self.get_sql(scid, tid, trid, data)
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    trid,
                    scid,
                    name,
                    icon="icon-%s" % self.node_type
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
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        try:
            sql, name = self.get_sql(scid, tid, trid, data)

            sql = sql.strip('\n').strip(' ')

            if sql == '':
                sql = "--modified SQL"
            return make_json_response(
                data=sql,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, scid, tid, trid, data):
        """
        This function will genrate sql from model data
        """
        if trid is not None:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  tid=tid, trid=trid,
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            old_data = dict(res['rows'][0])

            # If name is not present in data then
            # we will fetch it from old data, we also need schema & table name
            if 'name' not in data:
                data['name'] = old_data['name']

            self.trigger_name = data['name']
            self.lanname = old_data['lanname']

            if old_data['tgnargs'] > 1:
                # We know that trigger has more than 1 arguments, let's join them
                old_data['tgargs'] = ', '.join(old_data['tgargs'])

            if len(old_data['tgattr']) > 1:
                columns = ', '.join(old_data['tgattr'].split(' '))
                old_data['columns'] = self._column_details(tid, columns)

            old_data = self._trigger_definition(old_data)

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            required_args = {
                'name': 'Name',
                'tfunction': 'Trigger function'
            }

            for arg in required_args:
                if arg not in data:
                    return gettext('-- incomplete definition')

            # If the request for new object which do not have did
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)
        return SQL, data['name'] if 'name' in data else old_data['name']

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
        try:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  tid=tid, trid=trid,
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            data = dict(res['rows'][0])
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = self.schema
            data['table'] = self.table

            if data['tgnargs'] > 1:
                # We know that trigger has more than 1 arguments, let's join them
                data['tgargs'] = ', '.join(data['tgargs'])

            if len(data['tgattr']) > 1:
                columns = ', '.join(data['tgattr'].split(' '))
                data['columns'] = self._column_details(tid, columns)

            data = self._trigger_definition(data)

            SQL, name = self.get_sql(scid, tid, None, data)

            sql_header = "-- Trigger: {0}\n\n-- ".format(data['name'])
            if hasattr(str, 'decode'):
                sql_header = sql_header.decode('utf-8')

            sql_header += render_template("/".join([self.template_path,
                                                    'delete.sql']),
                                          data=data, conn=self.conn)

            SQL = sql_header + '\n\n' + SQL.strip('\n')

            # If trigger is disbaled then add sql code for the same
            if not data['is_enable_trigger']:
                SQL += '\n\n'
                SQL += render_template("/".join([self.template_path,
                                                 'enable_disable_trigger.sql']),
                                       data=data, conn=self.conn)

            return ajax_response(response=SQL)

        except Exception as e:
            return internal_server_error(errormsg=str(e))

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

        # Convert str 'true' to boolean type
        is_enable_flag = json.loads(data['enable'])

        try:

            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  tid=tid, trid=trid,
                                  datlastsysoid=self.datlastsysoid)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            o_data = dict(res['rows'][0])

            # If enable is set to true means we need SQL to enable
            # current trigger which is disabled already so we need to
            # alter the 'is_enable_trigger' flag so that we can render
            # correct SQL for operation
            o_data['is_enable_trigger'] = is_enable_flag

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


TriggerView.register_node_view(blueprint)
