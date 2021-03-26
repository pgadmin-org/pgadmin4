# Using the https://www.pgadmin.org/docs/pgadmin4/development/schema_diff.html without the GUI
# The main idea is to init the flask app(which needs and creates a sqlitedb), fill in the required state(some sqlite rows)
# and interact with the schema diff endpoints with a test http client.
import logging
import config
import sys
import os
import random
import sqlite3
import json
import psycopg2
import threading
import time
from pgadmin import create_app
from pgadmin.model import SCHEMA_VERSION
from psycopg2 import extensions as ext

help = '''
usage: pgadmin-schema-diff <source> <target>

where:
  <source>: a postgres connection string for the source database(e.g. postgres://postgres@localhost/source)
  <target>: a postgres connection string for the target database(e.g. postgres://postgres@localhost/target)

To diff a particular schema use the connection string like:
postgres://postgres@localhost/source?options=--search_path%3dparticular_schema
'''

args = dict(enumerate(sys.argv))

if len(args) < 3:
    print(help, file=sys.stderr)
    exit(1)

first = args.get(1)
second = args.get(2)
third = args.get(3)

# Configuration

os.environ["PGADMIN_TESTING_MODE"] = "1"

config.SERVER_MODE = False
config.WTF_CSRF_ENABLED = False

# Removing some unnecessary modules(attempt to speed up init)
config.MODULE_BLACKLIST = [
  'pgadmin.about'
, 'pgadmin.authenticate'
, 'pgadmin.browser.register_browser_preferences'
, 'pgadmin.browser.server_groups.servers.pgagent'
, 'pgadmin.browser.server_groups.servers.pgagent.schedules'
, 'pgadmin.browser.server_groups.servers.pgagent.steps'
, 'pgadmin.browser.server_groups.servers.pgagent.tests'
, 'pgadmin.browser.server_groups.servers.pgagent.utils'
, 'pgadmin.browser.server_groups.servers.pgagent.schedules.test'
, 'pgadmin.browser.server_groups.servers.pgagent.steps.tests'
, 'pgadmin.dashboard'
, 'pgadmin.help'
, 'pgadmin.misc'
, 'pgadmin.preferences'
, 'pgadmin.settings'
, 'pgadmin.feature_tests'
, 'pgadmin.tools.backup'
, 'pgadmin.tools.datagrid'
, 'pgadmin.tools.debugger'
, 'pgadmin.tools.erd'
, 'pgadmin.tools.grant_wizard'
, 'pgadmin.tools.import_export'
, 'pgadmin.tools.maintenance'
, 'pgadmin.tools.restore'
, 'pgadmin.tools.search_objects'
, 'pgadmin.tools.sqleditor'
, 'pgadmin.tools.storage_manager'
, 'pgadmin.tools.user_management'
, 'pgadmin.tools.backup.tests'
, 'pgadmin.tools.datagrid.tests'
, 'pgadmin.tools.debugger.tests'
, 'pgadmin.tools.debugger.utils'
, 'pgadmin.tools.erd.tests'
, 'pgadmin.tools.erd.utils'
, 'pgadmin.tools.grant_wizard.tests'
, 'pgadmin.tools.import_export.tests'
, 'pgadmin.tools.maintenance.tests'
, 'pgadmin.tools.restore.tests'
, 'pgadmin.tools.schema_diff.tests'
, 'pgadmin.tools.search_objects.tests'
, 'pgadmin.tools.search_objects.utils'
, 'pgadmin.tools.sqleditor.command'
, 'pgadmin.tools.sqleditor.tests'
, 'pgadmin.tools.sqleditor.utils'
, 'pgadmin.utils'
]

# Change these to DEBUG to see more details including the SQL queries
config.CONSOLE_LOG_LEVEL = logging.ERROR
config.FILE_LOG_LEVEL = logging.ERROR

config.SETTINGS_SCHEMA_VERSION = SCHEMA_VERSION

## Starting process

print("Starting schema diff...", file=sys.stderr)

# create_app prints "NOTE: Configuring authentication for DESKTOP mode.", this pollutes our SQL diff output.
# So here we disable stdout temporarily to avoid that
sys.stdout = open(os.devnull, 'w')

## Starts the Flask app, this step takes a while
app = create_app()

## Now enable stdout
sys.stdout = sys.__stdout__

# Needed for solving: ERROR  pgadmin: 'PgAdmin' object has no attribute 'PGADMIN_INT_KEY'
app.PGADMIN_INT_KEY = ''

# pg connection strings to dicts
arg_1 = ext.parse_dsn(first)
arg_2 = ext.parse_dsn(second)

def schema_from_search_path(srv):
    options = srv.get('options')
    if options is None:
      return None
    else:
      search_path = options.split('--search_path=')
      if len(search_path) == 2:
        return search_path[1]
      else:
        return None

# create pg server rows in the sqlite db

server_1 = {
 'name': str(random.randint(10000, 65535)), ## some random name for registering the server on the sqlite db
 'db': arg_1['dbname'],
 'username': arg_1['user'],
 'db_password': arg_1.get('password'),
 'role': '',
 'sslmode': 'prefer',
 'comment': '',
 'port': 5432,
 'password': '',
 'connstring': first,
 'schema': schema_from_search_path(arg_1),
  **arg_1
}

