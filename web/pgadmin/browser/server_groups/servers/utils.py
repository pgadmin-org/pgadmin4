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
        'privileges': []
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


def parse_priv_to_db(str_privileges, allowed_acls=[]):
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

    privileges = []
    allowed_acls_len = len(allowed_acls)

    for priv in str_privileges:
        priv_with_grant = []
        priv_without_grant = []

        for privilege in priv['privileges']:

            if privilege['privilege_type'] not in db_privileges:
                continue

            if privilege['privilege_type'] not in allowed_acls:
                continue

            if privilege['with_grant']:
                priv_with_grant.append(
                    db_privileges[privilege['privilege_type']]
                )
            elif privilege['privilege']:
                priv_without_grant.append(
                    db_privileges[privilege['privilege_type']]
                )
        # If we have all acl then just return all
        if len(priv_with_grant) == allowed_acls_len:
            priv_with_grant = ['ALL']
        if len(priv_without_grant) == allowed_acls_len:
            priv_without_grant = ['ALL']
        # Appending and returning all ACL
        privileges.append({
            'grantee': priv['grantee'],
            'with_grant': priv_with_grant,
            'without_grant': priv_without_grant
        })

    return privileges
