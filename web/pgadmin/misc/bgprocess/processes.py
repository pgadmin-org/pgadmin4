# -*- coding: utf-8 -*-
##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL License
#
##########################################################################

"""
Introduce a function to run the process executor in detached mode.
"""
import csv
import os
import sys
import psutil
from abc import ABCMeta, abstractmethod
from datetime import datetime, timedelta, timezone
from pickle import dumps, loads
from subprocess import Popen, PIPE
import logging
import json
import shutil

from pgadmin.utils import u_encode, file_quote, fs_encoding, \
    get_complete_file_path, get_storage_directory, IS_WIN
from pgadmin.utils.constants import KERBEROS
from pgadmin.utils.locker import ConnectionLocker
from pgadmin.utils.preferences import Preferences

from dateutil import parser
from flask import current_app, session
from flask_babel import gettext as _
from flask_security import current_user

import config
from pgadmin.model import Process, db
from io import StringIO

PROCESS_NOT_STARTED = 0
PROCESS_STARTED = 1
PROCESS_FINISHED = 2
PROCESS_TERMINATED = 3
PROCESS_NOT_FOUND = _("Could not find a process with the specified ID.")


def get_current_time(format='%Y-%m-%d %H:%M:%S.%f %z'):
    """
    Generate the current time string in the given format.
    """
    return datetime.now(timezone.utc).strftime(format)


class IProcessDesc(metaclass=ABCMeta):
    @property
    @abstractmethod
    def message(self):
        pass

    @abstractmethod
    def details(self, cmd, args):
        pass

    @property
    def current_storage_dir(self):

        if config.SERVER_MODE:

            process_file = self.bfile
            try:
                # check if file name is encoded with UTF-8
                process_file = self.bfile.decode('utf-8')
            except Exception:
                # do nothing if bfile is not encoded.
                pass

            path = get_complete_file_path(process_file)
            path = process_file if path is None else path

            if IS_WIN:
                path = os.path.realpath(path)

            storage_directory = os.path.basename(get_storage_directory())

            if storage_directory in path:
                start = path.index(storage_directory)
                end = start + (len(storage_directory))
                last_dir = os.path.dirname(path[end:])
            else:
                last_dir = process_file

            last_dir = replace_path_for_win(last_dir)

            return None if hasattr(self, 'is_import') and self.is_import \
                else last_dir

        return None


def replace_path_for_win(last_dir=None):
    if IS_WIN:
        if '\\' in last_dir and len(last_dir) == 1:
            last_dir = last_dir.replace('\\', '\\\\')
        else:
            last_dir = last_dir.replace('\\', '/')

    return last_dir


