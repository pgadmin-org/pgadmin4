##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask_babel import gettext


class AllPermissionTypes:
    object_register_server = 'object_register_server'
    tools_erd_tool = 'tools_erd_tool'
    tools_query_tool = 'tools_query_tool'
    tools_debugger = 'tools_debugger'
    tools_psql_tool = 'tools_psql_tool'
    tools_backup = 'tools_backup'
    tools_restore = 'tools_restore'
    tools_import_export_data = 'tools_import_export_data'
    tools_import_export_servers = 'tools_import_export_servers'
    tools_search_objects = 'tools_search_objects'
    tools_maintenance = 'tools_maintenance'
    tools_schema_diff = 'tools_schema_diff'
    tools_grant_wizard = 'tools_grant_wizard'
    storage_add_folder = 'storage_add_folder'
    storage_remove_folder = 'storage_remove_folder'

    @staticmethod
    def list():
        return filter(lambda x: not x.startswith('_'),
                      AllPermissionTypes.__dict__.keys())


class AllPermissionCategories:
    object_explorer = 'Object Explorer'
    tools = 'Tools'
    storage_manager = 'Storage Manager'


class PgAdminPermissions:
    _all_permissions = []

    def __init__(self):
        self.add_permission(
            AllPermissionCategories.object_explorer,
            AllPermissionTypes.object_register_server,
            gettext("Register/remove server")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_query_tool,
            gettext("Query tool")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_debugger,
            gettext("Debugger")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_psql_tool,
            gettext("PSQL tool")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_backup,
            gettext("Backup tool (including server and globals)")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_restore,
            gettext("Restore tool")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_import_export_data,
            gettext("Import/export data")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_import_export_servers,
            gettext("Import/export servers")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_search_objects,
            gettext("Search objects")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_maintenance,
            gettext("Maintenance")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_schema_diff,
            gettext("Schema diff")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_grant_wizard,
            gettext("Grant wizard")
        )
        self.add_permission(
            AllPermissionCategories.tools,
            AllPermissionTypes.tools_erd_tool,
            gettext("ERD tool")
        )
        self.add_permission(
            AllPermissionCategories.storage_manager,
            AllPermissionTypes.storage_add_folder,
            gettext("Add folder")
        )
        self.add_permission(
            AllPermissionCategories.storage_manager,
            AllPermissionTypes.storage_remove_folder,
            gettext("Delete file/folder")
        )

    def add_permission(self, category: str, permission: str, label: str):
        self._all_permissions.append({
            "category": category,
            "name": permission,
            "label": label,
        })

    @property
    def all_permissions(self):
        return sorted(
            self._all_permissions,
            key=lambda x: (
                x['category'],
                x['label']))
