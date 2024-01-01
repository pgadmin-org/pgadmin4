##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""
Kerberos Environment Locker class
"""

from threading import Lock
from os import environ
from flask import session, current_app

import config
from pgadmin.utils.constants import KERBEROS


class ConnectionLocker:
    """Implementing lock while setting/unsetting
     the Kerberos environ variables."""
    lock = Lock()

    def __init__(self, _is_kerberos_conn=False):
        self.is_kerberos_conn = _is_kerberos_conn

    def __enter__(self):
        if config.SERVER_MODE:
            current_app.logger.info("Waiting for a lock.")
            self.lock.acquire()
            current_app.logger.info("Acquired a lock.")

            if 'auth_source_manager' in session and \
                session['auth_source_manager']['current_source'] == \
                KERBEROS and 'KRB5CCNAME' in session \
                    and self.is_kerberos_conn:
                environ['KRB5CCNAME'] = session['KRB5CCNAME']
            else:
                environ.pop('KRB5CCNAME', None)

        return self

    def __exit__(self, type, value, traceback):
        if config.SERVER_MODE:
            environ.pop('KRB5CCNAME', None)
            if self.lock.locked():
                current_app.logger.info("Released a lock.")
                self.lock.release()