class BatchProcess:
    def __init__(self, **kwargs):

        self.id = self.desc = self.cmd = self.args = self.log_dir = \
            self.stdout = self.stderr = self.stime = self.etime = \
            self.ecode = self.manager_obj = None
        self.env = dict()

        if 'id' in kwargs:
            self._retrieve_process(kwargs['id'])
        else:
            _cmd = kwargs['cmd']
            # Get system's interpreter
            if kwargs['cmd'] == 'python':
                _cmd = self._get_python_interpreter()

            self._create_process(
                kwargs['desc'], _cmd, kwargs['args']
            )

        if 'manager_obj' in kwargs:
            self.manager_obj = kwargs['manager_obj']

    def _retrieve_process(self, _id):
        p = Process.query.filter_by(pid=_id, user_id=current_user.id).first()

        if p is None:
            raise LookupError(PROCESS_NOT_FOUND)

        try:
            tmp_desc = loads(bytes.fromhex(p.desc))
        except Exception:
            tmp_desc = loads(p.desc)

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
        # Process State
        self.process_state = p.process_state

    def _create_process(self, _desc, _cmd, _args):
        ctime = get_current_time(format='%y%m%d%H%M%S%f')
        log_dir = os.path.join(
            config.SESSION_DB_PATH, 'process_logs'
        )

        def random_number(size):
            import secrets
            import string

            return ''.join(
                secrets.choice(
                    string.ascii_uppercase + string.digits
                ) for _ in range(size)
            )

        created = False
        size = 0
        uid = ctime
        while not created:
            try:
                uid += random_number(size)
                log_dir = os.path.join(log_dir, uid)
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
        # Process State
        self.process_state = PROCESS_NOT_STARTED

        # Arguments
        self.args = _args
        args_csv_io = StringIO()
        csv_writer = csv.writer(
            args_csv_io, delimiter=str(','), quoting=csv.QUOTE_MINIMAL
        )
        csv_writer.writerow(_args)

        args_val = args_csv_io.getvalue().strip(str('\r\n'))
        tmp_desc = dumps(self.desc).hex()

        j = Process(
            pid=int(uid),
            command=_cmd,
            arguments=args_val,
            logdir=log_dir,
            desc=tmp_desc,
            user_id=current_user.id
        )
        db.session.add(j)
        db.session.commit()

    def check_start_end_time(self):
        """
        Check start and end time to check process is still executing or not.
        :return:
        """
        if self.stime is not None:
            if self.etime is None:
                raise RuntimeError(_('The process has already been started.'))
            raise RuntimeError(
                _('The process has already finished and cannot be restarted.')
            )

    def _get_python_interpreter(self):
        """Get Python Interpreter"""
        if os.name == 'nt':
            paths = os.environ['PATH'].split(os.pathsep)

            current_app.logger.info(
                "Process Executor: Operating System Path %s",
                str(paths)
            )

            interpreter = self.get_windows_interpreter(paths)
        else:
            interpreter = sys.executable
            if interpreter.endswith('uwsgi'):
                interpreter = interpreter.split('uwsgi',
                                                maxsplit=1)[0] + 'python'

        return interpreter if interpreter else 'python'

    def start(self, cb=None):
        self.check_start_end_time()

        executor = file_quote(os.path.join(
            os.path.dirname(u_encode(__file__)), 'process_executor.py'
        ))

        interpreter = self._get_python_interpreter()

        cmd = [interpreter, executor, self.cmd]
        cmd.extend(self.args)

        current_app.logger.info(
            "Executing the process executor with the arguments: %s",
            str(cmd)
        )

        # Acquiring lock while copying the environment from the parent process
        # for the child process
        with ConnectionLocker(_is_kerberos_conn=False):
            # Make a copy of environment, and add new variables to support
            env = os.environ.copy()

        env['PROCID'] = self.id
        env['OUTDIR'] = self.log_dir
        env['PGA_BGP_FOREGROUND'] = "1"
        if config.SERVER_MODE and session and \
                session['auth_source_manager']['current_source'] == \
                KERBEROS and 'KRB5CCNAME' in session:
            env['KRB5CCNAME'] = session['KRB5CCNAME']

        if self.env:
            env.update(self.env)

        current_app.logger.debug(self.env)

        if cb is not None:
            cb(env)
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
            # if in debug mode, wait for process to complete and
            # get the stdout and stderr of popen.
            if config.CONSOLE_LOG_LEVEL <= logging.DEBUG:
                p = self.get_process_output(cmd, env)
            else:
                p = Popen(
                    cmd, close_fds=True, stdout=None, stderr=None, stdin=None,
                    start_new_session=True, env=env
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
            p.process_state = PROCESS_FINISHED
            db.session.commit()
        else:
            # Update the process state to "Started"
            p = Process.query.filter_by(
                pid=self.id, user_id=current_user.id
            ).first()
            p.process_state = PROCESS_STARTED
            db.session.commit()

    def get_process_output(self, cmd, env):
        """
        :param cmd:
        :param env:
        :return:
        """
        p = Popen(
            cmd, close_fds=True, stdout=PIPE, stderr=PIPE, stdin=None,
            start_new_session=True, env=env
        )

        output, errors = p.communicate()
        output = output.decode() \
            if hasattr(output, 'decode') else output
        errors = errors.decode() \
            if hasattr(errors, 'decode') else errors
        current_app.logger.debug(
            'Process Watcher Out:{0}'.format(output))
        current_app.logger.debug(
            'Process Watcher Err:{0}'.format(errors))

        return p

    def preexec_function(self):
        import signal
        # Detaching from the parent process group
        os.setpgrp()
        # Explicitly ignoring signals in the child process
        signal.signal(signal.SIGINT, signal.SIG_IGN)

    def get_windows_interpreter(self, paths):
        """
        Get interpreter.
        :param paths:
        :return:
        """
        paths.insert(0, os.path.join(u_encode(sys.prefix), 'Scripts'))
        paths.insert(0, u_encode(sys.prefix))

        interpreter = self.which('pythonw.exe', paths)
        if interpreter is None:
            interpreter = self.which('python.exe', paths)

        current_app.logger.info(
            "Process Executor: Interpreter value in path: %s",
            str(interpreter)
        )
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
                os.path.join(bin_path, '..\\venv')
            )

            interpreter = self.which('pythonw.exe', [venv])
            if interpreter is None:
                interpreter = self.which('python.exe', [venv])

            current_app.logger.info(
                "Process Executor: Interpreter value in virtual "
                "environment: %s", str(interpreter)
            )

            if interpreter is not None:
                # Our assumptions are proven right.
                # Let's append the 'bin' directory to the PATH environment
                # variable. And, also set PYTHONHOME environment variable
                # to 'venv' directory.
                os.environ['PATH'] = bin_path + ';' + os.environ['PATH']
                os.environ['PYTHONHOME'] = venv

        return interpreter

    def which(self, program, paths):
        def is_exe(fpath):
            return os.path.exists(fpath) and os.access(fpath, os.X_OK)

        for path in paths:
            if not os.path.isdir(path):
                continue
            exe_file = os.path.join(u_encode(path, fs_encoding), program)
            if is_exe(exe_file):
                return file_quote(exe_file)
        return None

    def read_log(self, logfile, log, pos, ctime, ecode=None, enc='utf-8'):
        import re
        completed = True
        idx = 0
        c = re.compile(r"(\d+),(.*$)")

        # If file is not present then
        if not os.path.isfile(logfile):
            return 0, True

        with open(logfile, 'rb') as f:
            eofs = os.path.getsize(logfile)
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

    def update_cloud_details(self):
        """
        Parse the output to get the cloud instance details
        """
        _pid = self.id

        _process = Process.query.filter_by(
            user_id=current_user.id, pid=_pid
        ).first()

        if _process is None:
            raise LookupError(PROCESS_NOT_FOUND)

        ctime = get_current_time(format='%y%m%d%H%M%S%f')
        stdout = []
        stderr = []
        out = 0
        err = 0
        cloud_server_id = 0
        cloud_instance = ''

        enc = sys.getdefaultencoding()
        if enc == 'ascii':
            enc = 'utf-8'

        out, out_completed = self.read_log(
            self.stdout, stdout, out, ctime, _process.exit_code, enc
        )
        err, err_completed = self.read_log(
            self.stderr, stderr, err, ctime, _process.exit_code, enc
        )

        from pgadmin.misc.cloud import update_server, clear_cloud_session
        if out_completed and not _process.exit_code:
            for value in stdout:
                if 'instance' in value[1] and value[1] != '':
                    cloud_instance = json.loads(value[1])
                    cloud_server_id = _process.server_id

                if type(cloud_instance) is dict and \
                        'instance' in cloud_instance:
                    cloud_instance['instance']['sid'] = cloud_server_id
                    cloud_instance['instance']['status'] = True
                    cloud_instance['instance']['pid'] = _pid
                    return update_server(cloud_instance)
        elif err_completed and _process.exit_code is not None and \
                _process.exit_code > 0:
            cloud_instance = {'instance': {}}
            cloud_instance['instance']['sid'] = _process.server_id
            cloud_instance['instance']['status'] = False
            cloud_instance['instance']['pid'] = _pid
            return update_server(cloud_instance)
        else:
            clear_cloud_session(_pid)
        return True, {}

    def status(self, out=0, err=0):
        ctime = get_current_time(format='%y%m%d%H%M%S%f')

        stdout = []
        stderr = []
        out_completed = err_completed = False
        process_output = (out != -1 and err != -1)

        j = Process.query.filter_by(
            pid=self.id, user_id=current_user.id
        ).first()
        enc = sys.getdefaultencoding()
        if enc == 'ascii':
            enc = 'utf-8'

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
                out, out_completed = self.read_log(
                    self.stdout, stdout, out, ctime, self.ecode, enc
                )
                err, err_completed = self.read_log(
                    self.stderr, stderr, err, ctime, self.ecode, enc
                )
        else:
            out_completed = err_completed = False

        if out == -1 or err == -1:
            return {
                'start_time': self.stime,
                'exit_code': self.ecode,
                'execution_time': execution_time,
                'process_state': self.process_state
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
    def _check_start_time(p, data):
        """
        Check start time and its related other timing checks.
        :param p: Process.
        :param data: Data
        :return:
        """
        if 'start_time' in data and data['start_time']:
            p.start_time = data['start_time']

            # We can't have 'exit_code' without the 'start_time'
            if 'exit_code' in data and \
                    data['exit_code'] is not None:
                p.exit_code = data['exit_code']

                # We can't have 'end_time' without the 'exit_code'.
                if 'end_time' in data and data['end_time']:
                    p.end_time = data['end_time']

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
                    BatchProcess._check_start_time(p, data)
                    # get the pid of the utility.
                    if 'pid' in data:
                        p.utility_pid = data['pid']

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
    def _check_process_desc(p):
        """
        Check process desc instance and return data according to process.
        :param p: process
        :return: return value for details, type_desc and desc related
        to process
        """
        try:
            desc = loads(bytes.fromhex(p.desc))
        except Exception:
            desc = loads(p.desc)

        details = desc
        type_desc = ''
        current_storage_dir = None

        if isinstance(desc, IProcessDesc):

            from pgadmin.tools.backup import BackupMessage
            from pgadmin.tools.import_export import IEMessage
            args = []
            args_csv = StringIO(
                p.arguments.encode('utf-8')
                if hasattr(p.arguments, 'decode') else p.arguments
            )
            args_reader = csv.reader(args_csv, delimiter=str(','))
            for arg in args_reader:
                args = args + arg
            details = desc.details(p.command, args)
            type_desc = desc.type_desc
            if isinstance(desc, (BackupMessage, IEMessage)):
                current_storage_dir = desc.current_storage_dir
            desc = desc.message

        return desc, details, type_desc, current_storage_dir

    @staticmethod
    def list():
        processes = Process.query.filter_by(user_id=current_user.id)
        changed = False

        browser_preference = Preferences.module('browser')
        expiry_add = timedelta(
            browser_preference.preference('process_retain_days').get() or 1
        )

        res = []
        for p in [*processes]:
            if p.start_time is not None:
                # remove expired jobs
                process_expiration_time = \
                    parser.parse(p.start_time) + expiry_add
                if datetime.now(process_expiration_time.tzinfo) >= \
                        process_expiration_time:
                    shutil.rmtree(p.logdir, True)
                    db.session.delete(p)
                    changed = True

            status, updated = BatchProcess.update_process_info(p)
            if not status:
                continue
            elif not changed:
                changed = updated

            if p.start_time is None or (
                p.acknowledge is not None and p.end_time is None
            ):
                continue

            stime = parser.parse(p.start_time)
            etime = parser.parse(p.end_time or get_current_time())

            execution_time = BatchProcess.total_seconds(etime - stime)

            desc, details, type_desc, current_storage_dir = BatchProcess.\
                _check_process_desc(p)

            res.append({
                'id': p.pid,
                'desc': desc,
                'type_desc': type_desc,
                'details': details,
                'stime': stime,
                'etime': p.end_time,
                'exit_code': p.exit_code,
                'acknowledge': p.acknowledge,
                'execution_time': execution_time,
                'process_state': p.process_state,
                'utility_pid': p.utility_pid,
                'server_id': p.server_id,
                'current_storage_dir': current_storage_dir,
            })

        if changed:
            db.session.commit()

        return res

    @staticmethod
    def total_seconds(dt):
        return round(dt.total_seconds(), 2)

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
            raise LookupError(PROCESS_NOT_FOUND)

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
            if hasattr(server, 'connection_params') and \
                server.connection_params and \
                'sslcert' in server.connection_params and \
                'sslkey' in server.connection_params and \
                    'sslrootcert' in server.connection_params:
                # SSL environment variables
                sslcert = get_complete_file_path(
                    server.connection_params['sslcert'])
                sslkey = get_complete_file_path(
                    server.connection_params['sslkey'])
                sslrootcert = get_complete_file_path(
                    server.connection_params['sslrootcert'])

                self.env['PGSSLMODE'] = server.connection_params['sslmode'] \
                    if hasattr(server, 'connection_params') and \
                    'sslmode' in server.connection_params else 'prefer'
                self.env['PGSSLCERT'] = '' if sslcert is None else sslcert
                self.env['PGSSLKEY'] = '' if sslkey is None else sslkey
                self.env['PGSSLROOTCERT'] = \
                    '' if sslrootcert is None else sslrootcert

            # Set service name related ENV variable
            if server.service:
                self.env['PGSERVICE'] = server.service

        if self.manager_obj:
            # Set the PGPASSFILE environment variable
            if self.manager_obj.connection_params and \
                isinstance(self.manager_obj.connection_params, dict) and \
                'passfile' in self.manager_obj.connection_params and \
                    self.manager_obj.connection_params['passfile']:
                pgpasspath = get_complete_file_path(
                    self.manager_obj.connection_params['passfile'])
                if pgpasspath is not None:
                    self.env['PGPASSFILE'] = pgpasspath

            # Check for connection timeout and if it is greater than 0 then
            # set the environment variable PGCONNECT_TIMEOUT.
            timeout = self.manager_obj.get_connection_param_value(
                'connect_timeout')
            if timeout and int(timeout) > 0:
                self.env['PGCONNECT_TIMEOUT'] = str(timeout)

            # export password environment
            self.manager_obj.export_password_env(self.id)

        if 'env' in kwargs:
            self.env.update(kwargs['env'])

    @staticmethod
    def stop_process(_pid):
        """
        """
        p = Process.query.filter_by(
            user_id=current_user.id, pid=_pid
        ).first()

        if p is None:
            raise LookupError(PROCESS_NOT_FOUND)

        try:
            process = psutil.Process(p.utility_pid)
            process.terminate()
            # Update the process state to "Terminated"
            p.process_state = PROCESS_TERMINATED
        except psutil.NoSuchProcess:
            p.process_state = PROCESS_TERMINATED
        except psutil.Error as e:
            current_app.logger.warning(
                _("Unable to kill the background process '{0}'").format(
                    p.utility_pid)
            )
            current_app.logger.exception(e)
        db.session.commit()

    @staticmethod
    def update_server_id(_pid, _sid):
        p = Process.query.filter_by(
            user_id=current_user.id, pid=_pid
        ).first()

        if p is None:
            raise LookupError(PROCESS_NOT_FOUND)

        # Update the cloud server id
        p.server_id = _sid
        db.session.commit()
