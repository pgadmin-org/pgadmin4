##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import json
import config
import copy

from flask import render_template
from flask_babel import gettext as _
from pgadmin.utils.preferences import Preferences
from werkzeug.exceptions import InternalServerError
from pgadmin.utils.constants import BINARY_PATHS
from pgadmin.utils import set_binary_path, replace_binary_path


class ServerType():
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

        assert server_type not in ServerType.registry
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
        bin_paths = copy.deepcopy(BINARY_PATHS)

        def path_converter(old_path):
            """
            This function is used to convert old path to the
            new paths which are in JSON format.
            """
            bin_paths_server_based = \
                copy.deepcopy(BINARY_PATHS['pg_bin_paths'])
            if key == 'ppas':
                bin_paths_server_based = \
                    copy.deepcopy(BINARY_PATHS['as_bin_paths'])

            if not ServerType.is_binary_path_of_type_json(old_path):
                set_binary_path(old_path, bin_paths_server_based,
                                key, set_as_default=True)
            else:
                bin_path_dict = \
                    {item['version']: item for item in bin_paths_server_based}
                old_path_dict = \
                    {item['version']: item for item in json.loads(old_path)}

                for item in bin_path_dict:
                    bin_path_dict[item].update(old_path_dict.get(item, {}))

                bin_paths_server_based = list(bin_path_dict.values())

            # Set the DEFAULT_BINARY_PATHS if any
            ServerType.set_default_binary_path(bin_paths_server_based, key)

            return json.dumps(bin_paths_server_based)

        for key in cls.registry:
            st = cls.registry[key]

            if key not in ['pg', 'ppas']:
                continue

            if key == 'pg':
                # Set the DEFAULT_BINARY_PATHS if any
                ServerType.set_default_binary_path(
                    bin_paths['pg_bin_paths'], key)

                st.utility_path = paths.register(
                    'bin_paths', 'pg_bin_dir',
                    _("PostgreSQL Binary Path"), 'selectFile',
                    json.dumps(bin_paths['pg_bin_paths']),
                    category_label=_('Binary paths')
                )
            elif key == 'ppas':
                # Set the DEFAULT_BINARY_PATHS if any
                ServerType.set_default_binary_path(
                    bin_paths['as_bin_paths'], key)

                st.utility_path = paths.register(
                    'bin_paths', 'ppas_bin_dir',
                    _("EDB Advanced Server Binary Path"), 'selectFile',
                    json.dumps(bin_paths['as_bin_paths']),
                    category_label=_('Binary paths')
                )

            # Run the migrate user preferences.
            paths.migrate_user_preferences(st.utility_path.pid,
                                           path_converter)

    @property
    def priority(self):
        return self.spriority

    def __str__(self):
        return _("Type: {0}, Description: {1}, Priority: {2}").format(
            self.stype, self.desc, self.spriority
        )

    def instance_of(self):
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

        bin_path = self.get_utility_path(sversion)
        if bin_path is None:
            return None

        # Check if "$DIR" present in binary path
        bin_path = replace_binary_path(bin_path)

        return os.path.abspath(os.path.join(
            bin_path,
            (res if os.name != 'nt' else (res + '.exe'))
        ))

    def get_utility_path(self, sverison):
        """
        This function is used to get the utility path set by the user in
        preferences for the specific server version, if not set then check
        for any default path is set.
        """
        default_path = None
        bin_path_json = json.loads(self.utility_path.get())
        # iterate through all the path and return appropriate value
        for bin_path in bin_path_json:
            if int(bin_path['version']) <= sverison < \
                int(bin_path['next_major_version']) and \
                    bin_path['binaryPath'] is not None and \
                    bin_path['binaryPath'].strip() != '':
                return bin_path['binaryPath']

            if bin_path['isDefault']:
                default_path = bin_path['binaryPath']

        return default_path

    @staticmethod
    def is_default_binary_path_set(binary_paths):
        """
        This function is used to iterate through the binary paths
        and check whether isDefault is set to true.
        """
        for path in binary_paths:
            if path['isDefault']:
                return True
        return False

    @staticmethod
    def is_binary_path_of_type_json(binary_path):
        """
        This function will check if the binary path is of type json or not.
        """
        try:
            json.loads(binary_path)
        except ValueError:
            return False
        return True

    @staticmethod
    def set_default_binary_path(bin_paths, server_type):
        """
        This function is used to check whether default binary path is set
        or not and then iterate through config.DEFAULT_BINARY_PATHS and
        set the path based on version number.
        """
        is_default_path_set = ServerType.is_default_binary_path_set(bin_paths)
        for path in config.DEFAULT_BINARY_PATHS:
            path_value = config.DEFAULT_BINARY_PATHS[path]
            if path_value is not None and path_value != "" and \
                    path.find(server_type) == 0 and len(path.split('-')) > 1:
                set_binary_path(path_value, bin_paths, server_type,
                                path.split('-')[1])
            elif path_value is not None and path_value != "" and \
                    path.find(server_type) == 0:
                set_binary_path(path_value, bin_paths, server_type,
                                set_as_default=not is_default_path_set)


# Default Server Type
ServerType('pg', _("PostgreSQL"), -1)
