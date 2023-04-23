##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


class BasePartitionTable:
    def is_table_partitioned(self, table_info):
        if (
            getattr(self, 'node_type', '') == 'partition' or
            ('is_partitioned' in table_info and table_info['is_partitioned'])
        ):
            return True
        return False

    def get_icon_css_class(self, table_info, default_val='icon-table'):
        if self.is_table_partitioned(table_info):
            return 'icon-partition_table'
        return default_val

    def get_partition_icon_css_class(self, table_info,
                                     default_val='icon-partition'):
        if 'is_sub_partitioned' in table_info and \
                table_info['is_sub_partitioned']:
            return 'icon-sub_partition_table'
        return default_val
