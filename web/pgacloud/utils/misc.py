##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import random
import string
import urllib3


def get_my_ip():
    """ Return the public IP of this host """
    http = urllib3.PoolManager()
    try:
        external_ip = http.request.urlopen(
            'https://ident.me').read().decode('utf8')
    except Exception:
        try:
            external_ip = http.request.urlopen(
                'https://ifconfig.me/ip').read().decode('utf8')
        except Exception:
            external_ip = '127.0.0.1'

    return external_ip


def get_random_id():
    """ Return a random 10 byte string """
    letters = string.ascii_letters + string.digits
    return(''.join(random.choice(letters) for _ in range(10)))
