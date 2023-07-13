##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import json
import os
import select
import struct
import config
from sys import platform as _platform
from eventlet.green import subprocess
from config import PG_DEFAULT_DRIVER
from flask import Response, request
from flask import render_template, copy_current_request_context, \
    current_app as app
from flask_babel import gettext
from flask_security import login_required, current_user
from pgadmin.browser.utils import underscore_unescape, underscore_escape
from pgadmin.utils import PgAdminModule
from pgadmin.utils.constants import MIMETYPE_APP_JS
from pgadmin.utils.driver import get_driver
from ... import socketio as sio
from pgadmin.utils import get_complete_file_path
from pgadmin.authenticate import socket_login_required


if _platform == 'win32':
    # Check Windows platform support for WinPty api, Disable psql
    # if not supporting
    try:
        from winpty import PtyProcess
    except ImportError as error:
        config.ENABLE_PSQL = False
else:
    import fcntl
    import termios
    import pty

session_input = dict()
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

    o_db_name = underscore_escape(_get_database(params['sid'], params['did']))

    set_env_variables(is_win=_platform == 'win32')
    return render_template('editor_template.html',
                           sid=params['sid'],
                           db=o_db_name,
                           server_type=params['server_type'],
                           is_enable=config.ENABLE_PSQL,
                           title=underscore_unescape(params['title']),
                           theme=params['theme'],
                           o_db_name=o_db_name,
                           platform=_platform
                           )


def set_env_variables(is_win=False):
    # Set TERM env for xterm.
    os.environ['TERM'] = 'xterm'
    if is_win:
        os.environ['PYWINPTY_BACKEND'] = '1'
    # If psql is enabled in server mode, set psqlrc and hist paths
    # to individual user storage.
    if config.ENABLE_PSQL and config.SERVER_MODE:
        psql_data = {
            'PSQLRC': get_complete_file_path('.psqlrc', False),
            'PSQL_HISTORY': get_complete_file_path('.psql_history', False)
        }
        os.environ[current_user.username] = json.dumps(psql_data)


def set_term_size(fd, row, col, xpix=0, ypix=0):
    """
    Set the terminal size as per UI xterm size.
    :param fd:
    :param row:
    :param col:
    :param xpix:
    :param ypix:
    """
    if _platform == 'win32':
        app.config['sessions'][request.sid].setwinsize(row, col)
    else:
        term_size = struct.pack('HHHH', row, col, xpix, ypix)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, term_size)


@sio.on('connect', namespace='/pty')
@socket_login_required
def connect():
    """
    Connect to the server through socket.
    :return:
    :rtype:
    """
    if config.ENABLE_PSQL:
        sio.emit('connected', {'sid': request.sid}, namespace='/pty',
                 to=request.sid)
    else:
        sio.emit('conn_not_allow', {'sid': request.sid}, namespace='/pty',
                 to=request.sid)


def get_user_env():
    env = os.environ
    if config.ENABLE_PSQL and config.SERVER_MODE:
        user_env = json.loads(os.environ[current_user.username])
        env['PSQLRC'] = user_env['PSQLRC']
        env['PSQL_HISTORY'] = user_env['PSQL_HISTORY']
    return env


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
                             universal_newlines=True,
                             env=get_user_env()
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

        sio.emit('pty-output',
                 {'result': output.decode(),
                  'error': False},
                 namespace='/pty', room=sid)


def read_stdout(process, sid, max_read_bytes, win_emit_output=True):
    (data_ready, _, _) = select.select([process.fd], [], [], 0)
    if process.fd in data_ready:
        output = process.read(max_read_bytes)
        if win_emit_output:
            sio.emit('pty-output',
                     {'result': output,
                      'error': False},
                     namespace='/pty', room=sid)

    sio.sleep(0)


def windows_platform(connection_data, sid, max_read_bytes):
    process = PtyProcess.spawn('cmd.exe', env=get_user_env())

    process.write(r'"{0}" "{1}" 2>>&1'.format(connection_data[0],
                                              connection_data[1]))
    process.write("\r\n")
    app.config['sessions'][request.sid] = process
    pdata[request.sid] = process
    set_term_size(process, 50, 50)

    while True:
        read_stdout(process, sid, max_read_bytes,
                    win_emit_output=True)


def non_windows_platform(parent, p, fd, data, max_read_bytes, sid):
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


def pty_handel_io(connection_data, data, sid):
    max_read_bytes = 1024 * 20
    if _platform == 'win32':
        windows_platform(connection_data, sid, max_read_bytes)
    else:
        p, parent, fd = create_pty_terminal(connection_data)
        non_windows_platform(parent, p, fd, data, max_read_bytes, sid)


@sio.on('start_process', namespace='/pty')
@socket_login_required
def start_process(data):
    """
    Start the pty terminal and execute psql command and emit results to user.
    :param data:
    :return:
    """
    @copy_current_request_context
    def read_and_forward_pty_output(sid, data):
        pty_handel_io(connection_data, data, sid)

    # Check user is authenticated and PSQL is enabled in config.
    if current_user.is_authenticated and config.ENABLE_PSQL:
        connection_data = []
        try:
            db = ''
            if data['db']:
                db = underscore_unescape(data['db'])

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
    manager.export_password_env('PGPASSWORD')
    database = db if db != '' else 'postgres'
    user = underscore_unescape(manager.user) if manager.user else None
    conn_attr = manager.create_connection_string(database, user)

    conn_attr_list = list()
    conn_attr_list.append(psql_utility)
    conn_attr_list.append(conn_attr)
    return conn_attr_list


def enter_key_press(data):
    """
    Handel the Enter key press event.
    :param data:
    """
    user_input = data['input']

    if user_input == '\q' or user_input == 'q\\q' or user_input in\
            ['\quit', 'exit', 'exit;']:
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

        if _platform == 'win32':
            app.config['sessions'][request.sid].write('\n')
            del app.config['sessions'][request.sid]
        else:
            os.write(app.config['sessions'][request.sid],
                     '\n'.encode())

    else:
        if _platform == 'win32':
            app.config['sessions'][request.sid].write(
                "{0}".format(data['input']))
        else:
            os.write(app.config['sessions'][request.sid],
                     data['input'].encode())
    session_input[request.sid] = ''


def other_key_press(data):
    """
    Handel the other key press from psql tool.
    :param data:
    :type data:
    :return:
    :rtype:
    """
    session_input[request.sid] = data['input']

    if _platform == 'win32':
        app.config['sessions'][request.sid].write(
            "{0}".format(data['input']))
    else:
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
    except Exception:
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
    if _platform == 'win32':
        if request.sid in app.config['sessions']:
            process = app.config['sessions'][request.sid]
            process.terminate()
            del app.config['sessions'][request.sid]
    else:
        os.write(app.config['sessions'][request.sid], '\q\n'.encode())
        sio.sleep(1)
        os.close(app.config['sessions'][request.sid])
        os.close(cdata[request.sid])
        del app.config['sessions'][request.sid]


def get_connection_status(conn):
    if conn.connected():
        return True

    return False


def _get_database(sid, did):
    """
    This method is used to get database based on sid, did.
    """
    try:
        from pgadmin.utils.driver import get_driver
        manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(int(sid))
        conn = manager.connection()
        db_name = 'postgres'

        is_connected = get_connection_status(conn)

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
