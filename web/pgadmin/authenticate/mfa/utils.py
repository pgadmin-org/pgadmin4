##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
"""Multi-factor Authentication (MFA) utility functions"""

from collections.abc import Callable
from functools import wraps

from flask import url_for, session, request, redirect
from flask_login.utils import login_url
from flask_security import current_user

import config
from pgadmin.model import UserMFA, db
from .registry import MultiFactorAuthRegistry


class ValidationException(Exception):
    """
    class: ValidationException
    Base class: Exception

    An exception class for raising validation issue.
    """
    pass


def segregate_valid_and_invalid_mfa_methods(
    mfa_supported_methods: list
) -> (list, list):
    """
    Segregate the valid and invalid authentication methods from the given
    methods.

    Args:
        mfa_supported_methods (list): List of auth methods

    Returns:
        list, list: Set of valid & invalid auth methods
    """

    invalid_auth_methods = []
    valid_auth_methods = []

    for mfa in mfa_supported_methods:

        # Put invalid MFA method in separate list
        if mfa not in MultiFactorAuthRegistry._registry:
            if mfa not in invalid_auth_methods:
                invalid_auth_methods.append(mfa)
            continue

        # Exclude the duplicate entries
        if mfa in valid_auth_methods:
            continue

        valid_auth_methods.append(mfa)

    return valid_auth_methods, invalid_auth_methods


def mfa_suppored_methods() -> dict:
    """
    Returns the dictionary containing information on all supported methods with
    information about whether they're registered for the current user, or not.

    It returns information in this format:
    {
        <auth_method_name>: {
            "mfa": <MFA Auth Object>,
            "registered": True|False
        },
        ...
    }

    Returns:
        dict: List of all supported MFA methods with the flag for the
              registered with the current user or not.
    """
    supported_mfa_auth_methods = dict()

    for auth_method in config.MFA_SUPPORTED_METHODS:
        registry = MultiFactorAuthRegistry.get(auth_method)
        supported_mfa_auth_methods[registry.name] = {
            "mfa": registry, "registered": False
        }

    auths = UserMFA.query.filter_by(user_id=current_user.id).all()

    for auth in auths:
        if auth.mfa_auth in supported_mfa_auth_methods:
            supported_mfa_auth_methods[auth.mfa_auth]['registered'] = True

    return supported_mfa_auth_methods


def user_supported_mfa_methods():
    """
    Returns the dict for the authentication methods, registered for the
    current user, among the list of supported.

    Returns:
        dict: dict for the auth methods
    """
    auths = UserMFA.query.filter_by(user_id=current_user.id).all()
    res = dict()
    supported_mfa_auth_methods = dict()

    if len(auths) > 0:
        for auth_method in config.MFA_SUPPORTED_METHODS:
            registry = MultiFactorAuthRegistry.get(auth_method)
            supported_mfa_auth_methods[registry.name] = registry

        for auth in auths:
            if auth.mfa_auth in supported_mfa_auth_methods:
                res[auth.mfa_auth] = \
                    supported_mfa_auth_methods[auth.mfa_auth]

    return res


def is_mfa_session_authenticated() -> bool:
    """
    Checks if this session is authenticated, or not.

    Returns:
        bool: Is this session authenticated?
    """
    return session.get('mfa_authenticated', False) is True


def mfa_enabled(execute_if_enabled, execute_if_disabled) -> None:
    """
    A ternary method to enable calling either of the methods based on the
    configuration for the MFA.

    When MFA is enabled and has a valid supported auth methods,
    'execute_if_enabled' method is executed, otherwise -
    'execute_if_disabled' method is executed.

    Args:
        execute_if_enabled (Callable[[], None]):  Method to executed when MFA
                                                  is enabled.
        execute_if_disabled (Callable[[], None]): Method to be executed when
                                                  MFA is disabled.

    Returns:
        None: Expecting the methods to return None as it will not be consumed.

    NOTE: Removed the typing anotation as it was giving errors.
    """

    is_server_mode = getattr(config, 'SERVER_MODE', False)
    enabled = getattr(config, "MFA_ENABLED", False)
    supported_methods = getattr(config, "MFA_SUPPORTED_METHODS", [])

    if is_server_mode is True and enabled is True and \
            isinstance(supported_methods, list):
        supported_methods, _ = segregate_valid_and_invalid_mfa_methods(
            supported_methods
        )

        if len(supported_methods) > 0:
            return execute_if_enabled()

    return execute_if_disabled()


def mfa_user_force_registration_required(register, not_register) -> None:
    """
    A ternary method to cenable calling either of the methods based on the
    condition force registration is required.

    When force registration is enabled, and the current user has not registered
    for any of the supported authentication method, then the 'register' method
    is executed, otherwise - 'not_register' method is executed.

    Args:
        register (Callable[[], None])    : Method to be executed when for
                                           registration required and user has
                                           not registered for any auth method.
        not_register (Callable[[], None]): Method to be executed otherwise.

    Returns:
        None: Expecting the methods to return None as it will not be consumed.
    """
    return register() \
        if getattr(config, "MFA_FORCE_REGISTRATION", False) is True else \
        not_register()


