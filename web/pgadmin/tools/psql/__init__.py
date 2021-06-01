#!/usr/bin/env python3

import os
import re
import select
import struct
import config
from sys import platform as _platform
import eventlet.green.subprocess as subprocess
from config import PG_DEFAULT_DRIVER
from flask import Response, url_for, request
from flask import render_template, copy_current_request_context, \
    current_app as app
from flask_babelex import gettext
from flask_security import login_required, current_user
from pgadmin.browser.utils import underscore_unescape, underscore_escape
from pgadmin.utils import PgAdminModule
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.driver import get_driver
from ... import socketio as sio
from pgadmin.utils import get_complete_file_path

if _platform != 'win32':
    import fcntl
    import termios
    import pty

session_input = dict()
session_input_cursor = dict()
session_last_cmd = dict()
pdata = dict()
cdata = dict()


class PSQLModule(PgAdminModule):
    """
    class PSQLModule(PgAdminModule)
        A module class for PSQL derived from PgAdminModule.
    """

    LABEL = gettext("PSQL")

    def get_own_menuitems(self):
        return {}

    def get_own_javascripts(self):
        return [{
            'name': 'pgadmin.psql',
            'path': url_for('psql.index') + "psql",
            'when': None
        }]

    def get_panels(self):
        return []

    def get_exposed_url_endpoints(self):
        """
        Returns:
            list: URL endpoints for PSQL module
        """
        return [
            'psql.panel'
        ]


blueprint = PSQLModule('psql', __name__, static_url_path='/static')


@blueprint.route("/psql.js")
@login_required
def script():
    """render the required javascript"""
    return Response(
        response=render_template("psql/js/psql.js", _=gettext),
        status=200,
        mimetype=MIMETYPE_APP_JS
    )


@blueprint.route('/panel/<int:trans_id>',
                 methods=["POST"],
                 endpoint="panel")
@login_required
def panel(trans_id):
    """
    Return panel template for PSQL tools.
    :param trans_id:
    """
    params = {
        'trans_id': trans_id,
        'title': request.form['title']
    }
    if 'sid_soid_mapping' not in app.config:
        app.config['sid_soid_mapping'] = dict()
    if request.args:
        params.update({k: v for k, v in request.args.items()})
    # Set TERM env for xterm.
    os.environ['TERM'] = 'xterm'

    o_db_name = _get_database(params['sid'], params['did'])

    return render_template('editor_template.html',
                           sid=params['sid'],
                           db=underscore_unescape(params['db']) if params[
                               'db'] else 'postgres',
                           server_type=params['server_type'],
                           is_enable=config.ENABLE_PSQL,
                           title=underscore_unescape(params['title']),
                           theme=params['theme'],
                           o_db_name=o_db_name
                           )


def set_term_size(fd, row, col, xpix=0, ypix=0):
    """
    Set the terminal size as per UI xterm size.
    :param fd:
    :param row:
    :param col:
    :param xpix:
    :param ypix:
    """
    term_size = struct.pack('HHHH', row, col, xpix, ypix)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, term_size)


@sio.on('connect', namespace='/pty')
def connect():
    """
    Connect to the server through socket.
    :return:
    :rtype:
    """
    if config.ENABLE_PSQL:
        sio.emit('connected', {'sid': request.sid}, namespace='/pty',
                 to=request.sid)

        if request.sid in session_last_cmd:
            session_last_cmd[request.sid]['is_new_connection'] = False
        else:
            session_last_cmd[request.sid] = {'cmd': '', 'arrow_up': False,
                                             'invalid_cmd': False,
                                             'is_new_connection': False}
    else:
        sio.emit('conn_not_allow', {'sid': request.sid}, namespace='/pty',
                 to=request.sid)


def create_pty_terminal(connection_data):
    # Create the pty terminal process, parent and fd are file descriptors
    # for parent and child.
    parent, fd = pty.openpty()
    p = None
    if parent is not None:
        # Child process
        p = subprocess.Popen(connection_data,
                             preexec_fn=os.setsid,
                             stdin=fd,
                             stdout=fd,
                             stderr=fd,
                             universal_newlines=True
                             )

        app.config['sessions'][request.sid] = parent
        pdata[request.sid] = p
        cdata[request.sid] = fd
    else:
        app.config['sessions'][request.sid] = parent
        cdata[request.sid] = fd
        set_term_size(fd, 50, 50)

    return p, parent, fd


