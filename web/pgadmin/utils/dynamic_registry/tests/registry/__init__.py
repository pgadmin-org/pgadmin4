#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.dynamic_registry import create_registry_metaclass
from .registry import TestModuleRegistry, TestNamedRegistry, TestNameBase
from .test1 import TestModule1


def test_load_modules_based_registry():
    TestModuleRegistry.load_modules()

    if len(TestModuleRegistry._registry) != 2:
        return "Length of the registry should have been 2"

    if 'test1' not in TestModuleRegistry._registry:
        return "'test1' is not found in the registry"

    if 'test2' not in TestModuleRegistry._registry:
        return "'test2' is not found in the registry"

    obj_test1_1 = TestModuleRegistry.get('test1')
    obj_test1_2 = TestModuleRegistry.get('test1')
    obj_test2_1 = TestModuleRegistry.get('test2')

    if id(obj_test1_1) != id(obj_test1_2):
        return "Registry has created two separate instances"

    if isinstance(obj_test1_1, TestModule1) is False:
        return "Registry created wrong object"

    if id(obj_test1_1) == id(obj_test2_1):
        return "Registry should have created a separate instances for " \
            "different classes"


def test_load_classname_registry():
    TestNamedRegistry.load_modules()

    if 'ClassTestName1' not in TestNamedRegistry._registry:
        return "'ClassTestName1' is not found in the registry"

    if 'ClassTestName2' not in TestNamedRegistry._registry:
        return "'ClassTestName2' is not found in the registry"

    obj_test1_1 = TestNamedRegistry.get('ClassTestName1')
    obj_test1_2 = TestNamedRegistry.get('ClassTestName1')
    obj_test2_1 = TestNamedRegistry.get('ClassTestName2')

    if id(obj_test1_1) != id(obj_test1_2):
        return "Registry has created two separate instances"

    if id(obj_test1_1) == id(obj_test2_1):
        return "Registry should have created a separate instances for " \
            "different classes"

    try:
        class ClassTestName1(TestNameBase):  # NOSONAR
            pass

        return "Expected an runtime error when using the same classname"
    except RuntimeError:
        pass


def test_empty_registry():

    EmptyModuleRegistry = create_registry_metaclass(  # NOSONAR
        "EmptyModuleRegistry", __package__, decorate_as_module=True
    )

    if EmptyModuleRegistry._registry is not None:
        return "Registry was supposed to be None"

    if EmptyModuleRegistry._initialized is not False:
        return "Registry initialized flag should be false"


def test_create_base_class():
    RegistryWithBaseClass = create_registry_metaclass(  # NOSONAR
        'RegistryWithBaseClass', __package__, decorate_as_module=False
    )

    class TestBase(metaclass=RegistryWithBaseClass):
        pass

    registry = RegistryWithBaseClass._registry

    if registry is None or len(registry) != 0:
        return "Registry was not supposed to be None, and empty"

    if RegistryWithBaseClass._initialized is False:
        return "Registry initialized flag should not be true"
