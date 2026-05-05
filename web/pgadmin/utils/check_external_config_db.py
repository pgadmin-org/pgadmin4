##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import re

from sqlalchemy import create_engine, inspect


def check_external_config_db(database_uri):
    """
    Check if external config database exists if it
    is being used.
    """
    if database_uri.startswith(("postgresql://", "postgres://")):
        database_uri = re.sub(
            r"^postgres(ql)?://", "postgresql+psycopg://",
            database_uri, count=1
        )
    engine = create_engine(database_uri)
    try:
        connection = engine.connect()
        if inspect(engine).has_table("server"):
            return True
        return False
    except Exception:
        return False
    finally:
        connection.close()
