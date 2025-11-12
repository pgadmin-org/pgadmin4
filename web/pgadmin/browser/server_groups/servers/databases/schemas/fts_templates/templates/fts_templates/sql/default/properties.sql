{# Get properties for FTS TEMPLATE #}
SELECT
    tmpl.oid,
    tmpl.tmplname as name,
    tmpl.tmplinit,
    tmpl.tmpllexize,
    description,
    tmpl.tmplnamespace AS schema
FROM
    pg_catalog.pg_ts_template tmpl
    LEFT OUTER JOIN pg_catalog.pg_description des
ON
    (
    des.objoid=tmpl.oid
    AND des.classoid='pg_ts_template'::regclass
    )
WHERE
{% if scid is defined %}
    tmpl.tmplnamespace = {{scid}}::OID
{% endif %}
{% if name is defined %}
    {% if scid is defined %}AND {% endif %}tmpl.tmplname = {{name|qtLiteral(conn)}}
{% endif %}
{% if tid is defined %}
    {% if name is defined %}AND {% else %}{% if scid is defined %}AND {% endif %}{% endif %}tmpl.oid = {{tid}}::OID
{% endif %}
ORDER BY
    tmpl.tmplname
