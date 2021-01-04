# -*- coding: utf-8 -*-

##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

# Get the correct version of chromedriver for the version of Chrome on the
# machine and save it to the specified location.

import argparse
import os
import platform
import subprocess
import sys
from urllib.request import urlopen, urlretrieve
from urllib.error import URLError
import zipfile


def read_command_line():
    """Read the command line arguments.

    Returns:
        ArgumentParser: The parsed arguments object
    """
    parser = argparse.ArgumentParser(
        description='Get the correct version of chromedriver for the '
                    'specified Chrome installation and save it.')
    if platform.system() != 'Windows':
        parser.add_argument("chrome", metavar="CHROME",
                            help="the Chrome executable")
    parser.add_argument("directory", metavar="DIRECTORY",
                        help="the directory in which to save chromedriver")

    args = parser.parse_args()

    return args


def get_chrome_version(args):
    """Get the Chrome version number.

    Args:
        args: The parsed arguments object
    Returns:
        The Chrome version number
    """
    if platform.system() == 'Windows':
        # On Windows we need to examine the resource section of the binary
        import winreg

        def _read_registry(root, key, value):
            try:
                hkey = winreg.OpenKey(root, key)
            except Exception:
                return None
            try:
                (val, typ) = winreg.QueryValueEx(hkey, value)
            except Exception:
                winreg.CloseKey(hkey)
                return None

            winreg.CloseKey(hkey)
            return val

        key = r'SOFTWARE\Google\Chrome\BLBeacon'
        version_str = _read_registry(winreg.HKEY_CURRENT_USER, key, 'Version')

        # On a 64b host, look for a 32b installation
        if not version_str:
            key = r'SOFTWARE\Wow6432Node\Google\Chrome\BLBeacon'
            version_str = _read_registry(winreg.HKEY_CURRENT_USER, key,
                                         'Version')

        if not version_str:
            print('The Chrome version could not be read from the registry.')
            sys.exit(1)

        chrome_version = '.'.join(version_str.split()[-1].split('.')[:-1])
    else:
        # On Linux/Mac we run the Chrome executable with the --version flag,
        # then parse the output.
        try:
            result = subprocess.Popen([args.chrome, '--version'],
                                      stdout=subprocess.PIPE)
        except FileNotFoundError:
            print('The specified Chrome executable could not be found.')
            sys.exit(1)

        version_str = result.stdout.read().decode("utf-8")
        # Check for 'Chrom' not 'Chrome' in case the user is using Chromium.
        if "Chrom" not in version_str:
            print('The specified Chrome executable output an unexpected '
                  'version string: {}.'.format(version_str))
            sys.exit(1)
        # On some linux distro `chrome--version` gives output like
        # 'Google Chrome 80.0.3987.132 unknown\n'
        # so we need to check and remove the unknown string from the version
        if version_str.endswith("unknown\n"):
            version_str = version_str.strip("unknown\n").strip()

        chrome_version = '.'.join(version_str.split()[-1].split('.')[:-1])

    if chrome_version.count('.') != 2:
        print('The specified Chrome executable output an unexpected '
              'version string: {}.'.format(version_str))
        sys.exit(1)

    return chrome_version


def get_chromedriver_version(chrome_version):
    """Get the required chromedriver version number.

    Args:
        chrome_version: The chrome version number
    Returns:
        The chromedriver version number
    """
    url = 'https://chromedriver.storage.googleapis.com/LATEST_RELEASE_{}' \
        .format(chrome_version)

    try:
        fp = urlopen(url)
    except URLError as e:
        print('The chromedriver catalog URL could not be accessed: {}'
              .format(e))
        sys.exit(1)

    version = fp.read().decode("utf-8").strip()
    fp.close()

    return version


def get_system():
    """Get the system name as known to chromedriver

    Returns:
        The system name
    """
    if platform.system() == 'Darwin':
        return 'mac64'
    elif platform.system() == 'Linux':
        return 'linux64'
    elif platform.system() == 'Windows':
        return 'win32'
    else:
        print("Unknown or unsupported operating system: {}"
              .format(platform.system()))
        sys.exit(1)


"""The core structure of the app."""

# Read the command line options
args = read_command_line()

chrome_version = get_chrome_version(args)

# Check the directory exists
if not os.path.isdir(args.directory):
    print('The specified output directory could not be accessed.')
    sys.exit(1)

chromedriver_version = get_chromedriver_version(chrome_version)

system = get_system()

url = 'https://chromedriver.storage.googleapis.com/{}/chromedriver_{}.zip' \
    .format(chromedriver_version, system)

print('Downloading chromedriver v{} for Chrome v{} on {}...'
      .format(chromedriver_version, chrome_version, system))

try:
    file, headers = urlretrieve(url)
except URLError as e:
    print('The chromedriver download URL could not be accessed: {}'
          .format(e))
    sys.exit(1)

# Unzip chromedriver
print('Extracting chromedriver...')

found = False
fp = open(file, 'rb')
z = zipfile.ZipFile(fp)
for name in z.namelist():
    if (system == 'win32' and name == 'chromedriver.exe') or \
            (system != 'win32' and name == 'chromedriver'):
        z.extract(name, args.directory)
        found = True
fp.close()

if not found:
    print("chromedriver could not be found in the downloaded archive: {}"
          .format(file))
    sys.exit(1)

# Set the permissions
if system == 'mac64' or system == 'linux64':
    os.chmod(os.path.join(args.directory, 'chromedriver'), 0o755)

print('Chromedriver downloaded to: {}'.format(args.directory))
