##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from contextlib import contextmanager
from subprocess import call
from pgadmin.utils import u_encode, fs_encoding, file_quote


# enum-like for tracking whether we have
class JsState:
    NONE = 0
    OLD = 1
    NEW = 2


class JavascriptBundler:
    """Builds Javascript bundle files by delegating to webpack"""

    def __init__(self):
        self.js_state = JsState.NONE

    def bundle(self):
        try:
            try_building_js()
            self.js_state = JsState.NEW
        except OSError:
            webdir_path()
            generated_js_dir = os.path.join(
                webdir_path(), 'pgadmin', 'static', 'js', 'generated')
            if os.path.exists(generated_js_dir) and \
                    os.listdir(generated_js_dir):
                self.js_state = JsState.OLD
            else:
                self.js_state = JsState.NONE

    def report(self):
        return self.js_state


@contextmanager
def pushd(new_dir):
    previous_dir = os.getcwd()
    os.chdir(new_dir)
    yield
    os.chdir(previous_dir)


def webdir_path():
    dirname = os.path.dirname
    this_path = os.path.realpath(u_encode(__file__, fs_encoding))
    return dirname(dirname(dirname(dirname(this_path))))


def try_building_js():
    with pushd(webdir_path()):
        if call(['yarn', 'run', 'bundle:dev']) != 0:
            raise OSError('Error executing bundling the application')
