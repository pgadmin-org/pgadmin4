##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os
import subprocess
import signal
import random

import time

class AppStarter:
    """ Helper for starting the full pgadmin4 app and loading the page via
    selenium
    """

    def __init__(self, driver, app_config):
        self.driver = driver
        self.app_config = app_config

    def start_app(self):
        """ This function start the subprocess to start pgAdmin app """
        random_server_port = str(random.randint(10000, 65535))
        env = {
            "PGADMIN_PORT": random_server_port,
            "SQLITE_PATH": str(self.app_config.TEST_SQLITE_PATH)
        }
        env.update(os.environ)

        # Add OS check for pass value for 'preexec_fn'
        self.pgadmin_process = subprocess.Popen(
            ["python", "pgAdmin4.py"],
            shell=False,
            preexec_fn=None if os.name == 'nt' else os.setsid,
            stderr=open(os.devnull, 'w'),
            env=env
        )

        self.driver.set_window_size(1024, 1024)
        time.sleep(10)
        self.driver.get(
            "http://" + self.app_config.DEFAULT_SERVER + ":" +
            random_server_port)

    def stop_app(self):
        """ This function stop the started app by killing process """
        self.driver.quit()
        # os.killpg supported in Mac and Unix as this function not supported in
        # Windows
        try:
            os.killpg(os.getpgid(self.pgadmin_process.pid), signal.SIGTERM)
        except AttributeError:
            # os.kill is supported by Windows
            os.kill(self.pgadmin_process.pid, signal.SIGTERM)
