##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Schema collection node helper class"""

import json

from flask import render_template
from pgadmin.browser.collection import CollectionNodeModule
from pgadmin.utils.ajax import internal_server_error
from config import PG_DEFAULT_DRIVER

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

    def get_types(self, conn, condition, add_serials=False):
        """
        Returns data-types including calculation for Length and Precision.

        Args:
            conn: Connection Object
            condition: condition to restrict SQL statement
            add_serials: If you want to serials type
        """
        res = []
        try:
            sql_template_path = ''
            if conn.manager.version >= 90100:
                sql_template_path = 'datatype/sql/9.1_plus'

            SQL = render_template("/".join([sql_template_path,
                                            'get_types.sql']),
                                  condition=condition,
                                  add_serials=add_serials)
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
                    'length': length, 'min_val': min_val, 'max_val': max_val,
                    'is_collatable': row['is_collatable']
                })

        except Exception as e:
            return False, str(e)

        return True, res

    def get_full_type(self, nsp, typname, isDup, numdims, typmod):
        """
        Returns full type name with Length and Precision.

        Args:
            conn: Connection Object
            condition: condition to restrict SQL statement
        """
        needSchema = isDup
        schema = nsp if nsp is not None else ''
        name = ''
        array = ''
        length = ''

        # Above 7.4, format_type also sends the schema name if it's not included
        # in the search_path, so we need to skip it in the typname
        if typname.find(schema + '".') >= 0:
            name = typname[len(schema) + 3]
        elif typname.find(schema + '.') >= 0:
            name = typname[len(schema) + 1]
        else:
            name = typname

        if name.startswith('_'):
            if not numdims:
                numdims = 1
            name = name[1:]

        if name.endswith('[]'):
            if not numdims:
                numdims = 1
            name = name[:-2]

        if name.startswith('"') and name.endswith('"'):
            name = name[1:-1]

        if numdims > 0:
            while numdims:
                array += '[]'
                numdims -= 1

        if typmod != -1:
            length = '('
            if name == 'numeric':
                _len = (typmod - 4) >> 16;
                _prec = (typmod - 4) & 0xffff;
                length += str(_len)
                if (_prec):
                    length += ',' + str(_prec)
            elif name == 'time' or \
                            name == 'timetz' or \
                            name == 'time without time zone' or \
                            name == 'time with time zone' or \
                            name == 'timestamp' or \
                            name == 'timestamptz' or \
                            name == 'timestamp without time zone' or \
                            name == 'timestamp with time zone' or \
                            name == 'bit' or \
                            name == 'bit varying' or \
                            name == 'varbit':
                _prec = 0
                _len = typmod
                length += str(_len)
            elif name == 'interval':
                _prec = 0
                _len = typmod & 0xffff
                length += str(_len)
            elif name == 'date':
                # Clear length
                length = ''
            else:
                _len = typmod - 4
                _prec = 0
                length += str(_len)

            if len(length) > 0:
                length += ')'

        if name == 'char' and schema == 'pg_catalog':
            return '"char"' + array
        elif name == 'time with time zone':
            return 'time' + length + ' with time zone' + array
        elif name == 'time without time zone':
            return 'time' + length + ' without time zone' + array
        elif name == 'timestamp with time zone':
            return 'timestamp' + length + ' with time zone' + array
        elif name == 'timestamp without time zone':
            return 'timestamp' + length + ' without time zone' + array
        else:
            return name + length + array


def trigger_definition(data):
    """
    This function will set the trigger definition details from the raw data

    Args:
        data: Properties data

    Returns:
        Updated properties data with trigger definition
    """

    # Here we are storing trigger definition
    # We will use it to check trigger type definition
    trigger_definition = {
        'TRIGGER_TYPE_ROW': (1 << 0),
        'TRIGGER_TYPE_BEFORE': (1 << 1),
        'TRIGGER_TYPE_INSERT': (1 << 2),
        'TRIGGER_TYPE_DELETE': (1 << 3),
        'TRIGGER_TYPE_UPDATE': (1 << 4),
        'TRIGGER_TYPE_TRUNCATE': (1 << 5),
        'TRIGGER_TYPE_INSTEAD': (1 << 6)
    }

    # Fires event definition
    if data['tgtype'] & trigger_definition['TRIGGER_TYPE_BEFORE']:
        data['fires'] = 'BEFORE'
    elif data['tgtype'] & trigger_definition['TRIGGER_TYPE_INSTEAD']:
        data['fires'] = 'INSTEAD OF'
    else:
        data['fires'] = 'AFTER'

    # Trigger of type definition
    if data['tgtype'] & trigger_definition['TRIGGER_TYPE_ROW']:
        data['is_row_trigger'] = True
    else:
        data['is_row_trigger'] = False

    # Event definition
    if data['tgtype'] & trigger_definition['TRIGGER_TYPE_INSERT']:
        data['evnt_insert'] = True
    else:
        data['evnt_insert'] = False

    if data['tgtype'] & trigger_definition['TRIGGER_TYPE_DELETE']:
        data['evnt_delete'] = True
    else:
        data['evnt_delete'] = False

    if data['tgtype'] & trigger_definition['TRIGGER_TYPE_UPDATE']:
        data['evnt_update'] = True
    else:
        data['evnt_update'] = False

    if data['tgtype'] & trigger_definition['TRIGGER_TYPE_TRUNCATE']:
        data['evnt_truncate'] = True
    else:
        data['evnt_truncate'] = False

    return data


