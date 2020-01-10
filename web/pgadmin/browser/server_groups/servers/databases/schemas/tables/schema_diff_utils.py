##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for Table and Partitioned Table. """

import copy

from flask import render_template
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.directory_compare import compare_dictionaries,\
    directory_diff
from pgadmin.tools.schema_diff.model import SchemaDiffModel
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry


class SchemaDiffTableCompare(SchemaDiffObjectCompare):

    keys_to_ignore = ['oid', 'schema', 'vacuum_table',
                      'vacuum_toast', 'edit_types', 'attnum', 'col_type',
                      'references', 'reltuples', 'rows_cnt']

    keys_to_ignore_ddl_comp = ['oid',
                               'schema',
                               'columns',
                               'edit_types',
                               'primary_key',
                               'exclude_constraint',
                               'check_constraint',
                               'foreign_key',
                               'reltuples',
                               'rows_cnt'
                               ]

    keys_to_remove = {
        'columns': ['relname', 'nspname', 'parent_tbl', 'attrelid', 'adrelid'],
        'primary_key': ['oid'],
        'unique_constraint': ['oid'],
        'check_constraint': ['oid', 'nspname'],
        'foreign_key': ['oid', 'fknsp', 'confrelid'],
        'exclude_constraint': ['oid'],
        'partitions': ['oid'],
    }

    keys_to_remove_ddl_comp = {
        'columns': ['relname', 'nspname', 'parent_tbl', 'attrelid', 'adrelid'],
        'check_constraint': ['nspname'],
        'foreign_key': ['fknsp', 'confrelid']
    }

    def compare(self, **kwargs):
        """
        This function is used to compare all the table objects
        from two different schemas.

        :return: Comparison Dictionary
        """
        src_sid = kwargs.get('source_sid')
        src_did = kwargs.get('source_did')
        src_scid = kwargs.get('source_scid')
        tar_sid = kwargs.get('target_sid')
        tar_did = kwargs.get('target_did')
        tar_scid = kwargs.get('target_scid')
        sub_modules = ['index', 'rule', 'trigger']

        source_tables = self.fetch_tables(sid=src_sid, did=src_did,
                                          scid=src_scid)

        target_tables = self.fetch_tables(sid=tar_sid, did=tar_did,
                                          scid=tar_scid)

        if self.manager.version >= 120000:
            sub_modules.append('compound_trigger')

        # If both the dict have no items then return None.
        if not (source_tables or target_tables) or (
                len(source_tables) <= 0 and len(target_tables) <= 0):
            return None

        src_server_type, tar_server_type = self.get_server_type(src_sid,
                                                                tar_sid)
        for module in sub_modules:

            module_view = SchemaDiffRegistry.get_node_view(
                module)

            # Get sub module data for source tables
            if module_view.blueprint.server_type is None or \
                    src_server_type in module_view.blueprint.server_type:
                for key, val in source_tables.items():
                    source = module_view.fetch_objects_to_compare(
                        sid=src_sid,
                        did=src_did,
                        scid=src_scid,
                        tid=val['oid'],
                        oid=None,
                        ignore_keys=True
                    )
                    source_tables[key][module] = source

            # Get sub module data for target tables
            if module_view.blueprint.server_type is None or \
                    tar_server_type in module_view.blueprint.server_type:
                for key, val in target_tables.items():
                    target = module_view.fetch_objects_to_compare(
                        sid=tar_sid,
                        did=tar_did,
                        scid=tar_scid,
                        tid=val['oid'],
                        oid=None,
                        ignore_keys=True
                    )
                    target_tables[key][module] = target

        return compare_dictionaries(source_tables, target_tables,
                                    self.node_type,
                                    self.blueprint.COLLECTION_LABEL,
                                    self.keys_to_ignore)

    @staticmethod
    def get_server_type(src_id, tar_id):
        """Get server types of source and target servers."""
        driver = get_driver(PG_DEFAULT_DRIVER)
        src_manager = driver.connection_manager(src_id)
        tar_manager = driver.connection_manager(tar_id)

        return src_manager.server_type, tar_manager.server_type

    def ddl_compare(self, **kwargs):
        """
        This function will compare properties of 2 tables and
        return the source DDL, target DDL and Difference of them.
        """

        src_sid = kwargs.get('source_sid')
        src_did = kwargs.get('source_did')
        src_scid = kwargs.get('source_scid')
        src_oid = kwargs.get('source_oid')
        tar_sid = kwargs.get('target_sid')
        tar_did = kwargs.get('target_did')
        tar_scid = kwargs.get('target_scid')
        tar_oid = kwargs.get('target_oid')
        comp_status = kwargs.get('comp_status')
        generate_script = False

        if 'generate_script' in kwargs and kwargs['generate_script']:
            generate_script = True

        source = ''
        target = ''
        diff = ''
        ignore_sub_modules = ['column', 'constraints']

        src_server_type, tar_server_type = self.get_server_type(src_sid,
                                                                tar_sid)

        status, target_schema = self.get_schema(tar_sid,
                                                tar_did,
                                                tar_scid
                                                )

        if not status:
            return internal_server_error(errormsg=target_schema)

        if comp_status == SchemaDiffModel.COMPARISON_STATUS['source_only']:
            if not generate_script:
                source = self.get_sql_from_table_diff(sid=src_sid,
                                                      did=src_did,
                                                      scid=src_scid,
                                                      tid=src_oid,
                                                      json_resp=False)
            diff = self.get_sql_from_table_diff(sid=src_sid, did=src_did,
                                                scid=src_scid, tid=src_oid,
                                                diff_schema=target_schema,
                                                json_resp=False)

        elif comp_status == SchemaDiffModel.COMPARISON_STATUS['target_only']:
            if not generate_script:
                target = self.get_sql_from_table_diff(sid=tar_sid,
                                                      did=tar_did,
                                                      scid=tar_scid,
                                                      tid=tar_oid,
                                                      json_resp=False)
            SQL = render_template(
                "/".join([self.table_template_path, 'properties.sql']),
                did=tar_did, scid=tar_scid, tid=tar_oid,
                datlastsysoid=self.datlastsysoid
            )
            status, res = self.conn.execute_dict(SQL)

            if status:
                diff = self.get_delete_sql(res)

        elif comp_status == SchemaDiffModel.COMPARISON_STATUS['different']:
            source = self.fetch_tables(
                sid=src_sid, did=src_did,
                scid=src_scid, tid=src_oid,
                keys_to_remove=self.keys_to_remove_ddl_comp
            )
            target = self.fetch_tables(
                sid=tar_sid, did=tar_did,
                scid=tar_scid, tid=tar_oid,
                keys_to_remove=self.keys_to_remove_ddl_comp
            )

            if self.manager.version < 100000:
                ignore_sub_modules.append('partition')

            if self.manager.version < 120000:
                ignore_sub_modules.append('compound_trigger')

            # In case of error return None
            if not (source or target):
                return None

            diff_dict = directory_diff(
                source, target, ignore_keys=self.keys_to_ignore_ddl_comp,
                difference={}
            )

            # Column comparison
            col_diff = self.table_col_ddl_comp(source, target)
            diff_dict.update(col_diff)

            # Constraint comparison
            pk_diff = self.constraint_ddl_comp(source, target)
            diff_dict.update(pk_diff)

            diff_dict['relacl'] = self.parce_acl(source, target)

            if not generate_script:
                source = self.get_sql_from_table_diff(sid=src_sid,
                                                      did=src_did,
                                                      scid=src_scid,
                                                      tid=src_oid,
                                                      json_resp=False)
                target = self.get_sql_from_table_diff(sid=tar_sid,
                                                      did=tar_did,
                                                      scid=tar_scid,
                                                      tid=tar_oid,
                                                      json_resp=False)
            diff = self.get_sql_from_table_diff(sid=tar_sid, did=tar_did,
                                                scid=tar_scid, tid=tar_oid,
                                                diff_data=diff_dict,
                                                json_resp=False)

            for module in self.blueprint.submodules:
                if module.NODE_TYPE not in ignore_sub_modules:
                    module_view = SchemaDiffRegistry.get_node_view(
                        module.NODE_TYPE)

                    if module_view.blueprint.server_type and (
                            src_server_type not in
                            module_view.blueprint.server_type and
                            tar_server_type not in
                            module_view.blueprint.server_type
                    ):
                        continue

                    if module_view.blueprint.server_type and (
                            (src_server_type in
                             module_view.blueprint.server_type and
                             tar_server_type not in
                             module_view.blueprint.server_type) or (
                            src_server_type not in
                            module_view.blueprint.server_type and
                            tar_server_type in
                            module_view.blueprint.server_type)
                    ):
                        continue

                    result = module_view.compare(
                        source_sid=src_sid, source_did=src_did,
                        source_scid=src_scid, source_tid=src_oid,
                        target_sid=tar_sid, target_did=tar_did,
                        target_scid=tar_scid, target_tid=tar_oid
                    )
                    if result and module.NODE_TYPE != 'partition':
                        child_diff = ''
                        for res in result:
                            if res['status'] == \
                                    SchemaDiffModel.COMPARISON_STATUS[
                                        'different']:
                                source_oid = res['source_oid']
                                target_oid = res['target_oid']
                            else:
                                source_oid = res['oid']
                                target_oid = res['oid']

                            if res['status'] != \
                                    SchemaDiffModel.COMPARISON_STATUS[
                                        'identical']:
                                child_diff = module_view.ddl_compare(
                                    source_sid=src_sid, source_did=src_did,
                                    source_scid=src_scid,
                                    source_oid=source_oid,
                                    source_tid=src_oid, target_sid=tar_sid,
                                    target_did=tar_did, target_scid=tar_scid,
                                    target_tid=tar_oid, target_oid=target_oid,
                                    comp_status=res['status']

                                )
                                if child_diff:
                                    diff += child_diff
                    elif result:
                        # For partition module
                        identical = False
                        source_only = False
                        target_only = False
                        different = False
                        for res in result:
                            if res['status'] == \
                                    SchemaDiffModel.COMPARISON_STATUS[
                                        'identical']:
                                identical = True
                            elif res['status'] == \
                                    SchemaDiffModel.COMPARISON_STATUS[
                                        'source_only']:
                                source_only = True
                            elif res['status'] == \
                                    SchemaDiffModel.COMPARISON_STATUS[
                                        'target_only']:
                                target_only = True
                            else:
                                different = True

                        if identical:
                            pass
                        elif (source_only or target_only) and not different:
                            for res in result:
                                source_oid = res['oid']
                                target_oid = res['oid']

                                child_diff = module_view.ddl_compare(
                                    source_sid=src_sid, source_did=src_did,
                                    source_scid=src_scid,
                                    source_oid=source_oid,
                                    source_tid=src_oid, target_sid=tar_sid,
                                    target_did=tar_did, target_scid=tar_scid,
                                    target_tid=tar_oid, target_oid=target_oid,
                                    comp_status=res['status']

                                )
                                if ddl_compare:
                                    diff += child_diff
                        else:
                            diff = self.get_sql_from_table_diff(
                                sid=src_sid,
                                did=src_did,
                                scid=src_scid,
                                tid=src_oid,
                                diff_schema=target_schema,
                                json_resp=False,
                                schema_diff_table=True
                            )
        else:
            source = self.get_sql_from_table_diff(sid=src_sid, did=src_did,
                                                  scid=src_scid, tid=src_oid,
                                                  json_resp=False)
            target = self.get_sql_from_table_diff(sid=tar_sid, did=tar_did,
                                                  scid=tar_scid, tid=tar_oid,
                                                  json_resp=False)

        return {'source_ddl': source,
                'target_ddl': target,
                'diff_ddl': diff
                }

    @staticmethod
    def table_col_ddl_comp(source, target):
        """
        Table Column comparison
        :param source: Source columns
        :param target: Target columns
        :return: Difference of the columns
        """
        source_cols = source['columns']
        target_cols = copy.deepcopy(target['columns'])
        added = []
        updated = []
        different = {'columns': {}}

        for source in source_cols:
            if 'name' in source:
                if type(target_cols) is list and len(
                        target_cols) > 0:
                    tmp = None
                    for item in target_cols:
                        if item['name'] == source['name']:
                            tmp = copy.deepcopy(item)
                    if tmp and source != tmp:
                        tmp_updated = copy.deepcopy(source)
                        # Preserve the column number
                        tmp_updated['attnum'] = tmp['attnum']
                        if item['typname'] not in tmp_updated['edit_types']:
                            tmp_updated['col_type_conversion'] = False
                        updated.append(tmp_updated)
                        target_cols.remove(tmp)
                    elif tmp and source == tmp:
                        target_cols.remove(tmp)
                    elif tmp is None:
                        added.append(source)
                else:
                    added.append(source)
            different['columns']['added'] = added
            different['columns']['changed'] = updated

        if target_cols and len(target_cols) > 0:
            different['columns']['deleted'] = target_cols

        return different

    @staticmethod
    def constraint_ddl_comp(source_table, target_table):
        """
        Table Constraint DDL comparison
        :param source: Source Table
        :param target: Target Table
        :return: Difference of constraints
        """
        different = {}
        non_editable_keys = {}

        non_editable_keys = {'primary_key': ['col_count',
                                             'condeferrable',
                                             'condeffered',
                                             'columns'],
                             'check_constraint': ['consrc'],
                             'exclude_constraint': ['amname',
                                                    'indconstraint',
                                                    'columns']
                             }

        for constraint in ['primary_key', 'check_constraint',
                           'exclude_constraint']:
            source_cols = source_table[constraint] if \
                constraint in source_table else []
            target_cols = copy.deepcopy(target_table[constraint]) if\
                constraint in target_table else []
            added = []
            updated = []
            deleted = []

            different[constraint] = {}
            for source in source_cols:
                if 'name' in source:
                    if type(target_cols) is list and len(
                            target_cols) > 0:
                        tmp_src = copy.deepcopy(source)
                        tmp_src.pop('oid')
                        tmp_tar = None
                        tmp = None
                        for item in target_cols:
                            if item['name'] == source['name']:
                                tmp_tar = copy.deepcopy(item)
                                tmp = copy.deepcopy(item)
                                tmp_tar.pop('oid')
                        if tmp_tar and tmp_src != tmp_tar:
                            tmp_updated = copy.deepcopy(source)
                            for key in non_editable_keys[constraint]:
                                if key in tmp_updated and \
                                        tmp_updated[key] != tmp_tar[key]:
                                    added.append(source)
                                    deleted.append(tmp_updated)
                                    tmp_updated = None
                                    break
                            if tmp_updated:
                                tmp_updated['oid'] = tmp_tar['oid']
                                updated.append(tmp_updated)
                            target_cols.remove(tmp)
                        elif tmp_tar and tmp_src == tmp_tar:
                            target_cols.remove(tmp)
                        elif tmp_tar is None:
                            added.append(source)
                    else:
                        added.append(source)
                different[constraint]['added'] = added
                different[constraint]['changed'] = updated
                different[constraint]['deleted'] = deleted

            if target_cols and len(target_cols) > 0:
                different[constraint]['deleted'] = target_cols

        return different

    def remove_keys_for_comparision(self, data, keys=None):
        """
        This function is used to remove specific keys from data
        """

        keys_to_remove = keys if keys else self.keys_to_remove

        for p_key, p_val in keys_to_remove.items():
            if p_key in data and data[p_key] is not None \
                    and len(data[p_key]) > 0:
                for item in data[p_key]:
                    # Remove keys that should not be the part of comparision.
                    for key in p_val:
                        if key in item:
                            item.pop(key)
