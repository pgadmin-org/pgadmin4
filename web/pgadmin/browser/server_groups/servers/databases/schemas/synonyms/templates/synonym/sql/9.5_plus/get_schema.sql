{# ===== fetch new assigned schema id ===== #}
SELECT
    c.relnamespace as scid
FROM
    pg_class c
WHERE
    c.oid = {{syid|qtLiteral}}::oid;
