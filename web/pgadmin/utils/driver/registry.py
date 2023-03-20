##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from abc import ABCMeta

from pgadmin.utils.dynamic_registry import create_registry_metaclass
import config


@classmethod
def load_modules(cls, app=None):
    submodules = []

    from . import psycopg3 as module
    submodules.append(module)

    from . import abstract as module
    submodules.append(module)

    for module in submodules:
        if "init_app" in module.__dict__.keys():
            module.__dict__["init_app"](app)


DriverRegistry = create_registry_metaclass(
    "DriverRegistry", __package__, load_modules=load_modules,
    decorate_as_module=True
)
