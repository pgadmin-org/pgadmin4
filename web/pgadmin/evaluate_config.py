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

# User configs loaded from config_local, config_distro etc.
custom_config_settings = {}


# Function to Extract settings from config_local, config_distro etc.
def get_variables_from_module(module_name):
    module = globals().get(module_name, None)
    variables = {}
    if module:
        variables = {key: value for key, value in module.__dict__.items()
                     if not (key.startswith('__') or key.startswith('_')) and
                     validate_config_variable(key, value)}
    return variables


def validate_config_variable(key, value):
    boolean_keys = ['SERVER_MODE', 'ENHANCED_COOKIE_PROTECTION',
                    'SUPPORT_SSH_TUNNEL', 'ALLOW_SAVE_TUNNEL_PASSWORD',
                    'MASTER_PASSWORD_REQUIRED']
    integer_keys = ['DEFAULT_SERVER_PORT', 'SERVER_HEARTBEAT_TIMEOUT',
                    'LOG_ROTATION_SIZE', 'LOG_ROTATION_AGE',
                    'LOG_ROTATION_MAX_LOG_FILES', 'MAX_SESSION_IDLE_TIME']
    if key in boolean_keys and not isinstance(value, bool):
        exception_msg = 'Expected boolean value for %s; got %r' % (key, value)
        raise ValueError(exception_msg)
    elif key in integer_keys and not isinstance(value, int):
        exception_msg = 'Expected integer value for %s; got %r' % (key, value)
        raise ValueError(exception_msg)
    else:
        # Do not validate
        return True


# Load distribution-specific config overrides
try:
    import config_distro
    config_distro_settings = get_variables_from_module('config_distro')
    custom_config_settings.update(config_distro_settings)
except ImportError:
    pass

# Load local config overrides
try:
    import config_local
    config_local_settings = get_variables_from_module('config_local')
    custom_config_settings.update(config_local_settings)
except ImportError:
    pass

# Load system config overrides. We do this last, so that the sysadmin can
# override anything they want from a config file that's in a protected system
# directory and away from pgAdmin to avoid invalidating signatures.
system_config_dir = '/etc/pgadmin'
if sys.platform.startswith('win32'):
    system_config_dir = os.environ['CommonProgramFiles'] + '/pgadmin'
elif sys.platform.startswith('darwin'):
    system_config_dir = '/Library/Preferences/pgadmin'

if os.path.exists(system_config_dir + '/config_system.py'):
    try:
        sys.path.insert(0, system_config_dir)
        import config_system
        config_system_settings = get_variables_from_module('config_system')
        custom_config_settings.update(config_system_settings)
    except ImportError:
        pass


def evaluate_and_patch_config(config: dict) -> dict:
    # Update settings for 'LOG_FILE', 'SQLITE_PATH', 'SESSION_DB_PATH',
    # 'AZURE_CREDENTIAL_CACHE_DIR', 'KERBEROS_CCACHE_DIR', 'STORAGE_DIR'
    # of DATA_DIR is user defined
    data_dir_dependent_settings = \
        ['LOG_FILE', 'SQLITE_PATH', 'SESSION_DB_PATH',
         'AZURE_CREDENTIAL_CACHE_DIR', 'KERBEROS_CCACHE_DIR', 'STORAGE_DIR']

    if 'DATA_DIR' in custom_config_settings:
        for setting in data_dir_dependent_settings:
            if setting not in custom_config_settings:
                data_dir = custom_config_settings['DATA_DIR']
                file_dir_name = os.path.basename(config.get(setting))
                config.update(
                    {setting: os.path.join(data_dir, file_dir_name)})

    # To use psycopg3 driver, need to specify +psycopg in conn URI
    if 'CONFIG_DATABASE_URI' in custom_config_settings:
        db_uri = custom_config_settings['CONFIG_DATABASE_URI']
        if db_uri.startswith('postgresql:'):
            custom_config_settings['CONFIG_DATABASE_URI'] = \
                'postgresql+psycopg:{0}'.format(db_uri[db_uri.find(':') + 1:])

    # Finally update config user configs
    config.update(custom_config_settings)

    # Override DEFAULT_SERVER value from environment variable.
    if 'PGADMIN_CONFIG_DEFAULT_SERVER' in os.environ:
        config['DEFAULT_SERVER'] = os.environ['PGADMIN_CONFIG_DEFAULT_SERVER']

    # Disable USER_INACTIVITY_TIMEOUT when SERVER_MODE=False
    if not config.get('SERVER_MODE'):
        config['USER_INACTIVITY_TIMEOUT'] = 0
        # Enable PSQL in Desktop Mode.
        config['ENABLE_PSQL'] = True

    return config
