##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Partitions Node """

import re
import simplejson as json
import pgadmin.browser.server_groups.servers.databases.schemas as schema
from flask import render_template, request
from flask_babelex import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader, VacuumSettings
from pgadmin.utils.ajax import internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.browser.server_groups.servers.databases.schemas.tables.utils \
    import BaseTableView
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.utils.ajax import make_json_response, precondition_required
from config import PG_DEFAULT_DRIVER
from pgadmin.browser.utils import PGChildModule


def backend_supported(module, manager, **kwargs):
    if 'tid' in kwargs and CollectionNodeModule.BackendSupported(
            module, manager, **kwargs):
        conn = manager.connection(did=kwargs['did'])

        template_path = 'partition/sql/{0}/#{0}#{1}#'.format(
            manager.server_type, manager.version
        )
        SQL = render_template("/".join(
            [template_path, 'backend_support.sql']), tid=kwargs['tid'])
        status, res = conn.execute_scalar(SQL)

        # check if any errors
        if not status:
            return internal_server_error(errormsg=res)

        return res


class PartitionsModule(CollectionNodeModule):
    """
     class PartitionsModule(CollectionNodeModule)

        A module class for Partition node derived from CollectionNodeModule.

    Methods:
    -------
    * __init__(*args, **kwargs)
      - Method is used to initialize the Partition and it's base module.

    * get_nodes(gid, sid, did, scid, tid)
      - Method is used to generate the browser collection node.

    * node_inode()
      - Method is overridden from its base class to make the node as leaf node.

    * script_load()
      - Load the module script for schema, when any of the server node is
        initialized.
    """

    NODE_TYPE = 'partition'
    COLLECTION_LABEL = gettext("Partitions")

    def __init__(self, *args, **kwargs):
        """
        Method is used to initialize the PartitionsModule and it's base module.

        Args:
            *args:
            **kwargs:
        """
        super(PartitionsModule, self).__init__(*args, **kwargs)
        self.min_ver = 100000
        self.max_ver = None
        self.min_ppasver = 100000
        self.max_ppasver = None

    def get_nodes(self, gid, sid, did, scid, **kwargs):
        """
        Generate the collection node
        """
        yield self.generate_browser_collection_node(kwargs['tid'])

    @property
    def script_load(self):
        """
        Load the module script for server, when any of the server-group node is
        initialized.
        """
        return schema.SchemaModule.NODE_TYPE

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return True

    def BackendSupported(self, manager, **kwargs):
        """
        Load this module if it is a partition table
        """
        return backend_supported(self, manager, **kwargs)

    def register(self, app, options, first_registration=False):
        """
        Override the default register function to automatically register
        sub-modules of table node under partition table node.
        """

        if first_registration:
            self.submodules = list(app.find_submodules(self.import_name))

        super(CollectionNodeModule, self).register(
            app, options, first_registration
        )

        for module in self.submodules:
            if first_registration:
                module.parentmodules.append(self)
            app.register_blueprint(module)

        # Now add sub modules of table node to partition table node.
        if first_registration:
            # Exclude 'partition' module for now to avoid cyclic import issue.
            modules_to_skip = ['partition', 'column']
            for parent in self.parentmodules:
                if parent.NODE_TYPE == 'table':
                    self.submodules += [
                        submodule for submodule in parent.submodules
                        if submodule.NODE_TYPE not in modules_to_skip
                    ]

    @property
    def module_use_template_javascript(self):
        """
        Returns whether Jinja2 template is used for generating the javascript
        module.
        """
        return False


blueprint = PartitionsModule(__name__)


