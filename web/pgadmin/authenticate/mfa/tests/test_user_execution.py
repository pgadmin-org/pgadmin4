##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
from unittest.mock import patch
import config
from pgadmin.authenticate.mfa.utils import \
    mfa_user_force_registration_required
from pgadmin.authenticate.mfa.utils import mfa_user_registered, \
    user_supported_mfa_methods
from .utils import MockUserMFA, MockCurrentUserId


__MFA_PACKAGE = '.'.join((__package__.split('.'))[:-1])


def __return_true():
    return True


def __return_false():
    return False


def check_user_registered(test):

    user_mfa_test_data = [
        MockUserMFA(1, "dummy", "Hello guys"),
        MockUserMFA(1, "no-present-in-list", None),
    ]

    with patch(
        __MFA_PACKAGE + ".utils.current_user", return_value=MockCurrentUserId()
    ):
        with patch(__MFA_PACKAGE + ".utils.UserMFA") as mock_user_mfa:
            mock_user_mfa.query.filter_by.return_value.all.return_value = \
                user_mfa_test_data

            ret = mfa_user_registered(__return_true, __return_false)

            if ret is None:
                test.fail(
                    "User registration check has not called either "
                    "'is_registered' or 'is_not_registered' function"
                )

            if ret is False:
                test.fail(
                    "Not expected to be called 'is_not_registered' function "
                    "as 'dummy' is in the supported MFA methods"
                )

            methods = user_supported_mfa_methods()
            if "dummy" not in methods:
                test.fail(
                    "User registration methods are not valid: {}".format(
                        methods
                    )
                )

            # Removed the 'dummy' from the user's registered MFA list
            user_mfa_test_data.pop(0)
            ret = mfa_user_registered(__return_true, __return_false)

            if ret is None:
                test.fail(
                    "User registration check has not called either "
                    "'is_registered' or 'is_not_registered' function"
                )

            if ret is True:
                test.fail(
                    "Not expected to be called 'is_registered' function as "
                    "'not-present-in-list' is not a valid multi-factor "
                    "authentication method"
                )

    # End of test case - check_user_registered


def check_force_registration_required(test):

    if mfa_user_force_registration_required(
        __return_false, __return_true
    ) is None:
        test.fail(
            "User registration check did not call either register or "
            "do_not_register function"
        )

    config.MFA_FORCE_REGISTRATION = False
    if mfa_user_force_registration_required(
        __return_true, __return_false
    ) is True:
        test.fail(
            "User registration function should not be called, when "
            "config.MFA_FORCE_REGISTRATION is True"
        )

    config.MFA_FORCE_REGISTRATION = True
    if mfa_user_force_registration_required(
        __return_true, __return_false
    ) is False:
        test.fail(
            "'do_not_registration' function should not be called, when "
            "config.MFA_FORCE_REGISTRATION is True"
        )

    # End of test case - check_force_registration_required


user_execution_scenarios = [
    (
        "Check user is registered to do MFA",
        dict(check=check_user_registered),
    ),
    (
        "Require the forcefull registration for MFA?",
        dict(check=check_force_registration_required),
    ),
]
