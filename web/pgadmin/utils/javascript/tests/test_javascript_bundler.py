##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


import sys

from pgadmin.utils.route import BaseTestGenerator
if sys.version_info < (3, 3):
    import mock
else:
    import unittest.mock as mock


class JavascriptBundlerTestCase(BaseTestGenerator):
    """This tests that the javascript bundler tool causes the application to bundle,
    and can be invoked before and after app start correctly"""

    scenarios = [('scenario name: JavascriptBundlerTestCase', dict())]

    def setUp(self):
        self.skipTest("Test currently disabled for all server versions.")
        self.mockSubprocess = mock.Mock()
        self.mockOs = mock.Mock()
        sys.modules['subprocess'] = self.mockSubprocess
        sys.modules['os'] = self.mockOs

    def runTest(self):
        from pgadmin.utils.javascript.javascript_bundler import JavascriptBundler
        from pgadmin.utils.javascript.javascript_bundler import JsState
        self.JavascriptBundler = JavascriptBundler
        self.JsState = JsState

        self._bundling_succeeds()
        self.resetTestState()
        self._bundling_fails_and_there_is_no_existing_bundle()
        self.resetTestState()
        self._bundling_fails_when_bundling_returns_nonzero()
        self.resetTestState()
        self._bundling_fails_and_there_is_no_existing_bundle_directory()
        self.resetTestState()
        self._bundling_fails_but_there_was_existing_bundle()
        self.resetTestState()

    def resetTestState(self):
        self.mockSubprocess.reset_mock()
        self.mockSubprocess.call.side_effect = None
        self.mockOs.reset_mock()
        self.mockOs.listdir.side_effect = None
        self.mockOs.path.exists.side_effect = None

    def _bundling_succeeds(self):
        javascriptBundler = self.JavascriptBundler()
        self.assertEqual(len(self.mockSubprocess.method_calls), 0)
        self.mockSubprocess.call.return_value = 0

        self.mockOs.listdir.return_value = [u'history.js', u'reactComponents.js']

        javascriptBundler.bundle()
        self.mockSubprocess.call.assert_called_once_with(['yarn', 'run', 'bundle:dev'])

        reportedState = javascriptBundler.report()
        expectedState = self.JsState.NEW
        self.assertEqual(reportedState, expectedState)

    def _bundling_fails_when_bundling_returns_nonzero(self):
        javascriptBundler = self.JavascriptBundler()
        self.assertEqual(len(self.mockSubprocess.method_calls), 0)
        self.mockOs.listdir.return_value = []
        self.mockSubprocess.call.return_value = 99

        javascriptBundler.bundle()

        reportedState = javascriptBundler.report()
        expectedState = self.JsState.NONE
        self.assertEqual(reportedState, expectedState)

    def _bundling_fails_and_there_is_no_existing_bundle(self):
        javascriptBundler = self.JavascriptBundler()
        self.mockSubprocess.call.side_effect = OSError("mock exception behavior")
        self.mockOs.path.exists.return_value = True
        self.mockOs.listdir.return_value = []

        javascriptBundler.bundle()

        reportedState = javascriptBundler.report()
        expectedState = self.JsState.NONE
        self.assertEqual(reportedState, expectedState)

    def _bundling_fails_and_there_is_no_existing_bundle_directory(self):
        javascriptBundler = self.JavascriptBundler()
        self.mockSubprocess.call.side_effect = OSError("mock exception behavior")
        self.mockOs.path.exists.return_value = False
        self.mockOs.listdir.side_effect = OSError("mock exception behavior")

        javascriptBundler.bundle()

        reportedState = javascriptBundler.report()
        expectedState = self.JsState.NONE
        self.assertEqual(reportedState, expectedState)

    def _bundling_fails_but_there_was_existing_bundle(self):
        javascriptBundler = self.JavascriptBundler()
        self.mockSubprocess.call.side_effect = OSError("mock exception behavior")
        self.mockOs.path.exists.return_value = True
        self.mockOs.listdir.return_value = [u'history.js', u'reactComponents.js']

        javascriptBundler.bundle()
        self.mockSubprocess.call.assert_called_once_with(['yarn', 'run', 'bundle:dev'])

        reportedState = javascriptBundler.report()
        expectedState = self.JsState.OLD
        self.assertEqual(reportedState, expectedState)
