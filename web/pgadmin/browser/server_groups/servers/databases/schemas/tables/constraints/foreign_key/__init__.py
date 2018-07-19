##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Foreign key constraint Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, make_response, request, jsonify
from flask_babelex import gettext as _
from pgadmin.browser.server_groups.servers.databases.schemas.tables.\
    constraints.type import ConstraintRegistry, ConstraintTypeModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils import IS_PY2
# If we are in Python3
if not IS_PY2:
    unicode = str


class ForeignKeyConstraintModule(ConstraintTypeModule):
    """
    class ForeignKeyConstraintModule(CollectionNodeModule)

        A module class for Foreign key constraint node derived from
        ConstraintTypeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the ForeignKeyConstraintModule and
      it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for language, when any of the database node is
        initialized.
    """

    NODE_TYPE = 'foreign_key'
    COLLECTION_LABEL = _("Foreign Keys")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ForeignKeyConstraintModule and
        it's base module.

        Args:
          *args:
          **kwargs:

        Returns:

        """
        self.min_ver = None
        self.max_ver = None
        super(ForeignKeyConstraintModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did, scid, tid):
        """
        Generate the collection node
        """
        pass

    @property
    def node_inode(self):
        """
        Override this property to make the node a leaf node.

        Returns: False as this is the leaf node
        """
        return False

    @property
    def script_load(self):
        """
        Load the module script for foreign_key, when any of the table node is
        initialized.

        Returns: node type of the server module.
        """
        return database.DatabaseModule.NODE_TYPE

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
                "browser/css/collection.css",
                node_type=self.node_type,
                _=_
            ),
            render_template(
                "foreign_key/css/foreign_key.css",
                node_type=self.node_type,
                _=_
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


blueprint = ForeignKeyConstraintModule(__name__)


class ForeignKeyConstraintView(PGChildNodeView):
    """
    class ForeignKeyConstraintView(PGChildNodeView)

        A view class for Foreign key constraint node derived from
        PGChildNodeView. This class is responsible for all the stuff related
        to view like creating, updating Foreign key constraint
        node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ForeignKeyConstraintView and
      it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function returns foreign key constraint nodes within that
        collection as http response.

    * get_list()
      - This function is used to list all the language nodes within that
        collection and return list of foreign key constraint nodes.

    * nodes()
      - This function returns child node within that collection.
        Here return all foreign key constraint node as http response.

    * get_nodes()
      - returns all foreign key constraint nodes' list.

    * properties()
      - This function will show the properties of the selected foreign key.

    * update()
      - This function will update the data for the selected foreign key.

    * msql()
      - This function is used to return modified SQL for the selected
      foreign key.

    * get_sql()
      - This function will generate sql from model data.

    * sql():
      - This function will generate sql to show it in sql pane for the
      selected foreign key.

    * get_indices():
        - This function returns indices for current table.

    """

    node_type = 'foreign_key'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'},
        {'type': 'int', 'id': 'tid'}
    ]
    ids = [{'type': 'int', 'id': 'fkid'}
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
        'indices': [{}, {'get': 'get_indices'}],
        'validate': [{'get': 'validate_foreign_key'}],
        'get_coveringindex': [{}, {'get': 'get_coveringindex'}]
    })

    def module_js(self):
        """
        This property defines (if javascript) exists for this node.
        Override this property for your own logic.
        """
        return make_response(
            render_template(
                "foreign_key/js/foreign_key.js",
                _=_
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

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
            self.template_path = 'foreign_key/sql/#{0}#'.format(
                self.manager.version)

            # We need parent's name eg table name and schema name
            SQL = render_template("/".join([self.template_path,
                                            'get_parent.sql']),
                                  tid=kwargs['tid'])
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            for row in rset['rows']:
                self.schema = row['schema']
                self.table = row['table']

            return f(*args, **kwargs)
        return wrap

    def end_transaction(self):
        SQL = render_template(
            "/".join([self.template_path, 'end.sql']))
        # End transaction if any.
        self.conn.execute_scalar(SQL)

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function is used to list all the foreign key
        nodes within that collection.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        sql = render_template("/".join([self.template_path, 'properties.sql']),
                              tid=tid, cid=fkid)

        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(_(
                """Could not find the foreign key constraint in the table."""
            ))

        result = res['rows'][0]

        sql = render_template("/".join([self.template_path,
                                        'get_constraint_cols.sql']),
                              tid=tid,
                              keys=zip(result['confkey'], result['conkey']),
                              confrelid=result['confrelid'])

        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        columns = []
        cols = []
        for row in res['rows']:
            columns.append({"local_column": row['conattname'],
                            "references": result['confrelid'],
                            "referenced": row['confattname']})
            cols.append(row['conattname'])

        result['columns'] = columns

        if fkid:
            coveringindex = self.search_coveringindex(tid, cols)
            result['coveringindex'] = coveringindex
            if coveringindex:
                result['autoindex'] = True
                result['hasindex'] = True
            else:
                result['autoindex'] = False
                result['hasindex'] = False

        return ajax_response(
            response=result,
            status=200
        )

    @check_precondition
    def list(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function returns all foreign keys
        nodes within that collection as a http response.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        try:
            res = self.get_node_list(gid, sid, did, scid, tid, fkid)
            return ajax_response(
                response=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_node_list(self, gid, sid, did, scid, tid):
        """
        This function returns all foreign keys
        nodes within that collection as a list.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        self.conn = self.manager.connection(did=did)
        self.template_path = 'foreign_key/sql/#{0}#'.format(
            self.manager.version)

        # We need parent's name eg table name and schema name
        SQL = render_template("/".join([self.template_path,
                                        'get_parent.sql']),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            self.schema = row['schema']
            self.table = row['table']

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              tid=tid)
        status, res = self.conn.execute_dict(SQL)

        return res['rows']

    @check_precondition
    def node(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function returns all foreign key nodes as a
        http response.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)

        if len(rset['rows']) == 0:
            return gone(_("""Could not find the foreign key."""))

        if rset['rows'][0]["convalidated"]:
            icon = "icon-foreign_key_no_validate"
            valid = False
        else:
            icon = "icon-foreign_key"
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
        This function returns all foreign key nodes as a
        http response.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        res = []
        for row in rset['rows']:
            if row["convalidated"]:
                icon = "icon-foreign_key_no_validate"
                valid = False
            else:
                icon = "icon-foreign_key"
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

    def get_nodes(self, gid, sid, did, scid, tid):
        """
        This function returns all foreign key nodes as a list.
        """
        self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
        self.conn = self.manager.connection(did=did)
        self.template_path = 'foreign_key/sql/#{0}#'.format(
            self.manager.version)

        # We need parent's name eg table name and schema name
        SQL = render_template("/".join([self.template_path,
                                        'get_parent.sql']),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            self.schema = row['schema']
            self.table = row['table']
        res = []
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']),
                              tid=tid)
        status, rset = self.conn.execute_2darray(SQL)

        for row in rset['rows']:
            if row["convalidated"]:
                icon = "icon-foreign_key_no_validate"
                valid = False
            else:
                icon = "icon-foreign_key"
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
    def create(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function will create a foreign key.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        required_args = ['columns']

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for k, v in data.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find required parameter (%s)." % str(arg)
                    )
                )
            elif isinstance(data[arg], list) and len(data[arg]) < 1:
                return make_json_response(
                    status=400,
                    success=0,
                    errormsg=_(
                        "Could not find required parameter (%s)." % str(arg)
                    )
                )

        data['schema'] = self.schema
        data['table'] = self.table
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_parent.sql']),
                                  tid=data['columns'][0]['references'])
            status, res = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            data['remote_schema'] = res['rows'][0]['schema']
            data['remote_table'] = res['rows'][0]['table']

            if 'name' not in data or data['name'] == "":
                SQL = render_template(
                    "/".join([self.template_path, 'begin.sql']))
                # Start transaction.
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    self.end_transaction()
                    return internal_server_error(errormsg=res)

            # The below SQL will execute CREATE DDL only
            SQL = render_template(
                "/".join([self.template_path, 'create.sql']),
                data=data, conn=self.conn
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                self.end_transaction()
                return internal_server_error(errormsg=res)

            if 'name' not in data or data['name'] == "":
                sql = render_template(
                    "/".join([self.template_path,
                              'get_oid_with_transaction.sql']),
                    tid=tid)

                status, res = self.conn.execute_dict(sql)
                if not status:
                    self.end_transaction()
                    return internal_server_error(errormsg=res)

                self.end_transaction()

                data['name'] = res['rows'][0]['name']

            else:
                sql = render_template(
                    "/".join([self.template_path, 'get_oid.sql']),
                    name=data['name']
                )
                status, res = self.conn.execute_dict(sql)
                if not status:
                    self.end_transaction()
                    return internal_server_error(errormsg=res)

            if res['rows'][0]["convalidated"]:
                icon = "icon-foreign_key_no_validate"
                valid = False
            else:
                icon = "icon-foreign_key"
                valid = True

            if data['autoindex']:
                sql = render_template(
                    "/".join([self.template_path, 'create_index.sql']),
                    data=data, conn=self.conn)
                sql = sql.strip('\n').strip(' ')

                if sql != '':
                    status, idx_res = self.conn.execute_scalar(sql)
                    if not status:
                        self.end_transaction()
                        return internal_server_error(errormsg=idx_res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    res['rows'][0]['oid'],
                    tid,
                    data['name'],
                    valid=valid,
                    icon=icon
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
    def update(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function will update the data for the selected
        foreign key.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        try:
            data['schema'] = self.schema
            data['table'] = self.table
            sql, name = self.get_sql(data, tid, fkid)
            if not isinstance(sql, (str, unicode)):
                return sql
            sql = sql.strip('\n').strip(' ')

            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            sql = render_template(
                "/".join([self.template_path, 'get_oid.sql']),
                tid=tid,
                name=data['name']
            )
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if res['rows'][0]["convalidated"]:
                icon = "icon-foreign_key_no_validate"
                valid = False
            else:
                icon = "icon-foreign_key"
                valid = True

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    fkid,
                    tid,
                    name,
                    icon=icon,
                    valid=valid
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function will delete an existing foreign key.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        # Below code will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False
        try:
            sql = render_template(
                "/".join([self.template_path, 'get_name.sql']), fkid=fkid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)

            if not res['rows']:
                return make_json_response(
                    success=0,
                    errormsg=_(
                        'Error: Object not found.'
                    ),
                    info=_(
                        'The specified foreign key could not be found.\n'
                    )
                )

            data = res['rows'][0]
            data['schema'] = self.schema
            data['table'] = self.table

            sql = render_template(
                "/".join([self.template_path, 'delete.sql']),
                data=data, cascade=cascade)
            status, res = self.conn.execute_scalar(sql)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=_("Foreign key dropped."),
                data={
                    'id': fkid,
                    'sid': sid,
                    'gid': gid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function returns modified SQL for the selected
        foreign key.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        data['schema'] = self.schema
        data['table'] = self.table
        try:
            sql, name = self.get_sql(data, tid, fkid)
            if not isinstance(sql, (str, unicode)):
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

    def get_sql(self, data, tid, fkid=None):
        """
        This function will generate sql from model data.

        Args:
          data: Contains the data of the selected foreign key constraint.
          tid: Table ID.
          fkid: Foreign key constraint ID

        Returns:

        """
        if fkid is not None:
            sql = render_template(
                "/".join([self.template_path, 'properties.sql']),
                tid=tid, cid=fkid)
            status, res = self.conn.execute_dict(sql)
            if not status:
                return internal_server_error(errormsg=res)
            if len(res['rows']) == 0:
                return gone(_("""Could not find the foreign key."""))

            old_data = res['rows'][0]
            required_args = ['name']
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            sql = render_template("/".join([self.template_path, 'update.sql']),
                                  data=data, o_data=old_data)

            if 'autoindex' in data and data['autoindex'] and \
                    ('coveringindex' in data and data['coveringindex'] != ''):

                col_sql = render_template(
                    "/".join([self.template_path, 'get_constraint_cols.sql']),
                    tid=tid,
                    keys=zip(old_data['confkey'], old_data['conkey']),
                    confrelid=old_data['confrelid']
                )

                status, res = self.conn.execute_dict(col_sql)

                if not status:
                    return internal_server_error(errormsg=res)

                columns = []
                for row in res['rows']:
                    columns.append({"local_column": row['conattname'],
                                    "references": old_data['confrelid'],
                                    "referenced": row['confattname']})

                data['columns'] = columns

                sql += render_template(
                    "/".join([self.template_path, 'create_index.sql']),
                    data=data, conn=self.conn)
        else:
            required_args = ['columns']

            for arg in required_args:
                if arg not in data:
                    return _('-- definition incomplete')
                elif isinstance(data[arg], list) and len(data[arg]) < 1:
                    return _('-- definition incomplete')

            if data['autoindex'] and \
                ('coveringindex' not in data or
                 data['coveringindex'] == ''):
                return _('-- definition incomplete')

            SQL = render_template("/".join([self.template_path,
                                            'get_parent.sql']),
                                  tid=data['columns'][0]['references'])
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=rset)

            data['remote_schema'] = rset['rows'][0]['schema']
            data['remote_table'] = rset['rows'][0]['table']

            sql = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)

            if data['autoindex']:
                sql += render_template(
                    "/".join([self.template_path, 'create_index.sql']),
                    data=data, conn=self.conn)
        return sql, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function generates sql to show in the sql pane for the selected
        foreign key.

        Args:
          gid: Server Group ID
          sid: Server ID
          did: Database ID
          scid: Schema ID
          tid: Table ID
          fkid: Foreign key constraint ID

        Returns:

        """

        SQL = render_template(
            "/".join([self.template_path, 'properties.sql']),
            tid=tid, conn=self.conn, cid=fkid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(_("""Could not find the foreign key."""))

        data = res['rows'][0]
        data['schema'] = self.schema
        data['table'] = self.table

        sql = render_template("/".join([self.template_path,
                                        'get_constraint_cols.sql']),
                              tid=tid,
                              keys=zip(data['confkey'], data['conkey']),
                              confrelid=data['confrelid'])

        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        columns = []
        for row in res['rows']:
            columns.append({"local_column": row['conattname'],
                            "references": data['confrelid'],
                            "referenced": row['confattname']})

        data['columns'] = columns

        SQL = render_template("/".join([self.template_path,
                                        'get_parent.sql']),
                              tid=data['columns'][0]['references'])
        status, res = self.conn.execute_2darray(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        data['remote_schema'] = res['rows'][0]['schema']
        data['remote_table'] = res['rows'][0]['table']

        SQL = render_template(
            "/".join([self.template_path, 'create.sql']), data=data)

        sql_header = u"-- Constraint: {0}\n\n-- ".format(data['name'])

        sql_header += render_template(
            "/".join([self.template_path, 'delete.sql']),
            data=data)
        sql_header += "\n"

        SQL = sql_header + SQL

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function gets the dependents and returns an ajax response
        for the event trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            etid: Event trigger ID
        """
        dependents_result = self.get_dependents(self.conn, fkid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, fkid=None):
        """
        This function gets the dependencies and returns an ajax response
        for the event trigger node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            etid: Event trigger ID
        """
        dependencies_result = self.get_dependencies(self.conn, fkid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def validate_foreign_key(self, gid, sid, did, scid, tid, fkid):
        """

        Args:
          gid:
          sid:
          did:
          scid:
          tid:
          fkid:

        Returns:

        """
        data = {}
        try:
            data['schema'] = self.schema
            data['table'] = self.table
            sql = render_template(
                "/".join([self.template_path, 'get_name.sql']), fkid=fkid)
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
                info=_("Foreign key updated."),
                data={
                    'id': fkid,
                    'tid': tid,
                    'scid': scid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def search_coveringindex(self, tid, cols):
        """

        Args:
          tid: Table id
          cols: column list

        Returns:

        """

        cols = set(cols)
        SQL = render_template("/".join([self.template_path,
                                        'get_constraints.sql']),
                              tid=tid)
        status, constraints = self.conn.execute_dict(SQL)

        if not status:
            raise Exception(constraints)

        for costrnt in constraints['rows']:

            sql = render_template(
                "/".join([self.template_path, 'get_cols.sql']),
                cid=costrnt['oid'],
                colcnt=costrnt['col_count'])
            status, rest = self.conn.execute_dict(sql)

            if not status:
                return internal_server_error(errormsg=rest)

            indexcols = set()
            for r in rest['rows']:
                indexcols.add(r['column'].strip('"'))

            if len(cols - indexcols) == len(indexcols - cols) == 0:
                return costrnt["idxname"]

        return None

    @check_precondition
    def get_coveringindex(self, gid, sid, did, scid, tid=None):
        """

        Args:
          gid:
          sid:
          did:
          scid:
          tid:

        Returns:

        """
        data = request.args if request.args else None
        index = None
        try:
            if data and 'cols' in data:
                cols = set(json.loads(data['cols'], encoding='utf-8'))
                index = self.search_coveringindex(tid, cols)

            return make_json_response(
                data=index,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))


constraint = ConstraintRegistry(
    'foreign_key', ForeignKeyConstraintModule, ForeignKeyConstraintView
)
ForeignKeyConstraintView.register_node_view(blueprint)
