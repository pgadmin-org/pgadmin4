##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from email_validator import validate_email as email_validate, \
    EmailNotValidError


def validate_email(email, check_email_deliverability=None):
    try:
        if check_email_deliverability is None:
            import config
            check_email_deliverability = config.CHECK_EMAIL_DELIVERABILITY

        # Validate.
        _ = email_validate(
            email, check_deliverability=check_email_deliverability)

        # Update with the normalized form.
        return True
    except EmailNotValidError as e:
        # email is not valid, exception message is human-readable
        print(str(e))
        return False
