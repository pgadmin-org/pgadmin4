##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema diff object comparison."""

from flask import render_template
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import internal_server_error
from pgadmin.tools.schema_diff.directory_compare import compare_dictionaries


class SchemaDiffObjectCompare:

    keys_to_ignore = ['oid', 'oid-2', 'is_sys_obj', 'schema']

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
                         'did': kwargs.get('source_did')}
        target_params = {'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did')}

        group_name = kwargs.get('group_name')
        source_schema_name = kwargs.get('source_schema_name', None)
        source = {}
        target = {}

        status, target_schema = self.get_schema(kwargs.get('target_sid'),
                                                kwargs.get('target_did'),
                                                kwargs.get('target_scid'))
        if not status:
            return internal_server_error(errormsg=target_schema)

        if group_name == 'Database Objects':
            source = self.fetch_objects_to_compare(**source_params)
            target = self.fetch_objects_to_compare(**target_params)
        else:
            source_params['scid'] = kwargs.get('source_scid')
            target_params['scid'] = kwargs.get('target_scid')

            if 'scid' in source_params and source_params['scid'] is not None:
                source = self.fetch_objects_to_compare(**source_params)

            if 'scid' in target_params and target_params['scid'] is not None:
                target = self.fetch_objects_to_compare(**target_params)

        # If both the dict have no items then return None.
        if not (source or target) or (
                len(source) <= 0 and len(target) <= 0):
            return None

        return compare_dictionaries(view_object=self,
                                    source_params=source_params,
                                    target_params=target_params,
                                    target_schema=target_schema,
                                    source_dict=source,
                                    target_dict=target,
                                    node=self.node_type,
                                    node_label=self.blueprint.collection_label,
                                    group_name=group_name,
                                    ignore_keys=self.keys_to_ignore,
                                    source_schema_name=source_schema_name)

    def ddl_compare(self, **kwargs):
        """
        This function will compare object properties and
         return the difference of SQL
        """

        source_params = {'gid': 1,
                         'sid': kwargs.get('source_sid'),
                         'did': kwargs.get('source_did'),
                         'oid': kwargs.get('source_oid')
                         }

        target_params = {'gid': 1,
                         'sid': kwargs.get('target_sid'),
                         'did': kwargs.get('target_did'),
                         'oid': kwargs.get('target_oid')
                         }

        source_scid = kwargs.get('source_scid')
        if source_scid is not None and source_scid != 0:
            source_params['scid'] = source_scid

        target_scid = kwargs.get('target_scid')
        if target_scid is not None and target_scid != 0:
            target_params['scid'] = target_scid

        source = self.get_sql_from_diff(**source_params)
        target = self.get_sql_from_diff(**target_params)

        return {'source_ddl': source,
                'target_ddl': target,
                'diff_ddl': ''
                }
