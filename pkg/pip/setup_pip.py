#########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import sys
import os
import imp

from setuptools import setup
from codecs import open
from os import path

"""This script is used to help generate PIP packages"""

# Get the requirements list for the current version of Python
req_file='../requirements_py' + str(sys.version_info[0]) + '.txt'

with open(req_file) as reqf:
    if sys.version_info[0] >= 3:
        required = reqf.read().splitlines()
    else:
        required = reqf.read().decode("utf-8").splitlines()

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

    # Suppported Programming Languages
    'Programming Language :: Python :: 2.6',
    'Programming Language :: Python :: 2.7',
    'Programming Language :: Python :: 3',
    'Programming Language :: Python :: 3.2',
    'Programming Language :: Python :: 3.3',
    'Programming Language :: Python :: 3.4',
],

    keywords='pgadmin4,postgresql,postgres',

    # Specify package names here.
    packages=["pgadmin4",],

    # To inclue dditional files into the package
    include_package_data=True,

    install_requires=required,

    ##extras_require=,

    # Specify date files to be included. For Python 2.6 need to include them in MANIFEST.in
    ##package_data="",

    # To package data files outside package directory.
    ##data_files=,

    # 'scripts' keyword is used to provide executable scripts. It provides cross-platform support.
    ##entry_points=,

)
