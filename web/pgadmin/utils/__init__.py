##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys
import json
import subprocess
from collections import defaultdict
from operator import attrgetter

from flask import Blueprint, current_app, url_for
from flask_babel import gettext
from flask_security import current_user, login_required
from flask_security.utils import get_post_login_redirect, \
    get_post_logout_redirect
from threading import Lock

from .paths import get_storage_directory
from .preferences import Preferences
from pgadmin.utils.constants import UTILITIES_ARRAY, USER_NOT_FOUND, \
    MY_STORAGE, ACCESS_DENIED_MESSAGE
from pgadmin.utils.ajax import make_json_response
from pgadmin.model import db, User, ServerGroup, Server
from urllib.parse import unquote

ADD_SERVERS_MSG = "Added %d Server Group(s) and %d Server(s)."


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

        super().__init__(name, import_name, **kwargs)

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
        # To be implemented by child classes
        pass

    def register(self, app, options):
        """
        Override the default register function to automagically register
        sub-modules at once.
        """

        super().register(app, options)

        for module in self.submodules:
            module.parentmodules.append(self)
            if app.blueprints.get(module.name) is None:
                app.register_blueprint(module)
                app.register_logout_hook(module)

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


def u_encode(_s, _encoding=sys_encoding):
    return _s


def file_quote(_p):
    return _p


if IS_WIN:
    import ctypes
    from ctypes import wintypes

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
        return os.path.realpath(os.path.expanduser('~/'))


def get_complete_file_path(file, validate=True):
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
            file.lstrip('/').lstrip('\\')
        )
        if IS_WIN:
            file = file.replace('\\', '/')
            file = fs_short_path(file)

    if validate:
        return file if os.path.isfile(file) else None
    else:
        return file


def filename_with_file_manager_path(_file, create_file=False,
                                    skip_permission_check=False):
    """
    Args:
        file: File name returned from client file manager
        create_file: Set flag to False when file creation doesn't require
        skip_permission_check:
    Returns:
        Filename to use for backup with full path taken from preference
    """
    # retrieve storage directory path
    try:
        last_storage = Preferences.module('file_manager').preference(
            'last_storage').get()
    except Exception:
        last_storage = MY_STORAGE

    if last_storage != MY_STORAGE:
        sel_dir_list = [sdir for sdir in current_app.config['SHARED_STORAGE']
                        if sdir['name'] == last_storage]
        selected_dir = sel_dir_list[0] if len(
            sel_dir_list) == 1 else None

        if selected_dir and selected_dir['restricted_access'] and \
                not current_user.has_role("Administrator"):
            return make_json_response(success=0,
                                      errormsg=ACCESS_DENIED_MESSAGE,
                                      info='ACCESS_DENIED',
                                      status=403)
        storage_dir = get_storage_directory(
            shared_storage=last_storage)
    else:
        storage_dir = get_storage_directory()

    from pgadmin.misc.file_manager import Filemanager
    Filemanager.check_access_permission(
        storage_dir, _file, skip_permission_check)
    if storage_dir:
        _file = os.path.join(storage_dir, _file.lstrip('/').lstrip('\\'))
    elif not os.path.isabs(_file):
        _file = os.path.join(document_dir(), _file)

    def short_filepath():
        short_path = fs_short_path(_file)
        # fs_short_path() function may return empty path on Windows
        # if directory doesn't exists. In that case we strip the last path
        # component and get the short path.
        if os.name == 'nt' and short_path == '':
            base_name = os.path.basename(_file)
            dir_name = os.path.dirname(_file)
            short_path = fs_short_path(dir_name) + '\\' + base_name
        return short_path

    if create_file:
        # Touch the file to get the short path of the file on windows.
        with open(_file, 'a'):
            return short_filepath()

    return short_filepath()


