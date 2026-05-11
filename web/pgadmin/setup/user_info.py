##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import config
import string
import secrets
import os
import getpass
from pgadmin.utils.constants import ENTER_EMAIL_ADDRESS

from pgadmin.utils.validation_utils import validate_email


def user_info_desktop():
    print("NOTE: Configuring authentication for DESKTOP mode.")
    email = config.DESKTOP_USER
    p1 = ''.join([
        secrets.choice(string.ascii_letters + string.digits)
        for _ in range(32)
    ])
    return email, p1


def pprompt():
    return getpass.getpass(), getpass.getpass('Retype password:')


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

        # Bound the retry loop so a non-interactive caller (mocked
        # input(), closed stdin, or a typo'd PGADMIN_SETUP_EMAIL='' that
        # never gets corrected) cannot spin forever printing
        # "Invalid email address.".
        MAX_PROMPT_ATTEMPTS = 5
        email = input(ENTER_EMAIL_ADDRESS)
        attempts = 1
        while not validate_email(email):
            if attempts >= MAX_PROMPT_ATTEMPTS:
                raise RuntimeError(
                    "Failed to obtain a valid email after {} attempts. "
                    "Set PGADMIN_SETUP_EMAIL/PASSWORD env vars when "
                    "running non-interactively.".format(
                        MAX_PROMPT_ATTEMPTS))
            print('Invalid email address. Please try again.')
            email = input(ENTER_EMAIL_ADDRESS)
            attempts += 1

        p1, p2 = pprompt()
        attempts = 1
        while p1 != p2 or len(p1) < config.PASSWORD_LENGTH_MIN:
            if attempts >= MAX_PROMPT_ATTEMPTS:
                raise RuntimeError(
                    "Failed to obtain a valid password after {} attempts. "
                    "Set PGADMIN_SETUP_EMAIL/PASSWORD env vars when "
                    "running non-interactively.".format(
                        MAX_PROMPT_ATTEMPTS))
            if p1 != p2:
                print('Passwords do not match. Please try again.')
            else:
                print(
                    'Password must be at least {} characters. '
                    'Please try again.'.format(config.PASSWORD_LENGTH_MIN)
                )
            p1, p2 = pprompt()
            attempts += 1

    return email, p1


def user_info():
    if config.SERVER_MODE is False:
        email, p1 = user_info_desktop()
    else:
        email, p1 = user_info_server()

    return email, p1
