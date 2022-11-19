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


class PSQLInput(BaseTestGenerator):
    scenarios = utils.generate_scenarios('psql_user_input',
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

        input_data = {
            'input': '\\n',
            'key_name': 'Enter'
        }
        self.test_client.emit('socket_input', input_data, namespace='/pty')
        self.test_client.get_received('/pty')

        for ip in self.input_cmd:
            input_data = {
                'input': ip,
                'key_name': 'Key{0}'.format(ip)
            }
            self.test_client.emit('socket_input', input_data, namespace='/pty')
            self.test_client.get_received('/pty')

        if hasattr(self, 'is_backspace') and self.is_backspace:
            if hasattr(self, 'move_cursor_up') and self.move_cursor_up:
                input_data = {
                    'input': '',
                    'key_name': 'ArrowUp'
                }
                self.test_client.emit('socket_input', input_data,
                                      namespace='/pty')

            for ip in self.input_cmd:
                input_data = {
                    'input': ip,
                    'key_name': 'Backspace'
                }
                self.test_client.emit('socket_input', input_data,
                                      namespace='/pty')
                self.test_client.get_received('/pty')

        if hasattr(self, 'is_arrowUp') and self.is_arrowUp:
            if hasattr(self, 'is_history') and self.is_history:
                for ip in self.input_cmd:
                    input_data = {
                        'input': ip,
                        'key_name': 'Key{0}'.format(ip)
                    }
                    self.test_client.emit('socket_input', input_data,
                                          namespace='/pty')
                    self.test_client.get_received('/pty')

            input_data = {
                'input': '',
                'key_name': 'ArrowUp'
            }
            self.test_client.emit('socket_input', input_data,
                                  namespace='/pty')
            self.test_client.get_received('/pty')

        if hasattr(self, 'is_arrowLeft') and self.is_arrowLeft:
            for ip in self.input_cmd:
                input_data = {
                    'input': ip,
                    'key_name': 'ArrowLeft'
                }
                self.test_client.emit('socket_input', input_data,
                                      namespace='/pty')
                self.test_client.get_received('/pty')

        if hasattr(self, 'is_arrowRight') and self.is_arrowRight:
            for ip in self.input_cmd:
                input_data = {
                    'input': ip,
                    'key_name': 'ArrowRight'
                }
                self.test_client.emit('socket_input', input_data,
                                      namespace='/pty')
                self.test_client.get_received('/pty')

            if hasattr(self, 'move_cursor_right') and self.is_arrowRight:
                for i in range(2):
                    input_data = {
                        'input': '',
                        'key_name': 'ArrowLeft'
                    }
                    self.test_client.emit('socket_input', input_data,
                                          namespace='/pty')
                input_data = {
                    'input': '',
                    'key_name': 'ArrowRight'
                }
                self.test_client.emit('socket_input', input_data,
                                      namespace='/pty')

        input_data = {
            'input': '\\n',
            'key_name': 'Enter'
        }
        self.test_client.emit('socket_input', input_data, namespace='/pty')
        self.test_client.get_received('/pty')

    def tearDown(self):
        connection = utils.get_db_connection(self.server['db'],
                                             self.server['username'],
                                             self.server['db_password'],
                                             self.server['host'],
                                             self.server['port'])
        utils.drop_database(connection, self.db_name)
