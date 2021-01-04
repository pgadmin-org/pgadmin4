##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
import os
import json
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

        # Load the servers
        os.system(
            "python \"%s\" --load-servers \"%s\" 2> %s" %
            (setup, os.path.join(path, "servers.json"), os.devnull)
        )

        # And dump them again
        tf = tempfile.NamedTemporaryFile(delete=False)
        os.system("python \"%s\" --dump-servers \"%s\" 2> %s" %
                  (setup, tf.name, os.devnull))

        # Compare the JSON files, ignoring servers that exist in our
        # generated file but not the test config (they are likely
        # auto-discovered)
        src = json.loads(open(os.path.join(path, "servers.json")).read())
        tgt = json.loads(open(tf.name).read())

        for server in src["Servers"]:
            a = json.dumps(src["Servers"][server], sort_keys=True)
            b = json.dumps(tgt["Servers"][server], sort_keys=True)
            self.assertTrue(a, b)
