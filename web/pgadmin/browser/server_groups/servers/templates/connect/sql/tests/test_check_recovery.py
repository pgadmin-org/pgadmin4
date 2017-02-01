import os

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils


class TestCheckRecovery(BaseTestGenerator):

    versions_to_test = ["default", "9.0_plus"]

    def runTest(self):

        cursor = test_utils.get_db_connection(self.server['db'],
                                              self.server['username'],
                                              self.server['db_password'],
                                              self.server['host'],
                                              self.server['port']).cursor()

        for version in self.versions_to_test:
            template_file = os.path.join(os.path.dirname(__file__), "..", version, "check_recovery.sql")

            cursor.execute(open(template_file, 'r').read())
            fetch_result = cursor.fetchall()

            first_row = {}
            for index, description in enumerate(cursor.description):
                first_row[description.name] = fetch_result[0][index]

            in_recovery = first_row['inrecovery']
            wal_paused = first_row['isreplaypaused']

            self.assertEqual(False, in_recovery)
            self.assertEqual(False, wal_paused)
