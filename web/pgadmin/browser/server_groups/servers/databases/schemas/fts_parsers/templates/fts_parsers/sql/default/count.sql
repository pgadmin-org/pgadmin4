SELECT COUNT(*)
FROM
    pg_catalog.pg_ts_parser prs
WHERE
{% if scid %}
    prs.prsnamespace = {{scid}}::OID
{% endif %}
