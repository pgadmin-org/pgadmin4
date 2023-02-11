##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time
import secrets
import json
import uuid

from regression import parent_node_dict

from pgadmin.browser.server_groups.servers.databases.schemas.tables.tests \
    import utils as tables_utils
from pgadmin.browser.server_groups.servers.databases.schemas.tests import \
    utils as schema_utils
from pgadmin.browser.server_groups.servers.databases.tests import utils as \
    database_utils
from regression.python_test_utils import test_utils as utils
from pgadmin.browser.server_groups.servers.databases.schemas.\
    tables.columns.tests import utils as columns_utils


def create_import_export_job(tester, url, params, assert_equal):
    # Create the import/export job
    response = tester.post(url,
                           data=json.dumps(params),
                           content_type='html/json')
    assert_equal(response.status_code, 200)
    response_data = json.loads(response.data.decode('utf-8'))
    job_id = response_data['data']['job_id']
    return job_id


def run_import_export_job(tester, job_id, expected_params, assert_in,
                          assert_not_in, assert_equal):
    cnt = 0
    the_process = None
    while True:
        if cnt >= 5:
            break
        # Check the process list
        response1 = tester.get('/misc/bgprocess/?_={0}'.format(
            secrets.choice(range(1, 9999999))))
        assert_equal(response1.status_code, 200)
        process_list = json.loads(response1.data.decode('utf-8'))

        try:
            the_process = next(
                p for p in process_list if p['id'] == job_id)
        except Exception:
            the_process = None

        if the_process and 'execution_time' in the_process:
            break
        time.sleep(0.5)
        cnt += 1

    assert_equal('execution_time' in the_process, True)
    assert_equal('stime' in the_process, True)
    assert_equal('exit_code' in the_process, True)
    assert_equal(the_process['exit_code'] in expected_params[
        'expected_exit_code'
    ], True)

    io_file = None
    if 'details' in the_process:
        io_det = the_process['details']['message']

        temp_io_det = io_det.upper()

        if temp_io_det.find(' TO ') > 0:
            io_file = temp_io_det[temp_io_det.find(' TO ') + 3:].split(' ')[1]
        else:
            from_find = temp_io_det.find(' FROM ') + 5
            io_file = temp_io_det[from_find:].split(' ')[1]

    if expected_params['expected_cmd_opts']:
        for opt in expected_params['expected_cmd_opts']:
            assert_in(opt, the_process['details']['cmd'])
    if expected_params['not_expected_cmd_opts']:
        for opt in expected_params['not_expected_cmd_opts']:
            assert_not_in(opt, the_process['details']['cmd'])

    # Check the process details
    p_details = tester.get('/misc/bgprocess/{0}?_={1}'.format(
        job_id, secrets.choice(range(1, 9999999)))
    )
    assert_equal(p_details.status_code, 200)

    p_details = tester.get('/misc/bgprocess/{0}/{1}/{2}/?_={3}'.format(
        job_id, 0, 0, secrets.choice(range(1, 9999999)))
    )
    assert_equal(p_details.status_code, 200)
    p_details_data = json.loads(p_details.data.decode('utf-8'))

    cnt = 0
    # Retrieve the io job process logs
    while True:
        out, err, status = get_params(p_details_data)
        if status or cnt >= 5:
            break

        p_details = tester.get(
            '/misc/bgprocess/{0}/{1}/{2}/?_={3}'.format(
                job_id, out, err, secrets.choice(range(1, 9999999)))
        )
        assert_equal(p_details.status_code, 200)
        p_details_data = json.loads(p_details.data.decode('utf-8'))

        cnt += 1
        time.sleep(1)

    # Check the job is complete.
    io_ack = tester.put('/misc/bgprocess/{0}'.format(job_id))
    assert_equal(io_ack.status_code, 200)
    io_ack_res = json.loads(io_ack.data.decode('utf-8'))

    assert_equal(io_ack_res['success'], 1)

    return io_file


def get_params(data):
    out = 0
    out_done = False
    err = 0
    err_done = False
    if 'out' in data:
        out = data['out'] and data['out']['pos']

        if 'done' in data['out']:
            out_done = data['out']['done']

    if 'err' in data:
        err = data['err'] and data['err']['pos']

        if 'done' in data['err']:
            err_done = data['err']['done']

    return out, err, (out_done and err_done)


def setup_export_data(sobject):
    # Create db connection
    sobject.db_name = parent_node_dict["database"][-1]["db_name"]

    schema_info = parent_node_dict["schema"][-1]
    sobject.server_id = schema_info["server_id"]
    sobject.db_id = schema_info["db_id"]
    db_con = database_utils.connect_database(sobject, utils.SERVER_GROUP,
                                             sobject.server_id, sobject.db_id)
    if not db_con['data']["connected"]:
        raise Exception("Could not connect to database to add a table.")

    # Create schema
    sobject.schema_id = schema_info["schema_id"]
    sobject.schema_name = schema_info["schema_name"]
    schema_response = schema_utils.verify_schemas(sobject.server,
                                                  sobject.db_name,
                                                  sobject.schema_name)

    if not schema_response:
        raise Exception("Could not find the schema to add a table.")

    # Create table
    sobject.table_name = "table_to_export_%s" % (str(uuid.uuid4())[1:8])
    sobject.table_id = tables_utils.create_table(sobject.server,
                                                 sobject.db_name,
                                                 sobject.schema_name,
                                                 sobject.table_name)

    # Create column
    sobject.column_name = "column_to_export_%s" % (str(uuid.uuid4())[1:8])
    sobject.column_id = columns_utils.create_column(sobject.server,
                                                    sobject.db_name,
                                                    sobject.schema_name,
                                                    sobject.table_name,
                                                    sobject.column_name)

    # Create column
    sobject.column_name_1 = "column_to_export_%s" % (str(uuid.uuid4())[1:8])
    sobject.column_id_1 = columns_utils.create_column(sobject.server,
                                                      sobject.db_name,
                                                      sobject.schema_name,
                                                      sobject.table_name,
                                                      sobject.column_name_1)

    return None