server_2 = {
 'name': str(random.randint(10000, 65535)), ## some random name for registering the server on the sqlite db
 'db': arg_2['dbname'],
 'username': arg_2['user'],
 'db_password': arg_2.get('password'),
 'role': '',
 'sslmode': 'prefer',
 'comment': '',
 'port': 5432,
 'password': '',
 'connstring': second,
 'schema': schema_from_search_path(arg_2),
  **arg_2
}

# this func is copied from the test_utils module(cannot use the module on a docker container because it's excluded in .dockerignore)
def create_server(server):
    """This function is used to create server"""
    conn = sqlite3.connect(config.TEST_SQLITE_PATH)
    cur = conn.cursor()
    server_details = (1, 1, server['name'], server['host'],
                      server['port'], server['db'], server['username'],
                      server['role'], server['sslmode'], server['comment'])
    cur.execute('INSERT INTO server (user_id, servergroup_id, name, host, '
                'port, maintenance_db, username, role, ssl_mode,'
                ' comment) VALUES (?,?,?,?,?,?,?,?,?,?)', server_details)
    server_id = cur.lastrowid
    conn.commit()
    conn.close()
    return server_id

server_id_1 = create_server(server_1)
server_id_2 = create_server(server_2)

# interact with a http client
test_client = app.test_client()

# Get trans_id(transaction id), it's just a random id generated on flask that's used for showing the diff progress messages
res = test_client.get("schema_diff/initialize")
response_data = json.loads(res.data.decode('utf-8'))
trans_id = response_data['data']['schemaDiffTransId']

# connect to both source and target servers
test_client.post('schema_diff/server/connect/{}'.format(server_id_1),
        data=json.dumps({'password': server_1['db_password']}), content_type='html/json')

test_client.post('schema_diff/server/connect/{}'.format(server_id_2),
        data=json.dumps({'password': server_2['db_password']}), content_type='html/json')

# Get the source and target db/schema oids for diffing
src_schema_id = None
tar_schema_id = None

conn = psycopg2.connect(server_1['connstring'])
cur = conn.cursor()
cur.execute("select oid from pg_database where datname = current_database()")
src_db_id = cur.fetchone()[0]
if server_1.get('schema') is not None:
  cur.execute("select %s::regnamespace::oid", (server_1.get('schema'),))
  src_schema_id = cur.fetchone()[0]
cur.close()
conn.close()

test_client.post('schema_diff/database/connect/{0}/{1}'.format(server_id_1, src_db_id))

conn = psycopg2.connect(server_2['connstring'])
cur = conn.cursor()
cur.execute("select oid from pg_database where datname = current_database()")
tar_db_id = cur.fetchone()[0]
if server_2.get('schema') is not None:
  cur.execute("select %s::regnamespace::oid", (server_2.get('schema'),))
  tar_schema_id = cur.fetchone()[0]
cur.close()
conn.close()

test_client.post('schema_diff/database/connect/{0}/{1}'.format(server_id_2, tar_db_id))

# Obtain the endpoint for diffing dbs or schemas

if server_1.get('schema') is not None and server_2.get('schema') is not None:
    comp_url = 'schema_diff/compare_schema/{0}/{1}/{2}/{3}/{4}/{5}/{6}'.format(trans_id, server_id_1, src_db_id, src_schema_id, server_id_2, tar_db_id, tar_schema_id)
else:
    comp_url = 'schema_diff/compare_database/{0}/{1}/{2}/{3}/{4}'.format(trans_id, server_id_1, src_db_id, server_id_2, tar_db_id)

# Compute the schema diff on a thread so we can poll its progress

# trick for getting the thread result on a variable to be used on main
result = {'res': None}

def get_schema_diff(test_client, comp_url, result):
    response = test_client.get(comp_url)
    result['res'] = response.data

diff_thread = threading.Thread(target=get_schema_diff, args=(test_client, comp_url, result))
diff_thread.start()

# poll the progress
while diff_thread.is_alive():
  res = test_client.get(f'schema_diff/poll/{trans_id}')
  res_data = json.loads(res.data.decode('utf-8'))
  data = res_data['data']
  print("{}...{}%".format(data['compare_msg'], data['diff_percentage']), file=sys.stderr)
  time.sleep(2)

diff_thread.join()

# finally get the diff to stdout

response_data = json.loads(result['res'].decode('utf-8'))

message = '''
-- This script was generated by the Schema Diff utility in pgAdmin 4
-- For the circular dependencies, the order in which Schema Diff writes the objects is not very sophisticated
-- and may require manual changes to the script to ensure changes are applied in the correct order.
-- Please report an issue for any failure with the reproduction steps.\n
'''

if third == 'json':
    diff_result = json.dumps(response_data['data'], indent=4)
else:
    # Some db objects on the json diff output don't have a diff_ddl(they're 'Identical') so we skip them.
    diff_result = message + '\n'.join(x.get('diff_ddl') for x in response_data['data'] if x.get('status') != 'Identical')

if response_data['success'] == 1:
  print("Done.", file=sys.stderr)
  print(diff_result)
else:
  print("Error: {}".format(response_data['errormsg']), file=sys.stderr)
