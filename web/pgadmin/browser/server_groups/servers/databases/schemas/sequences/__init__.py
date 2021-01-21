##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Sequence Node"""

from functools import wraps

import simplejson as json
from flask import render_template, request, jsonify
from flask_babelex import gettext as _

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver


class SequenceModule(SchemaChildModule):
    """
    class SequenceModule(CollectionNodeModule)

        A module class for Sequence node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the SequenceModule and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * script_load()
      - Load the module script for sequence, when any of the database node is
        initialized.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    """

    _NODE_TYPE = 'sequence'
    _COLLECTION_LABEL = _("Sequences")

    def __init__(self, *args, **kwargs):
        super(SequenceModule, self).__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None
        self.min_gpdbver = 1000000000

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the sequence node
        """
        yield self.generate_browser_collection_node(scid)

    @property
    def script_load(self):
        """
        Load the module script for database, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.node_type

    @property
    def node_inode(self):
        """
        Override this property to make the node a leaf node.

        Returns: False as this is the leaf node
        """
        return False


blueprint = SequenceModule(__name__)


class SequenceView(PGChildNodeView, SchemaDiffObjectCompare):
    node_type = blueprint.node_type
    node_label = "Sequence"
    node_icon = "icon-%s" % node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'seid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}]
    })

    keys_to_ignore = ['oid', 'oid-2', 'schema', 'current_value']

    def check_precondition(action=None):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        def wrap(f):
            @wraps(f)
            def wrapped(self, *args, **kwargs):

                driver = get_driver(PG_DEFAULT_DRIVER)
                self.manager = driver.connection_manager(kwargs['sid'])

                if action and action in ["drop"]:
                    self.conn = self.manager.connection()
                elif 'did' in kwargs:
                    self.conn = self.manager.connection(did=kwargs['did'])
                else:
                    self.conn = self.manager.connection()
                self.datlastsysoid = \
                    self.manager.db_info[kwargs['did']]['datlastsysoid'] \
                    if self.manager.db_info is not None and \
                    kwargs['did'] in self.manager.db_info else 0
                self.datistemplate = False
                if (
                    self.manager.db_info is not None and
                    kwargs['did'] in self.manager.db_info and
                    'datistemplate' in self.manager.db_info[kwargs['did']]
                ):
                    self.datistemplate = self.manager.db_info[
                        kwargs['did']]['datistemplate']

                self.template_path = 'sequences/sql/#{0}#'.format(
                    self.manager.version
                )
                self.acl = ['r', 'w', 'U']
                self.qtIdent = driver.qtIdent

                return f(self, *args, **kwargs)
            return wrapped
        return wrap

    @check_precondition(action='list')
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the sequence nodes within the
        collection.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:

        """
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        sequence_nodes = self._get_sequence_nodes(res['rows'])
        return ajax_response(
            response=sequence_nodes,
            status=200
        )

    @check_precondition(action='nodes')
    def nodes(self, gid, sid, did, scid, seid=None):
        """
        This function is used to create all the child nodes within the
        collection, Here it will create all the sequence nodes.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:

        """
        res = []
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            scid=scid,
            seid=seid
        )
        status, rset = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if seid is not None:
            if len(rset['rows']) == 0:
                return gone(errormsg=self.not_found_error_msg())
            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon=self.node_icon
                ),
                status=200
            )

        sequence_nodes = self._get_sequence_nodes(rset['rows'])
        for row in sequence_nodes:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon=self.node_icon
                ))

        return make_json_response(
            data=res,
            status=200
        )

    def _get_sequence_nodes(self, nodes):
        """
        This function is used to iterate through all the sequences node and
        hiding sequences created as part of an IDENTITY column.
        :param nodes:
        :return:
        """
        # If show_system_objects is true then no need to hide any sequences.
        if self.blueprint.show_system_objects:
            return nodes

        seq_nodes = []
        for row in nodes:
            system_seq = self._get_dependency(row['oid'],
                                              show_system_objects=True)
            seq = [dep for dep in system_seq
                   if dep['type'] == 'column' and dep['field'] == 'internal']
            if len(seq) > 0:
                continue

            # Append the node into the newly created list
            seq_nodes.append(row)

        return seq_nodes

    @check_precondition(action='properties')
    def properties(self, gid, sid, did, scid, seid):
        """
        This function will show the properties of the selected sequence node.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          seid: Sequence ID

        Returns:

        """
        status, res = self._fetch_properties(scid, seid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, seid):
        """
        This function is used to fetch the properties of the specified object.
        :param scid:
        :param seid:
        :return:
        """

        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid, seid=seid
        )
        status, res = self.conn.execute_dict(sql)

        if not status:
            return False, internal_server_error(errormsg=res)
        elif len(res['rows']) == 0:
            return False, gone(self.not_found_error_msg())

        res['rows'][0]['is_sys_obj'] = (
            res['rows'][0]['oid'] <= self.datlastsysoid or self.datistemplate)

        for row in res['rows']:
            sql = render_template(
                "/".join([self.template_path, 'get_def.sql']),
                data=row
            )
            status, rset1 = self.conn.execute_dict(sql)
            if not status:
                return False, internal_server_error(errormsg=rset1)

            row['current_value'] = rset1['rows'][0]['last_value']
            row['minimum'] = rset1['rows'][0]['min_value']
            row['maximum'] = rset1['rows'][0]['max_value']
            row['increment'] = rset1['rows'][0]['increment_by']
            row['start'] = rset1['rows'][0]['start_value']
            row['cache'] = rset1['rows'][0]['cache_value']
            row['cycled'] = rset1['rows'][0]['is_cycled']

            self._add_securities_to_row(row)

        sql = render_template(
            "/".join([self.template_path, self._ACL_SQL]),
            scid=scid, seid=seid
        )
        status, dataclres = self.conn.execute_dict(sql)
        if not status:
            return False, internal_server_error(errormsg=res)

        for row in dataclres['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in res['rows'][0]:
                res['rows'][0][row['deftype']].append(priv)
            else:
                res['rows'][0][row['deftype']] = [priv]

        return True, res['rows'][0]

    def _add_securities_to_row(self, row):
        sec_lbls = []
        if 'securities' in row and row['securities'] is not None:
            for sec in row['securities']:
                import re
                sec = re.search(r'([^=]+)=(.*$)', sec)
                sec_lbls.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })
        row['securities'] = sec_lbls

    @check_precondition(action="create")
    def create(self, gid, sid, did, scid):
        """
        Create the sequence.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID

        Returns:

        """
        required_args = [
            'name',
            'schema',
            'seqowner',
        ]

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        try:
            # The SQL below will execute CREATE DDL only
            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn
            )
        except Exception as e:
            return internal_server_error(errormsg=e)

        status, msg = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=msg)

        if 'relacl' in data:
            data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

        # The SQL below will execute rest DMLs because we cannot execute
        # CREATE with any other
        sql = render_template(
            "/".join([self.template_path, self._GRANT_SQL]),
            data=data, conn=self.conn
        )
        sql = sql.strip('\n').strip(' ')
        if sql and sql != "":
            status, msg = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=msg)

        # We need oid of newly created sequence.
        sql = render_template(
            "/".join([self.template_path, self._OID_SQL]),
            name=data['name'],
            schema=data['schema']
        )
        sql = sql.strip('\n').strip(' ')

        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)

        row = rset['rows'][0]
        return jsonify(
            node=self.blueprint.generate_browser_node(
                row['oid'],
                row['relnamespace'],
                data['name'],
                icon=self.node_icon
            )
        )

    @check_precondition(action='delete')
    def delete(self, gid, sid, did, scid, seid=None, only_sql=False):
        """
        This function will drop the object

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          seid: Sequence ID
          only_sql: Return SQL only if True

        Returns:

        """
        if seid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [seid]}

        # Below will decide if it's simple drop or drop with cascade call

        cascade = self._check_cascade_operation()

        try:
            for seid in data['ids']:
                sql = render_template(
                    "/".join([self.template_path, self._PROPERTIES_SQL]),
                    scid=scid, seid=seid
                )
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                elif not res['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=_(
                            'Error: Object not found.'
                        ),
                        info=self.not_found_error_msg()
                    )

                sql = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    data=res['rows'][0], cascade=cascade
                )

                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Sequence dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition(action='update')
    def update(self, gid, sid, did, scid, seid):
        """
        This function will update the object

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          seid: Sequence ID

        Returns:

        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        sql, name = self.get_SQL(gid, sid, did, data, scid, seid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')

        status, res = self.conn.execute_scalar(sql)
        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            seid=seid
        )
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=rset)
        row = rset['rows'][0]

        return jsonify(
            node=self.blueprint.generate_browser_node(
                seid,
                row['schema'],
                row['name'],
                icon=self.node_icon
            )
        )

    @check_precondition(action='msql')
    def msql(self, gid, sid, did, scid, seid=None):
        """
        This function to return modified SQL.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            seid: Sequence ID
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

        if seid is None:
            required_args = [
                'name',
                'schema'
            ]

            for arg in required_args:
                if arg not in data:
                    return make_json_response(
                        status=400,
                        success=0,
                        errormsg=_(
                            "Could not find the required parameter ({})."
                        ).format(arg)
                    )
        sql, name = self.get_SQL(gid, sid, did, data, scid, seid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql

        sql = sql.strip('\n').strip(' ')
        if sql == '':
            sql = "--modified SQL"

        return make_json_response(
            data=sql,
            status=200
        )

    def get_SQL(self, gid, sid, did, data, scid, seid=None):
        """
        This function will generate sql from model data.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            seid: Sequence ID
        """

        required_args = [
            'name'
        ]

        if seid is not None:
            sql = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                scid=scid, seid=seid
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            elif len(res['rows']) == 0:
                return gone(self.not_found_error_msg())

            # Making copy of output for further processing
            old_data = dict(res['rows'][0])
            old_data = self._formatter(old_data, scid, seid)

            self._format_privilege_data(data)

            # If name is not present with in update data then copy it
            # from old data
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]
            sql = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
            return sql, data['name'] if 'name' in data else old_data['name']
        else:
            # To format privileges coming from client
            if 'relacl' in data:
                data['relacl'] = parse_priv_to_db(data['relacl'], self.acl)

            sql = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn
            )
            sql += render_template(
                "/".join([self.template_path, self._GRANT_SQL]),
                data=data, conn=self.conn
            )
            return sql, data['name']

    def _format_privilege_data(self, data):
        # To format privileges data coming from client
        for key in ['relacl']:
            if key in data and data[key] is not None:
                if 'added' in data[key]:
                    data[key]['added'] = parse_priv_to_db(
                        data[key]['added'], self.acl
                    )
                if 'changed' in data[key]:
                    data[key]['changed'] = parse_priv_to_db(
                        data[key]['changed'], self.acl
                    )
                if 'deleted' in data[key]:
                    data[key]['deleted'] = parse_priv_to_db(
                        data[key]['deleted'], self.acl
                    )

    @check_precondition(action="sql")
    def sql(self, gid, sid, did, scid, seid, **kwargs):
        """
        This function will generate sql for sql panel

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            seid: Sequence ID
            json_resp: json response or plain text response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        sql = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid, seid=seid
        )
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        for row in res['rows']:
            sql = render_template(
                "/".join([self.template_path, 'get_def.sql']),
                data=row
            )
            status, rset1 = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=rset1)

            row['current_value'] = rset1['rows'][0]['last_value']
            row['minimum'] = rset1['rows'][0]['min_value']
            row['maximum'] = rset1['rows'][0]['max_value']
            row['increment'] = rset1['rows'][0]['increment_by']
            row['start'] = rset1['rows'][0]['start_value']
            row['cache'] = rset1['rows'][0]['cache_value']
            row['cycled'] = rset1['rows'][0]['is_cycled']

        result = res['rows'][0]
        if target_schema:
            result['schema'] = target_schema

        result = self._formatter(result, scid, seid)
        sql, name = self.get_SQL(gid, sid, did, result, scid)
        # Most probably this is due to error
        if not isinstance(sql, str):
            return sql
        sql = sql.strip('\n').strip(' ')

        # Return sql for schema diff
        if not json_resp:
            return sql

        sql_header = """-- SEQUENCE: {0}.{1}\n\n""".format(
            result['schema'], result['name'])

        sql_header += """-- DROP SEQUENCE {0};

""".format(self.qtIdent(self.conn, result['schema'], result['name']))

        sql = sql_header + sql

        return ajax_response(response=sql)

    def _formatter(self, data, scid, seid):
        """
        Args:
            data: dict of query result
            scid: Schema ID
            seid: Sequence ID

        Returns:
            It will return formatted output of sequence
        """

        # Need to format security labels according to client js collection
        if 'securities' in data and data['securities'] is not None:
            seclabels = []
            for seclbls in data['securities']:
                k, v = seclbls.split('=')
                seclabels.append({'provider': k, 'label': v})

            data['securities'] = seclabels

        # We need to parse & convert ACL coming from database to json format
        sql = render_template("/".join([self.template_path, self._ACL_SQL]),
                              scid=scid, seid=seid)
        status, acl = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        data['relacl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            data.setdefault(row['deftype'], []).append(priv)

        return data

    @check_precondition(action="dependents")
    def dependents(self, gid, sid, did, scid, seid):
        """
        This function gets the dependents and returns an ajax response
        for the sequence node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            seid: Sequence ID
        """
        dependents_result = self.get_dependents(self.conn, seid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition(action="dependencies")
    def dependencies(self, gid, sid, did, scid, seid):
        """
        This function gets the dependencies and returns an ajax response
        for the sequence node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            seid: Sequence ID
        """

        return ajax_response(
            response=self._get_dependency(seid),
            status=200
        )

    def _get_dependency(self, seid, show_system_objects=None):
        dependencies_result = self.get_dependencies(self.conn, seid, None,
                                                    show_system_objects)

        # Get missing dependencies.
        # A Corner case, reported by Guillaume Lelarge, could be found at:
        # http://archives.postgresql.org/pgadmin-hackers/2009-03/msg00026.php

        sql = render_template("/".join([self.template_path,
                                        'get_dependencies.sql']), seid=seid)

        status, result = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            ref_name = row['refname']
            if ref_name is None:
                continue

            dep_type = ''
            dep_str = row['deptype']
            if dep_str == 'a':
                dep_type = 'auto'
            elif dep_str == 'n':
                dep_type = 'normal'
            elif dep_str == 'i':
                dep_type = 'internal'

            dependencies_result.append({'type': 'column',
                                        'name': ref_name,
                                        'field': dep_type})
        return dependencies_result

    @check_precondition(action="stats")
    def statistics(self, gid, sid, did, scid, seid=None):
        """
        Statistics

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            seid: Sequence Id

        Returns the statistics for a particular object if seid is specified
        """
        if seid is not None:
            sql = 'stats.sql'
            schema_name = None
        else:
            sql = 'coll_stats.sql'
            # Get schema name
            status, schema_name = self.conn.execute_scalar(
                render_template(
                    'schemas/pg/#{0}#/sql/get_name.sql'.format(
                        self.manager.version
                    ),
                    scid=scid
                )
            )
            if not status:
                return internal_server_error(errormsg=schema_name)

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, sql]),
                conn=self.conn, seid=seid,
                schema_name=schema_name
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition(action="fetch_objects_to_compare")
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the sequences for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        sql = render_template("/".join([self.template_path,
                                        self._NODES_SQL]), scid=scid)
        status, rset = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=res)

        for row in rset['rows']:
            status, data = self._fetch_properties(scid, row['oid'])
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
            sql, name = self.get_SQL(gid, sid, did, data, scid, oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, seid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, seid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, seid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, SequenceView)
SequenceView.register_node_view(blueprint)
