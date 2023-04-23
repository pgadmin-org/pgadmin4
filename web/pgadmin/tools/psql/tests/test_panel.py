import uuid
import secrets
import sys
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data


class PSQLPanel(BaseTestGenerator):

    def setUp(self):
        self.db_name = "psqltestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]
        self.theme = 'standard'

    def runTest(self):
        if sys.platform == 'win32':
            self.skipTest('PSQL disabled for windows')
        trans_id = secrets.choice(range(1, 9999999))
        url = '/psql/panel/{trans_id}?sgid={sgid}&sid={sid}&did={did}' \
              '&server_type=pg&db={db_name}&theme={theme}'.\
            format(trans_id=trans_id, sgid=self.sgid, sid=self.sid,
                   did=self.did, db_name=self.db_name, theme=self.theme)

        response = self.tester.post(
            url, data={"title": "panel_title"},
            content_type="application/x-www-form-urlencoded")
        self.assertEqual(response.status_code, 200)

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
