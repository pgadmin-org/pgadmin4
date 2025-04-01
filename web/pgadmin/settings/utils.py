from flask_login import current_user
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
