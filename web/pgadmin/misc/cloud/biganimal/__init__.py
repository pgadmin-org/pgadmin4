# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2023, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################

# EDB BigAnimal Cloud Deployment Implementation

import requests
import json
import pickle
from flask_babel import gettext
from flask import session, current_app
from flask_security import login_required
from werkzeug.datastructures import Headers
from pgadmin.utils import PgAdminModule
from pgadmin.misc.cloud.utils import _create_server, CloudProcessDesc
from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin.utils.ajax import make_json_response
from config import root
from pgadmin.utils.constants import MIMETYPE_APP_JSON

MODULE_NAME = 'biganimal'

SINGLE_CLUSTER_ARCH = 'single'
HA_CLUSTER_ARCH = 'ha'  # High Availability
EHA_CLUSTER_ARCH = 'eha'  # Extreme High Availability


class BigAnimalModule(PgAdminModule):
    """Cloud module to deploy on EDB BigAnimal"""

    def get_exposed_url_endpoints(self):
        return ['biganimal.verification',
                'biganimal.verification_ack',
                'biganimal.regions',
                'biganimal.db_types',
                'biganimal.db_versions',
                'biganimal.instance_types',
                'biganimal.volume_types',
                'biganimal.volume_properties',
                'biganimal.providers',
                'biganimal.projects']


blueprint = BigAnimalModule(MODULE_NAME, __name__,
                            static_url_path='/misc/cloud/biganimal')


@blueprint.route('/verification_ack/',
                 methods=['GET'], endpoint='verification_ack')
@login_required
def biganimal_verification_ack():
    """Check the Verification is done or not."""
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    status, error = biganimal_obj.polling_for_token()
    if status:
        session['biganimal']['provider_obj'] = pickle.dumps(biganimal_obj, -1)
    return make_json_response(success=status,
                              errormsg=error)


@blueprint.route('/verification/',
                 methods=['GET'], endpoint='verification')
@login_required
def verification():
    """Verify Credentials."""
    biganimal = BigAnimalProvider()
    verification_uri = biganimal.get_device_code()
    session['biganimal'] = {}
    session['biganimal']['provider_obj'] = pickle.dumps(biganimal, -1)

    return make_json_response(data=verification_uri)


@blueprint.route('/projects/',
                 methods=['GET'], endpoint='projects')
@login_required
def biganimal_projects():
    """Get Providers."""
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    projects, error = biganimal_obj.get_projects()
    return make_json_response(data=projects, errormsg=error)


@blueprint.route('/providers/<project_id>',
                 methods=['GET'], endpoint='providers')
@login_required
def biganimal_providers(project_id):
    """Get Providers."""
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    providers, error = biganimal_obj.get_providers(project_id)
    session['biganimal']['provider_obj'] = pickle.dumps(biganimal_obj, -1)
    return make_json_response(data=providers, errormsg=error)


@blueprint.route('/regions/',
                 methods=['GET'], endpoint='regions')
@login_required
def biganimal_regions():
    """Get Regions."""
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    status, regions = biganimal_obj.get_regions()
    session['biganimal']['provider_obj'] = pickle.dumps(biganimal_obj, -1)
    return make_json_response(data=regions)


@blueprint.route('/db_types/',
                 methods=['GET'], endpoint='db_types')
@login_required
def biganimal_db_types():
    """Get Database Types."""
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    pg_types = biganimal_obj.get_postgres_types()
    return make_json_response(data=pg_types)


@blueprint.route('/db_versions/<cluster_type>/<pg_type>',
                 methods=['GET'], endpoint='db_versions')
@login_required
def biganimal_db_versions(cluster_type, pg_type):
    """Get Database Version."""
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    pg_versions = biganimal_obj.get_postgres_versions(cluster_type, pg_type)
    return make_json_response(data=pg_versions)


@blueprint.route('/instance_types/<region_id>/<provider_id>',
                 methods=['GET'], endpoint='instance_types')
@login_required
def biganimal_instance_types(region_id, provider_id):
    """Get Instance Types."""
    if not region_id or not provider_id:
        return make_json_response(data=[])
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    biganimal_instances = biganimal_obj.get_instance_types(region_id,
                                                           provider_id)
    return make_json_response(data=biganimal_instances)


