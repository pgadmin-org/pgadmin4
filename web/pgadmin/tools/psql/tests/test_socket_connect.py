import uuid
import config
import sys
from pgadmin.utils.route import BaseSocketTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data


class PSQLSocketConnect(BaseSocketTestGenerator):
    SOCKET_NAMESPACE = '/pty'

    def setUp(self):
        super(PSQLSocketConnect, self).setUp()
        self.db_name = "psqltestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]
        config.ENABLE_PSQL = True

    def runTest(self):
        if sys.platform == 'win32':
            self.skipTest('PSQL disabled for windows')

        received = self.socket_client.get_received('/pty')
        assert received[0]['name'] == 'connected'
        assert received[0]['args'][0]['sid'] != ''

        self.socket_client.disconnect(namespace='/pty')
        self.assertFalse(self.socket_client.is_connected('/pty'))

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
