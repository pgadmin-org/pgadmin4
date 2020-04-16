{# Fetch token/dictionary list for FTS CONFIGURATION #}
{% if cfgid %}
SELECT
    (
    SELECT
        t.alias
    FROM
        pg_catalog.ts_token_type(cfgparser) AS t
    WHERE
        t.tokid = maptokentype
    ) AS token,
    array_agg(
        CASE WHEN (pg_ns.nspname != 'pg_catalog') THEN
            CONCAT(pg_ns.nspname, '.', pg_ts_dict.dictname)
        ELSE
            pg_ts_dict.dictname END) AS dictname
FROM
    pg_ts_config_map
    LEFT OUTER JOIN pg_ts_config ON mapcfg = pg_ts_config.oid
    LEFT OUTER JOIN pg_ts_dict ON mapdict = pg_ts_dict.oid
    LEFT OUTER JOIN pg_namespace pg_ns ON pg_ns.oid = pg_ts_dict.dictnamespace
WHERE
    mapcfg={{cfgid}}::OID
GROUP BY
    token
ORDER BY
    1
{% endif %}
