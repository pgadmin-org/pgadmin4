##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""This file contains functions for creating dynamic registry meta class."""

from abc import ABCMeta


# Constructor
def __constructor(self, name, bases, kwargs):
    # Register this type of auth_sources, based on the module name
    # Avoid registering the BaseAuthentication itself
    cls = self.__class__
    entry = self._decorate_cls_name(name, kwargs)

    if cls._registry is None:
        cls._registry = dict()
    else:
        if entry in cls._registry:
            raise RuntimeError((
                "{} class is already been registered with {} "
                "(package: {})"
            ).format(entry, cls._name_, cls._package_))

    if cls._initialized is True:
        cls._registry[entry] = self
    cls._initialized = True

    ABCMeta.__init__(self, name, bases, kwargs)


@classmethod
def __get(cls, name, **kwargs):
    if name in cls._objects:
        return cls._objects[name]

    if cls._registry is not None and name in cls._registry:
        cls._objects[name] = (cls._registry[name])(**kwargs)

        return cls._objects[name]

    raise NotImplementedError(
        "{} '{}' has not been implemented.".format(cls.__name__, name)
    )


@classmethod
def __load_modules(cls, app=None):
    # Initialize the registry only if it has not yet been initialized
    if cls._registry is None:
        cls._registry = dict()

    from importlib import import_module
    from werkzeug.utils import find_modules

    for module_name in find_modules(cls._package_, True):
        module = import_module(module_name)

        if "init_app" in module.__dict__.keys():
            module.__dict__["init_app"](app)


def __get_module_name(self, name, kwargs):
    module_name = kwargs["__module__"]
    length = len(self._package_) + 1

    if len(module_name) > length and module_name.startswith(self._package_):
        return module_name[length:]

    return module_name


def __get_class_name(self, name, kwargs):
    return name


def create_registry_metaclass(name, package, load_modules=__load_modules,
                              decorate_as_module=True):

    class_params = {
        # constructor
        "__init__": __constructor,

        # Class members
        "_registry": None,
        "_objects": dict(),
        "_package_": package,

        # Member functions
        "get": __get,
        "load_modules": load_modules,
        "_name_": name,
        "_decorate_cls_name": __get_module_name
        if decorate_as_module is True else __get_class_name,
        "_initialized": False,
    }

    # Creating class dynamically
    return type(package + "." + name, (ABCMeta, ), class_params)
