##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# AWS RDS PostgreSQL provider

import boto3
import pickle
from flask import session
from boto3.session import Session
from .aws_regions import AWS_REGIONS


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
                                        engine_version='9.6'):
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


def verify_aws_credentials(data):
    """Verify Credentials"""
    session_token = data['secret']['aws_session_token'] if\
        'aws_session_token' in data['secret'] else None

    if 'aws' not in session:
        session['aws'] = {}

    if 'aws_rds_obj' not in session['aws'] or\
            session['aws']['secret'] != data['secret']:
        _rds = RDS(
            access_key=data['secret']['aws_access_key'],
            secret_key=data['secret']['aws_secret_access_key'],
            session_token=session_token,
            default_region=data['secret']['aws_region'])
        status, identity = _rds.validate_credentials()
        if status:
            session['aws']['secret'] = data['secret']
            session['aws']['aws_rds_obj'] = pickle.dumps(_rds, -1)
        return status, identity

    return True, None


def clear_aws_session():
    """Clear AWS Session"""
    if 'aws' in session:
        session.pop('aws')


def get_aws_db_instances(eng_version):
    """Get AWS DB Instances"""
    if 'aws' not in session:
        return False, 'Session has not created yet.'

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
    return True, versions


def get_aws_db_versions():
    """Get AWS DB Versions"""

    if 'aws' not in session:
        return False, 'Session has not created yet.'

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
    return True, versions


def get_aws_regions():
    """Get AWS DB Versions"""
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
    return True, regions
