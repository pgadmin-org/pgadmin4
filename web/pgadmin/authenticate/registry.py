##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""External Authentication Registry."""


from pgadmin.utils.dynamic_registry import create_registry_metaclass


@classmethod
def load_modules(cls, app=None):
    submodules = []
    from . import internal as module
    submodules.append(module)

    from . import kerberos as module
    submodules.append(module)

    from . import ldap as module
    submodules.append(module)

    from . import mfa as module
    submodules.append(module)

    from . import oauth2 as module
    submodules.append(module)

    from . import webserver as module
    submodules.append(module)

    for module in submodules:
        if "init_app" in module.__dict__.keys():
            module.__dict__["init_app"](app)


AuthSourceRegistry = create_registry_metaclass(
    "AuthSourceRegistry", __package__, load_modules=load_modules,
    decorate_as_module=True
)
