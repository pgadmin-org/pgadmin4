##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import uuid

from flask import render_template

from pgadmin.utils.route import BaseTestGenerator
from regression import parent_node_dict
from regression.python_test_utils import test_utils as utils


class RoleAdminOptionPermissionTestCase(BaseTestGenerator):
    """Live test of the has_admin_option column in permission.sql.

    The column must say exactly what the server itself allows for
    GRANT/REVOKE of the role: ADMIN OPTION held directly, or through
    another role the current user is a member of. On PostgreSQL 16 and
    later a membership granted WITH INHERIT FALSE does not carry the
    ADMIN OPTION along, whereas on 14 and 15 it does. Each case is
    checked both against the expected value and against whether a real
    GRANT as that role succeeds, so the template cannot drift from the
    server's rule unnoticed.
    """
    scenarios = [
        ('Check Role Node', dict(url='/browser/role/obj/'))
    ]

    def setUp(self):
        self.server_id = parent_node_dict["server"][-1]["server_id"]
        suffix = str(uuid.uuid4())[1:8]
        self.target = 'adm_target_%s' % suffix
        self.newmember = 'adm_newmember_%s' % suffix
        self.holder = 'adm_holder_%s' % suffix
        self.direct = 'adm_direct_%s' % suffix
        self.inherited = 'adm_inherited_%s' % suffix
        self.noinherit = 'adm_noinherit_%s' % suffix
        self.plain = 'adm_plain_%s' % suffix
        self.member = 'adm_member_%s' % suffix
        self.all_roles = [
            self.target, self.newmember, self.holder, self.direct,
            self.inherited, self.noinherit, self.plain, self.member
        ]

        self.connection = utils.get_db_connection(
            self.server['db'], self.server['username'],
            self.server['db_password'], self.server['host'],
            self.server['port'], self.server['sslmode'])
        self.connection.autocommit = True
        self.server_version = self.connection.info.server_version

        cur = self.connection.cursor()
        for role in self.all_roles:
            cur.execute('CREATE ROLE "%s"' % role)
        # direct: ADMIN OPTION on the target itself.
        cur.execute('GRANT "%s" TO "%s" WITH ADMIN OPTION' %
                    (self.target, self.direct))
        # holder has ADMIN OPTION; inherited and noinherit are members of
        # holder, with and without INHERIT respectively.
        cur.execute('GRANT "%s" TO "%s" WITH ADMIN OPTION' %
                    (self.target, self.holder))
        cur.execute('GRANT "%s" TO "%s"' % (self.holder, self.inherited))
        if self.server_version >= 160000:
            cur.execute('GRANT "%s" TO "%s" WITH INHERIT FALSE' %
                        (self.holder, self.noinherit))
        else:
            cur.execute('ALTER ROLE "%s" NOINHERIT' % self.noinherit)
            cur.execute('GRANT "%s" TO "%s"' % (self.holder, self.noinherit))
        # member: plain membership of the target, no ADMIN OPTION.
        cur.execute('GRANT "%s" TO "%s"' % (self.target, self.member))
        cur.execute("SELECT oid FROM pg_catalog.pg_roles WHERE rolname = %s",
                    (self.target,))
        self.target_oid = cur.fetchone()[0]
        cur.close()

    def _has_admin_option(self, as_role):
        with self.app.app_context():
            sql = render_template(
                'roles/sql/#{0}#/permission.sql'.format(self.server_version),
                rid=self.target_oid, conn=None)
        cur = self.connection.cursor()
        try:
            cur.execute('SET ROLE "%s"' % as_role)
            cur.execute(sql)
            row = cur.fetchone()
            return row[3]
        finally:
            cur.execute('RESET ROLE')
            cur.close()

    def _server_allows_grant(self, as_role):
        cur = self.connection.cursor()
        try:
            cur.execute('SET ROLE "%s"' % as_role)
            try:
                cur.execute('GRANT "%s" TO "%s"' %
                            (self.target, self.newmember))
            except Exception:
                return False
            cur.execute('REVOKE "%s" FROM "%s"' %
                        (self.target, self.newmember))
            return True
        finally:
            cur.execute('RESET ROLE')
            cur.close()

    def runTest(self):
        noinherit_expected = self.server_version < 160000
        cases = [
            (self.direct, True),
            (self.inherited, True),
            (self.noinherit, noinherit_expected),
            (self.plain, False),
            (self.member, False),
        ]
        for role, expected in cases:
            self.assertEqual(
                self._has_admin_option(role), expected,
                'has_admin_option for %s' % role)
            self.assertEqual(
                self._server_allows_grant(role), expected,
                'server GRANT authorisation for %s' % role)

        # The properties response carries the flag for the dialog; the
        # test server user is a superuser, who always qualifies.
        response = self.tester.get(
            self.url + str(utils.SERVER_GROUP) + '/' +
            str(self.server_id) + '/' + str(self.target_oid),
            follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json['has_admin_option'])

    def tearDown(self):
        cur = self.connection.cursor()
        for role in self.all_roles:
            cur.execute('DROP ROLE IF EXISTS "%s"' % role)
        cur.close()
        self.connection.close()
