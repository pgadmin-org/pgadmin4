import os
import subprocess

import signal

import random

class AppStarter:
    """
    Helper for starting the full pgadmin4 app and loading the page via selenium
    """

    def __init__(self, driver, app_config):
        self.driver = driver
        self.app_config = app_config

    def start_app(self):
        random_server_port = str(random.randint(10000, 65535))
        env = {
            "PGADMIN_PORT": random_server_port,
            "SQLITE_PATH": self.app_config.TEST_SQLITE_PATH
               }
        env.update(os.environ)

        self.pgadmin_process = subprocess.Popen(["python", "pgAdmin4.py"],
                                                shell=False,
                                                preexec_fn=os.setsid,
                                                stderr=open(os.devnull, 'w'),
                                                env=env)

        self.driver.set_window_size(1024, 1024)
        print("opening browser")
        self.driver.get("http://" + self.app_config.DEFAULT_SERVER + ":" + random_server_port)

    def stop_app(self):
        self.driver.close()
        os.killpg(os.getpgid(self.pgadmin_process.pid), signal.SIGTERM)
