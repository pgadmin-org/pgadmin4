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
This python script is responsible for executing a process, and logs its output,
and error in the given output directory.

We will create a detached process, which executes this script.

This script will:
* Fetch the configuration from the given database.
* Run the given executable specified in the configuration with the arguments.
* Create log files for both stdout, and stdout.
* Update the start time, end time, exit code, etc in the configuration
  database.

Args:
  process_id -- Process id
  db_file -- Database file which holds list of processes to be executed
  output_directory -- output directory
"""
from __future__ import print_function, unicode_literals

# To make print function compatible with python2 & python3
import sys
import os
import argparse
import sqlite3
from datetime import datetime
from subprocess import Popen, PIPE
from threading import Thread
import csv
import pytz
import codecs

# SQLite3 needs all string as UTF-8
# We need to make string for Python2/3 compatible
if sys.version_info < (3,):
    from cStringIO import StringIO


    def u(x):
        return x
else:
    from io import StringIO


    def u(x):
        if hasattr(x, 'decode'):
            return x.decode()
        return x


def usage():
    """
    This function will display usage message.

    Args:
        None

    Returns:
        Displays help message
    """

    help_msg = """
Usage:

executer.py [-h|--help]
    [-p|--process] Process ID
    [-d|--db_file] SQLite3 database file path
