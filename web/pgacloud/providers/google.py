# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2023, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################
import json
import os
import time

from utils.io import debug, error, output
from utils.misc import get_my_ip, get_random_id
from providers._abstract import AbsProvider

from googleapiclient import discovery
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials


class GoogleProvider(AbsProvider):
    def __init__(self):
        self._credentials_json = None
        self._credentials = None
        self._cloud_resource_manager_api_version = 'v1'
        self._sqladmin_api_version = 'v1'
        self._compute_api_version = 'v1'
        self._scopes = ['https://www.googleapis.com/auth/cloud-platform',
                        'https://www.googleapis.com/auth/sqlservice.admin']
        self._database_password = None

        # Get credentials from environment
        if 'GOOGLE_CREDENTIALS' in os.environ:
            self._credentials_json = \
                json.loads(os.environ['GOOGLE_CREDENTIALS'])

        if 'GOOGLE_DATABASE_PASSWORD' in os.environ:
            self._database_password = os.environ['GOOGLE_DATABASE_PASSWORD']

    def init_args(self, parsers):
        """ Create the command line parser for this provider """
        self.parser = parsers.add_parser('google',
                                         help='Google Cloud PostgreSQL',
                                         epilog='Credentials are read from '
                                                'the environment.')

        # Create the command sub-parser
        parsers = self.parser.add_subparsers(help='Google commands',
                                             dest='command')

        # Create the create instance command parser
        parser_create_instance = parsers.add_parser('create-instance',
                                                    help='create a new '
                                                         'instance')

        parser_create_instance.add_argument('--region', help='name of the '
                                                             'Google region')

        parser_create_instance.add_argument('--project', required=True,
                                            help='name of the project in which'
                                            ' instance to be created')

        parser_create_instance.add_argument('--name', required=True,
                                            help='name of the instance')

        parser_create_instance.add_argument('--db-password', required=False,
                                            help='password for the database')

        parser_create_instance.add_argument('--db-version', required=False,
                                            default='POSTGRES_14',
                                            help='version of PostgreSQL to '
                                            'deploy (default: POSTGRES_14)')

        parser_create_instance.add_argument('--instance-type', required=True,
                                            help='machine type for the '
                                                 'instance nodes, e.g. '
                                                 'db-f1-micro')

        parser_create_instance.add_argument('--storage-size', type=int,
                                            required=True,
                                            help='storage size in GB')

        parser_create_instance.add_argument('--storage-type', default='PD_SSD',
                                            help='storage type for the data '
                                                 'database (default: SSD)')

        parser_create_instance.add_argument('--high-availability',
                                            default=False)

        parser_create_instance.add_argument('--public-ip', default='127.0.0.1',
                                            help='Public IP '
                                                 '(default: 127.0.0.1)')

        parser_create_instance.add_argument('--availability-zone',
                                            help='name of the availability '
                                            'zone')

        parser_create_instance.add_argument('--secondary-availability-zone',
                                            help='name of the secondary '
                                            'availability zone')

    ##########################################################################
    # Google Helper functions
    ##########################################################################
    def _get_credentials(self, scopes):
        self._credentials = Credentials.from_authorized_user_info(
            self._credentials_json, scopes)
        if not self._credentials or not self._credentials.valid:
            if self._credentials and self._credentials.expired and \
                    self._credentials.refresh_token and \
                    self._credentials.has_scopes(scopes):
                self._credentials.refresh(Request())
                return self._credentials
            else:
                from google_auth_oauthlib.flow import InstalledAppFlow
                flow = InstalledAppFlow.from_client_config(self._client_config,
                                                           scopes)
                self._credentials = flow.run_local_server()
        return self._credentials

    @staticmethod
    def get_authorized_network_list(ip):
        authorized_networks = []
        ip = ip.split(',')
        for i in ip:
            authorized_networks.append({
                'value': i,
                'name': 'pgcloud client {}'.format(i),
                'kind': 'sql#aclEntry'
            })
        return authorized_networks

    def _create_google_postgresql_instance(self, args):
        credentials = self._get_credentials(self._scopes)
        service = discovery.build('sqladmin', 'v1beta4',
                                  credentials=credentials)
        high_availability = \
            'REGIONAL' if eval(args.high_availability) else 'ZONAL'

        db_password = self._database_password \
            if self._database_password is not None else args.db_password

        ip = args.public_ip if args.public_ip else '{}/32'.format(get_my_ip())
        authorized_networks = self.get_authorized_network_list(ip)

        database_instance_body = {
            'databaseVersion': args.db_version,
            'instanceType': 'CLOUD_SQL_INSTANCE',
            'project': args.project,
            'name': args.name,
            'region': args.region,
            'gceZone': args.availability_zone,
            'secondaryGceZone': args.secondary_availability_zone,
            "rootPassword": db_password,
            'settings': {
                'tier': args.instance_type,
                'availabilityType': high_availability,
                'dataDiskType': args.storage_type,
                'dataDiskSizeGb': args.storage_size,
                'ipConfiguration': {
                    "authorizedNetworks": authorized_networks,
                    'ipv4Enabled': True
                },
            }
        }
        operation = None
        try:
            debug('Creating Google instance: {}...'.format(args.name))
            req = service.instances().insert(project=args.project,
                                             body=database_instance_body)
            res = req.execute()
            operation = res['name']

        except HttpError as err:
            if err.status_code == 409:
                error('Google SQL instance {} already exists.'.
                      format(args.name))
            else:
                error(str(err))
        except Exception as e:
            error(str(e))

        # Wait for completion
        instance_provisioning = True
        log_msg = 10000
        while instance_provisioning:
            req = service.operations().get(project=args.project,
                                           operation=operation)
            res = req.execute()
            status = res['status']
            if status != 'PENDING' and status != 'RUNNING':
                instance_provisioning = False
            else:
                time.sleep(5)
                log_msg -= 1

            if log_msg % 15 == 0:
                debug('Creating Google instance: {}...'.format(args.name))

        req = service.instances().get(project=args.project, instance=args.name)
        res = req.execute()
        return res
    ##########################################################################
    # User commands
    ##########################################################################

    def cmd_create_instance(self, args):
        """ Create an Google instance"""
        instance_data = self._create_google_postgresql_instance(args)
        data = {'instance': {
            'Hostname': instance_data['ipAddresses'][0]['ipAddress'],
            'Port': 5432,
            'Database': 'postgres',
            'Username': 'postgres',
        }}
        output(data)


def load():
    """ Loads the current provider """
    return GoogleProvider()
