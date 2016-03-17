{# ============= Get the validators of foreign data wrapper ============= #}
SELECT proname as fdwvalue FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=pronamespace WHERE proargtypes[0]=1009 AND proargtypes[1]=26;
