##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""pgagent helper utilities"""
from flask import render_template


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


def format_step_data(job_id, data, has_connection_str, conn, template_path):
    """
    This function is used to format the step data. If data is not an
    instance of list then format
    :param job_id: Job ID
    :param data: a step data
    :param has_connection_str: has pgagent connection str
    :param conn: Connection obj
    :param conn: SQL template path
    """
    if 'jstconntype' not in data and \
        ('jstdbname' in data or
         'jstconnstr' in data) and has_connection_str:
        status, rset = conn.execute_dict(
            render_template(
                "/".join([template_path, 'steps.sql']),
                jid=job_id,
                jstid=data['jstid'],
                conn=conn,
                has_connstr=has_connection_str
            )
        )
        if not status:
            return False, rset

        row = rset['rows'][0]
        data['jstconntype'] = row['jstconntype']
        if row['jstconntype']:
            data['jstdbname'] = data.get(
                'jstdbname', row['jstdbname'])
        else:
            data['jstconnstr'] = data.get(
                'jstconnstr', row['jstconnstr'])

    return True, None
