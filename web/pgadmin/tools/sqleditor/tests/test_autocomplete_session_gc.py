##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import datetime
from unittest.mock import MagicMock, patch

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.driver import get_driver
import pgadmin.utils.driver.psycopg3 as psycopg3_driver
from pgadmin.utils.driver.psycopg3.server_manager import ServerManager
import pgadmin.tools.sqleditor as sqleditor


class TestAutocompleteSessionGC(BaseTestGenerator):
    """
    When the driver releases the connections of a session that has gone
    idle without logging out, that session's cached SQLAutoComplete objects
    must be dropped too, whilst other sessions' objects are kept.
    """
    scenarios = [
        ('Autocomplete objects are dropped for expired sessions', dict()),
    ]

    def setUp(self):
        self.saved_objects = dict(sqleditor.auto_complete_objects)
        sqleditor.auto_complete_objects.clear()

    def tearDown(self):
        sqleditor.auto_complete_objects.clear()
        sqleditor.auto_complete_objects.update(self.saved_objects)

    def runTest(self):
        now = datetime.datetime.now()
        expired_mgr = MagicMock(spec=ServerManager)
        active_mgr = MagicMock(spec=ServerManager)
        managers = {
            'expired': {'pinged': now - datetime.timedelta(days=1),
                        '1': expired_mgr},
            'active': {'pinged': now, '1': active_mgr},
        }
        sqleditor.auto_complete_objects.update({
            ('expired', 1): MagicMock(),
            ('expired', 2): MagicMock(),
            ('active', 1): MagicMock(),
        })

        with self.app.test_request_context():
            driver = get_driver(PG_DEFAULT_DRIVER)
            with patch.object(driver, 'managers', managers), \
                    patch.object(psycopg3_driver, 'session',
                                 MagicMock(sid='current')):
                driver.gc_timeout()

        expired_mgr.release.assert_called_once_with()
        active_mgr.release.assert_not_called()
        self.assertEqual(list(sqleditor.auto_complete_objects),
                         [('active', 1)])
