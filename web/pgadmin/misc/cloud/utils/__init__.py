# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2023, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################

import urllib3
import ipaddress
from flask_security import current_user
from pgadmin.misc.bgprocess.processes import IProcessDesc
from pgadmin.model import db, Server
from flask_babel import gettext
from pgadmin.utils import get_server


def get_my_ip():
    """ Return the public IP of this host """
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    http = urllib3.PoolManager(cert_reqs='CERT_NONE')
    try:
        external_ip = http.request('GET', 'https://ifconfig.me/ip').data
    except Exception:
        try:
            external_ip = http.request('GET', 'https://ident.me').data
        except Exception:
            external_ip = '127.0.0.1'

    if type(external_ip) == bytes:
        external_ip = external_ip.decode('utf-8')

    ip = ipaddress.ip_address(external_ip)
    if isinstance(ip, ipaddress.IPv4Address):
        return '{}/{}'.format(external_ip, 32)
    elif isinstance(ip, ipaddress.IPv6Address):
        return '{}/{}'.format(external_ip, 128)

    return '{}/{}'.format(external_ip, 32)


def _create_server(data):
    """Create Server"""
    server = Server(
        user_id=current_user.id,
        servergroup_id=data.get('gid'),
        name=data.get('name'),
        maintenance_db=data.get('db'),
        username=data.get('username'),
        cloud_status=data.get('cloud_status'),
        connection_params={'sslmode': 'prefer', 'connect_timeout': 30}
    )

    db.session.add(server)
    db.session.commit()

    return server.id


class CloudProcessDesc(IProcessDesc):
    """Cloud Server Process Description."""
    def __init__(self, _sid, _cmd, _provider, _instance_name):
        self.sid = _sid
        self.cmd = _cmd
        self.instance_name = _instance_name
        self.provider = 'Amazon RDS'

        if _provider == 'rds':
            self.provider = 'Amazon RDS'
        elif _provider == 'azure':
            self.provider = 'Azure PostgreSQL'
        else:
            self.provider = 'EDB Big Animal'

    @property
    def message(self):
        return gettext("Deployment on {0} is started for instance {1}.".format(
            self.provider, self.instance_name))

    def details(self, cmd, args):
        server = getattr(get_server(self.sid), 'name', "Not available")

        return {
            "message": self.message,
            "cmd": self.cmd,
            "server": server,
            "object": self.instance_name,
            "type": self.provider,
        }

    @property
    def type_desc(self):
        return gettext("Cloud Deployment")
