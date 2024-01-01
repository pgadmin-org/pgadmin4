#######################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.route import BaseTestGenerator
from .registry import test_load_modules_based_registry, test_empty_registry, \
    test_create_base_class, test_load_classname_registry


class TestDynamicRegistry(BaseTestGenerator):

    scenarios = [
        (
            "Check empty registry",
            dict(test=test_empty_registry),
        ),
        (
            'Load the registry based on the modules',
            dict(test=test_load_modules_based_registry),
        ),
        (
            'Load the registry based on the name of the classes',
            dict(test=test_load_classname_registry),
        ),
        (
            "When created a base class registry is initialized",
            dict(test=test_create_base_class),
        ),
    ]

    def runTest(self):
        error = self.test()

        if error is not None:
            self.fail(error)
