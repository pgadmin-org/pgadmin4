{# FETCH FTS PARSER name statement #}
SELECT
    oid, prsname as name
FROM
    pg_ts_parser prs
WHERE
{% if scid %}
    prs.prsnamespace = {{scid}}::OID
{% elif pid %}
    prs.oid = {{pid}}::OID
{% endif %}

ORDER BY name