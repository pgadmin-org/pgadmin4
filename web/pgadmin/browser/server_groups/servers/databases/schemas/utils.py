##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema collection node helper class"""

from pgadmin.browser.collection import CollectionNodeModule


class SchemaChildModule(CollectionNodeModule):
    """
    Base class for the schema child node.

    Some of the node may be/may not be allowed in certain catalog nodes.
    i.e.
    Do not show the schema objects under pg_catalog, pgAgent, etc.

    Looks at two parameters CATALOG_DB_SUPPORTED, SUPPORTED_SCHEMAS.

    Schema child objects like catalog_objects are only supported for
    'pg_catalog', and objects like 'jobs' & 'schedules' are only supported for
    the 'pgagent' schema.

    For catalog_objects, we should set:
        CATALOG_DB_SUPPORTED = False
        SUPPORTED_SCHEMAS = ['pg_catalog']

    For jobs & schedules, we should set:
        CATALOG_DB_SUPPORTED = False
        SUPPORTED_SCHEMAS = ['pgagent']
    """
    CATALOG_DB_SUPPORTED = True
    SUPPORTED_SCHEMAS = None

    def BackendSupported(self, manager, **kwargs):
        return (
            (
                kwargs['is_catalog'] and ((
                    self.CATALOG_DB_SUPPORTED and kwargs['db_support']
                ) or (
                    not self.CATALOG_DB_SUPPORTED and
                    not kwargs['db_support'] and
                    (
                        self.SUPPORTED_SCHEMAS is None or (
                            kwargs['schema_name'] in self.SUPPORTED_SCHEMAS
                        )
                    )
                ))
            ) or (
                not kwargs['is_catalog'] and self.CATALOG_DB_SUPPORTED
            )
        ) and CollectionNodeModule.BackendSupported(
            self, manager, **kwargs
        )
