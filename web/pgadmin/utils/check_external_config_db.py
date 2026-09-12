##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from db_utils import normalize_database_uri
from sqlalchemy import create_engine, inspect


def check_external_config_db(database_uri):
    """
    Check if external config database exists if it
    is being used.
    """
    engine = None
    try:
        engine = create_engine(normalize_database_uri(database_uri))
        with engine.connect():
            return inspect(engine).has_table("server")
    except Exception:
        # Anything that stops us reaching the database, a wrong password or
        # an unreachable host as much as a malformed URI, is reported as
        # "there is no external configuration database". The container
        # entrypoint relies on that so first launch still creates the user
        # from PGADMIN_DEFAULT_EMAIL and PGADMIN_DEFAULT_PASSWORD (#9984)
        # rather than leaving an installation nobody can log in to.
        return False
    finally:
        # Guarded because create_engine() itself rejects a malformed URI, and
        # an unbound name in the cleanup path is what caused this bug in the
        # first place.
        if engine is not None:
            engine.dispose()
