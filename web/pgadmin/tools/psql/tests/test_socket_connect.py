import uuid
import config
import sys
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data
from pgAdmin4 import app
from .... import socketio


class PSQLSocketConnect(BaseTestGenerator):
    def setUp(self):
        self.db_name = "psqltestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]
        config.ENABLE_PSQL = True

    def runTest(self):
        if sys.platform == 'win32':
            self.skipTest('PSQL disabled for windows')
        self.test_client = socketio.test_client(app, namespace='/pty')
        self.assertTrue(self.test_client.is_connected('/pty'))
        received = self.test_client.get_received('/pty')

        assert received[0]['name'] == 'connected'
        assert received[0]['args'][0]['sid'] != ''
        self.test_client.disconnect(namespace='/pty')
        self.assertFalse(self.test_client.is_connected('/pty'))

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
