SELECT
    CASE WHEN nspname != 'pg_catalog' THEN pg_catalog.quote_ident(nspname) || '.' || pg_catalog.quote_ident(proname)
    ELSE pg_catalog.quote_ident(proname)
    END AS label,
    CASE
    WHEN prorettype = 2280 THEN 'handler'
    WHEN proargtypes[0] = 2281 THEN 'inline'
    ELSE 'validator'
    END AS prop_type
FROM
    pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace nsp ON nsp.oid=pronamespace
WHERE
    prorettype=2280 OR
    (prorettype=2278 AND proargtypes[0]=26) OR
    (prorettype=2278 AND proargtypes[0]=2281)
