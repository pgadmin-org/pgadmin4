##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from email_validator import validate_email as email_validate, \
    EmailNotValidError
import config


def validate_email(email):
    try:
        # Validate.
        valid = email_validate(
            email, check_deliverability=config.CHECK_EMAIL_DELIVERABILITY)

        # Update with the normalized form.
        return True
    except EmailNotValidError as e:
        # email is not valid, exception message is human-readable
        print(str(e))
        return False
