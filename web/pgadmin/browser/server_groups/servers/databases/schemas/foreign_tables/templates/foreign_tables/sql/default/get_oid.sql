{% if basensp %}
SELECT
    c.oid, bn.oid as scid
FROM
    pg_catalog.pg_class c
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=c.relnamespace
WHERE
    bn.nspname = {{ basensp|qtLiteral }}
    AND c.relname={{ name|qtLiteral }};

{% elif foid %}
SELECT
    c.relnamespace as scid
FROM
    pg_catalog.pg_class c
WHERE
    c.oid = {{foid}}::oid;
{% endif %}
