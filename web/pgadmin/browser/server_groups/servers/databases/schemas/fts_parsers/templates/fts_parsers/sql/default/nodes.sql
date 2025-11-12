{# FETCH FTS PARSER name statement #}
SELECT
    prs.oid, prsname as name, prs.prsnamespace AS schema, des.description
FROM
    pg_catalog.pg_ts_parser prs
    LEFT OUTER JOIN pg_catalog.pg_description des
ON
    (
    des.objoid=prs.oid
    AND des.classoid='pg_ts_parser'::regclass
    )
WHERE
{% if scid %}
    prs.prsnamespace = {{scid}}::OID
{% elif pid %}
    prs.oid = {{pid}}::OID
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = prs.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY name
