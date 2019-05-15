{# FETCH statement for SCHEMA name #}
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
    LEFT JOIN pg_ts_dict dict
    ON dict.dictnamespace = nsp.oid
WHERE
    dict.oid = {{data.id}}::OID
{% endif %}