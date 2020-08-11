##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements View and Materialized View Node"""

import copy
import re
from functools import wraps

import simplejson as json
from flask import render_template, request, jsonify, current_app
from flask_babelex import gettext
from flask_security import current_user
import pgadmin.browser.server_groups.servers.databases as databases
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, parse_rule_definition, VacuumSettings, get_schema
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.utils import html, does_utility_exist
from pgadmin.model import Server
from pgadmin.misc.bgprocess.processes import BatchProcess, IProcessDesc


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
    _NODE_TYPE = 'view'
    _COLLECTION_LABEL = gettext("Views")

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
        return databases.DatabaseModule.node_type

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
                "views/css/view.css",
                node_type=self.node_type,
                _=gettext
            ),
            render_template(
                "mviews/css/mview.css",
                node_type='mview',
                _=gettext
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


class Message(IProcessDesc):
    def __init__(self, _sid, _data, _query):
        self.sid = _sid
        self.data = _data
        self.query = _query

    @property
    def message(self):
        res = gettext("Refresh Materialized View")
        opts = []
        if not self.data['is_with_data']:
            opts.append(gettext("With no data"))
        else:
            opts.append(gettext("With data"))
        if self.data['is_concurrent']:
            opts.append(gettext("Concurrently"))

        return res + " ({0})".format(', '.join(str(x) for x in opts))

    @property
    def type_desc(self):
        return gettext("Refresh Materialized View")

    def details(self, cmd, args):
        res = gettext("Refresh Materialized View ({0})")
        opts = []
        if not self.data['is_with_data']:
            opts.append(gettext("WITH NO DATA"))
        else:
            opts.append(gettext("WITH DATA"))

        if self.data['is_concurrent']:
            opts.append(gettext("CONCURRENTLY"))

        res = res.format(', '.join(str(x) for x in opts))

        res = '<div>' + html.safe_str(res)

        res += '</div><div class="py-1">'
        res += gettext("Running Query:")
        res += '<div class="pg-bg-cmd enable-selection p-1">'
        res += html.safe_str(self.query)
        res += '</div></div>'

        return res


class MViewModule(ViewModule):
    """
     class MViewModule(ViewModule)
        A module class for the materialized view node derived from ViewModule.
    """

    _NODE_TYPE = 'mview'
    _COLLECTION_LABEL = gettext("Materialized Views")

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
        self.min_gpdbver = 1000000000


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
        self.datlastsysoid = 0
        if (
            self.manager.db_info is not None and
            kwargs['did'] in self.manager.db_info
        ):
            self.datlastsysoid = self.manager.db_info[kwargs['did']][
                'datlastsysoid']

        # Set template path for sql scripts
        if self.manager.server_type == 'gpdb':
            _temp = self.gpdb_template_path(self.manager.version)
        elif self.manager.server_type == 'ppas':
            _temp = self.ppas_template_path(self.manager.version)
        else:
            _temp = self.pg_template_path(self.manager.version)
        self.template_path = self.template_initial + '/' + _temp

        self.column_template_path = 'columns/sql/#{0}#'.format(
            self.manager.version)

        return f(*args, **kwargs)

    return wrap


class ViewNode(PGChildNodeView, VacuumSettings, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for view node.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ViewNode and it's base view.

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

    * compare(**kwargs):
      - This function will compare the view nodes from two
        different schemas.
    """
    node_type = view_blueprint.node_type
    _SQL_PREFIX = 'sql/'
    _ALLOWED_PRIVS_JSON = 'sql/allowed_privs.json'

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
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'children': [{
            'get': 'children'
        }],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
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

    keys_to_ignore = ['oid', 'schema', 'xmin', 'oid-2']

    def __init__(self, *args, **kwargs):
        """
        Initialize the variables used by methods of ViewNode.
        """

        super(ViewNode, self).__init__(*args, **kwargs)

        self.manager = None
        self.conn = None
        self.template_path = None
        self.template_initial = 'views'

    @staticmethod
    def ppas_template_path(ver):
        """
        Returns the template path for PPAS servers.
        """
        return 'ppas/#{0}#'.format(ver)

    @staticmethod
    def pg_template_path(ver):
        """
        Returns the template path for PostgreSQL servers.
        """
        return 'pg/#{0}#'.format(ver)

    @staticmethod
    def gpdb_template_path(ver):
        """
        Returns the template path for GreenPlum servers.
        """
        return '#gpdb#{0}#'.format(ver)

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        Fetches all views properties and render into properties tab
        """
        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._PROPERTIES_SQL]),
            did=did, scid=scid)
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
            [self.template_path, self._SQL_PREFIX + self._NODES_SQL]),
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
            icon="icon-view" if self.node_type == 'view'
            else "icon-mview"
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
            [self.template_path, self._SQL_PREFIX + self._NODES_SQL]),
            scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-view" if self.node_type == 'view'
                    else "icon-mview"
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
        status, res = self._fetch_properties(scid, vid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, vid):
        """
        This function is used to fetch the properties of the specified object
        :param scid:
        :param vid:
        :return:
        """
        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._PROPERTIES_SQL]
        ), vid=vid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(gettext("""Could not find the view."""))

        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._ACL_SQL]), vid=vid)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []).append(priv)

        result = res['rows'][0]

        # sending result to formtter
        frmtd_reslt = self.formatter(result)

        # merging formated result with main result again
        result.update(frmtd_reslt)

        return True, result

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
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
        try:
            SQL, name_or_error = self.getSQL(gid, sid, did, data)
            if SQL is None:
                return name_or_error
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
                [self.template_path, self._SQL_PREFIX + self._OID_SQL]),
                vid=view_id)
            status, new_scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=new_scid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    view_id,
                    new_scid,
                    data['name'],
                    icon="icon-view" if self.node_type == 'view'
                    else "icon-mview"
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
            SQL, name = self.getSQL(gid, sid, did, data, vid)
            if SQL is None:
                return name
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
                [self.template_path, self._SQL_PREFIX + self._OID_SQL]),
                vid=view_id)
            status, new_scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=new_scid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    view_id,
                    new_scid,
                    new_view_name,
                    icon="icon-view" if self.node_type == 'view'
                    else "icon-mview"
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, vid=None, only_sql=False):
        """
        This function will drop a view object
        """
        if vid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [vid]}

        # Below will decide if it's simple drop or drop with cascade call
        cascade = True if self.cmd == 'delete' else False

        try:
            for vid in data['ids']:
                # Get name for view from vid
                SQL = render_template(
                    "/".join([self.template_path,
                              self._SQL_PREFIX + self._PROPERTIES_SQL]),
                    did=did,
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
                    "/".join([self.template_path,
                              self._SQL_PREFIX + self._DELETE_SQL]),
                    nspname=res_data['rows'][0]['schema'],
                    name=res_data['rows'][0]['name'], cascade=cascade
                )

                if only_sql:
                    return SQL

                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("View dropped")
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
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('comment',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        sql, name_or_error = self.getSQL(gid, sid, did, data, vid)
        if sql is None:
            return name_or_error

        sql = sql.strip('\n').strip(' ')

        if sql == '':
            sql = "--modified SQL"

        return make_json_response(
            data=sql,
            status=200
        )

    @staticmethod
    def _parse_privilege_data(acls, data):
        """
        Check and parse privilege data.
        acls: allowed privileges
        data: data on which we check for having privilege or not.
        """
        for aclcol in acls:
            if aclcol in data:
                allowedacl = acls[aclcol]

                for key in ['added', 'changed', 'deleted']:
                    if key in data[aclcol]:
                        data[aclcol][key] = parse_priv_to_db(
                            data[aclcol][key], allowedacl['acl']
                        )

    @staticmethod
    def _get_info_from_data(data, res):
        """
        Get name and schema data
        data: sql data.
        res: properties sql response.
        """
        if 'name' not in data:
            data['name'] = res['rows'][0]['name']
        if 'schema' not in data:
            data['schema'] = res['rows'][0]['schema']

    def getSQL(self, gid, sid, did, data, vid=None):
        """
        This function will generate sql from model data
        """
        if vid is not None:
            sql = render_template("/".join(
                [self.template_path,
                 self._SQL_PREFIX + self._PROPERTIES_SQL]),
                vid=vid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return None, internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return None, gone(
                    gettext("Could not find the view on the server.")
                )
            old_data = res['rows'][0]

            ViewNode._get_info_from_data(data, res)

            try:
                acls = render_template(
                    "/".join([self.template_path, self._ALLOWED_PRIVS_JSON])
                )
                acls = json.loads(acls, encoding='utf-8')
            except Exception as e:
                current_app.logger.exception(e)

            # Privileges
            ViewNode._parse_privilege_data(acls, data)

            data['del_sql'] = False
            old_data['acl_sql'] = ''

            is_error, errmsg = self._get_definition_data(vid, data, old_data,
                                                         res, acls)
            if is_error:
                return None, errmsg

            self.view_schema = old_data['schema']

            try:
                sql = render_template("/".join(
                    [self.template_path,
                     self._SQL_PREFIX + self._UPDATE_SQL]), data=data,
                    o_data=old_data, conn=self.conn)

                if 'definition' in data and data['definition']:
                    sql += self.get_columns_sql(did, vid)

            except Exception as e:
                current_app.logger.exception(e)
                return None, internal_server_error(errormsg=str(e))
        else:
            is_error, errmsg, sql = self._get_create_view_sql(data)
            if is_error:
                return None, errmsg

        return sql, data['name'] if 'name' in data else old_data['name']

    def _get_create_view_sql(self, data):
        """
        Get create view sql with it's privileges.
        data: Source data for sql generation
        return: created sql for create view.
        """
        required_args = [
            'name',
            'schema',
            'definition'
        ]
        for arg in required_args:
            if arg not in data:
                return True, make_json_response(
                    data=gettext(" -- definition incomplete"),
                    status=200
                ), ''

        # Get Schema Name from its OID.
        if 'schema' in data and isinstance(data['schema'], int):
            data['schema'] = self._get_schema(data['schema'])

        acls = []
        try:
            acls = render_template(
                "/".join([self.template_path, self._ALLOWED_PRIVS_JSON])
            )
            acls = json.loads(acls, encoding='utf-8')
        except Exception as e:
            current_app.logger.exception(e)

        # Privileges
        ViewNode._parse_priv_data(acls, data)

        sql = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._CREATE_SQL]),
            data=data)
        if data['definition']:
            sql += "\n"
            sql += render_template("/".join(
                [self.template_path, self._SQL_PREFIX + self._GRANT_SQL]),
                data=data)

        return False, '', sql

    def _get_definition_data(self, vid, data, old_data, res, acls):
        """
        Check and process definition data.
        vid: View Id.
        data: sql data.
        old_data: properties sql data.
        res: Response data from properties sql.
        acls: allowed privileges.

        return: If any error it will return True with error msg,
        if not retun False with error msg empty('')
        """
        if 'definition' in data and self.manager.server_type == 'pg':
            new_def = re.sub(r"\W", "", data['definition']).split('FROM')
            old_def = re.sub(r"\W", "", res['rows'][0]['definition']
                             ).split('FROM')
            if 'definition' in data and (
                len(old_def) > 1 or len(new_def) > 1
            ) and (
                old_def[0] != new_def[0] and
                old_def[0] not in new_def[0]
            ):
                data['del_sql'] = True

                # If we drop and recreate the view, the
                # privileges must be restored

                # Fetch all privileges for view
                is_error, errmsg = self._fetch_all_view_priv(vid, res)
                if is_error:
                    return True, errmsg

                old_data.update(res['rows'][0])

                # Privileges
                ViewNode._parse_priv_data(acls, old_data)

                old_data['acl_sql'] = render_template("/".join(
                    [self.template_path, self._SQL_PREFIX + self._GRANT_SQL]),
                    data=old_data)
        return False, ''

    def _fetch_all_view_priv(self, vid, res):
        """
        This is for fetch all privileges for the view.
        vid: View ID
        res: response data from property sql
        """
        sql_acl = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._ACL_SQL]), vid=vid)
        status, dataclres = self.conn.execute_dict(sql_acl)
        if not status:
            return True, internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            res['rows'][0].setdefault(row['deftype'], []
                                      ).append(priv)
        return False, ''

    @staticmethod
    def _parse_priv_data(acls, data):
        """
        Iterate privilege data and send it for parsing before send it to db.
        acls: allowed privileges
        data: data on which we check for privilege check.
        """
        for aclcol in acls:
            if aclcol in data:
                allowedacl = acls[aclcol]
                data[aclcol] = parse_priv_to_db(
                    data[aclcol], allowedacl['acl'])

    def get_index_column_details(self, idx, data):
        """
        This functional will fetch list of column details for index

        Args:
            idx: Index OID
            data: Properties data

        Returns:
            Updated properties data with column details
        """

        self.index_temp_path = 'indexes'
        SQL = render_template("/".join([self.index_temp_path,
                                        'sql/#{0}#/column_details.sql'.format(
                                            self.manager.version)]), idx=idx)
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
                'colname': row['attdef'],
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

        self.trigger_temp_path = 'schemas/triggers'
        SQL = render_template("/".join([self.trigger_temp_path,
                                        self._GET_COLUMNS_SQL]),
                              tid=tid, clist=clist)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)
        # 'tgattr' contains list of columns from table used in trigger
        columns = []

        for row in rset['rows']:
            columns.append({'column': row['name']})

        return columns

    def get_rule_sql(self, vid, display_comments=True):
        """
        Get all non system rules of view node,
        generate their sql and render
        into sql tab
        """

        self.rule_temp_path = 'rules'
        sql_data = ''
        SQL = render_template("/".join(
            [self.rule_temp_path, self._SQL_PREFIX + self._PROPERTIES_SQL]),
            tid=vid)

        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for rule in data['rows']:

            # Generate SQL only for non system rule
            if rule['name'] != '_RETURN':
                res = []
                SQL = render_template("/".join(
                    [self.rule_temp_path,
                     self._SQL_PREFIX + self._PROPERTIES_SQL]),
                    rid=rule['oid']
                )
                status, res = self.conn.execute_dict(SQL)
                res = parse_rule_definition(res)
                SQL = render_template("/".join(
                    [self.rule_temp_path,
                     self._SQL_PREFIX + self._CREATE_SQL]),
                    data=res, display_comments=display_comments)
                sql_data += '\n'
                sql_data += SQL
        return sql_data

    def _generate_and_return_trigger_sql(self, vid, data, display_comments,
                                         sql_data):
        """
        Iterate trigger data and generate sql for different tabs of trigger.
        vid: View ID
        data: Trigger data for iteration.
        display_comments: comments for sql
        sql_data: Sql queries
        return: Check if any error then return error, else return sql data.
        """

        from pgadmin.browser.server_groups.servers.databases.schemas.utils \
            import trigger_definition

        for trigger in data['rows']:
            SQL = render_template("/".join(
                [self.ct_trigger_temp_path,
                 'sql/{0}/#{1}#/properties.sql'.format(
                     self.manager.server_type, self.manager.version)]),
                tid=vid,
                trid=trigger['oid']
            )

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return True, internal_server_error(errormsg=res), ''

            if len(res['rows']) == 0:
                continue
            res_rows = dict(res['rows'][0])
            res_rows['table'] = res_rows['relname']
            res_rows['schema'] = self.view_schema

            if len(res_rows['tgattr']) > 1:
                columns = ', '.join(res_rows['tgattr'].split(' '))
                SQL = render_template("/".join(
                    [self.ct_trigger_temp_path,
                     'sql/{0}/#{1}#/get_columns.sql'.format(
                         self.manager.server_type,
                         self.manager.version)]),
                    tid=trigger['oid'],
                    clist=columns)

                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return True, internal_server_error(errormsg=rset), ''
                columns = []

                for col_row in rset['rows']:
                    columns.append(col_row['name'])

                res_rows['columns'] = columns

            res_rows = trigger_definition(res_rows)
            SQL = render_template("/".join(
                [self.ct_trigger_temp_path,
                 'sql/{0}/#{1}#/create.sql'.format(
                     self.manager.server_type, self.manager.version)]),
                data=res_rows, display_comments=display_comments)
            sql_data += '\n'
            sql_data += SQL

        return False, '', sql_data

    def get_compound_trigger_sql(self, vid, display_comments=True):
        """
        Get all compound trigger nodes associated with view node,
        generate their sql and render into sql tab
        """
        sql_data = ''
        if self.manager.server_type == 'ppas' \
                and self.manager.version >= 120000:

            # Define template path
            self.ct_trigger_temp_path = 'compound_triggers'

            SQL = render_template("/".join(
                [self.ct_trigger_temp_path,
                 'sql/{0}/#{1}#/nodes.sql'.format(
                     self.manager.server_type, self.manager.version)]),
                tid=vid)

            status, data = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=data)

            is_error, errmsg, sql_data = \
                self._generate_and_return_trigger_sql(
                    vid, data, display_comments, sql_data)

            if is_error:
                return errmsg

        return sql_data

    def get_trigger_sql(self, vid, display_comments=True):
        """
        Get all trigger nodes associated with view node,
        generate their sql and render
        into sql tab
        """
        if self.manager.server_type == 'gpdb':
            return ''

        from pgadmin.browser.server_groups.servers.databases.schemas.utils \
            import trigger_definition

        # Define template path
        self.trigger_temp_path = 'triggers'

        sql_data = ''
        SQL = render_template("/".join(
            [self.trigger_temp_path,
             'sql/{0}/#{1}#/properties.sql'.format(
                 self.manager.server_type, self.manager.version)]),
            tid=vid)

        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for trigger in data['rows']:
            SQL = render_template("/".join(
                [self.trigger_temp_path,
                 'sql/{0}/#{1}#/properties.sql'.format(
                     self.manager.server_type, self.manager.version)]),
                tid=vid,
                trid=trigger['oid']
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

            # It should be relname and not table, but in create.sql
            # (which is referred from many places) we have used
            # data.table and not data.relname so compatibility add new key as
            # table in res_rows.
            res_rows['table'] = res_rows['relname']
            res_rows['schema'] = self.view_schema

            # Get trigger function with its schema name
            SQL = render_template("/".join([
                self.trigger_temp_path,
                'sql/{0}/#{1}#/get_triggerfunctions.sql'.format(
                    self.manager.server_type, self.manager.version)]),
                tgfoid=res_rows['tgfoid'],
                show_system_objects=self.blueprint.show_system_objects)

            status, result = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=result)

            # Update the trigger function which we have fetched with
            # schemaname
            if (
                'rows' in result and len(result['rows']) > 0 and
                'tfunctions' in result['rows'][0]
            ):
                res_rows['tfunction'] = result['rows'][0]['tfunctions']

            # Format arguments
            if len(res_rows['custom_tgargs']) > 1:
                formatted_args = ["{0}".format(arg) for arg in
                                  res_rows['custom_tgargs']]
                res_rows['tgargs'] = ', '.join(formatted_args)

            SQL = render_template("/".join(
                [self.trigger_temp_path,
                 'sql/{0}/#{1}#/create.sql'.format(
                     self.manager.server_type, self.manager.version)]),
                data=res_rows, display_comments=display_comments)
            sql_data += '\n'
            sql_data += SQL

        return sql_data

    def get_index_sql(self, did, vid, display_comments=True):
        """
        Get all index associated with view node,
        generate their sql and render
        into sql tab
        """

        self.index_temp_path = 'indexes'
        sql_data = ''
        SQL = render_template("/".join(
            [self.index_temp_path,
             'sql/#{0}#/properties.sql'.format(self.manager.version)]),
            did=did,
            tid=vid)
        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for index in data['rows']:
            res = []
            SQL = render_template("/".join(
                [self.index_temp_path,
                 'sql/#{0}#/properties.sql'.format(self.manager.version)]),
                idx=index['oid'],
                did=did,
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
                [self.index_temp_path,
                 'sql/#{0}#/create.sql'.format(self.manager.version)]),
                data=data, display_comments=display_comments)
            sql_data += '\n'
            sql_data += SQL
        return sql_data

    def get_columns_sql(self, did, vid):
        """
        Get all column associated with view node,
        generate their sql and render
        into sql tab
        """

        sql_data = ''
        SQL = render_template("/".join(
            [self.column_template_path,
                self._PROPERTIES_SQL.format(self.manager.version)]),
            did=did,
            tid=vid)
        status, data = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=data)

        for rows in data['rows']:

            res = {
                'name': rows['name'],
                'atttypid': rows['atttypid'],
                'attlen': rows['attlen'],
                'typnspname': rows['typnspname'],
                'defval': None,
                'description': None,
                'table': rows['relname'],
                'schema': self.view_schema
            }

            o_data = copy.deepcopy(rows)

            # Generate alter statement for default value
            if 'defval' in rows and rows['defval'] is not None:
                res['defval'] = rows['defval']
                o_data['defval'] = None

            # Generate alter statement for comments
            if 'description' in rows and (rows['description'] is not None or
                                          rows['description'] != ''):
                res['description'] = rows['description']
                o_data['description'] = None

            SQL = render_template("/".join(
                [self.column_template_path,
                    self._UPDATE_SQL.format(self.manager.version)]),
                o_data=o_data, data=res, is_view_only=True)
            sql_data += SQL
        return sql_data

    @check_precondition
    def sql(self, gid, sid, did, scid, vid, **kwargs):
        """
        This function will generate sql to render into the sql panel
        """
        json_resp = kwargs.get('json_resp', True)
        display_comments = True

        if not json_resp:
            display_comments = False

        sql_data = ''
        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._PROPERTIES_SQL]),
            vid=vid,
            datlastsysoid=self.datlastsysoid
        )

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the view on the server.")
            )

        result = res['rows'][0]

        # sending result to formtter
        frmtd_reslt = self.formatter(result)

        # merging formated result with main result again
        result.update(frmtd_reslt)
        self.view_schema = result.get('schema')

        # Fetch all privileges for view
        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._ACL_SQL]), vid=vid)
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
                "/".join([self.template_path, self._ALLOWED_PRIVS_JSON])
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
            [self.template_path, self._SQL_PREFIX + self._CREATE_SQL]),
            data=result,
            conn=self.conn,
            display_comments=display_comments
        )
        SQL += "\n"
        SQL += render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._GRANT_SQL]),
            data=result)

        if ('seclabels' in result and len(result['seclabels']) > 0)\
                or ('datacl' in result and len(result['datacl']) > 0):
            SQL += "\n"

        sql_data += SQL
        sql_data += self.get_rule_sql(vid, display_comments)
        sql_data += self.get_trigger_sql(vid, display_comments)
        sql_data += self.get_compound_trigger_sql(vid, display_comments)
        sql_data += self.get_index_sql(did, vid, display_comments)
        sql_data += self.get_columns_sql(did, vid)

        if not json_resp:
            return sql_data
        return ajax_response(response=sql_data)

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
                self.template_path, self._SQL_PREFIX + self._PROPERTIES_SQL
            ]),
            scid=scid, vid=vid, did=did,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the view on the server.")
            )
        data_view = res['rows'][0]

        SQL = render_template(
            "/".join([
                self.column_template_path, self._PROPERTIES_SQL
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
                self.template_path, self._SQL_PREFIX + self._PROPERTIES_SQL
            ]),
            scid=scid, vid=vid, did=did,
            datlastsysoid=self.datlastsysoid
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the view on the server.")
            )

        data_view = res['rows'][0]

        SQL = render_template(
            "/".join([
                self.column_template_path, self._PROPERTIES_SQL
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

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, oid=None):
        """
        This function will fetch the list of all the views for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()

        if not oid:
            SQL = render_template("/".join(
                [self.template_path, self._SQL_PREFIX + self._NODES_SQL]),
                did=did, scid=scid, datlastsysoid=self.datlastsysoid)
            status, views = self.conn.execute_2darray(SQL)
            if not status:
                current_app.logger.error(views)
                return False

            for row in views['rows']:
                status, data = self._fetch_properties(scid, row['oid'])
                if status:
                    res[row['name']] = data
        else:
            status, data = self._fetch_properties(scid, oid)
            if not status:
                current_app.logger.error(data)
                return False
            res = data

        return res

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
        oid = kwargs.get('oid')
        data = kwargs.get('data', None)
        drop_sql = kwargs.get('drop_sql', False)

        if data:
            sql, name_or_error = self.getSQL(gid, sid, did, data, oid)
            if sql.find('DROP VIEW') != -1:
                sql = gettext("""
-- Changing the columns in a view requires dropping and re-creating the view.
-- This may fail if other objects are dependent upon this view,
-- or may cause procedural functions to fail if they are not modified to
-- take account of the changes.
""") + sql
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, vid=oid, only_sql=True)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, vid=oid,
                               json_resp=False)
        return sql


# Override the operations for materialized view
mview_operations = {
    'refresh_data': [{'put': 'refresh_data'}, {}],
    'check_utility_exists': [{'get': 'check_utility_exists'}, {}]
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

    * create(gid, sid, did, scid)
      - Raise an error - we cannot create a material view.

    * update(gid, sid, did, scid)
      - This function will update the data for the selected material node

    * delete(self, gid, sid, scid):
      - Raise an error - we cannot delete a material view.

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

        self.template_initial = 'mviews'

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

    @staticmethod
    def merge_to_vacuum_data(old_data, data, vacuum_key):
        """
        Used by getSQL method to merge vacuum data
        """
        if vacuum_key not in data:
            return

        if 'changed' not in data[vacuum_key]:
            return

        for item in data[vacuum_key]['changed']:
            old_data_item_key = item['name']
            if vacuum_key == 'vacuum_toast':
                old_data_item_key = 'toast_' + item['name']
                item['name'] = 'toast.' + item['name']

            if 'value' not in item.keys():
                continue
            if item['value'] is None:
                if old_data[old_data_item_key] != item['value']:
                    data['vacuum_data']['reset'].append(item)
            elif old_data[old_data_item_key] is None or \
                float(old_data[old_data_item_key]) != \
                    float(item['value']):
                data['vacuum_data']['changed'].append(item)

    def _getSQL_existing(self, did, data, vid):
        """
        Used by getSQL to get SQL for existing mview.
        """
        status, res = self._fetch_mview_properties(did, None, vid)

        if not status:
            return res

        old_data = res

        if 'name' not in data:
            data['name'] = res['name']
        if 'schema' not in data:
            data['schema'] = res['schema']

        # merge vacuum lists into one
        data['vacuum_data'] = {}
        data['vacuum_data']['changed'] = []
        data['vacuum_data']['reset'] = []

        # table vacuum: separate list of changed and reset data for
        self.merge_to_vacuum_data(old_data, data, 'vacuum_table')
        # table vacuum toast: separate list of changed and reset data for
        self.merge_to_vacuum_data(old_data, data, 'vacuum_toast')

        acls = []
        try:
            acls = render_template(
                "/".join([self.template_path, self._ALLOWED_PRIVS_JSON])
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
                [self.template_path,
                 self._SQL_PREFIX + self._UPDATE_SQL]), data=data,
                o_data=old_data, conn=self.conn)
        except Exception as e:
            current_app.logger.exception(e)
            return None, internal_server_error(errormsg=str(e))

        return SQL, old_data['name']

    def _getSQL_new(self, data):
        """
        Used by getSQL to get SQL for new mview.
        """
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
        vacuum_table = [item for item in data.get('vacuum_table', [])
                        if 'value' in item.keys() and
                        item['value'] is not None]
        vacuum_toast = [
            {'name': 'toast.' + item['name'], 'value': item['value']}
            for item in data.get('vacuum_toast', [])
            if 'value' in item.keys() and item['value'] is not None]

        # add vacuum_toast dict to vacuum_data
        data['vacuum_data'] = []
        if data.get('autovacuum_custom', False):
            data['vacuum_data'] = vacuum_table

        if data.get('toast_autovacuum', False):
            data['vacuum_data'] += vacuum_toast

        acls = []
        try:
            acls = render_template(
                "/".join([self.template_path, self._ALLOWED_PRIVS_JSON])
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
            [self.template_path, self._SQL_PREFIX + self._CREATE_SQL]),
            data=data)
        if data['definition']:
            SQL += "\n"
            SQL += render_template("/".join(
                [self.template_path, self._SQL_PREFIX + self._GRANT_SQL]),
                data=data)

        return SQL, data.get('name', None)

    def getSQL(self, gid, sid, did, data, vid=None):
        """
        This function will generate sql from model data
        """
        if vid is not None:
            SQL, data_name = self._getSQL_existing(did, data, vid)
        else:
            SQL, data_name = self._getSQL_new(data)

        return SQL, data_name

    @check_precondition
    def sql(self, gid, sid, did, scid, vid, **kwargs):
        """
        This function will generate sql to render into the sql panel
        """
        json_resp = kwargs.get('json_resp', True)

        display_comments = True

        if not json_resp:
            display_comments = False

        sql_data = ''
        status, result = self._fetch_mview_properties(did, scid, vid)

        if not status:
            return result

        # merge vacuum lists into one
        vacuum_table = [item for item in result['vacuum_table']
                        if
                        'value' in item.keys() and item['value'] is not None]
        vacuum_toast = [
            {'name': 'toast.' + item['name'], 'value': item['value']}
            for item in result['vacuum_toast'] if
            'value' in item.keys() and item['value'] is not None]

        result['vacuum_data'] = vacuum_table + vacuum_toast

        acls = []
        try:
            acls = render_template(
                "/".join([self.template_path, self._ALLOWED_PRIVS_JSON])
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
            [self.template_path, self._SQL_PREFIX + self._CREATE_SQL]),
            data=result,
            conn=self.conn,
            display_comments=display_comments
        )
        SQL += "\n"
        SQL += render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._GRANT_SQL]),
            data=result)

        sql_data += SQL
        sql_data += self.get_rule_sql(vid, display_comments)
        sql_data += self.get_trigger_sql(vid, display_comments)
        sql_data += self.get_index_sql(did, vid, display_comments)
        sql_data = sql_data.strip('\n')

        if not json_resp:
            return sql_data
        return ajax_response(response=sql_data)

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

        res = self.get_vacuum_table_settings(self.conn, sid)
        return ajax_response(
            response=res,
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
        res = self.get_vacuum_toast_settings(self.conn, sid)

        return ajax_response(
            response=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, vid):
        """
        Fetches the properties of an individual view
        and render in the properties tab
        """
        status, res = self._fetch_mview_properties(did, scid, vid)

        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_mview_properties(self, did, scid, vid):
        """
        This function is used to fetch the properties of the specified object
        :param did:
        :param scid:
        :param vid:
        :return:
        """
        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._PROPERTIES_SQL]
        ), did=did, vid=vid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("""Could not find the materialized view."""))

        # Set value based on
        # x: No set, t: true, f: false
        res['rows'][0]['autovacuum_enabled'] = 'x' \
            if res['rows'][0]['autovacuum_enabled'] is None else \
            {True: 't', False: 'f'}[res['rows'][0]['autovacuum_enabled']]

        res['rows'][0]['toast_autovacuum_enabled'] = 'x' \
            if res['rows'][0]['toast_autovacuum_enabled'] is None else \
            {True: 't', False: 'f'}[res['rows'][0]['toast_autovacuum_enabled']]

        # Enable custom autovaccum only if one of the options is set
        # or autovacuum is set
        res['rows'][0]['autovacuum_custom'] = any([
            res['rows'][0]['autovacuum_vacuum_threshold'],
            res['rows'][0]['autovacuum_vacuum_scale_factor'],
            res['rows'][0]['autovacuum_analyze_threshold'],
            res['rows'][0]['autovacuum_analyze_scale_factor'],
            res['rows'][0]['autovacuum_vacuum_cost_delay'],
            res['rows'][0]['autovacuum_vacuum_cost_limit'],
            res['rows'][0]['autovacuum_freeze_min_age'],
            res['rows'][0]['autovacuum_freeze_max_age'],
            res['rows'][0]['autovacuum_freeze_table_age']]) \
            or res['rows'][0]['autovacuum_enabled'] in ('t', 'f')

        res['rows'][0]['toast_autovacuum'] = any([
            res['rows'][0]['toast_autovacuum_vacuum_threshold'],
            res['rows'][0]['toast_autovacuum_vacuum_scale_factor'],
            res['rows'][0]['toast_autovacuum_analyze_threshold'],
            res['rows'][0]['toast_autovacuum_analyze_scale_factor'],
            res['rows'][0]['toast_autovacuum_vacuum_cost_delay'],
            res['rows'][0]['toast_autovacuum_vacuum_cost_limit'],
            res['rows'][0]['toast_autovacuum_freeze_min_age'],
            res['rows'][0]['toast_autovacuum_freeze_max_age'],
            res['rows'][0]['toast_autovacuum_freeze_table_age']]) \
            or res['rows'][0]['toast_autovacuum_enabled'] in ('t', 'f')

        res['rows'][0]['vacuum_settings_str'] = ''

        if res['rows'][0]['reloptions'] is not None:
            res['rows'][0]['vacuum_settings_str'] += '\n'.\
                join(res['rows'][0]['reloptions'])

        if res['rows'][0]['toast_reloptions'] is not None:
            res['rows'][0]['vacuum_settings_str'] += '\n' \
                if res['rows'][0]['vacuum_settings_str'] != "" else ""
            res['rows'][0]['vacuum_settings_str'] += '\n'.\
                join(map(lambda o: 'toast.' + o,
                         res['rows'][0]['toast_reloptions']))

        res['rows'][0]['vacuum_settings_str'] = res['rows'][0][
            'vacuum_settings_str'
        ].replace('=', ' = ')

        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._ACL_SQL]), vid=vid)
        status, dataclres = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

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

        return True, result

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
        data = dict()
        data['is_concurrent'] = is_concurrent
        data['is_with_data'] = with_data
        try:

            # Fetch view name by view id
            SQL = render_template("/".join(
                [self.template_path, 'sql/get_view_name.sql']), vid=vid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(
                    gettext("""Could not find the materialized view.""")
                )

            # Refresh view
            SQL = render_template(
                "/".join([self.template_path, 'sql/refresh.sql']),
                name=res['rows'][0]['name'],
                nspname=res['rows'][0]['schema'],
                is_concurrent=is_concurrent,
                with_data=with_data
            )

            # Fetch the server details like hostname, port, roles etc
            server = Server.query.filter_by(
                id=sid).first()

            if server is None:
                return make_json_response(
                    success=0,
                    errormsg=gettext("Could not find the given server")
                )

            # To fetch MetaData for the server
            driver = get_driver(PG_DEFAULT_DRIVER)
            manager = driver.connection_manager(server.id)
            conn = manager.connection()
            connected = conn.connected()

            if not connected:
                return make_json_response(
                    success=0,
                    errormsg=gettext("Please connect to the server first.")
                )
            # Fetch the database name from connection manager
            db_info = manager.db_info.get(did, None)
            if db_info:
                data['database'] = db_info['datname']
            else:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        "Could not find the database on the server.")
                )
            utility = manager.utility('sql')
            ret_val = does_utility_exist(utility)
            if ret_val:
                return make_json_response(
                    success=0,
                    errormsg=ret_val
                )

            args = [
                '--host',
                manager.local_bind_host if manager.use_ssh_tunnel
                else server.host,
                '--port',
                str(manager.local_bind_port) if manager.use_ssh_tunnel
                else str(server.port),
                '--username', server.username, '--dbname',
                data['database'],
                '--command', SQL
            ]

            try:
                p = BatchProcess(
                    desc=Message(sid, data, SQL),
                    cmd=utility, args=args
                )
                manager.export_password_env(p.id)
                # Check for connection timeout and if it is greater than 0
                # then set the environment variable PGCONNECT_TIMEOUT.
                if manager.connect_timeout > 0:
                    env = dict()
                    env['PGCONNECT_TIMEOUT'] = str(manager.connect_timeout)
                    p.set_env_variables(server, env=env)
                else:
                    p.set_env_variables(server)

                p.start()
                jid = p.id
            except Exception as e:
                current_app.logger.exception(e)
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=str(e)
                )
            # Return response
            return make_json_response(
                data={
                    'job_id': jid,
                    'status': True,
                    'info': gettext(
                        'Materialized view refresh job created.')
                }
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, oid=None):
        """
        This function will fetch the list of all the mviews for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join(
            [self.template_path, self._SQL_PREFIX + self._NODES_SQL]),
            did=did, scid=scid, datlastsysoid=self.datlastsysoid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in rset['rows']:
            status, data = self._fetch_mview_properties(did, scid, row['oid'])
            if status:
                res[row['name']] = data

        return res

    @check_precondition
    def check_utility_exists(self, gid, sid, did, scid, vid):
        """
        This function checks the utility file exist on the given path.

        Args:
            sid: Server ID
        Returns:
            None
        """
        server = Server.query.filter_by(
            id=sid, user_id=current_user.id
        ).first()

        if server is None:
            return make_json_response(
                success=0,
                errormsg=gettext("Could not find the specified server.")
            )

        driver = get_driver(PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(server.id)

        utility = manager.utility('sql')
        ret_val = does_utility_exist(utility)
        if ret_val:
            return make_json_response(
                success=0,
                errormsg=ret_val
            )

        return make_json_response(success=1)


SchemaDiffRegistry(view_blueprint.node_type, ViewNode)
ViewNode.register_node_view(view_blueprint)
SchemaDiffRegistry(mview_blueprint.node_type, MViewNode)
MViewNode.register_node_view(mview_blueprint)