def does_utility_exist(file):
    """
    This function will check the utility file exists on given path.
    :return:
    """
    error_msg = None
    if file is None:
        error_msg = gettext("Utility file not found. Please correct the Binary"
                            " Path in the Preferences dialog")
        return error_msg

    if not os.path.exists(file):
        error_msg = gettext("'%s' file not found. Please correct the Binary"
                            " Path in the Preferences dialog" % file)
    return error_msg


def get_server(sid):
    """
    # Fetch the server  etc
    :param sid:
    :return: server
    """
    server = Server.query.filter_by(id=sid).first()
    return server


def get_binary_path_versions(binary_path: str) -> dict:
    ret = {}
    binary_path = os.path.abspath(
        replace_binary_path(binary_path)
    )

    for utility in UTILITIES_ARRAY:
        ret[utility] = None
        full_path = os.path.join(binary_path,
                                 (utility if os.name != 'nt' else
                                  (utility + '.exe')))

        try:
            # if path doesn't exist raise exception
            if not os.path.isdir(binary_path):
                current_app.logger.warning('Invalid binary path.')
                raise Exception()
            # Get the output of the '--version' command
            cmd = subprocess.run(
                [full_path, '--version'],
                shell=False,
                capture_output=True,
                text=True
            )
            if cmd.returncode == 0:
                ret[utility] = cmd.stdout.split(") ", 1)[1].strip()
            else:
                raise Exception()
        except Exception as _:
            continue

    return ret


def set_binary_path(binary_path, bin_paths, server_type,
                    version_number=None, set_as_default=False):
    """
    This function is used to iterate through the utilities and set the
    default binary path.
    """
    path_with_dir = binary_path if "$DIR" in binary_path else None
    binary_versions = get_binary_path_versions(binary_path)

    for utility, version in binary_versions.items():
        version_number = version if version_number is None else version_number
        # version will be None if binary not present
        version_number = version_number or ''
        if version_number.find('.'):
            version_number = version_number.split('.', 1)[0]
        try:
            # Get the paths array based on server type
            if 'pg_bin_paths' in bin_paths or 'as_bin_paths' in bin_paths:
                paths_array = bin_paths['pg_bin_paths']
                if server_type == 'ppas':
                    paths_array = bin_paths['as_bin_paths']
            else:
                paths_array = bin_paths

            for path in paths_array:
                if path['version'].find(version_number) == 0 and \
                        path['binaryPath'] is None:
                    path['binaryPath'] = path_with_dir \
                        if path_with_dir is not None else binary_path
                    if set_as_default:
                        path['isDefault'] = True
                    break
            break
        except Exception:
            continue


def replace_binary_path(binary_path):
    """
    This function is used to check if $DIR is present in
    the binary path. If it is there then replace it with
    module.
    """
    if "$DIR" in binary_path:
        # When running as an WSGI application, we will not find the
        # '__file__' attribute for the '__main__' module.
        main_module_file = getattr(
            sys.modules['__main__'], '__file__', None
        )

        if main_module_file is not None:
            binary_path = binary_path.replace(
                "$DIR", os.path.dirname(main_module_file)
            )

    return binary_path


def add_value(attr_dict, key, value):
    """Add a value to the attribute dict if non-empty.

    Args:
        attr_dict (dict): The dictionary to add the values to
        key (str): The key for the new value
        value (str): The value to add

    Returns:
        The updated attribute dictionary
    """
    if value != "" and value is not None:
        attr_dict[key] = value

    return attr_dict


