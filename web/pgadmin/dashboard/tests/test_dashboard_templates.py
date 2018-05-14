##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys
from flask import Flask, render_template
from jinja2 import FileSystemLoader
from pgadmin import VersionedTemplateLoader
from pgadmin.utils.route import BaseTestGenerator

if sys.version_info < (3, 3):
    from mock import MagicMock
else:
    from unittest.mock import MagicMock

# Hard coded dummy input parameters for the templates
RATES = {
    'session_stats_refresh': 1,
    'tps_stats_refresh': 1,
    'ti_stats_refresh': 1,
    'to_stats_refresh': 1,
    'bio_stats_refresh': 1
}

DISPLAY_DASHBOARD = {
    'both': {
        'show_graphs': True,
        'show_activity': True
    },

    'only_graphs': {
        'show_graphs': True,
        'show_activity': False
    },

    'only_server_activity': {
        'show_graphs': False,
        'show_activity': True
    },

    'none': {
        'show_graphs': False,
        'show_activity': False
    }
}

VERSION = 95000

SERVER_ID = 1

DATABASE_ID = 123


# To moke gettext function used in the template
_ = MagicMock(side_effect=lambda x: x)


class TestDashboardTemplates(BaseTestGenerator):
    scenarios = [
        # Server dashboard
        (
            'Dashboard, when returning the html page with graphs and '
            'server activity related html elements for server dashboard',
            dict(
                template_path='dashboard/server_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=None,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['both'],
                    _=_
                ),
                expected_return_value=[
                    'Server sessions',
                    'Server activity'
                ],
                not_expected_return_value=[]
            )
        ),
        (
            'Dashboard, when returning the html page with only graphs '
            'related html elements for server dashboard',
            dict(
                template_path='dashboard/server_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=None,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['only_graphs'],
                    _=_
                ),
                expected_return_value=[
                    'Server sessions'
                ],
                not_expected_return_value=[
                    'Server activity'
                ]
            )
        ),
        (
            'Dashboard, when returning the html page with only server '
            'activity related html elements for server dashboard',
            dict(
                template_path='dashboard/server_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=None,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['only_server_activity'],
                    _=_
                ),
                expected_return_value=[
                    'Server activity'
                ],
                not_expected_return_value=[
                    'Server sessions'
                ]
            )
        ),
        (
            'Dashboard, when returning the html page with neither '
            'graphs nor server activity related html elements for server '
            'dashboard',
            dict(
                template_path='dashboard/server_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=None,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['none'],
                    _=_
                ),
                expected_return_value=[],
                not_expected_return_value=[
                    'Server activity',
                    'Server sessions'
                ]
            )
        ),
        # Database dashboard
        (
            'Dashboard, when returning the html page with graphs and '
            'database activity related html elements for database dashboard',
            dict(
                template_path='dashboard/database_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=DATABASE_ID,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['both'],
                    _=_
                ),
                expected_return_value=[
                    'Database sessions',
                    'Database activity'
                ],
                not_expected_return_value=[]
            )
        ),
        (
            'Dashboard, when returning the html page with only '
            'graphs related html elements for database dashboard',
            dict(
                template_path='dashboard/database_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=DATABASE_ID,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['only_graphs'],
                    _=_
                ),
                expected_return_value=[
                    'Database sessions'
                ],
                not_expected_return_value=[
                    'Database activity'
                ]
            )
        ),
        (
            'Dashboard, when returning the html page with only '
            'database activity related html elements for database dashboard',
            dict(
                template_path='dashboard/database_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=DATABASE_ID,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['only_server_activity'],
                    _=_
                ),
                expected_return_value=[
                    'Database activity'
                ],
                not_expected_return_value=[
                    'Database sessions'
                ]
            )
        ),
        (
            'Dashboard, when returning the html page with neither '
            'graphs nor database activity related html elements for database '
            'dashboard',
            dict(
                template_path='dashboard/database_dashboard.html',
                input_parameters=dict(
                    sid=SERVER_ID,
                    did=DATABASE_ID,
                    rates=RATES,
                    version=VERSION,
                    settings=DISPLAY_DASHBOARD['none'],
                    _=_
                ),
                expected_return_value=[],
                not_expected_return_value=[
                    'Database sessions',
                    'Database activity'
                ]
            )
        ),

    ]

    def setUp(self):
        self.loader = VersionedTemplateLoader(FakeApp())

    def runTest(self):
        with FakeApp().app_context():
            result = render_template(
                self.template_path, **self.input_parameters
            )
            # checks for expected html elements
            for expected_string in self.expected_return_value:
                self.assertIn(
                    expected_string, result
                )

            # checks for not expected html elements
            for not_expected_string in self.not_expected_return_value:
                self.assertNotIn(
                    not_expected_string, result
                )


class FakeApp(Flask):
    def __init__(self):
        super(FakeApp, self).__init__("")
        self.jinja_loader = FileSystemLoader(
            os.path.dirname(os.path.realpath(__file__)) + "/../templates"
        )
