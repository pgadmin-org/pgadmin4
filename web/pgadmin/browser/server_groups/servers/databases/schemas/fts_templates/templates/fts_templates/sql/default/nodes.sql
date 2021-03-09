SELECT
    oid, tmplname as name, tmpl.tmplnamespace AS schema
FROM
    pg_catalog.pg_ts_template tmpl
WHERE
{% if scid %}
    tmpl.tmplnamespace = {{scid}}::OID
{% elif tid %}
    tmpl.oid = {{tid}}::OID
{% endif %}

ORDER BY name
