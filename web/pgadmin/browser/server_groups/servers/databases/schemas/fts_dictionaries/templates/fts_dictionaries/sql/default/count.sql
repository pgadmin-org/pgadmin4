SELECT COUNT(*)
FROM
    pg_catalog.pg_ts_dict dict
WHERE
{% if scid %}
    dict.dictnamespace = {{scid}}::OID
{% endif %}
