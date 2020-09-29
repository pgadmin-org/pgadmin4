##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the Check Constraint Module."""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, make_response, request, jsonify
from flask_babelex import gettext as _
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.type import ConstraintRegistry
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.check_constraint import utils as check_utils
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


class CheckConstraintModule(CollectionNodeModule):
    """
    class CheckConstraintModule(CollectionNodeModule):

        This class represents The Check Constraint Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Check Constraint Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Check Constraint collection node.

    * node_inode(gid, sid, did, scid)
      - Returns Check Constraint node as leaf node.

    * script_load()
      - Load the module script for the Check Constraint, when any of the
        Check node is initialized.
    """
    _NODE_TYPE = 'check_constraint'
    _COLLECTION_LABEL = _("Check Constraints")

    def __init__(self, *args, **kwargs):
        super(CheckConstraintModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid, doid):
        """
        Generate the Check Constraint collection node.
        """
        yield self.generate_browser_collection_node(doid)

    @property
    def node_inode(self):
        """
        Returns Check Constraint node as leaf node.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for the Check Constraint, when any of the
        Check node is initialized.
        """
        return database.DatabaseModule.node_type

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
        return [
            render_template(
                "check_constraint/css/check_constraint.css",
                node_type=self.node_type
            )
        ]


blueprint = CheckConstraintModule(__name__)


