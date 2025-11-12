{# ============= Get the validators of foreign data wrapper ============= #}
SELECT nspname, proname as fdwvalue,
       pg_catalog.quote_ident(nspname)||'.'||pg_catalog.quote_ident(proname) AS schema_prefix_fdw_val
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace nsp ON nsp.oid=pronamespace
WHERE proargtypes[0]=1009 AND proargtypes[1]=26;
