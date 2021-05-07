{### Input/Output/Send/Receive/Analyze function list also append into TypModeIN/TypModOUT ###}
{% if extfunc %}
SELECT proname, nspname,
    CASE WHEN (length(nspname::text) > 0 AND nspname != 'public') and length(proname::text) > 0  THEN
        pg_catalog.concat(pg_catalog.quote_ident(nspname), '.', pg_catalog.quote_ident(proname))
    WHEN length(proname::text) > 0 THEN
        pg_catalog.quote_ident(proname)
    ELSE '' END AS func
FROM (
    SELECT proname, nspname, max(proargtypes[0]) AS arg0, max(proargtypes[1]) AS arg1
FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=pronamespace
GROUP BY proname, nspname
HAVING count(proname) = 1) AS uniquefunc
WHERE arg0 <> 0 AND (arg1 IS NULL OR arg1 <> 0);
{% endif %}
{### TypmodIN list ###}
{% if typemodin %}
SELECT proname, nspname,
    CASE WHEN length(nspname::text) > 0 AND length(proname::text) > 0  THEN
        pg_catalog.concat(pg_catalog.quote_ident(nspname), '.', pg_catalog.quote_ident(proname))
    ELSE '' END AS func
FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=pronamespace
WHERE prorettype=(SELECT oid FROM pg_catalog.pg_type WHERE typname='int4')
    AND proargtypes[0]=(SELECT oid FROM pg_catalog.pg_type WHERE typname='_cstring')
    AND proargtypes[1] IS NULL
ORDER BY nspname, proname;
{% endif %}
{### TypmodOUT list ###}
{% if typemodout %}
SELECT proname, nspname,
    CASE WHEN length(nspname::text) > 0 AND length(proname::text) > 0  THEN
        pg_catalog.concat(pg_catalog.quote_ident(nspname), '.', pg_catalog.quote_ident(proname))
    ELSE '' END AS func
FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=pronamespace
WHERE prorettype=(SELECT oid FROM pg_catalog.pg_type WHERE typname='cstring')
    AND proargtypes[0]=(SELECT oid FROM pg_catalog.pg_type WHERE typname='int4')
    AND proargtypes[1] IS NULL
ORDER BY nspname, proname;
{% endif %}
