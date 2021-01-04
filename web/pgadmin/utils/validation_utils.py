##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import re


def validate_email(email):
    if email == '' or email is None:
        return False

    email_filter = re.compile(
        "^[a-zA-Z0-9.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9]"
        "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9]"
        "(?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    )

    if not email_filter.match(email):
        return False

    return True
