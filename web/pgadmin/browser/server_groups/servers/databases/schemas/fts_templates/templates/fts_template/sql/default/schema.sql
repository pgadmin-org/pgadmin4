{# SCHEMA name FETCH statement #}
{% if data.schema %}
SELECT
    nspname
FROM
    pg_namespace
WHERE
    oid = {{data.schema}}::OID

{% elif data.id %}
SELECT
    nspname
FROM
    pg_namespace nsp
    LEFT JOIN pg_ts_template ts
    ON ts.tmplnamespace = nsp.oid
WHERE
    ts.oid = {{data.id}}::OID
{% endif %}