##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from .. import utils


class IsValidAddressTestCase(BaseTestGenerator):
    scenarios = [
        ('TestCase for Valid Ipv4 Address', {
            'address': '192.168.0.1',
            'respdata': True
        }),
        ('TestCase for Valid Ipv6 Address', {
            'address': '2001:db8::',
            'respdata': True
        }),
        ('TestCase for Invalid Ip Address', {
            'address': 'toto',
            'respdata': False
        }),
    ]

    @classmethod
    def setUpClass(cls):
        pass

    def runTest(self):
        self.assertEqual(utils.is_valid_ipaddress(self.address),
                         self.respdata)

    @classmethod
    def tearDownClass(cls):
        pass
