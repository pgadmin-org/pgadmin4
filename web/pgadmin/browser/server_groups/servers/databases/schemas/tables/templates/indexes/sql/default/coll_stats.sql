SELECT
    indexrelname AS {{ conn|qtIdent(_('Index name')) }},
    idx_scan AS {{ conn|qtIdent(_('Index scans')) }},
    idx_tup_read AS {{ conn|qtIdent(_('Index tuples read')) }},
    idx_tup_fetch AS {{ conn|qtIdent(_('Index tuples fetched')) }},
    pg_relation_size(indexrelid) AS {{ conn|qtIdent(_('Size')) }}
FROM
    pg_stat_all_indexes stat
    JOIN pg_class cls ON cls.oid=indexrelid
    LEFT JOIN pg_depend dep ON (dep.classid = cls.tableoid AND dep.objid = cls.oid AND dep.refobjsubid = '0'
        AND dep.refclassid=(SELECT oid FROM pg_class WHERE relname='pg_constraint'))
    LEFT OUTER JOIN pg_constraint con ON (con.tableoid = dep.refclassid AND con.oid = dep.refobjid)
WHERE
    schemaname = '{{schema}}'
    AND stat.relname = '{{table}}'
    AND con.contype IS NULL
ORDER BY indexrelname;
