#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.dynamic_registry import create_registry_metaclass


TestModuleRegistry = create_registry_metaclass(
    'TestModuleRegistry', __package__, decorate_as_module=True
)


TestNamedRegistry = create_registry_metaclass(
    'TestRegistry', __package__, decorate_as_module=False
)


class TestModuleBase(metaclass=TestModuleRegistry):
    pass


class TestNameBase(metaclass=TestNamedRegistry):
    pass


class ClassTestName1(TestNameBase):
    pass


class ClassTestName2(TestNameBase):
    pass
