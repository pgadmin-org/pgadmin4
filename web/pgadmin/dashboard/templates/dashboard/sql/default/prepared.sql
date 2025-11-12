/*pga4dash*/
SELECT
    gid,
    database,
    owner,
    transaction,
    pg_catalog.to_char(prepared, 'YYYY-MM-DD HH24:MI:SS TZ') AS prepared
FROM
    pg_catalog.pg_prepared_xacts
{% if did %}WHERE
    database = (SELECT datname FROM pg_catalog.pg_database WHERE oid = {{ did }}){% endif %}
ORDER BY
    gid, database, owner
