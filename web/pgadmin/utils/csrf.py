##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

from flask_wtf.csrf import CSRFProtect
from flask import request, current_app


class _PGCSRFProtect(CSRFProtect):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def init_app(self, app):
        super().init_app(app)
        self._pg_csrf_exempt(app)

    def _pg_csrf_exempt(self, app):
        """Exempt some of the Views/blueprints from CSRF protection
        """

        exempt_views = [
            'flask.app.<lambda>',
            'flask.scaffold.send_static_file',
            'flask_security.views.login',
            'flask_security.views.logout',
            'pgadmin.tools.translations',
            app.blueprints['redirects'],
            'pgadmin.browser.server_groups.servers.supported_servers-js',
            'pgadmin.tools.sqleditor.initialize_sqleditor',
            'pgadmin.tools.datagrid.panel',
            'pgadmin.tools.sqleditor.panel',
            'pgadmin.tools.debugger.initialize_target',
            'pgadmin.tools.debugger.direct_new',
            'pgadmin.tools.schema_diff.panel',
            'pgadmin.tools.schema_diff.ddl_compare',
            'pgadmin.authenticate.login',
            'pgadmin.tools.erd.panel',
            'pgadmin.tools.psql.panel',
        ]

        for exempt in exempt_views:
            self.exempt(exempt)


pgCSRFProtect = _PGCSRFProtect()
