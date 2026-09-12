##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Verify that the PG17+ allowed_privs.json for views/materialized views
resolves via the versioned template loader (issue #10350). It previously
lived directly under the 17_plus bucket instead of under a sql/
subdirectory like every other bucket, so it was never found and the
MAINTAIN privilege ('m') silently fell back to the default bucket's list,
which lacks it.
"""

import json

from flask import render_template

from pgadmin.utils.route import BaseTestGenerator

# PG17 in pgAdmin's version-number-times-10000 scheme.
PG17 = 170000

_ALLOWED_PRIVS_JSON = 'sql/allowed_privs.json'


class AllowedPrivsJsonPathTestCase(BaseTestGenerator):
    """Loading allowed_privs.json for PG17+ must pick up the 17_plus
    bucket's list (with MAINTAIN), not silently fall back to default.
    """

    scenarios = [
        ('views on pg', dict(base_template='views/pg/#{0}#')),
        ('views on ppas', dict(base_template='views/ppas/#{0}#')),
        ('materialized views on pg', dict(
            base_template='mviews/pg/#{0}#')),
        ('materialized views on ppas', dict(
            base_template='mviews/ppas/#{0}#')),
    ]

    def setUp(self):
        pass

    def runTest(self):
        template_path = self.base_template.format(PG17)
        with self.app.app_context():
            rendered = render_template(
                '/'.join([template_path, _ALLOWED_PRIVS_JSON])
            )
        allowed_acls = json.loads(rendered)
        self.assertIn('m', allowed_acls['datacl']['acl'])
