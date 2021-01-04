# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# This utility will allow us to change the copyright year information from
# all the files present in FILE_EXTENSIONS variable at once

import os
import sys
import re
import codecs

ALLOWED_FILE_EXTENSIONS = (
    ".py", ".js", ".sql", ".cpp", ".h", ".rc", ".am", ".wsgi", ".pro",
    ".plist", ".rst", ".sh", ".in", ".mako", ".ini", ".jsx", ".rtf", ".rst",
    "LICENSE"
)

EXCLUDE_DIR = ("node_modules")


# Filter the files by its extension
def is_code_file(filename, extensions=ALLOWED_FILE_EXTENSIONS):
    return any(filename.endswith(e) for e in extensions)


# Main function which will iterate and replace the copyright year
def find_replace(directory, find, replace):
    total = 0
    COPYRIGHT_PATTERN = re.compile(
        r'(Copyright \(C\) \d{{4}} - ){0},'.format(find)
    )
    failed = []

    for path, dirs, files in os.walk(os.path.abspath(directory), topdown=True):
        # Exclude the specified directory
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIR]

        for filename in filter(is_code_file, files):
            current_file = os.path.join(path, filename)
            print(
                "Updating copyright in {0}... ".format(
                    current_file
                ), end=''
            )

            try:
                # Read the file
                with codecs.open(current_file, "r", "latin-1") as fp:
                    content = fp.read()

                is_update_required = False
                new_content = COPYRIGHT_PATTERN.sub(
                    r'\g<1>{},'.format(replace), content
                )
                if new_content != content:
                    is_update_required = True

                if is_update_required:
                    with codecs.open(current_file, "w", "latin-1") as fp:
                        fp.write(new_content)

                    total += 1
                    print("Done")
                else:
                    print("N/A")
            except Exception:
                failed.append(current_file)
                print("FAILED")

    return failed, total


def help():
    print("\nInvalid command line options. Usage:")
    print("\t{0} <year to find> <year to replace>".format(sys.argv[0]))
    print("\tExample: {0} 2018 2019\n".format(sys.argv[0]))
    exit(1)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        help()

    if not sys.argv[1].isdigit() or not sys.argv[2].isdigit():
        help()

    # Search and Replace the Copyright information from Parent folder
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    failed, files_affected = find_replace(parent_dir, sys.argv[1], sys.argv[2])

    if len(failed) > 0:
        print("Failed to process the following files:\n", "\n\t".join(failed))

    print("\nUpdated {} files.".format(files_affected))
