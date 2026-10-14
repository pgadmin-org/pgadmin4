##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Remove data files that pgAdmin never uses from an installed Python
environment, to reduce the size of the packages.

Usage: python3 prune_site_packages.py <directory>

The directory is searched recursively, so it may be a venv, a Python
framework or a site-packages directory. The build fails if a file that is
kept cannot be found, rather than shipping a package that cannot work.
"""

import fnmatch
import os
import sys

# The languages pgAdmin has translations for, from LANGUAGES in
# web/config.py, which must be kept in step with this list.
LANGUAGES = ['cs', 'de', 'en', 'es', 'fr', 'id', 'it', 'ja', 'ko', 'pl', 'pt',
             'ru', 'sv', 'zh']

# Each entry maps a directory to the files in it that may be removed, and
# the patterns for the ones to keep. Every keep pattern must match at least
# one file.
PRUNE = {
    # google-api-python-client bundles the discovery document of every
    # Google API (600 or so files, over 100MB), and discovery.build() reads
    # them from there rather than fetching them. pgAdmin only builds the
    # services below; see the *_api_version attributes in
    # web/pgadmin/misc/cloud/google/__init__.py, which must be kept in step
    # with this list.
    os.path.join('googleapiclient', 'discovery_cache', 'documents'): (
        '*.json', [
            'cloudresourcemanager.v1.json',
            'compute.v1.json',
            'sqladmin.v1.json',
        ]),

    # Babel carries CLDR data for over 1,000 locales (about 29MB), and only
    # loads the user's locale and its parents, down to root. Keeping every
    # territory and script variant of each language covers the parents.
    os.path.join('babel', 'locale-data'): (
        '*.dat',
        ['root.dat'] +
        ['{}{}.dat'.format(lang, suffix)
         for lang in LANGUAGES for suffix in ('', '_*')]),
}


def prune_dir(dirpath, removable, keep):
    """Remove the files in dirpath matching removable but none of the keep
    patterns, and return the number of bytes freed."""
    filenames = os.listdir(dirpath)

    missing = [pattern for pattern in keep
               if not fnmatch.filter(filenames, pattern)]
    if missing:
        sys.exit('ERROR: {} is missing from {}'.format(
            ', '.join(missing), dirpath))

    saved = 0
    for filename in fnmatch.filter(filenames, removable):
        if any(fnmatch.fnmatch(filename, pattern) for pattern in keep):
            continue
        path = os.path.join(dirpath, filename)
        saved += os.path.getsize(path)
        os.remove(path)

    return saved


def prune(root):
    found = set()
    saved = 0

    for dirpath, _, _ in os.walk(root):
        for subdir, (removable, keep) in PRUNE.items():
            if dirpath.endswith(os.sep + subdir):
                found.add(subdir)
                saved += prune_dir(dirpath, removable, keep)

    for subdir in set(PRUNE) - found:
        sys.exit('ERROR: {} was not found under {}'.format(subdir, root))

    print('Pruned {:.1f}MB of unused files from {}'.format(
        saved / 1024 / 1024, root))


if __name__ == '__main__':
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        sys.exit('Usage: {} <directory>'.format(sys.argv[0]))

    prune(sys.argv[1])
