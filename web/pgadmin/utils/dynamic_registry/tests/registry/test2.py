#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from .registry import TestModuleBase


# This class will be registered with TestModuleRegistry (registry)
class TestModule2(TestModuleBase):
    pass
