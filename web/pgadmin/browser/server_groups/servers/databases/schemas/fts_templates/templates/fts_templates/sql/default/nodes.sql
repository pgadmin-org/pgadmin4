SELECT
    tmpl.oid, tmplname as name, tmpl.tmplnamespace AS schema, des.description
FROM
    pg_catalog.pg_ts_template tmpl
    LEFT OUTER JOIN pg_catalog.pg_description des
ON
    (
    des.objoid=tmpl.oid
    AND des.classoid='pg_ts_template'::regclass
    )
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
