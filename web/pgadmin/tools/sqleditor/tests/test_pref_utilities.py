##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.utils.route import BaseTestGenerator
from pgadmin.tools.sqleditor.utils.query_tool_preferences import \
    get_text_representation_of_shortcut


class TestQueryToolPreference(BaseTestGenerator):
    """
    Ensures that we are able to fetch preferences properly
    """
    scenarios = [
        ('Check text representation of a valid shortcuts', dict(
            fetch_pref=True,
            sample_shortcut=dict(
                alt=False,
                shift=False,
                control=False,
                key=dict(
                    char='a',
                    keyCode=65
                )
            ),
            expected_result='a'
        )),

        ('Check text representation of a valid shortcuts', dict(
            fetch_pref=True,
            sample_shortcut=dict(
                alt=True,
                shift=False,
                control=False,
                key=dict(
                    char='a',
                    keyCode=65
                )
            ),
            expected_result='Alt+a'
        )),

        ('Check text representation of a valid shortcuts', dict(
            fetch_pref=True,
            sample_shortcut=dict(
                alt=True,
                shift=True,
                control=True,
                key=dict(
                    char='a',
                    keyCode=65
                )
            ),
            expected_result='Alt+Shift+Ctrl+a'
        )),

        ('Check text representation of a valid shortcuts', dict(
            fetch_pref=True,
            sample_shortcut=dict(
                alt=False,
                shift=True,
                control=False,
                key=dict(
                    char='a',
                    keyCode=65
                )
            ),
            expected_result='Shift+a'
        )),

        ('Check text representation of a valid shortcuts', dict(
            fetch_pref=True,
            sample_shortcut=dict(
                alt=True,
                shift=True,
                control=False,
                key=dict(
                    char='a',
                    keyCode=65
                )
            ),
            expected_result='Alt+Shift+a'
        )),

        ('Check text representation of a invalid shortcuts', dict(
            fetch_pref=True,
            sample_shortcut=None,
            expected_result=''
        ))

    ]

    def runTest(self):
        """Check correct function is called to handle to run query."""
        result = get_text_representation_of_shortcut(self.sample_shortcut)
        self.assertEquals(result, self.expected_result)
