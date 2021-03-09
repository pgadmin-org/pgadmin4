{# ============= Fetch list of default values for autovacuum parameters =============== #}
SELECT name, setting::numeric AS setting FROM pg_catalog.pg_settings WHERE name IN({{ columns }}) ORDER BY name
