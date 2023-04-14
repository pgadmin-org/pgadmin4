{# Fetch FTS DICTIONARY name statement #}
SELECT
    dict.oid, dictname as name,
    dictnamespace as schema,
    des.description
FROM
    pg_catalog.pg_ts_dict dict
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=dict.oid AND des.classoid='pg_ts_dict'::regclass)
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
