##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Partitions Node """

import re
import random
import simplejson as json
import pgadmin.browser.server_groups.servers.databases.schemas as schema
from flask import render_template, request, current_app
from flask_babelex import gettext
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader, VacuumSettings
from pgadmin.utils.ajax import internal_server_error, \
    make_response as ajax_response, gone
from pgadmin.browser.server_groups.servers.databases.schemas.tables.utils \
    import BaseTableView
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.utils.ajax import make_json_response
from pgadmin.browser.utils import PGChildModule
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare


def backend_supported(module, manager, **kwargs):

    if CollectionNodeModule.backend_supported(module, manager, **kwargs):
        if 'tid' not in kwargs:
            return True

        conn = manager.connection(did=kwargs['did'])

        template_path = 'partitions/sql/{0}/#{0}#{1}#'.format(
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

    _NODE_TYPE = 'partition'
    _COLLECTION_LABEL = gettext("Partitions")

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
        return schema.SchemaModule.node_type

    @property
    def node_inode(self):
        """
        Load the module node as a leaf node
        """
        return True

    def backend_supported(self, manager, **kwargs):
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
                if parent.node_type == 'table':
                    self.submodules += [
                        submodule for submodule in parent.submodules
                        if submodule.node_type not in modules_to_skip
                    ]

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
                "partitions/css/partition.css",
                node_type=self.node_type,
                _=gettext
            )
        ]

        for submodule in self.submodules:
            snippets.extend(submodule.csssnippets)

        return snippets


blueprint = PartitionsModule(__name__)


