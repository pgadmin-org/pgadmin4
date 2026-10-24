##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Remove files that pgAdmin never uses from an installed Python
environment, to reduce the size of the packages.

Usage: python3 prune_site_packages.py <directory>

The directory is searched recursively, so it may be a venv, a Python
framework or a site-packages directory. The build fails if a file that is
kept cannot be found, rather than shipping a package that cannot work.
"""

import ast
import fnmatch
import os
import re
import shutil
import sys

CONFIG_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..',
                         'web', 'config.py')


def languages():
    """Return the language codes of the translations pgAdmin has, from the
    keys of LANGUAGES in web/config.py, without the territory or script
    (e.g. 'zh' for 'zh_Hans_CN'). The file is parsed rather than imported,
    as importing it needs pgAdmin's own modules."""
    with open(CONFIG_PY, encoding='utf-8') as f:
        tree = ast.parse(f.read(), CONFIG_PY)

    for node in tree.body:
        if isinstance(node, ast.Assign) and \
                any(isinstance(t, ast.Name) and t.id == 'LANGUAGES'
                    for t in node.targets):
            return sorted({code.split('_')[0]
                           for code in ast.literal_eval(node.value)})

    sys.exit('ERROR: LANGUAGES was not found in {}'.format(CONFIG_PY))


# Each entry maps a directory to the files in it that may be removed, and
# the patterns for the ones to keep. Every keep pattern must match at least
# one file.
PRUNE = {
    # google-api-python-client bundles the discovery document of every
    # Google API (600 or so files, over 100MB), and discovery.build() reads
    # them from there rather than fetching them. pgAdmin only builds the
    # services below; see the *_api_version attributes in
    # web/pgadmin/misc/cloud/google/__init__.py and the discovery.build()
    # calls in web/pgacloud/providers/google.py, which must be kept in step
    # with this list.
    os.path.join('googleapiclient', 'discovery_cache', 'documents'): (
        '*.json', [
            'cloudresourcemanager.v1.json',
            'compute.v1.json',
            'sqladmin.v1.json',
            'sqladmin.v1beta4.json',
        ]),

    # Babel carries CLDR data for over 1,000 locales (about 29MB), and only
    # loads the user's locale and its parents, down to root. Keeping every
    # territory and script variant of each language covers the parents.
    os.path.join('babel', 'locale-data'): (
        '*.dat',
        ['root.dat'] +
        ['{}{}.dat'.format(lang, suffix)
         for lang in languages() for suffix in ('', '_*')]),
}

# Packaging tools that are needed to build the environment but not to run
# pgAdmin. Each is removed from any site-packages directory it is found in.
DISTRIBUTIONS = ['pip', 'setuptools', 'wheel']

# A module-level import of pkg_resources, which setuptools provides. Imports
# inside a function or a try block are indented, and are either lazy or
# guarded against it being missing.
PKG_RESOURCES_IMPORT = re.compile(r'^(?:import|from)[ \t]+pkg_resources\b',
                                  re.MULTILINE)


def pkg_resources_users(site_packages):
    """Return the modules in site_packages, other than the packaging tools'
    own and tests, that import pkg_resources when they are loaded. On Python
    3.9, passlib 1.7.4 does, so setuptools must be kept there (#9829)."""
    own = {'pip', 'setuptools', 'pkg_resources', '_distutils_hack', 'wheel'}
    users = []

    for dirpath, dirnames, filenames in os.walk(site_packages):
        if dirpath == site_packages:
            dirnames[:] = [d for d in dirnames if d not in own]
        dirnames[:] = [d for d in dirnames if d not in ('test', 'tests')]
        for filename in fnmatch.filter(filenames, '*.py'):
            path = os.path.join(dirpath, filename)
            with open(path, encoding='utf-8', errors='replace') as f:
                if PKG_RESOURCES_IMPORT.search(f.read()):
                    users.append(os.path.relpath(path, site_packages))

    return sorted(users)


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


def _tree_size(path):
    return sum(os.path.getsize(os.path.join(dirpath, filename))
               for dirpath, _, filenames in os.walk(path)
               for filename in filenames)


def uninstall(site_packages, dist_info, root):
    """Remove the files listed in a distribution's RECORD, as pip uninstall
    would, and return the number of bytes freed. Files outside root, such as
    the scripts in a Windows venv when only site-packages is being pruned,
    are left alone."""
    root = os.path.abspath(root)
    saved = 0
    packages = set()

    # Read the whole of RECORD first, as it lists itself, and Windows cannot
    # remove a file that is still open.
    with open(os.path.join(site_packages, dist_info, 'RECORD'),
              encoding='utf-8') as f:
        lines = f.readlines()

    for line in lines:
        relpath = line.rsplit(',', 2)[0]
        if not relpath:
            continue
        path = os.path.abspath(os.path.join(site_packages, relpath))
        if os.path.commonpath([root, path]) != root:
            continue
        if os.sep in os.path.normpath(relpath) and \
                not relpath.startswith('..'):
            packages.add(os.path.normpath(relpath).split(os.sep)[0])
        if os.path.isfile(path) or os.path.islink(path):
            saved += os.path.getsize(path)
            os.remove(path)

    # Remove the package directories too, including any bytecode compiled
    # after installation, which RECORD does not list.
    for package in packages:
        path = os.path.join(site_packages, package)
        if os.path.isdir(path):
            saved += _tree_size(path)
            shutil.rmtree(path)

    return saved


def prune(root):
    found = set()
    saved = 0
    removed = []

    for dirpath, dirnames, _ in os.walk(root):
        for subdir, (removable, keep) in PRUNE.items():
            if dirpath.endswith(os.sep + subdir):
                found.add(subdir)
                saved += prune_dir(dirpath, removable, keep)

        if os.path.basename(dirpath) == 'site-packages':
            users = pkg_resources_users(dirpath)
            for name in DISTRIBUTIONS:
                if name == 'setuptools' and users:
                    print('Keeping setuptools, as pkg_resources is imported '
                          'by {}'.format(', '.join(users)))
                    continue
                for dist_info in fnmatch.filter(dirnames,
                                                name + '-*.dist-info'):
                    saved += uninstall(dirpath, dist_info, root)
                    removed.append(dist_info[:-len('.dist-info')])
            dirnames[:] = [d for d in dirnames
                           if os.path.isdir(os.path.join(dirpath, d))]

    for subdir in set(PRUNE) - found:
        sys.exit('ERROR: {} was not found under {}'.format(subdir, root))

    if removed:
        print('Removed {}'.format(', '.join(sorted(removed))))
    print('Pruned {:.1f}MB of unused files from {}'.format(
        saved / 1024 / 1024, root))


if __name__ == '__main__':
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        sys.exit('Usage: {} <directory>'.format(sys.argv[0]))

    prune(sys.argv[1])
