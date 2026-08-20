##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Tests for the get_ctypes.sql templates (#9798).

The query feeding the collation and character type fields of the Database
dialog has to report the locale the database actually uses, which depends on
its locale provider: datcollate and datctype for libc, and datlocale for both
ICU and the builtin provider introduced in PostgreSQL 17. A builtin database
still carries the collation it inherited from its template, so reading
datcollate for it reports a locale that is not in use.

The query is executed here through the versioned template loader, so the test
also covers the server version picking the right template bucket.
"""

import uuid

from flask import render_template

from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils

DEFAULTS = ('C', 'POSIX')


class GetCtypesTestCase(BaseTestGenerator):
    """get_ctypes.sql must report the locale in use, per locale provider."""

    scenarios = [
        ('libc reports the collation', dict(
            provider='libc', swapped=False)),
        ('libc reports the character type', dict(
            provider='libc', swapped=True)),
        ('The builtin provider reports its own locale', dict(
            provider='builtin', swapped=False)),
        ('ICU reports the ICU locale', dict(
            provider='icu', swapped=False)),
    ]

    def setUp(self):
        # No pgAdmin server registration needed: this exercises the SQL, so
        # it talks to the server directly.
        self.db_name = None
        self.connection = self._connect('postgres')
        cursor = self.connection.cursor()
        cursor.execute("SELECT current_setting('server_version_num')::int")
        self.server_version = cursor.fetchone()[0]
        cursor.execute("SELECT datcollate, pg_encoding_to_char(encoding) "
                       "FROM pg_catalog.pg_database WHERE datname = "
                       "'template0'")
        self.template_collate, self.template_encoding = cursor.fetchone()

    def _connect(self, db_name):
        return utils.get_db_connection(db_name,
                                       self.server['username'],
                                       self.server['db_password'],
                                       self.server['host'],
                                       self.server['port'],
                                       self.server['sslmode'])

    def _create_database(self, options):
        self.db_name = 'test_ctypes_%s' % str(uuid.uuid4())[1:8]
        old_isolation_level = self.connection.isolation_level
        utils.set_isolation_level(self.connection, 0)
        cursor = self.connection.cursor()
        cursor.execute('CREATE DATABASE "%s" TEMPLATE template0 %s' % (
            self.db_name, options))
        utils.set_isolation_level(self.connection, old_isolation_level)
        self.connection.commit()

    def _reported_locales(self):
        """Run the versioned get_ctypes.sql against the new database."""
        template_path = 'databases/sql/#{0}#'.format(self.server_version)
        with self.app.app_context():
            sql = render_template("/".join([template_path, 'get_ctypes.sql']))

        connection = self._connect(self.db_name)
        try:
            cursor = connection.cursor()
            cursor.execute(sql)
            return [row[0] for row in cursor.fetchall()]
        finally:
            connection.close()

    def _skip_unless_distinct_template_locale(self):
        if self.template_collate in DEFAULTS:
            self.skipTest(
                "template0 uses the '%s' locale, so a database with a "
                "collation distinguishable from the defaults cannot be "
                "created here." % self.template_collate)

    def runTest(self):
        if self.provider == 'libc':
            self._skip_unless_distinct_template_locale()
            # Set exactly one of the two to the template locale, so that the
            # value proves which of datcollate and datctype was reported.
            collate, ctype = ('C', self.template_collate) if self.swapped \
                else (self.template_collate, 'C')
            self._create_database(
                "LC_COLLATE '%s' LC_CTYPE '%s'" % (collate, ctype))
            self.assertIn(self.template_collate, self._reported_locales())
            return

        if self.provider == 'builtin':
            if self.server_version < 170000:
                self.skipTest('The builtin locale provider requires '
                              'PostgreSQL 17 or later.')
            if self.template_encoding != 'UTF8':
                self.skipTest("template0 is %s encoded, so a UTF-8 builtin "
                              "locale cannot be used here."
                              % self.template_encoding)
            if self.template_collate == 'C.UTF-8':
                self.skipTest("template0 already uses the 'C.UTF-8' locale, "
                              "the only one a UTF-8 builtin database can "
                              "use, so a distinguishable one cannot be "
                              "created here.")
            self._skip_unless_distinct_template_locale()
            self._create_database("LOCALE_PROVIDER builtin "
                                  "BUILTIN_LOCALE 'C.UTF-8' ENCODING UTF8")

            reported = self._reported_locales()
            self.assertIn('C.UTF-8', reported)
            # datcollate is inherited from the template and is not the locale
            # this database collates with, so it must not be offered.
            self.assertNotIn(self.template_collate, reported)
            return

        # ICU
        if self.server_version < 150000:
            self.skipTest('LOCALE_PROVIDER icu requires PostgreSQL 15 or '
                          'later.')
        cursor = self.connection.cursor()
        cursor.execute("SELECT 1 FROM pg_catalog.pg_collation "
                       "WHERE collprovider = 'i' LIMIT 1")
        if cursor.fetchone() is None:
            self.skipTest('This server was built without ICU support.')
        self._create_database(
            "LOCALE_PROVIDER icu ICU_LOCALE 'en-GB' LC_COLLATE '%s' "
            "LC_CTYPE '%s'" % (self.template_collate, self.template_collate))
        self.assertIn('en-GB', self._reported_locales())

    def tearDown(self):
        if self.db_name:
            utils.drop_database(self.connection, self.db_name)
        self.connection.close()