def dump_database_servers(output_file, selected_servers,
                          dump_user=current_user, from_setup=False):
    """Dump the server groups and servers.
    """
    user = _does_user_exist(dump_user, from_setup)
    if user is None:
        return False, USER_NOT_FOUND % dump_user

    user_id = user.id
    # Dict to collect the output
    object_dict = {}
    # Counters
    servers_dumped = 0

    # Dump servers
    servers = Server.query.filter_by(user_id=user_id).all()
    server_dict = {}
    for server in servers:
        if selected_servers is None or str(server.id) in selected_servers:
            # Get the group name
            group_name = ServerGroup.query.filter_by(
                user_id=user_id, id=server.servergroup_id).first().name

            attr_dict = {}
            add_value(attr_dict, "Name", server.name)
            add_value(attr_dict, "Group", group_name)
            add_value(attr_dict, "Host", server.host)
            add_value(attr_dict, "Port", server.port)
            add_value(attr_dict, "MaintenanceDB", server.maintenance_db)
            add_value(attr_dict, "Username", server.username)
            add_value(attr_dict, "Role", server.role)
            add_value(attr_dict, "Comment", server.comment)
            add_value(attr_dict, "Shared", server.shared)
            add_value(attr_dict, "DBRestriction", server.db_res)
            add_value(attr_dict, "BGColor", server.bgcolor)
            add_value(attr_dict, "FGColor", server.fgcolor)
            add_value(attr_dict, "Service", server.service)
            add_value(attr_dict, "UseSSHTunnel", server.use_ssh_tunnel)
            add_value(attr_dict, "TunnelHost", server.tunnel_host)
            add_value(attr_dict, "TunnelPort", server.tunnel_port)
            add_value(attr_dict, "TunnelUsername", server.tunnel_username)
            add_value(attr_dict, "TunnelAuthentication",
                      server.tunnel_authentication)
            add_value(attr_dict, "KerberosAuthentication",
                      server.kerberos_conn),
            add_value(attr_dict, "ConnectionParameters",
                      server.connection_params)

            # if desktop mode
            if not current_app.config['SERVER_MODE']:
                add_value(attr_dict, "PasswordExecCommand",
                          server.passexec_cmd)
                add_value(attr_dict, "PasswordExecExpiration",
                          server.passexec_expiration)

            servers_dumped = servers_dumped + 1

            server_dict[servers_dumped] = attr_dict

    object_dict["Servers"] = server_dict

    try:
        if from_setup:
            file_path = unquote(output_file)
        else:
            file_path = filename_with_file_manager_path(unquote(output_file))
    except Exception as e:
        return _handle_error(str(e), from_setup)

    # write to file
    file_content = json.dumps(object_dict, indent=4)
    error_str = "Error: {0}"
    try:
        with open(file_path, 'w') as output_file:
            output_file.write(file_content)
    except IOError as e:
        err_msg = error_str.format(e.strerror)
        return _handle_error(err_msg, from_setup)
    except Exception as e:
        err_msg = error_str.format(e.strerror)
        return _handle_error(err_msg, from_setup)

    msg = gettext("Configuration for %s servers dumped to %s" %
                  (servers_dumped, output_file.name))
    print(msg)

    return True, msg


def validate_json_data(data, is_admin):
    """
    Used internally by load_servers to validate servers data.
    :param data: servers data
    :param is_admin:
    :return: error message if any
    """
    skip_servers = []
    # Loop through the servers...
    if "Servers" not in data:
        return gettext("'Servers' attribute not found in the specified file.")

    for server in data["Servers"]:
        obj = data["Servers"][server]

        # Check if server is shared.Won't import if user is non-admin
        if obj.get('Shared', None) and not is_admin:
            print("Won't import the server '%s' as it is shared " %
                  obj["Name"])
            skip_servers.append(server)
            continue

        def check_attrib(attrib):
            if attrib not in obj:
                return gettext("'%s' attribute not found for server '%s'" %
                               (attrib, server))
            return None

        def check_is_integer(value):
            if not isinstance(value, int):
                return gettext("Port must be integer for server '%s'" % server)
            return None

        for attrib in ("Group", "Name"):
            errmsg = check_attrib(attrib)
            if errmsg:
                return errmsg

        is_service_attrib_available = obj.get("Service", None) is not None

        if not is_service_attrib_available:
            for attrib in ("Port", "Username"):
                errmsg = check_attrib(attrib)
                if errmsg:
                    return errmsg
                if attrib == 'Port':
                    errmsg = check_is_integer(obj[attrib])
                    if errmsg:
                        return errmsg

        errmsg = check_attrib("MaintenanceDB")
        if errmsg:
            return errmsg

        if "Host" not in obj and not is_service_attrib_available:
            return gettext("'Host' or 'Service' attribute not "
                           "found for server '%s'" % server)

    for server in skip_servers:
        del data["Servers"][server]
    return None


