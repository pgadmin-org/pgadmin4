{# Fetch FTS DICTIONARY name statement #}
SELECT
    oid, dictname as name,
    dictnamespace as schema
FROM
    pg_ts_dict dict
WHERE
{% if scid %}
    dict.dictnamespace = {{scid}}::OID
{% elif dcid %}
    dict.oid = {{dcid}}::OID
{% endif %}

ORDER BY name
