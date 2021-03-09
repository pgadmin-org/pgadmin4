{# FETCH FTS PARSER name statement #}
SELECT
    oid, prsname as name, prs.prsnamespace AS schema
FROM
    pg_catalog.pg_ts_parser prs
WHERE
{% if scid %}
    prs.prsnamespace = {{scid}}::OID
{% elif pid %}
    prs.oid = {{pid}}::OID
{% endif %}

ORDER BY name
