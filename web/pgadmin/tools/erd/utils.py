##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.schemas.tables.utils \
    import BaseTableView
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import get_schemas
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader


class ERDTableView(BaseTableView, DataTypeReader):
    def __init__(self):
        super(BaseTableView, self).__init__(cmd='erd')

    @BaseTableView.check_precondition
    def sql(self, conn_id=None, did=None, sid=None, data={}):
        return BaseTableView.get_sql(self, did, None, None, data, None)

    @BaseTableView.check_precondition
    def get_types(self, conn_id=None, did=None, sid=None):
        condition = self.get_types_condition_sql(False)
        return DataTypeReader.get_types(self, self.conn, condition, True)

    @BaseTableView.check_precondition
    def fetch_all_tables(self, conn_id=None, did=None, sid=None):
        status, schemas = get_schemas(self.conn, show_system_objects=False)
        if not status:
            return status, schemas

        all_tables = []
        for row in schemas['rows']:
            status, res = \
                BaseTableView.fetch_tables(self, sid, did, row['oid'])
            if not status:
                return status, res

            all_tables.extend(res.values())

        return True, all_tables


class ERDHelper:
    def __init__(self, conn_id, sid, did):
        self.conn_id = conn_id
        self.did = did
        self.sid = sid
        self.table_view = ERDTableView()
        self.link_view = None

    def get_types(self):
        return self.table_view.get_types(
            conn_id=self.conn_id, did=self.did, sid=self.sid)

    def get_table_sql(self, data):
        SQL, name = self.table_view.sql(
            conn_id=self.conn_id, did=self.did, sid=self.sid,
            data=data)
        return SQL

    def get_all_tables(self):
        status, res = self.table_view.fetch_all_tables(
            conn_id=self.conn_id, did=self.did, sid=self.sid)

        return status, res
