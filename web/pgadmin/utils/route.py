#############################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################

import sys
import traceback
from abc import ABCMeta, abstractmethod
from importlib import import_module

import six
from werkzeug.utils import find_modules
from pgadmin.utils import server_utils

import unittest


class TestsGeneratorRegistry(ABCMeta):
    """
    class TestsGeneratorRegistry(object)
        Every module will be registered automatically by its module name.

    Class-level Methods:
    ----------- -------
    * __init__(...)
      - This is used to register test modules. You don't need to
      call this function explicitly. This will be automatically executed,
      whenever we create a class and inherit from BaseTestGenerator -
      it will register it as an available module in TestsGeneratorRegistry.
      By setting the __metaclass__ for BaseTestGenerator to
      TestsGeneratorRegistry it will create new instance of this
      TestsGeneratorRegistry per class.

    * load_generators():
      - This function will load all the modules from __init__()
      present in registry.
    """

    registry = dict()

    def __init__(self, name, bases, d):

        # Register this type of module, based on the module name
        # Avoid registering the BaseDriver itself

        if name != 'BaseTestGenerator' and name != 'BaseFeatureTest':
            # Store/append test classes in 'registry' if test modules has
            # multiple classes
            if d['__module__'] in TestsGeneratorRegistry.registry:
                TestsGeneratorRegistry.registry[d['__module__']].append(self)
            else:
                TestsGeneratorRegistry.registry[d['__module__']] = [self]

        ABCMeta.__init__(self, name, bases, d)

    @classmethod
    def load_generators(cls, pkg_root, exclude_pkgs, for_modules=[],
                        is_resql_only=False):

        cls.registry = dict()

        all_modules = []

        all_modules += find_modules(pkg_root, False, True)

        if 'resql' not in exclude_pkgs:
            # Append reverse engineered test case module
            all_modules.append('regression.re_sql.tests.test_resql')

        # If specific modules are to be tested, exclude others
        # for modules are handled differently for resql
        if not is_resql_only and len(for_modules) > 0:
            all_modules = [module_name
                           for module_name in all_modules
                           for fmod in for_modules
                           if module_name.endswith(fmod)]

        # Set the module list and exclude packages in the BaseTestGenerator
        # for Reverse Engineer SQL test cases.
        BaseTestGenerator.setReSQLModuleList(all_modules)
        BaseTestGenerator.setExcludePkgs(exclude_pkgs)

        # Check if only reverse engineered sql test cases to run
        # if yes then import only that module
        if is_resql_only:
            BaseTestGenerator.setForModules(for_modules)
            try:
                import_module('regression.re_sql.tests.test_resql')
            except ImportError:
                traceback.print_exc(file=sys.stderr)
        else:
            # Check for SERVER mode
            TestsGeneratorRegistry._check_server_mode(all_modules,
                                                      exclude_pkgs)

    @staticmethod
    def _check_server_mode(all_modules, exclude_pkgs):
        """
        This function check for server mode test cases.
        :param all_modules: all modules.
        :param exclude_pkgs: exclude package list.
        """
        for module_name in all_modules:
            try:
                if "tests." in str(module_name) and not any(
                    str(module_name).startswith(
                        'pgadmin.' + str(exclude_pkg)
                    ) for exclude_pkg in exclude_pkgs
                ):
                    import_module(module_name)
            except ImportError:
                traceback.print_exc(file=sys.stderr)


@six.add_metaclass(TestsGeneratorRegistry)
class BaseTestGenerator(unittest.TestCase):
    # Defining abstract method which will override by individual testcase.

    def setUp(self):
        super(BaseTestGenerator, self).setUp()
        self.server_id = self.server_information["server_id"]
        server_con = server_utils.connect_server(self, self.server_id)
        if hasattr(self, 'skip_on_database') and \
            'data' in server_con and 'type' in server_con['data'] and \
                server_con['data']['type'] in self.skip_on_database:
            self.skipTest('cannot run in: %s' % server_con['data']['type'])

    def setTestServer(self, server):
        self.server = server

    @abstractmethod
    def runTest(self):
        pass

    # Initializing app.
    def setApp(self, app):
        self.app = app

    # Initializing test_client.
    @classmethod
    def setTestClient(cls, test_client):
        cls.tester = test_client

    def setDriver(self, driver):
        self.driver = driver

    def setServerInformation(self, server_information):
        self.server_information = server_information

    def setTestDatabaseName(self, database_name):
        self.test_db = database_name

    @classmethod
    def setReSQLModuleList(cls, module_list):
        cls.re_sql_module_list = module_list

    @classmethod
    def setExcludePkgs(cls, exclude_pkgs):
        cls.exclude_pkgs = exclude_pkgs

    @classmethod
    def setForModules(cls, for_modules):
        cls.for_modules = for_modules
