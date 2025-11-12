{# PARSER name from FTS CONFIGURATION OID #}
{% if cfgid %}
SELECT
    cfgparser
FROM
    pg_catalog.pg_ts_config
where
    oid = {{cfgid}}::OID
{% endif %}


{# PARSER list #}
{% if parser %}
SELECT
    prsname,
    nspname,
    n.oid as schemaoid
FROM
    pg_catalog.pg_ts_parser
    JOIN pg_catalog.pg_namespace n
    ON n.oid=prsnamespace
ORDER BY
    prsname;
{% endif %}
