##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""External 2FA Authentication Registry."""
from abc import abstractmethod, abstractproperty
from typing import Union

import flask

from pgadmin.utils.dynamic_registry import create_registry_metaclass


"""
class: MultiFactorAuthRegistry

An registry factory for the multi-factor authentication methods.
"""


@classmethod
def load_modules(cls, app=None):
    submodules = []
    from . import authenticator as module
    submodules.append(module)

    from . import email as module
    submodules.append(module)

    from . import utils as module
    submodules.append(module)

    from . import views as module
    submodules.append(module)

    for module in submodules:
        if "init_app" in module.__dict__.keys():
            module.__dict__["init_app"](app)


MultiFactorAuthRegistry = create_registry_metaclass(
    'MultiFactorAuthRegistry', __package__, load_modules=load_modules,
    decorate_as_module=True
)


class BaseMFAuth(metaclass=MultiFactorAuthRegistry):
    """
    Base Multi-Factor Authentication (MFA) class

    A Class implements this class will be registered with
    the registry class 'MultiFactorAuthRegistry', and it will be automatically
    available as a MFA method.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """
        Represents the short name for the authentiation method. It can be used
        in the MFA_SUPPORTED_METHODS parameter in the configuration as a
        supported authentication method.

        Returns:
            str: Short name for this authentication method

        NOTE: Name must not contain special characters
        """
        pass

    @property
    @abstractmethod
    def label(self) -> str:
        """
        Represents the user visible name for the authentiation method. It will
        be visible on the authentication page and registration page.

        Returns:
            str: Value for the UI for the authentication method
        """
        pass

    @property
    def icon(self) -> str:
        """
        A url for the icon for the authentication method.

        Returns:
            str: Value for the UI for the authentication method
        """
        return ""

    @property
    def validate_script(self) -> Union[str, None]:
        """
        A url route for the javscript required for the auth method.

        Override this method for the auth methods, when it required a
        javascript on the authentication page.

        Returns:
            Union[str, None]: Url for the auth method or None
        """
        return None

    @abstractmethod
    def validate(self, **kwargs) -> str:
        """
        Validate the code/password sent using the HTTP request during the
        authentication process.

        If the validation is not done successfully for some reason, it must
        raise a ValidationException exception.

        Parameters:
            kwargs: data sent during the authentication process

        Raises:
            ValidationException: Raises when code/otp is not valid
        """
        pass

    @abstractmethod
    def validation_view(self) -> str:
        """
        Authenction route (view) for the auth method.
        """
        pass

    @abstractmethod
    def registration_view(self, form_data) -> str:
        """
        Registration View for the auth method.

        Must override this for rendering the registration page for the auth
        method.

        Args:
            form_data (dict): Form data sent from the registration page.
        """
        pass

    def register_url_endpoints(self, blueprint: flask.Blueprint) -> None:
        """
        Register the URL end-points for the auth method (special case).

        Args:
            blueprint (flask.Blueprint): MFA blueprint for registering the
                                         end-point for the method


        NOTE: Override this method only when  there is special need to expose
              an url end-point for the auth method.
        """
        pass

    def to_dict(self) -> dict:
        """
        A diction representation for the auth method.

        Returns:
            dict (id, label, icon): Diction representation for an auth method.
        """
        return {
            "id": self.name,
            "label": self.label,
            "icon": self.icon,
        }

    def validation_view_dict(self, selected_mfa: str) -> dict:
        """
        A diction representation for the auth method to be used on the
        registration page.

        Returns:
            dict: Diction representation for an auth method to be used on the
                  regisration page.
        """
        res = self.to_dict()

        res['view'] = self.validation_view()
        res['selected'] = selected_mfa == self.name
        res['script'] = self.validate_script

        return res
