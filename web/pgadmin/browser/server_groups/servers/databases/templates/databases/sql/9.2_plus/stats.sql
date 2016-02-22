SELECT
    db.datid as oid, db.datname, numbackends, xact_commit, xact_rollback, blks_read,
    blks_hit, stats_reset, slave.confl_tablespace, slave.confl_lock,
    slave.confl_snapshot, slave.confl_bufferpin, slave.confl_deadlock{% if has_size %},
    pg_size_pretty(pg_database_size(db.datid)) as size
FROM
    pg_stat_database db
    LEFT JOIN pg_stat_database_conflicts slave ON db.datid=slave.datid
{% if did %}
WHERE
    did = {{ conn|qtIdent(did) }}::OID
{% endif %}
ORDER BY db.datname;
