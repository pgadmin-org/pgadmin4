##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Azure PostgreSQL provider """
from azure.mgmt.rdbms.postgresql_flexibleservers import \
    PostgreSQLManagementClient
from azure.mgmt.rdbms.postgresql_flexibleservers.models import Sku, SkuTier, \
    CreateMode, Storage, Server, FirewallRule, HighAvailability
from azure.identity import AzureCliCredential, DeviceCodeCredential, \
    AuthenticationRecord
from azure.mgmt.resource import ResourceManagementClient
from azure.core.exceptions import ResourceNotFoundError
from providers._abstract import AbsProvider
import os
from utils.io import debug, error, output
from utils.misc import get_my_ip, get_random_id
import sys
CURRENT_PATH = os.path.dirname(os.path.realpath(__file__))
root = os.path.dirname(os.path.dirname(CURRENT_PATH))
sys.path.insert(0, root)
from pgadmin.misc.cloud.azure.azure_cache import load_persistent_cache, \
    TokenCachePersistenceOptions


class AzureProvider(AbsProvider):
    def __init__(self):
        self._clients = {}
        self._tenant_id = None
        self._client_id = None
        self._client_secret = None
        self._subscription_id = None
        self._default_region = None
        self._interactive_browser_credential = False
        self._available_capabilities = None
        self._credentials = None
        self._authentication_record_json = None
        self._cli_credentials = None
        self._azure_cred_cache_name = None
        self._azure_cred_cache_location = None

        # Get the credentials
        if 'AUTHENTICATION_RECORD_JSON' in os.environ:
            self._authentication_record_json = os.environ[
                'AUTHENTICATION_RECORD_JSON']

        if 'AZURE_SUBSCRIPTION_ID' in os.environ:
            self._subscription_id = os.environ['AZURE_SUBSCRIPTION_ID']

        if 'AZURE_TENANT_ID' in os.environ:
            self._tenant_id = os.environ['AZURE_TENANT_ID']

        if 'AUTH_TYPE' in os.environ:
            self._interactive_browser_credential = False \
                if os.environ['AUTH_TYPE'] == 'azure_cli_credential' else True

        if 'AZURE_DATABASE_PASSWORD' in os.environ:
            self._database_pass = os.environ['AZURE_DATABASE_PASSWORD']

        if 'AZURE_CRED_CACHE_NAME' in os.environ:
            self._azure_cred_cache_name = os.environ['AZURE_CRED_CACHE_NAME']

        if 'AZURE_CRED_CACHE_LOCATION' in os.environ:
            self._azure_cred_cache_location = \
                os.environ['AZURE_CRED_CACHE_LOCATION']

    def init_args(self, parsers):
        """ Create the command line parser for this provider """
        self.parser = parsers. \
            add_parser('azure',
                       help='Azure Database for PostgreSQL',
                       epilog='Credentials are read from '
                              'the environment, '
                              'specifically, the '
                              'AZURE_SUBSCRIPTION_ID, '
                              'AZURE_TENANT_ID, '
                              'AZURE_CLIENT_ID and '
                              'AZURE_CLIENT_SECRET '
                              'variables. '
                              'See https://docs.microsoft'
                              '.com/en-us/azure/developer'
                              '/python/configure-local'
                              '-development-environment?tabs=cmd '
                              'for more information.')

        self.parser.add_argument('--region', default=self._default_region,
                                 help='name of the Azure location (default: '
                                      '{})'.format(self._default_region))

        self.parser.add_argument('--resource-group', required=True,
                                 help='name of the Azure resource group')

        # Create the command sub-parser
        parsers = self.parser.add_subparsers(help='Azure commands',
                                             dest='command')

        # Create the create instance command parser
        parser_create_instance = parsers.add_parser('create-instance',
                                                    help='create a new '
                                                         'instance')

        parser_create_instance.add_argument('--name', required=True,
                                            help='name of the instance')
        parser_create_instance.add_argument('--db-password', required=False,
                                            help='password for the database')
        parser_create_instance.add_argument('--db-username',
                                            default='postgres',
                                            help='user name for the database '
                                                 '(default: postgres)')
        parser_create_instance.add_argument('--db-major-version',
                                            default='11',
                                            help='version of PostgreSQL '
                                                 'to deploy (default: 11)')
        parser_create_instance.add_argument('--instance-type', required=True,
                                            help='machine type for the '
                                                 'instance nodes, e.g. '
                                                 'GP_Gen5_8')
        parser_create_instance.add_argument('--instance_tier_type',
                                            required=True,
                                            help='machine type for the '
                                                 'instance nodes, e.g. '
                                                 'GP_Gen5_8')
        parser_create_instance.add_argument('--storage-size', type=int,
                                            required=True,
                                            help='storage size in GB')
        parser_create_instance.add_argument('--availability-zone',
                                            required=False,
                                            help='Availability zone')
        parser_create_instance.add_argument('--high-availability',
                                            required=False,
                                            help='High Availability')
        parser_create_instance.add_argument('--public-ips',
                                            default='127.0.0.1',
                                            help='Public IPs '
                                                 '(default: 127.0.0.1)')

        # Create the delete instance command parser
        parser_delete_instance = parsers.add_parser('delete-instance',
                                                    help='delete an instance')
        parser_delete_instance.add_argument('--name', required=True,
                                            help='name of the instance')

    ##########################################################################
    # Azure Helper functions
    ##########################################################################
    def _get_azure_credentials(self):
        try:
            if self._interactive_browser_credential:
                _credentials = self._azure_interactive_auth()
            else:
                _credentials = self._azure_cli_auth()
        except Exception as e:
            return False, str(e)
        return True, _credentials

    def _azure_cli_auth(self):
        if self._cli_credentials is None:
            self._cli_credentials = AzureCliCredential()
        return self._cli_credentials

    def _azure_interactive_auth(self):
        if self._authentication_record_json is None:
            _interactive_credential = DeviceCodeCredential(
                tenant_id=self._tenant_id,
                timeout=180,
                prompt_callback=None,
                _cache=load_persistent_cache(TokenCachePersistenceOptions(
                    name=self._azure_cred_cache_name,
                    allow_unencrypted_storage=True,
                    cache_location=self._azure_cred_cache_location)
                )
            )
            _auth_record = _interactive_credential.authenticate()
            self._authentication_record_json = _auth_record.serialize()
        else:
            deserialized_auth_record = AuthenticationRecord.deserialize(
                self._authentication_record_json)
            _interactive_credential = DeviceCodeCredential(
                tenant_id=self._tenant_id,
                timeout=180,
                prompt_callback=None,
                _cache=load_persistent_cache(TokenCachePersistenceOptions(
                    name=self._azure_cred_cache_name,
                    allow_unencrypted_storage=True,
                    cache_location=self._azure_cred_cache_location)
                ),
                authentication_record=deserialized_auth_record
            )
        return _interactive_credential

    def _get_azure_client(self, type):
        """ Create/cache/return an Azure client object """
        # Acquire a credential object using CLI-based authentication.
        if self._credentials is None:
            status, self._credentials = \
                self._get_azure_credentials()

        if type in self._clients:
            return self._clients[type]

        self._clients['postgresql'] = PostgreSQLManagementClient(
            self._credentials, self._subscription_id)
        self._clients['resource'] = ResourceManagementClient(
            self._credentials, self._subscription_id)

        return self._clients[type]

    def _create_resource_group(self, args):
        """ Create the Resource Group if it doesn't exist """
        resource_client = self._get_azure_client('resource')

        group_list = resource_client.resource_groups.list()
        for group in list(group_list):
            if group.name == args.resource_group:
                debug('Resource group already exist with name: {}...'.format(
                    args.resource_group))
                return group.__dict__
        debug(
            'Creating resource group with name: {}...'.format(
                args.resource_group))
        result = resource_client.resource_groups.create_or_update(
            args.resource_group,
            {"location": args.region})
        return result.__dict__

    def _create_azure_instance(self, args):
        """ Create an Azure instance """
        # Obtain the management client object
        postgresql_client = self._get_azure_client('postgresql')
        # Check if the server already exists
        svr = None
        try:
            svr = postgresql_client.servers.get(args.resource_group, args.name)
        except ResourceNotFoundError:
            pass
        except Exception as e:
            error(str(e))

        if svr is not None:
            error('Azure Database for PostgreSQL instance {} already '
                  'exists.'.format(args.name))

        db_password = self._database_pass if self._database_pass is not None \
            else args.db_password

        # Provision the server and wait for the result
        debug('Creating Azure instance: {}...'.format(args.name))

        try:
            poller = postgresql_client.servers.begin_create(
                resource_group_name=args.resource_group,
                server_name=args.name,
                parameters=Server(

                    sku=Sku(name=args.instance_type,
                            tier=SkuTier(args.instance_tier_type)
                            ),
                    high_availability=HighAvailability(
                        mode=args.high_availability),
                    administrator_login=args.db_username,
                    administrator_login_password=db_password,
                    version=args.db_major_version,
                    storage=Storage(
                        storage_size_gb=args.storage_size
                    ),
                    location=args.region,
                    create_mode=CreateMode("Default")
                )
            )
        except Exception as e:
            error(str(e))

        server = poller.result()

        return server.__dict__

    def _create_firewall_rule(self, args):
        """ Create a firewall rule on an instance """
        firewall_rules = []
        postgresql_client = self._get_azure_client('postgresql')
        ip = args.public_ips if args.public_ips else get_my_ip()
        ip_list = ip.split(',')
        for ip in ip_list:
            ip = ip.strip()
            if '-' in ip:
                start_ip = ip.split('-')[0]
                end_ip = ip.split('-')[1]
            else:
                start_ip = ip
                end_ip = ip
            name = 'pgacloud_{}_{}_{}'.format(args.name,
                                              ip.replace('.', '-'),
                                              get_random_id())

            # Provision the rule and wait for completion
            debug('Adding ingress rule for: {0} - {1} ...'.format(start_ip,
                                                                  end_ip))
            poller = postgresql_client.firewall_rules.begin_create_or_update(
                resource_group_name=args.resource_group,
                server_name=args.name,
                firewall_rule_name=name,
                parameters=FirewallRule(start_ip_address=start_ip,
                                        end_ip_address=end_ip)
            )

            firewall_rule = poller.result()

            firewall_rules.append(firewall_rule.__dict__)
        return firewall_rules

    def _delete_azure_instance(self, args):
        """ Delete an Azure instance """
        # Obtain the management client object
        postgresql_client = self._get_azure_client('postgresql')

        # Delete the server and wait for the result
        debug('Deleting Azure instance: {}...'.format(args.name))
        try:
            poller = postgresql_client.servers.begin_delete(
                args.resource_group,
                args.name
            )
        except Exception as e:
            error(str(e))

        poller.result()

    ##########################################################################
    # User commands
    ##########################################################################
    def cmd_create_instance(self, args):
        """ Deploy an Azure instance and firewall rule """
        rg = self._create_resource_group(args)
        instance = self._create_azure_instance(args)
        self._create_firewall_rule(args)

        data = {'instance': {
            'Id': instance['id'],
            'ResourceGroupId': rg['name'],
            'Location': instance['location'],
            'Hostname': instance['fully_qualified_domain_name'],
            'Port': 5432,
            'Database': "postgres",
            'Username': instance['administrator_login']
        }}

        output(data)

    def cmd_delete_instance(self, args):
        """ Delete an Azure instance """
        self._delete_azure_instance(args)


def load():
    """ Loads the current provider """
    return AzureProvider()
