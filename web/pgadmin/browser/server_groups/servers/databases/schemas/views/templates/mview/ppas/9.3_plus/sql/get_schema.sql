{# ===== fetch schema name =====#}
SELECT
    nspname
FROM
    pg_namespace
WHERE
    oid = {{ scid }}::oid;
