{# ============= Get the handlers of foreign data wrapper ============= #}
SELECT nspname, proname as fdwhan,
       quote_ident(nspname)||'.'||quote_ident(proname) AS schema_prefix_fdw_hand
FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=pronamespace
WHERE pronargs=0 AND prorettype=3115;
