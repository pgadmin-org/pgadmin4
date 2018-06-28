#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import imp

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
req_file='../requirements.txt'

with open(req_file, 'r') as reqf:
    if sys.version_info[0] >= 3:
        required = reqf.read().splitlines()
    else:
        required = reqf.read().decode("utf-8").splitlines()

# Remove any requirements with environment specifiers. These
# must be explicitly listed in extras_require below.
for req in required:
    if ";" in req:
        required.remove(req)

# Get the app version
modl = imp.load_source('APP_VERSION', '../web/config.py')

setup(
    name='pgadmin4',

    version=modl.APP_VERSION,

    description='PostgreSQL Tools',
    long_description='Administration and management tools for the PostgreSQL database.',

    url='https://www.pgadmin.org/',

    # Author details
    author='The pgAdmin Development Team',
    author_email='pgadmin-hackers@postgresql.org',

    # Choose your license
    license='PostgreSQL Licence',

    # See https://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
    #   3 - Alpha
    #   4 - Beta
    #   5 - Production/Stable
    'Development Status :: 5 - Production/Stable',

    # Supported programming languages
    'Programming Language :: Python :: 2.6',
    'Programming Language :: Python :: 2.7',
    'Programming Language :: Python :: 3.3',
    'Programming Language :: Python :: 3.4',
    'Programming Language :: Python :: 3.5',
    'Programming Language :: Python :: 3.6'
],

    keywords='pgadmin4,postgresql,postgres',

    # Specify package names here.
    packages=["pgadmin4",],

    # To include additional files within the package
    include_package_data=True,

    install_requires=required,

    extras_require={
        # ...
        ":python_version<'2.7'": [
            "psycopg2==2.7.3.2",
            "Flask-Script==2.0.5",
            "ordereddict",
            "python-dateutil==2.5.0",
            "SQLAlchemy==1.0.14",
            "Flask-Security==1.7.5",
            "Flask-BabelEx==0.9.3"
        ],
        ":python_version<='2.7'": [
            "backports.csv==1.0.5",
            "importlib==1.0.3"
        ],
        ":python_version>='2.7'": [
            "psycopg2>=2.7.4",
            "python-dateutil>=2.7.1",
            "htmlmin==0.1.12",
            "Flask-HTMLmin==1.3.2",
            "SQLAlchemy>=1.2.5",
            "Flask-Security>=3.0.0",
            "sshtunnel>=0.1.3"
        ]
    },

    # Specify data files to be included. For Python 2.6 include them in MANIFEST.in
    ##package_data="",

    # To package data files outside package directory.
    ##data_files=,

    # 'scripts' keyword is used to provide executable scripts. It provides cross-platform support.
    ##entry_points=,

)
