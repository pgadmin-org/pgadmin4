{% if doid %}
SELECT
    d.typnamespace as scid
FROM
    pg_catalog.pg_type d
WHERE
    d.oid={{ doid }}::oid;
{% else %}
SELECT
    d.oid
FROM
    pg_catalog.pg_type d
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=d.typnamespace
WHERE
    bn.nspname = {{ basensp|qtLiteral(conn) }}
    AND d.typname={{ name|qtLiteral(conn) }};
{% endif %}
