##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from flask import url_for
import config
from pgadmin import create_app


class InternalVersionTestCase(BaseTestGenerator):
    """
    This test case verifies application creation with new versions parameters
    """
    scenarios = [
        ('TestCase with INTERNAL_VERSION_PARAM none', dict(
            app_version=30100,
            version_param='',
            version_extn=('.js',),
            endpoint='static',
            filename='js/generated/pgadmin_commons.js',
            version_expected=False
        )),
        ('TestCase with INTERNAL_VERSION_PARAM present', dict(
            app_version=30100,
            version_param='intver',
            version_extn=('.js',),
            endpoint='static',
            filename='js/generated/pgadmin_commons.js',
            version_expected=True
        )),
        ('TestCase with INTERNAL_VERSION_EXTN different', dict(
            app_version=30100,
            version_param='intver',
            version_extn=('.css',),
            endpoint='static',
            filename='js/generated/pgadmin_commons.js',
            version_expected=False
        )),
    ]

    def setUp(self):
        self.config_bak = config

    def runTest(self):
        # assign config file parameters new values
        config.APP_VERSION_INT = self.app_version
        config.APP_VERSION_PARAM = self.version_param
        config.APP_VERSION_EXTN = self.version_extn

        version_string = "?{0}={1}".format(self.version_param,
                                           self.app_version)
        # create application
        app = create_app()
        with app.app_context(), app.test_request_context():
            url = url_for(self.endpoint, filename=self.filename)
            if self.version_expected:
                self.assertTrue(url.endswith(version_string))
            else:
                self.assertFalse(url.endswith(version_string))
