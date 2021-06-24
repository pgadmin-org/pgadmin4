##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from abc import ABCMeta

from pgadmin.utils.dynamic_registry import create_registry_metaclass


DriverRegistry = create_registry_metaclass(
    "DriverRegistry", __package__, decorate_as_module=True
)
