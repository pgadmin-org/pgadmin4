##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2023, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

from pgadmin.browser.server_groups.servers.databases.schemas.tables.utils \
    import BaseTableView
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import get_schemas
from pgadmin.browser.server_groups.servers.databases.schemas.utils \
    import DataTypeReader
from pgadmin.utils.preferences import Preferences


class ERDTableView(BaseTableView, DataTypeReader):
    def __init__(self):
        super().__init__(cmd='erd')

    @BaseTableView.check_precondition
    def sql(self, conn_id=None, did=None, sid=None, data={}, with_drop=False):
        return BaseTableView.get_sql(self, did, None, None, data, None,
                                     add_not_exists_clause=True,
                                     with_drop=with_drop)

    @BaseTableView.check_precondition
    def get_types(self, conn_id=None, did=None, sid=None):
        condition = self.get_types_condition_sql(False)
        return DataTypeReader.get_types(self, self.conn, condition, True)

    @BaseTableView.check_precondition
    def fetch_all_tables(self, did=None, sid=None):
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

    @BaseTableView.check_precondition
    def traverse_related_tables(self, did=None, sid=None, scid=None,
                                tid=None, related={}, maxdepth=0, currdepth=0):

        status, res = \
            BaseTableView.fetch_tables(self, sid, did, scid, tid=tid)

        if not status:
            return status, res

        related[tid] = res
        # Max depth limit reached
        if currdepth == maxdepth:
            new_fks = []
            for fk in related[tid].pop('foreign_key', []):
                if fk['confrelid'] in related:
                    new_fks.append(fk)

            related[tid]['foreign_key'] = new_fks
            return True, None

        status, depending_res = BaseTableView.get_fk_ref_tables(
            self, tid)

        if not status:
            return status, depending_res

        for fk in [*res.get('foreign_key', []), *depending_res]:
            if fk['confrelid'] in related:
                continue
            status, res = self.traverse_related_tables(
                did=did, sid=sid, scid=fk['refnspoid'], tid=fk['confrelid'],
                related=related, maxdepth=maxdepth, currdepth=currdepth + 1)
            if not status:
                return status, res

        return True, None


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

    def get_table_sql(self, data, with_drop=False):
        SQL, name = self.table_view.sql(
            conn_id=self.conn_id, did=self.did, sid=self.sid,
            data=data, with_drop=with_drop)
        return SQL

    def get_all_tables(self, scid, tid):
        if tid is None and scid is None:
            status, res = self.table_view.fetch_all_tables(
                did=self.did, sid=self.sid)
        else:
            prefs = Preferences.module('erd')
            table_relation_depth = prefs.preference('table_relation_depth')
            related = {}
            status, res = self.table_view.traverse_related_tables(
                did=self.did, sid=self.sid, scid=scid, tid=tid,
                related=related, maxdepth=table_relation_depth.get()
            )
            if status:
                res = list(related.values())
        return status, res
