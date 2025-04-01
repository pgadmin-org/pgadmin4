##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""dbms job schedular utilities"""
from pgadmin.browser.server_groups.servers.databases.schemas.functions.utils \
    import format_arguments_from_db

MONTHS_MAPPING = dict(
    JAN='1', FEB='2', MAR='3', APR='4', MAY='5', JUN='6',
    JUL='7', AUG='8', SEP='9', OCT='10', NOV='11', DEC='12'
)
WEEKDAY_MAPPING = dict(
    MON='1', TUE='2', WED='3', THU='4', FRI='5', SAT='6', SUN='7'
)
# Required for reverse mapping
MONTHS_MAPPING_REV = {v: k for k, v in MONTHS_MAPPING.items()}
WEEKDAY_MAPPING_REV = {v: k for k, v in WEEKDAY_MAPPING.items()}


def resolve_calendar_string(calendar_string):
    """
    Converts calendar_string to data
    Args:
        calendar_string: string to be converted
    """
    freq = None
    by_date = None
    by_month = []
    by_monthday = []
    by_weekday = []
    by_hour = []
    by_minute = []

    if calendar_string is not None and len(calendar_string) > 0:
        # First split on the basis of semicolon
        cal_list = calendar_string.split(';')
        for token in cal_list:
            # Split on the basis of '=' operator as tokens are
            # like FREQ=MONTHLY
            if not token.strip():
                continue
            [token_name, token_value] = token.split('=')
            token_name = token_name.strip().upper()
            token_value = token_value.strip()

            if token_name == 'FREQ':
                freq = token_value
            elif token_name == 'BYDATE':
                by_date = token_value
            elif token_name == 'BYMONTH':
                by_month = [MONTHS_MAPPING.get(v.upper(), v)
                            for v in token_value.split(',')]
            elif token_name == 'BYMONTHDAY':
                by_monthday = token_value.split(',')
            elif token_name == 'BYDAY':
                by_weekday = [WEEKDAY_MAPPING.get(v.upper(), v)
                              for v in token_value.split(',')]
            elif token_name == 'BYHOUR':
                by_hour = token_value.split(',')
            elif token_name == 'BYMINUTE':
                by_minute = token_value.split(',')

    return freq, by_date, by_month, by_monthday, by_weekday, by_hour, by_minute


def create_calendar_string(frequency, date, months, monthdays, weekdays,
                           hours, minutes):
    """
    Create calendar string based on the given value

    Args:
        frequency:
        date:
        months:
        monthdays:
        weekdays:
        hours:
        minutes:
    """
    calendar_str = ''

    if frequency is not None:
        calendar_str = 'FREQ=' + frequency + ';'
    if date is not None:
        calendar_str += 'BYDATE=' + str(date) + ';'
    if months is not None and isinstance(months, list) and len(months) > 0:
        months = [MONTHS_MAPPING_REV.get(v, v) for v in months]
        calendar_str += 'BYMONTH=' + ','.join(months) + ';'
    if (monthdays is not None and isinstance(monthdays, list) and
            len(monthdays) > 0):
        calendar_str += 'BYMONTHDAY=' + ','.join(monthdays) + ';'
    if (weekdays is not None and isinstance(weekdays, list) and
            len(weekdays) > 0):
        weekdays = [WEEKDAY_MAPPING_REV.get(v, v) for v in weekdays]
        calendar_str += 'BYDAY=' + ','.join(weekdays) + ';'
    if hours is not None and isinstance(hours, list) and len(hours) > 0:
        calendar_str += 'BYHOUR=' + ','.join(hours) + ';'
    if minutes is not None and isinstance(minutes, list) and len(minutes) > 0:
        calendar_str += 'BYMINUTE=' + ','.join(minutes)

    return calendar_str


def get_formatted_program_args(template_path, conn, data):
    """
    This function is used to formate the program arguments.
    Args:
        template_path:
        conn:
        data:

    Returns:

    """
    if 'jsprnoofargs' in data and data['jsprnoofargs'] > 0:
        frmtd_params, _ = format_arguments_from_db(
            template_path, conn, data)

        if 'arguments' in frmtd_params:
            new_args = [item for item in frmtd_params['arguments']
                        if item['argname'] is not None]
            data['jsprarguments'] = new_args