def load_database_servers(input_file, selected_servers,
                          load_user=current_user, from_setup=False):
    """Load server groups and servers.
    """
    user = _does_user_exist(load_user, from_setup)
    if user is None:
        return False, USER_NOT_FOUND % load_user

    # generate full path of file
    try:
        if from_setup:
            file_path = unquote(input_file)
        else:
            file_path = filename_with_file_manager_path(unquote(input_file))
    except Exception as e:
        return _handle_error(str(e), from_setup)

    try:
        with open(file_path) as f:
            data = json.load(f)
    except json.decoder.JSONDecodeError as e:
        return _handle_error(gettext("Error parsing input file %s: %s" %
                             (file_path, e)), from_setup)
    except Exception as e:
        return _handle_error(gettext("Error reading input file %s: [%d] %s" %
                             (file_path, e.errno, e.strerror)), from_setup)

    f.close()

    user_id = user.id
    # Counters
    groups_added = 0
    servers_added = 0

    # Get the server groups
    groups = ServerGroup.query.filter_by(user_id=user_id)

    # Validate server data
    error_msg = validate_json_data(data, user.has_role("Administrator"))
    if error_msg is not None and from_setup:
        print(ADD_SERVERS_MSG % (groups_added, servers_added))
        return _handle_error(error_msg, from_setup)

    for server in data["Servers"]:
        if selected_servers is None or str(server) in selected_servers:
            obj = data["Servers"][server]

            # Get the group. Create if necessary
            group_id = next(
                (g.id for g in groups if g.name == obj["Group"]), -1)

            if group_id == -1:
                new_group = ServerGroup()
                new_group.name = obj["Group"]
                new_group.user_id = user_id
                db.session.add(new_group)

                try:
                    db.session.commit()
                except Exception as e:
                    if from_setup:
                        print(ADD_SERVERS_MSG % (groups_added, servers_added))
                    return _handle_error(
                        gettext("Error creating server group '%s': %s" %
                                (new_group.name, e)), from_setup)

                group_id = new_group.id
                groups_added = groups_added + 1
                groups = ServerGroup.query.filter_by(user_id=user_id)

            # Create the server
            new_server = Server()
            new_server.name = obj["Name"]
            new_server.servergroup_id = group_id
            new_server.user_id = user_id
            new_server.maintenance_db = obj["MaintenanceDB"]

            new_server.host = obj.get("Host", None)

            new_server.port = obj.get("Port", None)

            new_server.username = obj.get("Username", None)

            new_server.role = obj.get("Role", None)

            new_server.comment = obj.get("Comment", None)

            new_server.db_res = obj.get("DBRestriction", None)

            if 'ConnectionParameters' in obj:
                new_server.connection_params = \
                    obj.get("ConnectionParameters", None)
            else:
                # JSON file format is old before introduction of the
                # connection parameters.
                conn_param = dict()
                for item in ['HostAddr', 'SSLMode', 'PassFile', 'SSLCert',
                             'SSLKey', 'SSLRootCert', 'SSLCrl', 'Timeout',
                             'SSLCompression']:
                    if item in obj:
                        key = item.lower()
                        if item == 'Timeout':
                            key = 'connect_timeout'
                        conn_param[key] = obj.get(item)

                new_server.connection_params = conn_param

            new_server.bgcolor = obj.get("BGColor", None)

            new_server.fgcolor = obj.get("FGColor", None)

            new_server.service = obj.get("Service", None)

            new_server.use_ssh_tunnel = obj.get("UseSSHTunnel", None)

            new_server.tunnel_host = obj.get("TunnelHost", None)

            new_server.tunnel_port = obj.get("TunnelPort", None)

            new_server.tunnel_username = obj.get("TunnelUsername", None)

            new_server.tunnel_authentication = \
                obj.get("TunnelAuthentication", None)

            new_server.shared = obj.get("Shared", None)

            new_server.kerberos_conn = obj.get("KerberosAuthentication", None)

            # if desktop mode
            if not current_app.config['SERVER_MODE']:
                new_server.passexec_cmd = obj.get("PasswordExecCommand", None)
                new_server.passexec_expiration = obj.get(
                    "PasswordExecExpiration", None)

            db.session.add(new_server)

            try:
                db.session.commit()
            except Exception as e:
                if from_setup:
                    print(ADD_SERVERS_MSG % (groups_added, servers_added))
                return _handle_error(gettext("Error creating server '%s': %s" %
                                             (new_server.name, e)), from_setup)

            servers_added = servers_added + 1

    msg = ADD_SERVERS_MSG % (groups_added, servers_added)
    print(msg)

    return True, msg


