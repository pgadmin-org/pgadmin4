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
    engine = create_engine(normalize_database_uri(database_uri))
    connection = None
    try:
        connection = engine.connect()
        return inspect(engine).has_table("server")
        return False
    finally:
        if connection:
            connection.close()
