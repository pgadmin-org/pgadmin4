##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import session
from threading import Lock
import secrets

debugger_sessions_lock = Lock()


class DebuggerInstance():
    def __init__(self, trans_id=None):
        if trans_id is None:
            self._trans_id = str(secrets.choice(range(1, 9999999)))
        else:
            self._trans_id = str(trans_id)

        self._function_data = None
        self._debugger_data = None
        self.load_from_session()

    @property
    def trans_id(self):
        """
        trans_id be readonly with no setter
        """
        return self._trans_id

    @property
    def function_data(self):
        return self._function_data

    @function_data.setter
    def function_data(self, data):
        self._function_data = data
        self.update_session()

    @property
    def debugger_data(self):
        return self._debugger_data

    @debugger_data.setter
    def debugger_data(self, data):
        self._debugger_data = data
        self.update_session()

    @staticmethod
    def get_trans_ids():
        if '__debugger_sessions' in session:
            return [trans_id for trans_id in session['__debugger_sessions']]
        else:
            return []

    def load_from_session(self):
        if '__debugger_sessions' in session and \
                str(self.trans_id) in session['__debugger_sessions']:
            trans_data = session['__debugger_sessions'][str(self.trans_id)]
            self.function_data = trans_data.get('function_data', None)
            self.debugger_data = trans_data.get('debugger_data', None)

    def update_session(self):
        with debugger_sessions_lock:
            if '__debugger_sessions' not in session:
                session['__debugger_sessions'] = dict()

            session['__debugger_sessions'][str(self.trans_id)] = dict(
                function_data=self.function_data,
                debugger_data=self.debugger_data
            )

    def clear(self):
        with debugger_sessions_lock:
            if '__debugger_sessions' in session and \
                    str(self.trans_id) in session['__debugger_sessions']:
                session['__debugger_sessions'].pop(str(self.trans_id))
