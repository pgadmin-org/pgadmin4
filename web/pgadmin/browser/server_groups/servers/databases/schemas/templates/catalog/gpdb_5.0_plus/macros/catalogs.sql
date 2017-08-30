{% macro LIST(tbl) -%}
    ({{ tbl }}.nspname = 'pg_catalog' AND EXISTS
        (SELECT 1 FROM pg_class WHERE relname = 'pg_class' AND
            relnamespace = {{ tbl }}.oid LIMIT 1)) OR
    ({{ tbl }}.nspname = 'information_schema' AND EXISTS
        (SELECT 1 FROM pg_class WHERE relname = 'tables' AND
            relnamespace = {{ tbl }}.oid LIMIT 1))
{%- endmacro %}
{% macro LABELS(tbl, _) -%}
    CASE {{ tbl }}.nspname
    WHEN 'pg_catalog' THEN '{{ _( 'PostgreSQL Catalog' ) }} (pg_catalog)'
    WHEN 'information_schema' THEN '{{ _( 'ANSI' ) }} (information_schema)'
    ELSE {{ tbl }}.nspname
    END AS name
{%- endmacro %}
{% macro DB_SUPPORT(tbl) -%}
    CASE
    WHEN {{ tbl }}.nspname = ANY('{information_schema}')
        THEN false
    ELSE true END
{%- endmacro %}
