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
from pgadmin.browser.utils import PGChildNodeView
from flask import render_template

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


class DataTypeReader:
    """
    DataTypeReader Class.

    This class includes common utilities for data-types.

    Methods:
    -------
    * get_types(conn, condition):
      - Returns data-types on the basis of the condition provided.
    """

    def get_types(self, conn, condition):
        """
        Returns data-types including calculation for Length and Precision.

        Args:
            conn: Connection Object
            condition: condition to restrict SQL statement
        """
        res = []
        try:
            sql_template_path = ''
            if conn.manager.version >= 90100:
                sql_template_path = 'datatype/sql/9.1_plus'

            SQL = render_template("/".join([sql_template_path,
                                            'get_types.sql']),
                                  condition=condition)
            status, rset = conn.execute_2darray(SQL)
            if not status:
                return status, rset

            for row in rset['rows']:
                # Attach properties for precision
                # & length validation for current type
                precision = False
                length = False
                min_val = 0
                max_val = 0

                # Check against PGOID for specific type
                if row['elemoid']:
                    if row['elemoid'] in (1560, 1561, 1562, 1563, 1042, 1043,
                                          1014, 1015):
                        typeval = 'L'
                    elif row['elemoid'] in (1083, 1114, 1115, 1183, 1184, 1185,
                                            1186, 1187, 1266, 1270):
                        typeval = 'D'
                    elif row['elemoid'] in (1231, 1700):
                        typeval = 'P'
                    else:
                        typeval = ' '

                # Set precision & length/min/max values
                if typeval == 'P':
                    precision = True

                if precision or typeval in ('L', 'D'):
                    length = True
                    min_val = 0 if typeval == 'D' else 1
                    if precision:
                        max_val = 1000
                    elif min_val:
                        # Max of integer value
                        max_val = 2147483647
                    else:
                        max_val = 10

                res.append({
                    'label': row['typname'], 'value': row['typname'],
                    'typval': typeval, 'precision': precision,
                    'length': length, 'min_val': min_val, 'max_val': max_val
                })

        except Exception as e:
            return False, str(e)

        return True, res
