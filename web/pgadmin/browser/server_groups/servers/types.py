##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os

from flask import render_template
from flask_babel import gettext as _
from pgadmin.utils.preferences import Preferences


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
        self.utility_path = None

        assert (server_type not in ServerType.registry)
        ServerType.registry[server_type] = self

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

            st.utility_path = paths.register(
                'bin_paths', st.stype + '_bin_dir',
                _("{0} Binary Path").format(st.desc),
                'text', "", category_label=_('Binary paths'),
                help_str=_(
                    "Path to the directory containing the {0} utility programs (pg_dump, pg_restore etc).".format(
                        st.desc
                    )
                )
            )

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

    def utility(self, operation, sverion):
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
            raise Exception(
                _("Could not find the utility for the operation '%s'".format(
                    operation
                ))
            )

        return os.path.join(
            self.utility_path.get(),
            (res if os.name != 'nt' else (res + '.exe'))
        )


# Default Server Type
ServerType('pg', _("PostgreSQL"), -1)
