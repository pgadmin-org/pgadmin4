{# SQL query for getting current_schemas #}
{% if search_path %}
SELECT * FROM unnest(current_schemas(true)) AS schema
{% else %}
SELECT nspname AS schema FROM pg_catalog.pg_namespace ORDER BY 1
{% endif %}