def parse_rule_definition(res):
    """
    This function extracts:
    - events
    - do_instead
    - statements
    - condition
    from the defintion row, forms an array with fields and returns it.
    """
    res_data = []
    try:
        res_data = res['rows'][0]
        data_def = res_data['definition']
        import re
        # Parse data for event
        e_match = re.search(r"ON\s+(.*)\s+TO", data_def)
        event_data = e_match.group(1) if e_match is not None else None
        event = event_data if event_data is not None else ''

        # Parse data for do instead
        inst_match = re.search(r"\s+(INSTEAD)\s+", data_def)
        instead_data = inst_match.group(1) if inst_match is not None else None
        instead = True if instead_data is not None else False

        # Parse data for condition
        condition_match = re.search(r"(?:WHERE)\s+(.*)\s+(?:DO)", data_def)
        condition_data = condition_match.group(1) \
            if condition_match is not None else None
        condition = condition_data if condition_data is not None else ''

        # Parse data for statements
        statement_match = re.search(
            r"(?:DO\s+)(?:INSTEAD\s+)?((.|\n)*)", data_def)
        statement_data = statement_match.group(1) if statement_match else None
        statement = statement_data if statement_data is not None else ''

        # set columns parse data
        res_data['event'] = event.lower().capitalize()
        res_data['do_instead'] = instead
        res_data['statements'] = statement
        res_data['condition'] = condition
    except Exception as e:
        return internal_server_error(errormsg=str(e))
    return res_data


class VacuumSettings:
    """
    VacuumSettings Class.

    This class includes common utilities to fetch and parse
    vacuum defaults settings.

    Methods:
    -------
    * get_vacuum_table_settings(conn):
      - Returns vacuum table defaults settings.

    * get_vacuum_toast_settings(conn):
      - Returns vacuum toast defaults settings.

    * parse_vacuum_data(conn, result, type):
      - Returns result of an associated array
        of fields name, label, value and column_type.
        It adds name, label, column_type properties of table/toast
        vacuum into the array and returns it.
        args:
        * conn - It is db connection object
        * result - Resultset of vacuum data
        * type - table/toast vacuum type

    """

    def __init__(self):
        pass

    def get_vacuum_table_settings(self, conn):
        """
        Fetch the default values for autovacuum
        fields, return an array of
          - label
          - name
          - setting
        values
        """

        # returns an array of name & label values
        vacuum_fields = render_template("vacuum_settings/vacuum_fields.json")

        vacuum_fields = json.loads(vacuum_fields)

        # returns an array of setting & name values
        vacuum_fields_keys = "'" + "','".join(
            vacuum_fields['table'].keys()) + "'"
        SQL = render_template('vacuum_settings/sql/vacuum_defaults.sql',
                              columns=vacuum_fields_keys)
        status, res = conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            row_name = row['name']
            row['name'] = vacuum_fields['table'][row_name][0]
            row['label'] = vacuum_fields['table'][row_name][1]
            row['column_type'] = vacuum_fields['table'][row_name][2]

        return res

    def get_vacuum_toast_settings(self, conn):
        """
        Fetch the default values for autovacuum
        fields, return an array of
          - label
          - name
          - setting
        values
        """

        # returns an array of name & label values
        vacuum_fields = render_template("vacuum_settings/vacuum_fields.json")

        vacuum_fields = json.loads(vacuum_fields)

        # returns an array of setting & name values
        vacuum_fields_keys = "'" + "','".join(
            vacuum_fields['toast'].keys()) + "'"
        SQL = render_template('vacuum_settings/sql/vacuum_defaults.sql',
                              columns=vacuum_fields_keys)
        status, res = conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        for row in res['rows']:
            row_name = row['name']
            row['name'] = vacuum_fields['toast'][row_name][0]
            row['label'] = vacuum_fields['toast'][row_name][1]
            row['column_type'] = vacuum_fields['table'][row_name][2]

        return res

    def parse_vacuum_data(self, conn, result, type):
        """
        This function returns result of an associated array
        of fields name, label, value and column_type.
        It adds name, label, column_type properties of table/toast
        vacuum into the array and returns it.
        args:
        * conn - It is db connection object
        * result - Resultset of vacuum data
        * type - table/toast vacuum type
        """

        # returns an array of name & label values
        vacuum_fields = render_template("vacuum_settings/vacuum_fields.json")

        vacuum_fields = json.loads(vacuum_fields)

        # returns an array of setting & name values
        vacuum_fields_keys = "'" + "','".join(
            vacuum_fields[type].keys()) + "'"
        SQL = render_template('vacuum_settings/sql/vacuum_defaults.sql',
                              columns=vacuum_fields_keys)
        status, res = conn.execute_dict(SQL)

        if not status:
            return internal_server_error(errormsg=res)

        if type is 'table':
            for row in res['rows']:
                row_name = row['name']
                row['name'] = vacuum_fields[type][row_name][0]
                row['label'] = vacuum_fields[type][row_name][1]
                row['column_type'] = vacuum_fields[type][row_name][2]
                if result[row['name']] is not None:
                    if row['column_type'] == 'number':
                        value = float(result[row['name']])
                    else:
                        value = int(result[row['name']])
                    row['value'] = row['setting'] = value

        elif type is 'toast':
            for row in res['rows']:
                row_old_name = row['name']
                row_name = 'toast_{0}'.format(vacuum_fields[type][row_old_name][0])
                row['name'] = vacuum_fields[type][row_old_name][0]
                row['label'] = vacuum_fields[type][row_old_name][1]
                row['column_type'] = vacuum_fields[type][row_old_name][2]
                if result[row_name] and result[row_name] is not None:
                    if row['column_type'] == 'number':
                        value = float(result[row_name])
                    else:
                        value = int(result[row_name])
                    row['value'] = row['setting'] = value

        return res['rows']
