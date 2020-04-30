from pgadmin.utils.ajax import make_json_response
from pgadmin.model import db, QueryHistoryModel
from config import MAX_QUERY_HIST_STORED


class QueryHistory:
    @staticmethod
    def get(uid, sid, dbname):

        result = db.session \
            .query(QueryHistoryModel.query_info) \
            .filter(QueryHistoryModel.uid == uid,
                    QueryHistoryModel.sid == sid,
                    QueryHistoryModel.dbname == dbname) \
            .all()

        result = [rec.query_info for rec in list(result)]

        return make_json_response(
            data={
                'status': True,
                'msg': '',
                'result': result
            }
        )

    @staticmethod
    def update_history_dbname(uid, sid, old_dbname, new_dbname):
        try:
            db.session \
                .query(QueryHistoryModel) \
                .filter(QueryHistoryModel.uid == uid,
                        QueryHistoryModel.sid == sid,
                        QueryHistoryModel.dbname == old_dbname) \
                .update({QueryHistoryModel.dbname: new_dbname})

            db.session.commit()
        except Exception:
            db.session.rollback()
            # do not affect query execution if history clear fails

    @staticmethod
    def save(uid, sid, dbname, request):
        try:
            max_srno = db.session\
                .query(db.func.max(QueryHistoryModel.srno)) \
                .filter(QueryHistoryModel.uid == uid,
                        QueryHistoryModel.sid == sid,
                        QueryHistoryModel.dbname == dbname)\
                .scalar()

            # if no records present
            if max_srno is None:
                new_srno = 1
            else:
                new_srno = max_srno + 1

                # last updated flag is used to recognise the last
                # inserted/updated record.
                # It is helpful to cycle the records
                last_updated_rec = db.session.query(QueryHistoryModel) \
                    .filter(QueryHistoryModel.uid == uid,
                            QueryHistoryModel.sid == sid,
                            QueryHistoryModel.dbname == dbname,
                            QueryHistoryModel.last_updated_flag == 'Y') \
                    .first()

                # there should be a last updated record
                # if not present start from sr no 1
                if last_updated_rec is not None:
                    last_updated_rec.last_updated_flag = 'N'

                    # if max limit reached then recycle
                    if new_srno > MAX_QUERY_HIST_STORED:
                        new_srno = (
                            last_updated_rec.srno % MAX_QUERY_HIST_STORED) + 1
                else:
                    new_srno = 1

                # if the limit is lowered and number of records present is
                # more, then cleanup
                if max_srno > MAX_QUERY_HIST_STORED:
                    db.session.query(QueryHistoryModel)\
                        .filter(QueryHistoryModel.uid == uid,
                                QueryHistoryModel.sid == sid,
                                QueryHistoryModel.dbname == dbname,
                                QueryHistoryModel.srno >
                                MAX_QUERY_HIST_STORED)\
                        .delete()

            history_entry = QueryHistoryModel(
                srno=new_srno, uid=uid, sid=sid, dbname=dbname,
                query_info=request.data, last_updated_flag='Y')

            db.session.merge(history_entry)

            db.session.commit()
        except Exception:
            db.session.rollback()
            # do not affect query execution if history saving fails

        return make_json_response(
            data={
                'status': True,
                'msg': 'Success',
            }
        )

    @staticmethod
    def clear_history(uid, sid, dbname=None):
        try:
            if dbname is not None:
                db.session.query(QueryHistoryModel) \
                    .filter(QueryHistoryModel.uid == uid,
                            QueryHistoryModel.sid == sid,
                            QueryHistoryModel.dbname == dbname) \
                    .delete()

                db.session.commit()
            else:
                db.session.query(QueryHistoryModel) \
                    .filter(QueryHistoryModel.uid == uid,
                            QueryHistoryModel.sid == sid)\
                    .delete()

                db.session.commit()
        except Exception:
            db.session.rollback()
            # do not affect query execution if history clear fails

    @staticmethod
    def clear(uid, sid, dbname=None):
        QueryHistory.clear_history(uid, sid, dbname)
        return make_json_response(
            data={
                'status': True,
                'msg': 'Success',
            }
        )
