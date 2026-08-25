##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Background, hang-safe check of whether the selected OS keyring backend
is actually usable (desktop mode only).

A keyring backend may be *selected* (e.g. SecretService on Linux) yet be
completely unusable at runtime - for example in a headless or RDP session
where there is no live D-Bus / GNOME Keyring session. In that case
`import keyring`, `keyring.get_keyring()`, and any keyring call can block
forever on a D-Bus call, instead of raising.

The probe therefore runs in its own OS process (subprocess.Popen, plain
fork+exec) so a hang can be killed outright from the parent - a
thread-based timeout can only stop *waiting*, it can't stop the
import/call, and would leave CPython's per-module import lock held
forever, wedging every later `import keyring` in the parent too.

NOTE: this must be `subprocess.Popen`, not `multiprocessing.Process`.
multiprocessing's 'spawn' start method refuses to start a child while the
current process hasn't finished bootstrapping its __main__ module yet
(`_check_not_importing_main`) - and that's exactly the situation here,
since this runs from create_app(), which itself executes at the top
level of pgAdmin4.py while it's still being imported. Popen has no such
restriction; it's an independent process from the start.

It's started from create_app() in a background daemon thread so it never
delays application startup; config.USE_OS_SECRET_STORAGE / KEYRING_NAME
are updated in place once the probe resolves (or times out).
"""

import subprocess
import sys
import threading

KEYRING_PROBE_TIMEOUT = 3

# Kept minimal and dependency-free: runs in a fresh interpreter, so it
# only has stdlib + keyring available, and reports its result over
# stdout rather than needing to be pickled back to the parent.
_PROBE_SCRIPT = (
    "try:\n"
    "    import keyring\n"
    "    name = keyring.get_keyring().name\n"
    "    if name == 'fail Keyring':\n"
    "        print('0')\n"
    "    else:\n"
    "        keyring.get_password(\n"
    "            'pgAdmin4', 'entry_to_check_keyring_access')\n"
    "        print('1')\n"
    "        print(name)\n"
    "except Exception:\n"
    "    print('0')\n"
)


def _run_probe(config):
    try:
        proc = subprocess.Popen(
            [sys.executable, '-c', _PROBE_SCRIPT],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    except Exception:
        # Can't probe - leave config as evaluate_config.py set it.
        return

    try:
        stdout, _ = proc.communicate(timeout=KEYRING_PROBE_TIMEOUT)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        stdout = ''

    lines = stdout.splitlines()
    keyring_usable = bool(lines) and lines[0] == '1'

    if not keyring_usable:
        config['USE_OS_SECRET_STORAGE'] = False
        config['KEYRING_NAME'] = ''
    else:
        config['KEYRING_NAME'] = lines[1] if len(lines) > 1 else ''


def start_async_probe(config):
    """Kick off the keyring usability probe in the background.

    Desktop mode only. Non-blocking - returns immediately; config is
    updated in place whenever the probe resolves.
    """
    if config.get('SERVER_MODE'):
        return

    threading.Thread(
        target=_run_probe, args=(config,), daemon=True).start()
