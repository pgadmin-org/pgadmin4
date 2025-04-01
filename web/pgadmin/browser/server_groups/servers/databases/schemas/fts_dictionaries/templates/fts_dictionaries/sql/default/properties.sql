{# FETCH properties for FTS DICTIONARY #}
SELECT
    dict.oid,
    dict.dictname as name,
    pg_catalog.pg_get_userbyid(dict.dictowner) as owner,
    t.tmplname as template,
    (SELECT nspname FROM pg_catalog.pg_namespace n WHERE n.oid = t.tmplnamespace) as template_schema,
    dict.dictinitoption as options,
    dict.dictnamespace as schema,
    des.description
FROM
    pg_catalog.pg_ts_dict dict
    LEFT OUTER JOIN pg_catalog.pg_ts_template t ON t.oid=dict.dicttemplate
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=dict.oid AND des.classoid='pg_ts_dict'::regclass)
WHERE
{% if scid is defined %}
    dict.dictnamespace = {{scid}}::OID
{% endif %}
{% if name is defined %}
    {% if scid is defined %}AND {% endif %}dict.dictname = {{name|qtLiteral(conn)}}
{% endif %}
{% if dcid is defined %}
    {% if scid is defined %}AND {% else %}{% if name is defined %}AND {% endif %}{% endif %}dict.oid = {{dcid}}::OID
{% endif %}
ORDER BY
    dict.dictname
