{# FETCH FTS DICTIONARY name statement #}
SELECT
    oid, dictname as name
FROM
    pg_ts_dict dict
WHERE
{% if scid %}
    dict.dictnamespace = {{scid}}::OID
{% elif dcid %}
    dict.oid = {{pid}}::OID
{% endif %}

ORDER BY name