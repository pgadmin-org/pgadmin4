{# FETCH templates for FTS DICTIONARY #}
{% if template %}
SELECT
    tmplname,
    nspname,
    n.oid as schemaoid
FROM
    pg_catalog.pg_ts_template JOIN pg_catalog.pg_namespace n ON n.oid=tmplnamespace
ORDER BY
    tmplname
{% endif %}
