##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys
from collections import defaultdict
from operator import attrgetter

from flask import Blueprint, current_app
from flask_babelex import gettext

from .paths import get_storage_directory
from .preferences import Preferences


class PgAdminModule(Blueprint):
    """
    Base class for every PgAdmin Module.

    This class defines a set of method and attributes that
    every module should implement.
    """

    def __init__(self, name, import_name, **kwargs):
        kwargs.setdefault('url_prefix', '/' + name)
        kwargs.setdefault('template_folder', 'templates')
        kwargs.setdefault('static_folder', 'static')
        self.submodules = []
        self.parentmodules = []

        super(PgAdminModule, self).__init__(name, import_name, **kwargs)

        def create_module_preference():
            # Create preference for each module by default
            if hasattr(self, 'LABEL'):
                self.preference = Preferences(self.name, self.LABEL)
            else:
                self.preference = Preferences(self.name, None)

            self.register_preferences()

        # Create and register the module preference object and preferences for
        # it just before the first request
        self.before_app_first_request(create_module_preference)

    def register_preferences(self):
        pass

    def register(self, app, options, first_registration=False):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """
        if first_registration:
            self.submodules = list(app.find_submodules(self.import_name))

        super(PgAdminModule, self).register(app, options, first_registration)

        for module in self.submodules:
            if first_registration:
                module.parentmodules.append(self)
            app.register_blueprint(module)

    def get_own_stylesheets(self):
        """
        Returns:
            list: the stylesheets used by this module, not including any
                stylesheet needed by the submodules.
        """
        return []

    def get_own_messages(self):
        """
        Returns:
            dict: the i18n messages used by this module, not including any
                messages needed by the submodules.
        """
        return dict()

    def get_own_javascripts(self):
        """
        Returns:
            list: the javascripts used by this module, not including
                any script needed by the submodules.
        """
        return []

    def get_own_menuitems(self):
        """
        Returns:
            dict: the menuitems for this module, not including
                any needed from the submodules.
        """
        return defaultdict(list)

    def get_panels(self):
        """
        Returns:
            list: a list of panel objects to add
        """
        return []

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: a list of url endpoints exposed to the client.
        """
        return []

    @property
    def stylesheets(self):
        stylesheets = self.get_own_stylesheets()
        for module in self.submodules:
            stylesheets.extend(module.stylesheets)
        return stylesheets

    @property
    def messages(self):
        res = self.get_own_messages()

        for module in self.submodules:
            res.update(module.messages)
        return res

    @property
    def javascripts(self):
        javascripts = self.get_own_javascripts()
        for module in self.submodules:
            javascripts.extend(module.javascripts)
        return javascripts

    @property
    def menu_items(self):
        menu_items = self.get_own_menuitems()
        for module in self.submodules:
            for key, value in module.menu_items.items():
                menu_items[key].extend(value)
        menu_items = dict((key, sorted(value, key=attrgetter('priority')))
                          for key, value in menu_items.items())
        return menu_items

    @property
    def exposed_endpoints(self):
        res = self.get_exposed_url_endpoints()

        for module in self.submodules:
            res += module.exposed_endpoints

        return res


IS_PY2 = (sys.version_info[0] == 2)
IS_WIN = (os.name == 'nt')

sys_encoding = sys.getdefaultencoding()
if not sys_encoding or sys_encoding == 'ascii':
    # Fall back to 'utf-8', if we couldn't determine the default encoding,
    # or 'ascii'.
    sys_encoding = 'utf-8'

fs_encoding = sys.getfilesystemencoding()
if not fs_encoding or fs_encoding == 'ascii':
    # Fall back to 'utf-8', if we couldn't determine the file-system encoding,
    # or 'ascii'.
    fs_encoding = 'utf-8'


def u(_s, _encoding=sys_encoding):
    if IS_PY2:
        if isinstance(_s, str):
            return unicode(_s, _encoding)
    return _s


def file_quote(_p):
    if IS_PY2:
        if isinstance(_p, unicode):
            return _p.encode(fs_encoding)
    return _p


if IS_WIN:
    import ctypes
    from ctypes import wintypes

    if IS_PY2:
        def env(name):
            if IS_PY2:
                # Make sure string argument is unicode
                name = unicode(name)
            n = ctypes.windll.kernel32.GetEnvironmentVariableW(name, None, 0)

            if n == 0:
                return None

            buf = ctypes.create_unicode_buffer(u'\0' * n)
            ctypes.windll.kernel32.GetEnvironmentVariableW(name, buf, n)

            return buf.value
    else:
        def env(name):
            if name in os.environ:
                return os.environ[name]
            return None

    _GetShortPathNameW = ctypes.windll.kernel32.GetShortPathNameW
    _GetShortPathNameW.argtypes = [
        wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD
    ]
    _GetShortPathNameW.restype = wintypes.DWORD

    def fs_short_path(_path):
        """
        Gets the short path name of a given long path.
        http://stackoverflow.com/a/23598461/200291
        """
        buf_size = len(_path)
        while True:
            res = ctypes.create_unicode_buffer(buf_size)
            # Note:- _GetShortPathNameW may return empty value
            # if directory doesn't exist.
            needed = _GetShortPathNameW(_path, res, buf_size)

            if buf_size >= needed:
                return res.value
            else:
                buf_size += needed

    def document_dir():
        CSIDL_PERSONAL = 5  # My Documents
        SHGFP_TYPE_CURRENT = 0  # Get current, not default value

        buf = ctypes.create_unicode_buffer(wintypes.MAX_PATH)
        ctypes.windll.shell32.SHGetFolderPathW(
            None, CSIDL_PERSONAL, None, SHGFP_TYPE_CURRENT, buf
        )

        return buf.value

else:
    def env(name):
        if name in os.environ:
            return os.environ[name]
        return None

    def fs_short_path(_path):
        return _path

    def document_dir():
        return os.path.realpath(os.path.expanduser(u'~/'))


def get_complete_file_path(file):
    """
    Args:
        file: File returned by file manager

    Returns:
         Full path for the file
    """
    if not file:
        return None

    # If desktop mode
    if current_app.PGADMIN_RUNTIME or not current_app.config['SERVER_MODE']:
        return file if os.path.isfile(file) else None

    storage_dir = get_storage_directory()
    if storage_dir:
        file = os.path.join(
            storage_dir,
            file.lstrip(u'/').lstrip(u'\\')
        )
        if IS_WIN:
            file = file.replace('\\', '/')
            file = fs_short_path(file)

    return file if os.path.isfile(file) else None


# Shortcut configuration for Accesskey
ACCESSKEY_FIELDS = [
    {
        'name': 'key',
        'type': 'keyCode',
        'label': gettext('Key')
    }
]

# Shortcut configuration
SHORTCUT_FIELDS = [
    {
        'name': 'key',
        'type': 'keyCode',
        'label': gettext('Key')
    },
    {
        'name': 'shift',
        'type': 'checkbox',
        'label': gettext('Shift')
    },

    {
        'name': 'control',
        'type': 'checkbox',
        'label': gettext('Ctrl')
    },
    {
        'name': 'alt',
        'type': 'checkbox',
        'label': gettext('Alt/Option')
    }
]
