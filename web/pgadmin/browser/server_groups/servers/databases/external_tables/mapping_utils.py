##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import re


def map_column_from_database(column_information):
    return {
        'name': column_information['name'],
        'type': column_information['cltype']
    }


def map_table_information_from_database(table_information):
    format_type = map_format_type(table_information['fmttype'])
    return {
        'uris': sql_array_notation_to_array(table_information['urilocation']),
        'isWeb': is_web_table(
            table_information['urilocation'],
            table_information['command']
        ),
        'executionLocation': map_execution_location(
            table_information['execlocation']),
        'formatType': format_type,
        'formatOptions': format_options(format_type,
                                        table_information['fmtopts']),
        'command': table_information['command'],
        'rejectLimit': table_information['rejectlimit'],
        'rejectLimitType': table_information['rejectlimittype'],
        'errorTableName': table_information['errtblname'],
        'erroToFile': table_information['errortofile'],
        'pgEncodingToChar': table_information['pg_encoding_to_char'],
        'writable': table_information['writable'],
        'options': table_information['options'],
        'distribution': table_information['distribution'],
        'name': table_information['name'],
        'namespace': table_information['namespace']
    }


def map_execution_location(execution_location):
    stripped_execution_location = execution_location[0].lstrip('{').rstrip('}')
    if stripped_execution_location.startswith('HOST:'):
        return {
            'type': 'host',
            'value': stripped_execution_location.replace('HOST:', '').strip()
        }
    elif stripped_execution_location == 'PER_HOST':
        return {'type': 'per_host', 'value': None}
    elif stripped_execution_location == "MASTER_ONLY":
        return {'type': 'master_only', 'value': None}
    elif stripped_execution_location == "ALL_SEGMENTS":
        return {'type': 'all_segments', 'value': None}
    elif stripped_execution_location.startswith("SEGMENT_ID:"):
        return {
            'type': 'segment',
            'value': stripped_execution_location.replace('SEGMENT_ID:', '')
                                                .strip()
        }
    elif stripped_execution_location.startswith("TOTAL_SEGS:"):
        return {
            'type': 'segments',
            'value': stripped_execution_location.replace('TOTAL_SEGS:', '')
                                                .strip()
        }


def map_format_type(format_type):
    if format_type == 'b':
        return 'custom'
    elif format_type == 'a':
        return 'avro'
    elif format_type == 't':
        return 'text'
    elif format_type == 'p':
        return 'parquet'
    else:
        return 'csv'


def is_web_table(uris, command):
    if uris is None and command is None:
        return False
    if command is not None:
        return True
    return re.search('^https?:\\/\\/',
                     sql_array_notation_to_array(uris)[0]) is not None


def format_options(format_type, options):
    if options is None:
        return None
    if len(options) == 0:
        return options

    result_options = tokenize_options(options)
    all_keys = sorted(result_options)
    if format_type not in ['csv', 'text']:
        return ','.join([
            '%s = %s' % (key, result_options[key]) for key in all_keys
        ])
    else:
        return ' '.join([
            '%s %s' % (key, result_options[key]) for key in all_keys
        ])


def sql_array_notation_to_array(sql_result):
    if sql_result is None:
        return None
    if sql_result[0] == '{':
        return sql_result[1:-1].split(',')
    return sql_result


def tokenize_options(options):
    in_key = True
    in_value = False
    current_key = ''
    current_value = ''
    tokens = {}
    for index in range(0, len(options)):
        if is_end_of_key(in_key, options, index, current_key):
            in_key = False
        elif is_not_end_of_key(in_key, index, options):
            current_key += options[index]
        elif is_start_of_value(in_value, index, options):
            in_value = True
            current_value = ''
        elif is_end_of_value(in_value, index, options):
            in_value = False
            in_key = True
            tokens[current_key] = '$$' + current_value + '$$'
            current_key = ''
            current_value = ''
        elif in_value:
            current_value += options[index]
    return tokens


def found_apostrophe_inside_value(in_value, index, options):
    return in_value and options[index] == '\''


def is_end_of_value(in_value, index, options):
    return in_value and options[index] == '\'' and (
        index == (len(options) - 1) or options[index + 1] == ' ')


def is_start_of_value(in_value, index, options):
    return not in_value and options[index] == '\''


def is_not_end_of_key(in_key, index, options):
    return in_key and options[index] != ' '


def is_end_of_key(in_key, options, index, current_key):
    return in_key and options[index] == ' ' and len(current_key) > 0
