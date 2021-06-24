##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""External Authentication Registry."""


from pgadmin.utils.dynamic_registry import create_registry_metaclass


AuthSourceRegistry = create_registry_metaclass(
    "AuthSourceRegistry", __package__, decorate_as_module=True
)
