##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config
import string
import random
import os
import re
import getpass

from pgadmin.utils.validation_utils import validate_email


def user_info_desktop():
    print("NOTE: Configuring authentication for DESKTOP mode.")
    email = config.DESKTOP_USER
    p1 = ''.join([
        random.choice(string.ascii_letters + string.digits)
        for _ in range(32)
    ])
    return email, p1


def user_info_server():
    print("NOTE: Configuring authentication for SERVER mode.\n")

    if all(value in os.environ for value in
           ['PGADMIN_SETUP_EMAIL', 'PGADMIN_SETUP_PASSWORD']):
        email = ''
        p1 = ''
        if os.environ['PGADMIN_SETUP_EMAIL'] \
                and os.environ['PGADMIN_SETUP_PASSWORD']:
            email = os.environ['PGADMIN_SETUP_EMAIL']
            p1 = os.environ['PGADMIN_SETUP_PASSWORD']
    else:
        # Prompt the user for their default username and password.
        print(
            "Enter the email address and password to use for the initial "
            "pgAdmin user account:\n"
        )

        email = input("Email address: ")
        while not validate_email(email):
            print('Invalid email address. Please try again.')
            email = input("Email address: ")

        def pprompt():
            return getpass.getpass(), getpass.getpass('Retype password:')

        p1, p2 = pprompt()
        while p1 != p2 or len(p1) < 6:
            if p1 != p2:
                print('Passwords do not match. Please try again.')
            else:
                print(
                    'Password must be at least 6 characters. '
                    'Please try again.'
                )
            p1, p2 = pprompt()

    return email, p1


def user_info():
    if config.SERVER_MODE is False:
        email, p1 = user_info_desktop()
    else:
        email, p1 = user_info_server()

    return email, p1
