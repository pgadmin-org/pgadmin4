##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import current_app, render_template
from flask_babelex import gettext

from pgadmin.utils.driver import get_driver
from config import PG_DEFAULT_DRIVER


def get_node_blueprint(node_type):
    blueprint = None
    node_type = 'NODE-' + node_type
    if node_type in current_app.blueprints:
        blueprint = current_app.blueprints[node_type]

    return blueprint


class SearchObjectsHelper:
    def __init__(self, sid, did, show_system_objects=False, node_types=None):
        self.sid = sid
        self.did = did
        self.show_system_objects = show_system_objects
        self.manager = get_driver(
            PG_DEFAULT_DRIVER
        ).connection_manager(sid)

        self._all_node_types = [
            'cast', 'fts_dictionary', 'check_constraint',
            'exclusion_constraint', 'foreign_key',
            'primary_key', 'unique_constraint', 'constraints', 'trigger',
            'table', 'compound_trigger', 'rule', 'column', 'partition',
            'index', 'type', 'domain', 'domain_constraints', 'schema',
            'synonym', 'sequence', 'edbvar', 'edbfunc', 'edbproc', 'package',
            'foreign_table', 'fts_parser', 'function', 'procedure',
            'trigger_function', 'fts_template', 'collation', 'view', 'mview',
            'fts_configuration', 'extension', 'language',
            'event_trigger', 'foreign_server', 'user_mapping',
            'foreign_data_wrapper'
        ] if node_types is None else node_types

    @property
    def all_node_types(self):
        return self._all_node_types

    def get_template_path(self):
        return 'search_objects/sql/{0}/#{1}#'.format(
            self.manager.server_type, self.manager.version)

    def get_show_node_prefs(self):
        return_types = {}
        for node_type in self.all_node_types:
            blueprint = get_node_blueprint(node_type)
            if blueprint is None:
                continue

            return_types[node_type] = blueprint.show_node
        return return_types

    def get_supported_types(self, skip_check=False):
        return_types = {}
        for node_type in self.all_node_types:
            blueprint = get_node_blueprint(node_type)
            if blueprint is None:
                continue

            if blueprint.backend_supported(self.manager, is_catalog=False,
                                           did=self.did) or skip_check:
                if node_type in ['edbfunc', 'edbproc']:
                    return_types[node_type] =\
                        gettext('Package {0}').format(
                            blueprint.collection_label)
                else:
                    return_types[node_type] = blueprint.collection_label

        return return_types

    def get_sql(self, sql_file, **kwargs):
        return render_template(
            "/".join([self.get_template_path(), sql_file]),
            **kwargs
        )

    def finalize_id_path(self, path, base_path):
        if base_path is not None:
            path = '{0}/{1}'.format(base_path, path)

        return path

    def search(self, text, obj_type=None):
        conn = self.manager.connection(did=self.did)
        last_system_oid = (self.manager.db_info[self.did])['datlastsysoid'] \
            if self.manager.db_info is not None and self.did in \
            self.manager.db_info else 0

        show_node_prefs = self.get_show_node_prefs()
        node_labels = self.get_supported_types(skip_check=True)
        # escape the single quote from search text
        text = text.replace("'", "''")

        # Column catalog_level has values as
        # N - Not a catalog schema
        # D - Catalog schema with DB support - pg_catalog
        # O - Catalog schema with object support only - info schema, dbo, sys
        status, res = conn.execute_dict(
            self.get_sql('search.sql', search_text=text, obj_type=obj_type,
                         show_system_objects=self.show_system_objects,
                         show_node_prefs=show_node_prefs, _=gettext,
                         last_system_oid=last_system_oid)
        )

        if not status:
            return status, res

        ret_val = [
            {
                'name': row['obj_name'],
                'type': row['obj_type'],
                'type_label': node_labels[row['obj_type']],
                'path': row['obj_path'],
                'show_node': row['show_node'],
                'other_info': row['other_info'],
                'catalog_level': row['catalog_level'],
            }
            for row in res['rows']
        ]
        return True, ret_val
