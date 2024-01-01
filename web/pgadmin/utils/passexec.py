##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################
import logging
import subprocess
from datetime import datetime, timedelta, timezone
from threading import Lock

from flask import current_app

import config


class PasswordExec:

    lock = Lock()

    def __init__(self, cmd, expiration_seconds=None, timeout=60):
        self.cmd = str(cmd)
        self.expiration_seconds = int(expiration_seconds) \
            if expiration_seconds is not None else None
        self.timeout = int(timeout)
        self.password = None
        self.last_result = None

    def get(self):
        if config.SERVER_MODE:
            # Arbitrary shell execution on server is a security risk
            raise NotImplementedError('Passexec not available in server mode')
        with self.lock:
            if not self.password or self.is_expired():
                if not self.cmd:
                    return None
                current_app.logger.info('Calling passexec')
                now = datetime.now(timezone.utc)
                try:
                    p = subprocess.run(
                        self.cmd,
                        shell=True,
                        timeout=self.timeout,
                        capture_output=True,
                        text=True,
                        check=True,
                    )
                except subprocess.CalledProcessError as e:
                    if e.stderr:
                        self.create_logger().error(e.stderr)
                    raise

                current_app.logger.info('Passexec completed successfully')
                self.last_result = now
                self.password = p.stdout.strip()
            return self.password

    def is_expired(self):
        if self.expiration_seconds is None:
            return False
        return self.last_result is not None and\
            datetime.now(timezone.utc) - self.last_result \
            >= timedelta(seconds=self.expiration_seconds)

    def create_logger(self):
        logger = logging.getLogger('passexec')
        for h in current_app.logger.handlers:
            logger.addHandler(h)
        return logger
