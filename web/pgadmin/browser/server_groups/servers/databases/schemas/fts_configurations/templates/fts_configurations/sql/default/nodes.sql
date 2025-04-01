{# FETCH FTS CONFIGURATION NAME statement #}
SELECT
    cfg.oid, cfgname as name, des.description
FROM
    pg_catalog.pg_ts_config cfg
    LEFT OUTER JOIN pg_catalog.pg_description des
    ON (des.objoid=cfg.oid AND des.classoid='pg_ts_config'::regclass)
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
