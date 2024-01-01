##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
"""Multi-factor Authentication (MFA) implementation"""

from flask import Blueprint, session, Flask
from flask_babel import gettext as _

import config
from .utils import mfa_enabled, segregate_valid_and_invalid_mfa_methods

from .registry import MultiFactorAuthRegistry
from .views import validate_view, registration_view


def __create_blueprint() -> Blueprint:
    """
    Geneates the blueprint for 'mfa' endpoint, and also - define the required
    endpoints within that blueprint.

    Returns:
        Blueprint: MFA blueprint object
    """
    blueprint = Blueprint(
        "mfa", __name__, url_prefix="/mfa",
        static_folder="static",
        template_folder="templates"
    )

    blueprint.add_url_rule(
        "/validate", "validate", validate_view, methods=("GET", "POST",)
    )

    blueprint.add_url_rule(
        "/register", "register", registration_view, methods=("GET", "POST",)
    )

    return blueprint


def init_app(app: Flask):
    """
    Initialize the flask application for the multi-faction authentication
    end-points, when the SERVER_MODE is set to True, and MFA_ENABLED is set to
    True in the configuration file.

    Args:
        app (Flask): Flask Application object
    """

    if getattr(config, "SERVER_MODE", False) is False and \
            getattr(config, "MFA_ENABLED", False) is False:
        return

    MultiFactorAuthRegistry.load_modules(app)

    def exclude_invalid_mfa_auth_methods():
        """
        Exclude the invalid MFA auth methods specified in MFA_SUPPORTED_METHODS
        configuration.
        """

        supported_methods = getattr(config, "MFA_SUPPORTED_METHODS", [])
        invalid_auth_methods = []

        supported_methods, invalid_auth_methods = \
            segregate_valid_and_invalid_mfa_methods(supported_methods)

        for auth_method in invalid_auth_methods:
            app.logger.warning(_(
                "'{}' is not a valid multi-factor authentication method"
            ).format(auth_method))

        config.MFA_SUPPORTED_METHODS = supported_methods
        blueprint = __create_blueprint()

        for mfa_method in supported_methods:
            mfa = MultiFactorAuthRegistry.get(mfa_method)
            mfa.register_url_endpoints(blueprint)

        app.register_blueprint(blueprint)
        app.register_logout_hook(blueprint)

        from flask_login import user_logged_out

        @user_logged_out.connect_via(app)
        def clear_session_on_login(sender, user):
            session['mfa_authenticated'] = False

    def disable_mfa():
        """
        Set MFA_ENABLED configuration to False.

        Also - log a warning message about no valid authentication method found
        during initialization.
        """
        if getattr(config, 'MFA_ENABLED', False) is True and \
                getattr(config, 'SERVER_MODE', False) is True:
            app.logger.warning(_(
                "No valid multi-factor authentication found, hence - "
                "disabling it."
            ))
        config.MFA_ENABLED = False

    mfa_enabled(exclude_invalid_mfa_auth_methods, disable_mfa)
