##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import secrets
import string
import urllib3
import ipaddress


def get_my_ip():
    """ Return the public IP of this host """
    http = urllib3.PoolManager()
    try:
        external_ip = http.request('GET', 'https://ident.me').data
    except Exception:
        try:
            external_ip = http.request('GET', 'https://ifconfig.me/ip').data
        except Exception:
            external_ip = '127.0.0.1'

    if isinstance(external_ip, bytes):
        external_ip = external_ip.decode('utf-8')

    ip = ipaddress.ip_address(external_ip)
    if isinstance(ip, ipaddress.IPv4Address):
        return '{}/{}'.format(external_ip, 32)
    elif isinstance(ip, ipaddress.IPv6Address):
        return '{}/{}'.format(external_ip, 128)

    return '{}/{}'.format(external_ip, 32)


def get_random_id():
    """ Return a random 10 byte string """
    letters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(letters) for _ in range(10))
