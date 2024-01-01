##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import os
import subprocess
import signal
import secrets

import time
from selenium.common.exceptions import WebDriverException


class AppStarter:
    """ Helper for starting the full pgadmin4 app and loading the page via
    selenium
    """

    def __init__(self, driver, app_config):
        self.driver = driver
        self.app_config = app_config

    def start_app(self):
        """ This function start the subprocess to start pgAdmin app """
        random_server_port = str(secrets.choice(range(10000, 65535)))
        env = {
            "PGADMIN_INT_PORT": random_server_port,
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

        def launch_browser(retry_count):
            try:
                self.driver.get(
                    "http://" + self.app_config.DEFAULT_SERVER + ":" +
                    random_server_port
                )

            except WebDriverException:
                # In case of WebDriverException sleep for 1 second and retry
                # again. Retry 10 times and if still app will not start then
                # raise exception.
                time.sleep(1)
                if retry_count < 60:
                    retry_count = retry_count + 1
                    launch_browser(retry_count)
                else:
                    raise RuntimeError('Unable to start python server even '
                                       'after retrying 60 times.')

        if self.driver is not None:
            launch_browser(0)
        else:
            return "http://" + self.app_config.DEFAULT_SERVER + ":" \
                   + random_server_port

    def stop_app(self):
        """ This function stop the started app by killing process """
        if self.driver is not None:
            self.driver.quit()
        # os.killpg supported in Mac and Unix as this function not supported in
        # Windows
        try:
            os.killpg(os.getpgid(self.pgadmin_process.pid), signal.SIGTERM)
        except AttributeError:
            # os.kill is supported by Windows
            os.kill(self.pgadmin_process.pid, signal.SIGTERM)
