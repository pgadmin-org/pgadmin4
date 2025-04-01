##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from config import PG_DEFAULT_DRIVER
from pgadmin.utils.driver import get_driver
from pgadmin.utils.ajax import precondition_required

from flask_babel import gettext
from flask import g
from functools import wraps


def check_precondition(f):
    """
    This function will behave as a decorator which will check
    database connection before running view, it also adds
    manager, conn & template_path properties to self
    """

    @wraps(f)
    def wrap(*args, **kwargs):
        # Here args[0] will hold self & kwargs will hold gid,sid,did

        g.manager = get_driver(
            PG_DEFAULT_DRIVER).connection_manager(
            kwargs['sid']
        )

        def get_error(i_node_type):
            stats_type = ('activity', 'prepared', 'locks', 'config')
            if f.__name__ in stats_type:
                return precondition_required(
                    gettext("Please connect to the selected {0}"
                            " to view the table.".format(i_node_type))
                )
            else:
                return precondition_required(
                    gettext("Please connect to the selected {0}"
                            " to view the graph.".format(i_node_type))
                )

        # Below check handle the case where existing server is deleted
        # by user and python server will raise exception if this check
        # is not introduce.
        if g.manager is None:
            return get_error('server')

        if 'did' in kwargs:
            g.conn = g.manager.connection(did=kwargs['did'])
            node_type = 'database'
        else:
            g.conn = g.manager.connection()
            node_type = 'server'

        # If not connected then return error to browser
        if not g.conn.connected():
            return get_error(node_type)

        # Set template path for sql scripts
        g.server_type = g.manager.server_type
        g.version = g.manager.version

        # Include server_type in template_path
        g.template_path = 'dashboard/sql/' + (
            '#{0}#'.format(g.version)
        )

        return f(*args, **kwargs)

    return wrap
