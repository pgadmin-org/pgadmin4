##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
from contextlib import contextmanager
from subprocess import call
from pgadmin.utils import u, fs_encoding, file_quote


# enum-like for tracking whether we have
class JsState:
    NONE = 0
    OLD = 1
    NEW = 2


class JavascriptBundler:
    """Builds Javascript bundle files by delegating to webpack"""

    def __init__(self):
        self.jsState = JsState.NONE

    def bundle(self):
        try:
            try_building_js()
            self.jsState = JsState.NEW
        except OSError:
            webdir_path()
            generatedJavascriptDir = os.path.join(
                webdir_path(), 'pgadmin', 'static', 'js', 'generated')
            if os.path.exists(generatedJavascriptDir) and \
                    os.listdir(generatedJavascriptDir):
                self.jsState = JsState.OLD
            else:
                self.jsState = JsState.NONE

    def report(self):
        return self.jsState


@contextmanager
def pushd(new_dir):
    previous_dir = os.getcwd()
    os.chdir(new_dir)
    yield
    os.chdir(previous_dir)


def webdir_path():
    dirname = os.path.dirname
    thisPath = os.path.realpath(u(__file__, fs_encoding))
    return dirname(dirname(dirname(dirname(thisPath))))


def try_building_js():
    with pushd(webdir_path()):
        if call(['yarn', 'run', 'bundle:dev']) != 0:
            raise OSError('Error executing bundling the application')
