import os

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils


class TestCheckRecovery(BaseTestGenerator):

    scenarios = [
        ("Test for check recovery", dict())
    ]

    def runTest(self):

        cursor = test_utils.get_db_connection(self.server['db'],
                                              self.server['username'],
                                              self.server['db_password'],
                                              self.server['host'],
                                              self.server['port'],
                                              self.server['sslmode']).cursor()

        if cursor is not None and cursor.connection is not None:
            server_version = cursor.connection.server_version
            if server_version >= 100000:
                version = '10_plus'
            elif server_version >= 90000:
                version = '9.0_plus'
            else:
                version = 'default'

            template_file = os.path.join(
                os.path.dirname(__file__), "../templates/connect/sql", version,
                "check_recovery.sql"
            )

            cursor.execute(open(template_file, 'r').read())
            fetch_result = cursor.fetchall()

            first_row = {}
            for index, description in enumerate(cursor.description):
                first_row[description.name] = fetch_result[0][index]

            in_recovery = first_row['inrecovery']
            wal_paused = first_row['isreplaypaused']

            self.assertEqual(False, in_recovery)
            self.assertEqual(False, wal_paused)
