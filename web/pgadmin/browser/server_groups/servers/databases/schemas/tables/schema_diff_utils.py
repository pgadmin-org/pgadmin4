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

from pgadmin.utils.ajax import internal_server_error
from pgadmin.tools.schema_diff.directory_compare import compare_dictionaries,\
    are_dictionaries_identical
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry


class SchemaDiffTableCompare(SchemaDiffObjectCompare):
    table_keys_to_ignore = ['oid', 'schema', 'edit_types', 'attnum',
                            'col_type', 'references', 'reltuples', 'oid-2',
                            'rows_cnt', 'seqrelid', 'atttypid', 'elemoid',
                            'hastoasttable', 'relhassubclass', 'relacl_str']

    constraint_keys_to_ignore = ['relname', 'nspname', 'parent_tbl',
                                 'attrelid', 'adrelid', 'fknsp', 'confrelid',
                                 'references', 'refnsp', 'remote_schema',
                                 'conkey', 'indkey', 'references_table_name']

    trigger_keys_to_ignore = ['xmin', 'tgrelid', 'tgfoid', 'tfunction',
                              'tgqual', 'tgconstraint']
    index_keys_to_ignore = ['relowner', 'indrelid', 'indclass']

    keys_to_ignore = table_keys_to_ignore + constraint_keys_to_ignore \
        + trigger_keys_to_ignore + index_keys_to_ignore

    def compare(self, **kwargs):
        """
        This function is used to compare all the table objects
        from two different schemas.

        :param kwargs:
        :return:
        """
        source_params = {'sid': kwargs.get('source_sid'),
                         'did': kwargs.get('source_did'),
                         'scid': kwargs.get('source_scid')}
        target_params = {'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did'),
                         'scid': kwargs.get('target_scid')}

        ignore_whitespaces = kwargs.get('ignore_whitespaces')
        status, target_schema = self.get_schema(**target_params)
        if not status:
            return internal_server_error(errormsg=target_schema)

        source_tables = self.fetch_tables(**source_params)
        target_tables = self.fetch_tables(**target_params)

        # If both the dict have no items then return None.
        if not (source_tables or target_tables) or (
                len(source_tables) <= 0 and len(target_tables) <= 0):
            return None

        return compare_dictionaries(view_object=self,
                                    source_params=source_params,
                                    target_params=target_params,
                                    target_schema=target_schema,
                                    source_dict=source_tables,
                                    target_dict=target_tables,
                                    node=self.node_type,
                                    node_label=self.blueprint.collection_label,
                                    ignore_whitespaces=ignore_whitespaces,
                                    ignore_keys=self.keys_to_ignore)

    def ddl_compare(self, **kwargs):
        """
        This function will compare properties of 2 tables and
        return the source DDL, target DDL and Difference of them.

        :param kwargs:
        :return:
        """
        source_params = {'sid': kwargs.get('source_sid'),
                         'did': kwargs.get('source_did'),
                         'scid': kwargs.get('source_scid'),
                         'tid': kwargs.get('source_oid'),
                         'json_resp': False
                         }

        target_params = {'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did'),
                         'scid': kwargs.get('target_scid'),
                         'tid': kwargs.get('target_oid'),
                         'json_resp': False
                         }

        source = self.get_sql_from_table_diff(**source_params)
        target = self.get_sql_from_table_diff(**target_params)

        return {'source_ddl': source,
                'target_ddl': target,
                'diff_ddl': ''
                }

    @staticmethod
    def table_col_comp(source, target):
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
    def table_constraint_comp(source_table, target_table):
        """
        Table Constraint DDL comparison
        :param source_table: Source Table
        :param target_table: Target Table
        :return: Difference of constraints
        """
        different = {}
        non_editable_keys = {'primary_key': ['col_count',
                                             'condeferrable',
                                             'condeffered',
                                             'columns'],
                             'unique_constraint': ['col_count',
                                                   'condeferrable',
                                                   'condeffered',
                                                   'columns'],
                             'check_constraint': ['consrc'],
                             'exclude_constraint': ['amname',
                                                    'indconstraint',
                                                    'columns'],
                             'foreign_key': []
                             }

        for constraint in ['primary_key', 'unique_constraint',
                           'check_constraint',
                           'exclude_constraint', 'foreign_key']:
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
                        if 'oid' in tmp_src:
                            tmp_src.pop('oid')
                        tmp_tar = None
                        tmp = None
                        for item in target_cols:
                            if item['name'] == source['name']:
                                tmp_tar = copy.deepcopy(item)
                                tmp = copy.deepcopy(item)
                                if 'oid' in tmp_tar:
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
                                if 'oid' in tmp:
                                    tmp_updated['oid'] = tmp['oid']
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

    def get_sql_from_submodule_diff(self, **kwargs):
        """
        This function returns the DDL/DML statements of the
        submodules of table based on the comparison status.

        :param kwargs:
        :return:
        """
        source_params = kwargs.get('source_params')
        target_params = kwargs.get('target_params')
        target_schema = kwargs.get('target_schema')
        source = kwargs.get('source')
        target = kwargs.get('target')
        diff_dict = kwargs.get('diff_dict')
        ignore_whitespaces = kwargs.get('ignore_whitespaces')

        # Get the difference result for source and target columns
        col_diff = self.table_col_comp(source, target)
        diff_dict.update(col_diff)

        # Get the difference result for source and target constraints
        pk_diff = self.table_constraint_comp(source, target)
        diff_dict.update(pk_diff)

        # Get the difference DDL/DML statements for table
        target_params['diff_data'] = diff_dict
        diff = self.get_sql_from_table_diff(**target_params)

        ignore_sub_modules = ['column', 'constraints']
        if self.manager.version < 100000:
            ignore_sub_modules.append('partition')
        if self.manager.server_type == 'pg' or self.manager.version < 120000:
            ignore_sub_modules.append('compound_trigger')

        # Iterate through all the sub modules of the table
        for module in self.blueprint.submodules:
            if module.node_type not in ignore_sub_modules:
                module_view = \
                    SchemaDiffRegistry.get_node_view(module.node_type)

                if module.node_type == 'partition' and \
                    ('is_partitioned' in source and source['is_partitioned'])\
                        and ('is_partitioned' in target and
                             target['is_partitioned']):
                    target_ddl = module_view.ddl_compare(
                        target_params=target_params,
                        parent_source_data=source,
                        parent_target_data=target
                    )

                    diff += '\n' + target_ddl
                elif module.node_type != 'partition':
                    dict1 = copy.deepcopy(source[module.node_type])
                    dict2 = copy.deepcopy(target[module.node_type])

                    # Find the duplicate keys in both the dictionaries
                    dict1_keys = set(dict1.keys())
                    dict2_keys = set(dict2.keys())
                    intersect_keys = dict1_keys.intersection(dict2_keys)

                    # Keys that are available in source and missing in target.
                    added = dict1_keys - dict2_keys
                    for item in added:
                        source_ddl = module_view.ddl_compare(
                            source_params=source_params,
                            target_params=target_params,
                            source=dict1[item],
                            target=None,
                            target_schema=target_schema,
                            comp_status='source_only'
                        )

                        diff += '\n' + source_ddl

                    # Keys that are available in target and missing in source.
                    removed = dict2_keys - dict1_keys
                    for item in removed:
                        target_ddl = module_view.ddl_compare(
                            source_params=source_params,
                            target_params=target_params,
                            source=None,
                            target=dict2[item],
                            target_schema=target_schema,
                            comp_status='target_only'
                        )

                        diff += '\n' + target_ddl

                    # Keys that are available in both source and target.
                    for key in intersect_keys:
                        # Recursively Compare the two dictionary
                        if not are_dictionaries_identical(
                                dict1[key], dict2[key], ignore_whitespaces,
                                self.keys_to_ignore):

                            diff_ddl = module_view.ddl_compare(
                                source_params=source_params,
                                target_params=target_params,
                                source=dict1[key],
                                target=dict2[key],
                                target_schema=target_schema,
                                comp_status='different',
                                parent_source_data=source,
                                parent_target_data=target
                            )

                            diff += '\n' + diff_ddl

        return diff
