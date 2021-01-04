##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys

from flask import render_template
from flask_babelex import gettext as _
from pgadmin.utils.preferences import Preferences
from werkzeug.exceptions import InternalServerError

import config


class ServerType(object):
    """
    Server Type

    Create an instance of this class to define new type of the server support,
    In order to define new type of instance, you may want to override this
    class with overriden function - instanceOf for type checking for
    identification based on the version.
    """
    registry = dict()
    UTILITY_PATH_LABEL = _("PostgreSQL Binary Path")
    UTILITY_PATH_HELP = _(
        "Path to the directory containing the PostgreSQL utility programs"
        " (pg_dump, pg_restore etc)."
    )

    def __init__(self, server_type, description, priority):
        self.stype = server_type
        self.desc = description
        self.spriority = priority
        self.utility_path = None

        assert (server_type not in ServerType.registry)
        ServerType.registry[server_type] = self

    @property
    def icon(self):
        return "%s.svg" % self.stype

    @property
    def server_type(self):
        return self.stype

    @property
    def description(self):
        return self.desc

    @classmethod
    def register_preferences(cls):
        paths = Preferences('paths', _('Paths'))

        for key in cls.registry:
            st = cls.registry[key]
            default_path = config.DEFAULT_BINARY_PATHS.get(st.stype, "")

            st.utility_path = paths.register(
                'bin_paths', st.stype + '_bin_dir',
                st.UTILITY_PATH_LABEL,
                'text', default_path, category_label=_('Binary paths'),
                help_str=st.UTILITY_PATH_HELP
            )

    @property
    def priority(self):
        return self.spriority

    def __str__(self):
        return _("Type: {0}, Description: {1}, Priority: {2}").format(
            self.stype, self.desc, self.spriority
        )

    def instance_of(self, version):
        return True

    @property
    def csssnippets(self):
        """
        Returns a snippet of css to include in the page
        """
        return [
            render_template(
                "css/server_type.css",
                server_type=self.stype,
                icon=self.icon
            )
        ]

    @classmethod
    def types(cls):
        return sorted(
            ServerType.registry.values(),
            key=lambda x: x.priority,
            reverse=True
        )

    def utility(self, operation, sversion):
        res = None

        if operation == 'backup':
            res = 'pg_dump'
        elif operation == 'backup_server':
            res = 'pg_dumpall'
        elif operation == 'restore':
            res = 'pg_restore'
        elif operation == 'sql':
            res = 'psql'
        else:
            raise InternalServerError(
                _("Could not find the utility for the operation '%s'").format(
                    operation
                )
            )
        bin_path = self.utility_path.get()
        if "$DIR" in bin_path:
            # When running as an WSGI application, we will not find the
            # '__file__' attribute for the '__main__' module.
            main_module_file = getattr(
                sys.modules['__main__'], '__file__', None
            )

            if main_module_file is not None:
                bin_path = bin_path.replace(
                    "$DIR", os.path.dirname(main_module_file)
                )

        return os.path.abspath(os.path.join(
            bin_path,
            (res if os.name != 'nt' else (res + '.exe'))
        ))


# Default Server Type
ServerType('pg', _("PostgreSQL"), -1)
