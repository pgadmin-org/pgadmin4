#############################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
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

if sys.version_info < (2, 7):
    import unittest2 as unittest
else:
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

    def __init__(cls, name, bases, d):

        # Register this type of module, based on the module name
        # Avoid registering the BaseDriver itself

        if name != 'BaseTestGenerator' and name != 'BaseFeatureTest':
            TestsGeneratorRegistry.registry[d['__module__']] = cls

        ABCMeta.__init__(cls, name, bases, d)

    @classmethod
    def load_generators(cls, pkg_root, exclude_pkgs):

        cls.registry = dict()

        all_modules = []

        all_modules += find_modules(pkg_root, False, True)

        # Check for SERVER mode
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
        if hasattr(self, 'skip_on_database'):
            if 'data' in server_con and 'type' in server_con['data']:
                if server_con['data']['type'] in self.skip_on_database:
                    self.skipTest('cannot run in: %s' %
                                  server_con['data']['type'])

    @classmethod
    def setTestServer(cls, server):
        cls.server = server

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

    @classmethod
    def setDriver(cls, driver):
        cls.driver = driver

    @classmethod
    def setServerInformation(cls, server_information):
        cls.server_information = server_information

    @classmethod
    def setTestDatabaseName(cls, database_name):
        cls.test_db = database_name
