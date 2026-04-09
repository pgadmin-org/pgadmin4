##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

"""Test the preferences functionality in Explain Tensor module."""
import unittest
from unittest.mock import patch, MagicMock
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.expl_tensor import MODULE_NAME


class TestPreferencesFunctionality(BaseTestGenerator):
    """Test the preferences functionality."""

    scenarios = [
        ('Test getting preference value successfully', dict(
            pref_return_value='https://explain.tensor.ru',
            expected_result='https://explain.tensor.ru',
            exception=None
        )),
        ('Test getting empty preference value', dict(
            pref_return_value='',
            expected_result=None,
            exception=None
        )),
        ('Test getting preference value with exception', dict(
            pref_return_value=None,
            expected_result=None,
            exception=Exception("Preference module not found")
        ))
    ]

    def runTest(self):
        """Run test case"""
        mock_app = MagicMock()
        mock_app.logger = MagicMock()
        with patch('pgadmin.tools.expl_tensor.Preferences') as mock_prefs, \
              patch('pgadmin.tools.expl_tensor.current_app', mock_app):

            if self.exception:
                mock_prefs.module.side_effect = self.exception
            else:
                mock_module = MagicMock()
                mock_pref = MagicMock()
                mock_pref.get.return_value = self.pref_return_value
                mock_module.preference.return_value = mock_pref
                mock_prefs.module.return_value = mock_module

            from pgadmin.tools.expl_tensor import get_preference_value
            result = get_preference_value('explain_tensor_api')
            self.assertEqual(result, self.expected_result)
