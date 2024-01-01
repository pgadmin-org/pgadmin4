##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
from pgadmin.authenticate.mfa import mfa_enabled
import config


__MFA_ENABLED = 'MFA Enabled'
__MFA_DISABLED = 'MFA Disabled'
TEST_UTILS_AUTH_PKG = 'tests.utils'


def __mfa_is_enabled():
    return __MFA_ENABLED


def __mfa_is_disabled():
    return __MFA_DISABLED


def check_mfa_enabled(test):
    config.MFA_ENABLED = test.enabled
    config.MFA_SUPPORTED_METHODS = test.supported_list

    if mfa_enabled(__mfa_is_enabled, __mfa_is_disabled) != test.expected:
        test.fail(test.fail_msg)


def log_message_in_init_app(test):
    import types
    from unittest.mock import patch
    from .. import init_app
    from .utils import test_create_dummy_app

    auth_method_msg = "'xyz' is not a valid multi-factor authentication method"
    disabled_msg = \
        "No valid multi-factor authentication found, hence - disabling it."
    warning_invalid_auth_found = False
    warning_disable_auth = False

    dummy_app = test_create_dummy_app(test.name)

    def _log_warning_msg(_msg):
        nonlocal warning_invalid_auth_found
        nonlocal warning_disable_auth

        if auth_method_msg == _msg:
            warning_invalid_auth_found = True
            return

        if _msg == disabled_msg:
            warning_disable_auth = True

    with patch.object(
        dummy_app.logger,
        'warning',
        new=_log_warning_msg
    ):
        config.MFA_ENABLED = True
        config.MFA_SUPPORTED_METHODS = test.supported_list
        init_app(dummy_app)

        if warning_invalid_auth_found is not test.warning_invalid_auth_found \
                or warning_disable_auth is not test.warning_disable_auth:
            test.fail(test.fail_msg)
            test.fail()


config_scenarios = [
    (
        "Check MFA enabled with no authenticators?",
        dict(
            check=check_mfa_enabled, enabled=True, supported_list=list(),
            expected=__MFA_DISABLED,
            fail_msg="MFA is enabled with no authenticators, but - "
            "'execute_if_disabled' function is not called."
        ),
    ),
    (
        "Check MFA enabled?",
        dict(
            check=check_mfa_enabled, enabled=True,
            supported_list=[TEST_UTILS_AUTH_PKG], expected=__MFA_ENABLED,
            fail_msg="MFA is enable, but - 'execute_if_enabled' function "
            "is not called."
        ),
    ),
    (
        "Check MFA disabled check functionality works?",
        dict(
            check=check_mfa_enabled, enabled=False,
            supported_list=list(),
            expected=__MFA_DISABLED,
            fail_msg="MFA is disabled, but - 'execute_if_enabled' function "
            "is called."
        ),
    ),
    (
        "Check MFA in the supported MFA LIST is part of the registered one",
        dict(
            check=check_mfa_enabled, enabled=True,
            supported_list=["not-in-list"],
            expected=__MFA_DISABLED,
            fail_msg="MFA is enabled with invalid authenticators, but - "
            "'execute_if_enabled' function is called"
        ),
    ),
    (
        "Check warning message with invalid method appended during "
        "init_app(...)",
        dict(
            check=log_message_in_init_app,
            supported_list=["xyz", TEST_UTILS_AUTH_PKG],
            name="warning_app_having_invalid_method",
            warning_invalid_auth_found=True, warning_disable_auth=False,
            fail_msg="Warning for invalid auth is not found",
        ),
    ),
    (
        "Check warning message with invalid method during "
        "init_app(...) ",
        dict(
            check=log_message_in_init_app, supported_list=["xyz"],
            name="warning_app_with_invalid_method",
            warning_invalid_auth_found=False, warning_disable_auth=True,
            fail_msg="Warning for invalid auth is not found",
        ),
    ),
    (
        "Check warning message when empty supported mfa list during "
        "init_app(...)",
        dict(
            check=log_message_in_init_app, supported_list=[""],
            name="warning_app_with_empty_supported_list",
            warning_invalid_auth_found=False, warning_disable_auth=True,
            fail_msg="Warning not found with empty supported mfa methods",
        ),
    ),
    (
        "No warning message should found with valid configurations during "
        "init_app(...)",
        dict(
            check=log_message_in_init_app, name="no_warning_app",
            supported_list=[TEST_UTILS_AUTH_PKG],
            warning_invalid_auth_found=False, warning_disable_auth=False,
            fail_msg="Warning found with valid configure",
        ),
    ),
]
