##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.sqleditor.utils import query_tool_preferences as qtp


class GeometryViewerProviderDefaultsTestCase(BaseTestGenerator):
    """
    Verify resolve_geometry_viewer_provider_defaults() safely resolves
    config.DEFAULT_GEOMETRY_VIEWER_PROVIDER, since config_local.py /
    config_distro.py / PGADMIN_CONFIG_* replace that variable wholesale
    rather than merging individual keys - a partial, wrong-typed, or
    out-of-range administrator override must fall back to the original
    hardcoded defaults instead of crashing preference registration.
    """

    _FULL_VALID = {
        'url': 'https://internal.example.com/tiles/{z}/{x}/{y}.png',
        'name': 'Internal',
        'crs': 'EPSG:4326',
        'attribution': 'Internal Corp',
        'max_zoom': 12,
    }

    scenarios = [
        ('Fully valid override is used as-is',
         dict(provider=_FULL_VALID, expected=_FULL_VALID)),

        ('Partial override falls back for missing keys',
         dict(
             provider={'url': 'https://x.example.com/{z}/{x}/{y}.png'},
             expected={
                 'url': 'https://x.example.com/{z}/{x}/{y}.png',
                 'name': 'Custom', 'crs': 'EPSG:3857',
                 'attribution': '', 'max_zoom': 18,
             })),

        ('Non-dict override falls back entirely',
         dict(provider='oops, not a dict',
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),

        ('Unsupported CRS falls back to EPSG:3857',
         dict(provider={'crs': 'EPSG:9999'},
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),

        ('Out-of-range max_zoom falls back to 18',
         dict(provider={'max_zoom': 999},
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),

        ('Non-integer max_zoom falls back to 18',
         dict(provider={'max_zoom': '18'},
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),

        ('Boolean max_zoom falls back to 18',
         dict(provider={'max_zoom': True},
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),

        ('Non-string name/url/attribution fall back individually',
         dict(provider={'name': 123, 'url': 456, 'attribution': 789},
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),

        ('Empty dict falls back entirely',
         dict(provider={},
              expected={
                  'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
                  'attribution': '', 'max_zoom': 18,
              })),
    ]

    def runTest(self):
        with patch.object(qtp.config, 'DEFAULT_GEOMETRY_VIEWER_PROVIDER',
                          self.provider):
            result = qtp.resolve_geometry_viewer_provider_defaults()

        self.assertEqual(result, self.expected)
