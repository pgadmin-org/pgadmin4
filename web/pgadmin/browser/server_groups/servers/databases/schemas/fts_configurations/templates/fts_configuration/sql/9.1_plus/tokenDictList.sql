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
    array_agg(dictname) AS dictname
FROM
    pg_ts_config_map
    LEFT OUTER JOIN pg_ts_config ON mapcfg = pg_ts_config.oid
    LEFT OUTER JOIN pg_ts_dict ON mapdict = pg_ts_dict.oid
WHERE
    mapcfg={{cfgid}}::OID
GROUP BY
    token
ORDER BY
    1
{% endif %}