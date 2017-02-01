{# ============= Get the validators of foreign data wrapper ============= #}
SELECT nspname, proname as fdwvalue,
       quote_ident(nspname)||'.'||quote_ident(proname) AS schema_prefix_fdw_val
FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=pronamespace
WHERE proargtypes[0]=1009 AND proargtypes[1]=26;