class PartitionsView(BaseTableView, DataTypeReader, VacuumSettings):
    """
    This class is responsible for generating routes for Partition node

    Methods:
    -------

    * list()
      - This function is used to list all the Partition nodes within that
      collection.

    * nodes()
      - This function will used to create all the child node within that
        collection, Here it will create all the Partition node.

    * properties(gid, sid, did, scid, tid, ptid)
      - This function will show the properties of the selected Partition node

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
        {'type': 'int', 'id': 'ptid'}
    ]

    operations = dict({
        'obj': [
            {'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create'}
        ],
        'delete': [{'delete': 'delete'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {}],
        'detach': [{'put': 'detach'}],
        'truncate': [{'put': 'truncate'}]

    })

    def children(self, **kwargs):
        """Build a list of treeview nodes from the child nodes."""

        if 'sid' not in kwargs:
            return precondition_required(
                gettext('Required properties are missing.')
            )

        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(
            sid=kwargs['sid']
        )

        did = None
        if 'did' in kwargs:
            did = kwargs['did']

        conn = manager.connection(did=did)

        if not conn.connected():
            return precondition_required(
                gettext(
                    "Connection to the server has been lost."
                )
            )

        nodes = []
        for module in self.blueprint.submodules:
            if isinstance(module, PGChildModule):
                if manager is not None and \
                        module.BackendSupported(manager, **kwargs):
                    # treat partition table as normal table.
                    # replace tid with ptid and pop ptid from kwargs
                    if 'ptid' in kwargs:
                        ptid = kwargs.pop('ptid')
                        kwargs['tid'] = ptid
                    nodes.extend(module.get_nodes(**kwargs))
            else:
                nodes.extend(module.get_nodes(**kwargs))

        # Return sorted nodes based on label
        return make_json_response(
            data=sorted(
                nodes, key=lambda c: c['label']
            )
        )

    @BaseTableView.check_precondition
    def list(self, gid, sid, did, scid, tid):
        """
        This function is used to list all the table nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Table ID

        Returns:
            JSON of available table nodes
        """
        SQL = render_template("/".join([self.partition_template_path,
                                        'properties.sql']),
                              did=did, scid=scid, tid=tid,
                              datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)
        return ajax_response(
            response=res['rows'],
            status=200
        )

    @BaseTableView.check_precondition
    def nodes(self, gid, sid, did, scid, tid, ptid=None):
        """
        This function is used to list all the table nodes within that
        collection.

        Args:
            gid: Server group ID
            sid: Server ID
            did: Database ID
            scid: Schema ID
            tid: Parent Table ID
            ptid: Partition Table ID

        Returns:
            JSON of available table nodes
        """
        SQL = render_template(
            "/".join([self.partition_template_path, 'nodes.sql']),
            scid=scid, tid=tid
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        def browser_node(row):
            return self.blueprint.generate_browser_node(
                row['oid'],
                tid,
                row['name'],
                icon=self.get_icon_css_class({}),
                tigger_count=row['triggercount'],
                has_enable_triggers=row['has_enable_triggers'],
                is_partitioned=row['is_partitioned'],
                parent_schema_id=scid,
                schema_id=row['schema_id'],
                schema_name=row['schema_name']
            )

        if ptid is not None:
            if len(rset['rows']) == 0:
                return gone(gettext(
                    "The specified partitioned table could not be found."
                ))

            return make_json_response(
                data=browser_node(rset['rows'][0]), status=200
            )

        res = []
        for row in rset['rows']:
            res.append(browser_node(row))

        return make_json_response(
            data=res,
            status=200
        )

    @BaseTableView.check_precondition
    def properties(self, gid, sid, did, scid, tid, ptid):
        """
        This function will show the properties of the selected table node.

        Args:
            gid: Server Group ID
            sid: Server ID
            did:  Database ID
            scid: Schema ID
            scid: Schema ID
            tid: Table ID
            ptid: Partition Table ID

        Returns:
            JSON of selected table node
        """

        SQL = render_template("/".join([self.partition_template_path,
                                        'properties.sql']),
                              did=did, scid=scid, tid=tid,
                              ptid=ptid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
                return gone(gettext(
                    "The specified partitioned table could not be found."))

        return super(PartitionsView, self).properties(
            gid, sid, did, scid, ptid, res)

    @BaseTableView.check_precondition
    def sql(self, gid, sid, did, scid, tid, ptid):
        """
        This function will creates reverse engineered sql for
        the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           ptid: Partition Table ID
        """
        main_sql = []

        SQL = render_template("/".join([self.partition_template_path,
                                        'properties.sql']),
                              did=did, scid=scid, tid=tid,
                              ptid=ptid, datlastsysoid=self.datlastsysoid)
        status, res = self.conn.execute_dict(SQL)
        if not status:
            return internal_server_error(errormsg=res)

        if len(res['rows']) == 0:
                return gone(gettext(
                    "The specified partitioned table could not be found."))

        data = res['rows'][0]

        return BaseTableView.get_reverse_engineered_sql(self, did, scid, ptid,
                                                        main_sql, data)

    @BaseTableView.check_precondition
    def detach(self, gid, sid, did, scid, tid, ptid):
        """
        This function will reset statistics of table

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           ptid: Partition Table ID
        """
        # Fetch schema name
        status, parent_schema = self.conn.execute_scalar(
            render_template(
                "/".join([self.table_template_path, 'get_schema.sql']),
                conn=self.conn, scid=scid
            )
        )
        if not status:
            return internal_server_error(errormsg=parent_schema)

        # Fetch Parent Table name
        status, partitioned_table_name = self.conn.execute_scalar(
            render_template(
                "/".join([self.table_template_path, 'get_table.sql']),
                conn=self.conn, scid=scid, tid=tid
            )
        )
        if not status:
            return internal_server_error(errormsg=partitioned_table_name)

        # Get schema oid of partition
        status, pscid = self.conn.execute_scalar(
            render_template("/".join([self.table_template_path,
                                      'get_schema_oid.sql']), tid=ptid))
        if not status:
            return internal_server_error(errormsg=scid)

        # Fetch schema name
        status, partition_schema = self.conn.execute_scalar(
            render_template("/".join([self.table_template_path,
                                      'get_schema.sql']), conn=self.conn,
                            scid=pscid)
        )
        if not status:
            return internal_server_error(errormsg=partition_schema)

        # Fetch Partition Table name
        status, partition_name = self.conn.execute_scalar(
            render_template(
                "/".join([self.table_template_path, 'get_table.sql']),
                conn=self.conn, scid=pscid, tid=ptid
            )
        )
        if not status:
            return internal_server_error(errormsg=partition_name)

        try:
            temp_data = dict()
            temp_data['parent_schema'] = parent_schema
            temp_data['partitioned_table_name'] = partitioned_table_name
            temp_data['schema'] = partition_schema
            temp_data['name'] = partition_name

            SQL = render_template(
                "/".join([self.partition_template_path, 'detach.sql']),
                data=temp_data, conn=self.conn
            )

            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Partition detached."),
                data={
                    'id': ptid,
                    'scid': scid
                }
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def msql(self, gid, sid, did, scid, tid, ptid=None):
        """
        This function will create modified sql for table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """
        data = dict()
        for k, v in request.args.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        if ptid is not None:
            SQL = render_template("/".join([self.partition_template_path,
                                            'properties.sql']),
                                  did=did, scid=scid, tid=tid,
                                  ptid=ptid, datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

        SQL, name = self.get_sql(did, scid, ptid, data, res)
        SQL = re.sub('\n{2,}', '\n\n', SQL)
        SQL = SQL.strip('\n')
        if SQL == '':
            SQL = "--modified SQL"
        return make_json_response(
            data=SQL,
            status=200
        )

    @BaseTableView.check_precondition
    def update(self, gid, sid, did, scid, tid, ptid):
        """
        This function will update an existing table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           ptid: Partition Table ID
        """
        data = request.form if request.form else json.loads(
            request.data, encoding='utf-8'
        )

        for k, v in data.items():
            try:
                data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        try:
            SQL = render_template("/".join([self.partition_template_path,
                                            'properties.sql']),
                                  did=did, scid=scid, tid=tid,
                                  ptid=ptid, datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return super(PartitionsView, self).update(
                gid, sid, did, scid, ptid, data, res, parent_id=tid)
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def truncate(self, gid, sid, did, scid, tid, ptid):
        """
        This function will truncate the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """

        try:
            SQL = render_template("/".join([self.partition_template_path,
                                            'properties.sql']),
                                  did=did, scid=scid, tid=tid,
                                  ptid=ptid, datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return super(PartitionsView, self).truncate(
                gid, sid, did, scid, ptid, res
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def delete(self, gid, sid, did, scid, tid, ptid):
        """
        This function will delete the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
        """

        try:
            SQL = render_template(
                "/".join([self.partition_template_path, 'properties.sql']),
                did=did, scid=scid, tid=tid, ptid=ptid,
                datlastsysoid=self.datlastsysoid
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
                        'The specified partition could not be found.\n'
                    )
                )

            return super(PartitionsView, self).delete(
                gid, sid, did, scid, tid, res)

        except Exception as e:
            return internal_server_error(errormsg=str(e))


PartitionsView.register_node_view(blueprint)
