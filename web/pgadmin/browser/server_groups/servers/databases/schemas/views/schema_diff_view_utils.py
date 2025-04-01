##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Implements Utility class for View."""

import copy

from pgadmin.utils.ajax import internal_server_error
from pgadmin.tools.schema_diff.directory_compare import compare_dictionaries,\
    are_dictionaries_identical
from pgadmin.tools.schema_diff.compare import SchemaDiffObjectCompare
from pgadmin.tools.schema_diff.node_registry import SchemaDiffRegistry


class SchemaDiffViewCompare(SchemaDiffObjectCompare):
    view_keys_to_ignore = ['oid', 'schema', 'xmin', 'oid-2', 'setting',
                           'indrelid']

    trigger_keys_to_ignore = ['xmin', 'tgrelid', 'tgfoid', 'tfunction',
                              'tgqual', 'tgconstraint', 'nspname']

    keys_to_ignore = view_keys_to_ignore + trigger_keys_to_ignore

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
        ignore_owner = kwargs.get('ignore_owner')
        ignore_whitespaces = kwargs.get('ignore_whitespaces')
        ignore_tablespace = kwargs.get('ignore_tablespace')
        ignore_grants = kwargs.get('ignore_grants')

        group_name = kwargs.get('group_name')
        source_schema_name = kwargs.get('source_schema_name', None)
        source_views = {}
        target_views = {}

        status, target_schema = self.get_schema(**target_params)
        if not status:
            return internal_server_error(errormsg=target_schema)

        if 'scid' in source_params and source_params['scid'] is not None:
            source_views = self.fetch_objects_to_compare(**source_params)

        if 'scid' in target_params and target_params['scid'] is not None:
            target_views = self.fetch_objects_to_compare(**target_params)

        # If both the dict have no items then return None.
        if not (source_views or target_views) or (
                len(source_views) <= 0 and len(target_views) <= 0):
            return None

        return compare_dictionaries(view_object=self,
                                    source_params=source_params,
                                    target_params=target_params,
                                    target_schema=target_schema,
                                    source_dict=source_views,
                                    target_dict=target_views,
                                    node=self.node_type,
                                    node_label=self.blueprint.collection_label,
                                    group_name=group_name,
                                    ignore_keys=self.keys_to_ignore,
                                    source_schema_name=source_schema_name,
                                    ignore_owner=ignore_owner,
                                    ignore_whitespaces=ignore_whitespaces,
                                    ignore_tablespace=ignore_tablespace,
                                    ignore_grants=ignore_grants)

    def ddl_compare(self, **kwargs):
        """
        This function will compare properties of 2 views and
        return the source DDL, target DDL and Difference of them.

        :param kwargs:
        :return:
        """
        source_params = {'sid': kwargs.get('source_sid'),
                         'did': kwargs.get('source_did'),
                         'scid': kwargs.get('source_scid'),
                         'tid': kwargs.get('source_oid')
                         }

        target_params = {'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did'),
                         'scid': kwargs.get('target_scid'),
                         'tid': kwargs.get('target_oid')
                         }

        source = self.get_sql_from_view_diff(**source_params)
        target = self.get_sql_from_view_diff(**target_params)

        return {'source_ddl': source,
                'target_ddl': target,
                'diff_ddl': ''
                }

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
        diff = ''

        # Get the difference DDL/DML statements for table
        if isinstance(diff_dict, dict) and len(diff_dict) > 0:
            target_params['diff_data'] = diff_dict
            diff = self.get_sql_from_view_diff(**target_params)

        ignore_sub_modules = ['column']
        if self.manager.server_type == 'pg' or self.manager.version < 120000:
            ignore_sub_modules.append('compound_trigger')

        # Iterate through all the sub modules of the table
        for module in self.blueprint.submodules:
            if module.node_type not in ignore_sub_modules:
                module_view = \
                    SchemaDiffRegistry.get_node_view(module.node_type)

                dict1 = copy.deepcopy(source[module.node_type])
                dict2 = copy.deepcopy(target[module.node_type])

                # Find the duplicate keys in both the dictionaries
                dict1_keys = set(dict1.keys())
                dict2_keys = set(dict2.keys())
                intersect_keys = dict1_keys.intersection(dict2_keys)

                # Keys that are available in source and missing in target.
                added = dict1_keys - dict2_keys
                diff = SchemaDiffViewCompare._compare_source_only(
                    added, module_view, source_params, target_params,
                    dict1, diff, target_schema)

                # Keys that are available in target and missing in source.
                removed = dict2_keys - dict1_keys
                diff = SchemaDiffViewCompare._compare_target_only(
                    removed, module_view, source_params, target_params,
                    dict2, diff, target_schema)

                # Keys that are available in both source and target.
                other_param = {
                    "dict1": dict1,
                    "dict2": dict2,
                    "source": source,
                    "target": target,
                    "target_schema": target_schema,
                    "ignore_whitespaces": ignore_whitespaces
                }
                diff = self._compare_source_and_target(
                    intersect_keys, module_view, source_params,
                    target_params, diff, **other_param)

        return diff

    @staticmethod
    def _compare_source_only(added, module_view, source_params, target_params,
                             dict1, diff, target_schema):
        for item in added:
            source_ddl = module_view.ddl_compare(
                source_params=source_params,
                target_params=target_params,
                target_schema=target_schema,
                source=dict1[item],
                target=None,
                comp_status='source_only'
            )

            diff += '\n' + source_ddl
        return diff

    @staticmethod
    def _compare_target_only(removed, module_view, source_params,
                             target_params, dict2, diff, target_schema):
        for item in removed:
            target_ddl = module_view.ddl_compare(
                source_params=source_params,
                target_params=target_params,
                target_schema=target_schema,
                source=None,
                target=dict2[item],
                comp_status='target_only'
            )

            diff += '\n' + target_ddl
        return diff

    def _compare_source_and_target(self, intersect_keys, module_view,
                                   source_params, target_params, diff,
                                   **kwargs):
        dict1 = kwargs['dict1']
        dict2 = kwargs['dict2']
        source = kwargs['source']
        target = kwargs['target']
        target_schema = kwargs['target_schema']
        ignore_whitespaces = kwargs.get('ignore_whitespaces')

        for key in intersect_keys:
            # Recursively Compare the two dictionary
            if not are_dictionaries_identical(
                    dict1[key], dict2[key], self.keys_to_ignore,
                    ignore_whitespaces):
                diff_ddl = module_view.ddl_compare(
                    source_params=source_params,
                    target_params=target_params,
                    target_schema=target_schema,
                    source=dict1[key],
                    target=dict2[key],
                    comp_status='different',
                    parent_source_data=source,
                    parent_target_data=target
                )

                diff += '\n' + diff_ddl
        return diff
