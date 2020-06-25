##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from abc import ABCMeta

from flask_babelex import gettext


def _decorate_cls_name(module_name):
    length = len(__package__) + 1

    if len(module_name) > length and module_name.startswith(__package__):
        return module_name[length:]

    return module_name


class DriverRegistry(ABCMeta):
    """
    class DriverRegistry(object)
        Every Driver will be registered automatically by its module name.

        This uses factory pattern to genreate driver object based on its name
        automatically.

    Class-level Methods:
    ----------- -------
    * __init__(...)
      - It will be used to register type of drivers. You don't need to call
        this function explicitly. This will be automatically executed, whenever
        we create class and inherit from BaseDriver, it will register it as
        available driver in DriverRegistry. Because - the __metaclass__ for
        BaseDriver is set it to DriverRegistry, and it will create new instance
        of this DriverRegistry per class.

    * create(type, *args, **kwargs)
      - Create type of driver object for this server, from the available
        driver list (if available, or raise exception).

    * load_drivers():
      - Use this function from init_app(...) to load all available drivers in
        the registry.
    """
    registry = None
    drivers = dict()

    def __init__(cls, name, bases, d):

        # Register this type of driver, based on the module name
        # Avoid registering the BaseDriver itself

        if name != 'BaseDriver':
            DriverRegistry.registry[_decorate_cls_name(d['__module__'])] = cls

        ABCMeta.__init__(cls, name, bases, d)

    @classmethod
    def create(cls, name, **kwargs):

        if name in DriverRegistry.drivers:
            return DriverRegistry.drivers[name]

        if name in DriverRegistry.registry:
            DriverRegistry.drivers[name] = \
                (DriverRegistry.registry[name])(**kwargs)
            return DriverRegistry.drivers[name]

        raise NotImplementedError(
            gettext("Driver '{0}' has not been implemented.").format(name)
        )

    @classmethod
    def load_drivers(cls):
        # Initialize the registry only if it has not yet been initialized
        if DriverRegistry.registry is None:
            DriverRegistry.registry = dict()

        from importlib import import_module
        from werkzeug.utils import find_modules

        for module_name in find_modules(__package__, True):
            import_module(module_name)
