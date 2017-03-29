#!/usr/bin/env python

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# config.py - Core application configuration settings
#
##########################################################################

"""Minimises CSS and JS files found under the given directory"""

import argparse
import os
from rcssmin import cssmin
from rjsmin import jsmin

parser = argparse.ArgumentParser()
parser.add_argument("directory",
                    help="the directory to minimise recursively")
args = parser.parse_args()

def minimise(dummy, dirname, filesindir):
    """
    Minimises any .js or .css files found
    Args:
        dummy: unused
        dirname: the directory in which to minimise files
        filesindir: lists the files in the directory
    """
    for fname in filesindir:
        if fname[-4:] == '.css' and fname[-8:] != '.min.css':
            oldfile = os.path.join(dirname, fname)
            newfile = os.path.join(dirname, fname[:-4] + '.min.css')

            print("CSS: Minimising: " + oldfile +
                    " -> " + newfile)

            fp_old = open(oldfile, "rb")
            fp_new = open(newfile, "wb")

            fp_new.write(cssmin(fp_old.read(), keep_bang_comments=False))

            fp_old.close()
            fp_new.close()

        elif fname[-3:] == '.js' and fname[-7:] != '.min.js':
            oldfile = os.path.join(dirname, fname)
            newfile = os.path.join(dirname, fname[:-3] + '.min.js')

            print("JS : Minimising: " + oldfile +
                  " -> " + newfile)

            fp_old = open(oldfile, "rb")
            fp_new = open(newfile, "wb")

            fp_new.write(jsmin(fp_old.read(), keep_bang_comments=False))

            fp_old.close()
            fp_new.close()

os.path.walk(args.directory, minimise, None)
