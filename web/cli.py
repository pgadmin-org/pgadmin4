import logging
import config

## Steps for producing the schema diff json output

# tell to create the sqlite db in a testing path
# ideally setup.py should receive an argument for telling were the sqlite db is located
import os
os.environ["PGADMIN_TESTING_MODE"] = "1"

config.SERVER_MODE = False
config.WTF_CSRF_ENABLED = False
#config.LOGIN_DISABLED = True

config.CONSOLE_LOG_LEVEL = logging.ERROR
config.FILE_LOG_LEVEL = logging.ERROR

# Here the sqlitedb is initialized
print("Creating sqlite db...")
exec(open("web/setup.py").read())

from sys import argv

script, first, second, third = argv

from psycopg2 import extensions as ext

arg_1 = ext.parse_dsn(first)
arg_2 = ext.parse_dsn(second)

import random

server_1 = {
 'name': str(random.randint(10000, 65535)),
 'db': arg_1['dbname'],
 'username': arg_1['user'],
 'db_password': arg_1.get('password'),
 'role': '',
 'sslmode': 'prefer',
 'comment': '',
 'port': 5432,
 'password': '',
 'connstring': first,
  **arg_1
}

server_2 = {
 'name': str(random.randint(10000, 65535)),
 'db': arg_2['dbname'],
 'username': arg_2['user'],
 'db_password': arg_2.get('password'),
 'role': '',
 'sslmode': 'prefer',
 'comment': '',
 'port': 5432,
 'password': '',
 'connstring': second,
  **arg_2
}

from regression.python_test_utils import test_utils

print("Inserting server rows in sqlite...")
# create pg server rows in the sqlite db
server_id_1 = test_utils.create_server(server_1)
server_id_2 = test_utils.create_server(server_2)

print("Creating flask app...")
# create flask app
from pgadmin import create_app
app = create_app()

from regression.python_test_utils.csrf_test_client import TestClient

# interact with a http client
app.test_client_class = TestClient
test_client = app.test_client()

# Solve ERROR  pgadmin:        'PgAdmin' object has no attribute 'PGADMIN_INT_KEY'
app.PGADMIN_INT_KEY = ''

# schema diff process

print("Starting schema diff...")
# Might take a while
res = test_client.get("schema_diff/initialize")

import json

# Get schema diff trans_id
response_data = json.loads(res.data.decode('utf-8'))
trans_id = response_data['data']['schemaDiffTransId']

# connect to both source and target servers
test_client.post('schema_diff/server/connect/{}'.format(server_id_1),
        data=json.dumps({'password': server_1['db_password']}), content_type='html/json')

test_client.post('schema_diff/server/connect/{}'.format(server_id_2),
        data=json.dumps({'password': server_2['db_password']}), content_type='html/json')

import psycopg2

conn = psycopg2.connect(server_1['connstring'])
cur = conn.cursor()
cur.execute("select oid from pg_database where datname = '{}'".format(server_1['db']))
src_db_id = cur.fetchone()[0]
cur.close()
conn.close()

test_client.post('schema_diff/database/connect/{0}/{1}'.format(server_id_1, src_db_id))

conn = psycopg2.connect(server_2['connstring'])
cur = conn.cursor()
cur.execute("select oid from pg_database where datname = '{}'".format(server_2['db']))
tar_db_id = cur.fetchone()[0]
cur.close()
conn.close()

test_client.post('schema_diff/database/connect/{0}/{1}'.format(server_id_2, tar_db_id))

# compare the dbs
# get the final schema_diff.json

import threading
import time

result = {'res': None}

comp_url = 'schema_diff/compare_database/{0}/{1}/{2}/{3}/{4}'.format(trans_id, server_id_1, src_db_id, server_id_2, tar_db_id)

def get_schema_diff(test_client, comp_url, result):
    response = test_client.get(comp_url)
    result['res'] = response.data

x = threading.Thread(target=get_schema_diff, args=(test_client, comp_url, result))
x.start()

while x.is_alive():
  res = test_client.get(f'schema_diff/poll/{trans_id}')
  res_data = json.loads(res.data.decode('utf-8'))
  data = res_data['data']
  print("{}...{}%".format(data['compare_msg'], data['diff_percentage']))
  time.sleep(2)

x.join()

response_data = json.loads(result['res'].decode('utf-8'))

if response_data['success'] == 1:
  # save it to a file
  file = open(third, 'w')
  json.dump(response_data['data'], file)
  file.close()
  print("Done. Wrote the schema diff output to '{}'".format(third))
else:
  print("Error: {}".format(response_data['errormsg']))
