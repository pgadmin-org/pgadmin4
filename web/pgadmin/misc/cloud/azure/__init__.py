# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2023, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################

# Azure implementation
import config
import secrets
from pgadmin.misc.cloud.utils import _create_server, CloudProcessDesc
from pgadmin.misc.bgprocess.processes import BatchProcess
from pgadmin import make_json_response
from pgadmin.utils import PgAdminModule
from flask_security import login_required
import json
from flask import session, current_app, request
from flask_login import current_user
from config import root
from pgacloud.utils.azure_cache import load_persistent_cache, \
    TokenCachePersistenceOptions
import os


from azure.mgmt.rdbms.postgresql_flexibleservers import \
    PostgreSQLManagementClient
from azure.identity import AzureCliCredential, DeviceCodeCredential,\
    AuthenticationRecord
from azure.mgmt.resource import ResourceManagementClient
from azure.mgmt.subscription import SubscriptionClient
from azure.mgmt.rdbms.postgresql_flexibleservers.models import \
    NameAvailabilityRequest

MODULE_NAME = 'azure'


class AzurePostgresqlModule(PgAdminModule):
    """Cloud module to deploy on Azure Postgresql"""

    def get_exposed_url_endpoints(self):
        return ['azure.verify_credentials',
                'azure.check_cluster_name_availability',
                'azure.subscriptions',
                'azure.resource_groups',
                'azure.regions',
                'azure.zone_redundant_ha_supported',
                'azure.db_versions',
                'azure.instance_types',
                'azure.availability_zones',
                'azure.storage_types',
                'azure.get_azure_verification_codes']


blueprint = AzurePostgresqlModule(MODULE_NAME, __name__,
                                  static_url_path='/misc/cloud/azure')


@blueprint.route('/verify_credentials/',
                 methods=['POST'], endpoint='verify_credentials')
@login_required
def verify_credentials():
    """Verify Credentials."""
    data = json.loads(request.data)
    session_token = data['secret']['session_token'] if \
        'session_token' in data['secret'] else None
    tenant_id = data['secret']['azure_tenant_id'] if \
        'azure_tenant_id' in data['secret'] else None
    interactive_browser_credential = False if \
        data['secret']['auth_type'] == 'azure_cli_credential' else True

    if 'azure' not in session:
        session['azure'] = {}

    error = ''
    status = True
    if 'azure_obj' not in session['azure'] or \
        session['azure']['auth_type'] != data['secret']['auth_type'] or \
            session['azure']['azure_tenant_id'] != tenant_id:
        if 'azure_obj' in session['azure']:
            del session['azure']['azure_obj']
        azure = Azure(
            interactive_browser_credential=interactive_browser_credential,
            tenant_id=tenant_id,
            session_token=session_token)
        status, error = azure.validate_azure_credentials()
        if status:
            session['azure']['azure_obj'] = azure
            session['azure']['auth_type'] = data['secret']['auth_type']
            session['azure']['azure_tenant_id'] = tenant_id
        if not status and 'double check your tenant name' in error:
            error = 'Authentication failed.Please double check tenant id.'
    return make_json_response(success=status, errormsg=error)


@blueprint.route('/get_azure_verification_codes/',
                 methods=['GET'], endpoint='get_azure_verification_codes')
@login_required
def get_azure_verification_codes():
    """Get azure code for authentication."""
    azure_auth_code = None
    status = False
    if 'azure' in session and 'azure_auth_code' in session['azure']:
        azure_auth_code = session['azure']['azure_auth_code']
        status = True
    return make_json_response(success=status,
                              data=azure_auth_code)


@blueprint.route('/check_cluster_name_availability/',
                 methods=['GET'], endpoint='check_cluster_name_availability')
@login_required
def check_cluster_name_availability():
    """Check Server Name availability."""
    data = request.args
    azure = session['azure']['azure_obj']
    server_name_available, error = \
        azure.check_cluster_name_availability(data['name'])
    if server_name_available:
        return make_json_response(success=server_name_available,
                                  errormsg=error)
    else:
        return make_json_response(
            status=410,
            success=0,
            errormsg=error)


