##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import time
import random
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
    while 1:
        if cnt >= 5:
            break
        # Check the process list
        response1 = tester.get('/misc/bgprocess/?_='.format(
            random.randint(1, 9999999)))
        assert_equal(response1.status_code, 200)
        process_list = json.loads(response1.data.decode('utf-8'))

        if len(process_list) > 0 and 'execution_time' in process_list[0]:
            break
        time.sleep(0.5)
        cnt += 1

    assert_equal('execution_time' in process_list[0], True)
    assert_equal('stime' in process_list[0], True)
    assert_equal('exit_code' in process_list[0], True)
    assert_equal(process_list[0]['exit_code'] in expected_params[
        'expected_exit_code'
    ], True)

    backup_file = None
    if 'details' in process_list[0]:
        backup_det = process_list[0]['details']
        backup_file = backup_det[int(backup_det.find('--file')) +
                                 8:int(backup_det.find('--host')) - 2]

    if expected_params['expected_cmd_opts']:
        for opt in expected_params['expected_cmd_opts']:
            assert_in(opt, process_list[0]['details'])
    if expected_params['not_expected_cmd_opts']:
        for opt in expected_params['not_expected_cmd_opts']:
            assert_not_in(opt, process_list[0]['details'])

    # Check the process details
    p_details = tester.get('/misc/bgprocess/{0}?_='.format(
        job_id, random.randint(1, 9999999))
    )
    assert_equal(p_details.status_code, 200)

    p_details = tester.get('/misc/bgprocess/{0}/{1}/{2}/?_='.format(
        job_id, 0, 0, random.randint(1, 9999999))
    )
    assert_equal(p_details.status_code, 200)
    p_details_data = json.loads(p_details.data.decode('utf-8'))

    cnt = 0
    # Retrieve the backup job process logs
    while 1:
        out, err, status = get_params(p_details_data)
        if status or cnt >= 5:
            break

        p_details = tester.get(
            '/misc/bgprocess/{0}/{1}/{2}/?_={3}'.format(
                job_id, out, err, random.randint(1, 9999999))
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