"""
    print(help_msg)


def get_current_time(format='%Y-%m-%d %H:%M:%S.%f %z'):
    return datetime.utcnow().replace(
        tzinfo=pytz.utc
    ).strftime(format)


class ProcessLogger(Thread):
    """
    This class definition is responsible for capturing & logging
    stdout & stderr messages from subprocess

    Methods:
    --------
    * __init__(stream_type, configs)
     - This method is use to initlize the ProcessLogger class object

    * logging(msg)
     - This method is use to log messages in sqlite3 database

    * run()
     - Reads the stdout/stderr for messages and sent them to logger
    """

    def __init__(self, stream_type, configs):
        """
        This method is use to initialize the ProcessLogger class object

        Args:
            stream_type: Type of STD (std)
            configs: Process details dict

        Returns:
            None
        """
        Thread.__init__(self)
        self.configs = configs
        self.process = None
        self.stream = None
        self.logger = codecs.open(
            os.path.join(
                configs['output_directory'], stream_type
            ), 'w', "utf-8"
        )

    def attach_process_stream(self, process, stream):
        """
        This function will attach a process and its stream with this thread.

        Args:
            process: Process
            stream: Stream attached with the process

        Returns:
            None
        """
        self.process = process
        self.stream = stream

    def log(self, msg):
        """
        This function will update log file

        Args:
            msg: message

        Returns:
            None
        """
        # Write into log file
        if self.logger:
            if msg:
                self.logger.write(
                    str('{0},{1}').format(
                        get_current_time(format='%Y%m%d%H%M%S%f'), u(msg)
                    )
                )
            return True
        return False

    def run(self):
        if self.process and self.stream:
            while True:
                nextline = self.stream.readline()

                if nextline:
                    self.log(nextline)
                else:
                    if self.process.poll() is not None:
                        break

    def release(self):
        if self.logger:
            self.logger.close()
            self.logger = None


def read_configs(data):
    """
    This reads SQLite3 database and fetches process details

    Args:
        data - configuration details

    Returns:
        Process details fetched from database as a dict
    """
    if data.db_file is not None and data.process_id is not None:
        conn = sqlite3.connect(data.db_file)
        c = conn.cursor()
        t = (data.process_id,)

        c.execute('SELECT command, arguments FROM process WHERE \
            exit_code is NULL \
            AND pid=?', t)

        row = c.fetchone()
        conn.close()

        if row and len(row) > 1:
            configs = {
                'pid': data.process_id,
                'cmd': row[0],
                'args': row[1],
                'output_directory': data.output_directory,
                'db_file': data.db_file
            }
            return configs
        else:
            return None
    else:
        raise ValueError("Please verify pid and db_file arguments.")


def update_configs(kwargs):
    """
    This function will updates process stats

    Args:
        kwargs - Process configuration details

    Returns:
        None
    """
    if 'db_file' in kwargs and 'pid' in kwargs:
        conn = sqlite3.connect(kwargs['db_file'])
        sql = 'UPDATE process SET '
        params = list()

        for param in ['start_time', 'end_time', 'exit_code']:
            if param in kwargs:
                sql += (',' if len(params) else '') + param + '=? '
                params.append(kwargs[param])

        if len(params) == 0:
            return

        sql += 'WHERE pid=?'
        params.append(kwargs['pid'])

        with conn:
            c = conn.cursor()
            c.execute(sql, params)
            conn.commit()

        # Commit & close cursor
        conn.close()
    else:
        raise ValueError("Please verify pid and db_file arguments.")


def execute(configs):
    """
    This function will execute the background process

    Args:
        configs: Process configuration details

    Returns:
        None
    """
    if configs is not None:
        command = [configs['cmd']]
        args_csv = StringIO(configs['args'])
        args_reader = csv.reader(args_csv, delimiter=str(','))
        for args in args_reader:
            command = command + args
        args = {
            'pid': configs['pid'],
            'db_file': configs['db_file']
        }

        try:
            reload(sys)
            sys.setdefaultencoding('utf8')
        except:
            pass

        # Create seprate thread for stdout and stderr
        process_stdout = ProcessLogger('out', configs)
        process_stderr = ProcessLogger('err', configs)

        try:
            # update start_time
            args.update({
                'start_time': get_current_time(),
                'stdout': process_stdout.log,
                'stderr': process_stderr.log
            })

            # Update start time
            update_configs(args)

            if args['pid'] in os.environ:
                os.environ['PGPASSWORD'] = os.environ[args['pid']]

            process = Popen(
                command, stdout=PIPE, stderr=PIPE, stdin=PIPE,
                shell=(os.name == 'nt'), close_fds=(os.name != 'nt')
            )
            try:
                del (os.environ['PGPASSWORD'])
            except:
                pass

            # Attach the stream to the process logger, and start logging.
            process_stdout.attach_process_stream(process, process.stdout)
            process_stdout.start()
            process_stderr.attach_process_stream(process, process.stderr)
            process_stderr.start()

            # Join both threads together
            process_stdout.join()
            process_stderr.join()

            # Child process return code
            exitCode = process.wait()

            if exitCode is None:
                exitCode = process.poll()

            args.update({'exit_code': exitCode})

            # Add end_time
            args.update({'end_time': get_current_time()})

            # Fetch last output, and error from process if it has missed.
            data = process.communicate()
            if data:
                if data[0]:
                    process_stdout.log(data[0])
                if data[1]:
                    process_stderr.log(data[1])

        # If executable not found or invalid arguments passed
        except OSError as e:
            if process_stderr:
                process_stderr.log(e.strerror)
            else:
                print("WARNING: ", e.strerror, file=sys.stderr)
            args.update({'end_time': get_current_time()})
            args.update({'exit_code': e.errno})

        # Unknown errors
        except Exception as e:
            if process_stderr:
                process_stderr.log(str(e))
            else:
                print("WARNING: ", str(e), file=sys.stderr)
            args.update({'end_time': get_current_time()})
            args.update({'exit_code': -1})
        finally:
            # Update the execution end_time, and exit-code.
            update_configs(args)
            if process_stderr:
                process_stderr.release()
                process_stderr = None
            if process_stdout:
                process_stdout.release()
                process_stdout = None

    else:
        raise ValueError("Please verify process configs.")


if __name__ == '__main__':
    # Read command line arguments
    parser = argparse.ArgumentParser(
        description='Process executor for pgAdmin 4'
    )
    parser.add_argument(
        '-p', '--process_id', help='Process ID', required=True
    )
    parser.add_argument(
        '-d', '--db_file', help='Configuration Database', required=True
    )
    parser.add_argument(
        '-o', '--output_directory',
        help='Location where the logs will be created', required=True
    )
    args = parser.parse_args()

    # Fetch bakcground process details from SQLite3 database file
    configs = read_configs(args)

    # Execute the background process
    execute(configs)
