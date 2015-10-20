from flask import current_app
from .registry import DriverRegistry


def get_driver(type):
    drivers = getattr(current_app, '_pgadmin_server_drivers', None)

    if drivers is None or not isinstance(drivers, dict):
        drivers = dict()

    if type in drivers:
        return drivers[type]

    driver = DriverRegistry.create(type)

    if driver is not None:
        drivers[type] = driver
        setattr(current_app, '_pgadmin_server_drivers', drivers)

    return driver

def init_app(app):
    drivers = dict()

    setattr(app, '_pgadmin_server_drivers', drivers)
    DriverRegistry.load_drivers()


def ping():
    drivers = getattr(current_app, '_pgadmin_server_drivers', None)

    for type in drivers:
        drivers[type].gc()
