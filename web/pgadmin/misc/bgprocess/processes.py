# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""
Introduce a function to run the process executor in detached mode.
"""
from __future__ import print_function, unicode_literals

import csv
import os
import sys
from abc import ABCMeta, abstractproperty, abstractmethod
from datetime import datetime
from pickle import dumps, loads
from subprocess import Popen, PIPE

import pytz
from dateutil import parser
from flask import current_app as app
from flask_babel import gettext as _
from flask_security import current_user

import config
from pgadmin.model import Process, db

if sys.version_info < (3,):
    from StringIO import StringIO
else:
    from io import StringIO


def get_current_time(format='%Y-%m-%d %H:%M:%S.%f %z'):
    """
    Generate the current time string in the given format.
    """
    return datetime.utcnow().replace(
        tzinfo=pytz.utc
    ).strftime(format)


class IProcessDesc(object):
    __metaclass__ = ABCMeta

    @abstractproperty
    def message(self):
        pass

    @abstractmethod
    def details(self, cmd, args):
        pass


class BatchProcess(object):
    def __init__(self, **kwargs):

        self.id = self.desc = self.cmd = self.args = self.log_dir = \
            self.stdout = self.stderr = self.stime = self.etime = \
            self.ecode = None

        if 'id' in kwargs:
            self._retrieve_process(kwargs['id'])
        else:
            self._create_process(kwargs['desc'], kwargs['cmd'], kwargs['args'])

    def _retrieve_process(self, _id):
        p = Process.query.filter_by(pid=_id, user_id=current_user.id).first()

        if p is None:
            raise LookupError(
                _("Could not find a process with the specified ID.")
            )

        # ID
        self.id = _id
        # Description
        self.desc = loads(p.desc)
        # Status Acknowledged time
        self.atime = p.acknowledge
        # Command
        self.cmd = p.command
        # Arguments
        self.args = p.arguments
        # Log Directory
        self.log_dir = p.logdir
        # Standard ouput log file
        self.stdout = os.path.join(p.logdir, 'out')
        # Standard error log file
        self.stderr = os.path.join(p.logdir, 'err')
        # Start time
        self.stime = p.start_time
        # End time
        self.etime = p.end_time
        # Exit code
        self.ecode = p.exit_code

    def _create_process(self, _desc, _cmd, _args):
        ctime = get_current_time(format='%y%m%d%H%M%S%f')
        log_dir = os.path.join(
            config.SESSION_DB_PATH, 'process_logs'
        )

        def random_number(size):
            import random
            import string

            return ''.join(
                random.choice(
                    string.ascii_uppercase + string.digits
                ) for _ in range(size)
            )

        created = False
        size = 0
        id = ctime
        while not created:
            try:
                id += random_number(size)
                log_dir = os.path.join(log_dir, id)
                size += 1
                if not os.path.exists(log_dir):
                    os.makedirs(log_dir, int('700', 8))
                    created = True
            except OSError as oe:
                import errno
                if oe.errno != errno.EEXIST:
                    raise

        # ID
        self.id = ctime
        # Description
        self.desc = _desc
        # Status Acknowledged time
        self.atime = None
        # Command
        self.cmd = _cmd
        # Log Directory
        self.log_dir = log_dir
        # Standard ouput log file
        self.stdout = os.path.join(log_dir, 'out')
        # Standard error log file
        self.stderr = os.path.join(log_dir, 'err')
        # Start time
        self.stime = None
        # End time
        self.etime = None
        # Exit code
        self.ecode = None

        # Arguments
        args_csv_io = StringIO()
        csv_writer = csv.writer(
            args_csv_io, delimiter=str(','), quoting=csv.QUOTE_MINIMAL
        )
        csv_writer.writerow(_args)
        self.args = args_csv_io.getvalue().strip(str('\r\n'))

        j = Process(
            pid=int(id), command=_cmd, arguments=self.args, logdir=log_dir,
            desc=dumps(self.desc), user_id=current_user.id
        )
        db.session.add(j)
        db.session.commit()

    def start(self):
        if self.stime is not None:
            if self.etime is None:
                raise Exception(_('The process has already been started.'))
            raise Exception(
                _('The process has already finished and can not be restarted.')
            )

        executor = os.path.join(
            os.path.dirname(__file__), 'process_executor.py'
        )

        p = None
        cmd = [
            (sys.executable if not app.PGADMIN_RUNTIME else
             'pythonw.exe' if os.name == 'nt' else 'python'),
            executor,
            '-p', self.id,
            '-o', self.log_dir,
            '-d', config.SQLITE_PATH
        ]

        if os.name == 'nt':
            p = Popen(
                cmd, stdout=None, stderr=None, stdin=None, close_fds=True,
                shell=False, creationflags=0x00000008
            )
        else:
            def preexec_function():
                import signal
                # Detaching from the parent process group
                os.setpgrp()
                # Explicitly ignoring signals in the child process
                signal.signal(signal.SIGINT, signal.SIG_IGN)

            p = Popen(
                cmd, stdout=PIPE, stderr=None, stdin=None, close_fds=True,
                shell=False, preexec_fn=preexec_function
            )

        self.ecode = p.poll()
        if self.ecode is not None and self.ecode != 0:
            # TODO:// Find a way to read error from detached failed process

            # Couldn't start execution
            p = Process.query.filter_by(
                pid=self.id, user_id=current_user.id
            ).first()
            p.start_time = p.end_time = get_current_time()
            if not p.exit_code:
                p.exit_code = self.ecode
            db.session.commit()

    def status(self, out=0, err=0):
        import codecs
        ctime = get_current_time(format='%Y%m%d%H%M%S%f')

        stdout = []
        stderr = []
        out_completed = err_completed = False
        process_output = (out != -1 and err != -1)

        def read_log(logfile, log, pos, ctime, check=True):
            completed = True
            lines = 0

            if not os.path.isfile(logfile):
                return 0, False

            with codecs.open(logfile, 'r', 'utf-8') as stream:
                stream.seek(pos)
                for line in stream:
                    logtime = StringIO()
                    idx = 0
                    for c in line:
                        idx += 1
                        if c == ',':
                            break
                        logtime.write(c)
                    logtime = logtime.getvalue()

                    if check and logtime > ctime:
                        completed = False
                        break
                    if lines == 5120:
                        ctime = logtime
                        completed = False
                        break

                    lines += 1
                    log.append([logtime, line[idx:]])
                pos = stream.tell()

            return pos, completed

        if process_output:
            out, out_completed = read_log(
                self.stdout, stdout, out, ctime, True
            )
            err, err_completed = read_log(
                self.stderr, stderr, err, ctime, True
            )

        j = Process.query.filter_by(
            pid=self.id, user_id=current_user.id
        ).first()

        execution_time = None

        if j is not None:
            self.stime = j.start_time
            self.etime = j.end_time
            self.ecode = j.exit_code

            if self.stime is not None:
                stime = parser.parse(self.stime)
                etime = parser.parse(self.etime or get_current_time())

                execution_time = (etime - stime).total_seconds()

            if process_output and self.ecode is not None and (
                            len(stdout) + len(stderr) < 3073
            ):
                out, out_completed = read_log(
                    self.stdout, stdout, out, ctime, False
                )
                err, err_completed = read_log(
                    self.stderr, stderr, err, ctime, False
                )
        else:
            out_completed = err_completed = False

        if out == -1 or err == -1:
            return {
                'exit_code': self.ecode,
                'execution_time': execution_time
            }

        return {
            'out': {'pos': out, 'lines': stdout, 'done': out_completed},
            'err': {'pos': err, 'lines': stderr, 'done': err_completed},
            'exit_code': self.ecode,
            'execution_time': execution_time
        }

    @staticmethod
    def list():
        processes = Process.query.filter_by(user_id=current_user.id)

        res = []
        for p in processes:
            if p.start_time is None or p.acknowledge is not None:
                continue
            execution_time = None

            stime = parser.parse(p.start_time)
            etime = parser.parse(p.end_time or get_current_time())

            execution_time = (etime - stime).total_seconds()
            desc = loads(p.desc)
            details = desc

            if isinstance(desc, IProcessDesc):
                args = []
                args_csv = StringIO(p.arguments)
                args_reader = csv.reader(args_csv, delimiter=str(','))
                for arg in args_reader:
                    args = args + arg
                details = desc.details(p.command, args)
                desc = desc.message

            res.append({
                'id': p.pid,
                'desc': desc,
                'details': details,
                'stime': stime,
                'etime': p.end_time,
                'exit_code': p.exit_code,
                'acknowledge': p.acknowledge,
                'execution_time': execution_time
            })

        return res

    @staticmethod
    def acknowledge(_pid, _release):
        p = Process.query.filter_by(
            user_id=current_user.id, pid=_pid
        ).first()

        if p is None:
            raise LookupError(
                _("Could not find a process with the specified ID.")
            )

        if _release:
            import shutil
            shutil.rmtree(p.logdir, True)
            db.session.delete(p)
        else:
            p.acknowledge = get_current_time()

        db.session.commit()

    @staticmethod
    def release(pid=None):
        import shutil
        processes = None

        if pid is not None:
            processes = Process.query.filter_by(
                user_id=current_user.id, pid=pid
            )
        else:
            processes = Process.query.filter_by(
                user_id=current_user.id,
                acknowledge=None
            )

        if processes:
            for p in processes:
                shutil.rmtree(p.logdir, True)

                db.session.delete(p)
                db.session.commit()
