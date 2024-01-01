##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.tools.search_objects.utils import SearchObjectsHelper, current_app
from pgadmin.utils.route import BaseTestGenerator
from unittest.mock import patch, MagicMock


class SearchObjectsHelperTest(BaseTestGenerator):
    scenarios = [
        ('scenario', dict(
            node_blueprints=[
                dict(node_type='table', coll_label='Tables',
                     backend_supported=True),
                dict(node_type='view', coll_label='Views',
                     backend_supported=False),
                dict(node_type='index', coll_label='Indexes',
                     backend_supported=True),
                dict(node_type='role', coll_label='Roles',
                     backend_supported=True)
            ],
            all_node_types=['table', 'view', 'index'],
            expected_show_node_prefs=dict(table=True, view=False, index=True),
            expected_supported_types=dict(table='Tables', index='Indexes'),
            expected_supported_types_skip=dict(table='Tables', view='Views',
                                               index='Indexes'),
            execute_dict_return_value=(
                True, dict(rows=[
                    dict(obj_name='name1', obj_type='table',
                         obj_path='some/path', show_node=True,
                         other_info=None, catalog_level='N'),
                    dict(obj_name='name2', obj_type='view',
                         obj_path='some1/path', show_node=True,
                         other_info=None, catalog_level='D'),
                    dict(obj_name='name3', obj_type='index',
                         obj_path='some2/path1', show_node=True,
                         other_info='oid', catalog_level='O'),
                ])),
            expected_search_op=(
                True, [
                    dict(name='name1', type='table', type_label='Tables',
                         path='some/path',
                         show_node=True, other_info=None, catalog_level='N'),
                    dict(name='name2', type='view', type_label='Views',
                         path='some1/path',
                         show_node=True, other_info=None, catalog_level='D'),
                    dict(name='name3', type='index', type_label='Indexes',
                         path='some2/path1',
                         show_node=True, other_info='oid', catalog_level='O'),
                ]
            )
        ))
    ]

    def __create_manager(self):
        connection = MagicMock(
            execute_dict=MagicMock(),
            db='somedb'
        )
        connection.execute_dict.return_value = self.execute_dict_return_value

        def connection_function(did):
            return connection

        return MagicMock(
            connection=connection_function
        )

    @patch('pgadmin.tools.search_objects.utils.get_node_blueprint')
    @patch('pgadmin.tools.search_objects.utils.get_driver')
    def runTest(self, get_driver_mock, get_node_blueprint_mock):
        manager = self.__create_manager()

        get_driver_mock.return_value = MagicMock(
            connection_manager=lambda session_id: manager)

        def __get_node_blueprint_mock(node_type):
            blueprints = self.node_blueprints
            blueprint = None
            for data in blueprints:
                if node_type == data['node_type']:
                    blueprint = MagicMock(
                        backend_supported=MagicMock(
                            return_value=data['backend_supported']),
                        collection_label=data['coll_label'],
                        show_node=data['backend_supported'],
                    )
            return blueprint

        get_node_blueprint_mock.side_effect = __get_node_blueprint_mock

        with self.app.app_context():

            so_obj = SearchObjectsHelper(2, 18456,
                                         node_types=self.all_node_types)
            so_obj.get_sql = MagicMock(return_value='dummy query')

            # test template path
            manager.server_type = 'pg'
            manager.version = 906000
            self.assertEqual(so_obj.get_template_path(),
                             'search_objects/sql/pg/#906000#')

            self.assertEqual(so_obj.get_show_node_prefs(),
                             self.expected_show_node_prefs)

            self.assertEqual(so_obj.get_supported_types(),
                             self.expected_supported_types)

            self.assertEqual(so_obj.get_supported_types(skip_check=True),
                             self.expected_supported_types_skip)

            self.assertEqual(so_obj.search('searchtext', 'all'),
                             self.expected_search_op)
