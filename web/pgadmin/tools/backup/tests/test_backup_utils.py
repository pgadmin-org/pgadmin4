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
import simplejson as json


def create_backup_job(tester, url, params, assert_equal):
    # Create the backup job
    response = tester.post(url,
                           data=json.dumps(params),
                           content_type='html/json')
    assert_equal(response.status_code, 200)
    response_data = json.loads(response.data.decode('utf-8'))
    job_id = response_data['data']['job_id']
    return job_id


def run_backup_job(tester, job_id, expected_params, assert_in, assert_not_in,
                   assert_equal):
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

    backup_file = None
    if 'details' in the_process:
        backup_cmd = the_process['details']['cmd']
        backup_file = backup_cmd[int(backup_cmd.find('--file')) +
                                 8:int(backup_cmd.find('--host')) - 2]

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
    # Retrieve the backup job process logs
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
    backup_ack = tester.put('/misc/bgprocess/{0}'.format(job_id))
    assert_equal(backup_ack.status_code, 200)
    backup_ack_res = json.loads(backup_ack.data.decode('utf-8'))

    assert_equal(backup_ack_res['success'], 1)

    return backup_file


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
