#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2022, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import six
from pgadmin.utils.dynamic_registry import create_registry_metaclass


TestModuleRegistry = create_registry_metaclass(
    'TestModuleRegistry', __package__, decorate_as_module=True
)


TestNamedRegistry = create_registry_metaclass(
    'TestRegistry', __package__, decorate_as_module=False
)


@six.add_metaclass(TestModuleRegistry)
class TestModuleBase(object):
    pass


@six.add_metaclass(TestNamedRegistry)
class TestNameBase(object):
    pass


class ClassTestName1(TestNameBase):
    pass


class ClassTestName2(TestNameBase):
    pass
