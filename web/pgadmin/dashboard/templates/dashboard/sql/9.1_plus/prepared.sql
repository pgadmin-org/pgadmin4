SELECT
    gid,
    database,
    owner,
    transaction,
    prepared
FROM
    pg_prepared_xacts
{% if did %}WHERE
    database = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}
ORDER BY
    gid, database, owner