@blueprint.route('/subscriptions/',
                 methods=['GET'], endpoint='subscriptions')
@login_required
def get_azure_subscriptions():
    """
    List subscriptions.
    :return:
    """
    azure = session['azure']['azure_obj']
    subscriptions_list = azure.list_subscriptions()
    return make_json_response(data=subscriptions_list)


@blueprint.route('/resource_groups/<subscription_id>',
                 methods=['GET'], endpoint='resource_groups')
@login_required
def get_azure_resource_groups(subscription_id):
    """
    Fetch resource groups based on subscription.
    """
    if not subscription_id:
        return make_json_response(data=[])
    azure = session['azure']['azure_obj']
    resource_groups_list = azure.list_resource_groups(subscription_id)
    return make_json_response(data=resource_groups_list)


@blueprint.route('/regions/<subscription_id>',
                 methods=['GET'], endpoint='regions')
@login_required
def get_azure_regions(subscription_id):
    """List Regions for Azure."""
    if not subscription_id:
        return make_json_response(data=[])
    azure = session['azure']['azure_obj']
    regions_list = azure.list_regions(subscription_id)
    session['azure']['azure_obj'] = azure
    return make_json_response(data=regions_list)


@blueprint.route('/zone_redundant_ha_supported/<region_name>',
                 methods=['GET'], endpoint='zone_redundant_ha_supported')
@login_required
def is_ha_supported(region_name):
    """Check high availability support in given region."""
    azure = session['azure']['azure_obj']
    is_zone_redundant_ha_supported = \
        azure.is_zone_redundant_ha_supported(region_name)
    return make_json_response(data={'is_zone_redundant_ha_supported':
                                    is_zone_redundant_ha_supported})


@blueprint.route('/availability_zones/<region_name>',
                 methods=['GET'], endpoint='availability_zones')
@login_required
def get_azure_availability_zones(region_name):
    """List availability zones in given region."""
    if not region_name:
        return make_json_response(data=[])
    azure = session['azure']['azure_obj']
    availability_zones = azure.list_azure_availability_zones(region_name)
    session['azure']['azure_obj'] = azure
    return make_json_response(data=availability_zones)


@blueprint.route('/db_versions/<availability_zone>',
                 methods=['GET'], endpoint='db_versions')
@login_required
def get_azure_postgresql_server_versions(availability_zone):
    """Get azure postgres database versions."""
    if not availability_zone:
        return make_json_response(data=[])
    azure = session['azure']['azure_obj']
    azure_postgresql_server_versions = \
        azure.list_azure_postgresql_server_versions(availability_zone)
    session['azure']['azure_obj'] = azure
    return make_json_response(data=azure_postgresql_server_versions)


@blueprint.route('/instance_types/<availability_zone>/<db_version>',
                 methods=['GET'], endpoint='instance_types')
@login_required
def get_azure_instance_types(availability_zone, db_version):
    """Get instance types for Azure."""
    if not db_version:
        return make_json_response(data=[])
    azure = session['azure']['azure_obj']
    instance_types = azure.list_compute_types(availability_zone, db_version)
    return make_json_response(data=instance_types)


@blueprint.route('/storage_types/<availability_zone>/<db_version>',
                 methods=['GET'], endpoint='storage_types')
@login_required
def list_azure_storage_types(availability_zone, db_version):
    """Get the storage types supported."""
    if not db_version:
        return make_json_response(data=[])
    azure = session['azure']['azure_obj']
    storage_types = azure.list_storage_types(availability_zone, db_version)
    return make_json_response(data=storage_types)


@blueprint.route('/clear_session',
                 methods=['GET'], endpoint='clear_session')
@login_required
def clear_session():
    clear_azure_session()
    return make_json_response(success=1)


