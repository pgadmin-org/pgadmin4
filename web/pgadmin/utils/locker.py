##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
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

            try:
                # session access requires a request context. Test code that
                # calls start() under app_context (no request) would raise
                # RuntimeError here, leaking the lock since __exit__ is not
                # called when __enter__ raises.
                source = session.get('auth_source_manager', {}).get(
                    'current_source')
                if source == KERBEROS and 'KRB5CCNAME' in session and \
                        self.is_kerberos_conn:
                    environ['KRB5CCNAME'] = session['KRB5CCNAME']
                else:
                    environ.pop('KRB5CCNAME', None)
            except RuntimeError:
                # No request context — nothing Kerberos-related to set up.
                environ.pop('KRB5CCNAME', None)

        return self

    def __exit__(self, type, value, traceback):
        if config.SERVER_MODE:
            environ.pop('KRB5CCNAME', None)
            if self.lock.locked():
                current_app.logger.info("Released a lock.")
                self.lock.release()
