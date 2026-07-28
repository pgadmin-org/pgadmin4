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

    # What every field falls back to when the admin-supplied value for it
    # is missing, the wrong type, or out of range.
    _ALL_FALLBACK = {
        'url': '', 'name': 'Custom', 'crs': 'EPSG:3857',
        'attribution': '', 'max_zoom': 18,
    }

    _partial_override_expected = dict(_ALL_FALLBACK)
    _partial_override_expected['url'] = \
        'https://x.example.com/{z}/{x}/{y}.png'

    scenarios = [
        ('Fully valid override is used as-is',
         dict(provider=_FULL_VALID, expected=_FULL_VALID)),

        ('Partial override falls back for missing keys',
         dict(provider={'url': 'https://x.example.com/{z}/{x}/{y}.png'},
              expected=_partial_override_expected)),

        ('Non-dict override falls back entirely',
         dict(provider='oops, not a dict', expected=_ALL_FALLBACK)),

        ('Unsupported CRS falls back to EPSG:3857',
         dict(provider={'crs': 'EPSG:9999'}, expected=_ALL_FALLBACK)),

        ('Out-of-range max_zoom falls back to 18',
         dict(provider={'max_zoom': 999}, expected=_ALL_FALLBACK)),

        ('Non-integer max_zoom falls back to 18',
         dict(provider={'max_zoom': '18'}, expected=_ALL_FALLBACK)),

        ('Boolean max_zoom falls back to 18',
         dict(provider={'max_zoom': True}, expected=_ALL_FALLBACK)),

        ('Non-string name/url/attribution fall back individually',
         dict(provider={'name': 123, 'url': 456, 'attribution': 789},
              expected=_ALL_FALLBACK)),

        ('Empty dict falls back entirely',
         dict(provider={}, expected=_ALL_FALLBACK)),
    ]

    def runTest(self):
        with patch.object(qtp.config, 'DEFAULT_GEOMETRY_VIEWER_PROVIDER',
                          self.provider):
            result = qtp.resolve_geometry_viewer_provider_defaults()

        self.assertEqual(result, self.expected)
