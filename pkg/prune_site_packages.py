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

import os
import sys

# google-api-python-client bundles the discovery document of every Google
# API (600 or so files, over 100MB), and discovery.build() reads them from
# there rather than fetching them. pgAdmin only builds the services below;
# see the *_api_version attributes in web/pgadmin/misc/cloud/google/
# __init__.py, which must be kept in step with this list.
PRUNE = {
    os.path.join('googleapiclient', 'discovery_cache', 'documents'): {
        'cloudresourcemanager.v1.json',
        'compute.v1.json',
        'sqladmin.v1.json',
    },
}


def prune(root):
    found = set()
    saved = 0

    for dirpath, _, filenames in os.walk(root):
        for subdir, keep in PRUNE.items():
            if not dirpath.endswith(os.sep + subdir):
                continue

            missing = keep - set(filenames)
            if missing:
                sys.exit('ERROR: {} is missing from {}'.format(
                    ', '.join(sorted(missing)), dirpath))

            found.add(subdir)
            for filename in set(filenames) - keep:
                path = os.path.join(dirpath, filename)
                saved += os.path.getsize(path)
                os.remove(path)

    for subdir in set(PRUNE) - found:
        sys.exit('ERROR: {} was not found under {}'.format(subdir, root))

    print('Pruned {:.1f}MB of unused files from {}'.format(
        saved / 1024 / 1024, root))


if __name__ == '__main__':
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        sys.exit('Usage: {} <directory>'.format(sys.argv[0]))

    prune(sys.argv[1])
