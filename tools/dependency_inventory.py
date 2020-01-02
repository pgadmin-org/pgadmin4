# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# This utility will generate a iist of all dependencies, their upstream
# repos and licence information.

import os
import json
import pkg_resources
import sys
import textwrap

from subprocess import Popen, PIPE

# Column sizes
name_size = 64
version_size = 16
licence_size = 36


def print_title(title):
    print(title)
    print(("=" * len(title)) + "\n")


def print_row(name, version, licence, url):
    print("{} {} {} {}".format(name.ljust(name_size),
                               version.ljust(version_size),
                               licence.ljust(licence_size), url))


def print_table_header():
    print_row("Name", "Version", "Licence", "URL")
    print_row("----", "-------", "-------", "---")


def print_summary(count):
    print("\n{} dependencies listed.\n".format(count))


def get_python_deps():
    # Get the path to the requirements.txt file
    req_file = os.path.realpath(os.path.dirname(os.path.abspath(__file__)) +
                                "/../requirements.txt")

    with open(req_file, 'r') as req_file_p:
        if sys.version_info[0] >= 3:
            required = req_file_p.read().splitlines()
        else:
            required = req_file_p.read().decode("utf-8").splitlines()

    # Get the package info from the requirements file
    requirements = pkg_resources.parse_requirements(required)

    have_unknowns = False
    count = 0

    # Iterate the packages and get the distribution info for each
    for pkg in requirements:

        try:
            distribution = pkg_resources.get_distribution(pkg)
        except IndexError as e:
            # The package probably isn't required on this version of Python,
            # thus we have no info about it.
            have_unknowns = True

            name = pkg.name
            version = "Unknown"

            for spec in pkg.specs:
                if spec[0] == "==":
                    version = spec[1]
                    break

            licence = "Unknown"
            url = "Unknown"
            if pkg.url is not None:
                url = pkg.url

            print_row(name, version, licence, url)
            count = count + 1

            # Next one....
            continue

        try:
            metadata = distribution.get_metadata_lines('METADATA')
        except IOError:
            metadata = distribution.get_metadata_lines('PKG-INFO')

        # Somewhere to store the info we need...
        name = ""
        version = "Unknown"
        url = "Unknown"
        licence = "Unknown"

        # Loop over each line in the metadata and grab the info we need
        for line in metadata:
            if line.startswith("Name: "):
                name = line[6:]

            if line.startswith("Version: "):
                version = line[9:]

            if line.startswith("License: "):
                licence = line[9:]

            if line.startswith("Home-page: "):
                url = line[11:]

        if name != "":
            print_row(name, version, licence, url)
            count = count + 1

    if have_unknowns:
        major = sys.version_info.major
        minor = sys.version_info.minor

        print("")
        print(textwrap.fill("NOTE: This report was generated using "
                            "Python {}.{}. Full information may not be shown "
                            "for Python modules that are not required with "
                            "this version.".format(
                                major, minor), width=79))

    print_summary(count)


def get_js_deps():
    # Get the path to package.json file
    web_dir = os.path.realpath(os.path.dirname(os.path.abspath(__file__)) +
                               "/../web/")

    # Build the Yarn command
    cmd = ["yarn", "--cwd", web_dir, "licenses", "list", "--json"]

    # Run the command
    process = Popen(cmd, stdout=PIPE)
    (output, err) = process.communicate()
    process.wait()

    # Cleanup the output
    output_str = output.splitlines()[-1]
    if hasattr(output_str, 'decode'):
        output_str = output_str.decode('utf-8')
    raw_data = json.loads(output_str)

    modules = raw_data['data']['body']

    # Loop through the modules, and output the data.
    for module in modules:
        name = module[0]

        version = "Unknown"
        if module[1] != "":
            version = module[1]

        licence = "Unknown"
        if module[2] != "":
            licence = module[2]

        url = "Unknown"
        if module[3] != "":
            url = module[3]

            print_row(name, version, licence, url)

    print_summary(len(modules))


def dump_header():
    print_title("pgAdmin 4 Dependency Inventory")

    print(textwrap.fill(
        "pgAdmin 4 is built on C++, Python and Javascript, and is "
        "dependent on various third party libraries. These are "
        "automatically compiled from the system, requirements.txt."
        "and packages.json and list below.",
        width=79) + "\n")


def dump_cplusplus():
    print_title("C++ Dependencies")
    print_table_header()
    print_row("QT", "4.6.2+", "LGPL v2.1/3", "http://www.qt.io/")
    print_row("Python", "2.7/3.4+", "PSF", "https://www.python.org/")
    print_summary(2)


def dump_python():
    print_title("Python Dependencies")
    print_table_header()

    get_python_deps()


def dump_js():
    print_title("Javascript Dependencies")
    print_table_header()

    get_js_deps()


# Let's do this thing!
dump_header()
dump_cplusplus()
dump_python()
dump_js()
