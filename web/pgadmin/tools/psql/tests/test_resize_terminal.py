import uuid
import config
import sys
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils
from regression import parent_node_dict
from regression.test_setup import config_data
from pgadmin.utils import server_utils
from pgAdmin4 import app
from . import utils as psql_utils
from .... import socketio


class PSQLResizeTerminal(BaseTestGenerator):
    scenarios = utils.generate_scenarios('resize_terminal',
                                         psql_utils.test_cases)

    def setUp(self):
        self.db_name = "psqltestdb_{0}".format(str(uuid.uuid4())[1:8])
        database_info = parent_node_dict["database"][-1]
        self.did = database_info["db_id"]
        self.sid = parent_node_dict["server"][-1]["server_id"]
        self.sgid = config_data["server_group"]
        config.ENABLE_PSQL = True
        self.server_con = server_utils.connect_server(self, self.sid)

    def runTest(self):
        if sys.platform == 'win32':
            self.skipTest('PSQL disabled for windows')
        # Fetch flask client to access current user and other cookies.
        flask_client = app.test_client()
        flask_client.get('/')
        self.test_client = socketio.test_client(app, namespace='/pty',
                                                flask_test_client=flask_client)
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

        self.test_client.emit('resize', self.input_data, namespace='/pty')

        self.test_client.disconnect(namespace='/pty')

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
