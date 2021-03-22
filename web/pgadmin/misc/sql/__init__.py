##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""A blueprint module providing utility functions for the application."""

import sqlparse
from flask import request, url_for
from flask_security import login_required
from pgadmin.utils import PgAdminModule
from pgadmin.utils.ajax import make_json_response
from pgadmin.utils.preferences import Preferences

MODULE_NAME = 'sql'


class SQLModule(PgAdminModule):
    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.browser.object_sql',
            'path': url_for('sql.static', filename='js/sql'),
            'when': None
        }]

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints
        """
        return [
            'sql.format', 'sql.format'
        ]


# Initialise the module
blueprint = SQLModule(MODULE_NAME, __name__, url_prefix='/misc/sql')


def sql_format(sql):
    """
    This function takes a SQL statement, formats it, and returns it
    """
    p = Preferences.module('sqleditor')
    use_spaces = p.preference('use_spaces').get()
    output = sqlparse.format(sql,
                             keyword_case=p.preference(
                                 'keyword_case').get(),
                             identifier_case=p.preference(
                                 'identifier_case').get(),
                             strip_comments=p.preference(
                                 'strip_comments').get(),
                             reindent=p.preference(
                                 'reindent').get(),
                             reindent_aligned=p.preference(
                                 'reindent_aligned').get(),
                             use_space_around_operators=p.preference(
                                 'spaces_around_operators').get(),
                             comma_first=p.preference(
                                 'comma_first').get(),
                             wrap_after=p.preference(
                                 'wrap_after').get(),
                             indent_tabs=not use_spaces,
                             indent_width=p.preference(
                                 'tab_size').get() if use_spaces else 1)

    return output


@blueprint.route("/format", methods=['POST'], endpoint="format")
@login_required
def sql_format_wrapper():
    """
    This endpoint takes a SQL statement, formats it, and returns it
    """
    sql = ''
    if request.data:
        sql = sql_format(request.get_json()['sql'])

    return make_json_response(
        data={'sql': sql},
        status=200
    )
