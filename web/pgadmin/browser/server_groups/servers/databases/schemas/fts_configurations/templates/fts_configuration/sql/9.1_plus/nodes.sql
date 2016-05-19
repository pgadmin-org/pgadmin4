{# FETCH FTS CONFIGURATION NAME statement #}
SELECT
    oid, cfgname as name
FROM
    pg_ts_config cfg
WHERE
{% if scid %}
    cfg.cfgnamespace = {{scid}}::OID
{% elif cfgid %}
    cfg.oid = {{cfgid}}::OID
{% endif %}

ORDER BY name