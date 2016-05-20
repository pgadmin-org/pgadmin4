{# ===== fetch schema name against schema oid ===== #}
SELECT
    nspname
FROM
    pg_namespace
WHERE
    oid = {{ scid }}::oid;
