##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import re
from logging import handlers


class EnhancedRotatingFileHandler(handlers.TimedRotatingFileHandler,
                                  handlers.RotatingFileHandler):
    """
    Handler for logging to a set of files, which switches from one file
    to the next when the current file reaches a certain size, or at certain
    timed intervals
    @filename - log file name
    @max_bytes - file size in bytes to rotate  file
    @interval - Duration to rotate file
    @backup_count - Maximum number of files to retain
    @encoding - file encoding
    @when -  'when' events supported:
            # S - Seconds
            # M - Minutes
            # H - Hours
            # D - Days
            # midnight - roll over at midnight
            # W{0-6} - roll over on a certain day; 0 - Monday
    Here we are defaulting rotation with minutes interval
    """
    def __init__(self, filename, max_bytes=1, interval=60, backup_count=0,
                 encoding=None, when='M'):
        max_bytes = max_bytes * 1024 * 1024
        handlers.TimedRotatingFileHandler.__init__(self, filename=filename,
                                                   when=when,
                                                   interval=interval,
                                                   backupCount=backup_count,
                                                   encoding=encoding)

        handlers.RotatingFileHandler.__init__(self, filename=filename,
                                              mode='a',
                                              maxBytes=max_bytes,
                                              backupCount=backup_count,
                                              encoding=encoding)

    # Create new log files with mode 0o600 so they are not world/group
    # readable. Pre-existing files keep their permissions; the parent
    # DATA_DIR is already 0o700 on POSIX, so this is defense-in-depth.
    # On Windows the mode arg to os.open is ignored — fall back to the
    # default behavior there. O_CLOEXEC matches built-in open()'s default
    # non-inheritable fd behavior (PEP 446); os.open does not set it
    # otherwise.
    def _open(self):
        if os.name == 'nt':
            return super()._open()
        flags = os.O_WRONLY | os.O_CREAT | os.O_CLOEXEC | (
            os.O_APPEND if self.mode == 'a' else os.O_TRUNC)
        fd = os.open(self.baseFilename, flags, 0o600)
        try:
            return os.fdopen(fd, self.mode, encoding=self.encoding,
                             errors=getattr(self, 'errors', None))
        except Exception:
            os.close(fd)
            raise

    # Time & Size combined rollover
    def shouldRollover(self, record):
        return handlers.TimedRotatingFileHandler.shouldRollover(self, record) \
            or handlers.RotatingFileHandler.shouldRollover(self, record)

    # Roll overs current file
    def doRollover(self):
        self.suffix = "%Y-%m-%d_%H-%M-%S"
        self.extMatch = r"^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(\.\w+)?$"
        self.extMatch = re.compile(self.extMatch, re.ASCII)
        handlers.TimedRotatingFileHandler.doRollover(self)
