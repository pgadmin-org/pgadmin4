##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements the Domain Node."""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils import \
    SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.databases.utils import \
    parse_sec_labels_from_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


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

    NODE_TYPE = 'domain'
    COLLECTION_LABEL = gettext("Domains")

    def __init__(self, *args, **kwargs):
        super(DomainModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the domain collection node.
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for domain, when schema node is
        initialized.
        """
        return databases.DatabaseModule.NODE_TYPE


blueprint = DomainModule(__name__)


class DomainView(PGChildNodeView, DataTypeReader):
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

    * module_js():
      - Load JS file (domains.js) for this module.

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
    """

    node_type = blueprint.node_type

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
        'get_types': [{'get': 'types'}, {'get': 'types'}],
        'get_collations': [
            {'get': 'get_collations'},
            {'get': 'get_collations'}
        ]
    })

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

            data = {}
            if request.data:
                req = json.loads(request.data, encoding='utf-8')
            else:
                req = request.args or request.form

            if 'doid' not in kwargs:
                required_args = [
                    'name',
                    'basetype'
                ]

                for arg in required_args:
                    if arg not in req or req[arg] == '':
                        return make_json_response(
                            status=410,
                            success=0,
                            errormsg=gettext(
                                "Could not find the required parameter (%s)." % arg
                            )
                        )

            try:
                list_params = []
                if request.method == 'GET':
                    list_params = ['constraints', 'seclabels']

                for key in req:
                    if key in list_params and req[key] != '' \
                            and req[key] is not None:
                        # Coverts string into python list as expected.
                        data[key] = json.loads(req[key], encoding='utf-8')
                    elif key == 'typnotnull':
                        data[key] = True if req[key] == 'true' or req[key] is \
                                                                  True else \
                            (False if req[key] == 'false' or req[key] is
                                                             False else '')
                    else:
                        data[key] = req[key]

            except Exception as e:
                return internal_server_error(errormsg=str(e))

            self.request = data
            return f(self, **kwargs)

        return wrap

    def module_js(self):
        """
        Load JS file (domains.js) for this module.
        """
        return make_response(
            render_template(
                "domains/js/domains.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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

            # we will set template path for sql scripts
            if self.manager.version >= 90200:
                self.template_path = 'domains/sql/9.2_plus'
            else:
                self.template_path = 'domains/sql/9.1_plus'

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

        SQL = render_template("/".join([self.template_path, 'node.sql']),
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
        SQL = render_template("/".join([self.template_path, 'node.sql']),
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
                    icon="icon-domain"
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

        SQL = render_template("/".join([self.template_path, 'node.sql']),
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

        return gone(gettext("Could not find the specified domain."))

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

        SQL = render_template("/".join([self.template_path, 'properties.sql']),
                              scid=scid, doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""
Could not find the domain in the database.
It may have been removed by another user or moved to another schema.
"""))

        data = res['rows'][0]

        # Get Type Length and Precision
        data.update(self._parse_type(data['fulltype']))

        # Get Domain Constraints
        SQL = render_template("/".join([self.template_path,
                                        'get_constraints.sql']),
                              doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data['constraints'] = res['rows']

        # Get formatted Security Labels
        if 'seclabels' in data:
            data.update(parse_sec_labels_from_db(data['seclabels']))

        # Set System Domain Status
        data['sysdomain'] = False
        if doid <= self.manager.db_info[did]['datlastsysoid']:
            data['sysdomain'] = True

        return ajax_response(
            response=data,
            status=200
        )

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
            if len(typlen) > 1:
                typ_len = typlen[0]
                typ_precision = typlen[1]
            else:
                typ_len = typlen
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
                return internal_server_error(errormsg=res)

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
AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relnamespace=typnamespace
AND relname = typname AND relkind != 'c') AND
(typname NOT LIKE '_%' OR NOT EXISTS (SELECT 1 FROM pg_class WHERE
relnamespace=typnamespace AND relname = substring(typname FROM 2)::name
AND relkind != 'c'))"""

        if self.blueprint.show_system_objects:
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

        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # We need oid to to add object in tree at browser, below sql will
        # gives the same
        SQL = render_template("/".join([self.template_path,
                                        'get_oid.sql']),
                              basensp=data['basensp'],
                              name=data['name'])
        status, doid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Get updated schema oid
        SQL = render_template("/".join([self.template_path,
                                        'get_oid.sql']),
                              doid=doid)
        status, scid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                doid,
                scid,
                data['name'],
                icon="icon-domain"
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, doid):
        """
        Drops the Domain object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """

        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        SQL = render_template("/".join([self.template_path,
                                        'delete.sql']),
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
                info=gettext(
                    'The specified domain could not be found.\n'
                )
            )

        name  = res['rows'][0]['name']
        basensp = res['rows'][0]['basensp']

        SQL = render_template("/".join([self.template_path,
                                        'delete.sql']),
                              name=name, basensp=basensp, cascade=cascade)
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            success=1,
            info=gettext("Domain dropped"),
            data={
                'id': doid,
                'scid': scid,
                'sid': sid,
                'gid': gid,
                'did': did
            }
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

        if SQL:
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Get Schema Id
            SQL = render_template("/".join([self.template_path,
                                            'get_oid.sql']),
                                  doid=doid)
            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    doid,
                    scid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )

    @check_precondition
    def sql(self, gid, sid, did, scid, doid=None):
        """
        Returns the SQL for the Domain object.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)
        data = res['rows'][0]

        # Get Type Length and Precision
        data.update(self._parse_type(data['fulltype']))

        # Get Domain Constraints
        SQL = render_template("/".join([self.template_path,
                                        'get_constraints.sql']),
                              doid=doid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data['constraints'] = res['rows']

        # Get formatted Security Labels
        if 'seclabels' in data:
            data.update(parse_sec_labels_from_db(data['seclabels']))

        SQL = render_template("/".join([self.template_path,
                                        'create.sql']), data=data)

        sql_header = """-- DOMAIN: {0}

-- DROP DOMAIN {0};

""".format(data['basensp'] + '.' + data['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        SQL = sql_header + SQL

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
            if SQL == '':
                SQL = "--modified SQL"

            return make_json_response(
                data=SQL,
                status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, scid, doid=None):
        """
        Generates the SQL statements to create/update the Domain.

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            doid: Domain Id
        """

        if doid is not None:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, doid=doid)
            status, res = self.conn.execute_dict(SQL)

            if not status:
                return False, internal_server_error(errormsg=res)

            old_data = res['rows'][0]

            # Get Domain Constraints
            SQL = render_template("/".join([self.template_path,
                                            'get_constraints.sql']),
                                  doid=doid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            con_data = {}
            for c in res['rows']:
                con_data[c['conoid']] = c

            old_data['constraints'] = con_data

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data)
            return SQL.strip('\n'), data['name'] if 'name' in data else old_data['name']
        else:
            SQL = render_template("/".join([self.template_path,
                                            'create.sql']),
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


DomainView.register_node_view(blueprint)
