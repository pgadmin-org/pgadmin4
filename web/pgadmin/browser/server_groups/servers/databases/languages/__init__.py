##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Implements Language Node"""

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as databases
from flask import render_template, make_response, request
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver

from config import PG_DEFAULT_DRIVER


class LanguageModule(CollectionNodeModule):
    """
    class LanguageModule(CollectionNodeModule)

        A module class for Language node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the LanguageModule and it's base module.

    * get_nodes(gid, sid, did)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for language, when any of the database node is
        initialized.
    """

    NODE_TYPE = 'language'
    COLLECTION_LABEL = gettext("Languages")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the LanguageModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        self.min_ver = None
        self.max_ver = None

        super(LanguageModule, self).__init__(*args, **kwargs)

    def get_nodes(self, gid, sid, did):
        """
        Method is used to generate the browser collection node

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database Id
        """
        yield self.generate_browser_collection_node(did)

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
        Load the module script for language, when any of the database nodes are initialized.

        Returns: node type of the server module.
        """
        return databases.DatabaseModule.NODE_TYPE


blueprint = LanguageModule(__name__)


class LanguageView(PGChildNodeView):
    """
    class LanguageView(PGChildNodeView)

        A view class for Language node derived from PGChildNodeView. This class is
        responsible for all the stuff related to view like updating language
        node, showing properties, showing sql in sql pane.

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the LanguageView and it's base view.

    * module_js()
      - This property defines (if javascript) exists for this node.
        Override this property for your own logic

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the language nodes within that collection.

    * nodes()
      - This function will used to create all the child node within that collection.
        Here it will create all the language node.

    * properties(gid, sid, did, lid)
      - This function will show the properties of the selected language node

    * update(gid, sid, did, lid)
      - This function will update the data for the selected language node

    * msql(gid, sid, did, lid)
      - This function is used to return modified SQL for the selected language node

    * get_sql(data, lid)
      - This function will generate sql from model data

    * get_functions(gid, sid, did)
      - This function returns the handler and inline functions for the selected language node

    * sql(gid, sid, did, lid):
      - This function will generate sql to show it in sql pane for the selected language node.

    * dependents(gid, sid, did, lid):
      - This function get the dependents and return ajax response for the language node.

    * dependencies(self, gid, sid, did, lid):
      - This function get the dependencies and return ajax response for the language node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'}
    ]
    ids = [
        {'type': 'int', 'id': 'lid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'put': 'update'},
            {'get': 'list'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
        'stats': [{'get': 'statistics'}],
        'dependency': [{'get': 'dependencies'}],
        'dependent': [{'get': 'dependents'}],
        'module.js': [{}, {}, {'get': 'module_js'}],
        'get_functions': [{}, {'get': 'get_functions'}]
    })

    def _init_(self, **kwargs):
        """
        Method is used to initialize the LanguageView and its base view.
        Initialize all the variables create/used dynamically like conn, template_path.

        Args:
            **kwargs:
        """
        self.conn = None
        self.template_path = None
        self.manager = None

        super(LanguageView, self).__init__(**kwargs)

    def module_js(self):
        """
        This property defines whether javascript exists for this node.
        """
        return make_response(
            render_template(
                "languages/js/languages.js",
                _=gettext
            ),
            200, {'Content-Type': 'application/x-javascript'}
        )

    def check_precondition(f):
        """
        This function will behave as a decorator which will check the
        database connection before running the view. It also attaches
        manager, conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,did
            self = args[0]
            self.driver = get_driver(PG_DEFAULT_DRIVER)
            self.manager = self.driver.connection_manager(kwargs['sid'])
            self.conn = self.manager.connection(did=kwargs['did'])

            # If DB not connected then return error to browser
            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost!"
                    )
                )

            ver = self.manager.version
            # we will set template path for sql scripts
            if ver >= 90300:
                self.template_path = 'languages/sql/9.3_plus'
            else:
                self.template_path = 'languages/sql/9.1_plus'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did):
        """
        This function is used to list all the language nodes within that collection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']))
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, did):
        """
        This function is used to create all the child nodes within the collection.
        Here it will create all the language nodes.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        res = []
        sql = render_template("/".join([self.template_path, 'properties.sql']))
        status, result = self.conn.execute_2darray(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    did,
                    row['name'],
                    icon="icon-language"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, lid):
        """
        This function will show the properties of the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']), lid=lid)
        status, res = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=res)

        sql = render_template("/".join([self.template_path, 'acl.sql']), lid=lid)
        status, result = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)

        # if no acl found then by default add public
        if res['rows'][0]['acl'] is None:
            res['rows'][0]['lanacl'] = dict()
            res['rows'][0]['lanacl']['grantee'] = 'PUBLIC'
            res['rows'][0]['lanacl']['grantor'] = res['rows'][0]['lanowner']
            res['rows'][0]['lanacl']['privileges'] = [{'privilege_type': 'U', 'privilege': True, 'with_grant': False}]
        else:
            for row in result['rows']:
                priv = parse_priv_from_db(row)
                if row['deftype'] in res['rows'][0]:
                    res['rows'][0][row['deftype']].append(priv)
                else:
                    res['rows'][0][row['deftype']] = [priv]

        seclabels = []
        if 'seclabels' in res['rows'][0] and res['rows'][0]['seclabels'] is not None:
            import re
            for sec in res['rows'][0]['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                seclabels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        res['rows'][0]['seclabels'] = seclabels


        return ajax_response(
            response=res['rows'][0],
            status=200
        )

    @check_precondition
    def update(self, gid, sid, did, lid):
        """
        This function will update the data for the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        sql = self.get_sql(data, lid)

        try:
            if sql and sql.strip('\n') and sql.strip(' '):
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                return make_json_response(
                    success=1,
                    info="Language updated",
                    data={
                        'id': lid,
                        'did': did,
                        'sid': sid,
                        'gid': gid
                    }
                )
            else:
                return make_json_response(
                    success=1,
                    info="Nothing to update",
                    data={
                        'id': lid,
                        'did': did,
                        'sid': sid,
                        'gid': gid
                    }
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, lid=None):
        """
        This function is used to return modified SQL for the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        data = {}
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        sql = self.get_sql(data, lid)
        if sql and sql.strip('\n') and sql.strip(' '):
            return make_json_response(
                data=sql,
                status=200
            )
        else:
            return make_json_response(
                data='-- Modified SQL --',
                status=200
            )

    def get_sql(self, data, lid=None):
        """
        This function will generate sql from model data.

        Args:
            data: Contains the data of the selected language node.
            lid: Language ID
        """
        required_args = [
            'name', 'lanowner', 'description'
        ]
        try:
            sql = ''
            if lid is not None:
                sql = render_template("/".join([self.template_path, 'properties.sql']), lid=lid)
                status, res = self.conn.execute_dict(sql)
                if not status:
                    return internal_server_error(errormsg=res)

                for key in ['lanacl']:
                    if key in data and data[key] is not None:
                        if 'added' in data[key]:
                            data[key]['added'] = parse_priv_to_db(data[key]['added'])
                        if 'changed' in data[key]:
                            data[key]['changed'] = parse_priv_to_db(data[key]['changed'])
                        if 'deleted' in data[key]:
                            data[key]['deleted'] = parse_priv_to_db(data[key]['deleted'])

                old_data = res['rows'][0]
                for arg in required_args:
                    if arg not in data:
                        data[arg] = old_data[arg]
                sql = render_template("/".join([self.template_path, 'update.sql']), data=data,
                                      o_data=old_data, conn=self.conn)
            return sql.strip('\n')
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def get_functions(self, gid, sid, did):
        """
        This function returns the handler and inline functions for the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
        """
        sql = render_template("/".join([self.template_path, 'functions.sql']))
        status, result = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)
        return make_json_response(
            data=result['rows'],
            status=200
        )

    @check_precondition
    def sql(self, gid, sid, did, lid):
        """
        This function will generate sql to show in the sql pane for the selected language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        sql = render_template("/".join([self.template_path, 'properties.sql']), lid=lid)
        status, res = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=res)

        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        sql = render_template("/".join([self.template_path, 'acl.sql']), lid=lid)
        status, result = self.conn.execute_dict(sql)
        if not status:
            return internal_server_error(errormsg=result)

        for row in result['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in old_data:
                old_data[row['deftype']].append(priv)
            else:
                old_data[row['deftype']] = [priv]

        seclabels = []
        if 'seclabels' in old_data and old_data['seclabels'] is not None:
            import re
            for sec in old_data['seclabels']:
                sec = re.search(r'([^=]+)=(.*$)', sec)
                seclabels.append({
                    'provider': sec.group(1),
                    'label': sec.group(2)
                })

        old_data['seclabels'] = seclabels
        sql = render_template("/".join([self.template_path, 'sqlpane.sql']), data=old_data, conn=self.conn)

        return ajax_response(response=sql.strip('\n'))

    @check_precondition
    def dependents(self, gid, sid, did, lid):
        """
        This function gets the dependents and returns an ajax response
        for the language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        dependents_result = self.get_dependents(self.conn, lid)
        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, lid):
        """
        This function gets the dependencies and returns an ajax response
        for the language node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            lid: Language ID
        """
        dependencies_result = self.get_dependencies(self.conn, lid)
        return ajax_response(
            response=dependencies_result,
            status=200
        )


LanguageView.register_node_view(blueprint)
