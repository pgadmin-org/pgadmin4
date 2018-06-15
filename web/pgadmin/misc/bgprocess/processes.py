# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""
Introduce a function to run the process executor in detached mode.
"""
import csv
import os
import sys
from abc import ABCMeta, abstractproperty, abstractmethod
from datetime import datetime
from pickle import dumps, loads
from subprocess import Popen

from pgadmin.utils import IS_PY2, u, file_quote, fs_encoding, \
    get_complete_file_path

import pytz
from dateutil import parser
from flask import current_app
from flask_babelex import gettext as _
from flask_security import current_user

import config
from pgadmin.model import Process, db
if IS_PY2:
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
        self.env = dict()

        if 'id' in kwargs:
            self._retrieve_process(kwargs['id'])
        else:
            self._create_process(
                kwargs['desc'], kwargs['cmd'], kwargs['args']
            )

    def _retrieve_process(self, _id):
        p = Process.query.filter_by(pid=_id, user_id=current_user.id).first()

        if p is None:
            raise LookupError(
                _("Could not find a process with the specified ID.")
            )

        try:
            tmp_desc = loads(p.desc.encode('latin-1')) if \
                IS_PY2 and hasattr(p.desc, 'encode') else loads(p.desc)
        except UnicodeDecodeError:
            tmp_desc = loads(p.desc.encode('utf-8')) if \
                IS_PY2 and hasattr(p.desc, 'encode') else loads(p.desc)
        except Exception as e:
            tmp_desc = loads(p.desc.encode('utf-8', 'ignore')) if \
                IS_PY2 and hasattr(p.desc, 'encode') else loads(p.desc)

        # ID
        self.id = _id
        # Description
        self.desc = tmp_desc
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
        self.args = _args
        args_csv_io = StringIO()
        csv_writer = csv.writer(
            args_csv_io, delimiter=str(','), quoting=csv.QUOTE_MINIMAL
        )
        if sys.version_info[0] == 2:
            csv_writer.writerow(
                [
                    a.encode('utf-8')
                    if isinstance(a, unicode) else a for a in _args
                ]
            )
        else:
            csv_writer.writerow(_args)

        args_val = args_csv_io.getvalue().strip(str('\r\n'))
        tmp_desc = dumps(self.desc)
        try:
            tmp_desc = tmp_desc.decode('utf-8') if \
                IS_PY2 and hasattr(tmp_desc, 'decode') else tmp_desc
        except UnicodeDecodeError:
            tmp_desc = tmp_desc.decode('latin-1') if \
                IS_PY2 and hasattr(tmp_desc, 'decode') else tmp_desc
        except Exception:
            tmp_desc = tmp_desc.decode('utf-8', 'ignore') if \
                IS_PY2 and hasattr(tmp_desc, 'decode') else tmp_desc

        j = Process(
            pid=int(id),
            command=_cmd,
            arguments=args_val.decode('utf-8', 'replace')
            if IS_PY2 and hasattr(args_val, 'decode') else args_val,
            logdir=log_dir,
            desc=tmp_desc,
            user_id=current_user.id
        )
        db.session.add(j)
        db.session.commit()

    def start(self, cb=None):

        def which(program, paths):
            def is_exe(fpath):
                return os.path.exists(fpath) and os.access(fpath, os.X_OK)

            for path in paths:
                if not os.path.isdir(path):
                    continue
                exe_file = os.path.join(u(path, fs_encoding), program)
                if is_exe(exe_file):
                    return file_quote(exe_file)
            return None

        def convert_environment_variables(env):
            """
            This function is use to convert environment variable to string
            because environment variable must be string in popen
            :param env: Dict of environment variable
            :return: Encoded environment variable as string
            """
            encoding = sys.getdefaultencoding()
            if encoding is None or encoding == 'ascii':
                encoding = 'utf-8'
            temp_env = dict()
            for key, value in env.items():
                if not isinstance(key, str):
                    key = key.encode(encoding)
                if not isinstance(value, str):
                    value = value.encode(encoding)
                temp_env[key] = value
            return temp_env

        if self.stime is not None:
            if self.etime is None:
                raise Exception(_('The process has already been started.'))
            raise Exception(
                _('The process has already finished and cannot be restarted.')
            )

        executor = file_quote(os.path.join(
            os.path.dirname(u(__file__)), u'process_executor.py'
        ))
        paths = os.environ['PATH'].split(os.pathsep)
        interpreter = None

        if os.name == 'nt':
            paths.insert(0, os.path.join(u(sys.prefix), u'Scripts'))
            paths.insert(0, u(sys.prefix))

            interpreter = which(u'pythonw.exe', paths)
            if interpreter is None:
                interpreter = which(u'python.exe', paths)

            if interpreter is None and current_app.PGADMIN_RUNTIME:
                # We've faced an issue with Windows 2008 R2 (x86) regarding,
                # not honouring the environment variables set under the Qt
                # (e.g. runtime), and also setting PYTHONHOME same as
                # sys.executable (i.e. pgAdmin4.exe).
                #
                # As we know, we're running it under the runtime, we can assume
                # that 'venv' directory will be available outside of 'bin'
                # directory.
                #
                # We would try out luck to find python executable based on that
                # assumptions.
                bin_path = os.path.dirname(sys.executable)

                venv = os.path.realpath(
                    os.path.join(bin_path, u'..\\venv')
                )

                interpreter = which(u'pythonw.exe', [venv])
                if interpreter is None:
                    interpreter = which(u'pythonw.exe', [venv])

                if interpreter is not None:
                    # Our assumptions are proven right.
                    # Let's append the 'bin' directory to the PATH environment
                    # variable. And, also set PYTHONHOME environment variable
                    # to 'venv' directory.
                    os.environ['PATH'] = bin_path + ';' + os.environ['PATH']
                    os.environ['PYTHONHOME'] = venv
        else:
            # Let's not use sys.prefix in runtime.
            # 'sys.prefix' is not identified on *nix systems for some unknown
            # reason, while running under the runtime.
            # We're already adding '<installation path>/pgAdmin 4/venv/bin'
            # directory in the PATH environment variable. Hence - it will
            # anyway be the redundant value in paths.
            if not current_app.PGADMIN_RUNTIME:
                paths.insert(0, os.path.join(u(sys.prefix), u'bin'))
            interpreter = which(u'python', paths)

        p = None
        cmd = [
            interpreter if interpreter is not None else 'python',
            executor, self.cmd
        ]
        cmd.extend(self.args)

        if os.name == 'nt' and IS_PY2:
            command = []
            for c in cmd:
                command.append(
                    c.encode('utf-8') if isinstance(c, unicode) else str(c)
                )

            current_app.logger.info(
                u"Executing the process executor with the arguments: %s",
                ''.join(command)
            )

            cmd = command
        else:
            current_app.logger.info(
                u"Executing the process executor with the arguments: %s",
                str(cmd)
            )

        # Make a copy of environment, and add new variables to support
        env = os.environ.copy()
        env['PROCID'] = self.id
        env['OUTDIR'] = self.log_dir
        env['PGA_BGP_FOREGROUND'] = "1"

        if self.env:
            env.update(self.env)

        if cb is not None:
            cb(env)

        if IS_PY2:
            # We need environment variables & values in string
            env = convert_environment_variables(env)

        if os.name == 'nt':
            DETACHED_PROCESS = 0x00000008
            from subprocess import CREATE_NEW_PROCESS_GROUP

            # We need to redirect the standard input, standard output, and
            # standard error to devnull in order to allow it start in detached
            # mode on
            stdout = os.devnull
            stderr = stdout
            stdin = open(os.devnull, "r")
            stdout = open(stdout, "a")
            stderr = open(stderr, "a")

            p = Popen(
                cmd,
                close_fds=False,
                env=env,
                stdout=stdout.fileno(),
                stderr=stderr.fileno(),
                stdin=stdin.fileno(),
                creationflags=(CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS)
            )
        else:
            def preexec_function():
                import signal
                # Detaching from the parent process group
                os.setpgrp()
                # Explicitly ignoring signals in the child process
                signal.signal(signal.SIGINT, signal.SIG_IGN)

            p = Popen(
                cmd, close_fds=True, stdout=None, stderr=None, stdin=None,
                preexec_fn=preexec_function, env=env
            )

        self.ecode = p.poll()

        # Execution completed immediately.
        # Process executor cannot update the status, if it was not able to
        # start properly.
        if self.ecode is not None and self.ecode != 0:
            # There is no way to find out the error message from this process
            # as standard output, and standard error were redirected to
            # devnull.
            p = Process.query.filter_by(
                pid=self.id, user_id=current_user.id
            ).first()
            p.start_time = p.end_time = get_current_time()
            if not p.exit_code:
                p.exit_code = self.ecode
            db.session.commit()

    def status(self, out=0, err=0):
        import re

        ctime = get_current_time(format='%Y%m%d%H%M%S%f')

        stdout = []
        stderr = []
        out_completed = err_completed = False
        process_output = (out != -1 and err != -1)
        enc = sys.getdefaultencoding()
        if enc is None or enc == 'ascii':
            enc = 'utf-8'

        def read_log(logfile, log, pos, ctime, ecode=None):
            completed = True
            idx = 0
            c = re.compile(r"(\d+),(.*$)")

            if not os.path.isfile(logfile):
                return 0, False

            with open(logfile, 'rb') as f:
                eofs = os.fstat(f.fileno()).st_size
                f.seek(pos, 0)
                if pos == eofs and ecode is None:
                    completed = False

                while pos < eofs:
                    idx += 1
                    line = f.readline()
                    line = line.decode(enc, 'replace')
                    r = c.split(line)
                    if len(r) < 3:
                        # ignore this line
                        pos = f.tell()
                        continue
                    if r[1] > ctime:
                        completed = False
                        break
                    log.append([r[1], r[2]])
                    pos = f.tell()
                    if idx >= 1024:
                        completed = False
                        break
                    if pos == eofs:
                        if ecode is None:
                            completed = False
                        break

            return pos, completed

        j = Process.query.filter_by(
            pid=self.id, user_id=current_user.id
        ).first()

        execution_time = None

        if j is not None:
            status, updated = BatchProcess.update_process_info(j)
            if updated:
                db.session.commit()
            self.stime = j.start_time
            self.etime = j.end_time
            self.ecode = j.exit_code

            if self.stime is not None:
                stime = parser.parse(self.stime)
                etime = parser.parse(self.etime or get_current_time())

                execution_time = BatchProcess.total_seconds(etime - stime)

            if process_output:
                out, out_completed = read_log(
                    self.stdout, stdout, out, ctime, self.ecode
                )
                err, err_completed = read_log(
                    self.stderr, stderr, err, ctime, self.ecode
                )
        else:
            out_completed = err_completed = False

        if out == -1 or err == -1:
            return {
                'start_time': self.stime,
                'exit_code': self.ecode,
                'execution_time': execution_time
            }

        return {
            'out': {
                'pos': out,
                'lines': stdout,
                'done': out_completed
            },
            'err': {
                'pos': err,
                'lines': stderr,
                'done': err_completed
            },
            'start_time': self.stime,
            'exit_code': self.ecode,
            'execution_time': execution_time
        }

    @staticmethod
    def update_process_info(p):
        if p.start_time is None or p.end_time is None:
            status = os.path.join(p.logdir, 'status')
            if not os.path.isfile(status):
                return False, False

            with open(status, 'r') as fp:
                import json
                try:
                    data = json.load(fp)

                    #  First - check for the existance of 'start_time'.
                    if 'start_time' in data and data['start_time']:
                        p.start_time = data['start_time']

                        # We can't have 'exit_code' without the 'start_time'
                        if 'exit_code' in data and \
                                data['exit_code'] is not None:
                            p.exit_code = data['exit_code']

                            # We can't have 'end_time' without the 'exit_code'.
                            if 'end_time' in data and data['end_time']:
                                p.end_time = data['end_time']

                    return True, True

                except ValueError as e:
                    current_app.logger.warning(
                        _("Status for the background process '{0}' could "
                          "not be loaded.").format(p.pid)
                    )
                    current_app.logger.exception(e)
                    return False, False
        return True, False

    @staticmethod
    def list():
        processes = Process.query.filter_by(user_id=current_user.id)
        changed = False

        res = []
        for p in processes:
            status, updated = BatchProcess.update_process_info(p)
            if not status:
                continue

            if not changed:
                changed = updated

            if p.start_time is None or (
                p.acknowledge is not None and p.end_time is None
            ):
                continue

            execution_time = None

            stime = parser.parse(p.start_time)
            etime = parser.parse(p.end_time or get_current_time())

            execution_time = BatchProcess.total_seconds(etime - stime)
            desc = ""
            try:
                desc = loads(p.desc.encode('latin-1')) if \
                    IS_PY2 and hasattr(p.desc, 'encode') else loads(p.desc)
            except UnicodeDecodeError:
                desc = loads(p.desc.encode('utf-8')) if \
                    IS_PY2 and hasattr(p.desc, 'encode') else loads(p.desc)
            except Exception:
                desc = loads(p.desc.encode('utf-8', 'ignore')) if \
                    IS_PY2 and hasattr(p.desc, 'encode') else loads(p.desc)

            details = desc

            if isinstance(desc, IProcessDesc):
                args = []
                args_csv = StringIO(
                    p.arguments.encode('utf-8')
                    if hasattr(p.arguments, 'decode') else p.arguments
                )
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

        if changed:
            db.session.commit()

        return res

    @staticmethod
    def total_seconds(dt):
        # Keep backward compatibility with Python 2.6 which doesn't have
        # this method
        if hasattr(dt, 'total_seconds'):
            return dt.total_seconds()
        else:
            return (dt.microseconds + (dt.seconds + dt.days * 24 * 3600) *
                    10**6) / 10**6

    @staticmethod
    def acknowledge(_pid):
        """
        Acknowledge from the user, he/she has alredy watched the status.

        Update the acknowledgement status, if the process is still running.
        And, delete the process information from the configuration, and the log
        files related to the process, if it has already been completed.
        """
        p = Process.query.filter_by(
            user_id=current_user.id, pid=_pid
        ).first()

        if p is None:
            raise LookupError(
                _("Could not find a process with the specified ID.")
            )

        if p.end_time is not None:
            logdir = p.logdir
            db.session.delete(p)
            import shutil
            shutil.rmtree(logdir, True)
        else:
            p.acknowledge = get_current_time()

        db.session.commit()

    def set_env_variables(self, server, **kwargs):
        """Set environment variables"""
        if server:
            # Set SSL related ENV variables
            if server.sslcert and server.sslkey and server.sslrootcert:
                # SSL environment variables
                self.env['PGSSLMODE'] = server.ssl_mode
                self.env['PGSSLCERT'] = get_complete_file_path(server.sslcert)
                self.env['PGSSLKEY'] = get_complete_file_path(server.sslkey)
                self.env['PGSSLROOTCERT'] = get_complete_file_path(
                    server.sslrootcert
                )

            # Set service name related ENV variable
            if server.service:
                self.env['PGSERVICE'] = server.service

        if 'env' in kwargs:
            self.env.update(kwargs['env'])
