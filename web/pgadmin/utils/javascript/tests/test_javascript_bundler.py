##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.javascript.javascript_bundler import JavascriptBundler
from pgadmin.utils.javascript.javascript_bundler import JsState
from unittest.mock import patch


class JavascriptBundlerTestCase(BaseTestGenerator):
    """This tests that the javascript bundler tool causes the application to
    bundle,and can be invoked before and after app start correctly"""

    scenarios = [('scenario name: JavascriptBundlerTestCase', dict())]

    def __init__(self, methodName='runTest'):
        super(BaseTestGenerator, self).__init__(methodName)
        self.mockOs = None
        self.mockSubprocessCall = None

    @patch('pgadmin.utils.javascript.javascript_bundler.os')
    @patch('pgadmin.utils.javascript.javascript_bundler.call')
    def runTest(self, subprocessMock, osMock):
        self.mockOs = osMock
        self.mockSubprocessCall = subprocessMock

        self._bundling_succeeds()
        self.reset_test_state()
        self._bundling_fails_and_there_is_no_existing_bundle()
        self.reset_test_state()
        self._bundling_fails_when_bundling_returns_nonzero()
        self.reset_test_state()
        self._bundling_fails_and_there_is_no_existing_bundle_directory()
        self.reset_test_state()
        self._bundling_fails_but_there_was_existing_bundle()
        self.reset_test_state()

    def reset_test_state(self):
        self.mockSubprocessCall.reset_mock()
        self.mockSubprocessCall.side_effect = None
        self.mockOs.reset_mock()
        self.mockOs.listdir.side_effect = None
        self.mockOs.path.exists.side_effect = None

    def _bundling_succeeds(self):
        javascript_bundler = JavascriptBundler()
        self.assertEqual(len(self.mockSubprocessCall.method_calls), 0)
        self.mockSubprocessCall.return_value = 0

        self.mockOs.listdir.return_value = [
            u'history.js', u'reactComponents.js']

        javascript_bundler.bundle()
        self.mockSubprocessCall.assert_called_once_with(
            ['yarn', 'run', 'bundle:dev'])

        self.__assertState(javascript_bundler, JsState.NEW)

    def _bundling_fails_when_bundling_returns_nonzero(self):
        javascript_bundler = JavascriptBundler()
        self.assertEqual(len(self.mockSubprocessCall.method_calls), 0)
        self.mockOs.listdir.return_value = []
        self.mockSubprocessCall.return_value = 99

        javascript_bundler.bundle()

        self.__assertState(javascript_bundler, JsState.NONE)

    def _bundling_fails_and_there_is_no_existing_bundle(self):
        javascript_bundler = JavascriptBundler()
        self.mockSubprocessCall.side_effect = OSError(
            "mock exception behavior")
        self.mockOs.path.exists.return_value = True
        self.mockOs.listdir.return_value = []

        javascript_bundler.bundle()

        self.__assertState(javascript_bundler, JsState.NONE)

    def _bundling_fails_and_there_is_no_existing_bundle_directory(self):
        javascript_bundler = JavascriptBundler()
        self.mockSubprocessCall.side_effect = OSError(
            "mock exception behavior")
        self.mockOs.path.exists.return_value = False
        self.mockOs.listdir.side_effect = OSError("mock exception behavior")

        javascript_bundler.bundle()

        self.__assertState(javascript_bundler, JsState.NONE)

    def _bundling_fails_but_there_was_existing_bundle(self):
        javascript_bundler = JavascriptBundler()
        self.mockSubprocessCall.side_effect = OSError(
            "mock exception behavior")
        self.mockOs.path.exists.return_value = True
        self.mockOs.listdir.return_value = [
            u'history.js', u'reactComponents.js']

        javascript_bundler.bundle()
        self.mockSubprocessCall.assert_called_once_with(
            ['yarn', 'run', 'bundle:dev'])

        self.__assertState(javascript_bundler, JsState.OLD)

    def __assertState(self, javascript_bundler, expected_state):
        reported_state = javascript_bundler.report()
        self.assertEqual(reported_state, expected_state)
