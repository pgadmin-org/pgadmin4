##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from werkzeug.datastructures import ImmutableMultiDict

from pgadmin.tools.sqleditor import extract_sql_from_network_parameters
from pgadmin.utils.route import BaseTestGenerator


class ExtractSQLFromNetworkParametersTest(BaseTestGenerator):
    """
    This class validates the change password functionality
    by defining change password scenarios; where dict of
    parameters describes the scenario appended by test name.
    """

    scenarios = [
        ('Single string in the payload', dict(
            request_strigified_data='"some sql"',
            request_arguments=ImmutableMultiDict(),
            request_form_data=ImmutableMultiDict(),

            expected_result=dict(sql='some sql', explain_plan=None)
        )),
        ('Payload that requests explain plan using json', dict(
            request_strigified_data='{"sql": "some sql", "explain_plan": '
                                    '{"format": "json", "analyze": false, '
                                    '"verbose": false, "costs": false, '
                                    '"buffers": false, "timing": false}}',
            request_arguments=ImmutableMultiDict(),
            request_form_data=ImmutableMultiDict(),

            expected_result=dict(
                sql='some sql',
                explain_plan=dict(
                    format='json',
                    analyze=False,
                    verbose=False,
                    buffers=False,
                    costs=False,
                    timing=False
                )
            )
        ))
    ]

    def runTest(self):
        """Check correct function is called to handle to run query."""

        result = extract_sql_from_network_parameters(
            self.request_strigified_data,
            self.request_arguments,
            self.request_form_data
        )

        self.assertEqual(result, self.expected_result)
