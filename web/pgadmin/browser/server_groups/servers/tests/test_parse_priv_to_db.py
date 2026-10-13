##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from .. import utils


def _acl(grantee, privs, grantor='postgres', old_grantee=None):
    entry = {
        'grantee': grantee,
        'grantor': grantor,
        'privileges': [
            {'privilege_type': p, 'privilege': True, 'with_grant': wg}
            for p, wg in privs
        ]
    }
    if old_grantee is not None:
        entry['old_grantee'] = old_grantee
    return entry


class ParsePrivToDbTestCase(BaseTestGenerator):
    """Check that grantees with identical privileges are merged."""

    scenarios = [
        ('Identical privileges are merged into one entry', {
            'acls': [_acl('role1', [('U', False)]),
                     _acl('role2', [('U', False)])],
            'allowed': ['U'],
            'expected': [('role1, role2', 'role1, role2', [], ['USAGE'])]
        }),
        ('PUBLIC and quoted roles are merged in order', {
            'acls': [_acl('PUBLIC', [('X', False)]),
                     _acl('Role A', [('X', False)])],
            'allowed': ['X'],
            'expected': [('PUBLIC, "Role A"', 'PUBLIC, "Role A"', [],
                          ['EXECUTE'])]
        }),
        ('Different privileges are kept apart', {
            'acls': [_acl('role1', [('r', False)]),
                     _acl('role2', [('r', False), ('a', False)]),
                     _acl('role3', [('r', False)])],
            'allowed': ['a', 'r', 'w'],
            'expected': [('role1, role3', 'role1, role3', [], ['SELECT']),
                         ('role2', 'role2', [], ['SELECT', 'INSERT'])]
        }),
        ('Grant option is part of the match', {
            'acls': [_acl('role1', [('U', True)]),
                     _acl('role2', [('U', False)])],
            'allowed': ['U'],
            'expected': [('role1', 'role1', ['USAGE'], []),
                         ('role2', 'role2', [], ['USAGE'])]
        }),
        ('Different grantors are kept apart', {
            'acls': [_acl('role1', [('U', False)], grantor='owner1'),
                     _acl('role2', [('U', False)], grantor='owner2')],
            'allowed': ['U'],
            'expected': [('role1', 'role1', [], ['USAGE']),
                         ('role2', 'role2', [], ['USAGE'])]
        }),
        ('Old grantees are merged alongside the new ones', {
            'acls': [_acl('role1', [('U', False)], old_grantee='old1'),
                     _acl('role2', [('U', False)])],
            'allowed': ['U'],
            'expected': [('role1, role2', 'old1, role2', [], ['USAGE'])]
        }),
        ('A grantee changed from PUBLIC keeps PUBLIC as the old one', {
            'acls': [_acl('role1', [('U', False)], old_grantee='PUBLIC')],
            'allowed': ['U'],
            'expected': [('role1', 'PUBLIC', [], ['USAGE'])]
        }),
    ]

    def runTest(self):
        result = utils.parse_priv_to_db(self.acls, self.allowed)
        self.assertEqual(
            [(p['grantee'], p['old_grantee'], p['with_grant'],
              p['without_grant']) for p in result],
            self.expected)
