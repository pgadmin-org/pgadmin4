##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator
import pgadmin.tools.sqleditor as sqleditor


class _FakeSession(dict):
    """A Flask session stand-in with its own session id."""
    def __init__(self, sid):
        super().__init__()
        self.sid = sid


class TestAutocompletePerSession(BaseTestGenerator):
    """
    The cached SQLAutoComplete object holds a live connection, so it must
    only ever be used by the session that created it, even when another
    session picks the same transaction id.
    """
    scenarios = [
        ('Autocomplete objects are not shared between sessions', dict()),
    ]

    TRANS_ID = 4242

    def setUp(self):
        self.saved_objects = dict(sqleditor.auto_complete_objects)
        sqleditor.auto_complete_objects.clear()
        # One connection per session; the transaction id is the same.
        self.conns = {'session-a': MagicMock(name='conn-a'),
                      'session-b': MagicMock(name='conn-b')}

    def tearDown(self):
        sqleditor.auto_complete_objects.clear()
        sqleditor.auto_complete_objects.update(self.saved_objects)

    def _fake_auto_complete(self, sid, did, conn):
        obj = MagicMock()
        obj.conn = conn
        obj.get_completions.return_value = conn._mock_name
        return obj

    def _call(self, view, sess, *args):
        conn = self.conns[sess.sid]
        trans_obj = MagicMock(sid=1, did=2)
        with self.app.test_request_context(
                data=json.dumps(['SELECT * FROM ', 'SELECT * FROM '])), \
            patch.object(sqleditor, 'session', sess), \
            patch.object(sqleditor, 'check_and_upgrade_to_qt',
                         return_value=(False, None)), \
            patch.object(sqleditor, 'check_transaction_status',
                         return_value=(True, None, conn, trans_obj, {})), \
            patch.object(sqleditor, 'SQLAutoComplete',
                         side_effect=self._fake_auto_complete):
            response = view.__wrapped__(*args)
        if hasattr(response, 'data'):
            return json.loads(response.data.decode('utf-8'))['data']
        return response

    def runTest(self):
        session_a = _FakeSession('session-a')
        session_b = _FakeSession('session-b')

        data = self._call(sqleditor.auto_complete, session_a, self.TRANS_ID)
        self.assertEqual(data['result'], 'conn-a')

        # Same transaction id, different session: must get its own object
        # on its own connection, not session A's.
        data = self._call(sqleditor.auto_complete, session_b, self.TRANS_ID)
        self.assertEqual(data['result'], 'conn-b')
        self.assertEqual(len(sqleditor.auto_complete_objects), 2)

        # Session A's object is still its own.
        data = self._call(sqleditor.auto_complete, session_a, self.TRANS_ID)
        self.assertEqual(data['result'], 'conn-a')

        # Closing the transaction in session B leaves session A's alone.
        self._call(sqleditor.close, session_b, self.TRANS_ID)
        self.assertEqual(
            list(sqleditor.auto_complete_objects),
            [('session-a', self.TRANS_ID)])

        # Releasing the transaction in session A (as on logout or a
        # connection change) drops its object too.
        with self.app.test_request_context(), \
                patch.object(sqleditor, 'session', session_a):
            sqleditor.close_sqleditor_session(str(self.TRANS_ID))
        self.assertEqual(sqleditor.auto_complete_objects, {})
