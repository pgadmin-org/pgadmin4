##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements View and Materialized View Node"""

from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
import simplejson as json
from flask import render_template, request, jsonify, current_app
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, parse_rule_definition, VacuumSettings
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, bad_request
from pgadmin.utils.driver import get_driver
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db,\
    parse_priv_to_db
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone

"""
    This module is responsible for generating two nodes
    1) View
    2) Materialized View

    We have created single file because view & material view has same
    functionality. It allows us to share the same submodules for both
    view, and material view modules.

    This modules uses separate template paths for each respective node
    - templates/view for View node
    - templates/materialized_view for the materialized view node

    [Each path contains node specific js files as well as sql template files.]
"""


class ViewModule(SchemaChildModule):
    """
    class ViewModule(SchemaChildModule):

        A module class for View node derived from SchemaChildModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the View and it's base module.

    * get_nodes(gid, sid, did, scid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for View, when any of the server node is
        initialized.
    """
    NODE_TYPE = 'view'
    COLLECTION_LABEL = gettext("Views")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ViewModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(ViewModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for views, when any database node is
        initialized, The reason is views are also listed under catalogs
        which are loaded under database node.
        """
        return databases.DatabaseModule.NODE_TYPE

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        snippets = [
            render_template(
                "browser/css/collection.css",
                node_type=self.node_type,
                _=gettext
            ),
            render_template(
                "view/css/view.css",
                node_type=self.node_type,
                _=gettext
            ),
            render_template(
                "mview/css/mview.css",
                node_type='mview',
                _=gettext
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


class MViewModule(ViewModule):
    """
     class MViewModule(ViewModule)
        A module class for the materialized view node derived from ViewModule.
    """

    NODE_TYPE = 'mview'
    COLLECTION_LABEL = gettext("Materialized Views")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the MViewModule and
        it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(MViewModule, self).__init__(*args, **kwargs)
        self.min_ver = 90300
        self.max_ver = None


view_blueprint = ViewModule(__name__)
mview_blueprint = MViewModule(__name__)


def check_precondition(f):
    """
    This function will behave as a decorator which will checks
    database connection before running view, it will also attaches
    manager,conn & template_path properties to instance of the method.

    Assumptions:
        This function will always be used as decorator of a class method.
    """

    @wraps(f)
    def wrap(*args, **kwargs):

        # Here args[0] will hold self & kwargs will hold gid,sid,did
        self = args[0]
        pg_driver = get_driver(PG_DEFAULT_DRIVER)
        self.qtIdent = pg_driver.qtIdent
        self.manager = pg_driver.connection_manager(
            kwargs['sid']
        )
        self.conn = self.manager.connection(did=kwargs['did'])
        self.datlastsysoid = self.manager.db_info[
            kwargs['did']
        ]['datlastsysoid'] if self.manager.db_info is not None and \
            kwargs['did'] in self.manager.db_info else 0

        # Set template path for sql scripts
        self.template_path = self.template_initial + '/' + (
            self.ppas_template_path(self.manager.version)
            if self.manager.server_type == 'ppas' else
            self.pg_template_path(self.manager.version)
        )

        ver = self.manager.version
        if ver >= 90200:
            self.column_template_path = 'column/sql/9.2_plus'
        else:
            self.column_template_path = 'column/sql/9.1_plus'

        return f(*args, **kwargs)

    return wrap


class ViewNode(PGChildNodeView, VacuumSettings):
    """
    This class is responsible for generating routes for view node.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ViewNode and it's base view.

    * module_js()
      - Request handler for module.js routes for the view node module
      javascript, which returns javscript for this module.

    * list()
      - This function is used to list all the view nodes within the
      collection.

    * nodes()
      - This function will used to create all the child node within the
        collection, Here it will create all the view node.

    * properties(gid, sid, did, scid)
      - This function will show the properties of the selected view node.

    * create(gid, sid, did, scid)
      - This function will create the new view object.

    * update(gid, sid, did, scid)
      - This function will update the data for the selected view node.

    * delete(self, gid, sid, scid):
      - This function will drop the view object

    * msql(gid, sid, did, scid)
      - This function is used to return modified SQL for the selected view
        node.

    * getSQL(data, scid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the view
        node.

    * select_sql(gid, sid, did, scid, vid):
      - Returns select sql for Object

    * insert_sql(gid, sid, did, scid, vid):
      - Returns INSERT Script sql for the object

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected view node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected view node.
    """
    node_type = view_blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'vid'}
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
        'configs': [{'get': 'configs'}],
        'get_tblspc': [{'get': 'get_tblspc'}, {'get': 'get_tblspc'}],
        'select_sql': [{'get': 'select_sql'}, {'get': 'select_sql'}],
        'insert_sql': [{'get': 'insert_sql'}, {'get': 'insert_sql'}],
        'get_table_vacuum': [
            {'get': 'get_table_vacuum'},
            {'get': 'get_table_vacuum'}],
        'get_toast_table_vacuum': [
            {'get': 'get_toast_table_vacuum'},
            {'get': 'get_toast_table_vacuum'}]
    })

    def __init__(self, *args, **kwargs):
        """
        Initialize the variables used by methods of ViewNode.
        """

        super(ViewNode, self).__init__(*args, **kwargs)

        self.manager = None
        self.conn = None
        self.template_path = None
        self.template_initial = 'view'

    @staticmethod
    def ppas_template_path(ver):
        """
        Returns the template path for PPAS servers.
        """
        return 'ppas/{0}'.format(
            '9.4_plus' if ver >= 90400 else
            '9.3_plus' if ver >= 90300 else
            '9.2_plus' if ver >= 90200 else
            '9.1_plus'
        )

    @staticmethod
    def pg_template_path(ver):
        """
        Returns the template path for PostgreSQL servers.
        """
        return 'pg/{0}'.format(
            '9.4_plus' if ver >= 90400 else
            '9.3_plus' if ver >= 90300 else
            '9.2_plus' if ver >= 90200 else
            '9.1_plus'
        )

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        Fetches all views properties and render into properties tab
        """
        SQL = render_template("/".join(
            [self.template_path, 'sql/properties.sql']), scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, vid):
        """
        Lists all views under the Views Collection node
        """
        SQL = render_template("/".join(
            [self.template_path, 'sql/nodes.sql']),
            vid=vid, datlastsysoid=self.datlastsysoid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(gettext("""Could not find the view."""))

        res = self.blueprint.generate_browser_node(
                rset['rows'][0]['oid'],
                scid,
                rset['rows'][0]['name'],
                icon="icon-view"
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        Lists all views under the Views Collection node
        """
        res = []
        SQL = render_template("/".join(
            [self.template_path, 'sql/nodes.sql']), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-view"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, vid):
        """
        Fetches the properties of an individual view
        and render in the properties tab
        """
        SQL = render_template("/".join(
            [self.template_path, 'sql/properties.sql']
        ), vid=vid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the view."""))

        SQL = render_template("/".join(
            [self.template_path, 'sql/acl.sql']), vid=vid)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        result = res['rows'][0]

        # sending result to formtter
        frmtd_reslt = self.formatter(result)

        # merging formated result with main result again
        result.update(frmtd_reslt)

        return ajax_response(
            response=result,
            status=200
        )

    @staticmethod
    def formatter(result):
        """ This function formats output for security label & variables"""
        frmtd_result = dict()
        sec_lbls = []
        if 'seclabels' in result and result['seclabels'] is not None:
            for sec in result['seclabels']:
                import re
                sec = re.search(r'([^=]+)=(.*$)', sec)
                sec_lbls.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        frmtd_result.update({"seclabels": sec_lbls})
        return frmtd_result

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will create a new view object
        """
        required_args = [
            'name',
            'definition'
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
                        "Couldn't find the required parameter (%s)." % arg
                    )
                )
        try:
            SQL, nameOrError = self.getSQL(gid, sid, data)
            if SQL is None:
                return nameOrError
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join(
                [self.template_path, 'sql/view_id.sql']), data=data)
            status, view_id = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            # Get updated schema oid
            SQL = render_template("/".join(
                [self.template_path, 'sql/get_oid.sql']), vid=view_id)
            status, scid = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    view_id,
                    scid,
                    data['name'],
                    icon="icon-view"
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, vid):
        """
        This function will update a view object
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        try:
            SQL, nameOrError = self.getSQL(gid, sid, data, vid)
            if SQL is None:
                return nameOrError
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_void(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join(
                [self.template_path, 'sql/view_id.sql']), data=data)
            status, res_data = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            view_id = res_data['rows'][0]['oid']
            new_view_name = res_data['rows'][0]['relname']

            # Get updated schema oid
            SQL = render_template("/".join(
                [self.template_path, 'sql/get_oid.sql']), vid=view_id)
            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    view_id,
                    scid,
                    new_view_name,
                    icon="icon-view"
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, vid):
        """
        This function will drop a view object
        """

        # Below will decide if it's simple drop or drop with cascade call
        cascade = True if self.cmd == 'delete' else False

        try:
            # Get name for view from vid
            SQL = render_template(
                "/".join([
                    self.template_path, 'sql/properties.sql'
                ]),
                vid=vid,
                datlastsysoid=self.datlastsysoid
            )
            status, res_data = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res_data)

            if not res_data['rows']:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified view could not be found.\n'
                    )
                )

            # drop view
            SQL = render_template(
                "/".join([
                    self.template_path, 'sql/delete.sql'
                ]),
                nspname=res_data['rows'][0]['schema'],
                name=res_data['rows'][0]['name'], cascade=cascade
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("View dropped"),
                data={
                    'id': vid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    def _get_schema(self, scid):
        """
        Returns Schema Name from its OID.

        Args:
            scid: Schema Id
        """
        SQL = render_template("/".join([self.template_path,
                                        'sql/get_schema.sql']), scid=scid)

        status, schema_name = self.conn.execute_scalar(SQL)

        if not status:
            return internal_server_error(errormsg=schema_name)

        return schema_name

    @check_precondition
    def msql(self, gid, sid, did, scid, vid=None):
        """
        This function returns modified SQL
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        sql, nameOrError = self.getSQL(gid, sid, data, vid)
        if sql is None:
            return nameOrError

        sql = sql.strip('\n').strip(' ')

        if sql == '':
            sql = "--modified SQL"

        return make_json_response(
            data=sql,
            status=200
        )

    def getSQL(self, gid, sid, data, vid=None):
        """
        This function will generate sql from model data
        """
        if vid is not None:
            SQL = render_template("/".join(
                [self.template_path, 'sql/properties.sql']),
                vid=vid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return None, internal_server_error(errormsg=res)

            old_data = res['rows'][0]

            if 'name' not in data:
                data['name'] = res['rows'][0]['name']
            if 'schema' not in data:
                data['schema'] = res['rows'][0]['schema']

            acls = []
            try:
                acls = render_template(
                    "/".join([self.template_path, 'sql/allowed_privs.json'])
                )
                acls = json.loads(acls, encoding='utf-8')
            except Exception as e:
                current_app.logger.exception(e)

            # Privileges
            for aclcol in acls:
                if aclcol in data:
                    allowedacl = acls[aclcol]

                    for key in ['added', 'changed', 'deleted']:
                        if key in data[aclcol]:
                            data[aclcol][key] = parse_priv_to_db(
                                data[aclcol][key], allowedacl['acl']
                            )

            try:
                SQL = render_template("/".join(
                    [self.template_path, 'sql/update.sql']), data=data,
                    o_data=old_data, conn=self.conn)
            except Exception as e:
                current_app.logger.exception(e)
                return None, internal_server_error(errormsg=str(e))
        else:
            required_args = [
                'name',
                'schema',
                'definition'
            ]
            for arg in required_args:
                if arg not in data:
                    return None, make_json_response(
                        data=gettext(" -- definition incomplete"),
                        status=200
                    )

            # Get Schema Name from its OID.
            if 'schema' in data and isinstance(data['schema'], int):
                data['schema'] = self._get_schema(data['schema'])

            acls = []
            try:
                acls = render_template(
                    "/".join([self.template_path, 'sql/allowed_privs.json'])
                )
                acls = json.loads(acls, encoding='utf-8')
            except Exception as e:
                current_app.logger.exception(e)

            # Privileges
            for aclcol in acls:
                if aclcol in data:
                    allowedacl = acls[aclcol]
                    data[aclcol] = parse_priv_to_db(
                        data[aclcol], allowedacl['acl']
                    )

            SQL = render_template("/".join(
                [self.template_path, 'sql/create.sql']), data=data)
            if data['definition']:
                SQL += "\n"
                SQL += render_template("/".join(
                    [self.template_path, 'sql/grant.sql']), data=data)

        return SQL, data['name'] if 'name' in data else old_data['name']

    def get_index_column_details(self, idx, data):
        """
        This functional will fetch list of column details for index

        Args:
            idx: Index OID
            data: Properties data

        Returns:
            Updated properties data with column details
        """

        self.index_temp_path = 'index'
        SQL = render_template("/".join([self.index_temp_path,
                                        'sql/9.1_plus/column_details.sql']), idx=idx)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        # 'attdef' comes with quotes from query so we need to strip them
        # 'options' we need true/false to render switch ASC(false)/DESC(true)
        columns = []
        cols = []
        for row in rset['rows']:

            # We need all data as collection for ColumnsModel
            cols_data = {
                'colname': row['attdef'].strip('"'),
                'collspcname': row['collnspname'],
                'op_class': row['opcname'],
            }
            if row['options'][0] == 'DESC':
                cols_data['sort_order'] = True
            columns.append(cols_data)

            # We need same data as string to display in properties window
            # If multiple column then separate it by colon
            cols_str = row['attdef']
            if row['collnspname']:
                cols_str += ' COLLATE ' + row['collnspname']
            if row['opcname']:
                cols_str += ' ' + row['opcname']
            if row['options'][0] == 'DESC':
                cols_str += ' DESC'
            cols.append(cols_str)

        # Push as collection
        data['columns'] = columns
        # Push as string
        data['cols'] = ', '.join(cols)

        return data

    def get_trigger_column_details(self, tid, clist):
        """
        This function will fetch list of column for trigger

        Args:
            tid: Table OID
            clist: List of columns

        Returns:
            Updated properties data with column
        """

        self.trigger_temp_path = 'schema/trigger'
        SQL = render_template("/".join([self.trigger_temp_path,
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

    def get_rule_sql(self, vid):
        """
        Get all non system rules of view node,
        generate their sql and render
        into sql tab
        """

        self.rule_temp_path = 'rules'
        SQL_data = ''
        SQL = render_template("/".join(
            [self.rule_temp_path, 'sql/properties.sql']), tid=vid)

        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for rule in data['rows']:

            # Generate SQL only for non system rule
            if rule['name'] != '_RETURN':
                res = []
                SQL = render_template("/".join(
                    [self.rule_temp_path, 'sql/properties.sql']),
                    rid=rule['oid']
                )
                status, res = self.conn.execute_dict(SQL)
                res = parse_rule_definition(res)
                SQL = render_template("/".join(
                    [self.rule_temp_path, 'sql/create.sql']),
                    data=res, display_comments=True)
                SQL_data += '\n'
                SQL_data += SQL
        return SQL_data

    def get_trigger_sql(self, vid):
        """
        Get all trigger nodes associated with view node,
        generate their sql and render
        into sql tab
        """
        from pgadmin.browser.server_groups.servers.databases.schemas.utils \
            import trigger_definition

        # Define template path
        self.trigger_temp_path = 'trigger'

        SQL_data = ''
        SQL = render_template("/".join(
            [self.trigger_temp_path, 'sql/9.1_plus/properties.sql']),
            tid=vid)

        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for trigger in data['rows']:
            SQL = render_template("/".join(
                [self.trigger_temp_path, 'sql/9.1_plus/properties.sql']),
                tid=trigger['oid'],
                tgrelid=vid
            )

            status, res = self.conn.execute_dict(SQL)

            res_rows = dict(res['rows'][0])
            if res_rows['tgnargs'] > 1:
                # We know that trigger has more than 1
                # arguments, let's join them
                res_rows['tgargs'] = ', '.join(
                    res_rows['tgargs'])

            if len(res_rows['tgattr']) > 1:
                columns = ', '.join(res_rows['tgattr'].split(' '))
                res_rows['columns'] = self.get_trigger_column_details(
                    trigger['oid'], columns)
            res_rows = trigger_definition(res_rows)

            SQL = render_template("/".join(
                [self.trigger_temp_path, 'sql/9.1_plus/create.sql']),
                data=res_rows, display_comments=True)
            SQL_data += '\n'
            SQL_data += SQL

        return SQL_data

    def get_index_sql(self, vid):
        """
        Get all index associated with view node,
        generate their sql and render
        into sql tab
        """

        self.index_temp_path = 'index'
        SQL_data = ''
        SQL = render_template("/".join(
            [self.index_temp_path, 'sql/9.1_plus/properties.sql']), tid=vid)
        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for index in data['rows']:
            res = []
            SQL = render_template("/".join(
                [self.index_temp_path, 'sql/9.1_plus/properties.sql']),
                idx=index['oid'],
                tid=vid
            )
            status, res = self.conn.execute_dict(SQL)

            data = dict(res['rows'][0])
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = data['nspname']
            data['table'] = data['tabname']

            # Add column details for current index
            data = self.get_index_column_details(index['oid'], data)

            SQL = render_template("/".join(
                [self.index_temp_path, 'sql/9.1_plus/create.sql']),
                data=data, display_comments=True)
            SQL_data += '\n'
            SQL_data += SQL
        return SQL_data

    @check_precondition
    def sql(self, gid, sid, did, scid, vid):
        """
        This function will generate sql to render into the sql panel
        """

        SQL_data = ''
        SQL = render_template("/".join(
            [self.template_path, 'sql/properties.sql']),
            vid=vid,
            datlastsysoid=self.datlastsysoid
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        result = res['rows'][0]
        # sending result to formtter
        frmtd_reslt = self.formatter(result)

        # merging formated result with main result again
        result.update(frmtd_reslt)

        # Fetch all privileges for view
        SQL = render_template("/".join(
            [self.template_path, 'sql/acl.sql']), vid=vid)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        result.update(res['rows'][0])

        acls = []
        try:
            acls = render_template(
                "/".join([self.template_path, 'sql/allowed_privs.json'])
            )
            acls = json.loads(acls, encoding='utf-8')
        except Exception as e:
            current_app.logger.exception(e)

        # Privileges
        for aclcol in acls:
            if aclcol in result:
                allowedacl = acls[aclcol]
                result[aclcol] = parse_priv_to_db(
                    result[aclcol], allowedacl['acl']
                )

        SQL = render_template("/".join(
            [self.template_path, 'sql/create.sql']),
            data=result,
            conn=self.conn,
            display_comments=True
        )
        SQL += "\n"
        SQL += render_template("/".join(
            [self.template_path, 'sql/grant.sql']), data=result)

        SQL_data += SQL
        SQL_data += self.get_rule_sql(vid)
        SQL_data += self.get_trigger_sql(vid)
        SQL_data += self.get_index_sql(vid)

        return ajax_response(response=SQL_data)

    @check_precondition
    def get_tblspc(self, gid, sid, did, scid):
        """
        This function to return list of tablespaces
        """
        res = []
        try:
            SQL = render_template(
                "/".join([self.template_path, 'sql/get_tblspc.sql'])
            )
            status, rset = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['spcname'], 'value': row['spcname']}
                )

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, vid):
        """
        This function gets the dependents and returns an ajax response
        for the view node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            vid: View ID
        """
        dependents_result = self.get_dependents(self.conn, vid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, vid):
        """
        This function gets the dependencies and returns an ajax response
        for the view node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            vid: View ID
        """
        dependencies_result = self.get_dependencies(self.conn, vid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def select_sql(self, gid, sid, did, scid, vid):
        """
        SELECT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            vid: View Id

        Returns:
            SELECT Script sql for the object
        """
        SQL = render_template(
            "/".join([
                self.template_path, 'sql/properties.sql'
            ]),
            scid=scid, vid=vid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        data_view = res['rows'][0]

        SQL = render_template(
            "/".join([
                self.column_template_path, 'properties.sql'
            ]),
            scid=scid, tid=vid,
            datlastsysoid=self.datlastsysoid
        )
        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        columns = []

        # Now we have all list of columns which we need
        data = data['rows']
        for c in data:
            columns.append(self.qtIdent(self.conn, c['name']))

        if len(columns) > 0:
            columns = ", ".join(columns)
        else:
            columns = '*'

        sql = u"SELECT {0}\n\tFROM {1};".format(
            columns,
            self.qtIdent(self.conn, data_view['schema'], data_view['name'])
        )

        return ajax_response(response=sql)

    @check_precondition
    def insert_sql(self, gid, sid, did, scid, vid):
        """
        INSERT script sql for the object

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            foid: Foreign Table Id

        Returns:
            INSERT Script sql for the object
        """
        SQL = render_template(
            "/".join([
                self.template_path, 'sql/properties.sql'
            ]),
            scid=scid, vid=vid,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        data_view = res['rows'][0]

        SQL = render_template(
            "/".join([
                self.column_template_path, 'properties.sql'
            ]),
            scid=scid, tid=vid,
            datlastsysoid=self.datlastsysoid
        )
        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        columns = []
        values = []

        # Now we have all list of columns which we need
        data = data['rows']
        for c in data:
            columns.append(self.qtIdent(self.conn, c['name']))
            values.append('?')

        if len(columns) > 0:
            columns = ", ".join(columns)
            values = ", ".join(values)
            sql = u"INSERT INTO {0}(\n\t{1})\n\tVALUES ({2});".format(
                self.qtIdent(
                    self.conn, data_view['schema'], data_view['name']
                ),
                columns, values
            )
        else:
            sql = gettext('-- Please create column(s) first...')

        return ajax_response(response=sql)


# Override the operations for materialized view
mview_operations = {
    'refresh_data': [{'put': 'refresh_data'}, {}]
}
mview_operations.update(ViewNode.operations)


class MViewNode(ViewNode, VacuumSettings):
    """
    This class is responsible for generating routes for
    materialized view node.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the MView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * create(gid, sid, did, scid)
      - Raise an error - we can not create a material view.

    * update(gid, sid, did, scid)
      - This function will update the data for the selected material node

    * delete(self, gid, sid, scid):
      - Raise an error - we can not delete a material view.

    * getSQL(data, scid)
      - This function will generate sql from model data

    * refresh_data(gid, sid, did, scid, vid):
      - This function will refresh view object
    """
    node_type = mview_blueprint.node_type
    operations = mview_operations

    def __init__(self, *args, **kwargs):
        """
        Initialize the variables used by methods of ViewNode.
        """

        super(MViewNode, self).__init__(*args, **kwargs)

        self.template_initial = 'mview'

    @staticmethod
    def ppas_template_path(ver):
        """
        Returns the template path for EDB Advanced servers.
        """
        return 'ppas/9.3_plus'

    @staticmethod
    def pg_template_path(ver):
        """
        Returns the template path for PostgreSQL servers.
        """
        return 'pg/{0}'.format(
            '9.4_plus' if ver >= 90400 else
            '9.3_plus'
        )

    def getSQL(self, gid, sid, data, vid=None):
        """
        This function will generate sql from model data
        """
        if vid is not None:
            SQL = render_template("/".join(
                [self.template_path, 'sql/properties.sql']),
                vid=vid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return None, internal_server_error(errormsg=res)
            old_data = res['rows'][0]

            if 'name' not in data:
                data['name'] = res['rows'][0]['name']
            if 'schema' not in data:
                data['schema'] = res['rows'][0]['schema']

            # merge vacuum lists into one
            data['vacuum_data'] = {}
            data['vacuum_data']['changed'] = []
            data['vacuum_data']['reset'] = []

            # table vacuum: separate list of changed and reset data for
            if ('vacuum_table' in data):
                if ('changed' in data['vacuum_table']):
                    for item in data['vacuum_table']['changed']:
                        if 'value' in item.keys():
                            if item['value'] is None:
                                if old_data[item['name']] != item['value']:
                                    data['vacuum_data']['reset'].append(item)
                            else:
                                if (old_data[item['name']] is None or
                                        (float(old_data[item['name']]) != float(item['value']))):
                                    data['vacuum_data']['changed'].append(item)

            if ('autovacuum_enabled' in data and
                        old_data['autovacuum_enabled'] is not None):
                if (data['autovacuum_enabled'] !=
                        old_data['autovacuum_enabled']):
                    data['vacuum_data']['changed'].append(
                        {'name': 'autovacuum_enabled',
                         'value': data['autovacuum_enabled']})
            elif ('autovacuum_enabled' in data and 'autovacuum_custom' in data and
                          old_data['autovacuum_enabled'] is None and data['autovacuum_custom']):
                data['vacuum_data']['changed'].append(
                    {'name': 'autovacuum_enabled',
                     'value': data['autovacuum_enabled']})

            # toast autovacuum: separate list of changed and reset data
            if ('vacuum_toast' in data):
                if ('changed' in data['vacuum_toast']):
                    for item in data['vacuum_toast']['changed']:
                        if 'value' in item.keys():
                            toast_key = 'toast_' + item['name']
                            item['name'] = 'toast.' + item['name']
                            if item['value'] is None:
                                if old_data[toast_key] != item['value']:
                                    data['vacuum_data']['reset'].append(item)
                            else:
                                if (old_data[toast_key] is None or
                                        (float(old_data[toast_key]) != float(item['value']))):
                                    data['vacuum_data']['changed'].append(item)

            if ('toast_autovacuum_enabled' in data and
                        old_data['toast_autovacuum_enabled'] is not None):
                if (data['toast_autovacuum_enabled'] !=
                        old_data['toast_autovacuum_enabled']):
                    data['vacuum_data']['changed'].append(
                        {'name': 'toast.autovacuum_enabled',
                         'value': data['toast_autovacuum_enabled']})
            elif ('toast_autovacuum_enabled' in data and 'toast_autovacuum' in data and
                          old_data['toast_autovacuum_enabled'] is None and data['toast_autovacuum']):
                data['vacuum_data']['changed'].append(
                    {'name': 'toast.autovacuum_enabled',
                     'value': data['toast_autovacuum_enabled']})

            acls = []
            try:
                acls = render_template(
                    "/".join([self.template_path, 'sql/allowed_privs.json'])
                )
                acls = json.loads(acls, encoding='utf-8')
            except Exception as e:
                current_app.logger.exception(e)

            # Privileges
            for aclcol in acls:
                if aclcol in data:
                    allowedacl = acls[aclcol]

                    for key in ['added', 'changed', 'deleted']:
                        if key in data[aclcol]:
                            data[aclcol][key] = parse_priv_to_db(
                                data[aclcol][key], allowedacl['acl']
                            )

            try:
                SQL = render_template("/".join(
                    [self.template_path, 'sql/update.sql']), data=data,
                    o_data=old_data, conn=self.conn)
            except Exception as e:
                current_app.logger.exception(e)
                return None, internal_server_error(errormsg=str(e))
        else:
            required_args = [
                'name',
                'schema',
                'definition'
            ]
            for arg in required_args:
                if arg not in data:
                    return None, make_json_response(
                        data=gettext(" -- definition incomplete"),
                        status=200
                    )

            # Get Schema Name from its OID.
            if 'schema' in data and isinstance(data['schema'], int):
                data['schema'] = self._get_schema(data['schema'])

            # merge vacuum lists into one
            vacuum_table = [item for item in data['vacuum_table']
                            if 'value' in item.keys() and
                            item['value'] is not None]
            vacuum_toast = [
                {'name': 'toast.' + item['name'], 'value': item['value']}
                for item in data['vacuum_toast']
                if 'value' in item.keys() and item['value'] is not None]

            # add table_enabled & toast_enabled settings
            if ('autovacuum_custom' in data and data['autovacuum_custom']):
                vacuum_table.append(
                    {
                        'name': 'autovacuum_enabled',
                        'value': str(data['autovacuum_enabled'])
                    }
                )
            if ('toast_autovacuum' in data and data['toast_autovacuum']):
                vacuum_table.append(
                    {
                        'name': 'toast.autovacuum_enabled',
                        'value': str(data['toast_autovacuum_enabled'])
                    }
                )

            # add vacuum_toast dict to vacuum_data only if
            # table & toast's custom autovacuum is enabled
            data['vacuum_data'] = (vacuum_table if (
                'autovacuum_custom' in data and
                data['autovacuum_custom'] is True
            ) else []) + (
                                      vacuum_toast if (
                                          'toast_autovacuum' in data and
                                          data['toast_autovacuum'] is True
                                      ) else [])

            acls = []
            try:
                acls = render_template(
                    "/".join([self.template_path, 'sql/allowed_privs.json'])
                )
                acls = json.loads(acls, encoding='utf-8')
            except Exception as e:
                current_app.logger.exception(e)

            # Privileges
            for aclcol in acls:
                if aclcol in data:
                    allowedacl = acls[aclcol]
                    data[aclcol] = parse_priv_to_db(
                        data[aclcol], allowedacl['acl']
                    )

            SQL = render_template("/".join(
                [self.template_path, 'sql/create.sql']), data=data)
            if data['definition']:
                SQL += "\n"
                SQL += render_template("/".join(
                    [self.template_path, 'sql/grant.sql']), data=data)
        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, vid):
        """
        This function will generate sql to render into the sql panel
        """

        SQL_data = ''
        SQL = render_template("/".join(
            [self.template_path, 'sql/properties.sql']),
            vid=vid,
            datlastsysoid=self.datlastsysoid
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        result = res['rows'][0]

        # sending result to formtter
        frmtd_reslt = self.formatter(result)

        # merging formated result with main result again
        result.update(frmtd_reslt)
        result['vacuum_table'] = self.parse_vacuum_data(
            self.conn, result, 'table')
        result['vacuum_toast'] = self.parse_vacuum_data(
            self.conn, result, 'toast')

        # merge vacuum lists into one
        vacuum_table = [item for item in result['vacuum_table']
                        if 'value' in item.keys() and item['value'] is not None]
        vacuum_toast = [
            {'name': 'toast.' + item['name'], 'value': item['value']}
            for item in result['vacuum_toast'] if 'value' in item.keys() and item['value'] is not None]

        # add vacuum_toast dict to vacuum_data only if
        # toast's autovacuum is enabled
        if ('toast_autovacuum_enabled' in result and
                    result['toast_autovacuum_enabled'] is True):
            result['vacuum_data'] = vacuum_table + vacuum_toast
        else:
            result['vacuum_data'] = vacuum_table

        # Fetch all privileges for view
        SQL = render_template("/".join(
            [self.template_path, 'sql/acl.sql']), vid=vid)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        result.update(res['rows'][0])

        acls = []
        try:
            acls = render_template(
                "/".join([self.template_path, 'sql/allowed_privs.json'])
            )
            acls = json.loads(acls, encoding='utf-8')
        except Exception as e:
            current_app.logger.exception(e)

        # Privileges
        for aclcol in acls:
            if aclcol in result:
                allowedacl = acls[aclcol]
                result[aclcol] = parse_priv_to_db(
                    result[aclcol], allowedacl['acl']
                )

        SQL = render_template("/".join(
            [self.template_path, 'sql/create.sql']),
            data=result,
            conn=self.conn,
            display_comments=True
        )
        SQL += "\n"
        SQL += render_template("/".join(
            [self.template_path, 'sql/grant.sql']), data=result)

        SQL_data += SQL
        SQL_data += self.get_rule_sql(vid)
        SQL_data += self.get_trigger_sql(vid)
        SQL_data += self.get_index_sql(vid)
        SQL_data = SQL_data.strip('\n')
        return ajax_response(response=SQL_data)

    @check_precondition
    def get_table_vacuum(self, gid, sid, did, scid):
        """
        Fetch the default values for autovacuum
        fields, return an array of
          - label
          - name
          - setting
        values
        """

        res = self.get_vacuum_table_settings(self.conn)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def get_toast_table_vacuum(self, gid, sid, did, scid):
        """
        Fetch the default values for autovacuum
        fields, return an array of
          - label
          - name
          - setting
        values
        """
        res = self.get_vacuum_toast_settings(self.conn)

        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, vid):
        """
        Fetches the properties of an individual view
        and render in the properties tab
        """
        SQL = render_template("/".join(
            [self.template_path, 'sql/properties.sql']
        ), vid=vid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the materialized view."""))

        SQL = render_template("/".join(
            [self.template_path, 'sql/acl.sql']), vid=vid)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        result = res['rows'][0]

        # sending result to formtter
        frmtd_reslt = self.formatter(result)

        # merging formated result with main result again
        result.update(frmtd_reslt)

        result['vacuum_table'] = self.parse_vacuum_data(
            self.conn, result, 'table')
        result['vacuum_toast'] = self.parse_vacuum_data(
            self.conn, result, 'toast')

        return ajax_response(
            response=result,
            status=200
        )

    @check_precondition
    def refresh_data(self, gid, sid, did, scid, vid):
        """
        This function will refresh view object
        """

        # Below will decide if it's refresh data or refresh concurrently
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        is_concurrent = json.loads(data['concurrent'])
        with_data = json.loads(data['with_data'])

        try:

            # Fetch view name by view id
            SQL = render_template("/".join(
                [self.template_path, 'sql/get_view_name.sql']), vid=vid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Refresh view
            SQL = render_template(
                "/".join([self.template_path, 'sql/refresh.sql']),
                name=res['rows'][0]['name'],
                nspname=res['rows'][0]['schema'],
                is_concurrent=is_concurrent,
                with_data=with_data
            )
            status, res_data = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res_data)

            return make_json_response(
                success=1,
                info=gettext("View refreshed"),
                data={
                    'id': vid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))


ViewNode.register_node_view(view_blueprint)
MViewNode.register_node_view(mview_blueprint)