def read_terminal_data(parent, data_ready, max_read_bytes, sid):
    """
    Read the terminal output.
    :param parent:
    :param data_ready:
    :param max_read_bytes:
    :param sid:
    :return:
    """
    if parent in data_ready:
        # Read the output from parent fd (terminal).
        output = os.read(parent, max_read_bytes)
        emit_output = True

        if sid in session_last_cmd and session_last_cmd[sid][
            'arrow_up'] and not session_last_cmd[request.sid][
                'arrow_left_right']:
            session_last_cmd[sid]['cmd'] = output.decode()
            session_input_cursor[request.sid] = len(
                session_last_cmd[sid]['cmd'])
            session_last_cmd[sid]['arrow_up'] = True

        if sid in session_last_cmd and session_last_cmd[sid]['invalid_cmd']:
            # If command is invalid then emit error to user.
            emit_output = False
            sio.emit(
                'pty-output',
                {
                    'result': gettext(
                        "ERROR: Shell commands are disabled "
                        "in psql for security\r\n"),
                    'error': True
                },
                namespace='/pty', room=sid)
        # If command is valid then emit output to user.
        if emit_output:
            sio.emit('pty-output',
                     {'result': output.decode(),
                      'error': False},
                     namespace='/pty', room=sid)
        else:
            session_last_cmd[request.sid]['invalid_cmd'] = False


@sio.on('start_process', namespace='/pty')
def start_process(data):
    """
    Start the pty terminal and execute psql command and emit results to user.
    :param data:
    :return:
    """
    @copy_current_request_context
    def read_and_forward_pty_output(sid, data):

        max_read_bytes = 1024 * 20

        if _platform != 'win32':
            p, parent, fd = create_pty_terminal(connection_data)

            while p and p.poll() is None:
                if request.sid in app.config['sessions']:
                    # This code is added to make this unit testable.
                    if "is_test" not in data:
                        sio.sleep(0.01)
                    else:
                        data['count'] += 1
                        if data['count'] == 5:
                            break

                    timeout = 0
                    # module provides access to platform-specific I/O
                    # monitoring functions
                    (data_ready, _, _) = select.select([parent, fd], [], [],
                                                       timeout)

                    read_terminal_data(parent, data_ready, max_read_bytes, sid)
        else:
            sio.emit(
                'conn_error',
                {
                    'error': 'PSQL tool not supported.',
                }, namespace='/pty', room=request.sid)

    # Check user is authenticated and PSQL is enabled in config.
    if current_user.is_authenticated and config.ENABLE_PSQL:
        connection_data = []
        try:
            db = ''
            if data['db']:
                db = underscore_unescape(data['db']).replace('\\', "\\\\")

            data['db'] = db

            conn, manager = _get_connection(int(data['sid']), data)
            psql_utility = manager.utility('sql')
            connection_data = get_connection_str(psql_utility, db,
                                                 manager)
        except Exception as e:
            # If any error raised during the start the PSQL emit error to UI.
            # request.sid: This sid is socket id.
            sio.emit(
                'conn_error',
                {
                    'error': 'Error while running psql command: {0}'.format(e),
                }, namespace='/pty', room=request.sid)

        try:
            if str(data['sid']) not in app.config['sid_soid_mapping']:
                # request.sid: refer request.sid as socket id.
                app.config['sid_soid_mapping'][str(data['sid'])] = list()
                app.config['sid_soid_mapping'][str(data['sid'])].append(
                    request.sid)
            else:
                app.config['sid_soid_mapping'][str(data['sid'])].append(
                    request.sid)

            sio.start_background_task(read_and_forward_pty_output,
                                      request.sid, data)
        except Exception as e:
            sio.emit(
                'conn_error',
                {
                    'error': 'Error while running psql command: {0}'.format(e),
                }, namespace='/pty', room=request.sid)
    else:
        # Show error if user is not authenticated.
        sio.emit('conn_not_allow', {'sid': request.sid}, namespace='/pty',
                 to=request.sid)


def _get_connection(sid, data):
    """
    Get the connection object of ERD.
    :param sid:
    :param did:
    :param trans_id:
    :return:
    """
    manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
    try:
        conn = manager.connection()
        # This is added for unit test only, no use in normal execution.
        if 'pwd' in data:
            kwargs = {'password': data['pwd'], "user": data['user']}
            status, msg = conn.connect(**kwargs)
        else:
            status, msg = conn.connect()
        if not status:
            app.logger.error(msg)
            sio.emit(sio.emit(
                'conn_error',
                {
                    'error': 'Error while running psql command: {0}'
                             ''.format('Server connection not present.'),
                }, namespace='/pty', room=request.sid))
            raise RuntimeError('Server is not connected.')

        return conn, manager
    except Exception as e:
        app.logger.error(e)
        raise


