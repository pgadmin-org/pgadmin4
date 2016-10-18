##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Type Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule, DataTypeReader
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, internal_server_error, \
    make_response as ajax_response
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone


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

    NODE_TYPE = 'type'
    COLLECTION_LABEL = gettext("Types")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the TypeModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(TypeModule, self).__init__(*args, **kwargs)
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
        Load the module script for database, when any of the database node is
        initialized.
        """
        return database.DatabaseModule.NODE_TYPE

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return False


blueprint = TypeModule(__name__)


class TypeView(PGChildNodeView, DataTypeReader):
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
    """

    node_type = blueprint.node_type

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
        'get_types': [{'get': 'get_types'}, {'get': 'get_types'}],
        'get_stypes': [{'get': 'get_subtypes'}, {'get': 'get_subtypes'}],
        'get_subopclass': [{'get': 'get_subtype_opclass'},
                           {'get': 'get_subtype_opclass'}],
        'get_stypediff': [{'get': 'get_subtype_diff'}, {'get': 'get_subtype_diff'}],
        'get_canonical': [{'get': 'get_canonical'}, {'get': 'get_canonical'}],
        'get_collations': [{'get': 'get_collations'}, {'get': 'get_collations'}],
        'get_external_functions': [{'get': 'get_external_functions_list'},
                                   {'get': 'get_external_functions_list'}]
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
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])

            # We need datlastsysoid to check if current type is system type
            self.datlastsysoid = self.manager.db_info[
                kwargs['did']
            ]['datlastsysoid'] if self.manager.db_info is not None and \
                kwargs['did'] in self.manager.db_info else 0

            # Declare allows acl on type
            self.acl = ['U']

            # we will set template path for sql scripts
            self.template_path = 'type/sql/9.1_plus'

            return f(*args, **kwargs)
        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the type nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Type ID

        Returns:
            JSON of available type nodes
        """

        SQL = render_template("/".join([self.template_path, 'properties.sql']),
                              scid=scid,
                              datlastsysoid=self.datlastsysoid,
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
        This function will used to create all the child node within that collection.
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

        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']),
                              scid=scid,
                              tid=tid,
                              show_system_objects=self.blueprint.show_system_objects)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(gettext("""Could not find the type in the table."""))

        res = self.blueprint.generate_browser_node(
                rset['rows'][0]['oid'],
                scid,
                rset['rows'][0]['name'],
                icon="icon-%s" % self.node_type
            )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did, scid):
        """
        This function will used to create all the child node within that collection.
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
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']), scid=scid,
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
                    icon="icon-%s" % self.node_type
                ))

        return make_json_response(
            data=res,
            status=200
        )

    def additional_properties(self, copy_dict, tid):
        """
        We will use this function to add additional properties according to type

        Returns:
            additional properties for type like range/composite/enum

        """
        # Fetching type of type
        of_type = copy_dict['typtype']
        res = dict()
        # If type is of Composite then we need to add members list in our output
        if of_type == 'c':
            SQL = render_template("/".join([self.template_path,
                                            'additional_properties.sql']),
                                  type='c',
                                  typrelid=copy_dict['typrelid'])
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # To display in properties
            properties_list = []
            # To display in composite collection grid
            composite_lst = []

            for row in rset['rows']:
                # We will fetch Full type name
                fulltype = self.get_full_type(
                    row['collnspname'], row['typname'],
                    row['isdup'], row['attndims'], row['atttypmod']
                )

                typelist = ' '.join([row['attname'], fulltype])
                if not row['collname'] or (row['collname'] == 'default'
                                           and row['collnspname'] == 'pg_catalog'):
                    full_collate = ''
                    collate = ''
                else:
                    full_collate = get_driver(PG_DEFAULT_DRIVER).qtIdent(
                        self.conn, row['collnspname'], row['collname'])
                    collate = ' COLLATE ' + full_collate
                typelist += collate
                properties_list.append(typelist)

                # Below logic will allow us to split length, precision from type name for grid
                import re
                # If we have length & precision both
                matchObj = re.search(r'(\d+),(\d+)', fulltype)
                if matchObj:
                    t_len = matchObj.group(1)
                    t_prec = matchObj.group(2)
                else:
                    # If we have length only
                    matchObj = re.search(r'(\d+)', fulltype)
                    if matchObj:
                        t_len = matchObj.group(1)
                        t_prec = None
                    else:
                        t_len = None
                        t_prec = None

                is_tlength = True if t_len else False
                is_precision = True if t_prec else False

                composite_lst.append({
                    'attnum': row['attnum'], 'member_name': row['attname'], 'type': row['typname'],
                    'collation': full_collate,
                    'tlength': t_len, 'precision': t_prec,
                    'is_tlength': is_tlength, 'is_precision': is_precision})

            # Adding both results
            res['member_list'] = ', '.join(properties_list)
            res['composite'] = composite_lst

        # If type is of ENUM then we need to add labels in our output
        if of_type == 'e':
            SQL = render_template("/".join([self.template_path,
                                            'additional_properties.sql']),
                                  type='e', tid=tid)
            status, rset = self.conn.execute_2darray(SQL)
            if not status:
                return internal_server_error(errormsg=res)
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

        # If type is of Range then we need to add collation,subtype etc in our output
        if of_type == 'r':
            SQL = render_template("/".join([self.template_path,
                                            'additional_properties.sql']),
                                  type='r', tid=tid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            range_dict = dict(res['rows'][0])
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

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid,
                              show_system_objects=self.blueprint.show_system_objects
                              )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(gettext("""Could not find the type in the table."""))

        # Making copy of output for future use
        copy_dict = dict(res['rows'][0])

        # We need to parse & convert ACL coming from database to json format
        SQL = render_template("/".join([self.template_path, 'acl.sql']),
                              scid=scid, tid=tid)
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

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

        return ajax_response(
            response=copy_dict,
            status=200
        )

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
                # Attaching properties for precession
                # & length validation for current type
                precision = False
                length = False
                min_val = 0
                max_val = 0

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

    @check_precondition
    def get_subtypes(self, gid, sid, did, scid, tid=None):
        """
        This function will return list of subtypes available
        as AJAX response.
        """
        res = [{'label': '', 'value': ''}]
        try:
            SQL = render_template("/".join([self.template_path,
                                            'get_subtypes.sql']),
                                  subtype=True)
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
                                            'get_subtypes.sql']),
                                  subtype_opclass=True, data=data)
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
                                            'get_subtypes.sql']),
                                  get_opcintype=True, data=data)
            if SQL:
                status, opcintype = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=opcintype)
                SQL = render_template("/".join([self.template_path,
                                                'get_subtypes.sql']),
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
                                            'get_subtypes.sql']),
                                  getoid=True, data=data)
            if SQL:
                status, oid = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=oid)
                # If oid is None then do not run SQL
                if oid is None:
                    canonical = False

            SQL = render_template("/".join([self.template_path,
                                            'get_subtypes.sql']),
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
            SQL = render_template("/".join([self.template_path,
                                            'get_external_functions.sql']),
                                  extfunc=True)
            if SQL:
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['func'], 'value': row['func'],
                         'cbtype': 'all'})

            # The SQL generated below will populate TypModeIN combo box
            SQL = render_template("/".join([self.template_path,
                                            'get_external_functions.sql']),
                                  typemodin=True)
            if SQL:
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['func'], 'value': row['func'],
                         'cbtype': 'typmodin'})

            # The SQL generated below will populate TypModeIN combo box
            SQL = render_template("/".join([self.template_path,
                                            'get_external_functions.sql']),
                                  typemodout=True)
            if SQL:
                status, rset = self.conn.execute_2darray(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

                for row in rset['rows']:
                    res.append(
                        {'label': row['func'], 'value': row['func'],
                         'cbtype': 'typmodout'})

            return make_json_response(
                data=res,
                status=200
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

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
            request.data, encoding='utf-8'
        )
        required_args = {
            'name': 'Name',
            'typtype': 'Type'
        }

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." %
                        required_args[arg]
                    )
                )
            # Additional checks goes here
            # If type is composite then check if it has two members
            if data and data[arg] == 'c':
                if len(data['composite']) < 2:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Composite types require at least two members.'
                        )
                    )
            # If type is enum then check if it has minimum one label
            if data and data[arg] == 'e':
                if len(data['enum']) < 1:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Enumeration types require at least one label.'
                        )
                    )
            # If type is range then check if subtype is defined or not
            if data and data[arg] == 'r':
                if data['typname'] is None:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'Subtype must be defined for range types.'
                        )
                    )
            # If type is external then check if input/output
            # conversion function is defined
            if data and data[arg] == 'b':
                if data['typinput'] is None or \
                                data['typoutput'] is None:
                    return make_json_response(
                        status=410,
                        success=0,
                        errormsg=gettext(
                            'External types require both Input and Output conversion functions.'
                        )
                    )

        # To format privileges coming from client
        if 'typacl' in data and data['typacl'] is not None:
            data['typacl'] = parse_priv_to_db(data['typacl'], self.acl)

        data = self._convert_for_sql(data)

        try:
            SQL = render_template("/".join([self.template_path, 'create.sql']),
                                  data=data, conn=self.conn)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if 'schema' in data:
                # we need scid to update in browser tree
                SQL = render_template("/".join([self.template_path,
                                      'get_scid.sql']), schema=data['schema'])
                status, scid = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=scid)

            # we need oid to to add object in tree at browser
            SQL = render_template("/".join([self.template_path,
                                            'get_oid.sql']),
                                  scid=scid, data=data)
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
        This function will updates existing the type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        try:
            SQL, name = self.get_sql(gid, sid, data, scid, tid)
            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            SQL = render_template("/".join([self.template_path,
                                  'get_scid.sql']), tid=tid)

            # Get updated schema oid
            status, scid = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    tid,
                    scid,
                    name,
                    icon="icon-%s" % self.node_type
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, tid):
        """
        This function will updates existing the type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
        """

        # Below will decide if it's simple drop or drop with cascade call
        if self.cmd == 'delete':
            # This is a cascade operation
            cascade = True
        else:
            cascade = False

        try:

            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, tid=tid,
                                  datlastsysoid=self.datlastsysoid,
                                  show_system_objects=self.blueprint.show_system_objects
                                  )
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
                        'The specified type could not be found.\n'
                    )
                )

            # Making copy of output for future use
            data = dict(res['rows'][0])

            SQL = render_template("/".join([self.template_path, 'delete.sql']),
                                  data=data, cascade=cascade, conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
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
                data[key] = json.loads(val, encoding='utf-8')
            else:
                data[key] = val

        try:
            sql, name = self.get_sql(gid, sid, data, scid, tid)
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

    def get_sql(self, gid, sid, data, scid, tid=None):
        """
        This function will genrate sql from model data
        """
        if tid is not None:

            for key in ['typacl']:
                if key in data and data[key] is not None:
                    if 'added' in data[key]:
                        data[key]['added'] = parse_priv_to_db(data[key]['added'], self.acl)
                    if 'changed' in data[key]:
                        data[key]['changed'] = parse_priv_to_db(data[key]['changed'], self.acl)
                    if 'deleted' in data[key]:
                        data[key]['deleted'] = parse_priv_to_db(data[key]['deleted'], self.acl)

            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, tid=tid,
                                  datlastsysoid=self.datlastsysoid,
                                  show_system_objects=self.blueprint.show_system_objects
                                  )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Making copy of output for future use
            old_data = dict(res['rows'][0])

            SQL = render_template("/".join([self.template_path, 'acl.sql']),
                                  scid=scid, tid=tid)
            status, acl = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=acl)

            # We will set get privileges from acl sql so we don't need
            # it from properties sql
            old_data['typacl'] = []

            for row in acl['rows']:
                priv = parse_priv_from_db(row)
                if row['deftype'] in old_data:
                    old_data[row['deftype']].append(priv)
                else:
                    old_data[row['deftype']] = [priv]

            # Calling function to check and additional properties if available
            old_data.update(self.additional_properties(old_data, tid))
            old_data = self._convert_for_sql(old_data)

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            required_args = [
                'name',
                'typtype'
            ]

            for arg in required_args:
                if arg not in data:
                    return " --definition incomplete"

            # Privileges
            if 'typacl' in data and data['typacl'] is not None:
                data['typacl'] = parse_priv_to_db(data['typacl'], self.acl)
            data = self._convert_for_sql(data)
            SQL = render_template("/".join([self.template_path,
                                            'create.sql']),
                                  data=data, conn=self.conn)

        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, did, scid, tid):
        """
        This function will generates reverse engineered sql for type object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Type ID
        """
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid,
                              show_system_objects=self.blueprint.show_system_objects
                              )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        # Making copy of output for future use
        data = dict(res['rows'][0])

        SQL = render_template("/".join([self.template_path, 'acl.sql']),
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

        SQL, name = self.get_sql(gid, sid, data, scid, tid=None)

        # We are appending headers here for sql panel
        sql_header = "-- Type: {0}\n\n-- ".format(data['name'])
        if hasattr(str, 'decode'):
            sql_header = sql_header.decode('utf-8')

        sql_header += render_template("/".join([self.template_path,
                                                'delete.sql']),
                                      data=data, conn=self.conn)
        SQL = sql_header + '\n\n' + SQL

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


TypeView.register_node_view(blueprint)
