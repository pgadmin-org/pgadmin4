##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
import uuid

from pgadmin.utils import server_utils
from regression.python_test_utils import test_utils as utils

DATABASE_CONNECT_URL = '/browser/database/connect/'


def get_db_data(db_owner):
    """This function returns the database details in dict format"""
    data = {
        "datconnlimit": -1,
        "datowner": db_owner,
        "deffuncacl": [{
            "grantee": db_owner,
            "grantor": db_owner,
            "privileges": [{
                "privilege_type": "X",
                "privilege": True,
                "with_grant": False
            }]
        }],
        "defseqacl": [{
            "grantee": db_owner,
            "grantor": db_owner,
            "privileges": [{
                "privilege_type": "r",
                "privilege": True,
                "with_grant": False
            }, {
                "privilege_type": "w",
                "privilege": True,
                "with_grant": False
            }, {
                "privilege_type": "U",
                "privilege": True,
                "with_grant": False
            }]
        }],
        "deftblacl": [{
            "grantee": db_owner,
            "grantor": db_owner,
            "privileges": [{
                "privilege_type": "a",
                "privilege": True,
                "with_grant": True
            }, {
                "privilege_type": "r",
                "privilege": True,
                "with_grant": False
            }]
        }],
        "deftypeacl": [{
            "grantee": db_owner,
            "grantor": db_owner,
            "privileges": [{
                "privilege_type": "U",
                "privilege": True,
                "with_grant": False
            }]
        }],
        "encoding": "UTF8",
        "name": "db_add_%s" % str(uuid.uuid4())[1: 8],
        "privileges": [],
        "securities": [],
        "variables": [],
        'is_template': False,
        "schema_res": ["public", "sample"]
    }
    return data


def create_database(connection, db_name):
    """This function used to create database"""
    try:
        old_isolation_level = connection.isolation_level
        utils.set_isolation_level(connection, 0)
        pg_cursor = connection.cursor()
        pg_cursor.execute(
            '''CREATE DATABASE "%s" TEMPLATE template0''' % db_name
        )
        utils.set_isolation_level(connection, old_isolation_level)
        connection.commit()
        return pg_cursor
    except Exception as exception:
        raise Exception("Error while creating database. %s" % exception)


def connect_database(self, server_group, server_id, db_id):
    """
    This function verifies that database is exists and whether it connect
    successfully or not

    :param self: class object of test case class
    :type self: class
    :param server_group: server group id
    :type server_group: int
    :param server_id: server id
    :type server_id: str
    :param db_id: database id
    :type db_id: str
    :return: temp_db_con
    :rtype: list
    """

    # Verify servers
    server_utils.connect_server(self, server_id)

    # Connect to database
    db_con = self.tester.post(
        '{0}{1}/{2}/{3}'.format(
            DATABASE_CONNECT_URL,
            server_group,
            server_id,
            db_id
        ),
        follow_redirects=True
    )

    if db_con.status_code != 200:
        db_con = self.tester.post(
            '{0}{1}/{2}/{3}'.format(
                DATABASE_CONNECT_URL,
                server_group,
                server_id,
                db_id
            ),
            follow_redirects=True
        )

    assert db_con.status_code == 200
    db_con = json.loads(db_con.data.decode('utf-8'))
    return db_con


def disconnect_database(self, server_id, db_id):
    """This function disconnect the db"""
    db_con = self.tester.delete(
        '{0}{1}/{2}/{3}'.format(
            'browser/database/connect/',
            utils.SERVER_GROUP,
            server_id,
            db_id
        ),
        follow_redirects=True
    )
    assert db_con.status_code == 200
