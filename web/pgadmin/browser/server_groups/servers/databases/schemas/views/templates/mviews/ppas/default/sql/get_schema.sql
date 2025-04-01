{# ===== fetch schema name =====#}
SELECT
    nspname
FROM
    pg_catalog.pg_namespace
WHERE
    oid = {{ scid }}::oid;
