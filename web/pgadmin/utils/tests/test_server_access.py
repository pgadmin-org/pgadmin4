##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from unittest.mock import MagicMock, patch

from pgadmin.utils.route import BaseTestGenerator
from pgadmin.utils.server_access import get_server_groups_for_user, \
    get_user_server_query, get_visible_server_query


MODULE = 'pgadmin.utils.server_access'


class ServerGroupAdminVisibilityTestCase(BaseTestGenerator):
    """Validate server group visibility for admin users."""

    scenarios = [
        ('Admin browser listing excludes private server groups owned by '
         'other users', dict())
    ]

    @patch(MODULE + '.or_', return_value='visibility_filter')
    @patch(MODULE + '.config')
    @patch(MODULE + '.db')
    @patch(MODULE + '.Server')
    @patch(MODULE + '.ServerGroup')
    @patch(MODULE + '.current_user')
    def runTest(self, mock_current_user, mock_server_group, mock_server,
                mock_db, mock_config, _):
        mock_config.SERVER_MODE = True
        mock_current_user.id = 10
        mock_current_user.has_role.return_value = True

        visible_groups = [MagicMock(name='visible_group')]
        mock_server_group.query.filter.return_value.all.return_value = \
            visible_groups

        result = get_server_groups_for_user()

        self.assertEqual(result, visible_groups)
        mock_server_group.query.all.assert_not_called()
        mock_server_group.query.filter.assert_called_once_with(
            'visibility_filter'
        )


class VisibleServerQueryAdminVisibilityTestCase(BaseTestGenerator):
    """Validate browser-visible server query construction for admin users."""

    scenarios = [
        ('Admin visible server query excludes private servers owned by other '
         'users', dict())
    ]

    @patch(MODULE + '.or_', return_value='visibility_filter')
    @patch(MODULE + '.config')
    @patch(MODULE + '.Server')
    @patch(MODULE + '.current_user')
    def runTest(self, mock_current_user, mock_server, mock_config, _):
        mock_config.SERVER_MODE = True
        mock_current_user.id = 10
        mock_current_user.has_role.return_value = True

        scoped_query = MagicMock(name='scoped_query')
        mock_server.query.filter.return_value = scoped_query

        result = get_visible_server_query()

        self.assertEqual(result, scoped_query)
        mock_server.query.filter.assert_called_once_with('visibility_filter')


class UserServerQueryAdminAccessTestCase(BaseTestGenerator):
    """Validate generic server query construction for admin users."""

    scenarios = [
        ('Admin generic server query still includes directly accessible '
         'private servers', dict())
    ]

    @patch(MODULE + '.config')
    @patch(MODULE + '.Server')
    @patch(MODULE + '.current_user')
    def runTest(self, mock_current_user, mock_server, mock_config):
        mock_config.SERVER_MODE = True
        mock_current_user.has_role.return_value = True

        result = get_user_server_query()

        self.assertEqual(result, mock_server.query)
        mock_server.query.filter.assert_not_called()
