##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Type Node """

from functools import wraps

import json
from flask import render_template, request, jsonify
from flask_babel import gettext
import re

import pgadmin.browser.server_groups.servers.databases as database
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.utils.driver import get_driver
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


class TypeModule(SchemaChildModule):
    """
     class TypeModule(SchemaChildModule)

        A module class for Type node derived from SchemaChildModule

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Type and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for type, when any of the server node is
        initialized.
    """

    _NODE_TYPE = 'type'
    _COLLECTION_LABEL = gettext("Types")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the TypeModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super().__init__(*args, **kwargs)
        self.min_ver = None
        self.max_ver = None

    def get_nodes(self, gid, sid, did, scid):
        """
        Generate the collection node
        """
        if self.has_nodes(sid, did, scid=scid,
                          base_template_path=TypeView.BASE_TEMPLATE_PATH):
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
        Load the module node as a leaf node
        """
        return False


blueprint = TypeModule(__name__)


class TypeView(PGChildNodeView, DataTypeReader, SchemaDiffObjectCompare):
    """
    This class is responsible for generating routes for Type node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the TypeView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Type nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Type node.

    * properties(gid, sid, did, scid, tid)
      - This function will show the properties of the selected Type node

    * create(gid, sid, did, scid)
      - This function will create the new Type object

    * update(gid, sid, did, scid, tid)
      - This function will update the data for the selected Type node

    * delete(self, gid, sid, scid, tid):
      - This function will drop the Type object

    * msql(gid, sid, did, scid, tid)
      - This function is used to return modified SQL for the selected
        Type node

    * get_sql(data, scid, tid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Type node.

    * dependency(gid, sid, did, scid, tid):
      - This function will generate dependency list show it in dependency
        pane for the selected Type node.

    * dependent(gid, sid, did, scid, tid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Type node.

    * additional_properties(copy_dict, tid):
      - This function will add additional properties in response

    * get_collations(gid, sid, did, scid, tid):
      - This function will return list of collation in ajax response

    * get_types(gid, sid, did, scid, tid):
      - This function will return list of types in ajax response

    * get_subtypes(gid, sid, did, scid, tid):
      - This function will return list of subtypes in ajax response

    * get_subtype_opclass(gid, sid, did, scid, tid):
      - This function will return list of subtype opclass in ajax response

    * get_subtype_diff(gid, sid, did, scid, tid):
      - This function will return list of subtype diff functions
        in ajax response

    * get_canonical(gid, sid, did, scid, tid):
      - This function will return list of canonical functions
        in ajax response

    * get_external_functions_list(gid, sid, did, scid, tid):
      - This function will return list of external functions
        in ajax response

    * compare(**kwargs):
      - This function will compare the type nodes from two
        different schemas.
    """

    node_type = blueprint.node_type
    icon_str = "icon-%s"
    BASE_TEMPLATE_PATH = 'types/{0}/sql/#{1}#'

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    ids = [
        {'type': 'int', 'id': 'tid'}
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
        'get_types': [{'get': 'get_types'}, {'get': 'get_types'}],
        'get_stypes': [{'get': 'get_subtypes'}, {'get': 'get_subtypes'}],
        'get_subopclass': [{'get': 'get_subtype_opclass'},
                           {'get': 'get_subtype_opclass'}],
        'get_stypediff': [{'get': 'get_subtype_diff'},
                          {'get': 'get_subtype_diff'}],
        'get_canonical': [{'get': 'get_canonical'}, {'get': 'get_canonical'}],
        'get_collations': [{'get': 'get_collations'},
                           {'get': 'get_collations'}],
        'get_external_functions': [{'get': 'get_external_functions_list'},
                                   {'get': 'get_external_functions_list'}]
    })

    keys_to_ignore = ['oid', 'typnamespace', 'typrelid', 'typarray', 'alias',
                      'schema', 'oid-2', 'type_acl', 'rngcollation', 'attnum',
                      'typowner']

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
                kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])

            # Declare allows acl on type
            self.acl = ['U']

            self.template_path = self.BASE_TEMPLATE_PATH.format(
                self.manager.server_type, self.manager.version)

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the type nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Type ID

        Returns:
            JSON of available type nodes
        """

        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            scid=scid,
            datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
            show_system_objects=self.blueprint.show_system_objects)

        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, tid):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the type node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Type ID

        Returns:
            JSON of available type child nodes
        """

        SQL = render_template(
            "/".join([self.template_path,
                      self._NODES_SQL]),
            scid=scid,
            tid=tid,
            show_system_objects=self.blueprint.show_system_objects)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(
                gettext("""Could not find the type in the database."""))

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            scid,
            rset['rows'][0]['name'],
            icon=self.icon_str % self.node_type
        )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        This function will used to create all the child node within that
        collection.
        Here it will create all the type node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Type ID

        Returns:
            JSON of available type child nodes
        """

        res = []
        SQL = render_template(
            "/".join([self.template_path,
                      self._NODES_SQL]), scid=scid,
            show_system_objects=self.blueprint.show_system_objects)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    scid,
                    row['name'],
                    icon=self.icon_str % self.node_type,
                    description=row['description']
                ))

        return make_json_response(
            data=res,
            status=200
        )

    def _cltype_formatter(self, in_type):
        """

        Args:
            data: Type string

        Returns:
            We need to remove [] from type and append it
            after length/precision so we will set flag for
            sql template
        """
        if '[]' in in_type:
            in_type = in_type.replace('[]', '')
            self.hasSqrBracket = True
        else:
            self.hasSqrBracket = False

        return in_type

    @staticmethod
    def convert_length_precision_to_string(data):
        """
        This function is used to convert length & precision to string
        to handle case like when user gives 0 as length

        Args:
            data: Data from client

        Returns:
            Converted data
        """
        if 'tlength' in data and data['tlength'] is not None:
            data['tlength'] = str(data['tlength'])
        if 'precision' in data and data['precision'] is not None:
            data['precision'] = str(data['precision'])
        return data

    def _additional_properties_composite(self, rows):
        """
        Used by additional_properties internally for composite type.
        :param rows: list of data
        :return: formatted response
        """
        res = dict()
        properties_list = []
        # To display in composite collection grid
        composite_lst = []

        for row in rows:
            # We will fetch Full type name

            typelist = ' '.join([row['attname'], row['fulltype']])
            if (
                not row['collname'] or
                (
                    row['collname'] == 'default' and
                    row['collnspname'] == 'pg_catalog'
                )
            ):
                full_collate = ''
                collate = ''
            else:
                full_collate = get_driver(PG_DEFAULT_DRIVER).qtIdent(
                    self.conn, row['collnspname'], row['collname'])
                collate = ' COLLATE ' + full_collate

            typelist += collate
            properties_list.append(typelist)

            is_tlength, is_precision, typeval = \
                self.get_length_precision(row.get('elemoid', None))

            # Split length, precision from type name for grid
            t_len, t_prec = DataTypeReader.parse_length_precision(
                row['fulltype'], is_tlength, is_precision)

            type_name = DataTypeReader.parse_type_name(row['typname'])

            row['type'] = self._cltype_formatter(type_name)
            row['hasSqrBracket'] = self.hasSqrBracket
            row = self.convert_length_precision_to_string(row)
            composite_lst.append({
                'attnum': row['attnum'], 'member_name': row['attname'],
                'type': type_name,
                'collation': full_collate, 'cltype': row['type'],
                'tlength': t_len, 'precision': t_prec,
                'is_tlength': is_tlength, 'is_precision': is_precision,
                'hasSqrBracket': row['hasSqrBracket'],
                'fulltype': row['fulltype']})

        # Adding both results
        res['member_list'] = ', '.join(properties_list)
        res['composite'] = composite_lst

        return res

    def _additional_properties_advanced_server_type(self, data):
        """
        Used by additional_properties internally for advanced server types.
        :param rows: list of data
        :return: formatted response
        """
        is_tlength, is_precision, typeval = \
            self.get_length_precision(data.get('elemoid', None))

        # Split length, precision from type name for grid
        t_len, t_prec = DataTypeReader.parse_length_precision(
            data['fulltype'], is_tlength, is_precision)

        data = self.convert_length_precision_to_string(data)
        data['type'] = self._cltype_formatter(data['type'])
        data['cltype'] = self._cltype_formatter(data['type'])
        data['hasSqrBracket'] = self.hasSqrBracket
        data['tlength'] = t_len,
        data['precision'] = t_prec
        data['is_tlength'] = is_tlength,
        data['is_precision'] = is_precision,
        data['maxsize'] = data['typndims']

        return data

    def additional_properties(self, copy_dict, tid):
        """
        We will use this function to add additional properties according to
        type

        Returns:
            additional properties for type like range/composite/enum

        """
        # Fetching type of type
        of_type = copy_dict['typtype']
        res = dict()

        render_args = {'typtype': of_type}
        if of_type == 'c':
            render_args['typrelid'] = copy_dict['typrelid']
        else:
            render_args['tid'] = tid

        if of_type in ('c', 'e', 'r', 'N', 'V', 'A'):
            SQL = render_template("/".join([self.template_path,
                                            'additional_properties.sql']),
                                  **render_args)
            status, rset = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

        # If type is of Composite then we need to add members list in our
        # output
        if of_type == 'c':
            # To display in properties
            res = self._additional_properties_composite(rset['rows'])

        if of_type in ('N', 'V'):
            # To display in properties
            res = self._additional_properties_advanced_server_type(
                rset['rows'][0])

        # If type is of ENUM then we need to add labels in our output
        if of_type == 'e':
            # To display in properties
            properties_list = []
            # To display in enum grid
            enum_list = []
            for row in rset['rows']:
                properties_list.append(row['enumlabel'])
                enum_list.append({'label': row['enumlabel']})

            # Adding both results in ouput
            res['enum_list'] = ', '.join(properties_list)
            res['enum'] = enum_list

        # If type is of Range then we need to add collation,subtype etc in our
        # output
        if of_type == 'r':
            range_dict = dict(rset['rows'][0])
            res.update(range_dict)

        if 'seclabels' in copy_dict and copy_dict['seclabels'] is not None:
            sec_labels = []
            for sec in copy_dict['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                sec_labels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })
            res['seclabels'] = sec_labels

        # Returning only additional properties only
        return res

    @check_precondition
    def properties(self, gid, sid, did, scid, tid):
        """
        This function will show the properties of the selected type node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Type ID

        Returns:
            JSON of selected type node
        """
        status, res = self._fetch_properties(scid, tid)
        if not status:
            return res

        return ajax_response(
            response=res,
            status=200
        )

    def _fetch_properties(self, scid, tid):
        """
        This function is used to fecth the properties of the specified object.
        :param scid:
        :param tid:
        :return:
        """

        SQL = render_template(
            "/".join([self.template_path,
                      self._PROPERTIES_SQL]),
            scid=scid, tid=tid,
            datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
            show_system_objects=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return False, gone(
                gettext("""Could not find the type in the database."""))

        # Making copy of output for future use
        copy_dict = dict(res['rows'][0])

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template("/".join([self.template_path, self._ACL_SQL]),
                              scid=scid, tid=tid)
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return False, internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        copy_dict['typacl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in copy_dict:
                copy_dict[row['deftype']].append(priv)
            else:
                copy_dict[row['deftype']] = [priv]

        # Calling function to check and additional properties if available
        copy_dict.update(self.additional_properties(copy_dict, tid))

        return True, copy_dict

    @check_precondition
    def get_collations(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of collation available
        as AJAX response.
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_collations.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['collation'],
                     'value': row['collation']}
                )
            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_types(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of types available
        as AJAX response.
        """
        res = []
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_types.sql']))
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                # Check against PGOID for specific type
                if row['elemoid']:
                    if row['elemoid'] in (1560, 1561, 1562, 1563, 1042, 1043,
                                          1014, 1015):
                        typeval = 'L'
                    elif row['elemoid'] in (1083, 1114, 1115, 1183, 1184, 1185,
                                            1186, 1187, 1266, 1270):
                        typeval = 'D'
                    elif row['elemoid'] in (1231, 1700):
                        typeval = 'P'
                    else:
                        typeval = ' '

                # Logic to set precision & length/min/max values
                precision, length, min_val,\
                    max_val = TypeView.set_precision_and_len_val(typeval)

                res.append(
                    {'label': row['typname'], 'value': row['typname'],
                     'typval': typeval, 'precision': precision,
                     'length': length, 'min_val': min_val, 'max_val': max_val,
                     'is_collatable': row['is_collatable']
                     }
                )

            return make_json_response(
                data=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @staticmethod
    def set_precision_and_len_val(typeval):
        """
        Logic to set precision & length/min/max values
        :param typeval: type value to check precision, Length.
        :return: precision, length, min val and max val.
        """
        # Attaching properties for precession
        # & length validation for current type
        precision = False
        length = False
        min_val = 0
        max_val = 0

        if typeval == 'P':
            precision = True

        if precision or typeval in ('L', 'D'):
            length = True
            min_val = 0 if typeval == 'D' else 1
            if precision:
                max_val = 1000
            elif min_val:
                # Max of integer value
                max_val = 2147483647
            else:
                max_val = 10
        return precision, length, min_val, max_val

    @check_precondition
    def get_subtypes(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of subtypes available
        as AJAX response.
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            self._GET_SUBTYPES_SQL]),
                                  subtype=True, conn=self.conn)
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['stype'], 'value': row['stype'],
                     'is_collate': row['is_collate']}
                )

            return make_json_response(
                data=res,
                status=200
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_subtype_opclass(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of subtype opclass available
        as AJAX response.
        """
        res = [{'label': '', 'value': ''}]
        data = request.args

        try:
            SQL = render_template("/".join([self.template_path,
                                            self._GET_SUBTYPES_SQL]),
                                  subtype_opclass=True, data=data,
                                  conn=self.conn)
            if SQL:
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['opcname'],
                         'value': row['opcname']})

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_subtype_diff(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of subtypes diff functions available
        as AJAX response.
        """
        res = [{'label': '', 'value': ''}]
        data = request.args

        try:
            SQL = render_template("/".join([self.template_path,
                                            self._GET_SUBTYPES_SQL]),
                                  get_opcintype=True, data=data,
                                  conn=self.conn)
            if SQL:
                status, opcintype = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=opcintype)
                SQL = render_template("/".join([self.template_path,
                                                self._GET_SUBTYPES_SQL]),
                                      opcintype=opcintype, conn=self.conn)
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['stypdiff'],
                         'value': row['stypdiff']}
                    )

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_canonical(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of canonical functions available
        as AJAX response.
        """
        res = [{'label': '', 'value': ''}]
        data = request.args
        canonical = True

        try:
            # We want to send data only if in we are in edit mode
            # else we will disable the combobox
            SQL = render_template("/".join([self.template_path,
                                            self._GET_SUBTYPES_SQL]),
                                  getoid=True, data=data, conn=self.conn)
            if SQL:
                status, oid = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=oid)
                # If oid is None then do not run SQL
                if oid is None:
                    canonical = False

            SQL = render_template("/".join([self.template_path,
                                            self._GET_SUBTYPES_SQL]),
                                  canonical=canonical, conn=self.conn, oid=oid)
            if SQL:
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['canonical'],
                         'value': row['canonical']})

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_external_functions_list(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of external functions available
        as AJAX response.
        """
        res = [{'label': '', 'value': '', 'cbtype': 'all'}]

        try:
            # The SQL generated below will populate Input/Output/Send/
            # Receive/Analyze/TypModeIN/TypModOUT combo box
            sql = render_template("/".join([self.template_path,
                                            self._GET_EXTERNAL_FUNCTIONS_SQL]),
                                  extfunc=True)
            if sql:
                status, rset = self.conn.execute_2darray(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['func'], 'value': row['func'],
                         'cbtype': 'all'})

            # The SQL generated below will populate TypModeIN combo box
            sql = render_template("/".join([self.template_path,
                                            self._GET_EXTERNAL_FUNCTIONS_SQL]),
                                  typemodin=True)
            if sql:
                status, rset = self.conn.execute_2darray(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['func'], 'value': row['func'],
                         'cbtype': 'typmodin'})

            # The SQL generated below will populate TypModeIN combo box
            self._get_data_for_type_modein(res)

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _get_data_for_type_modein(self, res):
        """
        Data for TypModeIN combo box
        :param res: response object.
        :return:
        """
        sql = render_template("/".join([self.template_path,
                                        self._GET_EXTERNAL_FUNCTIONS_SQL]),
                              typemodout=True)
        if sql:
            status, rset = self.conn.execute_2darray(sql)
            if not status:
                return internal_server_error(errormsg=res)

            for row in rset['rows']:
                res.append(
                    {'label': row['func'], 'value': row['func'],
                     'cbtype': 'typmodout'})

    @staticmethod
    def _checks_for_create_type(data):
        required_args = {
            'name': 'Name',
            'typtype': 'Type'
        }
        for arg in required_args:
            if arg not in data:
                return True, make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )
            # Additional checks goes here
            # If type is range then check if subtype is defined or not
            if data and data[arg] == 'r' and \
                    ('typname' not in data or data['typname'] is None):
                return True, make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        'Subtype must be defined for range types.'
                    )
                )
            # If type is external then check if input/output
            # conversion function is defined
            if data and data[arg] == 'b' and (
                    'typinput' not in data or
                    'typoutput' not in data or
                    data['typinput'] is None or
                    data['typoutput'] is None):
                return True, make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        'External types require both input and output '
                        'conversion functions.'
                    )
                )
        return False, ''

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        is_error, errmsg = TypeView._checks_for_create_type(data)
        if is_error:
            return errmsg

        # To format privileges coming from client
        if 'typacl' in data and data['typacl'] is not None:
            data['typacl'] = parse_priv_to_db(data['typacl'], self.acl)

        data = self._convert_for_sql(data)

        try:
            if 'composite' in data and len(data['composite']) > 0:
                for each_type in data['composite']:
                    each_type = self.convert_length_precision_to_string(
                        each_type)
                    each_type['cltype'] = self._cltype_formatter(
                        each_type['type'])
                    each_type['hasSqrBracket'] = self.hasSqrBracket

            of_type = data.get('typtype', None)
            if of_type in ('N', 'V'):
                data = self.convert_length_precision_to_string(data)
                data['cltype'] = self._cltype_formatter(data['type'])
                data['hasSqrBracket'] = self.hasSqrBracket

            SQL = render_template("/".join([self.template_path,
                                            self._CREATE_SQL]),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if 'schema' in data:
                # we need scid to update in browser tree
                SQL = render_template("/".join([self.template_path,
                                                'get_scid.sql']),
                                      schema=data['schema'], conn=self.conn)
                status, scid = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=scid)

            # we need oid to add object in tree at browser
            SQL = render_template("/".join([self.template_path,
                                            self._OID_SQL]),
                                  scid=scid, data=data, conn=self.conn)
            status, tid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=tid)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    scid,
                    data['name'],
                    icon="icon-type"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, tid):
        """
        This function will updates the existing type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
        """

        data = request.form if request.form else json.loads(
            request.data
        )
        try:
            SQL, name = self.get_sql(gid, sid, data, scid, tid)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join([self.template_path,
                                            'get_scid.sql']),
                                  tid=tid, conn=self.conn)

            # Get updated schema oid
            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            other_node_info = {}
            if 'description' in data:
                other_node_info['description'] = data['description']

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    scid,
                    name,
                    icon=self.icon_str % self.node_type,
                    **other_node_info
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def _get_req_delete_data(self, tid, only_sql):
        """
        This function get data from request
        :param tid: Table Id
        :param only_sql: Flag for sql only.
        :return: data and cascade flag.
        """
        if tid is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [tid]}

        cascade = self._check_cascade_operation()

        return data, cascade

    @check_precondition
    def delete(self, gid, sid, did, scid, tid=None, only_sql=False):
        """
        This function will updates the existing type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
           only_sql: Return only sql if True
        """
        data, cascade = self._get_req_delete_data(tid, only_sql)

        try:
            for tid in data['ids']:
                sql = render_template(
                    "/".join([self.template_path,
                              self._PROPERTIES_SQL]),
                    scid=scid, tid=tid,
                    datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
                    show_system_objects=self.blueprint.show_system_objects
                )
                status, res = self.conn.execute_dict(sql)
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
                            'The specified type could not be found.\n'
                        )
                    )

                # Making copy of output for future use
                data = dict(res['rows'][0])

                sql = render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data,
                                      cascade=cascade,
                                      conn=self.conn)

                # Used for schema diff tool
                if only_sql:
                    return sql

                status, res = self.conn.execute_scalar(sql)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Type dropped"),
                data={
                    'id': tid,
                    'scid': scid
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, tid=None):
        """
        This function will generates modified sql for type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
        """
        req = request.args
        data = dict()

        # converting nested request data in proper json format
        for key, val in req.items():
            if key in ['composite', 'enum', 'seclabels', 'typacl']:
                data[key] = json.loads(val)
            else:
                data[key] = val

        try:
            sql, name = self.get_sql(gid, sid, data, scid, tid)
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
        except Exception as e:
            internal_server_error(errormsg=str(e))

    def _convert_for_sql(self, data):
        """
        This function will convert combobox values into
        readable format for sql & msql function
        """
        # Convert combobox value into readable format

        if 'typstorage' in data and data['typstorage'] is not None:
            if data['typstorage'] == 'p':
                data['typstorage'] = 'PLAIN'
            elif data['typstorage'] == 'e':
                data['typstorage'] = 'EXTERNAL'
            elif data['typstorage'] == 'm':
                data['typstorage'] = 'MAIN'
            elif data['typstorage'] == 'x':
                data['typstorage'] = 'EXTENDED'

        if 'typalign' in data and data['typalign'] is not None:
            if data['typalign'] == 'c':
                data['typalign'] = 'char'
            elif data['typalign'] == 's':
                data['typalign'] = 'int2'
            elif data['typalign'] == 'i':
                data['typalign'] = 'int4'
            elif data['typalign'] == 'd':
                data['typalign'] = 'double'

        return data

    def _get_new_sql(self, data, is_sql):
        """
        Used by get_sql internally for new type SQL
        :param data: input data
        :param is_sql: is sql
        :return: generated SQL
        """
        required_args = [
            'name',
            'typtype'
        ]

        definition_incomplete = "-- definition incomplete"
        for arg in required_args:
            if arg not in data:
                return definition_incomplete

            # Additional checks go here
            # If type is range then check if subtype is defined or not
            if data.get(arg, None) == 'r' and \
                    data.get('typname', None) is None:
                return definition_incomplete

            # If type is external then check if input/output
            # conversion function is defined
            if data.get(arg, None) == 'b' and (
                data.get('typinput', None) is None or
                    data.get('typoutput', None) is None):
                return definition_incomplete

        # Privileges
        if data.get('typacl', None):
            data['typacl'] = parse_priv_to_db(data['typacl'], self.acl)

        data = self._convert_for_sql(data)

        if len(data.get('composite', [])) > 0:
            for each_type in data['composite']:
                each_type = self.convert_length_precision_to_string(
                    each_type)
                each_type['cltype'] = self._cltype_formatter(
                    each_type['type'])
                each_type['hasSqrBracket'] = self.hasSqrBracket

        of_type = data.get('typtype', None)
        if of_type in ('N', 'V', 'A'):
            data = self.convert_length_precision_to_string(data)
            data['cltype'] = self._cltype_formatter(data['type'])
            data['hasSqrBracket'] = self.hasSqrBracket
            if of_type == 'V':
                data['typndims'] = data['maxsize']

        SQL = render_template("/".join([self.template_path,
                                        self._CREATE_SQL]),
                              data=data, conn=self.conn, is_sql=is_sql)

        return SQL, data['name']

    def get_sql(self, gid, sid, data, scid, tid=None, is_sql=False):
        """
        This function will generate sql from model data
        """
        if tid is None:
            return self._get_new_sql(data, is_sql)

        for key in ['added', 'changed', 'deleted']:
            if key in data.get('typacl', []):
                data['typacl'][key] = parse_priv_to_db(
                    data['typacl'][key], self.acl)

            for each_type in data.get('composite', {}).get(key, []):
                each_type = self. \
                    convert_length_precision_to_string(each_type)
                if 'type' in each_type:
                    each_type['cltype'] = self._cltype_formatter(
                        each_type['type'])
                    each_type['hasSqrBracket'] = self.hasSqrBracket

            of_type = data.get('typtype', None)
            if of_type in ('N', 'V', 'A'):
                data = self.convert_length_precision_to_string(data)
                data['cltype'] = self._cltype_formatter(data['type'])
                data['hasSqrBracket'] = self.hasSqrBracket

                if of_type == 'V':
                    data['typndims'] = data['maxsize']

        SQL = render_template(
            "/".join([self.template_path,
                      self._PROPERTIES_SQL]),
            scid=scid, tid=tid,
            datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
            show_system_objects=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the type in the database.")
            )

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        SQL = render_template("/".join([self.template_path,
                                        self._ACL_SQL]),
                              scid=scid, tid=tid)
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        old_data['typacl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            old_data[row['deftype']] = \
                (old_data.get(row['deftype'], None) or []).append(priv)

        # Calling function to check and additional properties if available
        old_data.update(self.additional_properties(old_data, tid))
        old_data = self._convert_for_sql(old_data)

        # If typname or collname is changed while comparing
        # two schemas then we need to drop type and recreate it
        render_sql = self._UPDATE_SQL
        if any([key in data for key in
                ['typtype', 'typname', 'collname', 'typinput', 'typoutput']]):
            render_sql = 'type_schema_diff.sql'

        SQL = render_template(
            "/".join([self.template_path, render_sql]),
            data=data, o_data=old_data, conn=self.conn
        )

        return SQL, old_data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, tid, **kwargs):
        """
        This function will generates reverse engineered sql for type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
           json_resp: True then return json response
        """
        json_resp = kwargs.get('json_resp', True)
        target_schema = kwargs.get('target_schema', None)

        SQL = render_template(
            "/".join([self.template_path,
                      self._PROPERTIES_SQL]),
            scid=scid, tid=tid,
            datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
            show_system_objects=self.blueprint.show_system_objects
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)
        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the type in the database.")
            )
        # Making copy of output for future use
        data = dict(res['rows'][0])
        if target_schema:
            data['schema'] = target_schema

        SQL = render_template("/".join([self.template_path, self._ACL_SQL]),
                              scid=scid, tid=tid)
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        data['typacl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in data:
                data[row['deftype']].append(priv)
            else:
                data[row['deftype']] = [priv]

        # Privileges
        if 'typacl' in data and data['typacl'] is not None:
            data['nspacl'] = parse_priv_to_db(data['typacl'], self.acl)

        # Calling function to check and additional properties if available
        data.update(self.additional_properties(data, tid))

        # We do not want to display table which has '-' value
        # setting them to None so that jinja avoid displaying them
        for k in data:
            if data[k] == '-':
                data[k] = None

        SQL, name = self.get_sql(gid, sid, data, scid, tid=None, is_sql=True)
        # Most probably this is due to error
        if not isinstance(SQL, str):
            return SQL
        # We are appending headers here for sql panel
        sql_header = "-- Type: {0}\n\n-- ".format(data['name'])

        sql_header += render_template("/".join([self.template_path,
                                                self._DELETE_SQL]),
                                      data=data, conn=self.conn)
        SQL = sql_header + '\n\n' + SQL

        if not json_resp:
            return SQL.strip('\n')

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, tid):
        """
        This function get the dependents and return ajax response
        for the type node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Type ID
        """
        dependents_result = self.get_dependents(
            self.conn, tid
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, tid):
        """
        This function get the dependencies and return ajax response
        for the type node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Type ID
        """
        dependencies_result = self.get_dependencies(
            self.conn, tid
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )

    @check_precondition
    def fetch_objects_to_compare(self, sid, did, scid):
        """
        This function will fetch the list of all the types for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :return:
        """
        res = dict()
        SQL = render_template("/".join([self.template_path,
                                        self._NODES_SQL]),
                              scid=scid,
                              datlastsysoid=self._DATABASE_LAST_SYSTEM_OID,
                              schema_diff=True)
        status, rset = self.conn.execute_2darray(SQL)
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
            sql, name = self.get_sql(gid=gid, sid=sid, scid=scid,
                                     data=data, tid=oid)
        else:
            if drop_sql:
                sql = self.delete(gid=gid, sid=sid, did=did,
                                  scid=scid, tid=oid, only_sql=True)
            elif target_schema:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, tid=oid,
                               target_schema=target_schema, json_resp=False)
            else:
                sql = self.sql(gid=gid, sid=sid, did=did, scid=scid, tid=oid,
                               json_resp=False)
        return sql


SchemaDiffRegistry(blueprint.node_type, TypeView)
TypeView.register_node_view(blueprint)
