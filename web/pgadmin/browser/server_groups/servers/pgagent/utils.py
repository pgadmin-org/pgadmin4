##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""pgagent helper utilities"""


def format_boolean_array(value):
    """
    Converts to proper array data for sql
    Args:
        value: data to be converted

    Returns:
        Converted data
    """
    if not isinstance(value, list):
        return value.replace("[", "{").replace("]", "}")
    return value


def format_schedule_data(data):
    """
    This function is used to format the schedule data. If data is not an
    instance of list then format
    :param data:
    :return:
    """

    if 'jscminutes' in data and data['jscminutes'] is not None:
        data['jscminutes'] = format_boolean_array(data['jscminutes'])
    if 'jschours' in data and data['jschours'] is not None:
        data['jschours'] = format_boolean_array(data['jschours'])
    if 'jscweekdays' in data and data['jscweekdays'] is not None:
        data['jscweekdays'] = format_boolean_array(data['jscweekdays'])
    if 'jscmonthdays' in data and data['jscmonthdays'] is not None:
        data['jscmonthdays'] = format_boolean_array(data['jscmonthdays'])
    if 'jscmonths' in data and data['jscmonths'] is not None:
        data['jscmonths'] = format_boolean_array(data['jscmonths'])

    return data
