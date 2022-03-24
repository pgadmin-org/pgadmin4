{# Fetch FTS DICTIONARY name statement #}
SELECT
    oid, dictname as name,
    dictnamespace as schema
FROM
    pg_catalog.pg_ts_dict dict
WHERE
{% if scid %}
    dict.dictnamespace = {{scid}}::OID
{% elif dcid %}
    dict.oid = {{dcid}}::OID
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = dict.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY name
