##############################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##############################################################################
from unittest.mock import patch
import config

from .utils import setup_mfa_app, MockCurrentUserId, MockUserMFA
from pgadmin.authenticate.mfa.utils import ValidationException


__MFA_PACKAGE = '.'.join((__package__.split('.'))[:-1])
__AUTH_PACKAGE = '.'.join((__package__.split('.'))[:-2])


def check_validation_view_content(test):
    user_mfa_test_data = [
        MockUserMFA(1, "dummy", ""),
        MockUserMFA(1, "no-present-in-list", None),
    ]

    def mock_log_exception(ex):
        test.assertTrue(type(ex) == ValidationException)

    with patch(
        __MFA_PACKAGE + ".utils.current_user", return_value=MockCurrentUserId()
    ):
        with patch(__MFA_PACKAGE + ".utils.UserMFA") as mock_user_mfa:
            with test.app.test_request_context():
                with patch("flask.current_app") as mock_current_app:
                    mock_user_mfa.query.filter_by.return_value \
                        .all.return_value = user_mfa_test_data
                    mock_current_app.logger.exception = mock_log_exception

                    with patch(__AUTH_PACKAGE + ".session") as mock_session:
                        session = {
                            'auth_source_manager': {
                                'current_source': getattr(
                                    test, 'auth_method', 'internal'
                                )
                            }
                        }

                        mock_session.__getitem__.side_effect = \
                            session.__getitem__

                        response = test.tester.get("/mfa/validate")

    test.assertEqual(response.status_code, 200)
    test.assertEqual(
        response.headers["Content-Type"], "text/html; charset=utf-8"
    )
    # test.assertTrue('Dummy' in response.data.decode('utf8'))
    # End of test case - check_validation_view_content


validation_view_scenarios = [
    (
        "Validation view of a MFA method should return a HTML tags",
        dict(start=setup_mfa_app, check=check_validation_view_content),
    ),
]
