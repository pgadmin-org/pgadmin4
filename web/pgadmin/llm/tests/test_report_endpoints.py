##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json
from unittest.mock import patch, MagicMock
from pgadmin.utils.route import BaseTestGenerator
from regression.python_test_utils import test_utils as utils


class SecurityReportServerTestCase(BaseTestGenerator):
    """Test cases for security report generation at server level"""

    scenarios = [
        ('Security Report - LLM Disabled', dict(
            llm_enabled=False
        )),
        ('Security Report - LLM Enabled', dict(
            llm_enabled=True
        )),
    ]

    def setUp(self):
        self.server_id = 1

    def runTest(self):
        """Test security report endpoint at server level"""
        with patch('pgadmin.llm.utils.is_llm_enabled') as mock_enabled, \
             patch('pgadmin.llm.reports.generator.generate_report_sync') as mock_generate, \
             patch('pgadmin.utils.driver.get_driver') as mock_get_driver:

            # Mock database connection
            mock_conn = MagicMock()
            mock_conn.connected.return_value = True

            mock_manager = MagicMock()
            mock_manager.connection.return_value = mock_conn

            mock_driver = MagicMock()
            mock_driver.connection_manager.return_value = mock_manager
            mock_get_driver.return_value = mock_driver

            mock_enabled.return_value = self.llm_enabled

            if self.llm_enabled:
                mock_generate.return_value = (True, "# Security Report\n\nNo issues found.")

            url = '/llm/security-report/' + str(self.server_id)
            response = self.tester.get(url, content_type='application/json')

            # All responses return 200, check success field in JSON
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)

            if self.llm_enabled:
                self.assertTrue(data['success'])
                self.assertIn('report', data['data'])
            else:
                self.assertFalse(data['success'])
                self.assertIn('errormsg', data)


class PerformanceReportDatabaseTestCase(BaseTestGenerator):
    """Test cases for performance report generation at database level"""

    scenarios = [
        ('Performance Report - Database Level', dict(
            llm_enabled=True
        )),
    ]

    def setUp(self):
        self.server_id = 1
        self.db_id = 2

    def runTest(self):
        """Test performance report endpoint at database level"""
        with patch('pgadmin.llm.utils.is_llm_enabled') as mock_enabled, \
             patch('pgadmin.llm.reports.generator.generate_report_sync') as mock_generate, \
             patch('pgadmin.utils.driver.get_driver') as mock_get_driver:

            # Mock database connection
            mock_conn = MagicMock()
            mock_conn.connected.return_value = True
            mock_conn.db = 'testdb'

            mock_manager = MagicMock()
            mock_manager.connection.return_value = mock_conn

            mock_driver = MagicMock()
            mock_driver.connection_manager.return_value = mock_manager
            mock_get_driver.return_value = mock_driver

            mock_enabled.return_value = self.llm_enabled
            mock_generate.return_value = (True, "# Performance Report\n\nOptimization suggestions...")

            url = '/llm/database-performance-report/' + str(self.server_id) + '/' + str(self.db_id)
            response = self.tester.get(url, content_type='application/json')

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])


class DesignReportSchemaTestCase(BaseTestGenerator):
    """Test cases for design review report generation at schema level"""

    scenarios = [
        ('Design Report - Schema Level', dict(
            llm_enabled=True
        )),
    ]

    def setUp(self):
        self.server_id = 1
        self.db_id = 2
        self.schema_id = 3

    def runTest(self):
        """Test design review report endpoint at schema level"""
        with patch('pgadmin.llm.utils.is_llm_enabled') as mock_enabled, \
             patch('pgadmin.llm.reports.generator.generate_report_sync') as mock_generate, \
             patch('pgadmin.utils.driver.get_driver') as mock_get_driver:

            # Mock connection to return schema name
            mock_conn = MagicMock()
            mock_conn.connected.return_value = True
            mock_conn.db = 'testdb'
            mock_conn.execute_dict.return_value = (True, {'rows': [{'nspname': 'public'}]})

            mock_manager = MagicMock()
            mock_manager.connection.return_value = mock_conn

            mock_driver = MagicMock()
            mock_driver.connection_manager.return_value = mock_manager
            mock_get_driver.return_value = mock_driver

            mock_enabled.return_value = self.llm_enabled
            mock_generate.return_value = (True, "# Design Review\n\nSchema structure looks good...")

            url = '/llm/schema-design-report/' + str(self.server_id) + '/' + str(self.db_id) + '/' + str(self.schema_id)
            response = self.tester.get(url, content_type='application/json')

            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])


class StreamingReportTestCase(BaseTestGenerator):
    """Test cases for streaming report endpoints with SSE"""

    scenarios = [
        ('Streaming Security Report - Server', dict()),
    ]

    def setUp(self):
        self.server_id = 1

    def runTest(self):
        """Test streaming report endpoint uses SSE format"""
        with patch('pgadmin.llm.utils.is_llm_enabled') as mock_enabled, \
             patch('pgadmin.llm.reports.generator.generate_report_streaming') as mock_streaming, \
             patch('pgadmin.utils.driver.get_driver') as mock_get_driver:

            # Mock connection
            mock_conn = MagicMock()
            mock_conn.connected.return_value = True

            mock_manager = MagicMock()
            mock_manager.connection.return_value = mock_conn

            mock_driver = MagicMock()
            mock_driver.connection_manager.return_value = mock_manager
            mock_get_driver.return_value = mock_driver

            mock_enabled.return_value = True
            mock_streaming.return_value = iter([])  # Empty generator

            url = '/llm/security-report/' + str(self.server_id) + '/stream'
            response = self.tester.get(url)

            # SSE endpoints should return 200 and have text/event-stream content type
            self.assertEqual(response.status_code, 200)
            self.assertIn('text/event-stream', response.content_type)


class ReportErrorHandlingTestCase(BaseTestGenerator):
    """Test cases for report error handling"""

    scenarios = [
        ('Report with API Error', dict(
            simulate_error=True
        )),
    ]

    def setUp(self):
        self.server_id = 1

    def runTest(self):
        """Test report endpoint handles LLM API errors gracefully"""
        with patch('pgadmin.llm.utils.is_llm_enabled') as mock_enabled, \
             patch('pgadmin.llm.reports.generator.generate_report_sync') as mock_generate, \
             patch('pgadmin.utils.driver.get_driver') as mock_get_driver:

            # Mock database connection
            mock_conn = MagicMock()
            mock_conn.connected.return_value = True

            mock_manager = MagicMock()
            mock_manager.connection.return_value = mock_conn

            mock_driver = MagicMock()
            mock_driver.connection_manager.return_value = mock_manager
            mock_get_driver.return_value = mock_driver

            mock_enabled.return_value = True

            if self.simulate_error:
                mock_generate.side_effect = Exception("API connection failed")

            url = '/llm/security-report/' + str(self.server_id)
            response = self.tester.get(url, content_type='application/json')

            # Should return 200 with error in JSON, not crash
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertFalse(data['success'])
            self.assertIn('errormsg', data)
