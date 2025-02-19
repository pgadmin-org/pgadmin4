# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# Get the URL to the latest version of a package in a StackBuilder catalog

import os
import sys

from urllib.request import urlopen, urlretrieve
import xml.etree.ElementTree as ET

if len(sys.argv) != 4:
    print('Usage: {} <Catalog URL> <Application ID> <Platform>'.
          format(sys.argv[0]))
    sys.exit(1)

# Get the catalog
catalog = urlopen(sys.argv[1]).read().decode('utf-8')
apps = ET.fromstring(catalog)

downloads = []
for a in apps:
    if a.find('id').text == sys.argv[2] and \
            a.find('platform').text == sys.argv[3]:
        downloads.append({'version': a.find('version').text,
                          'url': a.find('alturl').text,
                          'format': a.find('format').text})

if len(downloads) == 0:
    print('No matching URLs found.')
    sys.exit(1)

# Make sure we're looking at the latest version
downloads = sorted(downloads, key=lambda d: d['version'], reverse=True)

# Get the file
filename, headers = urlretrieve(downloads[0]['url'])

if sys.argv[3].startswith('windows') and downloads[0]['format'] == 'exe':
    os.rename(filename, '{}.exe'.format(filename))
    filename = '{}.exe'.format(filename)

print(filename)
