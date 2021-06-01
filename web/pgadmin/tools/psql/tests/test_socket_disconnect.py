import uuid
import config
import sys
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data
from pgAdmin4 import app
from .... import socketio


class PSQLSocketDisconnect(BaseTestGenerator):
    def setUp(self):
        self.db_name = "psqltestdb_{0}".format(str(uuid.uuid4())[1:8])
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.did = utils.create_database(self.server, self.db_name)
        self.sgid = config_data["server_group"]
        config.ENABLE_PSQL = True

    def runTest(self):
        if sys.platform == 'win32':
            self.skipTest('PSQL disabled for windows')
        # Fetch flask client to access current user and other cookies.
        flask_test_client = app.test_client()
        flask_test_client.get('/')

        self.test_client = socketio.test_client(
            app,
            flask_test_client=flask_test_client,
            namespace='/pty')
        self.assertTrue(self.test_client.is_connected('/pty'))
        received = self.test_client.get_received('/pty')

        assert received[0]['name'] == 'connected'
        assert received[0]['args'][0]['sid'] != ''

        data = {
            'sid': self.sid,
            'db': 'postgres',
            'pwd': self.server['db_password'],
            'user': self.server['username']
        }

        self.test_client.emit('start_process', data, namespace='/pty')
        self.test_client.get_received('/pty')

        self.test_client.disconnect(namespace='/pty')

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
