## Steps for producing the schema diff json output

# tell to create the sqlite db in a testing path
# ideally setup.py should receive an argument for telling were the sqlite db is located
import os
os.environ["PGADMIN_TESTING_MODE"] = "1"

# Here the sqlitedb is initialized
exec(open("setup.py").read())

# These ones should come as CLI args
arg_1 = json.loads('{"host": "localhost", "port": 5432, "db": "diff_source", "user": "postgres", "pass": "admin1234"}')
arg_2 = json.loads('{"host": "localhost", "port": 5432, "db": "diff_target", "user": "postgres", "pass": "admin1234"}')

import random

server_passed_1 = {
 'name': str(random.randint(10000, 65535)),
 'host': arg_1['host'],
 'port': arg_1['port'],
 'db': arg_1['db'],
 'username': arg_1['user'],
 'db_password': arg_1['pass'],
 'role': '',
 'sslmode': 'prefer',
 'comment': ''
}

server_passed_2 = {
 'name': str(random.randint(10000, 65535)),
 'host': arg_2['host'],
 'port': arg_2['port'],
 'db': arg_2['db'],
 'username': arg_2['user'],
 'db_password': arg_2['pass'],
 'role': '',
 'sslmode': 'prefer',
 'comment': ''
}

from regression.python_test_utils import test_utils

# create pg server rows in the sqlite db
server_1 = test_utils.create_parent_server_node(server_passed_1)
server_id_1 = server_1['server_id']

server_2 = test_utils.create_parent_server_node(server_passed_2)
server_id_2 = server_2['server_id']

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

# Might take a while
res = test_client.get("schema_diff/initialize")

# Get schema diff trans_id
import json
response_data = json.loads(res.data.decode('utf-8'))
trans_id = response_data['data']['schemaDiffTransId']

# connect to both source and target servers
test_client.post('schema_diff/server/connect/{}'.format(server_id_1),
        data=json.dumps({'password': server_passed_1['db_password']}), content_type='html/json')

test_client.post('schema_diff/server/connect/{}'.format(server_id_2),
        data=json.dumps({'password': server_passed_2['db_password']}), content_type='html/json')

import psycopg2

# src_db_id = select oid from pg_database where datname = 'diff_source';
# src_db_id = 1398827

conn = psycopg2.connect(dbname=arg_1['db'], user=arg_1['user'], password=arg_1['pass'], host=arg_1['host'], port=arg_1['port'])
cur = conn.cursor()
cur.execute("select oid from pg_database where datname = '{}'".format(arg_1['db']))
src_db_id = cur.fetchone()[0]
cur.close()
conn.close()

test_client.post('schema_diff/database/connect/{0}/{1}'.format(server_id_1, src_db_id))

# tar_db_id = select oid from pg_database where datname = 'diff_target';
# tar_db_id = 1399733

conn = psycopg2.connect(dbname=arg_2['db'], user=arg_2['user'], password=arg_2['pass'], host=arg_2['host'], port=arg_2['port'])
cur = conn.cursor()
cur.execute("select oid from pg_database where datname = '{}'".format(arg_2['db']))
tar_db_id = cur.fetchone()[0]
cur.close()
conn.close()

test_client.post('schema_diff/database/connect/{0}/{1}'.format(server_id_2, tar_db_id))

# compare the dbs

comp_url = 'schema_diff/compare_database/{0}/{1}/{2}/{3}/{4}'.format(trans_id, server_id_1, src_db_id, server_id_2, tar_db_id)

response = test_client.get(comp_url)

# get the final schema_diff.json

response_data = json.loads(response.data.decode('utf-8'))
file = open('output-4.json', 'w')
json.dump(response_data, file)
file.close()
