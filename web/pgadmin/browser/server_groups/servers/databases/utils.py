##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Database helper utilities"""


def parse_sec_labels_from_db(db_sec_labels):
    """
    Function to format the output for security label.

    Args:
        db_sec_labels : Security Label Array in (provider=label) format

    Returns:
        Security Label Object in below format:
            {'seclabels': [{'provider': 'provider_name', 'label':
            'label'},...]}
    """
    sec_lbls = []

    if db_sec_labels is not None:
        for sec in db_sec_labels:
            import re
            sec = re.search(r'([^=]+)=(.*$)', sec)
            sec_lbls.append({
                'provider': sec.group(1),
                'label': sec.group(2)
            })

    return {"seclabels": sec_lbls}


def parse_variables_from_db(db_variables):
    """
    Function to format the output for variables.

    Args:
        db_variables: Variable object

            Expected Object Format:
                [
                    {
                    'setconfig': Variable Config Parameters,
                    'user_name': User Name,
                    'db_name': Database Name
                    },...
                ]
            where:
                user_name and database are optional
    Returns:
        Variable Object in below format:
            {
            'variables': [
                {'name': 'var_name', 'value': 'var_value',
                'user_name': 'user_name', 'database': 'database_name'},
                ...]
            }
            where:
                user_name and database are optional
    """
    variables_lst = []

    if db_variables is not None:
        for row in db_variables:
            if 'setconfig' in row and row['setconfig'] is not None:
                for d in row['setconfig']:
                    var_name, var_value = d.split("=")
                    var_dict = _check_var_type(var_value, var_name, row)
                    variables_lst.append(var_dict)

    return {"variables": variables_lst}


def _check_var_type(var_value, var_name, row):
    """
    Function for check variable type and return dictionary in the format
    {
        "name": String,
        "value": String
    }
    var_value: Input variable value
    var_name: Input variable name
    row: data
    return: Variable dictionary.
    """

    # Because we save as boolean string in db so it needs
    # conversion
    if var_value == 'false' or var_value == 'off':
        var_value = False

    var_dict = {
        'name': var_name,
        'value': var_value
    }
    if 'user_name' in row:
        var_dict['role'] = row['user_name']
    if 'db_name' in row:
        var_dict['database'] = row['db_name']

    return var_dict


def get_attributes_from_db_info(manager, kwargs):

    """
    Function to get attributes from db_info, send default values if not found.
    :param manager: DB manager
    :param kwargs: user input
    :return: db_info attributes
    """

    if 'did' in kwargs and kwargs['did'] in manager.db_info:

        datlastsysoid = manager.db_info[kwargs['did']]['datlastsysoid'] \
            if 'datlastsysoid' in manager.db_info[kwargs['did']] else 0
        datistemplate = manager.db_info[kwargs['did']]['datistemplate'] \
            if 'datistemplate' in manager.db_info[kwargs['did']] else False
        datallowconn = manager.db_info[kwargs['did']]['datallowconn'] \
            if 'datallowconn' in manager.db_info[kwargs['did']] else False

        return datlastsysoid, datistemplate, datallowconn
    else:
        return 0, False, True