def get_connection_str(psql_utility, db, manager):
    """
    Get connection string(through connection dsn)
    :param psql_utility: PostgreSQL binary path.
    :param db: database name to connect specific db.
    :return: connection attribute list for PSQL connection.
    """
    conn_attr = get_conn_str(manager, db)
    conn_attr_list = list()
    conn_attr_list.append(psql_utility)
    conn_attr_list.append(conn_attr)
    return conn_attr_list


def get_conn_str(manager, db):
    """
    Get connection attributes for psql connection.
    :param manager:
    :param db:
    :return:
    """
    manager.export_password_env('PGPASSWORD')
    conn_attr =\
        'host={0} port={1} dbname={2} user={3} sslmode={4} ' \
        'sslcompression={5} ' \
        ''.format(
            manager.local_bind_host if manager.use_ssh_tunnel else
            manager.host,
            manager.local_bind_port if manager.use_ssh_tunnel else
            manager.port,
            underscore_unescape(db) if db != '' else 'postgres',
            underscore_unescape(manager.user) if manager.user else 'postgres',
            manager.ssl_mode,
            True if manager.sslcompression else False,
        )

    if manager.hostaddr:
        conn_attr = " {0} hostaddr={1}".format(conn_attr, manager.hostaddr)

    if manager.passfile:
        conn_attr = " {0} passfile={1}".format(conn_attr,
                                               get_complete_file_path(
                                                   manager.passfile))

    if get_complete_file_path(manager.sslcert):
        conn_attr = " {0} sslcert={1}".format(
            conn_attr, get_complete_file_path(manager.sslcert))

    if get_complete_file_path(manager.sslkey):
        conn_attr = " {0} sslkey={1}".format(
            conn_attr, get_complete_file_path(manager.sslkey))

    if get_complete_file_path(manager.sslrootcert):
        conn_attr = " {0} sslrootcert={1}".format(
            conn_attr, get_complete_file_path(manager.sslrootcert))

    if get_complete_file_path(manager.sslcrl):
        conn_attr = " {0} sslcrl={1}".format(
            conn_attr, get_complete_file_path(manager.sslcrl))

    if manager.service:
        conn_attr = " {0} service={1}".format(
            conn_attr, get_complete_file_path(manager.service))

    return conn_attr


def check_last_exe_cmd(data):
    """
    Check the is user try to execute last executed command.
    :param data:
    :return:
    """
    # If user get previous executed command from history then set
    # current command as previous executed command.
    if session_last_cmd[request.sid]['cmd'] and session_last_cmd[request.sid][
            'arrow_up']:
        user_input = str(
            session_last_cmd[request.sid]['cmd']).strip()
        session_last_cmd[request.sid]['arrow_up'] = False
        session_last_cmd[request.sid]['cmd'] = ''
    else:
        if request.sid not in session_input:
            session_input[request.sid] = data['input']
            user_input = str(session_input[request.sid]).strip()
        else:
            user_input = str(session_input[request.sid]).strip()

    return user_input


def invalid_cmd():
    """
    Invalid command
    :return:
    :rtype:
    """
    session_last_cmd[request.sid]['invalid_cmd'] = True
    for i in range(len(session_input[request.sid])):
        os.write(app.config['sessions'][request.sid],
                 '\b \b'.encode())

    os.write(app.config['sessions'][request.sid],
             '\n'.encode())
    session_input[request.sid] = ''


def check_valid_cmd(user_input):
    """
    Check if user entered a valid cmd and \\! command is preset as a string
    only in current executing command. if \\! is present as command don't
    allow the execution of command.
    :param user_input:
    :return:
    """
    stop_execution = True
    # Check \! is passed as string or not.
    double_quote_strs = re.findall('"([^"]*)"', user_input)
    if not double_quote_strs:
        double_quote_strs = re.findall("'([^']*)'", user_input)

    if double_quote_strs:
        for sub_str in double_quote_strs:
            if re.search("\\\!", sub_str):
                stop_execution = False
                # break

    if stop_execution:
        session_last_cmd[request.sid]['invalid_cmd'] = True

        # Remove already added command from terminal.
        for i in range(len(user_input)):
            os.write(app.config['sessions'][request.sid],
                     '\b \b'.encode())
        # Add Enter event to execute the command.
        os.write(app.config['sessions'][request.sid],
                 '\n'.encode())
    else:
        session_last_cmd[request.sid]['invalid_cmd'] = False
        os.write(app.config['sessions'][request.sid],
                 '\n'.encode())


