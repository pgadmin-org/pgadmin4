{# FETCH FTS CONFIGURATION NAME statement #}
SELECT
    oid, cfgname as name
FROM
    pg_catalog.pg_ts_config cfg
WHERE
{% if scid %}
    cfg.cfgnamespace = {{scid}}::OID
{% elif cfgid %}
    cfg.oid = {{cfgid}}::OID
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = cfg.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}

ORDER BY name
