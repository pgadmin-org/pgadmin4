# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2023, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################

# Google Cloud Deployment Implementation
import pickle
import json
import os
from urllib.parse import unquote

from config import root
from pgadmin.utils.csrf import pgCSRFProtect
from pgadmin.utils.ajax import plain_text_response, unauthorized, \
    make_json_response, bad_request
from pgadmin.misc.bgprocess import BatchProcess
from pgadmin.misc.cloud.utils import _create_server, CloudProcessDesc
from pgadmin.utils import PgAdminModule, filename_with_file_manager_path
from flask_security import login_required
from flask import session, current_app, request
from flask_babel import gettext as _

from oauthlib.oauth2 import AccessDeniedError
from googleapiclient import discovery
from googleapiclient.errors import HttpError
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

MODULE_NAME = 'google'
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'  # Required for Oauth2


class GooglePostgresqlModule(PgAdminModule):
    """Cloud module to deploy on Google Cloud"""

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module.
        """
        stylesheets = []
        return stylesheets

    def get_exposed_url_endpoints(self):
        return ['google.verify_credentials',
                'google.projects',
                'google.regions',
                'google.database_versions',
                'google.instance_types',
                'google.availability_zones',
                'google.verification_ack',
                'google.callback']


blueprint = GooglePostgresqlModule(MODULE_NAME, __name__,
                                   static_url_path='/misc/cloud/google')


@blueprint.route("/")
@login_required
def index():
    return bad_request(errormsg=_("This URL cannot be called directly."))


@blueprint.route('/verify_credentials/',
                 methods=['POST'], endpoint='verify_credentials')
@login_required
def verify_credentials():
    """
    Initiate process of authorisation for google oauth2
    """
    data = json.loads(request.data)
    client_secret_path = data['secret']['client_secret_file'] if \
        'client_secret_file' in data['secret'] else None
    status = False
    error = None
    res_data = {}

    client_secret_path = unquote(client_secret_path)
    try:
        client_secret_path = \
            filename_with_file_manager_path(client_secret_path)
    except PermissionError as e:
        return unauthorized(errormsg=str(e))
    except Exception as e:
        return bad_request(errormsg=str(e))

    if client_secret_path and os.path.exists(client_secret_path):
        with open(client_secret_path, 'r') as json_file:
            client_config = json.load(json_file)

        if 'google' not in session:
            session['google'] = {}

        if 'google_obj' not in session['google'] or \
                session['google']['client_config'] != client_config:
            _google = Google(client_config)
        else:
            _google = pickle.loads(session['google']['google_obj'])

        # get auth url
        host_url = request.origin + '/'
        if request.root_path != '':
            host_url = host_url + request.root_path + '/'

        auth_url, error_msg = _google.get_auth_url(host_url)
        if error_msg:
            error = error_msg
        else:
            status = True
            res_data = {'auth_url': auth_url}
            # save google object
        session['google']['client_config'] = client_config
        session['google']['google_obj'] = pickle.dumps(_google, -1)
    else:
        error = 'Client secret path not found'
        session.pop('google', None)

    return make_json_response(success=status, errormsg=error, data=res_data)


@blueprint.route('/callback',
                 methods=['GET'], endpoint='callback')
@pgCSRFProtect.exempt
@login_required
def callback():
    """
    Call back function on google authentication response.
    :return:
    """
    google_obj = pickle.loads(session['google']['google_obj'])
    res = google_obj.callback(request)
    session['google']['google_obj'] = pickle.dumps(google_obj, -1)
    return plain_text_response(res)


@blueprint.route('/verification_ack',
                 methods=['GET'], endpoint='verification_ack')
@login_required
def verification_ack():
    """
    Checks for google oauth2 authorisation confirmation
    :return:
    """
    verified = False
    if 'google' in session and 'google_obj' in session['google']:
        google_obj = pickle.loads(session['google']['google_obj'])
        verified, error = google_obj.verification_ack()
        session['google']['google_obj'] = pickle.dumps(google_obj, -1)
        return make_json_response(success=verified, errormsg=error)
    else:
        return make_json_response(success=verified,
                                  errormsg='Authentication is failed.')


@blueprint.route('/projects/',
                 methods=['GET'], endpoint='projects')
@login_required
def get_projects():
    """
    Lists the projects for authorized user
    :return: list of projects
    """
    if 'google' in session and 'google_obj' in session['google']:
        google_obj = pickle.loads(session['google']['google_obj'])
        projects_list = google_obj.get_projects()
        return make_json_response(data=projects_list)


@blueprint.route('/regions/<project_id>',
                 methods=['GET'], endpoint='regions')
@login_required
def get_regions(project_id):
    """
    Lists regions based on project for authorized user
    :param project_id: google project id
    :return: google cloud sql region list
    """
    if 'google' in session and 'google_obj' in session['google'] \
            and project_id:
        google_obj = pickle.loads(session['google']['google_obj'])
        regions_list = google_obj.get_regions(project_id)
        session['google']['google_obj'] = pickle.dumps(google_obj, -1)
        return make_json_response(data=regions_list)
    else:
        return make_json_response(data=[])


@blueprint.route('/availability_zones/<region>',
                 methods=['GET'], endpoint='availability_zones')
@login_required
def get_availability_zones(region):
    """
    List availability zones for specified region
    :param region: google region
    :return: google cloud sql availability zone list
    """
    if 'google' in session and 'google_obj' in session['google'] and region:
        google_obj = pickle.loads(session['google']['google_obj'])
        availability_zone_list = google_obj.get_availability_zones(region)
        return make_json_response(data=availability_zone_list)
    else:
        return make_json_response(data=[])


@blueprint.route('/instance_types/<project_id>/<region>/<instance_class>',
                 methods=['GET'], endpoint='instance_types')
@login_required
def get_instance_types(project_id, region, instance_class):
    """
    List the instances types for specified google project, region &
    instance type
    :param project_id: google project id
    :param region: google cloud region
    :param instance_class: google cloud sql instnace class
    :return:
    """
    if 'google' in session and 'google_obj' in session['google'] and \
            project_id and region:
        google_obj = pickle.loads(session['google']['google_obj'])
        instance_types_dict = google_obj.get_instance_types(
            project_id, region)
        instance_types_list = instance_types_dict.get(instance_class, [])
        return make_json_response(data=instance_types_list)
    else:
        return make_json_response(data=[])


@blueprint.route('/database_versions/',
                 methods=['GET'], endpoint='database_versions')
@login_required
def get_database_versions():
    """
    Lists the postgresql database versions.
    :return: PostgreSQL version list
    """
    if 'google' in session and 'google_obj' in session['google']:
        google_obj = pickle.loads(session['google']['google_obj'])
        db_version_list = google_obj.get_database_versions()
        return make_json_response(data=db_version_list)
    else:
        return make_json_response(data=[])


def deploy_on_google(data):
    """Deploy the Postgres instance on RDS."""
    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)
    _label = data['instance_details']['name']

    # Supported arguments for google cloud sql deployment
    args = [_cmd_script,
            data['cloud'],
            'create-instance',

            '--project', data['instance_details']['project'],

            '--region', data['instance_details']['region'],

            '--name', data['instance_details']['name'],

            '--db-version', data['instance_details']['db_version'],

            '--instance-type', data['instance_details']['instance_type'],

            '--storage-type', data['instance_details']['storage_type'],

            '--storage-size', str(data['instance_details']['storage_size']),

            '--public-ip', str(data['instance_details']['public_ips']),

            '--availability-zone',
            data['instance_details']['availability_zone'],

            '--high-availability',
            str(data['instance_details']['high_availability']),

            '--secondary-availability-zone',
            data['instance_details']['secondary_availability_zone'],
            ]

    _cmd_msg = '{0} {1} {2}'.format(_cmd, _cmd_script, ' '.join(args))
    try:
        sid = _create_server({
            'gid': data['db_details']['gid'],
            'name': data['instance_details']['name'],
            'db': 'postgres',
            'username': 'postgres',
            'port': 5432,
            'cloud_status': -1
        })

        p = BatchProcess(
            desc=CloudProcessDesc(sid, _cmd_msg, data['cloud'],
                                  data['instance_details']['name']),
            cmd=_cmd,
            args=args
        )

        # Set env variables for background process of deployment
        env = dict()
        google_obj = pickle.loads(session['google']['google_obj'])
        env['GOOGLE_CREDENTIALS'] = json.dumps(google_obj.credentials_json)

        if 'db_password' in data['db_details']:
            env['GOOGLE_DATABASE_PASSWORD'] = data['db_details']['db_password']

        p.set_env_variables(None, env=env)
        p.update_server_id(p.id, sid)
        p.start()

        return True, p, {'label': _label, 'sid': sid}
    except Exception as e:
        current_app.logger.exception(e)
        return False, None, str(e)


def clear_google_session():
    """Clear Google Session"""
    if 'google' in session:
        session.pop('google')


class Google:
    def __init__(self, client_config=None):
        # Google cloud sql api versions
        self._cloud_resource_manager_api_version = 'v1'
        self._sqladmin_api_version = 'v1'
        self._compute_api_version = 'v1'

        # Scope required for google cloud sql deployment
        self._scopes = ['https://www.googleapis.com/auth/cloud-platform',
                        'https://www.googleapis.com/auth/sqlservice.admin']

        # Instance classed
        self._instance_classes = [{'label': 'Standard', 'value': 'standard'},
                                  {'label': 'High Memory', 'value': 'highmem'},
                                  {'label': 'Shared', 'value': 'shared'}]

        self._client_config = client_config
        self._credentials = None
        self.credentials_json = None
        self._project_id = None
        self._regions = []
        self._availability_zones = {}
        self._verification_successful = False
        self._verification_error = None
        self._redirect_url = None

    def get_auth_url(self, host_url):
        """
        Provides google authorisation url
        :param host_url: Base url for hosting application
        :return: authorisation url to complete authentication
        """
        auth_url = None
        error = None
        # reset below variable to get latest values in fresh
        # authentication call
        self._verification_successful = False
        self._verification_error = None
        try:
            self._redirect_url = host_url + 'google/callback'
            flow = InstalledAppFlow.from_client_config(
                client_config=self._client_config, scopes=self._scopes,
                redirect_uri=self._redirect_url)
            auth_url, state = flow.authorization_url(
                prompt='select_account', access_type='offline',
                include_granted_scopes='true')
            session["state"] = state
        except Exception as e:
            error = str(e)
            self._verification_error = error
        return auth_url, error

    def callback(self, flask_request):
        """
        Callback function on completion of google authorisation request
        :param flask_request:
        :return: Success or error message
        """
        try:
            authorization_response = flask_request.url
            if session['state'] != flask_request.args.get('state', None):
                self._verification_successful = False,
                self._verification_error = 'Invalid state parameter'
            flow = InstalledAppFlow.from_client_config(
                client_config=self._client_config, scopes=self._scopes,
                redirect_uri=self._redirect_url)
            flow.fetch_token(authorization_response=authorization_response)
            self._credentials = flow.credentials
            self.credentials_json = \
                self._credentials_to_dict(self._credentials)
            self._verification_successful = True
            return 'The authentication flow has completed. ' \
                   'This window will be closed.'
        except AccessDeniedError as er:
            self._verification_successful = False
            self._verification_error = er.error
            if self._verification_error == 'access_denied':
                self._verification_error = 'Access denied.'
            return self._verification_error

    @staticmethod
    def _credentials_to_dict(credentials):
        return {'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes,
                'id_token': credentials.id_token}

    def verification_ack(self):
        """Check the Verification is done or not."""
        return self._verification_successful, self._verification_error

    def _get_credentials(self, scopes):
        """
        Provides google credentials for google cloud sql api calls
        :param scopes: Required scope of credentials
        :return: google credential object
        """
        if not self._credentials or not self._credentials.valid:
            if self._credentials and self._credentials.expired and \
                    self._credentials.refresh_token and \
                    self._credentials.has_scopes(scopes):
                self._credentials.refresh(Request())
                return self._credentials
        return self._credentials

    def get_projects(self):
        """
        List the google projects for authorised user
        :return:
        """
        projects = []
        credentials = self._get_credentials(self._scopes)
        service = discovery.build('cloudresourcemanager',
                                  self._cloud_resource_manager_api_version,
                                  credentials=credentials)
        req = service.projects().list()
        res = req.execute()
        for project in res.get('projects', []):
            projects.append({'label': project['projectId'],
                             'value': project['projectId']})
        return projects

    def get_regions(self, project):
        """
        List regions for specified google cloud project
        :param project: google cloud project id.
        :return:
        """
        self._project_id = project
        credentials = self._get_credentials(self._scopes)
        service = discovery.build('compute',
                                  self._compute_api_version,
                                  credentials=credentials)
        try:
            req = service.regions().list(project=project)
            res = req.execute()
        except HttpError:
            self._regions = []
            return self._regions
        for item in res.get('items', []):
            region_name = item['name']
            self._regions.append({'label': region_name, 'value': region_name})
            region_zones = item.get('zones', [])
            region_zones = list(
                map(lambda region: region.split('/')[-1], region_zones))
            self._availability_zones[region_name] = region_zones
        return self._regions

    def get_availability_zones(self, region):
        """
        List availability zones in given google cloud region
        :param region: google cloud region
        :return:
        """
        az_list = []
        for az in self._availability_zones.get(region, []):
            az_list.append({'label': az, 'value': az})
        return az_list

    def get_instance_types(self, project, region):
        """
        Lists google cloud sql instance types.
        :param project:
        :param region:
        :return:
        """
        standard_instances = []
        shared_instances = []
        high_mem = []
        credentials = self._get_credentials(self._scopes)
        service = discovery.build('sqladmin',
                                  self._sqladmin_api_version,
                                  credentials=credentials)
        req = service.tiers().list(project=project)
        res = req.execute()
        for item in res.get('items', []):
            if region in item.get('region', []):
                if item['tier'].find('standard') != -1:
                    vcpu = item['tier'].split('-')[-1]
                    mem = round(int(item['RAM']) / (1024 * 1024))
                    label = vcpu + ' vCPU, ' + str(round(mem / 1024)) + ' GB'
                    value = 'db-custom-' + str(vcpu) + '-' + str(mem)
                    standard_instances.append({'label': label, 'value': value})
                elif item['tier'].find('highmem') != -1:
                    vcpu = item['tier'].split('-')[-1]
                    mem = round(int(item['RAM']) / (1024 * 1024))
                    label = vcpu + ' vCPU, ' + str(round(mem / 1024)) + ' GB'
                    value = 'db-custom-' + str(vcpu) + '-' + str(mem)
                    high_mem.append({'label': label, 'value': value})
                else:
                    label = '1 vCPU, ' + str(
                        round((int(item['RAM']) / 1073741824), 2)) + ' GB'
                    value = item['tier']
                    shared_instances.append({'label': label, 'value': value})
        instance_types = {'standard': standard_instances,
                          'highmem': high_mem,
                          'shared': shared_instances}
        return instance_types

    def get_database_versions(self):
        """
        Lists the PostgreSQL database versions
        :return:
        """
        pg_database_versions = []
        database_versions = []
        credentials = self._get_credentials(self._scopes)
        service = discovery.build('sqladmin',
                                  self._sqladmin_api_version,
                                  credentials=credentials)
        req = service.flags().list()
        res = req.execute()
        for item in res.get('items', []):
            if item.get('name', '') == 'max_parallel_workers':
                pg_database_versions = item.get('appliesTo', [])
        for version in pg_database_versions:
            label = (version.title().split('_')[0])[0:7] \
                + 'SQL ' + version.split('_')[1]
            database_versions.append({'label': label, 'value': version})
        return database_versions
