##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

from flask_wtf.csrf import CSRFProtect
from flask import request, current_app


class _PGCSRFProtect(CSRFProtect):
    def __init__(self, *args, **kwargs):
        super(_PGCSRFProtect, self).__init__(*args, **kwargs)

    def init_app(self, app):
        super(_PGCSRFProtect, self).init_app(app)
        self._pg_csrf_exempt(app)

    def _pg_csrf_exempt(self, app):
        """Exempt some of the Views/blueprints from CSRF protection
        """

        exempt_views = [
            'flask.helpers.send_static_file',
            'flask_security.views.login',
            'flask_security.views.logout',
            'pgadmin.tools.translations',
            app.blueprints['redirects'],
            'pgadmin.browser.server_groups.servers.supported_servers-js',
            'pgadmin.tools.datagrid.initialize_query_tool',
            'pgadmin.tools.datagrid.panel',
            'pgadmin.tools.debugger.initialize_target',
            'pgadmin.tools.debugger.direct_new',
            'pgadmin.tools.schema_diff.panel',
            'pgadmin.tools.schema_diff.ddl_compare',
            'pgadmin.authenticate.login'
        ]

        for exempt in exempt_views:
            self.exempt(exempt)


pgCSRFProtect = _PGCSRFProtect()