def mfa_user_registered(registered, not_registered) -> None:
    """
    A ternary method to enable calling either of the methods based on the
    condition - if the user is registed for any of the auth methods.

    When current user is registered for any of the supported auth method, then
    the 'registered' method is executed, otherwise - 'not_registered' method is
    executed.

    Args:
        registered (Callable[[], None])    : Method to be executed when
                                             registered.
        not_registered (Callable[[], None]): Method to be executed when not
                                             registered

    Returns:
        None: Expecting the methods to return None as it will not be consumed.

    NOTE: Removed the typing anotation as it was giving errors.
    """

    return registered() if len(user_supported_mfa_methods()) > 0 else \
        not_registered()


def mfa_session_authenticated(authenticated, unauthenticated):
    """
    A ternary method to enable calling either of the methods based on the
    condition - if the user has already authenticated, or not.

    When current user is already authenticated, then 'authenticated' method is
    executed, otherwise - 'unauthenticated' method is executed.

    Args:
        authenticated (Callable[[], None])  : Method to be executed when
                                              user is authenticated.
        unauthenticated (Callable[[], None]): Method to be executed when the
                                              user is not passed the
                                              authentication.

    Returns:
        None: Expecting the methods to return None as it will not be consumed.

    NOTE: Removed the typing anotation as it was giving errors.
    """
    return authenticated() if session.get('mfa_authenticated', False) is True \
        else unauthenticated()


def mfa_required(wrapped):
    """
    A decorator do decide the next course of action when a page is being
    opened, it will open the appropriate page in case the 2FA is not passed.

    Function executed
        |
    Check for MFA Enabled? --------+
        |                          |
        | No                       |
        |                          | Yes
    Run the wrapped function [END] |
                                   |
        Is user has registered for at least one MFA method? -+
                    |                                        |
                    | No                                     |
                    |                                        |
        Is force registration required? -+                   |
                    |                    |                   | Yes
                    | No                 |                   |
                    |                    | Yes               |
        Run the wrapped function [END]   |                   |
                                         |                   |
                            Open Registration page [END]     |
                                                              |
                                          Open the authentication page [END]

    Args:
        func(Callable[..]): Method to be called if authentcation is passed
    """

    def get_next_url():
        next_url = request.url
        registration_url = url_for('mfa.register')

        if next_url.startswith(registration_url):
            return url('browser.index')

        return next_url

    def redirect_to_mfa_validate_url():
        return redirect(login_url("mfa.validate", next_url=get_next_url()))

    def redirect_to_mfa_registration():
        return redirect(login_url("mfa.register", next_url=get_next_url()))

    @wraps(wrapped)
    def inner(*args, **kwargs):

        def execute_func():
            session['mfa_authenticated'] = True
            return wrapped(*args, **kwargs)

        def if_else_func(_func, first, second):
            def if_else_func_inner():
                return _func(first, second)
            return if_else_func_inner

        return mfa_enabled(
            if_else_func(
                mfa_session_authenticated,
                execute_func,
                if_else_func(
                    mfa_user_registered,
                    redirect_to_mfa_validate_url,
                    if_else_func(
                        mfa_user_force_registration_required,
                        redirect_to_mfa_registration,
                        execute_func
                    )
                )
            ),
            execute_func
        )

    return inner


def is_mfa_enabled() -> bool:
    """
    Returns True if MFA is enabled otherwise False

    Returns:
        bool: Is MFA Enabled?
    """
    return mfa_enabled(lambda: True, lambda: False)


def mfa_delete(auth_name: str) -> bool:
    """
    A utility function to delete the auth method for the current user from the
    configuration database.

    Args:
        auth_name (str): Name of the argument

    Returns:
        bool: True if auth method was registered for the current user, and
              delete successfully, otherwise - False
    """
    auth = UserMFA.query.filter_by(
        user_id=current_user.id, mfa_auth=auth_name
    )

    if int(auth.count()) != 0:
        auth.delete()
        db.session.commit()

        return True

    return False


def mfa_add(auth_name: str, options: str) -> None:
    """
    A utility funtion to add/update the auth method in the configuration
    database for the current user with the method specific options.

    e.g. email-address for 'email' method, and 'secret' for the 'authenticator'

    Args:
        auth_name (str): Name of the auth method
        options (str)  : A data options specific to the auth method
    """
    auth = UserMFA.query.filter_by(
        user_id=current_user.id, mfa_auth=auth_name
    ).first()

    if auth is None:
        auth = UserMFA(
            user_id=current_user.id,
            mfa_auth=auth_name,
            options=options
        )
        db.session.add(auth)

    # We will override the existing options
    auth.options = options

    db.session.commit()


def fetch_auth_option(auth_name: str) -> (str, bool):
    """
    A utility function to fetch the extra data, stored as options, for the
    given auth method for the current user.

    Returns a set as (data, Auth method registered?)

    Args:
        auth_name (str): Name of the auth method

    Returns:
        (str, bool): (data, has current user registered for the auth method?)
    """
    auth = UserMFA.query.filter_by(
        user_id=current_user.id, mfa_auth=auth_name
    ).first()

    if auth is None:
        return None, False

    return auth.options, True
