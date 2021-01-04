##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""External Authentication Registry."""


from flask_babelex import gettext
from abc import ABCMeta


def _decorate_cls_name(module_name):
    length = len(__package__) + 1

    if len(module_name) > length and module_name.startswith(__package__):
        return module_name[length:]

    return module_name


class AuthSourceRegistry(ABCMeta):
    registry = None
    auth_sources = dict()

    def __init__(self, name, bases, d):

        # Register this type of auth_sources, based on the module name
        # Avoid registering the BaseAuthentication itself

        AuthSourceRegistry.registry[_decorate_cls_name(d['__module__'])] = self
        ABCMeta.__init__(self, name, bases, d)

    @classmethod
    def create(cls, name, **kwargs):

        if name in AuthSourceRegistry.auth_sources:
            return AuthSourceRegistry.auth_sources[name]

        if name in AuthSourceRegistry.registry:
            AuthSourceRegistry.auth_sources[name] = \
                (AuthSourceRegistry.registry[name])(**kwargs)
            return AuthSourceRegistry.auth_sources[name]

        raise NotImplementedError(
            gettext(
                "Authentication source '{0}' has not been implemented."
            ).format(name)
        )

    @classmethod
    def load_auth_sources(cls):
        # Initialize the registry only if it has not yet been initialized
        if AuthSourceRegistry.registry is None:
            AuthSourceRegistry.registry = dict()

        from importlib import import_module
        from werkzeug.utils import find_modules

        for module_name in find_modules(__package__, True):
            import_module(module_name)
