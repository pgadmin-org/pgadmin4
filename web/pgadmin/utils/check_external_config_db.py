##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from sqlalchemy import create_engine, inspect


def check_external_config_db(database_uri):
    """
    Check if external config database exists if it
    is being used.
    """
    engine = create_engine(database_uri)
    try:
        # The context manager closes the connection on every path. The
        # previous "finally: connection.close()" raised NameError when
        # engine.connect() itself failed (e.g. an unreachable database),
        # masking the intended "return False".
        with engine.connect():
            return inspect(engine).has_table("server")
    except Exception:
        return False
    finally:
        engine.dispose()
