{# ============= Get the handlers of foreign data wrapper ============= #}
SELECT proname as fdwhan FROM pg_proc p JOIN pg_namespace nsp ON nsp.oid=pronamespace WHERE pronargs=0 AND prorettype=3115;