class CheckConstraintView(PGChildNodeView):
    """
    class CheckConstraintView(PGChildNodeView):

    This class inherits PGChildNodeView to get the different routes for
    the module.

    The class is responsible to Create, Read, Update and Delete operations for
    the Check Constraint.

    Methods:
    -------

    * check_precondition(f):
      - Works as a decorator.
      -  Checks database connection status.
      -  Attach connection object and template path.

    * list(gid, sid, did, scid, doid):
      - List the Check Constraints.

    * nodes(gid, sid, did, scid):
      - Returns all the Check Constraints to generate Nodes in the browser.

    * properties(gid, sid, did, scid, doid):
      - Returns the Check Constraint properties.

    * create(gid, sid, did, scid):
      - Creates a new Check Constraint object.

    * update(gid, sid, did, scid, doid):
      - Updates the Check Constraint object.

    * delete(gid, sid, did, scid, doid):
      - Drops the Check Constraint object.

    * sql(gid, sid, did, scid, doid=None):
      - Returns the SQL for the Check Constraint object.

    * msql(gid, sid, did, scid, doid=None):
      - Returns the modified SQL.

    * dependents(gid, sid, did, scid, tid, cid):
      - Returns the dependents for the Check Constraint object.

    * dependencies(gid, sid, did, scid, tid, cid):
      - Returns the dependencies for the Check Constraint object.

    * validate_check_constraint(gid, sid, did, scid, tid, cid):
      - Validate check constraint.
    """
    node_type = blueprint.node_type
    CHECK_CONSTRAINT_PATH = 'check_constraint/sql/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [
        {'type': 'int', 'id': 'cid'}
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
        'validate': [{'get': 'validate_check_constraint'}],
    })

    def check_precondition(f):
        """
        Works as a decorator.
        Checks database connection status.
        Attach connection object and template path.
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            self = args[0]
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])
            self.qtIdent = driver.qtIdent
            self.datlastsysoid = \
                self.manager.db_info[kwargs['did']]['datlastsysoid'] \
                if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            # Set the template path for the SQL scripts
            self.template_path = self.CHECK_CONSTRAINT_PATH.format(
                self.manager.version)

            schema, table = check_utils.get_parent(self.conn, kwargs['tid'])
            self.schema = schema
            self.table = table

            return f(*args, **kwargs)

        return wrap

    def end_transaction(self):
        """
            End database transaction.
        Returns:

        """
        SQL = "END;"
        self.conn.execute_scalar(SQL)

    @check_precondition
    def list(self, gid, sid, did, scid, tid, cid=None):
        """
        List the Check Constraints.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Id
        """
        try:
            res = self.get_node_list(gid, sid, did, scid, tid, cid)
            return ajax_response(
                response=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_node_list(self, gid, sid, did, scid, tid, cid=None):
        """
        This function returns all check constraints
        nodes within that collection as a list.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          cid: Cehck constraint ID

        Returns:

        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        self.manager = driver.connection_manager(sid)
        self.conn = self.manager.connection(did=did)
        self.qtIdent = driver.qtIdent

        # Set the template path for the SQL scripts
        self.template_path = self.CHECK_CONSTRAINT_PATH.format(
            self.manager.version)

        schema, table = check_utils.get_parent(self.conn, tid)
        self.schema = schema
        self.table = table

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]), tid=tid)
        status, res = self.conn.execute_dict(SQL)

        for row in res['rows']:
            row['_type'] = self.node_type

        return res['rows']

    @check_precondition
    def node(self, gid, sid, did, scid, tid, cid):
        """
        Returns all the Check Constraints.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check constraint Id.
        """
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]),
                              tid=tid,
                              cid=cid)
        status, rset = self.conn.execute_2darray(SQL)

        if len(rset['rows']) == 0:
            return gone(_("""Could not find the check constraint."""))

        if "convalidated" in rset['rows'][0] and \
                rset['rows'][0]["convalidated"]:
            icon = "icon-check_constraint_bad"
            valid = False
        else:
            icon = "icon-check_constraint"
            valid = True
        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            tid,
            rset['rows'][0]['name'],
            icon=icon,
            valid=valid
        )
        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid):
        """
        Returns all the Check Constraints.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check constraint Id.
        """
        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)

        for row in rset['rows']:
            if "convalidated" in row and row["convalidated"]:
                icon = "icon-check_constraint_bad"
                valid = False
            else:
                icon = "icon-check_constraint"
                valid = True
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon=icon,
                    valid=valid
                ))
            return make_json_response(
                data=res,
                status=200
            )

    def get_nodes(self, gid, sid, did, scid, tid, cid=None):
        """
        This function returns all event check constraint as a list.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          cid: Check constraint ID

        Returns:

        """
        driver = get_driver(PG_DEFAULT_DRIVER)
        self.manager = driver.connection_manager(sid)
        self.conn = self.manager.connection(did=did)
        self.qtIdent = driver.qtIdent

        # Set the template path for the SQL scripts
        self.template_path = self.CHECK_CONSTRAINT_PATH.format(
            self.manager.version)

        schema, table = check_utils.get_parent(self.conn, tid)
        self.schema = schema
        self.table = table

        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)

        for row in rset['rows']:
            if "convalidated" in row and row["convalidated"]:
                icon = "icon-check_constraint_bad"
                valid = False
            else:
                icon = "icon-check_constraint"
                valid = True
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon=icon,
                    valid=valid
                ))
        return res

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, cid):
        """
        Returns the Check Constraints property.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Check Id
            cid: Check Constraint Id
        """

        status, res = check_utils.get_check_constraints(self.conn, tid, cid)
        if not status:
            return res

        if len(res) == 0:
            return gone(_(
                """Could not find the check constraint in the table."""
            ))

        result = res
        if cid:
            result = res[0]
        result['is_sys_obj'] = (
            result['oid'] <= self.datlastsysoid)

        return ajax_response(
            response=result,
            status=200
        )

    @staticmethod
    def _get_req_data():
        """
        Get all required data from request data attribute.
        :return: Request data and Error if any.
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        for k, v in data.items():
            try:
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('comment',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        required_args = ['consrc']

        for arg in required_args:
            if arg not in data or data[arg] == '':
                return True, make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter ({})."
                    ).format(arg),
                ), data
        return False, '', data

    @staticmethod
    def _check_valid_icon(res):
        """
        Check and return icon value and is valid value.
        :param res: Response data.
        :return: icon value and valid flag.
        """
        if "convalidated" in res['rows'][0] and res['rows'][0]["convalidated"]:
            icon = "icon-check_constraint_bad"
            valid = False
        else:
            icon = "icon-check_constraint"
            valid = True

        return icon, valid

    @check_precondition
    def create(self, gid, sid, did, scid, tid, cid=None):
        """
        This function will create a primary key.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          cid: Check constraint ID

        Returns:

        """
        is_error, errmsg, data = CheckConstraintView._get_req_data()
        if is_error:
            return errmsg

        data['schema'] = self.schema
        data['table'] = self.table
        # Checking whether the table is deleted via query tool
        if len(data['table']) == 0:
            return gone(_(self.not_found_error_msg('Table')))

        try:
            if 'name' not in data or data['name'] == "":
                sql = "BEGIN;"
                # Start transaction.
                status, res = self.conn.execute_scalar(sql)
                if not status:
                    self.end_transaction()
                    return internal_server_error(errormsg=res)

            # The below SQL will execute CREATE DDL only
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data
            )

            status, msg = self.conn.execute_scalar(sql)
            if not status:
                self.end_transaction()
                return internal_server_error(errormsg=msg)

            if 'name' not in data or data['name'] == "":
                sql = render_template(
                    "/".join([self.template_path,
                              'get_oid_with_transaction.sql'],
                             ),
                    tid=tid)

                status, res = self.conn.execute_dict(sql)
                if not status:
                    self.end_transaction()
                    return internal_server_error(errormsg=res)

                self.end_transaction()

                data['name'] = res['rows'][0]['name']

            else:
                sql = render_template(
                    "/".join([self.template_path, self._OID_SQL]),
                    tid=tid,
                    name=data['name']
                )
                status, res = self.conn.execute_dict(sql)
                if not status:
                    self.end_transaction()
                    return internal_server_error(errormsg=res)

            icon, valid = CheckConstraintView._check_valid_icon(res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    res['rows'][0]['oid'],
                    tid,
                    data['name'],
                    icon=icon,
                    valid=valid
                )
            )

        except Exception as e:
            self.end_transaction()
            return make_json_response(
                status=400,
                success=0,
                errormsg=e
            )

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, cid=None):
        """
        Drops the Check Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Check Id
            cid: Check Constraint Id
        """
        if cid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [cid]}

        try:
            for cid in data['ids']:
                SQL = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      tid=tid, cid=cid)
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)

                if not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=_(
                            'Error: Object not found.'
                        ),
                        info=_(
                            'The specified check constraint '
                            'could not be found.\n'
                        )
                    )

                data = res['rows'][0]

                SQL = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data)
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Check constraint dropped.")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, cid):
        """
        Updates the Check Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Constraint Id
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            data['schema'] = self.schema
            data['table'] = self.table

            SQL, name = check_utils.get_sql(self.conn, data, tid, cid)
            if not SQL:
                return name
            SQL = SQL.strip('\n').strip(' ')

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template(
                "/".join([self.template_path, 'get_name.sql']), cid=cid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if "convalidated" in res['rows'][0] and \
                    res['rows'][0]["convalidated"]:
                icon = 'icon-check_constraint_bad'
                valid = False
            else:
                icon = 'icon-check_constraint'
                valid = True

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    cid,
                    tid,
                    name,
                    icon=icon,
                    valid=valid
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, cid=None):
        """
        Returns the SQL for the Check Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Constraint Id
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              tid=tid, cid=cid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                _("Could not find the object on the server.")
            )

        data = res['rows'][0]
        data['schema'] = self.schema
        data['table'] = self.table

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data)

        sql_header = "-- Constraint: {0}\n\n-- ".format(data['name'])

        sql_header += render_template(
            "/".join([self.template_path, self._DELETE_SQL]),
            data=data)
        sql_header += "\n"

        SQL = sql_header + SQL

        return ajax_response(response=SQL)

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, cid=None):
        """
        Returns the modified SQL.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Constraint Id

        Returns:
            Check Constraint object in json format.
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

        data['schema'] = self.schema
        data['table'] = self.table
        try:
            sql, name = check_utils.get_sql(self.conn, data, tid, cid)
            if not sql:
                return name
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
    def dependents(self, gid, sid, did, scid, tid, cid):
        """
        This function get the dependents and return ajax response
        for the Check Constraint node.

        Args:
            gid:  Server Group Id
            sid:  Server Id
            did:  Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Constraint Id
        """
        dependents_result = self.get_dependents(self.conn, cid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, cid):
        """
        This function get the dependencies and return ajax response
        for the Check Constraint node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Constraint Id
        """
        dependencies_result = self.get_dependencies(self.conn, cid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def validate_check_constraint(self, gid, sid, did, scid, tid, cid):
        """
        Validate check constraint.
        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            tid: Table Id
            cid: Check Constraint Id

        Returns:

        """
        data = {}
        try:
            data['schema'] = self.schema
            data['table'] = self.table
            sql = render_template(
                "/".join([self.template_path, 'get_name.sql']), cid=cid)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            data['name'] = res
            sql = render_template(
                "/".join([self.template_path, 'validate.sql']), data=data)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Check constraint updated."),
                data={
                    'id': cid,
                    'tid': tid,
                    'scid': scid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))


constraint = ConstraintRegistry(
    'check_constraint', CheckConstraintModule, CheckConstraintView
)
CheckConstraintView.register_node_view(blueprint)
