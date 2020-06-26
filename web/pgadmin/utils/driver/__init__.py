##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from flask import current_app

from .registry import DriverRegistry


def get_driver(type, app=None):
    if app is not None:
        DriverRegistry.load_drivers()

    drivers = getattr(app or current_app, '_pgadmin_server_drivers', None)

    if drivers is None or not isinstance(drivers, dict):
        drivers = dict()

    if type in drivers:
        return drivers[type]

    driver = DriverRegistry.create(type)

    if driver is not None:
        drivers[type] = driver
        setattr(app or current_app, '_pgadmin_server_drivers', drivers)

    return driver


def init_app(app):
    drivers = dict()

    setattr(app, '_pgadmin_server_drivers', drivers)
    DriverRegistry.load_drivers()

    return drivers


def ping():
    drivers = getattr(current_app, '_pgadmin_server_drivers', None)

    for type in drivers:
        drivers[type].gc_timeout()