class Azure:
    def __init__(self, interactive_browser_credential, tenant_id=None,
                 session_token=None, region='eastus'):
        self._clients = {}
        self._tenant_id = tenant_id
        self._session_token = session_token
        self._use_interactive_credential = interactive_browser_credential
        self.authentication_record_json = None
        self._cli_credentials = None
        self._credentials = None
        self._region = region
        self.subscription_id = None
        self._availability_zone = None
        self._available_capabilities_list = []
        self.azure_cache_name = current_user.username \
            + str(secrets.choice(range(1, 9999))) + "_msal.cache"
        self.azure_cache_location = config.AZURE_CREDENTIAL_CACHE_DIR + '/'

    ##########################################################################
    # Azure Helper functions
    ##########################################################################
    def validate_azure_credentials(self):
        """
        Validates azure credentials
        :return: True if valid credentials else false
        """
        status, identity = self._get_azure_credentials()
        session['azure']['azure_cache_file_name'] = self.azure_cache_name
        error = ''
        if not status:
            error = identity
        return status, error

    def _get_azure_credentials(self):
        try:
            if self._use_interactive_credential:
                _credentials = self._azure_interactive_auth()
            else:
                _credentials = self._azure_cli_auth()
        except Exception as e:
            return False, str(e)
        return True, _credentials

    def _azure_cli_auth(self):
        if self._cli_credentials is None:
            self._cli_credentials = AzureCliCredential()
            self.list_subscriptions()
        return self._cli_credentials

    @staticmethod
    def _azure_interactive_auth_prompt_callback(
            verification_uri, user_code, expires_at):
        azure_auth_code = {'verification_uri': verification_uri,
                           'user_code': user_code,
                           'expires_at': expires_at}
        session['azure']['azure_auth_code'] = azure_auth_code

    def _azure_interactive_auth(self):
        if self.authentication_record_json is None:
            _interactive_credential = DeviceCodeCredential(
                tenant_id=self._tenant_id,
                timeout=180,
                prompt_callback=self._azure_interactive_auth_prompt_callback,
                _cache=load_persistent_cache(TokenCachePersistenceOptions(
                    name=self.azure_cache_name, allow_unencrypted_storage=True)
                )
            )
            _auth_record = _interactive_credential.authenticate()
            self.authentication_record_json = _auth_record.serialize()
        else:
            deserialized_auth_record = AuthenticationRecord.deserialize(
                self.authentication_record_json)
            _interactive_credential = DeviceCodeCredential(
                tenant_id=self._tenant_id,
                timeout=180,
                prompt_callback=self._azure_interactive_auth_prompt_callback,
                _cache=load_persistent_cache(TokenCachePersistenceOptions(
                    name=self.azure_cache_name, allow_unencrypted_storage=True)
                ),
                authentication_record=deserialized_auth_record
            )
        return _interactive_credential

    def _get_azure_client(self, type):
        """ Create/cache/return an Azure client object """
        if type in self._clients:
            return self._clients[type]

        status, _credentials = self._get_azure_credentials()

        if type == 'postgresql':
            client = PostgreSQLManagementClient(_credentials,
                                                self.subscription_id)
        elif type == 'resource':
            client = ResourceManagementClient(_credentials,
                                              self.subscription_id)
        elif type == 'subscription':
            client = SubscriptionClient(_credentials)

        self._clients[type] = client
        return self._clients[type]

    def check_cluster_name_availability(self, cluster_name):
        """
        Checks whether given server name is available or not
        :param cluster_name
        """
        postgresql_client = self._get_azure_client('postgresql')
        res = postgresql_client.check_name_availability.execute(
            NameAvailabilityRequest(
                name=cluster_name,
                type='Microsoft.DBforPostgreSQL/flexibleServers'))
        res = res.__dict__
        return res['name_available'], res['message']

    def list_subscriptions(self):
        """
        List subscriptions
        :return:
        """
        subscription_client = self._get_azure_client('subscription')
        sub_list = subscription_client.subscriptions.list()
        subscriptions_list = []
        for group in list(sub_list):
            subscriptions_list.append(
                {'subscription_id': group.subscription_id,
                 'subscription_name': group.display_name})
        return subscriptions_list

    def list_resource_groups(self, subscription_id):
        """
        List the resource groups
        :param subscription_id:
        :return:
        """
        self.subscription_id = subscription_id
        resource_client = self._get_azure_client('resource')
        group_list = resource_client.resource_groups.list()
        resource_groups_list = []
        for group in list(group_list):
            resource_groups_list.append(
                {'label': group.name,
                 'value': group.name,
                 'region': group.location})
        return resource_groups_list

    def list_regions(self, subscription_id):
        """
        List regions depending on subscription id
        :param subscription_id:
        :return:
        """
        self.subscription_id = subscription_id
        subscription_client = self._get_azure_client('subscription')
        locations = subscription_client.subscriptions.list_locations(
            subscription_id=self.subscription_id)
        locations_list = []
        for location in locations:
            locations_list.append(
                {'label': location.display_name, 'value': location.name})
        return locations_list

    def is_zone_redundant_ha_supported(self, region):
        if self._region == region and \
                len(self._available_capabilities_list) > 1:
            return self._available_capabilities_list[0][
                'zone_redundant_ha_supported']
        else:
            self._available_capabilities_list = \
                self._get_available_capabilities_list(region)
            return self._available_capabilities_list[0][
                'zone_redundant_ha_supported']

    def list_azure_availability_zones(self, region):
        """
        List availability zones in the region
        :param region:
        :return:
        """
        self._region = region
        self._available_capabilities_list = \
            self._get_available_capabilities_list(region)
        availability_zones_list = []
        for capability in self._available_capabilities_list:
            zone = str(capability['zone'])
            if capability['zone'] == 'none':
                availability_zones_list.append({'label': 'No Preference',
                                                'value': zone})
            else:
                availability_zones_list.append({'label': zone,
                                                'value': zone})
        return availability_zones_list

    def list_azure_postgresql_server_versions(self, availability_zone):
        """
        :param availability_zone:
        :return: List of postgresql version available in specified availability
        zone.
        """
        self._availability_zone = availability_zone
        server_versions_list = []
        for capability in self._available_capabilities_list:
            if str(capability['zone']) == availability_zone:
                for supported_server_version in \
                        capability['supported_server_versions']:
                    server_version = supported_server_version['server_version']
                    server_versions_list.append({'label': str(server_version),
                                                 'value': server_version})
        return server_versions_list

    def list_compute_types(self, availability_zone, server_version):
        """
        :param availability_zone:
        :param server_version:
        :return: list of compute classes based on specified availability
        zone & server version.
        """
        compute_types_list = []
        for capability in self._available_capabilities_list:
            if str(capability['zone']) == availability_zone:
                for supported_server_version in \
                        capability['supported_server_versions']:
                    if supported_server_version['server_version'] == \
                            server_version:
                        compute_types = \
                            supported_server_version['compute_types']
                        for value in compute_types:
                            compute_types_list.append(
                                {'label': value['display_name'],
                                 'value': value['name'],
                                 'type': value['type']})
        return compute_types_list

    def list_storage_types(self, availability_zone, server_version):
        """

        :param availability_zone:
        :param server_version:
        :return:  list of storages classes based on specified availability
        """
        storage_types_list = []

        for capability in self._available_capabilities_list:
            if str(capability['zone']) == availability_zone:
                for supported_server_version in \
                        capability['supported_server_versions']:
                    if supported_server_version['server_version'] == \
                            server_version:
                        storage_types = \
                            supported_server_version['storage_types']
                        for value in storage_types:
                            storage_types_list.append({
                                'label': str(value['storage_size_gb']) +
                                ' GiB',
                                'value': value['storage_size_gb'],
                                'type': value['type']})
        return storage_types_list

    def _get_available_capabilities_list(self, region):
        """
        list capabilities & serialize them to normal list-dict format
        :param region:
        :return:
        """
        available_capabilities = \
            self._get_available_capabilities_object(region)
        return self.\
            _serialize_available_capabilities_list(available_capabilities)

    def _get_available_capabilities_object(self, region):
        """
        :param region:
        :return: azure capabilities object
        """
        postgresql_client = self._get_azure_client('postgresql')
        return postgresql_client.location_based_capabilities.execute(
            location_name=region)

    @staticmethod
    def _serialize_available_capabilities_list(available_capabilities):
        """
        :param available_capabilities:
        :return: serialized available capabilities list
        """
        available_capabilities_list = []
        for capability in available_capabilities:
            supported_server_version_dict = {}
            storage_types = []
            for supported_flexible_server_edition in \
                    capability.supported_flexible_server_editions:
                compute_type = supported_flexible_server_edition.name

                storage_types = Azure. \
                    _get_storage_types(compute_type,
                                       supported_flexible_server_edition,
                                       storage_types)

                supported_server_version_dict = Azure. \
                    _get_compute_types(compute_type,
                                       supported_flexible_server_edition,
                                       supported_server_version_dict,
                                       storage_types)

            supported_server_version_list = []
            for key, value in supported_server_version_dict.items():
                supported_server_version_list.append(
                    {'server_version': key,
                     'compute_types': value['compute_types'],
                     'storage_types': value['storage_types']})

            available_capabilities_list.append(
                {'zone': capability.zone,
                 'zone_redundant_ha_supported':
                     capability.zone_redundant_ha_supported,
                 'supported_server_versions':
                     supported_server_version_list})

        return available_capabilities_list

    @staticmethod
    def _get_storage_types(compute_type, supported_flexible_server_edition,
                           storage_types):
        for supported_storage_edition in \
                supported_flexible_server_edition.supported_storage_editions:
            for supported_storage_mb in \
                    supported_storage_edition.supported_storage_mb:
                supported_storage_mb_dict = supported_storage_mb.__dict__
                storage_types.append({'type': compute_type,
                                      'storage_size_gb':
                                          int(supported_storage_mb_dict[
                                              'storage_size_mb'] / 1024)})
        return storage_types

    @staticmethod
    def _get_compute_types(compute_type, supported_flexible_server_edition,
                           supported_server_version_dict, storage_types):
        for supported_server_version in \
                supported_flexible_server_edition.supported_server_versions:
            if not supported_server_version.name.isnumeric():
                continue

            if supported_server_version.name not in \
                    supported_server_version_dict:
                supported_server_version_dict[
                    supported_server_version.name] = {}

            compute_types_list = []
            for supported_vcore in supported_server_version.supported_vcores:
                vcore_dict = supported_vcore.__dict__
                compute_types_list.append(
                    {'type': compute_type,
                     'name': vcore_dict['name'],
                     'supportedIOPS': vcore_dict['additional_properties'][
                         'supportedIOPS'],
                     'display_name': vcore_dict['name'] + ' (' +
                        str(vcore_dict['v_cores']) + ' vCores, ' +
                        str(int(vcore_dict['supported_memory_per_vcore_mb'] /
                            1024 * vcore_dict['v_cores'])) + 'GiB memory, ' +
                        str(vcore_dict['additional_properties']
                            ['supportedIOPS']) +
                        ' max iops)'
                     })

            if 'compute_types' not in supported_server_version_dict[
                    supported_server_version.name]:
                supported_server_version_dict[supported_server_version.name][
                    'compute_types'] = compute_types_list
            else:
                supported_server_version_dict[supported_server_version.name][
                    'compute_types'] = \
                    supported_server_version_dict[
                        supported_server_version.name]['compute_types'] + (
                        compute_types_list)

            supported_server_version_dict[supported_server_version.name][
                'storage_types'] = storage_types

        return supported_server_version_dict


