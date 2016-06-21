#############################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################

import unittest
from abc import ABCMeta, abstractmethod


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
      By setting the __metaclass__ for BaseTestGenerator to TestsGeneratorRegistry
      it will create new instance of this TestsGeneratorRegistry per class.

    * load_generators():
      - This function will load all the modules from __init__()
      present in registry.
    """

    registry = dict()

    def __init__(cls, name, bases, d):

        # Register this type of module, based on the module name
        # Avoid registering the BaseDriver itself

        if name != 'BaseTestGenerator':
            TestsGeneratorRegistry.registry[d['__module__']] = cls

        ABCMeta.__init__(cls, name, bases, d)

    @classmethod
    def load_generators(cls, pkg):

        cls.registry = dict()

        from importlib import import_module
        from werkzeug.utils import find_modules

        for module_name in find_modules(pkg, False, True):
            module = import_module(module_name)


import six


@six.add_metaclass(TestsGeneratorRegistry)
class BaseTestGenerator(unittest.TestCase):
    # Defining abstract method which will override by individual testcase.
    @abstractmethod
    def runTest(self):
        pass

    # Initializing app.
    def setApp(self, app):
        self.app = app

    # Initializing test_client.
    def setTestClient(self, test_client):
        self.tester = test_client