def clear_database_servers(load_user=current_user, from_setup=False):
    """Clear groups and servers configurations.
    """
    user = _does_user_exist(load_user, from_setup)
    if user is None:
        return False

    user_id = user.id

    # Remove all servers
    servers = Server.query.filter_by(user_id=user_id)
    for server in servers:
        db.session.delete(server)

    # Remove all groups
    groups = ServerGroup.query.filter_by(user_id=user_id)
    for group in groups:
        db.session.delete(group)
    servers = Server.query.filter_by(user_id=user_id)

    for server in servers:
        db.session.delete(server)

    try:
        db.session.commit()
    except Exception as e:
        error_msg = \
            gettext("Error clearing server configuration with error (%s)" %
                    str(e))
        if from_setup:
            print(error_msg)
            sys.exit(1)

        return False, error_msg


def _does_user_exist(user, from_setup):
    """
    This function will check user is exist or not. If exist then return
    """
    if isinstance(user, User):
        user = user.email

    new_user = User.query.filter_by(email=user).first()

    if new_user is None:
        print(USER_NOT_FOUND % user)
        if from_setup:
            sys.exit(1)

    return new_user


def _handle_error(error_msg, from_setup):
    """
    This function is used to print the error msg and exit from app if
    called from setup.py
    """
    if from_setup:
        print(error_msg)
        sys.exit(1)

    return False, error_msg


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


class KeyManager:
    def __init__(self):
        self.users = dict()
        self.lock = Lock()

    @login_required
    def get(self):
        user = self.users.get(current_user.id, None)
        if user is not None:
            return user.get('key', None)

    @login_required
    def set(self, _key, _new_login=True):
        with self.lock:
            user = self.users.get(current_user.id, None)
            if user is None:
                self.users[current_user.id] = dict(
                    session_count=1, key=_key)
            else:
                if _new_login:
                    user['session_count'] += 1
                user['key'] = _key

    @login_required
    def reset(self):
        with self.lock:
            user = self.users.get(current_user.id, None)

            if user is not None:
                # This will not decrement if session expired
                user['session_count'] -= 1
                if user['session_count'] == 0:
                    del self.users[current_user.id]

    @login_required
    def hard_reset(self):
        with self.lock:
            user = self.users.get(current_user.id, None)

            if user is not None:
                del self.users[current_user.id]


def get_safe_post_login_redirect():
    allow_list = [
        url_for('browser.index')
    ]
    if "SCRIPT_NAME" in os.environ and os.environ["SCRIPT_NAME"]:
        allow_list.append(os.environ["SCRIPT_NAME"])

    url = get_post_login_redirect()
    for item in allow_list:
        if url.startswith(item):
            return url

    return url_for('browser.index')


def get_safe_post_logout_redirect():
    allow_list = [
        url_for('security.login')
    ]
    if "SCRIPT_NAME" in os.environ and os.environ["SCRIPT_NAME"]:
        allow_list.append(os.environ["SCRIPT_NAME"])
    url = get_post_logout_redirect()
    for item in allow_list:
        if url.startswith(item):
            return url
    return url_for('security.login')
