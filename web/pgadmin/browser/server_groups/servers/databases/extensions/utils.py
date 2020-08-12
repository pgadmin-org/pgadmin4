##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

""" Utility for Extension Node """

from flask import render_template


def get_extension_details(conn, ename, properties_sql=None):
    """
    This function is used to get the extension details.
    :param conn:
    :param ename:
    :param properties_sql:
    :return:
    """
    if properties_sql is None:
        from pgadmin.browser.server_groups.servers.databases.extensions \
            import ExtensionView

        properties_sql = "/".join(
            [ExtensionView.EXT_TEMPLATE_PATH, 'properties.sql'])

    status, rset = conn.execute_dict(
        render_template(properties_sql, ename=ename)
    )

    if status:
        return True, rset['rows'][0]

    return status, rset
