##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2024, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.browser.server_groups.servers.databases.schemas\
    .tables.base_partition_table import BasePartitionTable
from pgadmin.utils.route import BaseTestGenerator


class TestBasePartitionTable(BaseTestGenerator):
    scenarios = [
        ('#is_table_partitioned when table information does not '
         'have partition information, '
         'it returns false',
         dict(
             test='is_table_partitioned',
             input_parameters=dict(),
             expected_return=False
         )),
        ('#is_table_partitioned when table information '
         'has partition information and table is partitioned, '
         'it returns true',
         dict(
             test='is_table_partitioned',
             input_parameters=dict(
                 is_partitioned=True
             ),
             expected_return=True
         )),
        ('#is_table_partitioned when table information '
         'has partition information and table is not partitioned, '
         'it returns false',
         dict(
             test='is_table_partitioned',
             input_parameters=dict(
                 is_partitioned=False
             ),
             expected_return=False
         )),
        ('#is_table_partitioned when node_type is present '
         'and is partition, '
         'it returns true',
         dict(
             test='is_table_partitioned',
             input_parameters=dict(
                 is_partitioned=False
             ),
             node_type='partition',
             expected_return=True
         )),
        ('#is_table_partitioned when node_type is present '
         'and is not partition '
         'and table is not partitioned '
         'it returns true',
         dict(
             test='is_table_partitioned',
             input_parameters=dict(
                 is_partitioned=False
             ),
             node_type='table',
             expected_return=False
         )),


        ('#get_icon_css_class when table is partitioned '
         'it returns icon-partition_table class',
         dict(
             test='get_icon_css_class',
             input_parameters=dict(
                 is_partitioned=True
             ),
             expected_return='icon-partition_table'
         )),
        ('#get_icon_css_class when table is not partitioned '
         'it returns icon-table class',
         dict(
             test='get_icon_css_class',
             input_parameters=dict(
                 is_partitioned=False
             ),
             expected_return='icon-table'
         ))
    ]

    def runTest(self):
        if self.test == 'is_table_partitioned':
            self.__test_is_table_partitioned()
        elif self.test == 'get_icon_css_class':
            self.__test_get_icon_css_class()

    def __test_is_table_partitioned(self):
        subject = BasePartitionTable()
        if hasattr(self, 'node_type'):
            subject.node_type = self.node_type

        self.assertEqual(subject.is_table_partitioned(self.input_parameters),
                         self.expected_return)

    def __test_get_icon_css_class(self):
        subject = BasePartitionTable()

        self.assertEqual(subject.get_icon_css_class(self.input_parameters),
                         self.expected_return)
