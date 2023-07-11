##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Amazon RDS PostgreSQL provider """

import os
import time
import boto3

from providers._abstract import AbsProvider
from utils.io import debug, error, output
from utils.misc import get_my_ip, get_random_id

DEL_SEC_GROUP_MSG = 'Deleting security group: {}...'


class RdsProvider(AbsProvider):
    def __init__(self):
        self._clients = {}
        self._access_key = None
        self._secret_key = None
        self._session_token = None
        self._database_pass = None
        self._default_region = None

        # Get the credentials
        if 'AWS_ACCESS_KEY_ID' in os.environ:
            self._access_key = os.environ['AWS_ACCESS_KEY_ID']

        if 'AWS_SECRET_ACCESS_KEY' in os.environ:
            self._secret_key = os.environ['AWS_SECRET_ACCESS_KEY']

        if 'AWS_SESSION_TOKEN' in os.environ:
            self._session_token = os.environ['AWS_SESSION_TOKEN']

        if 'AWS_DATABASE_PASSWORD' in os.environ:
            self._database_pass = os.environ['AWS_DATABASE_PASSWORD']

    def init_args(self, parsers):
        """ Create the command line parser for this provider """
        self.parser = parsers.add_parser('aws',
                                         help='Amazon RDS PostgreSQL',
                                         epilog='Credentials are read from '
                                                '~/.aws/config by default and '
                                                'can be overridden in the '
                                                'AWS_ACCESS_KEY_ID and '
                                                'AWS_SECRET_ACCESS_KEY '
                                                'environment variables. '
                                                'The default region is read '
                                                'from ~/.aws/config and will '
                                                'fall back to us-east-1 if '
                                                'not present.')
        self.parser.add_argument('--region', default=self._default_region,
                                 help='name of the AWS region (default: {})'
                                 .format(self._default_region))

        # Create the command sub-parser
        parsers = self.parser.add_subparsers(help='RDS commands',
                                             dest='command')

        # Create the create instance command parser
        parser_create_instance = parsers.add_parser('create-instance',
                                                    help='create a new '
                                                         'instance')
        parser_create_instance.add_argument('--name', required=True,
                                            help='name of the instance')
        parser_create_instance.add_argument('--db-name', default='postgres',
                                            help='name of the default '
                                                 'database '
                                                 '(default: postgres)')
        parser_create_instance.add_argument('--db-password', required=False,
                                            help='password for the database')
        parser_create_instance.add_argument('--db-username',
                                            default='postgres',
                                            help='user name for the database '
                                                 '(default: postgres)')
        parser_create_instance.add_argument('--db-port', type=int,
                                            default=5432,
                                            help='port of the database '
                                                 '(default: 5432)')
        parser_create_instance.add_argument('--db-version',
                                            default='13.3',
                                            help='version of PostgreSQL '
                                                 'to deploy (default: 13.3)')
        parser_create_instance.add_argument('--instance-type', required=True,
                                            help='machine type for the '
                                                 'instance nodes, e.g. '
                                                 'db.m3.large')
        parser_create_instance.add_argument('--storage-iops', type=int,
                                            default=0,
                                            help='storage IOPs to allocate '
                                                 '(default: 0)')
        parser_create_instance.add_argument('--storage-size', type=int,
                                            required=True,
                                            help='storage size in GB')
        parser_create_instance.add_argument('--storage-type', default='gp2',
                                            help='storage type for the data '
                                                 'database (default: gp2)')
        parser_create_instance.add_argument('--high-availability',
                                            default=False)
        parser_create_instance.add_argument('--public-ip', default='127.0.0.1',
                                            help='Public IP '
                                                 '(default: 127.0.0.1)')

        # Create the delete instance command parser
        parser_delete_instance = parsers.add_parser('delete-instance',
                                                    help='delete an instance')
        parser_delete_instance.add_argument('--name', required=True,
                                            help='name of the instance')
        parser_delete_instance.add_argument('--security-group',
                                            help='name of a security group to'
                                                 'delete as well')

    ##########################################################################
    # AWS Helper functions
    ##########################################################################
    def _get_aws_client(self, type, args):
        """ Create/cache/return an AWS client object """
        if type in self._clients:
            return self._clients[type]

        session = boto3.Session(
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            aws_session_token=self._session_token
        )

        self._clients['type'] = session.client(type, region_name=args.region)

        return self._clients['type']

    def _create_security_group(self, args):
        """ Create a new security group for the instance """
        ec2 = self._get_aws_client('ec2', args)
        ip = args.public_ip if args.public_ip else get_my_ip()
        ip = ip.split(',')

        # Deploy the security group
        try:
            name = 'pgacloud_{}_{}_{}'.format(args.name,
                                              ip[0].replace('.', '-'),
                                              get_random_id())
            debug('Creating security group: {}...'.format(name))
            output({'Creating': 'Creating security group: {}...'.format(name)})
            response = ec2.create_security_group(
                Description='Inbound access for {} to RDS instance {}'.format(
                    ip[0], args.name),
                GroupName=name
            )
        except Exception as e:
            error(str(e))

        return response['GroupId']

    def _add_ingress_rule(self, args, security_group):
        """ Add a local -> PostgreSQL ingress rule to a security group """
        ec2 = self._get_aws_client('ec2', args)
        ip = args.public_ip if args.public_ip else\
            '{}/32'.format(get_my_ip())
        port = args.db_port or 5432
        ip_ranges = []

        ip = ip.split(',')
        for i in ip:
            ip_ranges.append({
                'CidrIp': i,
                'Description': 'pgcloud client {}'.format(i)
            })
        try:
            output({'Adding': 'Adding ingress rule for: {}...'.format(ip)})
            debug('Adding ingress rule for: {}...'.format(ip))
            ec2.authorize_security_group_ingress(
                GroupId=security_group,
                IpPermissions=[
                    {
                        'FromPort': port,
                        'ToPort': port,
                        'IpProtocol': 'tcp',
                        'IpRanges': ip_ranges
                    },
                ]
            )
        except Exception as e:
            error(e)

    def _create_rds_instance(self, args, security_group):
        """ Create an RDS instance """
        ec2 = self._get_aws_client('ec2', args)
        rds = self._get_aws_client('rds', args)

        db_password = self._database_pass if self._database_pass is not None\
            else args.db_password

        try:
            debug('Creating RDS instance: {}...'.format(args.name))
            rds.create_db_instance(DBInstanceIdentifier=args.name,
                                   AllocatedStorage=args.storage_size,
                                   DBName=args.db_name,
                                   Engine='postgres',
                                   Port=args.db_port,
                                   EngineVersion=args.db_version,
                                   StorageType=args.storage_type,
                                   StorageEncrypted=True,
                                   AutoMinorVersionUpgrade=True,
                                   MultiAZ=bool(args.high_availability),
                                   MasterUsername=args.db_username,
                                   MasterUserPassword=db_password,
                                   DBInstanceClass=args.instance_type,
                                   VpcSecurityGroupIds=[
                                       security_group,
                                   ], **({"Iops": args.storage_iops}
                                         if args.storage_iops else {}))

        except rds.exceptions.DBInstanceAlreadyExistsFault as e:
            try:
                debug(DEL_SEC_GROUP_MSG.format(security_group))
                ec2.delete_security_group(GroupId=security_group)
            except Exception:
                pass
            error('RDS instance {} already exists.'.format(args.name))
        except Exception as e:
            try:
                debug(DEL_SEC_GROUP_MSG.format(security_group))
                ec2.delete_security_group(GroupId=security_group)
            except Exception:
                pass
            error(str(e))

        # Wait for completion
        running = True
        while running:
            response = rds.describe_db_instances(
                DBInstanceIdentifier=args.name)

            db_instance = response['DBInstances'][0]
            status = db_instance['DBInstanceStatus']

            if status != 'creating' and status != 'backing-up':
                running = False

            if running:
                time.sleep(5)

        return response['DBInstances']

    def _delete_rds_instance(self, args, name):
        """ Delete an RDS instance """
        rds = self._get_aws_client('rds', args)

        debug('Deleting RDS instance: {}...'.format(name))
        try:
            rds.delete_db_instance(
                DBInstanceIdentifier=name,
                SkipFinalSnapshot=True,
                DeleteAutomatedBackups=True
            )
        except Exception as e:
            error(str(e))

        # Wait for completion
        while True:
            try:
                rds.describe_db_instances(DBInstanceIdentifier=args.name)
            except rds.exceptions.DBInstanceNotFoundFault:
                return
            except Exception as e:
                error(str(e))

            time.sleep(5)

    def _delete_security_group(self, args, id):
        """ Delete a security group """
        ec2 = self._get_aws_client('ec2', args)

        debug('Deleting security group: {}...'.format(id))
        try:
            ec2.delete_security_group(
                GroupId=id
            )
        except Exception as e:
            error(str(e))

    ##########################################################################
    # User commands
    ##########################################################################
    def cmd_create_instance(self, args):
        """ Create an RDS instance and security group """
        security_group = self._create_security_group(args)
        self._add_ingress_rule(args, security_group)
        instance = self._create_rds_instance(args, security_group)

        data = {'instance': {
            'Id': instance[0]['DBInstanceIdentifier'],
            'Location': instance[0]['AvailabilityZone'],
            'SecurityGroupId': security_group,
            'Hostname': instance[0]['Endpoint']['Address'],
            'Port': instance[0]['Endpoint']['Port'],
            'Database': instance[0]['DBName'],
            'Username': instance[0]['MasterUsername']
        }}

        output(data)

    def cmd_delete_instance(self, args):
        """ Delete an RDS instance and (optionally) a security group """
        self._delete_rds_instance(args, args.name)

        if args.security_group is not None:
            self._delete_security_group(args, args.security_group)


def load():
    """ Loads the current provider """
    return RdsProvider()
