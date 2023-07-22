SELECT COUNT(*)
FROM
    pg_catalog.pg_ts_config cfg
WHERE
{% if scid %}
    cfg.cfgnamespace = {{scid}}::OID
{% endif %}
