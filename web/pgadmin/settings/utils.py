##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask_login import current_user
import functools
import json
from pgadmin.model import Setting


def get_dialog_type(file_type):
    """
    This function return dialog type
    :param file_type:
    :return: dialog type.
    """
    if 'pgerd' in file_type:
        return 'erd_file_type'
    elif 'backup' in file_type:
        return 'backup_file_type'
    elif 'csv' in file_type and 'txt' in file_type:
        return 'import_export_file_type'
    elif 'csv' in file_type and 'txt' not in file_type:
        return 'storage_manager_file_type'
    else:
        return 'sqleditor_file_format'


def get_file_type_setting(file_types):
    """
    This function return last file format setting based on file types
    :param file_types:
    :return: file format setting.
    """
    file_type = get_dialog_type(list(file_types))

    data = Setting.query.filter_by(
        user_id=current_user.id, setting=file_type).first()
    if data is None:
        return '*'
    else:
        return data.value


def with_object_filters(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        data = Setting.query.filter_by(
            user_id=current_user.id, setting='Object Explorer/Filter').first()
        if not data or data.value is None:
            data = {}
        else:
            data = json.loads(data.value)

        return f(*args, **kwargs, object_filters=data)

    return wrapped
