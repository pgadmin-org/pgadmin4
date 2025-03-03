# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


"""Implements Directories for EPAS 13 and above"""

import json
import re
from functools import wraps

from pgadmin.browser.server_groups import servers
from flask import render_template, request, jsonify, current_app
from flask_babel import gettext
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.browser.server_groups.servers.utils import parse_priv_from_db, \
    parse_priv_to_db
from pgadmin.browser.utils import PGChildNodeView
from pgadmin.utils.ajax import make_json_response, \
    make_response as ajax_response, internal_server_error, gone
from pgadmin.utils.ajax import precondition_required
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


class DirectoryModule(CollectionNodeModule):
    """
    Module for managing directories.
    """
    _NODE_TYPE = 'directory'
    _COLLECTION_LABEL = gettext("Directories")

    def __init__(self, import_name, **kwargs):
        super().__init__(import_name, **kwargs)

        self.min_ver = 130000
        self.max_ver = None
        self.server_type = ['ppas']

    def get_nodes(self, gid, sid):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(sid)

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return servers.ServerModule.node_type

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False

    @property
    def node_inode(self):
        return False


# Register the module as a Blueprint
blueprint = DirectoryModule(__name__)


class DirectoryView(PGChildNodeView):
    node_type = blueprint.node_type

    parent_ids = [
        {'type': 'int', 'id': 'gid'},
        {'type': 'int', 'id': 'sid'}
    ]
    ids = [
        {'type': 'int', 'id': 'dr_id'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'nodes': [{'get': 'node'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {'get': 'msql'}],
    })

    def check_precondition(f):
        """
        This function will behave as a decorator which will checks
        database connection before running view, it will also attaches
        manager,conn & template_path properties to self
        """

        @wraps(f)
        def wrap(*args, **kwargs):
            # Here args[0] will hold self & kwargs will hold gid,sid,dr_id
            self = args[0]
            self.manager = get_driver(
                PG_DEFAULT_DRIVER
            ).connection_manager(
                kwargs['sid']
            )
            self.conn = self.manager.connection()
            self.datistemplate = False
            if (
                self.manager.db_info is not None and
                self.manager.did in self.manager.db_info and
                'datistemplate' in self.manager.db_info[self.manager.did]
            ):
                self.datistemplate = self.manager.db_info[
                    self.manager.did]['datistemplate']

            # If DB not connected then return error to browser
            if not self.conn.connected():
                current_app.logger.warning(
                    "Connection to the server has been lost."
                )
                return precondition_required(
                    gettext(
                        "Connection to the server has been lost."
                    )
                )

            self.template_path = 'directories/sql/#{0}#'.format(
                self.manager.version
            )
            current_app.logger.debug(
                "Using the template path: %s", self.template_path
            )
            # Allowed ACL on directory
            self.acl = ['W', 'R']

            return f(*args, **kwargs)

        return wrap

    @check_precondition
    def list(self, gid, sid):
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @check_precondition
    def node(self, gid, sid, dr_id):
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            dr_id=dr_id, conn=self.conn
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        if len(rset['rows']) == 0:
            return gone(gettext("""Could not find the directory."""))

        res = self.blueprint.generate_browser_node(
            rset['rows'][0]['oid'],
            sid,
            rset['rows'][0]['name'],
            icon="icon-directory"
        )

        return make_json_response(
            data=res,
            status=200
        )

    @check_precondition
    def nodes(self, gid, sid, dr_id=None):
        res = []
        SQL = render_template(
            "/".join([self.template_path, self._NODES_SQL]),
            dr_id=dr_id, conn=self.conn
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        for row in rset['rows']:
            res.append(
                self.blueprint.generate_browser_node(
                    row['oid'],
                    sid,
                    row['name'],
                    icon="icon-directory",
                ))

        return make_json_response(
            data=res,
            status=200
        )

    def _formatter(self, data, dr_id=None):
        """
        It will return formatted output of collections
        """
        # We need to parse & convert ACL coming from database to json format
        SQL = render_template(
            "/".join([self.template_path, self._ACL_SQL]),
            dr_id=dr_id, conn=self.conn
        )
        status, acl = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=acl)

        # We will set get privileges from acl sql so we don't need
        # it from properties sql
        data['diracl'] = []

        for row in acl['rows']:
            priv = parse_priv_from_db(row)
            if row['deftype'] in data:
                data[row['deftype']].append(priv)
            else:
                data[row['deftype']] = [priv]

        return data

    @check_precondition
    def properties(self, gid, sid, dr_id):
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            dr_id=dr_id, conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("""Could not find the directory information.""")
            )

        # Making copy of output for future use
        copy_data = dict(res['rows'][0])
        copy_data = self._formatter(copy_data, dr_id)

        return ajax_response(
            response=copy_data,
            status=200
        )

    @check_precondition
    def create(self, gid, sid):
        """
        This function will create the new directory object.
        """
        required_args = {
            'name': 'Name',
            'path': 'Location'
        }

        data = request.form if request.form else json.loads(
            request.data
        )

        for arg in required_args:
            if arg not in data:
                return make_json_response(
                    status=410,
                    success=0,
                    errormsg=gettext(
                        "Could not find the required parameter ({})."
                    ).format(arg)
                )

        # To format privileges coming from client
        if 'diracl' in data:
            data['diracl'] = parse_priv_to_db(data['diracl'], self.acl)

        try:
            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn
            )

            status, res = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=res)

            # To fetch the oid of newly created directory
            SQL = render_template(
                "/".join([self.template_path, self._ALTER_SQL]),
                directory=data['name'], conn=self.conn
            )

            status, dr_id = self.conn.execute_scalar(SQL)

            if not status:
                return internal_server_error(errormsg=dr_id)

            SQL = render_template(
                "/".join([self.template_path, self._ALTER_SQL]),
                data=data, conn=self.conn
            )

            # Checking if we are not executing empty query
            if SQL and SQL.strip('\n') and SQL.strip(' '):
                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return jsonify(
                        node=self.blueprint.generate_browser_node(
                            dr_id,
                            sid,
                            data['name'],
                            icon="icon-directory"
                        ),
                        success=0,
                        errormsg=gettext(
                            'Directory created successfully.'
                        ),
                        info=gettext(
                            res
                        )
                    )

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    dr_id,
                    sid,
                    data['name'],
                    icon="icon-directory",
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def update(self, gid, sid, dr_id):
        """
        This function will update directory object
        """
        data = request.form if request.form else json.loads(
            request.data
        )

        try:
            SQL, name = self.get_sql(gid, sid, data, dr_id)
            # Most probably this is due to error
            if not isinstance(SQL, str):
                return SQL

            SQL = SQL.strip('\n').strip(' ')
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return jsonify(
                node=self.blueprint.generate_browser_node(
                    dr_id,
                    sid,
                    name,
                    icon="icon-%s" % self.node_type,
                )
            )
        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def delete(self, gid, sid, dr_id=None):
        """
        This function will drop the directory object
        """
        if dr_id is None:
            data = request.form if request.form else json.loads(
                request.data
            )
        else:
            data = {'ids': [dr_id]}

        try:
            for dr_id in data['ids']:
                SQL = render_template(
                    "/".join([self.template_path, self._NODES_SQL]),
                    dr_id=dr_id, conn=self.conn
                )
                # Get name for directory from dr_id
                status, rset = self.conn.execute_dict(SQL)

                if not status:
                    return internal_server_error(errormsg=rset)

                if not rset['rows']:
                    return make_json_response(
                        success=0,
                        errormsg=gettext(
                            'Error: Object not found.'
                        ),
                        info=gettext(
                            'The specified directory could not be found.\n'
                        )
                    )

                # drop directory
                SQL = render_template(
                    "/".join([self.template_path, self._DELETE_SQL]),
                    dr_name=(rset['rows'][0])['name'], conn=self.conn
                )

                status, res = self.conn.execute_scalar(SQL)
                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Directory dropped")
            )

        except Exception as e:
            current_app.logger.exception(e)
            return internal_server_error(errormsg=str(e))

    @check_precondition
    def msql(self, gid, sid, dr_id=None):
        """
        This function to return modified SQL
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v)
            except ValueError:
                data[k] = v

        sql, _ = self.get_sql(gid, sid, data, dr_id)
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

    def _format_privilege_data(self, data):
        for key in ['diracl']:
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

    def get_sql(self, gid, sid, data, dr_id=None):
        """
        This function will generate sql from model/properties data
        """
        required_args = [
            'name'
        ]

        if dr_id is not None:
            SQL = render_template(
                "/".join([self.template_path, self._PROPERTIES_SQL]),
                dr_id=dr_id, conn=self.conn
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return gone(
                    gettext("Could not find the directory on the server.")
                )

            # Making copy of output for further processing
            old_data = dict(res['rows'][0])
            old_data = self._formatter(old_data, dr_id)

            # To format privileges data coming from client
            self._format_privilege_data(data)

            # If name is not present with in update data then copy it
            # from old data
            for arg in required_args:
                if arg not in data:
                    data[arg] = old_data[arg]

            SQL = render_template(
                "/".join([self.template_path, self._UPDATE_SQL]),
                data=data, o_data=old_data, conn=self.conn
            )
        else:
            # To format privileges coming from client
            if 'diracl' in data:
                data['diracl'] = parse_priv_to_db(data['diracl'], self.acl)
            # If the request for new object which do not have dr_id
            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=data, conn=self.conn
            )
            SQL += "\n"
            SQL += render_template(
                "/".join([self.template_path, self._ALTER_SQL]),
                data=data, conn=self.conn
            )
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        return SQL, data['name'] if 'name' in data else old_data['name']

    @check_precondition
    def sql(self, gid, sid, dr_id):
        """
        This function will generate sql for sql panel
        """
        SQL = render_template(
            "/".join([self.template_path, self._PROPERTIES_SQL]),
            dr_id=dr_id, conn=self.conn
        )
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
            return gone(
                gettext("Could not find the directory on the server.")
            )
        # Making copy of output for future use
        old_data = dict(res['rows'][0])

        old_data = self._formatter(old_data, dr_id)

        # To format privileges
        if 'diracl' in old_data:
            old_data['diracl'] = parse_priv_to_db(old_data['diracl'], self.acl)

        SQL = ''
        # We are not showing create sql for system directory.
        if not old_data['name'].startswith('pg_'):
            SQL = render_template(
                "/".join([self.template_path, self._CREATE_SQL]),
                data=old_data, conn=self.conn
            )
            SQL += "\n"
        SQL += render_template(
            "/".join([self.template_path, self._ALTER_SQL]),
            data=old_data, conn=self.conn
        )

        sql_header = """
-- Directory: {0}

-- DROP DIRECTORY IF EXISTS {0};

""".format(old_data['name'])

        SQL = sql_header + SQL
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        return ajax_response(response=SQL.strip('\n'))


# Register the view with the blueprint
DirectoryView.register_node_view(blueprint)
