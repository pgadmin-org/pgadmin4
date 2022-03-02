# ##########################################################################
# #
# # pgAdmin 4 - PostgreSQL Tools
# #
# # Copyright (C) 2013 - 2022, The pgAdmin Development Team
# # This software is released under the PostgreSQL Licence
# #
# ##########################################################################

import urllib3


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

    return '{}/{}'.format(external_ip, 32)
