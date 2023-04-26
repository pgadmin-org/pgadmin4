
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the Domain Constraint Module."""

from functools import wraps

import json
from flask import render_template, request, jsonify
from flask_babel import gettext

from pgadmin.browser.server_groups.servers.databases.schemas import domains
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from pgadmin.utils.exception import ObjectGone


class DomainConstraintModule(CollectionNodeModule):
    """
    class DomainConstraintModule(CollectionNodeModule):

        This class represents The Domain Constraint Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Domain Constraint Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the Domain Constraint collection node.

    * node_inode(gid, sid, did, scid)
      - Returns Domain Constraint node as leaf node.

    * script_load()
      - Load the module script for the Domain Constraint, when any of the
        Domain node is initialized.
    """
    _NODE_TYPE = 'domain_constraints'
    _COLLECTION_LABEL = gettext("Domain Constraints")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid, doid):
        """
        Generate the Domain Constraint collection node.
        """
        yield self.generate_browser_collection_node(doid)

    @property
    def node_inode(self):
        """
        Returns Domain Constraint node as leaf node.
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for the Domain Constraint, when any of the
        Domain node is initialized.
        """
        return domains.DomainModule.node_type

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        return [
            render_template(
                "domain_constraints/css/domain_constraints.css",
                node_type=self.node_type
            )
        ]

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = DomainConstraintModule(__name__)


class DomainConstraintView(PGChildNodeView):
    """
    class DomainConstraintView(PGChildNodeView):

    This class inherits PGChildNodeView to get the different routes for
    the module.

    The class is responsible to Create, Read, Update and Delete operations for
    the Domain Constraint.

    Methods:
    -------

    * check_precondition(f):
      - Works as a decorator.
      -  Checks database connection status.
      -  Attach connection object and template path.

    * list(gid, sid, did, scid, doid):
      - List the Domain Constraints.

    * nodes(gid, sid, did, scid):
      - Returns all the Domain Constraints to generate Nodes in the browser.

    * properties(gid, sid, did, scid, doid):
      - Returns the Domain Constraint properties.

    * create(gid, sid, did, scid):
      - Creates a new Domain Constraint object.

    * update(gid, sid, did, scid, doid):
      - Updates the Domain Constraint object.

    * delete(gid, sid, did, scid, doid):
      - Drops the Domain Constraint object.

    * sql(gid, sid, did, scid, doid=None):
      - Returns the SQL for the Domain Constraint object.

    * msql(gid, sid, did, scid, doid=None):
      - Returns the modified SQL.

    * get_sql(gid, sid, data, scid, doid=None):
      - Generates the SQL statements to create/update the Domain Constraint.
        object.

    * dependents(gid, sid, did, scid, doid, coid):
      - Returns the dependents for the Domain Constraint object.

    * dependencies(gid, sid, did, scid, doid, coid):
      - Returns the dependencies for the Domain Constraint object.
    """
    node_type = blueprint.node_type
    node_label = "Domain Constraint"

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'doid'}
    ]
    ids = [
        {'type': 'int', 'id': 'coid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

    @staticmethod
    def _get_req_data(kwargs):
        """
        Get data from request.
        :param kwargs: kwargs for request.
        :return: if any error return error with error msg else return req data
        """
        if request.data:
            req = json.loads(request.data)
        else:
            req = request.args or request.form

        if 'coid' not in kwargs:
            required_args = [
                'name',
                'consrc'
            ]

            for arg in required_args:
                if arg not in req or req[arg] == '':
                    return True, make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            "Could not find the required parameter ({})."
                        ).format(arg)
                    ), req
        return False, '', req

    def validate_request(f):
        """
        Works as a decorator.
        Validating request on the request of create, update and modified SQL.

        Required Args:
                    name: Name of the Domain Constraint
                    consrc: Check Constraint Definition

        Above both the arguments will not be validated in the update action.
        """

        @wraps(f)
        def wrap(self, **kwargs):

            data = {}
            is_error, errmsg, req = DomainConstraintView._get_req_data(kwargs)
            if is_error:
                return errmsg

            try:
                for key in req:
                    if key == 'convalidated':
                        data[key] = True if (req[key] == 'true' or req[key] is
                                             True) else False
                    else:
                        data[key] = req[key]

            except Exception as e:
                return internal_server_error(errormsg=str(e))

            self.request = data
            return f(self, **kwargs)

        return wrap

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
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                kwargs['did'] in self.manager.db_info and
                'datistemplate' in self.manager.db_info[kwargs['did']]
            ):
                self.datistemplate = self.manager.db_info[
                    kwargs['did']]['datistemplate']

            # Set the template path for the SQL scripts
            self.template_path = 'domain_constraints/sql/#{0}#'.format(
                self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid, doid):
        """
        List the Domain Constraints.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              doid=doid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, doid):
        """
        Returns all the Domain Constraints.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """
        res = []
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              doid=doid)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            if 'convalidated' not in row:
                icon = 'icon-domain_constraints'
            elif row['convalidated']:
                icon = 'icon-domain_constraints'
            else:
                icon = 'icon-domain_constraints-bad'
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    doid,
                    row['name'],
                    icon=icon,
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, doid, coid):
        """
        Returns all the Domain Constraints.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              coid=coid)
        status, rset = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            if 'convalidated' not in row:
                icon = 'icon-domain_constraints'
            elif row['convalidated']:
                icon = 'icon-domain_constraints'
            else:
                icon = 'icon-domain_constraints-bad'
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    doid,
                    row['name'],
                    icon=icon
                ),
                status=200
            )

        return gone(self.not_found_error_msg())

    @check_precondition
    def properties(self, gid, sid, did, scid, doid, coid):
        """
        Returns the Domain Constraints property.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              doid=doid, coid=coid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]
        data['is_sys_obj'] = (
            data['oid'] <= self._DATABASE_LAST_SYSTEM_OID or
            self.datistemplate)
        return ajax_response(
            response=data,
            status=200
        )

    @check_precondition
    @validate_request
    def create(self, gid, sid, did, scid, doid):
        """
        Creates a new Domain Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id

        Returns:
            Domain Constraint object in json format.
        """
        data = self.request
        try:
            status, SQL, name = self.get_sql(gid, sid, data, scid, doid)
            if not status:
                return SQL

            status, res = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            # Get the recently added constraints oid
            SQL = render_template("/".join([self.template_path,
                                            self._OID_SQL]),
                                  doid=doid, name=data['name'],
                                  conn=self.conn)
            status, coid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=coid)

            if 'convalidated' not in data:
                icon = 'icon-domain_constraints'
            elif 'convalidated' in data and data['convalidated']:
                icon = 'icon-domain_constraints'
            else:
                icon = 'icon-domain_constraints-bad'

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    coid,
                    doid,
                    data['name'],
                    icon=icon
                )
            )
        except ObjectGone:
            raise
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, doid, coid=None):
        """
        Drops the Domain Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """
        if coid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [coid]}

        try:
            for coid in data['ids']:
                SQL = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      doid=doid, coid=coid)
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=res)

                if not res['rows']:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=self.not_found_error_msg()
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
                info=gettext("Domain Constraint dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    @validate_request
    def update(self, gid, sid, did, scid, doid, coid):
        """
        Updates the Domain Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """
        data = self.request
        status, SQL, name = self.get_sql(gid, sid, data, scid, doid, coid)
        if not status:
            return SQL

        try:
            if SQL and status:
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                if 'convalidated' in data and data['convalidated']:
                    icon = 'icon-domain_constraints'
                elif 'convalidated' in data and not data['convalidated']:
                    icon = 'icon-domain_constraints-bad'
                else:
                    icon = ''

                other_node_info = {}
                if 'description' in data:
                    other_node_info['description'] = data['description']

                return jsonify(
                    node=self.blueprint.generate_browser_node(
                        coid,
                        doid,
                        name,
                        icon=icon,
                        **other_node_info
                    )
                )
            else:
                return make_json_response(
                    success=1,
                    info="Nothing to update",
                    data={
                        'id': coid,
                        'doid': doid,
                        'scid': scid,
                        'sid': sid,
                        'gid': gid,
                        'did': did
                    }
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def sql(self, gid, sid, did, scid, doid, coid=None):
        """
        Returns the SQL for the Domain Constraint object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """

        # Get Schema and Domain.
        schema, domain = self._get_domain(doid)

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              doid=doid, coid=coid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, domain=domain, schema=schema)

        sql_header = """-- CHECK: {1}.{0}

-- ALTER DOMAIN {1} DROP CONSTRAINT {0};

""".format(self.qtIdent(self.conn, data['name']),
           self.qtIdent(self.conn, schema, domain))

        SQL = sql_header + SQL

        return ajax_response(response=SQL)

    @check_precondition
    @validate_request
    def msql(self, gid, sid, did, scid, doid, coid=None):
        """
        Returns the modified SQL.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id

        Returns:
            Domain Constraint object in json format.
        """
        data = self.request

        status, SQL, name = self.get_sql(gid, sid, data, scid, doid, coid)
        if status and SQL:
            return make_json_response(
                data=SQL,
                status=200
            )
        else:
            return SQL

    def get_sql(self, gid, sid, data, scid, doid, coid=None):
        """
        Generates the SQL statements to create/update the Domain Constraint.

         Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """
        try:
            if coid is not None:
                SQL = render_template("/".join([self.template_path,
                                                self._PROPERTIES_SQL]),
                                      doid=doid, coid=coid)
                status, res = self.conn.execute_dict(SQL)

                if not status:
                    return False, internal_server_error(errormsg=res)
                if len(res['rows']) == 0:
                    return False, gone(self.not_found_error_msg())

                old_data = res['rows'][0]

                SQL = render_template(
                    "/".join([self.template_path, self._UPDATE_SQL]),
                    data=data, o_data=old_data, conn=self.conn
                )
            else:
                schema, domain = self._get_domain(doid)

                SQL = render_template("/".join([self.template_path,
                                                self._CREATE_SQL]),
                                      data=data, domain=domain, schema=schema)
            if 'name' in data:
                return True, SQL.strip('\n'), data['name']
            else:
                return True, SQL.strip('\n'), old_data['name']
        except ObjectGone:
            raise
        except Exception as e:
            return False, internal_server_error(errormsg=str(e)), None

    def _get_domain(self, doid):
        """
        Returns Domain and Schema name.

        Args:
            doid: Domain Id

        """
        SQL = render_template("/".join([self.template_path,
                                        'get_domain.sql']),
                              doid=doid)
        status, res = self.conn.execute_2darray(SQL)

        if not status:
            return False, internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            raise ObjectGone(self.not_found_error_msg('Domain'))

        return res['rows'][0]['schema'], res['rows'][0]['domain']

    @check_precondition
    def dependents(self, gid, sid, did, scid, doid, coid):
        """
        This function get the dependents and return ajax response
        for the Domain Constraint node.

        Args:
            gid:  Server Group Id
            sid:  Server Id
            did:  Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """
        dependents_result = self.get_dependents(self.conn, coid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, doid, coid):
        """
        This function get the dependencies and return ajax response
        for the Domain Constraint node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            coid: Domain Constraint Id
        """
        dependencies_result = self.get_dependencies(self.conn, coid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


DomainConstraintView.register_node_view(blueprint)
