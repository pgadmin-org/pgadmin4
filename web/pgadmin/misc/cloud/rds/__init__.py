# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2023, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################

# AWS RDS Cloud Deployment Implementation

import requests
import boto3
import json
import pickle
from boto3.session import Session
from flask_babel import gettext
from flask import session, current_app, request
from flask_security import login_required
from werkzeug.datastructures import Headers
from pgadmin.utils import PgAdminModule
from pgadmin.misc.cloud.utils import _create_server, CloudProcessDesc
from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils.ajax import make_json_response,\
    internal_server_error, bad_request, success_return
from .regions import AWS_REGIONS
import simplejson as json

from config import root


MODULE_NAME = 'rds'


class RDSModule(PgAdminModule):
    """Cloud module to deploy on AWS RDS"""
    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module.
        """
        stylesheets = []
        return stylesheets

    def get_exposed_url_endpoints(self):
        return ['rds.db_versions',
                'rds.verify_credentials',
                'rds.db_instances',
                'rds.regions']


blueprint = RDSModule(MODULE_NAME, __name__,
                      static_url_path='/misc/cloud/rds')


@blueprint.route('/verify_credentials/',
                 methods=['POST'], endpoint='verify_credentials')
@login_required
def verify_credentials():
    """Verify Credentials."""
    msg = ''
    data = json.loads(request.data, encoding='utf-8')

    session_token = data['secret']['session_token'] if\
        'session_token' in data['secret'] else None

    if 'aws' not in session:
        session['aws'] = {}

    if 'aws_rds_obj' not in session['aws'] or\
            session['aws']['secret'] != data['secret']:
        _rds = RDS(
            access_key=data['secret']['access_key'],
            secret_key=data['secret']['secret_access_key'],
            session_token=session_token,
            default_region=data['secret']['region'])
        status, identity = _rds.validate_credentials()
        if status:
            session['aws']['secret'] = data['secret']
            session['aws']['aws_rds_obj'] = pickle.dumps(_rds, -1)

    if status:
        msg = 'verified'

    return make_json_response(success=status, info=msg)


@blueprint.route('/db_instances/',
                 methods=['GET'], endpoint='db_instances')
@login_required
def get_db_instances():
    """
    Fetch AWS DB Instances based on engine version.
    """
    # Get Engine Version
    eng_version = request.args.get('eng_version')
    if 'aws' not in session:
        return make_json_response(
            status=410,
            success=0,
            errormsg=gettext('Session has not created yet.')
        )

    if not eng_version or eng_version == '' or eng_version == 'undefined':
        eng_version = '10.17'

    rds_obj = pickle.loads(session['aws']['aws_rds_obj'])
    res = rds_obj.get_available_db_instance_class(
        engine_version=eng_version)
    versions_set = set()
    versions = []
    for value in res:
        versions_set.add(value['DBInstanceClass'])

    for value in versions_set:
        versions.append({
            'label': value,
            'value': value
        })

    return make_json_response(data=versions)


@blueprint.route('/db_versions/',
                 methods=['GET'], endpoint='db_versions')
@login_required
def get_db_versions():
    """GET AWS Database Versions for AWS."""
    if 'aws' not in session:
        return make_json_response(
            status=410,
            success=0,
            errormsg=gettext('Session has not created yet.')
        )

    rds_obj = pickle.loads(session['aws']['aws_rds_obj'])
    db_versions = rds_obj.get_available_db_version()
    res = list(filter(lambda val: not val['EngineVersion'].startswith('9.6'),
                      db_versions['DBEngineVersions']))
    versions = []
    for value in res:
        versions.append({
            'label': value['DBEngineVersionDescription'],
            'value': value['EngineVersion']
        })

    return make_json_response(data=versions)


@blueprint.route('/regions/',
                 methods=['GET'], endpoint='regions')
@login_required
def get_regions():
    """GET Regions for AWS."""
    try:
        clear_aws_session()
        _session = Session()
        res = _session.get_available_regions('rds')
        regions = []

        for value in res:
            if value in AWS_REGIONS:
                regions.append({
                    'label': AWS_REGIONS[value] + ' | ' + value,
                    'value': value
                })

        return make_json_response(data=regions)

    except Exception as e:
        return make_json_response(
            status=410,
            success=0,
            errormsg=str(e)
        )


class RDS():
    def __init__(self, access_key, secret_key, session_token=None,
                 default_region='ap-south-1'):
        self._clients = {}

        self._access_key = access_key
        self._secret_key = secret_key
        self._session_token = session_token

        self._default_region = default_region

    ##########################################################################
    # AWS Helper functions
    ##########################################################################
    def _get_aws_client(self, type):
        """ Create/cache/return an AWS client object """
        if type in self._clients:
            return self._clients[type]

        session = boto3.Session(
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            aws_session_token=self._session_token
        )

        self._clients[type] = session.client(
            type, region_name=self._default_region)

        return self._clients[type]

    def get_available_db_version(self, engine='postgres'):
        rds = self._get_aws_client('rds')
        return rds.describe_db_engine_versions(Engine=engine)

    def get_available_db_instance_class(self, engine='postgres',
                                        engine_version='10'):
        rds = self._get_aws_client('rds')
        _instances = rds.describe_orderable_db_instance_options(
            Engine=engine,
            EngineVersion=engine_version)
        _instances_list = _instances['OrderableDBInstanceOptions']
        _marker = _instances['Marker'] if 'Marker' in _instances else None
        while _marker:
            _tmp_instances = rds.describe_orderable_db_instance_options(
                Engine=engine,
                EngineVersion=engine_version,
                Marker=_marker)
            _instances_list = [*_instances_list,
                               *_tmp_instances['OrderableDBInstanceOptions']]
            _marker = _tmp_instances['Marker'] if 'Marker'\
                                                  in _tmp_instances else None

        return _instances_list

    def get_db_instance(self, instance_name):
        rds = self._get_aws_client('rds')
        return rds.describe_db_instances(
            DBInstanceIdentifier=instance_name)

    def validate_credentials(self):
        client = self._get_aws_client('sts')
        try:
            identity = client.get_caller_identity()
            return True, identity
        except Exception as e:
            return False, str(e)
        finally:
            self._clients.pop('sts')


def clear_aws_session():
    """Clear AWS Session"""
    if 'aws' in session:
        session.pop('aws')


def deploy_on_rds(data):
    """Deploy the Postgres instance on RDS."""

    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)
    _label = None

    from subprocess import Popen, PIPE
    _label = data['instance_details']['name']

    args = [_cmd_script,
            data['cloud'],
            '--region',
            str(data['secret']['region']),
            'create-instance',
            '--name',
            data['instance_details']['name'],
            '--db-name',
            data['db_details']['db_name'],
            '--db-username',
            data['db_details']['db_username'],
            '--db-port',
            str(data['db_details']['db_port']),
            '--db-version',
            str(data['instance_details']['db_version']),
            '--instance-type',
            data['instance_details']['instance_type'],
            '--storage-type',
            data['instance_details']['storage_type'],
            '--storage-size',
            str(data['instance_details']['storage_size']),
            '--public-ip',
            str(data['instance_details']['public_ip']),
            '--high-availability',
            str(data['instance_details']['high_availability'])
            ]

    if data['instance_details']['storage_type'] == 'io1':
        args.append('--storage-iops')
        args.append(str(data['instance_details']['storage_IOPS']))

    _cmd_msg = '{0} {1} {2}'.format(_cmd, _cmd_script, ' '.join(args))
    try:
        sid = _create_server({
            'gid': data['db_details']['gid'],
            'name': data['instance_details']['name'],
            'db': data['db_details']['db_name'],
            'username': data['db_details']['db_username'],
            'port': data['db_details']['db_port'],
            'cloud_status': -1
        })

        p = BatchProcess(
            desc=CloudProcessDesc(sid, _cmd_msg, data['cloud'],
                                  data['instance_details']['name']),
            cmd=_cmd,
            args=args
        )

        env = dict()
        env['AWS_ACCESS_KEY_ID'] = data['secret']['access_key']
        env['AWS_SECRET_ACCESS_KEY'] = data['secret'][
            'secret_access_key']

        if 'session_token' in data['secret'] and\
                data['secret']['session_token'] is not None:
            env['AWS_SESSION_TOKEN'] = data['secret']['session_token']

        if 'db_password' in data['db_details']:
            env['AWS_DATABASE_PASSWORD'] = data[
                'db_details']['db_password']

        p.set_env_variables(None, env=env)
        p.update_server_id(p.id, sid)
        p.start()

        return True, p, {'label': _label, 'sid': sid}
    except Exception as e:
        current_app.logger.exception(e)
        return False, None, str(e)