def enter_key_press(data):
    """
    Handel the Enter key press event.
    :param data:
    """
    user_input = check_last_exe_cmd(data)
    session_input_cursor[request.sid] = 0

    # If ALLOW_PSQL_SHELL_COMMANDS is False then user can't execute
    # \! meta command to run shell commands through PSQL terminal.
    # Check before executing the user entered command does not
    # contains \! in input.
    is_new_connection = session_last_cmd[request.sid][
        'is_new_connection']

    if user_input.startswith('\\!') and re.match("^\\\!$", user_input) and len(
        user_input) == 2 and not config.ALLOW_PSQL_SHELL_COMMANDS \
            and not is_new_connection:
        invalid_cmd()
    elif re.search("\\\!", user_input) and \
        not config.ALLOW_PSQL_SHELL_COMMANDS and\
            not session_last_cmd[request.sid]['is_new_connection']:
        check_valid_cmd(user_input)
    elif user_input == '\q' or user_input == 'q\\q' or \
            user_input in ['exit', 'exit;']:
        # If user enter \q to terminate the PSQL, emit the msg to
        # notify user connection is terminated.
        sio.emit('pty-output',
                 {
                     'result': gettext(
                         'Connection terminated, To create new '
                         'connection please open another psql'
                         ' tool.'),
                     'error': True},
                 namespace='/pty', room=request.sid)

        os.write(app.config['sessions'][request.sid],
                 '\n'.encode())

    else:
        os.write(app.config['sessions'][request.sid],
                 data['input'].encode())
    session_input[request.sid] = ''
    session_last_cmd[request.sid]['is_new_connection'] = False


def backspace_key_press():
    """
    Handel the backspace key press event.
    :return:
    :rtype:
    """
    session_last_cmd[request.sid]['arrow_left_right'] = True

    if session_last_cmd[request.sid]['cmd']:
        session_input[request.sid] = \
            session_last_cmd[request.sid]['cmd']

    user_input = list(session_input[request.sid])

    if session_input_cursor[request.sid] == 1:
        index = 0
        session_input_cursor[request.sid] -= 1
    else:
        if session_input_cursor[request.sid] > 0:
            index = (session_input_cursor[request.sid]) - 1
            session_input_cursor[request.sid] -= 1
        else:
            index = session_input_cursor[request.sid]
            session_input_cursor[request.sid] = 0

    if len(user_input):
        del user_input[index]
    session_input[request.sid] = "".join(user_input)

    if len(session_input[request.sid]) == 0:
        session_input_cursor[request.sid] = 0
    session_last_cmd[request.sid]['cmd'] = ''


def set_user_input(data):
    """
    Check and set current input as user input in session_input.
    :param data:
    """
    if session_last_cmd[request.sid]['cmd'] and \
            session_input[request.sid] == '':
        session_input[request.sid] = \
            session_last_cmd[request.sid]['cmd']
        session_input_cursor[request.sid] = len(
            session_input[request.sid])
    else:
        session_last_cmd[request.sid]['arrow_up'] = False
        session_last_cmd[request.sid]['cmd'] = ''
    user_input = list(session_input[request.sid])
    user_input.insert(session_input_cursor[request.sid],
                      data['input'])
    session_input[request.sid] = ''.join(user_input)
    session_input_cursor[request.sid] += 1
    session_last_cmd[request.sid]['arrow_left_right'] = False


