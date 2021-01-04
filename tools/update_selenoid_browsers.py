##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
# #########################################################################
# Updates browser images(selenoid-docker) depending on arguments passed while
# running this script.
# e.g. --chrome /usr/bin/google-chrome --firefox /usr/bin/firefox
# Access details about switches using help
# e.g. --help

import argparse
import os
import subprocess
import sys
import traceback
import requests
import json


def read_command_line():
    """Read the command line arguments.
    Returns:
        ArgumentParser: The parsed arguments object

    """
    parser = argparse.ArgumentParser(
        description='Get latest browser images(chrome & firefox) for selenoid.'
                    'e.g. - --chrome /usr/bin/google-chrome --firefox '
                    '/usr/bin/firefox')
    parser.add_argument("--chrome", metavar="CHROME",
                        help="the Chrome executable path")
    parser.add_argument("--firefox", metavar="FIREFOX",
                        help="the firefox executable path")
    args_val = parser.parse_args()
    return args_val


def get_browser_version(browser_name, executable_path):
    """
    Function returns browser version for specified browser using executable
    path passed in arguments.
    :param browser_name:
    :param executable_path: e.g. /usr/bin/firefox
    :return: browser version
    """
    # On Linux/Mac we run the browser executable with the --version flag,
    # then parse the output.
    browser_version_val = None
    try:
        result = subprocess.Popen([executable_path, '--version'],
                                  stdout=subprocess.PIPE)
    except FileNotFoundError:
        print('The specified browser executable could not be found.')
        sys.exit(1)

    version_str = result.stdout.read().decode("utf-8")

    if browser_name.lower() == "chrome":
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

        chrome_version = '.'.join(version_str.split()[-1].split('.')[:-2])

        # Make sure browser version has only 1 decimal point
        if chrome_version.count('.') != 1:
            print('The specified Chrome executable output an unexpected '
                  'version string: {}.'.format(version_str))
            sys.exit(1)
        browser_version_val = chrome_version
    elif browser_name.lower() == "firefox":
        if "Firefox" not in version_str:
            print('The specified Firefox executable output an unexpected '
                  'version string: {}.'.format(version_str))
            sys.exit(1)

        # Some time firefox --version gives output like
        # 'Running without a11y support!
        # Mozilla Firefox 68.7.0esr'
        # Other output - [root@localhost local]# /usr/bin/firefox --version
        # Mozilla Firefox 75.0
        if 'esr' in version_str:
            firefox_version = '.'.join(
                version_str.split('esr')[0].split()[-1].split('.')[:-1])
        else:
            firefox_version = '.'.join(
                version_str.split()[-1].split('.')[:-1])

        if firefox_version.count('.') == 0:
            firefox_version = firefox_version + '.0'

        # Make sure browser version has only 1 decimal point
        if firefox_version.count('.') != 1:
            print('The specified Firefox executable output an unexpected '
                  'version string: {}.'.format(version_str))
            sys.exit(1)
        browser_version_val = firefox_version
    else:
        print("{0} is not recognised ".format(browser_name))
        sys.exit(1)
    return browser_version_val


def check_and_download_vnc_browser_image(browser_name, browser_version):
    """
    Function checks presence for vnc images for passed browser
    at docker.io/selenoid/ registry
    :param browser_name:
    :param browser_version:
    :return:true if browser image is available & downloaded else false
    """
    res = requests.get(
        'https://registry.hub.docker.com/v2/repositories/selenoid/vnc_' +
        browser_name + '/tags/')
    res = res.json()
    version_tag = []
    if len(res['results']) > 0:
        for result in res['results']:
            if 'name' in result:
                version_tag.append(result['name'])
    vnc_image_available = False
    image_name = 'vnc_' + browser_name + ':' + browser_version

    for idx, tag in enumerate(version_tag):
        if browser_version == tag:
            command = 'docker pull selenoid/vnc_' + browser_name + ':' \
                      + browser_version
            print(' VNC image is available & downloading now... {0}'.format(
                command))
            try:
                subprocess.call([command], shell=True, stdout=subprocess.PIPE)
                vnc_image_available = True
            except Exception:
                traceback.print_exc(file=sys.stderr)
                print(
                    '{0} Image found but could not be downloaded.'.
                    format(command))
                sys.exit(1)
            break
        elif idx == len(version_tag):
            print("{0} Image is not available.".format(image_name))
            vnc_image_available = False

    return vnc_image_available


