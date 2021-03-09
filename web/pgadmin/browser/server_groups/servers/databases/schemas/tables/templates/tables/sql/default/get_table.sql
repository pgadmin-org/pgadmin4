SELECT
    rel.relname AS name
FROM
    pg_catalog.pg_class rel
WHERE
    rel.relkind IN ('r','s','t')
    AND rel.relnamespace = {{ scid }}::oid
    AND rel.oid = {{ tid }}::oid;
