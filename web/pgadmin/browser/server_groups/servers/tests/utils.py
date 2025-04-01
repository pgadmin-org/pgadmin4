import os
import json
import sqlite3
import config
from regression.python_test_utils import test_utils as utils


CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
with open(CURRENT_PATH + "/servers_test_data.json") as data_file:
    test_cases = json.load(data_file)


def create_server(server, SERVER_GROUP):
    """This function is used to create server"""
    try:
        conn = sqlite3.connect(config.TEST_SQLITE_PATH)
        # Create the server
        cur = conn.cursor()
        if 'shared' not in server:
            server['shared'] = False
        server_details = (1, SERVER_GROUP, server['name'], server['host'],
                          server['port'], server['db'], server['username'],
                          server['role'], server['comment'],
                          server['shared'])
        cur.execute('INSERT INTO server (user_id, servergroup_id, name, host, '
                    'port, maintenance_db, username, role,'
                    ' comment, shared) VALUES (?,?,?,?,?,?,?,?,?,?)',
                    server_details)
        server_id = cur.lastrowid
        conn.commit()
        conn.close()

        type = utils.get_server_type(server)
        server['type'] = type

        return server_id
    except Exception as exception:
        raise Exception("Error while creating server. %s" % exception)


def create_server_with_api(self, url):
    try:
        response = self.tester.post(
            url,
            data=json.dumps(self.server),
            content_type='html/json'
        )
        response_data = json.loads(response.data.decode('utf-8'))
        server_id = response_data['node']['_id']
        return server_id
    except Exception as exception:
        raise Exception("Error while creating server. %s" % exception)


def get_server_data(server):
    """
    This function returns the server details
    :param server:
    :return: server data
    """

    server_data = \
        {
            "name": server['name'],
            "comment": server['comment'],
            "username": server['username'],
            "host": server['host'],
            "db_password": server['db_password'],
            "port": server['port'],
            "sslmode": server['sslmode'],
            "db": server['db']
        }

    return server_data
