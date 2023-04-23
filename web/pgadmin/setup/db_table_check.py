##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.model import db


def get_db_table_names():
    db_table_names = db.metadata.tables.keys() if db.metadata.tables else 0
    return db_table_names


def check_db_tables():
    is_error = False
    invalid_tb_names = list()
    db_table_names = get_db_table_names()
    # check table is actually present in the db.
    for table_name in db_table_names:
        try:
            if not db.inspect(db.engine).has_table(table_name=table_name):
                invalid_tb_names.append(table_name)
                is_error = True
        except AttributeError:
            if not db.engine.dialect.has_table(db.engine, table_name):
                invalid_tb_names.append(table_name)
                is_error = True

    if is_error:
        return True, invalid_tb_names
    else:
        return False, invalid_tb_names