def deploy_on_azure(data):
    """Deploy the Postgres instance on Azure."""
    _cmd = 'python'
    _cmd_script = '{0}/pgacloud/pgacloud.py'.format(root)
    _label = data['instance_details']['name']

    if 'high_availability' in data['instance_details']:
        if data['instance_details']['high_availability']:
            data['instance_details']['high_availability'] = "ZoneRedundant"
        else:
            data['instance_details']['high_availability'] = "Disabled"

    args = [_cmd_script,

            'azure',

            '--region',
            str(data['instance_details']['region']),

            '--resource-group',
            data['instance_details']['resource_group'],

            'create-instance',
            '--name',
            data['instance_details']['name'],

            '--db-username',
            data['db_details']['db_username'],

            '--db-major-version',
            str(data['instance_details']['db_version']),

            '--instance_tier_type',
            data['instance_details']['db_instance_class'],

            '--instance-type',
            data['instance_details']['instance_type'],

            '--storage-size',
            str(data['instance_details']['storage_size']),

            '--public-ips',
            str(data['instance_details']['public_ips']),

            '--availability-zone',
            str(data['instance_details']['availability_zone']),

            '--high-availability',
            data['instance_details']['high_availability']
            ]

    _cmd_msg = '{0} {1} {2}'.format(_cmd, _cmd_script, ' '.join(args))
    try:
        sid = _create_server({
            'gid': data['db_details']['gid'],
            'name': data['instance_details']['name'],
            'db': 'postgres',
            'username': data['db_details']['db_username'],
            'port': 5432,
            'cloud_status': -1
        })

        p = BatchProcess(
            desc=CloudProcessDesc(sid, _cmd_msg, data['cloud'],
                                  data['instance_details']['name']),
            cmd=_cmd,
            args=args
        )

        env = dict()

        azure = session['azure']['azure_obj']
        env['AZURE_SUBSCRIPTION_ID'] = azure.subscription_id
        env['AUTH_TYPE'] = data['secret']['auth_type']
        env['AZURE_CRED_CACHE_NAME'] = azure.azure_cache_name
        env['AZURE_CRED_CACHE_LOCATION'] = azure.azure_cache_location
        if azure.authentication_record_json is not None:
            env['AUTHENTICATION_RECORD_JSON'] = \
                azure.authentication_record_json
            env['AZURE_TENANT_ID'] = data['secret']['azure_tenant_id']

        if 'db_password' in data['db_details']:
            env['AZURE_DATABASE_PASSWORD'] = data[
                'db_details']['db_password']

        p.set_env_variables(None, env=env)
        p.update_server_id(p.id, sid)
        p.start()

        # add pid: cache file dict in session['azure_cache_files_list']
        if 'azure_cache_files_list' in session and \
                session['azure_cache_files_list'] is not None:
            session['azure_cache_files_list'][p.id] = azure.azure_cache_name
        else:
            session['azure_cache_files_list'] = {p.id: azure.azure_cache_name}
        del session['azure']['azure_cache_file_name']
        return True, p, {'label': _label, 'sid': sid}
    except Exception as e:
        current_app.logger.exception(e)
        return False, None, str(e)
    finally:
        del session['azure']['azure_obj']


def clear_azure_session(pid=None):
    """Clear session data."""
    cache_file_to_delete = None
    if 'azure_cache_files_list' in session and \
            pid in session['azure_cache_files_list']:
        cache_file_to_delete = session['azure_cache_files_list'][pid]
        delete_azure_cache(cache_file_to_delete)
        del session['azure_cache_files_list'][pid]

    if 'azure' in session:
        if cache_file_to_delete is None and \
                'azure_cache_file_name' in session['azure']:
            cache_file_to_delete = session['azure']['azure_cache_file_name']
            delete_azure_cache(cache_file_to_delete)
        session.pop('azure')


def delete_azure_cache(file_name):
    """
    Delete specified file from azure cache directory
    :param file_name:
    :return:
    """
    file = config.AZURE_CREDENTIAL_CACHE_DIR + '/' + file_name
    # Delete cache file if exists
    if os.path.exists(file):
        os.remove(file)
