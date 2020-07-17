import os
import sys
import inspect
import builtins

# Ensure the global server mode is set.
builtins.SERVER_MODE = None

root = os.path.realpath(
    os.path.dirname(
        os.path.realpath(__file__)
    ) + '{0}..{0}..{0}web'.format(os.sep)
)

if sys.path[0] != root:
    sys.path.insert(0, root)

from pgadmin.utils import PgAdminModule

target = open('code_snippets.rst', 'w')
target.truncate()

target.write("*************\n")
target.write("Code Snippets\n")
target.write("*************\n\n")
target.write("""
This document contains code for some of the important classes, listed as
below:\n\n""")

for m in [
    'PgAdminModule', 'NodeView',
    'BaseDriver', 'BaseConnection'
]:
    target.write("* {0}_\n".format(m))


def print_code(outstream, name, module, info=None):
    name_len = len(name)

    outstream.write("\n\n.. _{0}:\n\n{0}\n".format(name))

    idx = 0
    while idx < name_len:
        idx += 1
        outstream.write("*")

    if info:
        outstream.write("\n\n{0}".format(info))

    outstream.write("\n\n.. code-block:: python\n\n")

    for line in inspect.getsourcelines(module)[0]:
        if line.strip():
            outstream.write("    {0}".format(line))
        else:
            outstream.write("{0}".format(line))


print_code(
    target, "PgAdminModule", PgAdminModule,
    """
PgAdminModule is inherited from Flask.Blueprint module.
This module defines a set of methods, properties and attributes,
that every module should implement.
""")

from pgadmin.browser.utils import NodeView

print_code(
    target, "NodeView", NodeView,
    """
The NodeView class exposes basic REST APIs for different operations used by
the pgAdmin Browser. The basic idea has been taken from `Flask's MethodView
<http://flask.pocoo.org/docs/1.0/api/#flask.views.MethodView>`_ class. Because
we need a lot more operations (not, just CRUD), we can not use it directly.""")

from pgadmin.utils.driver.abstract import BaseDriver, BaseConnection

print_code(target, "BaseDriver", BaseDriver)
print_code(target, "BaseConnection", BaseConnection)
