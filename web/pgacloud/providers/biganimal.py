##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
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
    BASE_URL = 'https://portal.biganimal.com/api/v2'

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
        parser_create_instance.add_argument('--volume-size',
                                            required=True,
                                            help='storage Size')
        parser_create_instance.add_argument('--volume-IOPS',
                                            required=True,
                                            help='storage IOPS')
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
        parser_create_instance.add_argument('--replicas',
                                            required=True,
                                            help='No. of Stand By Replicas')
        parser_create_instance.add_argument('--cloud-provider',
                                            required=True,
                                            help='Provider')

    def cmd_create_instance(self, args):
        """ Create a biganimal cluster """

        try:
            private_network = True if args.private_network == '1' else False
            ip = args.public_ip if args.public_ip else '0.0.0.0/0'
            ip_ranges = []

            ip = ip.split(',')
            for i in ip:
                ip_ranges.append({'cidrBlock': i,
                                  'description': 'pgcloud client {}'.format(i)
                                  })

            debug('Creating BigAnimal cluster: {}...'.format(args.name))

            _url = "{0}/{1}".format(self.BASE_URL, 'clusters')
            _headers = {"content-type": "application/json",
                        "accept": "application/json",
                        'authorization': 'Bearer {0}'.format(self._access_key)}

            _data = {
                'clusterName': args.name,
                'instanceType': {'instanceTypeId': args.instance_type},
                'password': self._database_pass,
                'pgType': {'pgTypeId': args.db_type},
                'pgVersion': {'pgVersionId': args.db_version},
                'privateNetworking': private_network,
                'provider': {'cloudProviderId': args.cloud_provider},
                'region': {'regionId': args.region},
                'replicas': int(args.replicas),
                'storage': {
                    'volumePropertiesId': args.volume_properties,
                    'volumeTypeId': args.volume_type,
                    'iops': args.volume_IOPS,
                    'size': args.volume_size + ' Gi'
                },
                'clusterArchitecture': {
                    'clusterArchitectureId': args.cluster_arch,
                    'nodes': int(args.nodes)
                },
                'pgConfig': [],
            }

            if not private_network:
                _data['allowedIpRanges'] = ip_ranges

            cluster_resp = requests.post(_url,
                                         headers=_headers,
                                         data=json.dumps(_data))

            if cluster_resp.status_code == 202 and cluster_resp.content:
                cluster_info = json.loads(cluster_resp.content)
                instance_id = cluster_info['data']['clusterId']
                instance = self.get_instance_status(instance_id)
                data = {'instance': {
                    'ImageName': instance['clusterName'],
                    'Database Type': instance['pgType']['pgTypeName'],
                    'Hostname': instance['connection'][
                        'serviceName'],
                    'Port': instance['connection']['port'],
                    'Database': instance['connection'][
                        'databaseName'],
                    'Username': instance['connection'][
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

                self._cluster_info = cluster_info['data']

                if self._cluster_info['phase'] == 'Cluster in healthy state':
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
