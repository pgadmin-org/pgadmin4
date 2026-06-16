##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""RBAC regression: tool backend routes must enforce the tool permission.

pgAdmin gates each tool behind a permission (tools_query_tool,
tools_grant_wizard, tools_schema_diff, tools_erd_tool, tools_psql_tool,
tools_debugger, ...). Historically the @permissions_required decorator was
applied only to a single 'front door' route per tool, while alternate
initialisation routes, object-discovery/SQL/apply routes and Socket.IO
handlers relied on @pga_login_required alone. That let a user who had been
denied a tool still drive the rest of that tool's backend workflow:

  * View/Edit Data via sqleditor.initialize_viewdata (Query Tool),
  * object discovery, SQL preview and the real GRANT via the grant wizard,
  * schema diff initialisation, enumeration and comparison,
  * ERD initialisation and DDL generation,
  * the PSQL panel,
  * the debugger's stored-argument routes.

This test logs in as a user with no roles (therefore no tool permissions)
and asserts that every one of those backend routes returns HTTP 403, i.e.
the permission gate fires before the route body runs. It is deliberately a
single consolidated 'blanket' check so that a newly-added route in any of
these blueprints which forgets the decorator is caught here.

The permission check is the outermost decorator, so it runs before any
connection/transaction lookup; dummy path parameters (ids of 1, a random
trans_id) are sufficient to reach and trip it.

Skipped in DESKTOP mode, where every request is auto-authenticated as the
all-permissions DESKTOP_USER and no permission decorator is exercisable.
"""

import secrets

import config
import flask

from pgadmin.utils.route import BaseTestGenerator
from regression.test_setup import config_data
from regression.python_test_utils.test_utils import \
    create_user_wise_test_client

test_user_details = None
if config.SERVER_MODE:
    test_user_details = config_data['pgAdmin4_test_non_admin_credentials']


# A throwaway transaction id; these routes never get far enough to use it.
_TRANS = secrets.choice(range(1, 9999999))


class ToolPermissionRequiredTestCase(BaseTestGenerator):
    """A user lacking a tool's permission must get 403 from every backend
    route in that tool, not just its primary entry point."""

    scenarios = [
        # --- Query Tool: View/Edit Data alternate init (AC-001) ---
        ('sqleditor.initialize_viewdata requires tools_query_tool',
         dict(method='post', endpoint='sqleditor.initialize_viewdata',
              url_kwargs=dict(trans_id=_TRANS, cmd_type=1, obj_type='table',
                              sgid=1, sid=1, did=1, obj_id=1))),

        # --- Grant Wizard: discovery, SQL preview, apply (AC-002) ---
        ('grant_wizard.objects requires tools_grant_wizard',
         dict(method='get', endpoint='grant_wizard.objects',
              url_kwargs=dict(sid=1, did=1, node_id=1, node_type='table'))),
        ('grant_wizard.modified_sql requires tools_grant_wizard',
         dict(method='post', endpoint='grant_wizard.modified_sql',
              url_kwargs=dict(sid=1, did=1))),
        ('grant_wizard.apply requires tools_grant_wizard',
         dict(method='post', endpoint='grant_wizard.apply',
              url_kwargs=dict(sid=1, did=1))),

        # --- Schema Diff: init, enumeration, connect, ddl (AC-005) ---
        ('schema_diff.initialize requires tools_schema_diff',
         dict(method='get', endpoint='schema_diff.initialize',
              url_kwargs=dict(trans_id=_TRANS))),
        ('schema_diff.servers requires tools_schema_diff',
         dict(method='get', endpoint='schema_diff.servers',
              url_kwargs=dict())),
        ('schema_diff.get_server requires tools_schema_diff',
         dict(method='get', endpoint='schema_diff.get_server',
              url_kwargs=dict(sid=1, did=1))),
        ('schema_diff.connect_server requires tools_schema_diff',
         dict(method='post', endpoint='schema_diff.connect_server',
              url_kwargs=dict(sid=1))),
        ('schema_diff.connect_database requires tools_schema_diff',
         dict(method='post', endpoint='schema_diff.connect_database',
              url_kwargs=dict(sid=1, did=1))),
        ('schema_diff.databases requires tools_schema_diff',
         dict(method='get', endpoint='schema_diff.databases',
              url_kwargs=dict(sid=1))),
        ('schema_diff.schemas requires tools_schema_diff',
         dict(method='get', endpoint='schema_diff.schemas',
              url_kwargs=dict(sid=1, did=1))),
        ('schema_diff.ddl_compare requires tools_schema_diff',
         dict(method='get', endpoint='schema_diff.ddl_compare',
              url_kwargs=dict(trans_id=_TRANS, source_sid=1, source_did=1,
                              source_scid=1, target_sid=1, target_did=1,
                              target_scid=1, source_oid=1, target_oid=1,
                              node_type='table', comp_status='Different'))),

        # --- ERD: init and DDL generation (audit, new) ---
        ('erd.initialize requires tools_erd_tool',
         dict(method='post', endpoint='erd.initialize',
              url_kwargs=dict(trans_id=_TRANS, sgid=1, sid=1, did=1))),
        ('erd.prequisite requires tools_erd_tool',
         dict(method='get', endpoint='erd.prequisite',
              url_kwargs=dict(trans_id=_TRANS, sgid=1, sid=1, did=1))),
        ('erd.sql requires tools_erd_tool',
         dict(method='post', endpoint='erd.sql',
              url_kwargs=dict(trans_id=_TRANS, sgid=1, sid=1, did=1))),

        # --- PSQL: panel (audit, new) ---
        ('psql.panel requires tools_psql_tool',
         dict(method='post', endpoint='psql.panel',
              url_kwargs=dict(trans_id=_TRANS))),

        # --- Debugger: directly-addressable stored-argument routes ---
        ('debugger.get_arguments requires tools_debugger',
         dict(method='get', endpoint='debugger.get_arguments',
              url_kwargs=dict(sid=1, did=1, scid=1, func_id=1))),
        ('debugger.set_arguments requires tools_debugger',
         dict(method='post', endpoint='debugger.set_arguments',
              url_kwargs=dict(sid=1, did=1, scid=1, func_id=1))),
        ('debugger.clear_arguments requires tools_debugger',
         dict(method='post', endpoint='debugger.clear_arguments',
              url_kwargs=dict(sid=1, did=1, scid=1, func_id=1))),
    ]

    def setUp(self):
        if not config.SERVER_MODE:
            self.skipTest(
                'Tool permission decorators are only exercisable in SERVER '
                'mode; DESKTOP mode auto-authenticates as the '
                'all-permissions DESKTOP_USER on every request.'
            )

    @create_user_wise_test_client(test_user_details)
    def runTest(self):
        # Build the URL through the URL map so we exercise the registered
        # route exactly and don't hard-code blueprint prefixes.
        with self.app.test_request_context():
            url = flask.url_for(self.endpoint, **self.url_kwargs)

        http = getattr(self.tester, self.method)
        response = http(url, follow_redirects=False)

        self.assertEqual(
            response.status_code, 403,
            'Route {0} ({1} {2}) did not enforce its tool permission for a '
            'user lacking it: expected 403, got {3}. Body: {4!r}'.format(
                self.endpoint, self.method.upper(), url,
                response.status_code, response.data[:200]
            )
        )
