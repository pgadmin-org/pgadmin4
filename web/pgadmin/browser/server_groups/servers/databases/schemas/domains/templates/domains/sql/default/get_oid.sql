{% if doid %}
SELECT
    d.typnamespace as scid
FROM
    pg_type d
WHERE
    d.oid={{ doid }}::oid;
{% else %}
SELECT
    d.oid
FROM
    pg_type d
JOIN
    pg_namespace bn ON bn.oid=d.typnamespace
WHERE
    bn.nspname = {{ basensp|qtLiteral }}
    AND d.typname={{ name|qtLiteral }};
{% endif %}