@blueprint.route('/volume_types/<region_id>/<provider_id>',
                 methods=['GET'], endpoint='volume_types')
@login_required
def biganimal_volume_types(region_id, provider_id):
    """Get Volume Types."""
    if not region_id or not provider_id:
        return make_json_response(data=[])
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    biganimal_volumes = biganimal_obj.get_volume_types(region_id, provider_id)
    return make_json_response(data=biganimal_volumes)


@blueprint.route('/volume_properties/<region_id>/<provider_id>/<volume_type>',
                 methods=['GET'], endpoint='volume_properties')
@login_required
def biganimal_volume_properties(region_id, provider_id, volume_type):
    """Get Volume Properties."""
    if not region_id or not provider_id:
        return make_json_response(data=[])
    biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
    biganimal_volume_properties = biganimal_obj.get_volume_properties(
        region_id,
        provider_id,
        volume_type)
    return make_json_response(data=biganimal_volume_properties)


class BigAnimalProvider():
    """BigAnimal provider class"""
    BASE_URL = 'https://portal.biganimal.com/api/v3'

    def __init__(self):
        self.provider = {}
        self.device_code = {}
        self.token = {}
        self.raw_access_token = None
        self.access_token = None
        self.token_error = {}
        self.token_status = -1
        self.regions = []
        self.get_auth_provider()
        self.project_id = None

    def _get_headers(self):
        return {
            'content-type': MIMETYPE_APP_JSON,
            'Authorization': 'Bearer {0}'.format(self.access_token)
        }

    def get_auth_provider(self):
        """Get Authentication Provider Relevant Information."""
        provider_resp = requests.get("{0}/{1}".format(self.BASE_URL,
                                                      'auth/provider'))
        if provider_resp.status_code == 200 and provider_resp.content:
            self.provider = json.loads(provider_resp.content)

    def get_device_code(self):
        """Get device code"""
        _url = "{0}/{1}".format(self.provider['issuerUri'],
                                'oauth/device/code')
        _headers = {"content-type": "application/x-www-form-urlencoded"}
        _data = {
            'client_id': self.provider['clientId'],
            'audience': self.provider['audience'],
            'scope': self.provider['scope']
        }
        device_resp = requests.post(_url,
                                    headers=_headers,
                                    data=_data)

        if device_resp.status_code == 200 and device_resp.content:
            self.device_code = json.loads(device_resp.content)
            return self.device_code['verification_uri_complete']

    def polling_for_token(self):
        # Polling for the Token
        _url = "{0}/{1}".format(self.provider['issuerUri'], 'oauth/token')
        _headers = {"content-type": "application/x-www-form-urlencoded"}
        _data = {
            'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
            'device_code': self.device_code['device_code'],
            'client_id': self.provider['clientId']
        }
        token_resp = requests.post(_url,
                                   headers=_headers,
                                   data=_data)
        if token_resp.status_code == 200:
            self.token = json.loads(token_resp.content)
            self.raw_access_token = self.token['access_token']
            self.token_error['error'] = None
            self.token_status = 1
            status, msg = self.exchange_token()
            if status and not self._check_admin_permission():
                return False, gettext('forbidden')
            return status, msg
        elif token_resp.status_code == 403:
            self.token_error = json.loads(token_resp.content)
            if self.token_error['error'] == 'authorization_pending' or\
                    self.token_error['error'] == 'access_denied':
                self.token_status = 0
                return False, self.token_error['error']
        return False, None

    def exchange_token(self):
        _url = "{0}/{1}".format(self.BASE_URL, 'auth/token')
        _headers = {"content-type": "application/json",
                    "accept": "application/json"}
        _data = {'token': self.raw_access_token}
        token_resp = requests.post(_url,
                                   headers=_headers,
                                   data=json.dumps(_data))

        final_token = json.loads(token_resp.content)
        if token_resp.status_code == 200:
            self.access_token = final_token['token']
            return True, None
        else:
            return False, self.token_error['error']

    def _check_admin_permission(self):
        """
        Check wehether the user has valid role or not.
        There is no direct way to do this, so just checking the create cluster
        permission.
        """
        _url = "{0}/{1}".format(
            self.BASE_URL,
            'user-info')
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code != 200:
            return False
        if resp.status_code == 200 and resp.content:
            content = json.loads(resp.content)
            if 'data' in content:
                # BigAnimal introduced Project feature in v3,
                # so all the existing clusters moved to the default Project.
                # For now, we can get the Proj Id by replacing 'org' to 'prj'
                # in organization ID: org_1234  -> prj_1234
                proj_id = content['data']['organizationId'].replace('org',
                                                                    'prj')
                for permission in content['data']['scopedPermissions']:
                    if proj_id == permission['scope'] and\
                            'create:clusters' in permission['permissions']:
                        return True
        return False

    def get_providers(self, project_id):
        """Get cloud providers"""
        if not project_id:
            return False, gettext('Project not provided.')
        _url = '{0}/projects/{1}/cloud-providers'.format(
            self.BASE_URL, project_id)
        providers = []
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            self.project_id = project_id
            provider_resp = json.loads(resp.content)
            for value in provider_resp['data']:
                providers.append({
                    'label': value['cloudProviderName'],
                    'value': value['cloudProviderId'],
                    'connected': value['connected']})
            return providers, None
        elif resp.content:
            provider_resp = json.loads(resp.content)
            return [], provider_resp['error']['message']
        else:
            return [], gettext('Error retrieving providers.')

    def get_regions(self):
        """Get regions"""
        _url = '{0}/projects/{1}/regions'.format(
            self.BASE_URL, self.project_id)
        regions = []
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            regions_resp = json.loads(resp.content)
            for value in regions_resp['data']:
                regions.append({
                    'label': value['regionName'],
                    'value': value['regionId']
                })
                self.regions.append(value['regionId'])
            return True, regions
        elif resp.content:
            regions_resp = json.loads(resp.content)
            return False, regions_resp['error']['message']
        else:
            return False, gettext('Error retrieving regions.')

    def get_postgres_types(self):
        """Get Postgres Types."""
        _url = "{0}/projects/{1}/pg-types".format(
            self.BASE_URL, self.project_id)
        pg_types = []
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            pg_types_resp = json.loads(resp.content)
            for value in pg_types_resp['data']:
                # Extreme HA is in Beta, so avoid it
                if len(value['supportedClusterArchitectureIds']) != 1:
                    pg_types.append({
                        'label': value['pgTypeName'],
                        'value': value['pgTypeId']
                    })
        return pg_types

    def get_postgres_versions(self, cluster_type, pg_type):
        """Get Postgres Versions."""
        if not cluster_type or not pg_type:
            return []

        _url = "{0}/projects/{1}/pg-versions?clusterArchitectureIds={2}" \
               "&pgTypeIds={3}".format(self.BASE_URL, self.project_id,
                                       cluster_type, pg_type)
        pg_versions = []
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            pg_versions_resp = json.loads(resp.content)
            for value in pg_versions_resp['data']:
                pg_versions.append({
                    'label': value['pgVersionName'],
                    'value': value['pgVersionId']
                })
        return pg_versions

    def get_instance_types(self, region_id, provider_id):
        """GEt Instance Types."""
        if region_id not in self.regions or not provider_id:
            return []
        _url = '{0}/projects/{1}/cloud-providers/{2}/regions/{3}/' \
               'instance-types?sort=instanceTypeName'.\
            format(self.BASE_URL, self.project_id, provider_id, region_id)
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            pg_types = json.loads(resp.content)
            _sorted_data = sorted(pg_types['data'],
                                  key=lambda x: int(x['cpu']))
            return _sorted_data
        return []

    def get_volume_types(self, region_id, provider_id):
        """Get Volume Types."""
        if region_id not in self.regions:
            return []

        _url = '{0}/projects/{1}/cloud-providers/{2}/regions/{3}/volume-types'\
            .format(self.BASE_URL, self.project_id, provider_id, region_id)
        volume_types = []
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            volume_resp = json.loads(resp.content)
            for value in volume_resp['data']:
                if value['enabledInRegion']:
                    volume_types.append({
                        'label': value['volumeTypeName'],
                        'value': value['volumeTypeId'],
                        'supportedInstanceFamilyNames': value[
                            'supportedInstanceFamilyNames']})
        return volume_types

    def get_volume_properties(self, region_id, provider_id, volume_type):
        """Get Volume Properties."""
        if region_id not in self.regions:
            return []

        _url = '{0}/projects/{1}/cloud-providers/{2}/regions/{3}/' \
               'volume-types/{4}/volume-properties'\
            .format(self.BASE_URL, self.project_id, provider_id, region_id,
                    volume_type)
        volume_properties = []
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            volume_prop = json.loads(resp.content)
            for value in volume_prop['data']:
                volume_properties.append({
                    'label': value['volumePropertiesName'],
                    'value': value['volumePropertiesId']
                })
        return volume_properties

    def get_projects(self):
        projects = []
        _url = '{0}/projects'.format(self.BASE_URL)
        resp = requests.get(_url, headers=self._get_headers())
        if resp.status_code == 200 and resp.content:
            project_resp = json.loads(resp.content)
            for value in project_resp['data']:
                projects.append({
                    'label': value['projectName'],
                    'value': value['projectId']
                })
            return projects, None
        elif resp.content:
            project_resp = json.loads(resp.content)
            return [], project_resp['error']['message']
        else:
            return [], gettext('Error retrieving projects.')


