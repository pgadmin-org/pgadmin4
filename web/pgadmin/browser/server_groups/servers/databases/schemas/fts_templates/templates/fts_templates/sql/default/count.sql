SELECT COUNT(*)
FROM
    pg_catalog.pg_ts_template tmpl
WHERE
{% if scid %}
    tmpl.tmplnamespace = {{scid}}::OID
{% endif %}
