##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from flask import url_for
import config
from pgadmin import create_app


class InternalVersionTestCase(BaseTestGenerator):
    """
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
        config.APP_VERSION_INT = self.app_version
        config.INTERNAL_VERSION_PARAM = self.version_param
        config.INTERNAL_VERSION_EXTN = self.version_extn

        version_string = "?{0}={1}".format(config.INTERNAL_VERSION_PARAM,
                                           config.APP_VERSION_INT)
        app = create_app()
        with app.app_context(), app.test_request_context():
            url = url_for(self.endpoint, filename=self.filename)
            if self.version_expected:
                self.assertTrue(url.endswith(version_string))
            else:
                self.assertFalse(url.endswith(version_string))

    def tearDown(self):
        config = self.config_bak