def reload_selenoid_config():
    """
    Function runs command to refresh selenoid configuration
    :return: true if command execution for selenoid reload is successful
    else false
    """
    command = 'docker kill -s HUP selenoid'
    reload_successful = False
    try:
        subprocess.call([command], shell=True, stdout=subprocess.PIPE)
        print(" Selenoid Configuration is reloaded.")
        reload_successful = True
    except Exception:
        traceback.print_exc(file=sys.stderr)
        print('Error while reloading selenoid configuration.')
        sys.exit(1)
    return reload_successful


def edit_browsers_json(browser_name, browser_version):
    """
    Function edits browsers.json which is used by selenoid to
    load browser configuration.
    Default path for this file is
    "user_home_dir + '/.aerokube/selenoid/browsers.json'"
    Currently this is hardcoded, might need to modify
    if we want to pass customize browsers.json
    :param browser_name:
    :param browser_version:
    :return:
    """
    file_edited = True
    # Read existing browsers.json
    json_file = open(file_path, 'r')
    existing_data = json.load(json_file)
    updated_data = None

    # Update data for new browser images
    if browser_name.lower() == 'chrome':
        version_data = existing_data['chrome']['versions']
        if browser_version in version_data.keys():
            print(" {0}:{1} is already updated in browsers.json.".format(
                browser_name, browser_version))
            file_edited = True
        else:
            data_to_insert = dict(
                {browser_version: {
                    'image': 'selenoid/vnc_chrome:' + browser_version,
                    'port': '4444', 'path': '/'}})
            (existing_data['chrome']['versions']).update(data_to_insert)
            updated_data = existing_data
            print(updated_data)

    elif browser_name.lower() == 'firefox':
        version_data = existing_data['firefox']['versions']
        if browser_version in version_data.keys():
            print(" {0}:{1} is already updated in browsers.json.".format(
                browser_name, browser_version))
            file_edited = True
        else:
            data_to_insert = dict(
                {browser_version: {
                    'image': 'selenoid/vnc_firefox:' + browser_version,
                    'port': '4444', 'path': '/wd/hub'}})
            (existing_data['firefox']['versions']).update(data_to_insert)
            updated_data = existing_data
    else:
        print("Browser version not matched")
        file_edited = False

    # Write updated data in browsers.json
    if updated_data is not None:
        json_file = open(file_path, 'w')
        json.dump(updated_data, json_file)
        print(" 'browsers.json' is updated for {0} {1}".format(
            browser_name, browser_version))

        file_edited = True
    return file_edited


# Main Program starts here
# Read command line arguments & get list of browser_name, executable path.
args = vars(read_command_line())

# Get path path for browsers.json
user_home_dir = os.getenv("HOME")
file_path = user_home_dir + '/.aerokube/selenoid/browsers.json'
print("***** Updating '{0}' for new browser versions.*****".format(file_path))

# Iterate over arguments passed
for browser, executable_path in args.items():
    if executable_path is not None:
        # Get browser name
        browser_name = browser
        # Get browser version
        browser_version = get_browser_version(browser, executable_path)
        print(
            " Browser version for {0} is {1} in current executable path ".
            format(browser_name, browser_version))

        # Download vnc browser image.
        download_new_image = check_and_download_vnc_browser_image(
            browser_name, browser_version)

        # If browser vnc image is available, then edit browsers.json
        if download_new_image:
            if edit_browsers_json(browser_name, browser_version):
                print(
                    " File 'browsers.json' is updated for {0} - {1} \n".format(
                        browser_name, browser_version))
            else:
                print(
                    " File 'browsers.json' can NOT be updated for {0} - {1} \n"
                    .format(browser_name, browser_version))
        else:
            print(" Browser image is not available for {0}, {1}".format(
                browser_name, browser_version))

# Reload selenoid configuration
if reload_selenoid_config():
    print(
        "***** Updated '{0}' for new browser versions.*****".format(file_path))
