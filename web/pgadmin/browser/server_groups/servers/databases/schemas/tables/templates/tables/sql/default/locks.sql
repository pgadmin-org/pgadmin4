SELECT
    pid,
    locktype,
    datname,
    relation::regclass,
    page,
    tuple,
    virtualxid
    transactionid,
    classid::regclass,
    objid,
    objsubid,
    virtualtransaction,
    mode,
    granted,
    fastpath
FROM
    pg_catalog.pg_locks l
    LEFT OUTER JOIN pg_catalog.pg_database d ON (l.database = d.oid)
{% if did %}WHERE
    datname = (SELECT datname FROM pg_catalog.pg_database WHERE oid = {{ did }}){% endif %}
ORDER BY
    pid, locktype
