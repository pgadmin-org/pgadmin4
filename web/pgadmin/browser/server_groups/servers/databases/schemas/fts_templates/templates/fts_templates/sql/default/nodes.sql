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
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = tmpl.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY name
