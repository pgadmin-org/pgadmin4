{# SQL query for getting columns #}
{% if object_name == 'table' %}
SELECT
    att.attname column_name
FROM pg_catalog.pg_attribute att
    INNER JOIN pg_catalog.pg_class cls
        ON att.attrelid = cls.oid
    INNER JOIN pg_catalog.pg_namespace nsp
        ON cls.relnamespace = nsp.oid
    WHERE cls.relkind = ANY(array['r'])
        AND NOT att.attisdropped
        AND att.attnum  > 0
        AND (nsp.nspname = '{{schema_name}}' AND cls.relname = '{{rel_name}}')
    ORDER BY 1
{% endif %}
{% if object_name == 'view' %}
SELECT
    att.attname column_name
FROM pg_catalog.pg_attribute att
    INNER JOIN pg_catalog.pg_class cls
        ON att.attrelid = cls.oid
    INNER JOIN pg_catalog.pg_namespace nsp
        ON cls.relnamespace = nsp.oid
    WHERE cls.relkind = ANY(array['v', 'm'])
        AND NOT att.attisdropped
        AND att.attnum  > 0
        AND (nsp.nspname = '{{schema_name}}' AND cls.relname = '{{rel_name}}')
    ORDER BY 1
{% endif %}