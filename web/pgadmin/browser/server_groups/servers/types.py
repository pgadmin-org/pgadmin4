##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import render_template
from flask.ext.babel import gettext


class ServerType(object):
    """
    Server Type

    Create an instance of this class to define new type of the server support,
    In order to define new type of instance, you may want to override this
    class with overriden function - instanceOf for type checking for
    identification based on the version.
    """
    registry = dict()

    def __init__(self, server_type, description, priority):
        self.stype = server_type
        self.desc = description
        self.spriority = priority

        assert(server_type not in ServerType.registry)
        ServerType.registry[server_type] = self

    @property
    def server_type(self):
        return self.stype

    @property
    def description(self):
        return self.desc

    @property
    def priority(self):
        return self.spriority

    def __str__(self):
        return "Type: {0}, Description:{1}, Priority: {2}".format(
                self.stype, self.desc, self.spriority
                )

    def instanceOf(self, version):
        return True

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        return [
                render_template(
                    "css/server_type.css",
                    server_type=self.stype
                    )
                ]

    @classmethod
    def types(cls):
        return sorted(
                ServerType.registry.values(),
                key=lambda x: x.priority,
                reverse=True
                )

    @classmethod
    def utility(cls, operation, sverion):
        if operation == 'backup':
            return 'pg_dump'
        if operation == 'backup_server':
            return 'pg_dumpall'
        if operation == 'restore':
            return 'pg_restore'

        return None


# Default Server Type
ServerType('pg', gettext("PostgreSQL"), -1)
