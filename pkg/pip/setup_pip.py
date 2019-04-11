#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2019, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import os
import sys

from setuptools import setup
from codecs import open

if sys.version_info[0] >= 3:
    import builtins
else:
    import __builtin__ as builtins

# Ensure the global server mode is set.
builtins.SERVER_MODE = None

"""This script helps to generate PIP packages"""

# Get the requirements list for the current version of Python
req_file = '../requirements.txt'

with open(req_file, 'r') as reqf:
    if sys.version_info[0] >= 3:
        required = reqf.read().splitlines()
    else:
        required = reqf.read().decode("utf-8").splitlines()

# Remove any requirements with environment specifiers. These
# must be explicitly listed in extras_require below.
for index, req in enumerate(required):
    if ";" in req or req.startswith("#") or req == "":
        required.remove(req)
        continue

    # Ensure the Wheel will use psycopg2-binary, not the source distro
    if 'psycopg2' in req:
        required[index] = req.replace('psycopg2', 'psycopg2-binary')

# Get the app version
if sys.version_info[:2] >= (3, 3):
    from importlib.machinery import SourceFileLoader

    def load_source(name, path):
        if not os.path.exists(path):
            print("ERROR: Could not find %s" % path)
            sys.exit(1)

        return SourceFileLoader(name, path).load_module()
else:
    import imp

    def load_source(name, path):
        if not os.path.exists(path):
            print("ERROR: Could not find %s" % path)
            sys.exit(1)

        return imp.load_source(name, path)

modl = load_source('APP_VERSION', '../web/config.py')

setup(
    name='pgadmin4',

    version=modl.APP_VERSION,

    description='PostgreSQL Tools',
    long_description='Administration and management tools for '
                     'the PostgreSQL database.',

    url='https://www.pgadmin.org/',

    author='The pgAdmin Development Team',
    author_email='pgadmin-hackers@postgresql.org',

    license='PostgreSQL Licence',

    # See https://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        'Development Status :: 5 - Production/Stable',

        # Supported programming languages
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7'
    ],

    keywords='pgadmin4,postgresql,postgres',

    packages=["pgadmin4"],

    include_package_data=True,

    install_requires=required,

    entry_points={
        'console_scripts': ['pgadmin4=pgadmin4.pgAdmin4.__init__:main'],
    },

)
