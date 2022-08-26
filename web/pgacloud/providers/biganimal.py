##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" EDB BigAnimal PostgreSQL provider """

import os
import time
import requests
import json

from providers._abstract import AbsProvider
from utils.io import debug, error, output


class BigAnimalProvider(AbsProvider):
    BASE_URL = 'https://portal.biganimal.com/api/v1'

    def __init__(self):
        self._clients = {}
        self._access_key = None
        self._database_pass = None
        self._cluster_info = None

        # Get the credentials
        if 'BIGANIMAL_ACCESS_KEY' in os.environ:
            self._access_key = os.environ['BIGANIMAL_ACCESS_KEY']
        if 'BIGANIMAL_DATABASE_PASSWORD' in os.environ:
            self._database_pass = os.environ['BIGANIMAL_DATABASE_PASSWORD']

    def init_args(self, parsers):
        """ Create the command line parser for this provider """
        self.parser = parsers.add_parser('biganimal',
                                         help='Amazon AWS RDS PostgreSQL',
                                         epilog='...')

        # Create the command sub-parser
        parsers = self.parser.add_subparsers(help='BigAnimal commands',
                                             dest='command')

        # Create the create instance command parser
        parser_create_instance = parsers.add_parser('create-instance',
                                                    help='create a new '
                                                         'instance')
        parser_create_instance.add_argument('--region', required=True,
                                            help='name of the region')
        parser_create_instance.add_argument('--name', required=True,
                                            help='name of the cluster')
        parser_create_instance.add_argument('--db-type', required=True,
                                            help='database type (PostgreSQL'
                                                 ' or EPAS)')
        parser_create_instance.add_argument('--db-version', required=True,
                                            help='database version')
        parser_create_instance.add_argument('--instance-type', required=True,
                                            help='machine type for the '
                                                 'instance nodes')
        parser_create_instance.add_argument('--volume-type', required=True,
                                            help='storage type for the data '
                                                 'database')
        parser_create_instance.add_argument('--volume-properties',
                                            required=True,
                                            help='storage properties')
        parser_create_instance.add_argument('--private-network', required=True,
                                            help='Private or Public Network')
        parser_create_instance.add_argument('--public-ip', default='',
                                            help='Public IP '
                                                 '(default: 127.0.0.1)')
        parser_create_instance.add_argument('--cluster-arch',
                                            required=True,
                                            help='Cluster Architecture')
        parser_create_instance.add_argument('--nodes',
                                            required=True,
                                            help='No of Nodes')

    def cmd_create_instance(self, args):
        """ Create a biganimal cluster """

        try:
            private_network = True if args.private_network == '1' else False
            ip = args.public_ip if args.public_ip else '0.0.0.0/0'
            ip_ranges = []

            ip = ip.split(',')
            for i in ip:
                ip_ranges.append([i, 'pgcloud client {}'.format(i)])

            debug('Creating BigAnimal cluster: {}...'.format(args.name))

            _url = "{0}/{1}".format(self.BASE_URL, 'clusters')
            _headers = {"content-type": "application/json",
                        "accept": "application/json",
                        'authorization': 'Bearer {0}'.format(self._access_key)}

            _data = {
                'clusterName': args.name,
                'instanceTypeId': args.instance_type,
                'password': self._database_pass,
                'postgresTypeId': args.db_type,
                'postgresVersion': args.db_version,
                'privateNetworking': private_network,
                'providerId': 'azure',
                'regionId': args.region,
                'replicas': 3,
                'volumePropertiesId': args.volume_properties,
                'volumeTypeId': args.volume_type,
                'clusterArch': {'id': args.cluster_arch, 'nodes': int(
                    args.nodes)},
                'pgConfigMap': [],
            }

            if not private_network:
                _data['allowIpRangeMap'] = ip_ranges

            cluster_resp = requests.post(_url,
                                         headers=_headers,
                                         data=json.dumps(_data))

            if cluster_resp.status_code == 202 and cluster_resp.content:
                cluster_info = json.loads(cluster_resp.content)
                instance_id = cluster_info['pgId']
                instance = self.get_instance_status(instance_id)
                data = {'instance': {
                    'ImageName': instance['imageName'],
                    'Database Type': instance['pgType']['name'],
                    'Hostname': instance['clusterConnectionInfo'][
                        'serviceName'],
                    'Port': instance['clusterConnectionInfo']['port'],
                    'Database': instance['clusterConnectionInfo'][
                        'databaseName'],
                    'Username': instance['clusterConnectionInfo'][
                        'username']
                }}

                output(data)
            else:
                error(str(cluster_resp.text))

        except Exception as e:
            debug(str(e))

    def get_instance_status(self, instance_id):
        """ Get the biganimal cluster status """

        running = True
        status = None
        while running:
            _url = "{0}/{1}/{2}".format(self.BASE_URL, 'clusters', instance_id)
            _headers = {"accept": "application/json",
                        'authorization': 'Bearer {0}'.format(self._access_key)}

            cluster_resp = requests.get(_url,
                                        headers=_headers)

            if cluster_resp.status_code == 200 and cluster_resp.content:
                cluster_info = json.loads(cluster_resp.content)

                self._cluster_info = cluster_info[0]

                if self._cluster_info['instance'] != 0 and\
                    self._cluster_info['phase'] not in [
                    'Cluster creation request received',
                    'Setting up primary',
                    'Creating CNP cluster'
                ]:
                    running = False

                if status != self._cluster_info['phase']:
                    status = self._cluster_info['phase']
                    debug('BigAnimal cluster status: {}...'.format(
                        status))
            else:
                running = False
                error(str(cluster_resp.text))

            if running:
                time.sleep(5)

        return self._cluster_info


def load():
    """ Loads the current provider """
    return BigAnimalProvider()
