##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Server helper utilities"""


def parse_priv_from_db(db_privileges):
    """
    Common utility function to parse privileges retrieved from database.
    """
    acl = {
        'grantor': db_privileges['grantor'],
        'grantee': db_privileges['grantee'],
        'privileges':[]
        }

    privileges = []
    for idx, priv in enumerate(db_privileges['privileges']):
        privileges.append({
            "privilege_type": priv,
            "privilege": True,
            "with_grant": db_privileges['grantable'][idx]
            })

    acl['privileges'] = privileges

    return acl


def parse_priv_to_db(str_privileges, object_type = None):
    """
    Common utility function to parse privileges before sending to database.
    """
    db_privileges = {
        'c': 'CONNECT',
        'C': 'CREATE',
        'T': 'TEMPORARY',
        'a': 'INSERT',
        'r': 'SELECT',
        'w': 'UPDATE',
        'd': 'DELETE',
        'D': 'TRUNCATE',
        'x': 'REFERENCES',
        't': 'TRIGGER',
        'U': 'USAGE',
        'X': 'EXECUTE'
        }
    privileges_max_cnt = {
        'DATABASE': 3,
        'TABLESPACE': 2,
        'SCHEMA': 2
      }

    privileges = []

    for priv in str_privileges:
        priv_with_grant = []
        priv_without_grant = []
        for privilege in priv['privileges']:
            if privilege['with_grant']:
                priv_with_grant.append(
                            db_privileges[privilege['privilege_type']]
                            )
            elif privilege['privilege']:
                priv_without_grant.append(
                            db_privileges[privilege['privilege_type']]
                            )

        if object_type in ("DATABASE", "SCHEMA", "TABLESPACE"):
            priv_with_grant = ", ".join(priv_with_grant) if (
              len(priv_with_grant) < privileges_max_cnt[object_type.upper()]
              ) else 'ALL'
            priv_without_grant = ", ".join(priv_without_grant) if (
              len(priv_without_grant) < privileges_max_cnt[object_type.upper()]
              ) else 'ALL'
        else:
            priv_with_grant = ", ".join(priv_with_grant)
            priv_without_grant = ", ".join(priv_without_grant)

        privileges.append({'grantee': priv['grantee'],
                           'with_grant': priv_with_grant,
                           'without_grant': priv_without_grant})

    return privileges