class PartitionsView(BaseTableView, DataTypeReader, VacuumSettings,
                     SchemaDiffObjectCompare):
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
    node_label = "Partition"

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
            {'get': 'list', 'post': 'create', 'delete': 'delete'}
        ],
        'delete': [{'delete': 'delete'}, {'delete': 'delete'}],
        'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
        'children': [{'get': 'children'}],
        'sql': [{'get': 'sql'}],
        'msql': [{'get': 'msql'}, {}],
        'detach': [{'put': 'detach'}],
        'truncate': [{'put': 'truncate'}],
        'set_trigger': [{'put': 'enable_disable_triggers'}]
    })

    # Schema Diff: Keys to ignore while comparing
    keys_to_ignore = ['oid', 'schema', 'vacuum_table',
                      'vacuum_toast', 'edit_types', 'oid-2']

    def get_children_nodes(self, manager, **kwargs):
        nodes = []
        # treat partition table as normal table.
        # replace tid with ptid and pop ptid from kwargs
        if 'ptid' in kwargs:
            ptid = kwargs.pop('ptid')
            kwargs['tid'] = ptid

        for module in self.blueprint.submodules:
            if isinstance(module, PGChildModule):
                if manager is not None and \
                        module.backend_supported(manager, **kwargs):
                    nodes.extend(module.get_nodes(**kwargs))
            else:
                nodes.extend(module.get_nodes(**kwargs))

        if manager is not None and \
                self.blueprint.backend_supported(manager, **kwargs):
            nodes.extend(self.blueprint.get_nodes(**kwargs))

        return nodes

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
                                        self._PROPERTIES_SQL]),
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
            "/".join([self.partition_template_path, self._NODES_SQL]),
            scid=scid, tid=tid, ptid=ptid
        )
        status, rset = self.conn.execute_2darray(SQL)
        if not status:
            return internal_server_error(errormsg=rset)

        def browser_node(row):
            icon = self.get_partition_icon_css_class(row)
            return self.blueprint.generate_browser_node(
                row['oid'],
                tid,
                row['name'],
                icon=icon,
                tigger_count=row['triggercount'],
                has_enable_triggers=row['has_enable_triggers'],
                is_partitioned=row['is_partitioned'],
                parent_schema_id=scid,
                schema_id=row['schema_id'],
                schema_name=row['schema_name']
            )

        if ptid is not None:
            if len(rset['rows']) == 0:
                return gone(self.not_found_error_msg())

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

        status, res = self._fetch_properties(did, scid, tid, ptid)

        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        return super(PartitionsView, self).properties(
            gid, sid, did, scid, ptid, res=res)

    def _fetch_properties(self, did, scid, tid, ptid=None):

        """
        This function is used to fetch the properties of the specified object
        :param did:
        :param scid:
        :param tid:
        :return:
        """
        try:
            SQL = render_template("/".join([self.partition_template_path,
                                            self._PROPERTIES_SQL]),
                                  did=did, scid=scid, tid=tid,
                                  ptid=ptid, datlastsysoid=self.datlastsysoid)
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            if len(res['rows']) == 0:
                return False, gone(
                    gettext(self.not_found_error_msg()))

            # Update autovacuum properties
            self.update_autovacuum_properties(res['rows'][0])

        except Exception as e:
            return False, internal_server_error(errormsg=str(e))

        return True, res

    @BaseTableView.check_precondition
    def fetch_objects_to_compare(self, sid, did, scid, tid, ptid=None):
        """
        This function will fetch the list of all the tables for
        specified schema id.

        :param sid: Server Id
        :param did: Database Id
        :param scid: Schema Id
        :param tid: Table Id
        :param ptif: Partition table Id
        :return:
        """
        res = {}

        if ptid:
            SQL = render_template("/".join([self.partition_template_path,
                                            self._PROPERTIES_SQL]),
                                  did=did, scid=scid, tid=tid,
                                  ptid=ptid, datlastsysoid=self.datlastsysoid)
            status, result = self.conn.execute_dict(SQL)
            if not status:
                current_app.logger.error(result)
                return False

            res = super(PartitionsView, self).properties(
                0, sid, did, scid, ptid, result)

        else:
            SQL = render_template(
                "/".join([self.partition_template_path, self._NODES_SQL]),
                scid=scid, tid=tid
            )
            status, partitions = self.conn.execute_2darray(SQL)
            if not status:
                current_app.logger.error(partitions)
                return False

            for row in partitions['rows']:
                SQL = render_template("/".join([self.partition_template_path,
                                                self._PROPERTIES_SQL]),
                                      did=did, scid=scid, tid=tid,
                                      ptid=row['oid'],
                                      datlastsysoid=self.datlastsysoid)
                status, result = self.conn.execute_dict(SQL)

                if not status:
                    current_app.logger.error(result)
                    return False

                data = super(PartitionsView, self).properties(
                    0, sid, did, scid, row['oid'], result, False
                )
                res[row['name']] = data

        return res

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

        status, res = self._fetch_properties(did, scid, tid, ptid)

        if len(res['rows']) == 0:
            return gone(self.not_found_error_msg())

        data = res['rows'][0]

        return BaseTableView.get_reverse_engineered_sql(
            self, did=did, scid=scid, tid=ptid, main_sql=main_sql, data=data)

    @BaseTableView.check_precondition
    def get_sql_from_diff(self, **kwargs):
        """
        This function is used to get the DDL/DML statements for
        partitions.

        :param kwargs:
        :return:
        """

        source_data = kwargs['source_data'] if 'source_data' in kwargs \
            else None
        target_data = kwargs['target_data'] if 'target_data' in kwargs \
            else None

        # Store the original name and create a temporary name for
        # the partitioned(base) table.
        target_data['orig_name'] = target_data['name']
        target_data['name'] = 'temp_partitioned_{0}'.format(
            random.randint(1, 9999999))
        # For PG/EPAS 11 and above when we copy the data from original
        # table to temporary table for schema diff, we will have to create
        # a default partition to prevent the data loss.
        target_data['default_partition_name'] = \
            target_data['orig_name'] + '_default'

        # Copy the partition scheme from source to target.
        if 'partition_scheme' in source_data:
            target_data['partition_scheme'] = source_data['partition_scheme']

        partition_data = dict()
        partition_data['name'] = target_data['name']
        partition_data['schema'] = target_data['schema']
        partition_data['partition_type'] = source_data['partition_type']
        partition_data['default_partition_header'] = \
            '-- Create a default partition to prevent the data loss.\n' \
            '-- It helps when none of the partitions of a relation\n' \
            '-- matches the inserted data.'

        # Create temporary name for partitions
        for item in source_data['partitions']:
            item['temp_partition_name'] = 'partition_{0}'.format(
                random.randint(1, 9999999))

        partition_data['partitions'] = source_data['partitions']

        partition_sql = self.get_partitions_sql(partition_data,
                                                schema_diff=True)

        return render_template(
            "/".join([self.partition_template_path, 'partition_diff.sql']),
            conn=self.conn, data=target_data, partition_sql=partition_sql,
            partition_data=partition_data
        )

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
                                      self._GET_SCHEMA_OID_SQL]), tid=ptid))
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
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        if ptid is not None:
            status, res = self._fetch_properties(did, scid, tid, ptid)

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
                # comments should be taken as is because if user enters a
                # json comment it is parsed by loads which should not happen
                if k in ('description',):
                    data[k] = v
                else:
                    data[k] = json.loads(v, encoding='utf-8')
            except (ValueError, TypeError, KeyError):
                data[k] = v

        try:
            status, res = self._fetch_properties(did, scid, tid, ptid)

            return super(PartitionsView, self).update(
                gid, sid, did, scid, ptid, data=data, res=res, parent_id=tid)
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
                                            self._PROPERTIES_SQL]),
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
    def delete(self, gid, sid, did, scid, tid, ptid=None):
        """
        This function will delete the table object

         Args:
           gid: Server Group ID
           sid: Server ID
           did: Database ID
           scid: Schema ID
           tid: Table ID
           ptid: Partition Table ID
        """
        if ptid is None:
            data = request.form if request.form else json.loads(
                request.data, encoding='utf-8'
            )
        else:
            data = {'ids': [ptid]}

        try:
            for ptid in data['ids']:
                SQL = render_template(
                    "/".join([self.partition_template_path,
                              self._PROPERTIES_SQL]),
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

                status, res = super(PartitionsView, self).delete(
                    gid, sid, did, scid, tid, res)

                if not status:
                    return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Partition dropped")
            )

        except Exception as e:
            return internal_server_error(errormsg=str(e))

    @BaseTableView.check_precondition
    def enable_disable_triggers(self, gid, sid, did, scid, tid, ptid):
        """
        This function will enable/disable trigger(s) on the partition object

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
        # Convert str 'true' to boolean type
        is_enable_trigger = data['is_enable_trigger']

        try:
            SQL = render_template(
                "/".join([self.partition_template_path, self._PROPERTIES_SQL]),
                did=did, scid=scid, tid=tid, ptid=ptid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)
            if not status:
                return internal_server_error(errormsg=res)
            data = res['rows'][0]

            SQL = render_template(
                "/".join([
                    self.table_template_path, 'enable_disable_trigger.sql'
                ]),
                data=data, is_enable_trigger=is_enable_trigger
            )
            status, res = self.conn.execute_scalar(SQL)
            if not status:
                return internal_server_error(errormsg=res)

            return make_json_response(
                success=1,
                info=gettext("Trigger(s) have been disabled")
                if is_enable_trigger == 'D'
                else gettext("Trigger(s) have been enabled"),
                data={
                    'id': ptid,
                    'scid': scid
                }
            )
        except Exception as e:
            return internal_server_error(errormsg=str(e))

    def ddl_compare(self, **kwargs):
        """
        This function returns the DDL/DML statements based on the
        comparison status.

        :param kwargs:
        :return:
        """

        tgt_params = kwargs.get('target_params')
        parent_source_data = kwargs.get('parent_source_data')
        parent_target_data = kwargs.get('parent_target_data')

        diff = self.get_sql_from_diff(sid=tgt_params['sid'],
                                      did=tgt_params['did'],
                                      scid=tgt_params['scid'],
                                      tid=tgt_params['tid'],
                                      source_data=parent_source_data,
                                      target_data=parent_target_data)

        return diff + '\n'


SchemaDiffRegistry(blueprint.node_type, PartitionsView, 'table')
PartitionsView.register_node_view(blueprint)
