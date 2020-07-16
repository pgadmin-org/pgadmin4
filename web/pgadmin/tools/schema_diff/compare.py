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
from flask_babelex import gettext
from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER
from pgadmin.utils.ajax import internal_server_error
from pgadmin.tools.schema_diff.directory_compare import compare_dictionaries
from pgadmin.tools.schema_diff.model import SchemaDiffModel


class SchemaDiffObjectCompare:

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

        ignore_whitespaces = kwargs.get('ignore_whitespaces')
        status, target_schema = self.get_schema(kwargs.get('target_sid'),
                                                kwargs.get('target_did'),
                                                kwargs.get('target_scid')
                                                )
        if not status:
            return internal_server_error(errormsg=target_schema)

        source = self.fetch_objects_to_compare(**source_params)

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
                                    ignore_whitespaces=ignore_whitespaces,
                                    ignore_keys=self.keys_to_ignore)

    def ddl_compare(self, **kwargs):
        """
        This function will compare object properties and
         return the difference of SQL
        """

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

        source = self.get_sql_from_diff(**source_params)
        target = self.get_sql_from_diff(**target_params)

        return {'source_ddl': source,
                'target_ddl': target,
                'diff_ddl': ''
                }
