{# Get properties for FTS TEMPLATE #}
SELECT
    tmpl.oid,
    tmpl.tmplname as name,
    tmpl.tmplinit,
    tmpl.tmpllexize,
    description,
    tmpl.tmplnamespace AS schema
FROM
    pg_ts_template tmpl
    LEFT OUTER JOIN pg_description des
ON
    (
    des.objoid=tmpl.oid
    AND des.classoid='pg_ts_template'::regclass
    )
WHERE
{% if scid %}
    tmpl.tmplnamespace = {{scid}}::OID
{% endif %}
{% if name %}
    {% if scid %}AND {% endif %}tmpl.tmplname = {{name|qtLiteral}}
{% endif %}
{% if tid %}
    {% if name %}AND {% else %}{% if scid %}AND {% endif %}{% endif %}tmpl.oid = {{tid}}::OID
{% endif %}
ORDER BY
    tmpl.tmplname