def other_key_press(data):
    """
    Handel the other key press from psql tool.
    :param data:
    :type data:
    :return:
    :rtype:
    """
    if data['key_name'] == 'ArrowLeft':
        session_last_cmd[request.sid]['arrow_left_right'] = True
        if session_input_cursor[request.sid] > 0:
            session_input_cursor[request.sid] -= 1

    elif data['key_name'] == 'ArrowRight':
        session_last_cmd[request.sid]['arrow_left_right'] = True
        if session_input_cursor[request.sid] < len(
                session_input[request.sid]):
            session_input_cursor[request.sid] += 1

    elif data['key_name'] == 'ArrowUp':
        session_last_cmd[request.sid]['arrow_up'] = True
        session_last_cmd[request.sid]['arrow_left_right'] = False
        session_input[request.sid] = session_last_cmd[request.sid][
            'cmd']
        session_input_cursor[request.sid] = len(
            session_last_cmd[request.sid]['cmd'])

    elif request.sid in session_input and \
        data['key_name'] == 'Backspace' and \
        (len(session_input[request.sid]) or
            len(session_last_cmd[request.sid])):
        backspace_key_press()
    elif request.sid in session_input:
        set_user_input(data)
    else:
        session_input_cursor[request.sid] = 0
        session_input[request.sid] = data['input']
        session_input_cursor[request.sid] += 1

    # Write user input to terminal parent fd.
    os.write(app.config['sessions'][request.sid],
             data['input'].encode())


@sio.on('socket_input', namespace='/pty')
def socket_input(data):
    """
    This get the user input through socket.
    :param data: User input from socket.
    """
    try:
        # request.sid: refer request.sid as socket id.
        # Check PSQL enabled setting from config.
        enable_psql = True if config.ENABLE_PSQL else False

        if request.sid in app.config['sessions']:
            if data['key_name'] == 'Enter' and enable_psql:
                enter_key_press(data)
            else:
                other_key_press(data)
    except Exception as e:
        # Delete socket id from sessions.
        # request.sid: refer request.sid as socket id.
        sio.emit('pty-output',
                 {
                     'result': gettext('Invalid session.\r\n'),
                     'error': True
                 },
                 namespace='/pty', room=request.sid)
        del app.config['sessions'][request.sid]


@sio.on('resize', namespace='/pty')
def resize(data):
    """
    Resize the pty terminal as per the UI terminal.
    :param data: UI terminal rows and cols data
    """
    # request.sid: refer request.sid as socket id.
    if request.sid in app.config['sessions']:
        set_term_size(app.config['sessions'][request.sid], data['rows'],
                      data['cols'])


@sio.on('disconnect', namespace='/pty')
def disconnect():
    """
    Disconnect the socket and terminate the process
    """
    # request.sid: refer request.sid as socket id.
    if request.sid in pdata:
        # On disconnect socket manually exit the psql terminal and close the
        # parend and child fd then kill the subprocess.
        disconnect_socket()


@sio.on('server-disconnect', namespace='/pty')
def server_disconnect(data):
    """
    Disconnect the socket and terminate the process after user disconnect
    the server. we can't use disconnect event name as it is reserved for socket
    internal use.
    """
    # request.sid: refer request.sid as socket id.
    if request.sid in pdata and request.sid in app.config['sid_soid_mapping'][
            data['sid']]:
        # On disconnect socket manually exit the psql terminal and close the
        # parend and child fd then kill the subprocess.
        app.config['sid_soid_mapping'][data['sid']] = [soid for soid in
                                                       app.config[
                                                           'sid_soid_mapping'][
                                                           data['sid']] if
                                                       soid != request.sid]
        disconnect_socket()


def disconnect_socket():
    os.write(app.config['sessions'][request.sid], '\q\n'.encode())
    sio.sleep(1)
    os.close(app.config['sessions'][request.sid])
    os.close(cdata[request.sid])
    del app.config['sessions'][request.sid]


def _get_database(sid, did):
    """
    This method is used to get database based on sid, did.
    """
    try:
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(int(sid))
        conn = manager.connection()
        db_name = None
        if conn.connected():
            is_connected = True
        else:
            is_connected = False
        if is_connected:

            if conn.manager and conn.manager.db_info \
                    and conn.manager.db_info[int(did)] is not None:

                db_name = conn.manager.db_info[int(did)]['datname']
                return db_name
            elif sid:
                template_path = 'databases/sql/#{0}#'.format(manager.version)
                last_system_oid = 0
                server_node_res = manager

                db_disp_res = None
                params = None
                if server_node_res and server_node_res.db_res:
                    db_disp_res = ", ".join(
                        ['%s'] * len(server_node_res.db_res.split(','))
                    )
                    params = tuple(server_node_res.db_res.split(','))
                sql = render_template(
                    "/".join([template_path, _NODES_SQL]),
                    last_system_oid=last_system_oid,
                    db_restrictions=db_disp_res,
                    did=did
                )
                status, databases = conn.execute_dict(sql, params)
                database = databases['rows'][0]
                if database is not None:
                    db_name = database['name']

            return db_name
        else:
            return db_name
    except Exception:
        return None
