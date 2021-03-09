{# ===== Below will provide view id for last created view ===== #}
{% if data %}
SELECT c.oid, c.relname FROM pg_catalog.pg_class c
LEFT OUTER JOIN pg_catalog.pg_namespace nsp on nsp.oid = c.relnamespace
WHERE c.relname = {{ data.name|qtLiteral }} and nsp.nspname = '{{ data.schema }}';
{% endif %}
