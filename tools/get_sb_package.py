# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# Get the URL to the latest version of a package in a StackBuilder catalog

import os
import sys

from urllib.request import urlopen, urlretrieve
import xml.etree.ElementTree as ET

if len(sys.argv) != 4:
    print('Usage: {} <Catalog URL> <Application ID> <Platform>'.\
          format(sys.argv[0]))
    sys.exit(1)

class Progress:
    def __init__(self):
        self.old_percent = 0

    def download_progress_hook(self, count, blockSize, totalSize):
        percent = int(count * blockSize * 100 / totalSize)
        if percent > self.old_percent:
            self.old_percent = percent
            print('{}%'.format(percent))

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
progress = Progress()
filename, headers = urlretrieve(downloads[0]['url'], reporthook=progress.download_progress_hook)

if sys.argv[3].startswith('windows') and downloads[0]['format'] == 'exe':
    os.rename(filename, '{}.exe'.format(filename))
    filename = '{}.exe'.format(filename)

print(filename)
