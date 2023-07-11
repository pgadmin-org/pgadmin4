##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the Domain Node."""

from functools import wraps

import json
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext

from pgadmin.browser.server_groups.servers import databases
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class DomainModule(SchemaChildModule):
    """
    class DomainModule(SchemaChildModule):

        This class represents The Domain Module.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Initialize the Domain Module.

    * get_nodes(gid, sid, did, scid)
      - Generate the domain collection node.

    * script_load()
      - Load the module script for domain, when schema node is
        initialized.
    """

    _NODE_TYPE = 'domain'
    _COLLECTION_LABEL = gettext("Domains")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the domain collection node.
        """
        if self.has_nodes(sid, did, scid=scid,
                          base_template_path=DomainView.BASE_TEMPLATE_PATH):
            yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for domain, when schema node is
        initialized.
        """
        return databases.DatabaseModule.node_type

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        from .domain_constraints import blueprint as module
        self.submodules.append(module)
        super().register(app, options)


blueprint = DomainModule(__name__)


class DomainView(PGChildNodeView, DataTypeReader, SchemaDiffObjectCompare):
    """
    class DomainView

    This class inherits PGChildNodeView to get the different routes for
    the module. Also, inherits DataTypeReader to get data types.

    The class is responsible to Create, Read, Update and Delete operations for
    the Domain.

    Methods:
    -------
    * validate_request(f):
      - Works as a decorator.
        Validating request on the request of create, update and modified SQL.

    * check_precondition(f):
      - Works as a decorator.
      -  Checks database connection status.
      -  Attach connection object and template path.

    * list(gid, sid, did, scid, doid):
      - List the Domains.

    * nodes(gid, sid, did, scid):
      - Returns all the Domains to generate Nodes in the browser.

    * properties(gid, sid, did, scid, doid):
      - Returns the Domain properties.

    * get_collations(gid, sid, did, scid, doid=None):
      - Returns Collations.

    * create(gid, sid, did, scid):
      - Creates a new Domain object.

    * update(gid, sid, did, scid, doid):
      - Updates the Domain object.

    * delete(gid, sid, did, scid, doid):
      - Drops the Domain object.

    * sql(gid, sid, did, scid, doid=None):
      - Returns the SQL for the Domain object.

    * msql(gid, sid, did, scid, doid=None):
      - Returns the modified SQL.

    * get_sql(gid, sid, data, scid, doid=None):
      - Generates the SQL statements to create/update the Domain object.

    * dependents(gid, sid, did, scid, doid):
      - Returns the dependents for the Domain object.

    * dependencies(gid, sid, did, scid, doid):
      - Returns the dependencies for the Domain object.

    * types(gid, sid, did, scid, fnid=None):
      - Returns Data Types.

    * compare(**kwargs):
      - This function will compare the domain nodes from two different
        schemas.
    """

    node_type = blueprint.node_type
    node_label = "Domain"
    BASE_TEMPLATE_PATH = 'domains/sql/#{0}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'doid'}
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
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_collations': [
            {'get': 'get_collations'},
            {'get': 'get_collations'}
        ],
        'compare': [{'get': 'compare'}, {'get': 'compare'}]
    })

    keys_to_ignore = ['oid', 'basensp', 'conoid', 'nspname', 'oid-2']

    @staticmethod
    def _get_req_data(kwargs):
        """
        Get req data from request.
        :param kwargs: kwargs.
        :return: if any error return error, else return req.
        """
        if request.data:
            req = json.loads(request.data)
        else:
            req = request.args or request.form

        if 'doid' not in kwargs:
            required_args = [
                'name',
                'basetype'
            ]

            for arg in required_args:
                if arg not in req or req[arg] == '':
                    return req, True, make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            "Could not find the required parameter ({})."
                        ).format(arg),
                    )
        return req, False, ''

    @staticmethod
    def _get_data(req):
        """
        Get data from request and update required values.
        :param req: request object.
        :return: data.
        """
        data = {}
        list_params = []
        if request.method == 'GET':
            list_params = ['constraints', 'seclabels']

        for key in req:
            if (
                key in list_params and req[key] != '' and
                req[key] is not None
            ):
                # Coverts string into python list as expected.
                data[key] = json.loads(req[key])
            elif key == 'typnotnull':
                if req[key] == 'true' or req[key] is True:
                    data[key] = True
                elif req[key] == 'false' or req[key] is False:
                    data[key] = False
                else:
                    data[key] = ''
            else:
                data[key] = req[key]
        return data

    def validate_request(f):
        """
        Works as a decorator.
        Validating request on the request of create, update and modified SQL.

        Required Args:
                    name: Name of the Domain
                    owner: Domain Owner
                    basensp: Schema Name
                    basetype: Data Type of the Domain

        Above both the arguments will not be validated in the update action.
        """

        @wraps(f)
        def wrap(self, **kwargs):

            req, is_error, errmsg = DomainView._get_req_data(kwargs)
            if is_error:
                return errmsg

            try:
                data = DomainView._get_data(req)

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
            # Get database connection
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

            # we will set template path for sql scripts
            self.template_path = \
                self.BASE_TEMPLATE_PATH.format(self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        List the Domains.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        SQL = render_template("/".join([self.template_path, self._NODE_SQL]),
                              scid=scid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        Returns all the Domains to generate Nodes in the browser.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
        """

        res = []
        SQL = render_template("/".join([self.template_path, self._NODE_SQL]),
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
                    icon="icon-domain",
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, doid):
        """
        This function will fetch the properties of the domain node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """

        SQL = render_template("/".join([self.template_path, self._NODE_SQL]),
                              doid=doid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon="icon-domain"
                ),
                status=200
            )

        return gone(self.not_found_error_msg())

    @check_precondition
    def properties(self, gid, sid, did, scid, doid):
        """
        Returns the Domain properties.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """
        status, res = self._fetch_properties(did, scid, doid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, did, scid, doid):
        """
        This function is used to fecth the properties of specified object.
        :param did:
        :param scid:
        :param doid:
        :return:
        """
        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(gettext("""
Could not find the domain in the database.
It may have been removed by another user or moved to another schema.
"""))

        data = res['rows'][0]

        # Get Type Length and Precision
        data.update(self._parse_type(data['fulltype']))

        # Get Domain Constraints
        SQL = render_template("/".join([self.template_path,
                                        self._GET_CONSTRAINTS_SQL]),
                              doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        data['constraints'] = res['rows']

        # Get formatted Security Labels
        if 'seclabels' in data:
            data.update(parse_sec_labels_from_db(data['seclabels']))

        # Set System Domain Status
        data['sysdomain'] = False
        if doid <= self._DATABASE_LAST_SYSTEM_OID or \
                self.datistemplate:
            data['sysdomain'] = True

        return True, data

    def _parse_type(self, basetype):
        """
        Returns Type and Data Type from the basetype.
        """
        typ_len = ''
        typ_precision = ''

        # The Length and the precision of the Datatype should be separate.
        # The Format we getting from database is: numeric(1,1)
        # So, we need to separate Length: 1, Precision: 1

        if basetype != '' and basetype.find("(") > 0:
            substr = basetype[basetype.find("(") + 1:len(
                basetype) - 1]
            typlen = substr.split(",")
            typ_len = typlen[0]
            if len(typlen) > 1:
                typ_precision = typlen[1]
            else:
                typ_precision = ''

        return {'typlen': typ_len, 'precision': typ_precision}

    @check_precondition
    def get_collations(self, gid, sid, did, scid, doid=None):
        """
        Returns Collations.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """

        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_collations.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                res.append({'label': row['copy_collation'],
                            'value': row['copy_collation']}
                           )

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def types(self, gid, sid, did, scid, doid=None):
        """
        Returns the Data Types.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            fnid: Function Id
        """

        condition = """typisdefined AND typtype IN ('b', 'c', 'd', 'e', 'r')
AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
WHERE relnamespace=typnamespace AND relname = typname AND relkind != 'c') AND
(typname NOT LIKE '_%' OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE
relnamespace=typnamespace AND relname = substring(typname FROM 2)::name
AND relkind != 'c'))"""

        # To show hidden objects
        if not self.blueprint.show_system_objects:
            condition += " AND nsp.nspname != 'information_schema'"

        # Get Types
        status, types = self.get_types(self.conn, condition)

        if not status:
            return internal_server_error(errormsg=types)

        return make_json_response(
            data=types,
            status=200
        )

    @check_precondition
    @validate_request
    def create(self, gid, sid, did, scid):
        """
        Creates a new Domain object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id

        Required Args:
            name: Domain Name
            owner: Owner Name
            basensp: Schema Name
            basetype: Domain Base Type

        Returns:
            Domain object in json format.
        """

        data = self.request
        SQL, name = self.get_sql(gid, sid, data, scid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL

        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # We need oid to add object in tree at browser, below sql will
        # gives the same
        SQL = render_template("/".join([self.template_path,
                                        self._OID_SQL]),
                              basensp=data['basensp'],
                              name=data['name'],
                              conn=self.conn)
        status, doid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=doid)

        # Get updated schema oid
        SQL = render_template("/".join([self.template_path,
                                        self._OID_SQL]),
                              doid=doid,
                              conn=self.conn)
        status, scid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=scid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                doid,
                scid,
                data['name'],
                icon="icon-domain"
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, doid=None, only_sql=False):
        """
        Drops the Domain object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            only_sql: Return only sql if True
        """
        if doid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [doid]}

        cascade = self._check_cascade_operation(only_sql)

        for doid in data['ids']:
            SQL = render_template("/".join([self.template_path,
                                            self._DELETE_SQL]),
                                  scid=scid, doid=doid)
            status, res = self.conn.execute_2darray(SQL)
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

            name = res['rows'][0]['name']
            basensp = res['rows'][0]['basensp']

            SQL = render_template("/".join([self.template_path,
                                            self._DELETE_SQL]),
                                  name=name, basensp=basensp, cascade=cascade)

            # Used for schema diff tool
            if only_sql:
                return SQL

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

        return make_json_response(
            success=1,
            info=gettext("Domain dropped")
        )

    @check_precondition
    @validate_request
    def update(self, gid, sid, did, scid, doid):
        """
        Updates the Domain object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """

        SQL, name = self.get_sql(gid, sid, self.request, scid, doid)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL

        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Get Schema Id
        SQL = render_template("/".join([self.template_path,
                                        self._OID_SQL]),
                              doid=doid,
                              conn=self.conn)
        status, scid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=scid)

        other_node_info = {}
        if 'description' in self.request:
            other_node_info['description'] = self.request['description']

        return jsonify(
            node=self.blueprint.generate_browser_node(
                doid,
                scid,
                name,
                icon="icon-%s" % self.node_type,
                **other_node_info
            )
        )

    @check_precondition
    def sql(self, gid, sid, did, scid, doid=None, **kwargs):
        """
        Returns the SQL for the Domain object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        SQL = render_template("/".join([self.template_path,
                                        self._PROPERTIES_SQL]),
                              scid=scid, doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]
        if target_schema:
            data['basensp'] = target_schema

        # Get Type Length and Precision
        data.update(self._parse_type(data['fulltype']))

        # Get Domain Constraints
        SQL = render_template("/".join([self.template_path,
                                        self._GET_CONSTRAINTS_SQL]),
                              doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data['constraints'] = res['rows']

        # Get formatted Security Labels
        if 'seclabels' in data:
            data.update(parse_sec_labels_from_db(data['seclabels']))

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]), data=data)

        sql_header = """-- DOMAIN: {0}.{1}\n\n""".format(
            data['basensp'], data['name'])

        sql_header += """-- DROP DOMAIN IF EXISTS {0};\n
""".format(self.qtIdent(self.conn, data['basensp'], data['name']))
        SQL = sql_header + SQL

        if not json_resp:
            return SQL.strip('\n')

        return ajax_response(response=SQL.strip('\n'))

    @check_precondition
    @validate_request
    def msql(self, gid, sid, did, scid, doid=None):
        """
        Returns the modified SQL.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id

        Required Args:
            name: Domain Name
            owner: Owner Name
            basensp: Schema Name
            basetype: Domain Base Type

        Returns:
            SQL statements to create/update the Domain.
        """

        try:
            SQL, name = self.get_sql(gid, sid, self.request, scid, doid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def check_domain_type(self, data, old_data, is_schema_diff):
        """
        Check domain type
        :return:
        """
        # If fulltype or basetype or collname is changed while comparing
        # two schemas then we need to drop domain and recreate it
        if 'fulltype' in data or 'basetype' in data or 'collname' in data:
            SQL = render_template(
                "/".join([self.template_path, 'domain_schema_diff.sql']),
                data=data, o_data=old_data)
        else:
            if is_schema_diff:
                data['is_schema_diff'] = True

            SQL = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn)
        return SQL, data

    def get_sql(self, gid, sid, data, scid, doid=None, is_schema_diff=False):
        """
        Generates the SQL statements to create/update the Domain.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
            is_schema_diff: True is function gets called from schema diff
        """

        if doid is not None:
            SQL = render_template("/".join([self.template_path,
                                            self._PROPERTIES_SQL]),
                                  scid=scid, doid=doid)
            status, res = self.conn.execute_dict(SQL)

            if not status:
                return False, internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(self.not_found_error_msg())

            old_data = res['rows'][0]

            # Get Domain Constraints
            SQL = render_template("/".join([self.template_path,
                                            self._GET_CONSTRAINTS_SQL]),
                                  doid=doid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            con_data = {}
            for c in res['rows']:
                con_data[c['conoid']] = c

            old_data['constraints'] = con_data

            SQL, data = self.check_domain_type(data, old_data, is_schema_diff)
            return SQL.strip('\n'), data['name'] if 'name' in data else \
                old_data['name']
        else:
            SQL = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data)
            return SQL.strip('\n'), data['name']

    @check_precondition
    def dependents(self, gid, sid, did, scid, doid):
        """
        This function get the dependents and return ajax response
        for the Domain node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """
        dependents_result = self.get_dependents(self.conn, doid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, doid):
        """
        This function get the dependencies and return ajax response
        for the Domain node.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """
        dependencies_result = self.get_dependencies(self.conn, doid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the domains for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join([self.template_path,
                                        self._NODE_SQL]), scid=scid,
                              schema_diff=True)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            status, data = self._fetch_properties(did, scid, row['oid'])

            if status:
                res[row['name']] = data

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
        target_schema = kwargs.get('target_schema', None)

        if data:
            if target_schema:
                data['schema'] = target_schema
            sql, name = self.get_sql(gid=gid, sid=sid, scid=scid,
                                     data=data, doid=oid,
                                     is_schema_diff=True)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, doid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, doid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, doid=oid,
                               json_resp=False)
        return sql

    def get_dependencies(self, conn, object_id, where=None,
                         show_system_objects=None, is_schema_diff=False):
        """
        This function is used to get dependencies of domain and it's
        domain constraints.
        """
        domain_dependencies = []
        domain_deps = super().get_dependencies(
            conn, object_id, where=None, show_system_objects=None,
            is_schema_diff=True)
        if len(domain_deps) > 0:
            domain_dependencies.extend(domain_deps)

        # Get Domain Constraints
        SQL = render_template("/".join([self.template_path,
                                        self._GET_CONSTRAINTS_SQL]),
                              doid=object_id)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        # Get the domain constraints dependencies.
        for row in res['rows']:
            constraint_deps = super().get_dependencies(
                conn, row['conoid'], where=None, show_system_objects=None,
                is_schema_diff=True)
            if len(constraint_deps) > 0:
                domain_dependencies.extend(constraint_deps)

        return domain_dependencies


SchemaDiffRegistry(blueprint.node_type, DomainView)
DomainView.register_node_view(blueprint)