def clear_biganimal_session():
    """Clear session data."""
    if 'biganimal' in session:
        session.pop('biganimal')


def deploy_on_biganimal(data):
    """Deploy Postgres instance on BigAnimal"""
    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)
    _label = data['instance_details']['name']
    _private_network = '1' if str(data['instance_details']['cloud_type']
                                  ) == 'private' else '0'
    _instance_size = data['instance_details']['instance_size'].split('||')[1]
    nodes = 1

    if data['cluster_details']['cluster_type'] == HA_CLUSTER_ARCH:
        nodes = int(data['cluster_details']['replicas']) + nodes
    elif data['cluster_details']['cluster_type'] == EHA_CLUSTER_ARCH:
        nodes = 5

    args = [_cmd_script,
            data['cloud'],
            'create-instance',
            '--name',
            data['instance_details']['name'],
            '--project',
            str(data['cluster_details']['project']),
            '--cloud-provider',
            str(data['cluster_details']['provider']),
            '--region',
            str(data['instance_details']['region']),
            '--db-type',
            str(data['db_details']['database_type']),
            '--db-version',
            str(data['db_details']['postgres_version']),
            '--volume-type',
            str(data['instance_details']['volume_type']),
            '--volume-properties',
            str(data['instance_details'].get('volume_properties',
                                             data['instance_details'][
                                                 'volume_type'])),
            '--volume-size',
            str(data['instance_details'].get('volume_size', None)),
            '--volume-IOPS',
            str(data['instance_details'].get('volume_IOPS', None)),
            '--throughput',
            str(data['instance_details'].get('disk_throughput', None)),
            '--instance-type',
            str(_instance_size),
            '--private-network',
            _private_network,
            '--cluster-arch',
            data['cluster_details']['cluster_type'],
            '--nodes',
            str(nodes),
            '--replicas',
            str(data['cluster_details']['replicas'])]

    if 'biganimal_public_ip' in data['instance_details']:
        args.append('--public-ip')
        args.append(str(data['instance_details']['biganimal_public_ip']))

    _cmd_msg = '{0} {1} {2}'.format(_cmd, _cmd_script, ' '.join(args))
    try:
        sid = _create_server({
            'gid': data['db_details']['gid'],
            'name': data['instance_details']['name'],
            'db': 'edb_admin',
            'username': 'edb_admin',
            'port': 5432,
            'cloud_status': -1
        })

        p = BatchProcess(
            desc=CloudProcessDesc(sid, _cmd_msg,
                                  data['cloud'],
                                  data['instance_details']['name']
                                  ),
            cmd=_cmd,
            args=args
        )

        env = dict()
        biganimal_obj = pickle.loads(session['biganimal']['provider_obj'])
        env['BIGANIMAL_ACCESS_KEY'] = biganimal_obj.access_token

        if 'password' in data['db_details']:
            env['BIGANIMAL_DATABASE_PASSWORD'] = data[
                'db_details']['password']

        p.set_env_variables(None, env=env)
        p.update_server_id(p.id, sid)
        p.start()

        return True, p, {'label': _label, 'sid': sid}

    except Exception as e:
        current_app.logger.exception(e)
        return False, None, str(e)
