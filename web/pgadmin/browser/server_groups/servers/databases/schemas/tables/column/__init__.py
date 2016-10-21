##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Column Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone


class ColumnsModule(CollectionNodeModule):
    """
     class ColumnsModule(CollectionNodeModule)

        A module class for Column node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Column and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    NODE_TYPE = 'column'
    COLLECTION_LABEL = gettext("Columns")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the ColumnModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None
        super(ColumnsModule, self).__init__(*args, **kwargs)

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


blueprint = ColumnsModule(__name__)


class ColumnsView(PGChildNodeView, DataTypeReader):
    """
    This class is responsible for generating routes for Column node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the ColumnView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Column nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Column node.

    * properties(gid, sid, did, scid, tid, clid)
      - This function will show the properties of the selected Column node

    * create(gid, sid, did, scid, tid)
      - This function will create the new Column object

    * update(gid, sid, did, scid, tid, clid)
      - This function will update the data for the selected Column node

    * delete(self, gid, sid, scid, tid, clid):
      - This function will drop the Column object

    * msql(gid, sid, did, scid, tid, clid)
      - This function is used to return modified SQL for the selected
        Column node

    * get_sql(data, scid, tid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Column node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Column node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Column node.
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
        # Here we specify type as any because table
        # are also has '-' in them if they are system table
        {'type': 'string', 'id': 'clid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'children': [{'get': 'children'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
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
            driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = driver.connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            self.qtIdent = driver.qtIdent
            self.qtTypeIdent = driver.qtTypeIdent

            # Set the template path for the SQL scripts
            if self.manager.version >= 90200:
                self.template_path = 'column/sql/9.2_plus'
            else:
                self.template_path = 'column/sql/9.1_plus'
            # Allowed ACL for column 'Select/Update/Insert/References'
            self.acl = ['a', 'r', 'w', 'x']

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

    @check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        This function is used to list all the schema nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available column nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']), tid=tid,
                              show_sys_objects=self.blueprint.show_system_objects)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid, tid, clid=None):
        """
        This function will used to create all the child node within that collection.
        Here it will create all the schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available schema child nodes
        """
        res = []
        SQL = render_template(
            "/".join([self.template_path, 'nodes.sql']),
            tid=tid,
            clid=clid,
            show_sys_objects=self.blueprint.show_system_objects
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if clid is not None:
            if len(rset['rows']) == 0:
                return gone(
                    errormsg=gettext("Couldn't find the column.")
                )
            row = rset['rows'][0]
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-column",
                    datatype=row['datatype']  # We need datatype somewhere in
                ),
                status=200
            )

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    tid,
                    row['name'],
                    icon="icon-column",
                    datatype=row['datatype']  # We need datatype somewhere in
                ))  # exclusion constraint.

        return make_json_response(
            data=res,
            status=200
        )

    def _formatter(self, scid, tid, clid, data):
        """
        Args:
             scid: schema oid
             tid: table oid
             clid: position of column in table
             data: dict of query result

        Returns:
            It will return formatted output of collections
        """
        # To check if column is primary key
        if 'attnum' in data and 'indkey' in data:
            # Current column
            attnum = str(data['attnum'])

            # Single/List of primary key column(s)
            indkey = str(data['indkey'])

            # We will check if column is in primary column(s)
            if attnum in indkey.split(" "):
                data['is_pk'] = True
            else:
                data['is_pk'] = False

        # Find length & precision of column data type
        fulltype = self.get_full_type(
            data['typnspname'], data['typname'],
            data['isdup'], data['attndims'], data['atttypmod']
        )

        import re
        # If we have length & precision both
        matchObj = re.search(r'(\d+),(\d+)', fulltype)
        if matchObj:
            data['attlen'] = matchObj.group(1)
            data['attprecision'] = matchObj.group(2)
        else:
            # If we have length only
            matchObj = re.search(r'(\d+)', fulltype)
            if matchObj:
                data['attlen'] = matchObj.group(1)
                data['attprecision'] = None
            else:
                data['attlen'] = None
                data['attprecision'] = None

        # We need to fetch inherited tables for each table
        SQL = render_template("/".join([self.template_path,
                                        'get_inherited_tables.sql']),
                              tid=tid)
        status, inh_res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=inh_res)
        for row in inh_res['rows']:
            if row['attrname'] == data['name']:
                data['is_inherited'] = True
                data['tbls_inherited'] = row['inhrelname']

        # We need to format variables according to client js collection
        if 'attoptions' in data and data['attoptions'] is not None:
            spcoptions = []
            for spcoption in data['attoptions']:
                k, v = spcoption.split('=')
                spcoptions.append({'name': k, 'value': v})

            data['attoptions'] = spcoptions

        # Need to format security labels according to client js collection
        if 'seclabels' in data and data['seclabels'] is not None:
            seclabels = []
            for seclbls in data['seclabels']:
                k, v = seclbls.split('=')
                seclabels.append({'provider': k, 'label': v})

            data['seclabels'] = seclabels

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template("/".join([self.template_path, 'acl.sql']),
                              tid=tid, clid=clid)
        status, acl = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        data['attacl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            data.setdefault(row['deftype'], []).append(priv)

        # we are receiving request when in edit mode
        # we will send filtered types related to current type
        present_type = data['cltype']
        type_id = data['atttypid']

        SQL = render_template("/".join([self.template_path,
                                        'is_referenced.sql']),
                              tid=tid, clid=clid)

        status, is_reference = self.conn.execute_scalar(SQL)

        edit_types_list = list()
        # We will need present type in edit mode
        if data['typnspname'] == "pg_catalog" or data['typnspname'] == "public":
            edit_types_list.append(present_type)
        else:
            t = self.qtTypeIdent(self.conn, data['typnspname'], present_type)
            edit_types_list.append(t)
            data['cltype'] = t

        if int(is_reference) == 0:
            SQL = render_template("/".join([self.template_path,
                                            'edit_mode_types.sql']),
                                  type_id=type_id)
            status, rset = self.conn.execute_2darray(SQL)

            for row in rset['rows']:
                edit_types_list.append(row['typname'])
        else:
            edit_types_list.append(present_type)

        data['edit_types'] = edit_types_list

        # Manual Data type formatting
        # If data type has () with them then we need to remove them
        # eg bit(1) because we need to match the name with combobox
        isArray = False
        if data['cltype'].endswith('[]'):
            isArray = True
            data['cltype'] = data['cltype'].rstrip('[]')

        idx = data['cltype'].find('(')
        if idx and data['cltype'].endswith(')'):
            data['cltype'] = data['cltype'][:idx]

        if isArray:
            data['cltype'] += "[]"

        return data

    @check_precondition
    def properties(self, gid, sid, did, scid, tid, clid):
        """
        This function will show the properties of the selected schema node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            clid: Column ID

        Returns:
            JSON of selected schema node
        """

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']), tid=tid, clid=clid
                              , show_sys_objects=self.blueprint.show_system_objects)

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the column in the table."""))

        # Making copy of output for future use
        data = dict(res['rows'][0])
        data = self._formatter(scid, tid, clid, data)

        return ajax_response(
            response=data,
            status=200
        )

    def _cltype_formatter(self, type):
        """

        Args:
            data: Type string

        Returns:
            We need to remove [] from type and append it
            after length/precision so we will set flag for
            sql template
        """
        if '[]' in type:
            type = type.replace('[]', '')
            self.hasSqrBracket = True
        else:
            self.hasSqrBracket = False

        return type

    @check_precondition
    def create(self, gid, sid, did, scid, tid):
        """
        This function will creates new the schema object

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
            'cltype': 'Type'
        }

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Couldn't find the required parameter (%s)." %
                        required_args[arg]
                    )
                )

        # Parse privilege data coming from client according to database format
        if 'attacl' in data:
            data['attacl'] = parse_priv_to_db(data['attacl'], self.acl)

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        # check type for '[]' in it
        data['cltype'] = self._cltype_formatter(data['cltype'])
        data['hasSqrBracket'] = self.hasSqrBracket

        SQL = render_template("/".join([self.template_path,
                                        'create.sql']),
                              data=data, conn=self.conn)
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # we need oid to to add object in tree at browser
        SQL = render_template(
            "/".join([self.template_path, 'get_position.sql']),
            tid=tid, data=data
        )
        status, clid = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=tid)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                clid,
                tid,
                data['name'],
                icon="icon-column"
            )
        )

    @check_precondition
    def delete(self, gid, sid, did, scid, tid, clid):
        """
        This function will updates existing the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID
        """
        # We will first fetch the column name for current request
        # so that we create template for dropping column
        try:

            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']), tid=tid, clid=clid
                                  , show_sys_objects=self.blueprint.show_system_objects)

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
                        'The specified column could not be found.\n'
                    )
                )

            data = dict(res['rows'][0])
            # We will add table & schema as well
            data['schema'] = self.schema
            data['table'] = self.table

            SQL = render_template("/".join([self.template_path,
                                            'delete.sql']),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Column is dropped"),
                data={
                    'id': clid,
                    'tid': tid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid, clid):
        """
        This function will updates existing the schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        # Adding parent into data dict, will be using it while creating sql
        data['schema'] = self.schema
        data['table'] = self.table

        # check type for '[]' in it
        if 'cltype' in data:
            data['cltype'] = self._cltype_formatter(data['cltype'])
            data['hasSqrBracket'] = self.hasSqrBracket

        SQL, name = self.get_sql(scid, tid, clid, data)
        SQL = SQL.strip('\n').strip(' ')
        status, res = self.conn.execute_scalar(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        return jsonify(
            node=self.blueprint.generate_browser_node(
                clid,
                tid,
                name,
                icon="icon-%s" % self.node_type
            )
        )

    @check_precondition
    def msql(self, gid, sid, did, scid, tid, clid=None):
        """
        This function will generates modified sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID (When working with existing column)
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

        # check type for '[]' in it
        if 'cltype' in data:
            data['cltype'] = self._cltype_formatter(data['cltype'])
            data['hasSqrBracket'] = self.hasSqrBracket

        try:
            SQL, name = self.get_sql(scid, tid, clid, data)

            SQL = SQL.strip('\n').strip(' ')
            if SQL == '':
                SQL = "--modified SQL"
            return make_json_response(
                data=SQL,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, scid, tid, clid, data):
        """
        This function will genrate sql from model data
        """
        if clid is not None:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']), tid=tid, clid=clid
                                  , show_sys_objects=self.blueprint.show_system_objects)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            old_data = dict(res['rows'][0])
            # We will add table & schema as well
            old_data = self._formatter(scid, tid, clid, old_data)

            # If name is not present in data then
            # we will fetch it from old data, we also need schema & table name
            if 'name' not in data:
                data['name'] = old_data['name']

            # Convert acl coming from client in db parsing format
            key = 'attacl'
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

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            required_args = [
                'name',
                'cltype'
            ]

            for arg in required_args:
                if arg not in data:
                    return gettext('-- incomplete definition')

            # We will convert privileges coming from client required
            # in server side format
            if 'attacl' in data:
                data['attacl'] = parse_priv_to_db(data['attacl'],
                                                  self.acl)
            # If the request for new object which do not have did
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)
        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, clid):
        """
        This function will generates reverse engineered sql for schema object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           clid: Column ID
        """
        try:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']), tid=tid, clid=clid
                                  , show_sys_objects=self.blueprint.show_system_objects)

            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            data = dict(res['rows'][0])
            # We do not want to display length as -1 in create query
            if 'attlen' in data and data['attlen'] == -1:
                data['attlen'] = ''
            # Adding parent into data dict, will be using it while creating sql
            data['schema'] = self.schema
            data['table'] = self.table
            # check type for '[]' in it
            if 'cltype' in data:
                data['cltype'] = self._cltype_formatter(data['cltype'])
                data['hasSqrBracket'] = self.hasSqrBracket

            # We will add table & schema as well
            data = self._formatter(scid, tid, clid, data)

            SQL, name = self.get_sql(scid, tid, None, data)

            sql_header = u"-- Column: {0}\n\n-- ".format(self.qtIdent(self.conn,
                                                                     data['schema'],
                                                                     data['table'],
                                                                     data['name']))

            sql_header += render_template("/".join([self.template_path,
                                                    'delete.sql']),
                                          data=data, conn=self.conn)
            SQL = sql_header + '\n\n' + SQL

            return ajax_response(response=SQL.strip('\n'))

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid, clid):
        """
        This function get the dependents and return ajax response
        for the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            clid: Column ID
        """
        # Specific condition for column which we need to append
        where = "WHERE dep.refobjid={0}::OID AND dep.refobjsubid={1}".format(
            tid, clid
        )

        dependents_result = self.get_dependents(
            self.conn, clid, where=where
        )

        # Specific sql to run againt column to fetch dependents
        SQL = render_template("/".join([self.template_path,
                                        'depend.sql']), where=where)

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
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

            dependents_result.append({'type': 'sequence', 'name': ref_name, 'field': dep_type})

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid, clid):
        """
        This function get the dependencies and return ajax response
        for the column node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID
            clid: Column ID

        """
        # Specific condition for column which we need to append
        dependencies_result = self.get_dependencies(
            self.conn, clid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def statistics(self, gid, sid, did, scid, tid, clid):
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
        # Fetch column name
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']), tid=tid, clid=clid
                              , show_sys_objects=self.blueprint.show_system_objects)

        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        data = dict(res['rows'][0])
        column = data['name']

        status, res = self.conn.execute_dict(
            render_template(
                "/".join([self.template_path, 'stats.sql']),
                conn=self.conn, schema=self.schema,
                table=self.table, column=column
            )
        )

        if not status:
            return internal_server_error(errormsg=res)

        return make_json_response(
            data=res,
            status=200
        )


ColumnsView.register_node_view(blueprint)
