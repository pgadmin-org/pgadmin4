##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Synonym Node """

import simplejson as json
from functools import wraps

import pgadmin.browser.server_groups.servers.databases as database
from flask import render_template, request, jsonify
from flask_babel import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import SchemaChildModule
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import gone


class SynonymModule(SchemaChildModule):
    """
     class SynonymModule(CollectionNodeModule)

        A module class for Synonym node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Synonym and it's base module.

    * get_nodes(gid, sid, did, scid, syid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    NODE_TYPE = 'synonym'
    COLLECTION_LABEL = gettext("Synonyms")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the SynonymModule and it's base module.

        Args:
            *args:
            **kwargs:
        """

        super(SynonymModule, self).__init__(*args, **kwargs)
        self.min_ver = 90100
        self.max_ver = None
        self.server_type = ['ppas']

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
        return False


blueprint = SynonymModule(__name__)


class SynonymView(PGChildNodeView):
    """
    This class is responsible for generating routes for Synonym node

    Methods:
    -------
    * __init__(**kwargs)
      - Method is used to initialize the SynonymView and it's base view.

    * check_precondition()
      - This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self

    * list()
      - This function is used to list all the Synonym nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Synonym node.

    * properties(gid, sid, did, scid, syid)
      - This function will show the properties of the selected Synonym node

    * create(gid, sid, did, scid)
      - This function will create the new Synonym object

    * update(gid, sid, did, scid, syid)
      - This function will update the data for the selected Synonym node

    * delete(self, gid, sid, scid, syid):
      - This function will drop the Synonym object

    * msql(gid, sid, did, scid, syid)
      - This function is used to return modified SQL for the selected
        Synonym node

    * get_sql(data, scid, syid)
      - This function will generate sql from model data

    * sql(gid, sid, did, scid):
      - This function will generate sql to show it in sql pane for the
        selected Synonym node.

    * dependency(gid, sid, did, scid):
      - This function will generate dependency list show it in dependency
        pane for the selected Synonym node.

    * dependent(gid, sid, did, scid):
      - This function will generate dependent list to show it in dependent
        pane for the selected Synonym node.
    """

    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'},
        {'type': 'int', 'id': 'did'},
        {'type': 'int', 'id': 'scid'}
    ]
    # If URL has an identifier containing slash character '/'
    # into the URI, then set param type to path. Because if
    # param name contains '/' in syid, it gets confused and
    # wrong url is generated.
    # Reference:- http://flask.pocoo.org/snippets/76/
    ids = [
        {'type': 'path', 'id': 'syid'}
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
        'get_target_objects': [{'get': 'get_target_objects'},
                               {'get': 'get_target_objects'}]
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
            self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection(did=kwargs['did'])
            # If DB not connected then return error to browser
            if not self.conn.connected():
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost!"
                    )
                )

            # we will set template path for sql scripts
            self.template_path = 'synonym/sql/'
            self.template_path += '9.5_plus' if self.manager.version >= 90500 \
                else '9.1_plus'

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid, did, scid):
        """
        This function is used to list all the synonym nodes within that collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available synonym nodes
        """

        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']), scid=scid)
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
        This function will used to create all the child node within that collection.
        Here it will create all the synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID

        Returns:
            JSON of available synonym child nodes
        """

        res = []
        SQL = render_template("/".join([self.template_path,
                                        'nodes.sql']), scid=scid)
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['name'],
                    scid,
                    row['name'],
                    icon="icon-synonym"
                ))

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def node(self, gid, sid, did, scid, syid=None):
        """
        Return Synonym node to generate node

        Args:
            gid: Server Group Id
            sid: Server Id
            did: Database Id
            scid: Schema Id
            syid: Synonym id
        """

        sql = render_template(
            "/".join([self.template_path, 'properties.sql']),
            syid=syid, scid=scid
        )
        status, rset = self.conn.execute_2darray(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(
                gettext("""Could not find the Synonym node.""")
            )

        for row in rset['rows']:
            return make_json_response(
                data=self.blueprint.generate_browser_node(
                    row['name'],
                    scid,
                    row['name'],
                    icon="icon-%s" % self.node_type
                ),
                status=200
            )

    @check_precondition
    def get_target_objects(self, gid, sid, did, scid, syid=None):
        """
        This function will provide list of objects as per user selection.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            syid: Synonym ID

        Returns:
            List of objects
        """
        res = []
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        sql = render_template("/".join([self.template_path,
                                        'get_objects.sql']),
                              trgTyp=data['trgTyp'],
                              trgSchema=data['trgSchema'])
        status, rset = self.conn.execute_dict(sql)

        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append({'label': row['name'],
                        'value': row['name']})

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def properties(self, gid, sid, did, scid, syid):
        """
        This function will show the properties of the selected synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            syid: Synonym ID

        Returns:
            JSON of selected synonym node
        """

        try:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, syid=syid)
            status, res = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) > 0:
                return ajax_response(
                    response=res['rows'][0],
                    status=200
                )
            else:
                return make_json_response(
                    success=410,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified synonym could not be found.\n'
                    )
                )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def create(self, gid, sid, did, scid):
        """
        This function will creates new the synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
        """

        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        required_args = [
            'name', 'targettype', 'synobjschema', 'synobjname'
        ]

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter (%s)." % arg
                    )
                )

        try:
            SQL = render_template("/".join([self.template_path,
                                            'create.sql']),
                                  data=data, conn=self.conn, comment=False)

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            # Find parent oid to add properly in tree browser
            SQL = render_template("/".join([self.template_path,
                                            'get_parent_oid.sql']),
                                  data=data, conn=self.conn)
            status, parent_id = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    data['name'],
                    int(parent_id),
                    data['name'],
                    icon="icon-synonym"
                )
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, did, scid, syid):
        """
        This function will delete existing the synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
        """

        # Below will decide if it's simple drop or drop with cascade call

        try:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, syid=syid)

            status, res = self.conn.execute_dict(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) > 0:
                data = res['rows'][0]
            else:
                return make_json_response(
                    success=0,
                    errormsg=gettext(
                        'Error: Object not found.'
                    ),
                    info=gettext(
                        'The specified synonym could not be found.\n'
                    )
                )

            SQL = render_template("/".join([self.template_path,
                                            'delete.sql']),
                                  data=data,
                                  conn=self.conn)
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Synonym dropped"),
                data={
                    'id': syid,
                    'scid': scid,
                    'did': did
                }
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, did, scid, syid):
        """
        This function will updates existing the synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )
        SQL = self.get_sql(gid, sid, data, scid, syid)
        try:
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    syid,
                    scid,
                    syid,
                    icon="icon-synonym"
                )
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, did, scid, syid=None):
        """
        This function will generates modified sql for synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except ValueError:
                data[k] = v

        try:
            SQL = self.get_sql(gid, sid, data, scid, syid)
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                return make_json_response(
                    data=SQL,
                    status=200
                )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def get_sql(self, gid, sid, data, scid, syid=None):
        """
        This function will genrate sql from model data
        """
        if syid is not None:
            SQL = render_template("/".join([self.template_path,
                                            'properties.sql']),
                                  scid=scid, syid=syid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            old_data = res['rows'][0]
            # If target schema/object is not present then take it from
            # old data, it means it does not changed
            if 'synobjschema' not in data:
                data['synobjschema'] = old_data['synobjschema']
            if 'synobjname' not in data:
                data['synobjname'] = old_data['synobjname']

            SQL = render_template(
                "/".join([self.template_path, 'update.sql']),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            required_args = [
                'name', 'targettype', 'synobjschema', 'synobjname'
            ]

            for arg in required_args:
                if arg not in data:
                    return "-- missing definition"

            SQL = render_template("/".join([self.template_path,
                                            'create.sql']), comment=False,
                                  data=data, conn=self.conn)
        return SQL.strip('\n')

    @check_precondition
    def sql(self, gid, sid, did, scid, syid):
        """
        This function will generates reverse engineered sql for synonym object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           syid: Synonym ID
        """
        SQL = render_template("/".join([self.template_path,
                                        'properties.sql']),
                              scid=scid, syid=syid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) > 0:
           data = res['rows'][0]
        else:
            return make_json_response(
                success=0,
                errormsg=gettext(
                    'Error: Object not found.'
                ),
                info=gettext(
                    'The specified synonym could not be found.\n'
                )
            )

        SQL = render_template("/".join([self.template_path,
                                        'create.sql']),
                              data=data, conn=self.conn, comment=True)

        return ajax_response(response=SQL)

    @check_precondition
    def dependents(self, gid, sid, did, scid, syid):
        """
        This function get the dependents and return ajax response
        for the Synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            syid: Synonym ID
        """
        dependents_result = self.get_dependents(
            self.conn, syid, where="WHERE dep.objid=0::oid"
        )

        return ajax_response(
            response=dependents_result,
            status=200
        )

    @check_precondition
    def dependencies(self, gid, sid, did, scid, syid):
        """
        This function get the dependencies and return ajax response
        for the Synonym node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            syid: Synonym ID
        """
        dependencies_result = self.get_dependencies(
            self.conn, syid, where="WHERE dep.objid=0::oid"
        )

        return ajax_response(
            response=dependencies_result,
            status=200
        )


SynonymView.register_node_view(blueprint)
