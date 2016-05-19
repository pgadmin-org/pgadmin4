{# FETCH copy config for FTS CONFIGURATION #}
{% if copy_config %}
SELECT
    cfg.oid,
    cfgname,
    nspname,
    n.oid as schemaoid
FROM
    pg_ts_config cfg
    JOIN pg_namespace n
    ON n.oid=cfgnamespace
ORDER BY
    nspname,
    cfgname
{% endif %}