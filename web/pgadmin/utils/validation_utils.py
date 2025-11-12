##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import email_validator
from email_validator import validate_email as email_validate, \
    EmailNotValidError


def validate_email(email, email_config=None):
    try:
        if email_config is None:
            email_config = {}
            import config
            email_config['CHECK_EMAIL_DELIVERABILITY'] = \
                config.CHECK_EMAIL_DELIVERABILITY
            email_config['ALLOW_SPECIAL_EMAIL_DOMAINS'] = \
                config.ALLOW_SPECIAL_EMAIL_DOMAINS
            email_config["GLOBALLY_DELIVERABLE"] = \
                config.GLOBALLY_DELIVERABLE

        # Allow special email domains
        if isinstance(email_config['ALLOW_SPECIAL_EMAIL_DOMAINS'], str):
            email_config['ALLOW_SPECIAL_EMAIL_DOMAINS'] = \
                email_config['ALLOW_SPECIAL_EMAIL_DOMAINS'].split(',')

        try:
            email_validator.SPECIAL_USE_DOMAIN_NAMES = [
                d for d in email_validator.SPECIAL_USE_DOMAIN_NAMES
                if d not in email_config['ALLOW_SPECIAL_EMAIL_DOMAINS']
            ]
        except Exception:
            pass

        email_validator.GLOBALLY_DELIVERABLE = \
            email_config["GLOBALLY_DELIVERABLE"]

        # Validate.
        _ = email_validate(
            email,
            check_deliverability=email_config['CHECK_EMAIL_DELIVERABILITY'])

        # Update with the normalized form.
        return True
    except EmailNotValidError as e:
        # email is not valid, exception message is human-readable
        print(str(e))
        return False
