{# ============= Fetch the list of tables/view based on given schema_names ============= #}
{% if object_name == 'tables' %}
SELECT  n.nspname schema_name,
    c.relname object_name
FROM pg_catalog.pg_class c
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = ANY(array['r', 'p']) and n.nspname IN ({{schema_names}})
    ORDER BY 1,2
{% endif %}
{% if object_name == 'views' %}
SELECT  n.nspname schema_name,
    c.relname object_name
FROM pg_catalog.pg_class c
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = ANY(array['v', 'm']) and n.nspname IN ({{schema_names}})
    ORDER BY 1,2
{% endif %}
