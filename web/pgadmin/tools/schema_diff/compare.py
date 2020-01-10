##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema diff object comparison."""

import copy

from flask import render_template
from pgadmin.utils.compile_template_name import compile_template_path
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.tools.schema_diff.directory_compare import compare_dictionaries,\
    directory_diff
from pgadmin.tools.schema_diff.model import SchemaDiffModel
from abc import abstractmethod


class SchemaDiffObjectCompare():

    keys_to_ignore = ['oid', 'schema']

    @staticmethod
    def get_schema(sid, did, scid):
        """
        This function will return the schema name.
        """

        driver = get_driver(PG_DEFAULT_DRIVER)
        manager = driver.connection_manager(sid)
        conn = manager.connection(did=did)

        ver = manager.version
        server_type = manager.server_type

        # Fetch schema name
        status, schema_name = conn.execute_scalar(
            render_template(
                "/".join(['schemas',
                          '{0}/#{1}#'.format(server_type, ver),
                          'sql/get_name.sql']),
                conn=conn, scid=scid
            )
        )

        return status, schema_name

    def compare(self, **kwargs):
        """
        This function is used to compare all the objects
        from two different schemas.

        :param kwargs:
        :return:
        """

        source_params = {'sid': kwargs.get('source_sid'),
                         'did': kwargs.get('source_did'),
                         'scid': kwargs.get('source_scid')
                         }

        target_params = {'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did'),
                         'scid': kwargs.get('target_scid')
                         }

        if 'source_tid' in kwargs:
            source_params['tid'] = kwargs['source_tid']
        if 'target_tid' in kwargs:
            target_params['tid'] = kwargs['target_tid']

        source = self.fetch_objects_to_compare(**source_params)

        target = self.fetch_objects_to_compare(**target_params)

        # If both the dict have no items then return None.
        if not (source or target) or (
                len(source) <= 0 and len(target) <= 0):
            return None

        return compare_dictionaries(source, target,
                                    self.node_type,
                                    self.blueprint.COLLECTION_LABEL,
                                    self.keys_to_ignore)

    def ddl_compare(self, **kwargs):
        """
        This function will compare object properties and
         return the difference of SQL
        """

        source = ''
        target = ''
        diff = ''
        comp_status = kwargs.get('comp_status')
        only_diff = False
        generate_script = False

        source_params = {'gid': 1,
                         'sid': kwargs.get('source_sid'),
                         'did': kwargs.get('source_did'),
                         'scid': kwargs.get('source_scid'),
                         'oid': kwargs.get('source_oid')
                         }

        target_params = {'gid': 1,
                         'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did'),
                         'scid': kwargs.get('target_scid'),
                         'oid': kwargs.get('target_oid')
                         }

        if 'source_tid' in kwargs:
            source_params['tid'] = kwargs['source_tid']
            only_diff = True
        if 'target_tid' in kwargs:
            target_params['tid'] = kwargs['target_tid']
            only_diff = True

        if 'generate_script' in kwargs and kwargs['generate_script']:
            generate_script = True

        source_params_adv = copy.deepcopy(source_params)
        target_params_adv = copy.deepcopy(target_params)

        del source_params_adv['gid']
        del target_params_adv['gid']

        status, target_schema = self.get_schema(kwargs.get('target_sid'),
                                                kwargs.get('target_did'),
                                                kwargs.get('target_scid')
                                                )
        if not status:
            return internal_server_error(errormsg=target_schema)

        if comp_status == SchemaDiffModel.COMPARISON_STATUS['source_only']:
            if not generate_script:
                source = self.get_sql_from_diff(**source_params)
            source_params.update({
                'diff_schema': target_schema
            })
            diff = self.get_sql_from_diff(**source_params)

        elif comp_status == SchemaDiffModel.COMPARISON_STATUS['target_only']:
            if not generate_script:
                target = self.get_sql_from_diff(**target_params)
            target_params.update(
                {'drop_sql': True})
            diff = self.get_sql_from_diff(**target_params)

        elif comp_status == SchemaDiffModel.COMPARISON_STATUS['different']:
            source = self.fetch_objects_to_compare(**source_params_adv)
            target = self.fetch_objects_to_compare(**target_params_adv)

            if not (source or target):
                return None

            diff_dict = directory_diff(source,
                                       target,
                                       ignore_keys=self.keys_to_ignore,
                                       difference={}
                                       )

            diff_dict.update(self.parce_acl(source, target))

            if not generate_script:
                source = self.get_sql_from_diff(**source_params)
                target = self.get_sql_from_diff(**target_params)

            target_params.update(
                {'data': diff_dict})
            diff = self.get_sql_from_diff(**target_params)
        else:
            source = self.get_sql_from_diff(**source_params)
            target = self.get_sql_from_diff(**target_params)

        if only_diff:
            return diff

        return {'source_ddl': source,
                'target_ddl': target,
                'diff_ddl': diff
                }

    @staticmethod
    def parce_acl(source, target):
        key = 'acl'

        if 'datacl' in source:
            key = 'datacl'
        elif 'relacl' in source:
            key = 'relacl'

        tmp_source = source[key] if\
            key in source and source[key] is not None else []
        tmp_target = copy.deepcopy(target[key]) if\
            key in target and target[key] is not None else []

        diff = {'added': [], 'deleted': []}
        for acl in tmp_source:
            if acl in tmp_target:
                tmp_target.remove(acl)
            elif acl not in tmp_target:
                diff['added'].append(acl)
        diff['deleted'] = tmp_target

        return {key: diff}
