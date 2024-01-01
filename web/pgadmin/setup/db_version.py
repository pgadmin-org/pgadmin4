##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.model import Version, db
from sqlalchemy.orm.session import Session


def get_version():
    try:
        version = Version.query.filter_by(name='ConfigDB').first()
    except Exception:
        db.session.rollback()
        return -1

    if version:
        return version.value
    else:
        return -1


def get_version_for_migration(op):
    try:
        session = Session(bind=op.get_bind())
        version = session.query(Version).filter_by(name='ConfigDB').first()
    except Exception:
        return -1

    if version:
        return version.value
    else:
        return -1


def set_version(new_version):
    version = Version.query.filter_by(name='ConfigDB').first()
    version.value = new_version
