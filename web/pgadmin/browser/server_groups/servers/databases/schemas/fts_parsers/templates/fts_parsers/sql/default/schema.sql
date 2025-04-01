{# FETCH statement for SCHEMA name #}
{% if data.schema %}
SELECT
    nspname
FROM
    pg_catalog.pg_namespace
WHERE
    oid = {{data.schema}}::OID

{% elif data.id %}
SELECT
    nspname
FROM
    pg_catalog.pg_namespace nsp
    LEFT JOIN pg_catalog.pg_ts_parser prs
    ON prs.prsnamespace = nsp.oid
WHERE
    prs.oid = {{data.id}}::OID
{% endif %}
