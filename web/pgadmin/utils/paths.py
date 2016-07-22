##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""This file contains functions fetching different utility paths."""

import os

from flask_security import current_user, login_required

import config


@login_required
def get_storage_directory():
    if config.SERVER_MODE is not True:
        return None

    storage_dir = getattr(
        config, 'STORAGE_DIR',
        os.path.join(
            os.path.realpath(
                os.path.expanduser('~/.pgadmin/')
            ), 'storage'
        )
    )

    if storage_dir is None:
        return None

    username = current_user.email.split('@')[0]
    if len(username) == 0 or username[0].isdigit():
        username = 'pga_user_' + username

    storage_dir = os.path.join(storage_dir, username)

    if not os.path.exists(storage_dir):
        os.makedirs(storage_dir, int('700', 8))

    return storage_dir


def init_app(app):
    if config.SERVER_MODE is not True:
        return None

    storage_dir = getattr(
        config, 'STORAGE_DIR',
        os.path.join(
            os.path.realpath(
                os.path.expanduser('~/.pgadmin/')
            ), 'storage'
        )
    )

    if storage_dir and not os.path.isdir(storage_dir):
        if os.path.exists(storage_dir):
            raise Exception(
                'The path specified for the storage directory is not a directory.'
            )
        os.makedirs(storage_dir, int('700', 8))

    if storage_dir and not os.access(storage_dir, os.W_OK | os.R_OK):
        raise Exception(
            'The user does not have permission to read and write to the specified storage directory.'
        )
