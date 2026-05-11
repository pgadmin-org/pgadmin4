##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
import os
import json
import subprocess
import sys
import tempfile
import config


class ImportExportServersTestCase(BaseTestGenerator):
    """
    This class validates the import/export servers functionality
    """

    scenarios = [
        # Fetching the default url for server group node
        ('Check Server Import/Export', dict())
    ]

    def runTest(self):

        if config.SERVER_MODE is True:
            self.skipTest(
                "Can not run import-export of servers in the SERVER mode."
            )

        path = os.path.dirname(__file__)
        setup = os.path.realpath(os.path.join(path, "../../../setup.py"))

        # Use sys.executable instead of bare "python" — macOS / many Linux
        # distros do not provide a "python" alias, only "python3" or a venv-
        # specific binary. Use subprocess.run with a list so there is no
        # shell quoting and no command injection surface.  Surface the
        # subprocess error directly instead of letting a silent failure
        # produce an empty file that downstream json.loads then misreports
        # as "Expecting value: line 1 column 1".
        load_result = subprocess.run(
            [sys.executable, setup, "load-servers",
             os.path.join(path, "servers.json")],
            capture_output=True,
            text=True,
            check=False,
        )
        if load_result.returncode != 0:
            self.fail(
                "load-servers exited {0}: {1}".format(
                    load_result.returncode, load_result.stderr))

        # And dump them again
        tf = tempfile.NamedTemporaryFile(delete=False)
        dump_result = subprocess.run(
            [sys.executable, setup, "dump-servers", tf.name],
            capture_output=True,
            text=True,
            check=False,
        )
        if dump_result.returncode != 0:
            self.fail(
                "dump-servers exited {0}: {1}".format(
                    dump_result.returncode, dump_result.stderr))

        # Compare the JSON files, ignoring servers that exist in our
        # generated file but not the test config (they are likely
        # auto-discovered)
        src = json.loads(open(os.path.join(path, "servers.json")).read())
        tgt = json.loads(open(tf.name).read())

        for server in src["Servers"]:
            a = json.dumps(src["Servers"][server], sort_keys=True)
            b = json.dumps(tgt["Servers"][server], sort_keys=True)
            self.assertTrue(a, b)
